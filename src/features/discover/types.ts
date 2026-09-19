import type { ComponentType } from 'react';

import type { BadgeVariant } from '@/features/home/components/Badge';

export type ClipFeedItem = {
  id: string;
  title: string;
  venueLine: string;
  viewerStat: string;
  likeCount?: string;
  commentCount?: string;
  imageUri?: string;
};

export type DiscoverMapVenueMarker = {
  id: string;
  title: string;
  latitude: number;
  longitude: number;
  venue?: string;
  price?: string;
  badges?: BadgeVariant[];
};

export type DiscoverMapCameraState = {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
};

export type DiscoverMapAdapterProps = {
  markers: DiscoverMapVenueMarker[];
  camera: DiscoverMapCameraState;
  onCameraChange?: (camera: DiscoverMapCameraState) => void;
  onMarkerPress?: (markerId: string) => void;
};

export type DiscoverMapAdapter = ComponentType<DiscoverMapAdapterProps>;
