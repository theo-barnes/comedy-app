import { useTranslation } from 'react-i18next';

import { HomeScreenLayout } from '@/features/home/components/HomeScreenLayout';

export function VenueHome() {
  const { t } = useTranslation();

  return <HomeScreenLayout heroTitle={t('home.venue.yourShows')} />;
}
