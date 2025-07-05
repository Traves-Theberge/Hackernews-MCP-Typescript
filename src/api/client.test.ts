// Mock node-fetch
jest.mock("node-fetch", () => jest.fn());

import fetch, { Response } from "node-fetch";
import { HackerNewsClient, HackerNewsClientError } from "./client";
import { HackerNewsItem, HackerNewsUser } from "../types/hackernews";

const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

describe("HackerNewsClient", () => {
  let client: HackerNewsClient;

  beforeEach(() => {
    client = new HackerNewsClient({
      baseUrl: "https://hacker-news.firebaseio.com/v0",
      timeout: 5000,
      cacheOptions: { ttlSeconds: 60, maxSize: 100 }
    });
    mockFetch.mockClear();
  });

  describe("constructor", () => {
    it("should initialize with default options", () => {
      const defaultClient = new HackerNewsClient({
        baseUrl: "https://test.com",
        timeout: 1000
      });
      expect(defaultClient).toBeDefined();
    });

    it("should initialize with custom cache options", () => {
      const customClient = new HackerNewsClient({
        baseUrl: "https://test.com",
        timeout: 1000,
        cacheOptions: { ttlSeconds: 300, maxSize: 500 }
      });
      expect(customClient).toBeDefined();
    });
  });

  describe("getItem", () => {
    const mockItem: HackerNewsItem = {
      id: 123,
      type: "story",
      title: "Test Story",
      by: "testuser",
      score: 100,
      time: 1640995200,
      url: "https://example.com",
      descendants: 50
    };

    it("should fetch and return an item", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockItem,
        status: 200,
        statusText: "OK"
      } as Response);

      const result = await client.getItem(123);
      expect(result).toEqual(mockItem);
      expect(mockFetch).toHaveBeenCalledWith(
        "https://hacker-news.firebaseio.com/v0/item/123.json",
        expect.objectContaining({
          signal: expect.any(AbortSignal)
        })
      );
    });

    it("should return null for non-existent item", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => null,
        status: 200,
        statusText: "OK"
      } as Response);

      const result = await client.getItem(999999);
      expect(result).toBeNull();
    });

    it("should cache items", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockItem,
        status: 200,
        statusText: "OK"
      } as Response);

      // First call
      await client.getItem(123);
      // Second call should use cache
      const result = await client.getItem(123);

      expect(result).toEqual(mockItem);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it("should handle network errors", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      await expect(client.getItem(123)).rejects.toThrow(HackerNewsClientError);
    });

    it("should handle HTTP errors", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: "Internal Server Error"
      } as Response);

      await expect(client.getItem(123)).rejects.toThrow(HackerNewsClientError);
    });

    it("should handle timeout", async () => {
      const timeoutClient = new HackerNewsClient({
        baseUrl: "https://test.com",
        timeout: 1
      });

      mockFetch.mockImplementationOnce(() => 
        new Promise(resolve => setTimeout(resolve, 100))
      );

      await expect(timeoutClient.getItem(123)).rejects.toThrow();
    });
  });

  describe("getUser", () => {
    const mockUser: HackerNewsUser = {
      id: "testuser",
      created: 1640995200,
      karma: 1000,
      about: "Test user",
      submitted: [123, 456, 789]
    };

    it("should fetch and return a user", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockUser,
        status: 200,
        statusText: "OK"
      } as Response);

      const result = await client.getUser("testuser");
      expect(result).toEqual(mockUser);
      expect(mockFetch).toHaveBeenCalledWith(
        "https://hacker-news.firebaseio.com/v0/user/testuser.json",
        expect.objectContaining({
          signal: expect.any(AbortSignal)
        })
      );
    });

    it("should return null for non-existent user", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => null,
        status: 200,
        statusText: "OK"
      } as Response);

      const result = await client.getUser("nonexistent");
      expect(result).toBeNull();
    });

    it("should cache users", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockUser,
        status: 200,
        statusText: "OK"
      } as Response);

      // First call
      await client.getUser("testuser");
      // Second call should use cache
      const result = await client.getUser("testuser");

      expect(result).toEqual(mockUser);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe("getTopStories", () => {
    const mockStoryIds = [123, 456, 789, 101112];

    it("should fetch and return top story IDs", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockStoryIds,
        status: 200,
        statusText: "OK"
      } as Response);

      const result = await client.getTopStories();
      expect(result).toEqual(mockStoryIds);
      expect(mockFetch).toHaveBeenCalledWith(
        "https://hacker-news.firebaseio.com/v0/topstories.json",
        expect.objectContaining({
          signal: expect.any(AbortSignal)
        })
      );
    });

    it("should cache story lists", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockStoryIds,
        status: 200,
        statusText: "OK"
      } as Response);

      // First call
      await client.getTopStories();
      // Second call should use cache
      const result = await client.getTopStories();

      expect(result).toEqual(mockStoryIds);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe("getMultipleItems", () => {
    const mockItems = [
      { id: 123, type: "story", title: "Story 1" },
      { id: 456, type: "story", title: "Story 2" },
      null, // Deleted item
      { id: 789, type: "comment", text: "Comment 1" }
    ];

    it("should fetch multiple items in parallel", async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockItems[0],
          status: 200,
          statusText: "OK"
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockItems[1],
          status: 200,
          statusText: "OK"
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockItems[2],
          status: 200,
          statusText: "OK"
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockItems[3],
          status: 200,
          statusText: "OK"
        } as Response);

      const result = await client.getMultipleItems([123, 456, 999, 789]);
      expect(result).toEqual(mockItems);
      expect(mockFetch).toHaveBeenCalledTimes(4);
    });

    it("should handle empty array", async () => {
      const result = await client.getMultipleItems([]);
      expect(result).toEqual([]);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("should handle partial failures", async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockItems[0],
          status: 200,
          statusText: "OK"
        } as Response)
        .mockRejectedValueOnce(new Error("Network error"));

      const result = await client.getMultipleItems([123, 456]);
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual(mockItems[0]);
      expect(result[1]).toBeNull();
    });
  });

  describe("searchStories", () => {
    const mockStories = [
      { id: 123, type: "story", title: "AI Story", by: "user1", score: 100, time: 1640995200 },
      { id: 456, type: "story", title: "ML Research", by: "user2", score: 150, time: 1640995300 }
    ];

    beforeEach(() => {
      // Mock getTopStories for search
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [123, 456, 789],
        status: 200,
        statusText: "OK"
      } as Response);

      // Mock individual story fetches
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockStories[0],
          status: 200,
          statusText: "OK"
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockStories[1],
          status: 200,
          statusText: "OK"
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => null,
          status: 200,
          statusText: "OK"
        } as Response);
    });

    it("should search stories by query", async () => {
      const result = await client.searchStories({ query: "AI" });
      expect(result).toHaveLength(1);
      expect(result[0].title).toContain("AI");
    });

    it("should filter by author", async () => {
      const result = await client.searchStories({ author: "user1" });
      expect(result).toHaveLength(1);
      expect(result[0].by).toBe("user1");
    });

    it("should filter by minimum score", async () => {
      const result = await client.searchStories({ minScore: 120 });
      expect(result).toHaveLength(1);
      expect(result[0].score).toBeGreaterThanOrEqual(120);
    });

    it("should filter by time range", async () => {
      const result = await client.searchStories({ 
        startTime: 1640995250, 
        endTime: 1640995350 
      });
      expect(result).toHaveLength(1);
      expect(result[0].time).toBe(1640995300);
    });

    it("should respect limit", async () => {
      const result = await client.searchStories({ limit: 1 });
      expect(result).toHaveLength(1);
    });
  });

  describe("getStoryWithMetadata", () => {
    const mockStory = {
      id: 123,
      type: "story",
      title: "Test Story",
      by: "testuser",
      score: 100,
      time: 1640995200,
      url: "https://example.com",
      descendants: 50
    };

    it("should return story with calculated metadata", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockStory,
        status: 200,
        statusText: "OK"
      } as Response);

      const result = await client.getStoryWithMetadata(123);
      expect(result).toMatchObject(mockStory);
      expect(result?.domain).toBe("example.com");
      expect(result?.ageHours).toBeGreaterThan(0);
      expect(result?.commentCount).toBe(50);
    });

    it("should return null for non-story items", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 123, type: "comment", text: "Test comment" }),
        status: 200,
        statusText: "OK"
      } as Response);

      const result = await client.getStoryWithMetadata(123);
      expect(result).toBeNull();
    });
  });

  describe("getUserWithStats", () => {
    const mockUser = {
      id: "testuser",
      created: 1640995200,
      karma: 1000,
      about: "Test user",
      submitted: [123, 456, 789]
    };

    const mockStories = [
      { id: 123, type: "story", title: "Story 1", score: 100 },
      { id: 456, type: "story", title: "Story 2", score: 200 },
      { id: 789, type: "comment", text: "Comment 1" }
    ];

    it("should return user with calculated statistics", async () => {
      // Mock user fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockUser,
        status: 200,
        statusText: "OK"
      } as Response);

      // Mock story fetches
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockStories[0],
          status: 200,
          statusText: "OK"
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockStories[1],
          status: 200,
          statusText: "OK"
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockStories[2],
          status: 200,
          statusText: "OK"
        } as Response);

      const result = await client.getUserWithStats("testuser");
      expect(result).toMatchObject(mockUser);
      expect(result?.averageScore).toBe(150); // (100 + 200) / 2
      expect(result?.topStories).toHaveLength(2);
      expect(result?.recentActivity).toHaveLength(3);
    });
  });

  describe("getCommentTree", () => {
    const mockStory = {
      id: 123,
      type: "story",
      title: "Test Story",
      kids: [456, 789]
    };

    const mockComments = [
      { id: 456, type: "comment", text: "Comment 1", parent: 123 },
      { id: 789, type: "comment", text: "Comment 2", parent: 123 }
    ];

    it("should fetch complete comment tree", async () => {
      // Mock story fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockStory,
        status: 200,
        statusText: "OK"
      } as Response);

      // Mock comment fetches
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockComments[0],
          status: 200,
          statusText: "OK"
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockComments[1],
          status: 200,
          statusText: "OK"
        } as Response);

      const result = await client.getCommentTree(123);
      expect(result).toEqual(mockComments);
    });

    it("should return empty array for story without comments", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 123, type: "story", title: "Test Story" }),
        status: 200,
        statusText: "OK"
      } as Response);

      const result = await client.getCommentTree(123);
      expect(result).toEqual([]);
    });
  });

  describe("cache operations", () => {
    it("should return cache statistics", () => {
      const stats = client.getCacheStats();
      expect(stats).toHaveProperty("items");
      expect(stats).toHaveProperty("users");
      expect(stats).toHaveProperty("lists");
    });

    it("should clear cache", async () => {
      // Add something to cache first
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 123, type: "story", title: "Test" }),
        status: 200,
        statusText: "OK"
      } as Response);

      await client.getItem(123);
      
      // Clear cache
      client.clearCache();
      
      // Should fetch again after cache clear
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 123, type: "story", title: "Test" }),
        status: 200,
        statusText: "OK"
      } as Response);

      await client.getItem(123);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  describe("error handling", () => {
    it("should handle malformed JSON", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => { throw new Error("Invalid JSON"); },
        status: 200,
        statusText: "OK"
      } as unknown as Response);

      await expect(client.getItem(123)).rejects.toThrow(HackerNewsClientError);
    });

    it("should handle network timeouts", async () => {
      const timeoutClient = new HackerNewsClient({
        baseUrl: "https://test.com",
        timeout: 1
      });

      mockFetch.mockImplementationOnce(() => 
        new Promise(resolve => setTimeout(resolve, 100))
      );

      await expect(timeoutClient.getItem(123)).rejects.toThrow();
    });

    it("should handle rate limiting", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        statusText: "Too Many Requests"
      } as Response);

      await expect(client.getItem(123)).rejects.toThrow(HackerNewsClientError);
    });
  });
}); 