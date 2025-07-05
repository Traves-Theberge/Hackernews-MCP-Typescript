import { setupTools } from "./index";
import { HackerNewsClient } from "../api/client";
import { 
  createMockItem, 
  createMockStoryWithMetadata, 
  createMockUserWithStats,
  createMockCacheStats 
} from "../test-helpers";

// Mock the HackerNews client
jest.mock("../api/client");
const MockedHackerNewsClient = HackerNewsClient as jest.MockedClass<typeof HackerNewsClient>;

// Mock the MCP server
const mockMcpServer = {
  registerTool: jest.fn()
};

describe("MCP Tools", () => {
  let mockHnClient: jest.Mocked<HackerNewsClient>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockHnClient = new MockedHackerNewsClient({
      baseUrl: "https://test.com",
      timeout: 5000
    }) as jest.Mocked<HackerNewsClient>;
  });

  describe("setupTools", () => {
    it("should register all expected tools", async () => {
      await setupTools(mockMcpServer as any, mockHnClient);

      // Verify all tools are registered
      expect(mockMcpServer.registerTool).toHaveBeenCalledTimes(5);
      
      // Check that specific tools are registered
      const registeredTools = mockMcpServer.registerTool.mock.calls.map(call => call[0]);
      expect(registeredTools).toContain("search_posts");
      expect(registeredTools).toContain("get_post");
      expect(registeredTools).toContain("search_user");
      expect(registeredTools).toContain("search_trending");
      expect(registeredTools).toContain("search_comments");
    });
  });

  describe("individual tool handlers", () => {
    let toolHandlers: { [key: string]: Function };

    beforeEach(async () => {
      await setupTools(mockMcpServer as any, mockHnClient);
      
      // Extract handlers from registerTool calls
      toolHandlers = {};
      mockMcpServer.registerTool.mock.calls.forEach(call => {
        const [name, , handler] = call;
        toolHandlers[name] = handler;
      });
    });

    describe("search_posts tool", () => {
      it("should search posts with query", async () => {
        const mockPosts = [
          { id: 123, title: "AI Post", by: "user1", score: 100, time: 1640995200, url: "https://example.com", descendants: 25 },
          { id: 456, title: "Machine Learning", by: "user2", score: 150, time: 1640995300, url: "https://test.com", descendants: 30 }
        ];

        mockHnClient.searchStories.mockResolvedValue(mockPosts);

        const result = await toolHandlers["search_posts"]({
          query: "AI",
          limit: 20
        });

        expect(mockHnClient.searchStories).toHaveBeenCalledWith({
          query: "AI",
          limit: 20
        });
        expect(result.content).toHaveLength(1);
        expect(result.content[0].type).toBe("text");
        
        const parsedContent = JSON.parse(result.content[0].text);
        expect(parsedContent.result_count).toBe(2);
        expect(parsedContent.posts).toHaveLength(2);
        expect(parsedContent.search_params.query).toBe("AI");
      });

      it("should search posts with multiple filters", async () => {
        const mockPosts = [
          { id: 123, title: "Test Post", by: "testuser", score: 200, time: 1640995200, url: "https://example.com", descendants: 50 }
        ];

        mockHnClient.searchStories.mockResolvedValue(mockPosts);

        const result = await toolHandlers["search_posts"]({
          query: "test",
          author: "testuser",
          minScore: 100,
          startTime: 1640995000,
          endTime: 1640996000,
          limit: 10
        });

        expect(mockHnClient.searchStories).toHaveBeenCalledWith({
          query: "test",
          author: "testuser",
          minScore: 100,
          startTime: 1640995000,
          endTime: 1640996000,
          limit: 10
        });
      });

      it("should handle search errors", async () => {
        mockHnClient.searchStories.mockRejectedValue(new Error("Search failed"));

        const result = await toolHandlers["search_posts"]({ query: "test" });

        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain("Error searching posts");
      });
    });

    describe("get_post tool", () => {
      it("should get post details without comments", async () => {
        const mockPost = createMockStoryWithMetadata({
          id: 123,
          title: "Test Post",
          by: "testuser",
          score: 100,
          domain: "example.com",
          ageHours: 2.5,
          commentCount: 25
        });

        mockHnClient.getStoryWithMetadata.mockResolvedValue(mockPost);

        const result = await toolHandlers["get_post"]({
          id: 123,
          includeComments: false
        });

        expect(mockHnClient.getStoryWithMetadata).toHaveBeenCalledWith(123);
        expect(result.content).toHaveLength(1);
        
        const parsedContent = JSON.parse(result.content[0].text);
        expect(parsedContent.post).toEqual(mockPost);
        expect(parsedContent.comments).toBeUndefined();
      });

      it("should get story details with comments", async () => {
        const mockStory = createMockStoryWithMetadata({
          id: 123,
          title: "Test Story",
          commentCount: 2
        });

        const mockComments = [
          createMockItem({ id: 456, type: "comment", text: "Comment 1", by: "user1" }),
          createMockItem({ id: 789, type: "comment", text: "Comment 2", by: "user2" })
        ];

        mockHnClient.getStoryWithMetadata.mockResolvedValue(mockStory);
        mockHnClient.getCommentTree.mockResolvedValue(mockComments);

        const result = await toolHandlers["get-story-details"]({
          id: 123,
          includeComments: true
        });

        expect(mockHnClient.getCommentTree).toHaveBeenCalledWith(123);
        
        const parsedContent = JSON.parse(result.content[0].text);
        expect(parsedContent.comments.count).toBe(2);
        expect(parsedContent.comments.tree).toEqual(mockComments);
      });

      it("should handle non-existent stories", async () => {
        mockHnClient.getStoryWithMetadata.mockResolvedValue(null);

        const result = await toolHandlers["get-story-details"]({ id: 999 });

        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain("Story 999 not found");
      });
    });

    describe("analyze-user tool", () => {
      it("should analyze user with statistics", async () => {
        const mockUserStats = createMockUserWithStats({
          id: "testuser",
          karma: 1000,
          created: 1640995200,
          about: "Test user",
          submitted: [123, 456, 789],
          averageScore: 150
        });

        mockHnClient.getUserWithStats.mockResolvedValue(mockUserStats);

        const result = await toolHandlers["analyze-user"]({
          username: "testuser",
          includeRecentItems: true
        });

        expect(mockHnClient.getUserWithStats).toHaveBeenCalledWith("testuser");
        expect(result.content).toHaveLength(1);
        
        const parsedContent = JSON.parse(result.content[0].text);
        expect(parsedContent.user_profile.username).toBe("testuser");
        expect(parsedContent.user_profile.karma).toBe(1000);
        expect(parsedContent.statistics.average_story_score).toBe(150);
        expect(parsedContent.recent_items.top_stories).toHaveLength(2);
      });

      it("should handle non-existent users", async () => {
        mockHnClient.getUserWithStats.mockResolvedValue(null);

        const result = await toolHandlers["analyze-user"]({ username: "nonexistent" });

        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain("User nonexistent not found");
      });
    });

    describe("get-trending-topics tool", () => {
      it("should analyze trending topics", async () => {
        const mockStoryIds = [123, 456, 789];
        const mockStories = [
          createMockItem({ id: 123, type: "story", title: "AI Revolution in Tech", by: "user1" }),
          createMockItem({ id: 456, type: "story", title: "Machine Learning Breakthrough", by: "user2" }),
          createMockItem({ id: 789, type: "story", title: "Artificial Intelligence Future", by: "user3" })
        ];

        mockHnClient.getTopStories.mockResolvedValue(mockStoryIds);
        mockHnClient.getMultipleItems.mockResolvedValue(mockStories);

        const result = await toolHandlers["get-trending-topics"]({
          storyCount: 50,
          minWordLength: 4
        });

        expect(mockHnClient.getTopStories).toHaveBeenCalled();
        expect(mockHnClient.getMultipleItems).toHaveBeenCalledWith(mockStoryIds);
        
        const parsedContent = JSON.parse(result.content[0].text);
        expect(parsedContent.analysis_summary.stories_analyzed).toBe(3);
        expect(parsedContent.trending_topics).toBeDefined();
        expect(Array.isArray(parsedContent.trending_topics)).toBe(true);
      });

      it("should handle empty story results", async () => {
        mockHnClient.getTopStories.mockResolvedValue([]);
        mockHnClient.getMultipleItems.mockResolvedValue([]);

        const result = await toolHandlers["get-trending-topics"]({});

        const parsedContent = JSON.parse(result.content[0].text);
        expect(parsedContent.analysis_summary.stories_analyzed).toBe(0);
        expect(parsedContent.trending_topics).toHaveLength(0);
      });
    });

    describe("compare-stories tool", () => {
      it("should compare multiple stories", async () => {
        const mockStories = [
          {
            id: 123,
            title: "Story 1",
            by: "user1",
            score: 200,
            commentCount: 50,
            ageHours: 2,
            domain: "example.com",
            url: "https://example.com/1"
          },
          {
            id: 456,
            title: "Story 2",
            by: "user2",
            score: 150,
            commentCount: 30,
            ageHours: 4,
            domain: "test.com",
            url: "https://test.com/2"
          }
        ];

        mockHnClient.getStoryWithMetadata
          .mockResolvedValueOnce(mockStories[0])
          .mockResolvedValueOnce(mockStories[1]);

        const result = await toolHandlers["compare-stories"]({
          storyIds: [123, 456]
        });

        expect(mockHnClient.getStoryWithMetadata).toHaveBeenCalledTimes(2);
        
        const parsedContent = JSON.parse(result.content[0].text);
        expect(parsedContent.comparison_summary.stories_compared).toBe(2);
        expect(parsedContent.stories).toHaveLength(2);
        expect(parsedContent.comparison_summary.average_score).toBe(175); // (200 + 150) / 2
      });

      it("should handle insufficient stories", async () => {
        mockHnClient.getStoryWithMetadata.mockResolvedValueOnce(null);

        const result = await toolHandlers["compare-stories"]({
          storyIds: [123]
        });

        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain("Need at least 2 valid stories");
      });
    });

    describe("analyze-comments tool", () => {
      it("should analyze comment statistics", async () => {
        const mockStory = createMockStoryWithMetadata({
          id: 123,
          title: "Test Story",
          by: "author",
          score: 100,
          commentCount: 5
        });

        const mockComments = [
          createMockItem({ id: 456, type: "comment", by: "user1", text: "Great article! Very informative.", parent: 123 }),
          createMockItem({ id: 789, type: "comment", by: "user2", text: "I disagree with the main point.", parent: 123 }),
          createMockItem({ id: 101, type: "comment", by: "user1", text: "Thanks for sharing this.", parent: 456 }),
          createMockItem({ id: 102, type: "comment", by: "user3", text: "Interesting perspective.", deleted: false, dead: false }),
          createMockItem({ id: 103, type: "comment", by: "user4", text: "Deleted comment", deleted: true })
        ];

        mockHnClient.getStoryWithMetadata.mockResolvedValue(mockStory);
        mockHnClient.getCommentTree.mockResolvedValue(mockComments);

        const result = await toolHandlers["analyze-comments"]({
          storyId: 123,
          maxDepth: 5
        });

        expect(mockHnClient.getCommentTree).toHaveBeenCalledWith(123);
        
        const parsedContent = JSON.parse(result.content[0].text);
        expect(parsedContent.story_id).toBe(123);
        expect(parsedContent.comment_statistics.total_comments).toBe(5);
        expect(parsedContent.comment_statistics.authors).toBe(4); // user1, user2, user3, user4
        expect(parsedContent.top_commenters).toBeDefined();
      });

      it("should handle stories with no comments", async () => {
        const mockStory = createMockStoryWithMetadata({ id: 123, title: "Test Story", commentCount: 0 });
        mockHnClient.getStoryWithMetadata.mockResolvedValue(mockStory);
        mockHnClient.getCommentTree.mockResolvedValue([]);

        const result = await toolHandlers["analyze-comments"]({ storyId: 123 });

        const parsedContent = JSON.parse(result.content[0].text);
        expect(parsedContent).toContain("No comments found");
      });
    });

    describe("clear-cache tool", () => {
      it("should clear cache and return statistics", async () => {
        const statsBefore = { items: 100, users: 20, lists: 5 };
        const statsAfter = { items: 0, users: 0, lists: 0 };

        mockHnClient.getCacheStats
          .mockReturnValueOnce(statsBefore)
          .mockReturnValueOnce(statsAfter);

        const result = await toolHandlers["clear-cache"]({});

        expect(mockHnClient.clearCache).toHaveBeenCalled();
        expect(mockHnClient.getCacheStats).toHaveBeenCalledTimes(2);
        
        const parsedContent = JSON.parse(result.content[0].text);
        expect(parsedContent.message).toBe("Cache cleared successfully");
        expect(parsedContent.before).toEqual(statsBefore);
        expect(parsedContent.after).toEqual(statsAfter);
      });
    });
  });

  describe("tool metadata", () => {
    it("should register tools with correct metadata", async () => {
      await setupTools(mockMcpServer as any, mockHnClient);

      const searchToolCall = mockMcpServer.registerTool.mock.calls.find(call => call[0] === "search-stories");
      expect(searchToolCall).toBeDefined();
      
      const [, metadata] = searchToolCall!;
      expect(metadata.title).toBe("Search HackerNews Stories");
      expect(metadata.description).toContain("Search and filter HackerNews stories");
      expect(metadata.inputSchema).toBeDefined();
    });
  });

  describe("error handling", () => {
    let toolHandlers: { [key: string]: Function };

    beforeEach(async () => {
      await setupTools(mockMcpServer as any, mockHnClient);
      
      toolHandlers = {};
      mockMcpServer.registerTool.mock.calls.forEach(call => {
        const [name, , handler] = call;
        toolHandlers[name] = handler;
      });
    });

    it("should handle API client errors gracefully", async () => {
      mockHnClient.searchStories.mockRejectedValue(new Error("Network error"));

      const result = await toolHandlers["search-stories"]({ query: "test" });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Error searching stories");
    });

    it("should handle invalid parameters", async () => {
      const result = await toolHandlers["compare-stories"]({ storyIds: [] });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Need at least 2 valid stories");
    });
  });

  describe("performance", () => {
    let toolHandlers: { [key: string]: Function };

    beforeEach(async () => {
      await setupTools(mockMcpServer as any, mockHnClient);
      
      toolHandlers = {};
      mockMcpServer.registerTool.mock.calls.forEach(call => {
        const [name, , handler] = call;
        toolHandlers[name] = handler;
      });
    });

    it("should handle concurrent tool executions", async () => {
      const mockStories = [{ id: 123, title: "Test", score: 100 }];
      mockHnClient.searchStories.mockResolvedValue(mockStories);

      const promises: Promise<any>[] = [];
      for (let i = 0; i < 5; i++) {
        promises.push(toolHandlers["search-stories"]({ query: `test${i}` }));
      }

      const results = await Promise.all(promises);
      expect(results).toHaveLength(5);
      expect(mockHnClient.searchStories).toHaveBeenCalledTimes(5);
    });

    it("should complete tool execution in reasonable time", async () => {
      const mockStoryIds = Array.from({ length: 50 }, (_, i) => i + 1);
      const mockStories = mockStoryIds.map(id => createMockItem({ id, type: "story", title: `Story ${id}` }));
      
      mockHnClient.getTopStories.mockResolvedValue(mockStoryIds);
      mockHnClient.getMultipleItems.mockResolvedValue(mockStories);

      const startTime = Date.now();
      await toolHandlers["get-trending-topics"]({ storyCount: 50 });
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(200); // Should complete in less than 200ms
    });
  });
}); 