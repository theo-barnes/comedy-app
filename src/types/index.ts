/**
 * Core domain types for the billd-tonight app.
 * These are stubs that grow as features are built — add fields as needed
 * when implementing feature modules rather than trying to define everything upfront.
 */

export type UserRole = 'fan' | 'comedian' | 'venue';

export type UserProfile = {
  id: string;
  display_name: string;
  role: UserRole;
  created_at: string;
  updated_at: string;
};

export type Venue = {
  id: string;
  name: string;
  city: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
};

export type Comedian = {
  id: string;
  name: string;
  bio: string | null;
  avatarUrl: string | null;
};

export type Event = {
  id: string;
  name: string;
  venueId: string;
  promoterId: string | null;
  description: string | null;
};

export type EventSession = {
  id: string;
  eventId: string;
  startsAt: string; // ISO 8601
  doorsAt: string | null;
  ticketUrl: string | null;
};

export type LineupSlot = {
  id: string;
  eventSessionId: string;
  comedianId: string;
  position: number;
  isHeadliner: boolean;
};

export type Clip = {
  id: string;
  comedianId: string;
  title: string;
  videoUrl: string;
  thumbnailUrl: string | null;
  durationSeconds: number | null;
};

export type Promoter = {
  id: string;
  name: string;
  contactEmail: string | null;
};
