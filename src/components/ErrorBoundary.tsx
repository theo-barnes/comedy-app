import { Component, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import i18n from '@/i18n';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { colors, spacing } from '@/theme';

type Props = { children: ReactNode };
type State = { hasError: boolean };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  handleReset = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <AppText variant="heading" style={styles.title}>
            {i18n.t('common.error')}
          </AppText>
          <AppText variant="body" muted style={styles.body}>
            {i18n.t('common.errorRestart')}
          </AppText>
          <Button variant="secondary" onPress={this.handleReset}>
            {i18n.t('common.retry')}
          </Button>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    padding: spacing.xl,
  },
  title: {
    fontWeight: '700',
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  body: {
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
});
