import fetch from "node-fetch";
import { 
  HackerNewsItem, 
  HackerNewsUser, 
  HackerNewsUpdates, 
  APIResponse,
  SearchParams,
  StoryWithMetadata,
  UserWithStats,
  ItemType
} from "../types/hackernews.js";
import { SimpleCache } from "../utils/cache.js";
import { logger } from "../utils/logger.js";

export interface HackerNewsClientOptions {
  baseUrl: string;
  timeout: number;
  cacheOptions?: {
    ttlSeconds: number;
    maxSize: number;
  };
}

export class HackerNewsClientError extends Error {
  constructor(message: string, public readonly statusCode?: number) {
    super(message);
    this.name = "HackerNewsClientError";
  }
}

export class HackerNewsClient {
  private readonly baseUrl: string;
  private readonly timeout: number;
  private readonly itemCache: SimpleCache<HackerNewsItem>;
  private readonly userCache: SimpleCache<HackerNewsUser>;
  private readonly listCache: SimpleCache<number[]>;

  constructor(options: HackerNewsClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, ""); // Remove trailing slash
    this.timeout = options.timeout;
    
    const cacheOptions = options.cacheOptions || { ttlSeconds: 300, maxSize: 1000 };
    this.itemCache = new SimpleCache<HackerNewsItem>(cacheOptions.ttlSeconds, cacheOptions.maxSize);
    this.userCache = new SimpleCache<HackerNewsUser>(cacheOptions.ttlSeconds, cacheOptions.maxSize);
    this.listCache = new SimpleCache<number[]>(cacheOptions.ttlSeconds, Math.floor(cacheOptions.maxSize / 10));
  }

  // Core API methods
  async getItem(id: number): Promise<APIResponse<HackerNewsItem>> {
    const cacheKey = `item:${id}`;
    const cached = this.itemCache.get(cacheKey);
    if (cached) {
      logger.debug(`Cache hit for item ${id}`);
      return cached;
    }

    try {
      const response = await this.fetchWithTimeout(`${this.baseUrl}/item/${id}.json`);
      const item = await response.json() as HackerNewsItem;
      
      if (item) {
        this.itemCache.set(cacheKey, item);
      }
      
      return item;
    } catch (error) {
      logger.error(`Failed to fetch item ${id}:`, error);
      throw new HackerNewsClientError(`Failed to fetch item ${id}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async getUser(id: string): Promise<APIResponse<HackerNewsUser>> {
    const cacheKey = `user:${id}`;
    const cached = this.userCache.get(cacheKey);
    if (cached) {
      logger.debug(`Cache hit for user ${id}`);
      return cached;
    }

    try {
      const response = await this.fetchWithTimeout(`${this.baseUrl}/user/${id}.json`);
      const user = await response.json() as HackerNewsUser;
      
      if (user) {
        this.userCache.set(cacheKey, user);
      }
      
      return user;
    } catch (error) {
      logger.error(`Failed to fetch user ${id}:`, error);
      throw new HackerNewsClientError(`Failed to fetch user ${id}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async getMaxItemId(): Promise<number> {
    try {
      const response = await this.fetchWithTimeout(`${this.baseUrl}/maxitem.json`);
      return await response.json() as number;
    } catch (error) {
      logger.error("Failed to fetch max item ID:", error);
      throw new HackerNewsClientError(`Failed to fetch max item ID: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // Story collection methods
  async getTopStories(): Promise<number[]> {
    return this.getStoryList("topstories");
  }

  async getNewStories(): Promise<number[]> {
    return this.getStoryList("newstories");
  }

  async getBestStories(): Promise<number[]> {
    return this.getStoryList("beststories");
  }

  async getAskStories(): Promise<number[]> {
    return this.getStoryList("askstories");
  }

  async getShowStories(): Promise<number[]> {
    return this.getStoryList("showstories");
  }

  async getJobStories(): Promise<number[]> {
    return this.getStoryList("jobstories");
  }

  async getUpdates(): Promise<HackerNewsUpdates> {
    try {
      const response = await this.fetchWithTimeout(`${this.baseUrl}/updates.json`);
      return await response.json() as HackerNewsUpdates;
    } catch (error) {
      logger.error("Failed to fetch updates:", error);
      throw new HackerNewsClientError(`Failed to fetch updates: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // Enhanced methods with metadata
  async getStoryWithMetadata(id: number): Promise<StoryWithMetadata | null> {
    const item = await this.getItem(id);
    if (!item || item.type !== "story") {
      return null;
    }

    const commentCount = item.descendants || 0;
    const ageHours = item.time ? (Date.now() / 1000 - item.time) / 3600 : 0;
    const domain = item.url ? this.extractDomain(item.url) : undefined;

    return {
      ...item,
      commentCount,
      ageHours,
      domain,
    };
  }

  async getUserWithStats(id: string): Promise<UserWithStats | null> {
    const user = await this.getUser(id);
    if (!user) {
      return null;
    }

    // Get user's recent submissions for stats
    const recentSubmissions = user.submitted ? user.submitted.slice(0, 10) : [];
    const recentItems = await Promise.all(
      recentSubmissions.map(itemId => this.getItem(itemId))
    );

    const validItems = recentItems.filter((item): item is HackerNewsItem => item !== null);
    const stories = validItems.filter(item => item.type === "story");
    
    const averageScore = stories.length > 0 
      ? stories.reduce((sum, story) => sum + (story.score || 0), 0) / stories.length 
      : undefined;

    return {
      ...user,
      averageScore,
      topStories: stories.slice(0, 5),
      recentActivity: validItems.slice(0, 5),
    };
  }

  // Search and filter methods
  async searchStories(params: SearchParams): Promise<HackerNewsItem[]> {
    const topStories = await this.getTopStories();
    const storyLimit = Math.min(params.limit || 50, 100); // Limit to avoid too many API calls
    
    const stories = await Promise.all(
      topStories.slice(0, storyLimit * 2).map(id => this.getItem(id))
    );

    const validStories = stories.filter((story): story is HackerNewsItem => 
      story !== null && story.type === "story"
    );

    return this.filterStories(validStories, params).slice(0, storyLimit);
  }

  async getCommentTree(itemId: number): Promise<HackerNewsItem[]> {
    const item = await this.getItem(itemId);
    if (!item || !item.kids) {
      return [];
    }

    const comments: HackerNewsItem[] = [];
    await this.loadCommentsRecursively(item.kids, comments);
    return comments;
  }

  // Batch operations
  async getMultipleItems(ids: number[]): Promise<(HackerNewsItem | null)[]> {
    const batchSize = 10;
    const results: (HackerNewsItem | null)[] = [];

    for (let i = 0; i < ids.length; i += batchSize) {
      const batch = ids.slice(i, i + batchSize);
      const batchResults = await Promise.all(batch.map(id => this.getItem(id)));
      results.push(...batchResults);
    }

    return results;
  }

  // Private helper methods
  private async getStoryList(endpoint: string): Promise<number[]> {
    const cacheKey = `list:${endpoint}`;
    const cached = this.listCache.get(cacheKey);
    if (cached) {
      logger.debug(`Cache hit for ${endpoint}`);
      return cached;
    }

    try {
      const response = await this.fetchWithTimeout(`${this.baseUrl}/${endpoint}.json`);
      const stories = await response.json() as number[];
      
      this.listCache.set(cacheKey, stories);
      return stories;
    } catch (error) {
      logger.error(`Failed to fetch ${endpoint}:`, error);
      throw new HackerNewsClientError(`Failed to fetch ${endpoint}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async fetchWithTimeout(url: string): Promise<import("node-fetch").Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new HackerNewsClientError(`HTTP ${response.status}: ${response.statusText}`, response.status);
      }

      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === "AbortError") {
        throw new HackerNewsClientError(`Request timeout after ${this.timeout}ms`);
      }
      throw error;
    }
  }

  private filterStories(stories: HackerNewsItem[], params: SearchParams): HackerNewsItem[] {
    return stories.filter(story => {
      if (params.query && story.title && !story.title.toLowerCase().includes(params.query.toLowerCase())) {
        return false;
      }
      
      if (params.author && story.by !== params.author) {
        return false;
      }
      
      if (params.minScore && (story.score || 0) < params.minScore) {
        return false;
      }
      
      if (params.startTime && story.time && story.time < params.startTime) {
        return false;
      }
      
      if (params.endTime && story.time && story.time > params.endTime) {
        return false;
      }
      
      if (params.itemType && story.type !== params.itemType) {
        return false;
      }
      
      return true;
    });
  }

  private async loadCommentsRecursively(kidIds: number[], comments: HackerNewsItem[]): Promise<void> {
    const batchSize = 5;
    for (let i = 0; i < kidIds.length; i += batchSize) {
      const batch = kidIds.slice(i, i + batchSize);
      const batchComments = await Promise.all(batch.map(id => this.getItem(id)));
      
      for (const comment of batchComments) {
        if (comment && comment.type === "comment") {
          comments.push(comment);
          if (comment.kids) {
            await this.loadCommentsRecursively(comment.kids, comments);
          }
        }
      }
    }
  }

  private extractDomain(url: string): string | undefined {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname;
    } catch {
      return undefined;
    }
  }

  // Cache management
  getCacheStats(): { items: number; users: number; lists: number } {
    return {
      items: this.itemCache.size(),
      users: this.userCache.size(),
      lists: this.listCache.size(),
    };
  }

  clearCache(): void {
    this.itemCache.clear();
    this.userCache.clear();
    this.listCache.clear();
    logger.info("Cache cleared");
  }
} 