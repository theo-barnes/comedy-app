import { useTranslation } from 'react-i18next';

import { HomeScreenLayout } from '@/features/home/components/HomeScreenLayout';

function getTimeOfDay(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'morning';
  if (hour < 18) return 'afternoon';
  return 'evening';
}

type Props = {
  displayName?: string;
};

export function ComedianHome({ displayName }: Props) {
  const { t } = useTranslation();
  const timeOfDay = getTimeOfDay();
  const name = displayName?.trim();

  return (
    <HomeScreenLayout
      heroTitle={
        name ? t('home.comedian.greeting', { timeOfDay, name }) : t('home.comedian.yourGigs')
      }
    />
  );
}
