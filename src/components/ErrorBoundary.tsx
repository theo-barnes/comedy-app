import { Component, type ErrorInfo, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import i18n from '@/i18n';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Sentry } from '@/lib/sentry';
import { useTheme } from '@/providers/ThemeProvider';
import { spacing } from '@/theme/tokens';
import type { Theme } from '@/theme/types';

// ─── Class component ──────────────────────────────────────────────────────────

/**
 * ErrorBoundaryClass is a React class component that implements an error boundary. It catches JavaScript errors anywhere in its child component tree,
 *  logs those errors to Sentry, and displays a fallback UI instead of the component tree that crashed.
 */
type ClassProps = { children: ReactNode; theme: Theme };
type State = { hasError: boolean };

class ErrorBoundaryClass extends Component<ClassProps, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    Sentry.captureException(error, {
      contexts: { react: { componentStack: errorInfo.componentStack } },
    });
  }

  handleReset = () => {
    this.setState({ hasError: false });
  };

  render() {
    const { theme } = this.props;
    if (this.state.hasError) {
      return (
        <View style={[styles.container, { backgroundColor: theme.colors.surface }]}>
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

// ─── Function wrapper — injects theme into the class component ─────────────

type Props = { children: ReactNode };

export function ErrorBoundary({ children }: Props) {
  const { theme } = useTheme();
  return <ErrorBoundaryClass theme={theme}>{children}</ErrorBoundaryClass>;
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
