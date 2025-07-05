import { 
  HackerNewsItem, 
  HackerNewsUser, 
  StoryWithMetadata, 
  UserWithStats,
  ItemType 
} from "./types/hackernews";

export const createMockItem = (overrides: Partial<HackerNewsItem> = {}): HackerNewsItem => ({
  id: 123,
  type: "story" as ItemType,
  by: "testuser",
  time: Date.now() / 1000,
  title: "Test Story",
  score: 100,
  descendants: 25,
  ...overrides
});

export const createMockUser = (overrides: Partial<HackerNewsUser> = {}): HackerNewsUser => ({
  id: "testuser",
  created: 1640995200,
  karma: 1000,
  about: "Test user",
  submitted: [123, 456, 789],
  ...overrides
});

export const createMockStoryWithMetadata = (overrides: Partial<StoryWithMetadata> = {}): StoryWithMetadata => ({
  id: 123,
  type: "story" as ItemType,
  by: "testuser",
  time: Date.now() / 1000,
  title: "Test Story",
  score: 100,
  descendants: 25,
  url: "https://example.com",
  domain: "example.com",
  ageHours: 2.5,
  commentCount: 25,
  ...overrides
});

export const createMockUserWithStats = (overrides: Partial<UserWithStats> = {}): UserWithStats => ({
  id: "testuser",
  created: 1640995200,
  karma: 1000,
  about: "Test user",
  submitted: [123, 456, 789],
  averageScore: 150,
  topStories: [
    createMockItem({ id: 123, title: "Top Story 1", score: 200, descendants: 50 }),
    createMockItem({ id: 456, title: "Top Story 2", score: 180, descendants: 30 })
  ],
  recentActivity: [
    createMockItem({ id: 789, type: "comment", text: "Recent comment", score: 10 })
  ],
  ...overrides
});

export const createMockComment = (overrides: Partial<HackerNewsItem> = {}): HackerNewsItem => ({
  id: 456,
  type: "comment" as ItemType,
  by: "commenter",
  time: Date.now() / 1000,
  text: "This is a comment",
  parent: 123,
  ...overrides
});

export const createMockCacheStats = (): { items: number; users: number; lists: number } => ({
  items: 100,
  users: 25,
  lists: 10
}); 