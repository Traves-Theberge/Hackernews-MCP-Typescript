import { setupResources } from "./index";
import { HackerNewsClient } from "../api/client";

// Mock the HackerNews client
jest.mock("../api/client");
const MockedHackerNewsClient = HackerNewsClient as jest.MockedClass<typeof HackerNewsClient>;

// Mock the MCP server
const mockMcpServer = {
  registerResource: jest.fn()
};

describe("MCP Resources", () => {
  let mockHnClient: jest.Mocked<HackerNewsClient>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockHnClient = new MockedHackerNewsClient({
      baseUrl: "https://test.com",
      timeout: 5000
    }) as jest.Mocked<HackerNewsClient>;
  });

  describe("setupResources", () => {
    it("should register all expected resources", async () => {
      await setupResources(mockMcpServer as any, mockHnClient);

      // Verify all resources are registered
      expect(mockMcpServer.registerResource).toHaveBeenCalledTimes(14);
      
      // Check that specific resources are registered
      const registeredResources = mockMcpServer.registerResource.mock.calls.map(call => call[0]);
      expect(registeredResources).toContain("item");
      expect(registeredResources).toContain("story");
      expect(registeredResources).toContain("user");
      expect(registeredResources).toContain("user-stats");
      expect(registeredResources).toContain("top-stories");
      expect(registeredResources).toContain("new-stories");
      expect(registeredResources).toContain("best-stories");
      expect(registeredResources).toContain("ask-stories");
      expect(registeredResources).toContain("show-stories");
      expect(registeredResources).toContain("job-stories");
      expect(registeredResources).toContain("comments");
      expect(registeredResources).toContain("updates");
      expect(registeredResources).toContain("max-item");
      expect(registeredResources).toContain("cache-stats");
    });
  });

  describe("individual resource handlers", () => {
    let resourceHandlers: { [key: string]: Function };

    beforeEach(async () => {
      await setupResources(mockMcpServer as any, mockHnClient);
      
      // Extract handlers from registerResource calls
      resourceHandlers = {};
      mockMcpServer.registerResource.mock.calls.forEach(call => {
        const [name, , , handler] = call;
        resourceHandlers[name] = handler;
      });
    });

    describe("item resource", () => {
      it("should fetch and return item data", async () => {
        const mockItem = {
          id: 123,
          type: "story",
          title: "Test Story",
          by: "testuser",
          score: 100
        };

        mockHnClient.getItem.mockResolvedValue(mockItem);

        const result = await resourceHandlers["item"]({ href: "hackernews://item/123" }, { id: "123" });

        expect(mockHnClient.getItem).toHaveBeenCalledWith(123);
        expect(result.contents).toHaveLength(1);
        expect(result.contents[0].mimeType).toBe("application/json");
        expect(JSON.parse(result.contents[0].text)).toEqual(mockItem);
      });

      it("should handle non-existent items", async () => {
        mockHnClient.getItem.mockResolvedValue(null);

        await expect(
          resourceHandlers["item"]({ href: "hackernews://item/999" }, { id: "999" })
        ).rejects.toThrow("Item 999 not found");
      });

      it("should handle invalid item IDs", async () => {
        await expect(
          resourceHandlers["item"]({ href: "hackernews://item/invalid" }, { id: "invalid" })
        ).rejects.toThrow("Invalid item ID: invalid");
      });
    });

    describe("story resource", () => {
      it("should fetch story with metadata", async () => {
        const mockStory = {
          id: 123,
          type: "story",
          title: "Test Story",
          by: "testuser",
          score: 100,
          domain: "example.com",
          ageHours: 2.5,
          commentCount: 25
        };

        mockHnClient.getStoryWithMetadata.mockResolvedValue(mockStory);

        const result = await resourceHandlers["story"]({ href: "hackernews://story/123" }, { id: "123" });

        expect(mockHnClient.getStoryWithMetadata).toHaveBeenCalledWith(123);
        expect(result.contents).toHaveLength(1);
        expect(JSON.parse(result.contents[0].text)).toEqual(mockStory);
      });

      it("should handle non-story items", async () => {
        mockHnClient.getStoryWithMetadata.mockResolvedValue(null);

        await expect(
          resourceHandlers["story"]({ href: "hackernews://story/123" }, { id: "123" })
        ).rejects.toThrow("Story 123 not found or is not a story");
      });
    });

    describe("user resource", () => {
      it("should fetch user profile", async () => {
        const mockUser = {
          id: "testuser",
          created: 1640995200,
          karma: 1000,
          about: "Test user",
          submitted: [123, 456, 789]
        };

        mockHnClient.getUser.mockResolvedValue(mockUser);

        const result = await resourceHandlers["user"]({ href: "hackernews://user/testuser" }, { username: "testuser" });

        expect(mockHnClient.getUser).toHaveBeenCalledWith("testuser");
        expect(result.contents).toHaveLength(1);
        expect(JSON.parse(result.contents[0].text)).toEqual(mockUser);
      });

      it("should handle non-existent users", async () => {
        mockHnClient.getUser.mockResolvedValue(null);

        await expect(
          resourceHandlers["user"]({ href: "hackernews://user/nonexistent" }, { username: "nonexistent" })
        ).rejects.toThrow("User nonexistent not found");
      });
    });

    describe("user-stats resource", () => {
      it("should fetch user with statistics", async () => {
        const mockUserStats = {
          id: "testuser",
          created: 1640995200,
          karma: 1000,
          about: "Test user",
          submitted: [123, 456, 789],
          averageScore: 150,
          topStories: [{ id: 123, title: "Top Story", score: 200 }],
          recentActivity: [{ id: 456, type: "comment", text: "Recent comment" }]
        };

        mockHnClient.getUserWithStats.mockResolvedValue(mockUserStats);

        const result = await resourceHandlers["user-stats"]({ href: "hackernews://user-stats/testuser" }, { username: "testuser" });

        expect(mockHnClient.getUserWithStats).toHaveBeenCalledWith("testuser");
        expect(result.contents).toHaveLength(1);
        expect(JSON.parse(result.contents[0].text)).toEqual(mockUserStats);
      });
    });

    describe("story collection resources", () => {
      const storyCollectionTests = [
        { name: "top-stories", method: "getTopStories", title: "Top Stories" },
        { name: "new-stories", method: "getNewStories", title: "New Stories" },
        { name: "best-stories", method: "getBestStories", title: "Best Stories" },
        { name: "ask-stories", method: "getAskStories", title: "Ask HN Stories" },
        { name: "show-stories", method: "getShowStories", title: "Show HN Stories" },
        { name: "job-stories", method: "getJobStories", title: "Job Stories" }
      ];

      storyCollectionTests.forEach(({ name, method, title }) => {
        it(`should fetch ${name}`, async () => {
          const mockStoryIds = [123, 456, 789, 101112];
          (mockHnClient as any)[method].mockResolvedValue(mockStoryIds);

          const result = await resourceHandlers[name]({ href: `hackernews://stories/${name.split('-')[1]}` });

          expect((mockHnClient as any)[method]).toHaveBeenCalled();
          expect(result.contents).toHaveLength(1);
          
          const parsedContent = JSON.parse(result.contents[0].text);
          expect(parsedContent.type).toBe("story_collection");
          expect(parsedContent.title).toBe(title);
          expect(parsedContent.story_ids).toEqual(mockStoryIds.slice(0, 30));
          expect(parsedContent.count).toBe(30);
        });
      });
    });

    describe("comments resource", () => {
      it("should fetch comment tree", async () => {
        const mockComments = [
          { id: 456, type: "comment", text: "First comment", parent: 123 },
          { id: 789, type: "comment", text: "Second comment", parent: 123 }
        ];

        mockHnClient.getCommentTree.mockResolvedValue(mockComments);

        const result = await resourceHandlers["comments"]({ href: "hackernews://comments/123" }, { id: "123" });

        expect(mockHnClient.getCommentTree).toHaveBeenCalledWith(123);
        expect(result.contents).toHaveLength(1);
        
        const parsedContent = JSON.parse(result.contents[0].text);
        expect(parsedContent.type).toBe("comment_tree");
        expect(parsedContent.item_id).toBe(123);
        expect(parsedContent.comment_count).toBe(2);
        expect(parsedContent.comments).toEqual(mockComments);
      });
    });

    describe("updates resource", () => {
      it("should fetch live updates", async () => {
        const mockUpdates = {
          items: [123, 456, 789],
          profiles: ["user1", "user2"]
        };

        mockHnClient.getUpdates.mockResolvedValue(mockUpdates);

        const result = await resourceHandlers["updates"]({ href: "hackernews://updates" });

        expect(mockHnClient.getUpdates).toHaveBeenCalled();
        expect(result.contents).toHaveLength(1);
        
        const parsedContent = JSON.parse(result.contents[0].text);
        expect(parsedContent.type).toBe("live_updates");
        expect(parsedContent.changed_items).toEqual(mockUpdates.items);
        expect(parsedContent.changed_profiles).toEqual(mockUpdates.profiles);
      });
    });

    describe("max-item resource", () => {
      it("should fetch maximum item ID", async () => {
        const mockMaxId = 38000000;

        mockHnClient.getMaxItemId.mockResolvedValue(mockMaxId);

        const result = await resourceHandlers["max-item"]({ href: "hackernews://max-item" });

        expect(mockHnClient.getMaxItemId).toHaveBeenCalled();
        expect(result.contents).toHaveLength(1);
        
        const parsedContent = JSON.parse(result.contents[0].text);
        expect(parsedContent.type).toBe("max_item_id");
        expect(parsedContent.max_id).toBe(mockMaxId);
      });
    });

    describe("cache-stats resource", () => {
      it("should fetch cache statistics", async () => {
        const mockCacheStats = {
          items: 150,
          users: 25,
          lists: 10
        };

        mockHnClient.getCacheStats.mockResolvedValue(mockCacheStats);

        const result = await resourceHandlers["cache-stats"]({ href: "hackernews://cache/stats" });

        expect(mockHnClient.getCacheStats).toHaveBeenCalled();
        expect(result.contents).toHaveLength(1);
        
        const parsedContent = JSON.parse(result.contents[0].text);
        expect(parsedContent.type).toBe("cache_statistics");
        expect(parsedContent.cache_stats).toEqual(mockCacheStats);
        expect(parsedContent.total_cached_items).toBe(185); // 150 + 25 + 10
      });
    });
  });

  describe("error handling", () => {
    let resourceHandlers: { [key: string]: Function };

    beforeEach(async () => {
      await setupResources(mockMcpServer as any, mockHnClient);
      
      resourceHandlers = {};
      mockMcpServer.registerResource.mock.calls.forEach(call => {
        const [name, , , handler] = call;
        resourceHandlers[name] = handler;
      });
    });

    it("should handle API client errors gracefully", async () => {
      mockHnClient.getItem.mockRejectedValue(new Error("Network error"));

      await expect(
        resourceHandlers["item"]({ href: "hackernews://item/123" }, { id: "123" })
      ).rejects.toThrow("Network error");
    });

    it("should handle malformed parameters", async () => {
      await expect(
        resourceHandlers["item"]({ href: "hackernews://item/abc" }, { id: "abc" })
      ).rejects.toThrow("Invalid item ID: abc");
    });

    it("should handle missing parameters", async () => {
      await expect(
        resourceHandlers["item"]({ href: "hackernews://item/" }, { id: undefined })
      ).rejects.toThrow();
    });
  });

  describe("resource metadata", () => {
    it("should register resources with correct metadata", async () => {
      await setupResources(mockMcpServer as any, mockHnClient);

      const itemResourceCall = mockMcpServer.registerResource.mock.calls.find(call => call[0] === "item");
      expect(itemResourceCall).toBeDefined();
      
      const [, , metadata] = itemResourceCall!;
      expect(metadata.title).toBe("HackerNews Item");
      expect(metadata.description).toContain("Access individual HackerNews items");
      expect(metadata.mimeType).toBe("application/json");
    });

    it("should register story resource with correct metadata", async () => {
      await setupResources(mockMcpServer as any, mockHnClient);

      const storyResourceCall = mockMcpServer.registerResource.mock.calls.find(call => call[0] === "story");
      expect(storyResourceCall).toBeDefined();
      
      const [, , metadata] = storyResourceCall!;
      expect(metadata.title).toBe("HackerNews Story with Metadata");
      expect(metadata.description).toContain("enhanced metadata");
      expect(metadata.mimeType).toBe("application/json");
    });
  });

  describe("performance", () => {
    let resourceHandlers: { [key: string]: Function };

    beforeEach(async () => {
      await setupResources(mockMcpServer as any, mockHnClient);
      
      resourceHandlers = {};
      mockMcpServer.registerResource.mock.calls.forEach(call => {
        const [name, , , handler] = call;
        resourceHandlers[name] = handler;
      });
    });

    it("should handle multiple concurrent resource requests", async () => {
      const mockItem = { id: 123, type: "story", title: "Test" };
      mockHnClient.getItem.mockResolvedValue(mockItem);

      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(
          resourceHandlers["item"]({ href: `hackernews://item/${i}` }, { id: String(i) })
        );
      }

      const results = await Promise.all(promises);
      expect(results).toHaveLength(10);
      expect(mockHnClient.getItem).toHaveBeenCalledTimes(10);
    });

    it("should complete resource fetching in reasonable time", async () => {
      const mockStoryIds = Array.from({ length: 100 }, (_, i) => i + 1);
      mockHnClient.getTopStories.mockResolvedValue(mockStoryIds);

      const startTime = Date.now();
      await resourceHandlers["top-stories"]({ href: "hackernews://stories/top" });
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(100); // Should complete in less than 100ms
    });
  });
}); 