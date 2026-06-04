import { ScrollView, StyleSheet } from 'react-native';

import { EventCard } from '@/features/home/components/EventCard';
import { SectionHeader } from '@/features/home/components/SectionHeader';
import { spacing } from '@/theme';

type ThisWeekEvent = {
  id: string;
  title: string;
  subtitle: string;
};

type Props = {
  events: ThisWeekEvent[];
  sectionLabel: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function ThisWeekSection({ events, sectionLabel, actionLabel, onAction }: Props) {
  return (
    <>
      <SectionHeader label={sectionLabel} actionLabel={actionLabel} onAction={onAction} />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.horizontalList}
      >
        {events.map((event) => (
          <EventCard key={event.id} title={event.title} subtitle={event.subtitle} />
        ))}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  horizontalList: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    paddingBottom: spacing.sm,
  },
});
