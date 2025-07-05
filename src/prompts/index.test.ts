import { setupPrompts } from "./index";
import { HackerNewsClient } from "../api/client";

// Mock the HackerNews client
jest.mock("../api/client");
const MockedHackerNewsClient = HackerNewsClient as jest.MockedClass<typeof HackerNewsClient>;

// Mock the MCP server
const mockMcpServer = {
  registerPrompt: jest.fn()
};

describe("MCP Prompts", () => {
  let mockHnClient: jest.Mocked<HackerNewsClient>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockHnClient = new MockedHackerNewsClient({
      baseUrl: "https://test.com",
      timeout: 5000
    }) as jest.Mocked<HackerNewsClient>;
  });

  describe("setupPrompts", () => {
    it("should register all expected prompts", async () => {
      await setupPrompts(mockMcpServer as any, mockHnClient);

      // Verify all prompts are registered
      expect(mockMcpServer.registerPrompt).toHaveBeenCalledTimes(3);
      
      // Check that specific prompts are registered
      const registeredPrompts = mockMcpServer.registerPrompt.mock.calls.map(call => call[0]);
      expect(registeredPrompts).toContain("analyze-story");
      expect(registeredPrompts).toContain("analyze-user-profile");
      expect(registeredPrompts).toContain("summarize-trending-topics");
    });
  });

  describe("individual prompt handlers", () => {
    let promptHandlers: { [key: string]: Function };

    beforeEach(async () => {
      await setupPrompts(mockMcpServer as any, mockHnClient);
      
      // Extract handlers from registerPrompt calls
      promptHandlers = {};
      mockMcpServer.registerPrompt.mock.calls.forEach(call => {
        const [name, , handler] = call;
        promptHandlers[name] = handler;
      });
    });

    describe("analyze-story prompt", () => {
      it("should generate story analysis prompt without comments", async () => {
        const mockStory = {
          id: 123,
          title: "Revolutionary AI Breakthrough",
          by: "researcher",
          score: 250,
          commentCount: 45,
          ageHours: 3.5,
          url: "https://example.com/ai-breakthrough",
          domain: "example.com",
          text: "This is the story content describing the breakthrough."
        };

        mockHnClient.getStoryWithMetadata.mockResolvedValue(mockStory);

        const result = await promptHandlers["analyze-story"]({
          storyId: "123",
          includeComments: "false",
          analysisDepth: "detailed"
        });

        expect(mockHnClient.getStoryWithMetadata).toHaveBeenCalledWith(123);
        expect(result.messages).toHaveLength(1);
        expect(result.messages[0].role).toBe("user");
        
        const promptText = result.messages[0].content.text;
        expect(promptText).toContain("Revolutionary AI Breakthrough");
        expect(promptText).toContain("researcher");
        expect(promptText).toContain("250 points");
        expect(promptText).toContain("45 comments");
        expect(promptText).toContain("example.com");
        expect(promptText).toContain("Analysis Tasks:");
        expect(promptText).toContain("Summarize the main topic");
        expect(promptText).toContain("Assess the story's relevance");
      });

      it("should generate story analysis prompt with comments", async () => {
        const mockStory = {
          id: 123,
          title: "Test Story",
          by: "author",
          score: 100,
          commentCount: 5,
          ageHours: 2,
          url: "https://test.com",
          domain: "test.com"
        };

        const mockComments = [
          { id: 456, by: "user1", text: "Great article! This really explains the concept well." },
          { id: 789, by: "user2", text: "I have some concerns about the methodology used in this study." },
          { id: 101, by: "user3", text: "Has anyone tried implementing this approach?" }
        ];

        mockHnClient.getStoryWithMetadata.mockResolvedValue(mockStory);
        mockHnClient.getCommentTree.mockResolvedValue(mockComments);

        const result = await promptHandlers["analyze-story"]({
          storyId: "123",
          includeComments: "true",
          analysisDepth: "comprehensive"
        });

        expect(mockHnClient.getCommentTree).toHaveBeenCalledWith(123);
        
        const promptText = result.messages[0].content.text;
        expect(promptText).toContain("Top Comments for Context:");
        expect(promptText).toContain("user1: \"Great article!");
        expect(promptText).toContain("user2: \"I have some concerns");
        expect(promptText).toContain("Comment Analysis Tasks:");
        expect(promptText).toContain("Identify main discussion themes");
        expect(promptText).toContain("strategic insights for content creators"); // comprehensive level
      });

      it("should handle different analysis depths", async () => {
        const mockStory = { id: 123, title: "Test", by: "user", score: 50, commentCount: 0, ageHours: 1 };
        mockHnClient.getStoryWithMetadata.mockResolvedValue(mockStory);

        // Test basic depth
        const basicResult = await promptHandlers["analyze-story"]({
          storyId: "123",
          analysisDepth: "basic"
        });
        const basicPrompt = basicResult.messages[0].content.text;
        expect(basicPrompt).not.toContain("Analyze the posting timing");
        expect(basicPrompt).not.toContain("strategic insights");

        // Test detailed depth
        const detailedResult = await promptHandlers["analyze-story"]({
          storyId: "123",
          analysisDepth: "detailed"
        });
        const detailedPrompt = detailedResult.messages[0].content.text;
        expect(detailedPrompt).toContain("Analyze the posting timing");
        expect(detailedPrompt).not.toContain("strategic insights");

        // Test comprehensive depth
        const comprehensiveResult = await promptHandlers["analyze-story"]({
          storyId: "123",
          analysisDepth: "comprehensive"
        });
        const comprehensivePrompt = comprehensiveResult.messages[0].content.text;
        expect(comprehensivePrompt).toContain("strategic insights");
      });

      it("should handle non-existent stories", async () => {
        mockHnClient.getStoryWithMetadata.mockResolvedValue(null);

        await expect(
          promptHandlers["analyze-story"]({ storyId: "999" })
        ).rejects.toThrow("Story 999 not found");
      });
    });

    describe("analyze-user-profile prompt", () => {
      it("should generate user analysis prompt", async () => {
        const mockUserStats = {
          id: "techexpert",
          karma: 2500,
          created: 1577836800, // 2020-01-01
          about: "Software engineer passionate about AI and machine learning",
          submitted: [123, 456, 789, 101, 102],
          averageScore: 125,
          topStories: [
            { id: 123, title: "Building Scalable ML Systems", score: 300, descendants: 75 },
            { id: 456, title: "The Future of Neural Networks", score: 250, descendants: 50 }
          ],
          recentActivity: [
            { id: 789, type: "story", title: "Recent AI Paper Review", score: 150 },
            { id: 101, type: "comment", text: "Interesting perspective on this approach", score: 25 }
          ]
        };

        mockHnClient.getUserWithStats.mockResolvedValue(mockUserStats);

        const result = await promptHandlers["analyze-user-profile"]({
          username: "techexpert",
          includeRecentActivity: "true",
          focusArea: "expertise"
        });

        expect(mockHnClient.getUserWithStats).toHaveBeenCalledWith("techexpert");
        expect(result.messages).toHaveLength(1);
        
        const promptText = result.messages[0].content.text;
        expect(promptText).toContain("techexpert");
        expect(promptText).toContain("2500 points");
        expect(promptText).toContain("Software engineer passionate");
        expect(promptText).toContain("Recent Activity Sample:");
        expect(promptText).toContain("Top Performing Stories:");
        expect(promptText).toContain("Building Scalable ML Systems");
        expect(promptText).toContain("expertise focus:");
        expect(promptText).toContain("Identify the user's areas of expertise");
      });

      it("should handle different focus areas", async () => {
        const mockUserStats = {
          id: "testuser",
          karma: 1000,
          created: 1640995200,
          submitted: [123],
          averageScore: 100,
          topStories: [],
          recentActivity: []
        };

        mockHnClient.getUserWithStats.mockResolvedValue(mockUserStats);

        // Test expertise focus
        const expertiseResult = await promptHandlers["analyze-user-profile"]({
          username: "testuser",
          focusArea: "expertise"
        });
        expect(expertiseResult.messages[0].content.text).toContain("areas of expertise");

        // Test engagement focus
        const engagementResult = await promptHandlers["analyze-user-profile"]({
          username: "testuser",
          focusArea: "engagement"
        });
        expect(engagementResult.messages[0].content.text).toContain("community engagement level");

        // Test influence focus
        const influenceResult = await promptHandlers["analyze-user-profile"]({
          username: "testuser",
          focusArea: "influence"
        });
        expect(influenceResult.messages[0].content.text).toContain("influence within the HackerNews community");

        // Test general focus (default)
        const generalResult = await promptHandlers["analyze-user-profile"]({
          username: "testuser",
          focusArea: "general"
        });
        expect(generalResult.messages[0].content.text).toContain("overall assessment");
      });

      it("should handle users without recent activity", async () => {
        const mockUserStats = {
          id: "quietuser",
          karma: 50,
          created: 1640995200,
          submitted: [],
          averageScore: 0,
          topStories: [],
          recentActivity: []
        };

        mockHnClient.getUserWithStats.mockResolvedValue(mockUserStats);

        const result = await promptHandlers["analyze-user-profile"]({
          username: "quietuser",
          includeRecentActivity: "false"
        });

        const promptText = result.messages[0].content.text;
        expect(promptText).toContain("quietuser");
        expect(promptText).not.toContain("Recent Activity Sample:");
        expect(promptText).not.toContain("Top Performing Stories:");
      });

      it("should handle non-existent users", async () => {
        mockHnClient.getUserWithStats.mockResolvedValue(null);

        await expect(
          promptHandlers["analyze-user-profile"]({ username: "nonexistent" })
        ).rejects.toThrow("User nonexistent not found");
      });
    });

    describe("summarize-trending-topics prompt", () => {
      it("should generate trending topics summary prompt", async () => {
        const mockStoryIds = [123, 456, 789, 101, 102];
        const mockStories = [
          { id: 123, type: "story", title: "AI Revolution in Healthcare", by: "medtech" },
          { id: 456, type: "story", title: "Machine Learning Breakthrough", by: "researcher" },
          { id: 789, type: "story", title: "Artificial Intelligence Ethics", by: "ethicist" },
          { id: 101, type: "story", title: "Quantum Computing Advances", by: "physicist" },
          { id: 102, type: "story", title: "Blockchain Technology Update", by: "cryptodev" }
        ];

        mockHnClient.getTopStories.mockResolvedValue(mockStoryIds);
        mockHnClient.getMultipleItems.mockResolvedValue(mockStories);

        const result = await promptHandlers["summarize-trending-topics"]({
          timeframe: "current",
          storyCount: "30",
          includeAnalysis: "true"
        });

        expect(mockHnClient.getTopStories).toHaveBeenCalled();
        expect(mockHnClient.getMultipleItems).toHaveBeenCalledWith(mockStoryIds);
        expect(result.messages).toHaveLength(1);
        
        const promptText = result.messages[0].content.text;
        expect(promptText).toContain("comprehensive summary of current HackerNews trending topics");
        expect(promptText).toContain("Timeframe: current");
        expect(promptText).toContain("Stories Analyzed: 5");
        expect(promptText).toContain("Top Trending Keywords:");
        expect(promptText).toContain("Featured Stories Sample:");
        expect(promptText).toContain("AI Revolution in Healthcare");
        expect(promptText).toContain("Analysis Tasks:");
        expect(promptText).toContain("Identify the main themes");
        expect(promptText).toContain("Summary Requirements:");
      });

      it("should handle different timeframes and analysis options", async () => {
        const mockStoryIds = [123];
        const mockStories = [{ id: 123, type: "story", title: "Test Story", by: "user" }];

        mockHnClient.getTopStories.mockResolvedValue(mockStoryIds);
        mockHnClient.getMultipleItems.mockResolvedValue(mockStories);

        // Test without analysis
        const noAnalysisResult = await promptHandlers["summarize-trending-topics"]({
          timeframe: "week",
          storyCount: "50",
          includeAnalysis: "false"
        });
        const noAnalysisPrompt = noAnalysisResult.messages[0].content.text;
        expect(noAnalysisPrompt).toContain("Timeframe: week");
        expect(noAnalysisPrompt).not.toContain("Analysis Tasks:");

        // Test with analysis (default)
        const withAnalysisResult = await promptHandlers["summarize-trending-topics"]({
          timeframe: "today"
        });
        const withAnalysisPrompt = withAnalysisResult.messages[0].content.text;
        expect(withAnalysisPrompt).toContain("Analysis Tasks:");
      });

      it("should handle empty story results", async () => {
        mockHnClient.getTopStories.mockResolvedValue([]);
        mockHnClient.getMultipleItems.mockResolvedValue([]);

        const result = await promptHandlers["summarize-trending-topics"]({});

        const promptText = result.messages[0].content.text;
        expect(promptText).toContain("Stories Analyzed: 0");
        expect(promptText).toContain("Top Trending Keywords:");
      });

      it("should extract trending keywords correctly", async () => {
        const mockStoryIds = [123, 456];
        const mockStories = [
          { id: 123, type: "story", title: "Machine Learning Revolution", by: "user1" },
          { id: 456, type: "story", title: "Machine Learning Applications", by: "user2" }
        ];

        mockHnClient.getTopStories.mockResolvedValue(mockStoryIds);
        mockHnClient.getMultipleItems.mockResolvedValue(mockStories);

        const result = await promptHandlers["summarize-trending-topics"]({});

        const promptText = result.messages[0].content.text;
        // Should identify "machine" and "learning" as trending keywords
        expect(promptText).toContain("machine");
        expect(promptText).toContain("learning");
      });
    });
  });

  describe("prompt metadata", () => {
    it("should register prompts with correct metadata", async () => {
      await setupPrompts(mockMcpServer as any, mockHnClient);

      const storyPromptCall = mockMcpServer.registerPrompt.mock.calls.find(call => call[0] === "analyze-story");
      expect(storyPromptCall).toBeDefined();
      
      const [, metadata] = storyPromptCall!;
      expect(metadata.title).toBe("Analyze HackerNews Story");
      expect(metadata.description).toContain("comprehensive analysis of a HackerNews story");
      expect(metadata.argsSchema).toBeDefined();
      expect(metadata.argsSchema.storyId).toBeDefined();
    });

    it("should have proper schema definitions", async () => {
      await setupPrompts(mockMcpServer as any, mockHnClient);

      const userPromptCall = mockMcpServer.registerPrompt.mock.calls.find(call => call[0] === "analyze-user-profile");
      expect(userPromptCall).toBeDefined();
      
      const [, metadata] = userPromptCall!;
      expect(metadata.argsSchema.username).toBeDefined();
      expect(metadata.argsSchema.includeRecentActivity).toBeDefined();
      expect(metadata.argsSchema.focusArea).toBeDefined();
    });
  });

  describe("error handling", () => {
    let promptHandlers: { [key: string]: Function };

    beforeEach(async () => {
      await setupPrompts(mockMcpServer as any, mockHnClient);
      
      promptHandlers = {};
      mockMcpServer.registerPrompt.mock.calls.forEach(call => {
        const [name, , handler] = call;
        promptHandlers[name] = handler;
      });
    });

    it("should handle API client errors gracefully", async () => {
      mockHnClient.getStoryWithMetadata.mockRejectedValue(new Error("Network error"));

      await expect(
        promptHandlers["analyze-story"]({ storyId: "123" })
      ).rejects.toThrow("Network error");
    });

    it("should handle invalid story IDs", async () => {
      await expect(
        promptHandlers["analyze-story"]({ storyId: "invalid" })
      ).rejects.toThrow();
    });

    it("should handle missing required parameters", async () => {
      await expect(
        promptHandlers["analyze-user-profile"]({})
      ).rejects.toThrow("Username is required");
    });
  });

  describe("prompt content quality", () => {
    let promptHandlers: { [key: string]: Function };

    beforeEach(async () => {
      await setupPrompts(mockMcpServer as any, mockHnClient);
      
      promptHandlers = {};
      mockMcpServer.registerPrompt.mock.calls.forEach(call => {
        const [name, , handler] = call;
        promptHandlers[name] = handler;
      });
    });

    it("should generate well-structured prompts", async () => {
      const mockStory = {
        id: 123,
        title: "Test Story",
        by: "author",
        score: 100,
        commentCount: 25,
        ageHours: 2,
        url: "https://example.com",
        domain: "example.com"
      };

      mockHnClient.getStoryWithMetadata.mockResolvedValue(mockStory);

      const result = await promptHandlers["analyze-story"]({ storyId: "123" });
      const promptText = result.messages[0].content.text;

      // Check for proper structure
      expect(promptText).toContain("**Story Information:**");
      expect(promptText).toContain("**Story Content:**");
      expect(promptText).toContain("**Analysis Tasks:**");
      expect(promptText).toMatch(/\d+\./); // Should contain numbered lists
    });

    it("should include relevant context in prompts", async () => {
      const mockUserStats = {
        id: "testuser",
        karma: 1000,
        created: 1640995200,
        submitted: [123],
        averageScore: 100,
        topStories: [{ id: 123, title: "Top Story", score: 200, descendants: 50 }],
        recentActivity: []
      };

      mockHnClient.getUserWithStats.mockResolvedValue(mockUserStats);

      const result = await promptHandlers["analyze-user-profile"]({
        username: "testuser",
        focusArea: "expertise"
      });
      const promptText = result.messages[0].content.text;

      // Should include calculated metrics
      expect(promptText).toMatch(/Account Age: \d+ days/);
      expect(promptText).toMatch(/Karma per Day: [\d.]+/);
      expect(promptText).toContain("Average Story Score: 100");
    });
  });

  describe("performance", () => {
    let promptHandlers: { [key: string]: Function };

    beforeEach(async () => {
      await setupPrompts(mockMcpServer as any, mockHnClient);
      
      promptHandlers = {};
      mockMcpServer.registerPrompt.mock.calls.forEach(call => {
        const [name, , handler] = call;
        promptHandlers[name] = handler;
      });
    });

    it("should generate prompts efficiently", async () => {
      const mockStory = { id: 123, title: "Test", by: "user", score: 50, commentCount: 0, ageHours: 1 };
      mockHnClient.getStoryWithMetadata.mockResolvedValue(mockStory);

      const startTime = Date.now();
      await promptHandlers["analyze-story"]({ storyId: "123" });
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(100); // Should complete in less than 100ms
    });

    it("should handle concurrent prompt generation", async () => {
      const mockStory = { id: 123, title: "Test", by: "user", score: 50, commentCount: 0, ageHours: 1 };
      mockHnClient.getStoryWithMetadata.mockResolvedValue(mockStory);

      const promises = [];
      for (let i = 0; i < 5; i++) {
        promises.push(promptHandlers["analyze-story"]({ storyId: "123" }));
      }

      const results = await Promise.all(promises);
      expect(results).toHaveLength(5);
      expect(mockHnClient.getStoryWithMetadata).toHaveBeenCalledTimes(5);
    });
  });
}); 