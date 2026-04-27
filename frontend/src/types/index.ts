export interface User {
  id: number;
  username: string;
  email: string;
  avatar: string | null;
  bio: string | null;
  created_at: string;
  diaries_count?: number;
  visited_cities?: Record<string, { count: number; latitude: number | null; longitude: number | null }>;
}

export interface Tag {
  id: number;
  name: string;
  name_cn: string;
}

export interface NodeImage {
  id: number;
  node_id: number;
  image_url: string;
  image_order: number;
}

export interface ScheduleNode {
  id: number;
  diary_id: number;
  node_date: string;
  node_order: number;
  location_name: string;
  latitude: number | null;
  longitude: number | null;
  description: string | null;
  images?: NodeImage[];
}

export interface Diary {
  id: number;
  user_id: number;
  title: string;
  destination_city: string;
  start_date: string;
  end_date: string;
  cover_image: string | null;
  description: string | null;
  is_public: boolean;
  likes_count: number;
  comments_count: number;
  created_at: string;
  updated_at: string;
  duration_days: number;
  author: User;
  tags: Tag[];
  nodes?: ScheduleNode[];
  is_liked_by_current_user?: boolean;
}

export interface Comment {
  id: number;
  user_id: number;
  diary_id: number;
  parent_id: number | null;
  reply_to_user_id: number | null;
  content: string;
  likes_count: number;
  created_at: string;
  author: User;
  reply_to_user: User | null;
  replies?: Comment[];
}

export interface Destination {
  city: string;
  diary_count: number;
  rank?: number;
}

export interface ApiResponse<T> {
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginationResponse<T> {
  diaries?: T[];
  comments?: T[];
  total: number;
  page: number;
  per_page: number;
  pages: number;
}
