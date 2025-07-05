// HackerNews API Types based on the official API documentation

export type ItemType = "job" | "story" | "comment" | "poll" | "pollopt" | "ask" | "show";

export interface HackerNewsItem {
  id: number;
  deleted?: boolean;
  type?: ItemType;
  by?: string;
  time?: number;
  text?: string;
  dead?: boolean;
  parent?: number;
  poll?: number;
  kids?: number[];
  url?: string;
  score?: number;
  title?: string;
  parts?: number[];
  descendants?: number;
}

export interface HackerNewsUser {
  id: string;
  delay?: number;
  created: number;
  karma: number;
  about?: string;
  submitted?: number[];
}

export interface HackerNewsUpdates {
  items: number[];
  profiles: string[];
}

export interface StoryCollection {
  stories: number[];
  lastUpdated: number;
}

// API Response types
export type APIResponse<T> = T | null;

// Search and filter types
export interface SearchParams {
  query?: string;
  author?: string;
  startTime?: number;
  endTime?: number;
  minScore?: number;
  itemType?: ItemType;
  limit?: number;
}

export interface StoryWithMetadata extends HackerNewsItem {
  commentCount: number;
  ageHours: number;
  domain?: string;
}

export interface UserWithStats extends HackerNewsUser {
  averageScore?: number;
  topStories?: HackerNewsItem[];
  recentActivity?: HackerNewsItem[];
} 