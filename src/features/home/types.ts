export type Event = {
  id: string;
  title: string;
  event_datetime: string;
  description?: string;
  image_url?: string;
  created_at?: string;
};

export type Announcement = {
  id: string;
  title: string;
  announcement_datetime: string;
  description?: string;
  image_url?: string;
  created_at?: string;
};

export type UserProfile = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  profile_picture?: string;
};
