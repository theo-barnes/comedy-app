import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  FlatList,
  Pressable,
  StyleSheet,
  View,
  type ListRenderItemInfo,
} from 'react-native';
import { router, type Href } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { useOnboarding } from '@/hooks/useOnboarding';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { colors, spacing } from '@/theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

type Slide = {
  key: string;
  title: string;
  body: string;
  cta: string;
  isFinal: boolean;
};

// Number of slides — used for progress bar geometry.
// Slide content is built inside the component via t().
const SLIDE_COUNT = 3;

// Pixel widths for progress segments.
const BAR_AVAILABLE_WIDTH = SCREEN_WIDTH - spacing.lg * 2 - spacing.sm * (SLIDE_COUNT - 1);
const SEGMENT_UNIT = BAR_AVAILABLE_WIDTH / (SLIDE_COUNT + 1);
const ACTIVE_SEG_WIDTH = SEGMENT_UNIT * 2;
const INACTIVE_SEG_WIDTH = SEGMENT_UNIT;

export default function OnboardingScreen() {
  const { hasSeenOnboarding, markOnboardingSeen } = useOnboarding();
  const [activeIndex, setActiveIndex] = useState(0);
  const flatListRef = useRef<FlatList<Slide>>(null);
  // Stores where to navigate once the guard has flipped (after React commit).
  const pendingDestination = useRef<Href | null>(null);

  const { t } = useTranslation();

  // Slide content derived from translations; updates automatically on locale change.
  const slides = useMemo(
    (): Slide[] => [
      {
        key: 'slide1',
        title: t('onboarding.slide1.title'),
        body: t('onboarding.slide1.body'),
        cta: t('onboarding.cta'),
        isFinal: false,
      },
      {
        key: 'slide2',
        title: t('onboarding.slide2.title'),
        body: t('onboarding.slide2.body'),
        cta: t('onboarding.cta'),
        isFinal: false,
      },
      {
        key: 'slide3',
        title: t('onboarding.slide3.title'),
        body: t('onboarding.slide3.body'),
        cta: t('onboarding.ctaFinal'),
        isFinal: true,
      },
    ],
    [t],
  );

  // One Animated.Value per segment, seeded for slide 0 being active on mount.
  const segmentWidths = useRef(
    Array.from(
      { length: SLIDE_COUNT },
      (_, i) => new Animated.Value(i === 0 ? ACTIVE_SEG_WIDTH : INACTIVE_SEG_WIDTH),
    ),
  ).current;

  // Spring-animate each segment to its new width whenever the active slide changes.
  // tension/friction chosen for a snappy feel with a very slight overshoot (bounce).
  useEffect(() => {
    Animated.parallel(
      segmentWidths.map((anim, i) =>
        Animated.spring(anim, {
          toValue: i === activeIndex ? ACTIVE_SEG_WIDTH : INACTIVE_SEG_WIDTH,
          tension: 180,
          friction: 10,
          useNativeDriver: false,
        }),
      ),
    ).start();
  }, [activeIndex, segmentWidths]);

  // Bug fix: router.replace must be called AFTER the shared hasSeenOnboarding
  // state commits and the Stack.Protected guards in RootNavigator have flipped.
  // useEffect fires post-commit, guaranteeing the auth route is accessible.
  useEffect(() => {
    if (hasSeenOnboarding === true && pendingDestination.current) {
      const dest = pendingDestination.current;
      pendingDestination.current = null;
      router.replace(dest);
    }
  }, [hasSeenOnboarding]);

  const handleSkip = useCallback(async () => {
    pendingDestination.current = '/(auth)/sign-in' as Href;
    await markOnboardingSeen();
  }, [markOnboardingSeen]);

  const handleContinue = useCallback(
    async (slide: Slide, index: number) => {
      if (slide.isFinal) {
        pendingDestination.current = '/(auth)/sign-up' as Href;
        await markOnboardingSeen();
      } else {
        flatListRef.current?.scrollToIndex({ index: index + 1, animated: true });
      }
    },
    [markOnboardingSeen],
  );

  const renderSlide = useCallback(
    ({ item, index }: ListRenderItemInfo<Slide>) => (
      <View style={styles.slide}>
        {/* Image placeholder — replace with <Image> once assets are available */}
        <View style={styles.imagePlaceholder} />

        {/* Copy */}
        <AppText style={styles.title}>{item.title}</AppText>
        <AppText variant="body" muted style={styles.body}>
          {item.body}
        </AppText>

        {/* CTA */}
        <Button size="lg" onPress={() => handleContinue(item, index)} style={styles.ctaButton}>
          {item.isFinal ? item.cta : `${item.cta} →`}
        </Button>

        <Pressable onPress={handleSkip} style={styles.skipButton}>
          <AppText variant="body" muted>
            {t('onboarding.skip')}
          </AppText>
        </Pressable>
      </View>
    ),
    [handleContinue, handleSkip],
  );

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: Array<{ index: number | null }> }) => {
      if (viewableItems[0]?.index != null) {
        setActiveIndex(viewableItems[0].index);
      }
    },
    [],
  );

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={slides}
        renderItem={renderSlide}
        keyExtractor={(item) => item.key}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{ itemVisiblePercentThreshold: 50 }}
        style={styles.list}
        getItemLayout={(_, index) => ({
          length: SCREEN_WIDTH,
          offset: SCREEN_WIDTH * index,
          index,
        })}
      />

      {/* Fixed progress bar — outside the FlatList so it never scrolls */}
      <View style={styles.progressOverlay} pointerEvents="none">
        {Array.from({ length: SLIDE_COUNT }, (_, i) => (
          <Animated.View
            key={i}
            style={[
              i === activeIndex ? styles.progressSegmentActive : styles.progressSegmentInactive,
              { width: segmentWidths[i] },
            ]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  list: {
    flex: 1,
  },
  // Sits at a fixed vertical position regardless of which slide is shown.
  // bottom is anchored at 44% of screen height — just above the text/button content area.
  progressOverlay: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    bottom: SCREEN_HEIGHT * 0.44,
    flexDirection: 'row',
    gap: spacing.sm,
  },
  // Width is driven by Animated.Value (ACTIVE_SEG_WIDTH / INACTIVE_SEG_WIDTH).
  // flex is intentionally omitted — the Animated width handles sizing.
  progressSegmentInactive: {
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.border,
  },
  progressSegmentActive: {
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.primary,
  },
  slide: {
    width: SCREEN_WIDTH,
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    justifyContent: 'flex-end',
  },
  imagePlaceholder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: '45%',
    backgroundColor: colors.background,
  },
  title: {
    fontSize: 38,
    fontWeight: '900',
    color: colors.foreground,
    lineHeight: 44,
    marginBottom: spacing.md,
  },
  body: {
    lineHeight: 24,
    marginBottom: spacing.xl,
  },
  ctaButton: {},
  skipButton: {
    marginTop: spacing.md,
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
});
