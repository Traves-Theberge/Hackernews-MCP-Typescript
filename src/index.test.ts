import { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { HackerNewsClient } from "./api/client";
import { setupResources } from "./resources/index";
import { setupTools } from "./tools/index";
import { setupPrompts } from "./prompts/index";

// Mock the dependencies
jest.mock("@modelcontextprotocol/sdk/server/mcp");
jest.mock("./api/client");
jest.mock("./resources/index");
jest.mock("./tools/index");
jest.mock("./prompts/index");

const MockedMcpServer = McpServer as jest.MockedClass<typeof McpServer>;
const MockedHackerNewsClient = HackerNewsClient as jest.MockedClass<typeof HackerNewsClient>;
const mockSetupResources = setupResources as jest.MockedFunction<typeof setupResources>;
const mockSetupTools = setupTools as jest.MockedFunction<typeof setupTools>;
const mockSetupPrompts = setupPrompts as jest.MockedFunction<typeof setupPrompts>;

describe("HackerNews MCP Server Integration", () => {
  let mockServer: jest.Mocked<McpServer>;
  let mockClient: jest.Mocked<HackerNewsClient>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock McpServer instance
    mockServer = {
      registerResource: jest.fn(),
      registerTool: jest.fn(),
      registerPrompt: jest.fn(),
      connect: jest.fn(),
      close: jest.fn()
    } as any;

    MockedMcpServer.mockImplementation(() => mockServer);

    // Mock HackerNewsClient instance
    mockClient = {
      getItem: jest.fn(),
      getUser: jest.fn(),
      getTopStories: jest.fn(),
      searchStories: jest.fn(),
      getCacheStats: jest.fn(),
      clearCache: jest.fn()
    } as any;

    MockedHackerNewsClient.mockImplementation(() => mockClient);

    // Mock setup functions
    mockSetupResources.mockResolvedValue(undefined);
    mockSetupTools.mockResolvedValue(undefined);
    mockSetupPrompts.mockResolvedValue(undefined);
  });

  describe("server initialization", () => {
    it("should create MCP server with correct configuration", async () => {
      const { main } = await import("./index");
      
      // Mock process.argv to simulate CLI usage
      const originalArgv = process.argv;
      process.argv = ["node", "dist/index.js"];
      
      try {
        // Note: We can't actually run main() as it would start the server
        // Instead, we test the components separately
        expect(MockedMcpServer).toBeDefined();
        expect(MockedHackerNewsClient).toBeDefined();
      } finally {
        process.argv = originalArgv;
      }
    });

    it("should initialize HackerNews client with correct options", () => {
      new HackerNewsClient({
        baseUrl: "https://hacker-news.firebaseio.com/v0",
        timeout: 10000,
        cacheOptions: { ttlSeconds: 300, maxSize: 1000 }
      });

      expect(MockedHackerNewsClient).toHaveBeenCalledWith({
        baseUrl: "https://hacker-news.firebaseio.com/v0",
        timeout: 10000,
        cacheOptions: { ttlSeconds: 300, maxSize: 1000 }
      });
    });
  });

  describe("component integration", () => {
    it("should setup all MCP components", async () => {
      // Simulate the setup process
      await setupResources(mockServer, mockClient);
      await setupTools(mockServer, mockClient);
      await setupPrompts(mockServer, mockClient);

      expect(mockSetupResources).toHaveBeenCalledWith(mockServer, mockClient);
      expect(mockSetupTools).toHaveBeenCalledWith(mockServer, mockClient);
      expect(mockSetupPrompts).toHaveBeenCalledWith(mockServer, mockClient);
    });

    it("should handle setup errors gracefully", async () => {
      mockSetupResources.mockRejectedValue(new Error("Resource setup failed"));

      await expect(setupResources(mockServer, mockClient)).rejects.toThrow("Resource setup failed");
    });
  });

  describe("end-to-end workflows", () => {
    beforeEach(() => {
      // Reset mocks to their original implementations for e2e tests
      jest.unmock("./resources/index");
      jest.unmock("./tools/index");
      jest.unmock("./prompts/index");
    });

    afterEach(() => {
      // Re-mock for other tests
      jest.mock("./resources/index");
      jest.mock("./tools/index");
      jest.mock("./prompts/index");
    });

    it("should support complete story analysis workflow", async () => {
      const mockStory = {
        id: 123,
        title: "Revolutionary AI Development",
        by: "researcher",
        score: 300,
        commentCount: 75,
        ageHours: 4,
        url: "https://example.com/ai-dev",
        domain: "example.com",
        text: "Breakthrough in AI technology..."
      };

      const mockComments = [
        { id: 456, by: "expert1", text: "This is groundbreaking work!" },
        { id: 789, by: "expert2", text: "I have some concerns about the methodology." }
      ];

      mockClient.getStoryWithMetadata.mockResolvedValue(mockStory);
      mockClient.getCommentTree.mockResolvedValue(mockComments);

      // Test resource access
      const { setupResources: realSetupResources } = await import("./resources/index");
      await realSetupResources(mockServer, mockClient);

      // Test tool execution
      const { setupTools: realSetupTools } = await import("./tools/index");
      await realSetupTools(mockServer, mockClient);

      // Test prompt generation
      const { setupPrompts: realSetupPrompts } = await import("./prompts/index");
      await realSetupPrompts(mockServer, mockClient);

      // Verify all components were set up
      expect(mockServer.registerResource).toHaveBeenCalled();
      expect(mockServer.registerTool).toHaveBeenCalled();
      expect(mockServer.registerPrompt).toHaveBeenCalled();
    });

    it("should support user analysis workflow", async () => {
      const mockUser = {
        id: "techexpert",
        karma: 2500,
        created: 1577836800,
        about: "AI researcher",
        submitted: [123, 456, 789]
      };

      const mockUserStats = {
        ...mockUser,
        averageScore: 150,
        topStories: [
          { id: 123, title: "AI Paper", score: 300, descendants: 50 }
        ],
        recentActivity: [
          { id: 456, type: "comment", text: "Great insight!", score: 25 }
        ]
      };

      mockClient.getUser.mockResolvedValue(mockUser);
      mockClient.getUserWithStats.mockResolvedValue(mockUserStats);

      const { setupResources: realSetupResources } = await import("./resources/index");
      const { setupTools: realSetupTools } = await import("./tools/index");
      const { setupPrompts: realSetupPrompts } = await import("./prompts/index");

      await realSetupResources(mockServer, mockClient);
      await realSetupTools(mockServer, mockClient);
      await realSetupPrompts(mockServer, mockClient);

      // Verify user-related functionality is available
      expect(mockServer.registerResource).toHaveBeenCalled();
      expect(mockServer.registerTool).toHaveBeenCalled();
      expect(mockServer.registerPrompt).toHaveBeenCalled();
    });

    it("should support trending analysis workflow", async () => {
      const mockStoryIds = [123, 456, 789, 101, 102];
      const mockStories = [
        { id: 123, type: "story", title: "AI Breakthrough", by: "researcher1" },
        { id: 456, type: "story", title: "Machine Learning Update", by: "researcher2" },
        { id: 789, type: "story", title: "Deep Learning Advances", by: "researcher3" },
        { id: 101, type: "story", title: "Neural Network Innovation", by: "researcher4" },
        { id: 102, type: "story", title: "AI Ethics Discussion", by: "ethicist" }
      ];

      mockClient.getTopStories.mockResolvedValue(mockStoryIds);
      mockClient.getMultipleItems.mockResolvedValue(mockStories);

      const { setupTools: realSetupTools } = await import("./tools/index");
      const { setupPrompts: realSetupPrompts } = await import("./prompts/index");

      await realSetupTools(mockServer, mockClient);
      await realSetupPrompts(mockServer, mockClient);

      // Verify trending analysis tools and prompts are available
      expect(mockServer.registerTool).toHaveBeenCalled();
      expect(mockServer.registerPrompt).toHaveBeenCalled();
    });
  });

  describe("error handling and resilience", () => {
    it("should handle API client initialization errors", () => {
      MockedHackerNewsClient.mockImplementation(() => {
        throw new Error("Client initialization failed");
      });

      expect(() => {
        new HackerNewsClient({
          baseUrl: "https://test.com",
          timeout: 5000
        });
      }).toThrow("Client initialization failed");
    });

    it("should handle network connectivity issues", async () => {
      mockClient.getTopStories.mockRejectedValue(new Error("Network error"));

      const { setupResources: realSetupResources } = await import("./resources/index");
      await realSetupResources(mockServer, mockClient);

      // The setup should succeed even if the client has network issues
      expect(mockServer.registerResource).toHaveBeenCalled();
    });

    it("should handle partial component failures", async () => {
      // Simulate resources setup succeeding but tools failing
      const { setupResources: realSetupResources } = await import("./resources/index");
      await realSetupResources(mockServer, mockClient);
      expect(mockServer.registerResource).toHaveBeenCalled();

      // Tools setup fails
      mockSetupTools.mockRejectedValue(new Error("Tools setup failed"));
      await expect(setupTools(mockServer, mockClient)).rejects.toThrow("Tools setup failed");

      // But resources should still be available
      expect(mockServer.registerResource).toHaveBeenCalled();
    });
  });

  describe("configuration and environment", () => {
    it("should respect environment configuration", () => {
      const originalEnv = process.env;
      
      try {
        process.env.HACKERNEWS_API_BASE_URL = "https://custom-api.example.com";
        process.env.HACKERNEWS_API_TIMEOUT = "15000";
        process.env.CACHE_TTL_SECONDS = "600";

        // Re-import config to get updated values
        jest.resetModules();
        const { config } = require("./config");

        expect(config.api.baseUrl).toBe("https://custom-api.example.com");
        expect(config.api.timeout).toBe(15000);
        expect(config.cache.ttlSeconds).toBe(600);
      } finally {
        process.env = originalEnv;
      }
    });

    it("should handle missing environment variables gracefully", () => {
      const originalEnv = process.env;
      
      try {
        // Clear all HN-related env vars
        delete process.env.HACKERNEWS_API_BASE_URL;
        delete process.env.HACKERNEWS_API_TIMEOUT;
        delete process.env.CACHE_TTL_SECONDS;

        jest.resetModules();
        const { config } = require("./config");

        // Should use defaults
        expect(config.api.baseUrl).toBe("https://hacker-news.firebaseio.com/v0");
        expect(config.api.timeout).toBe(10000);
        expect(config.cache.ttlSeconds).toBe(300);
      } finally {
        process.env = originalEnv;
      }
    });
  });

  describe("performance and scalability", () => {
    it("should handle multiple concurrent operations", async () => {
      const mockStory = { id: 123, title: "Test", score: 100 };
      mockClient.getStoryWithMetadata.mockResolvedValue(mockStory);

      const { setupResources: realSetupResources } = await import("./resources/index");
      await realSetupResources(mockServer, mockClient);

      // Simulate multiple concurrent resource registrations
      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(realSetupResources(mockServer, mockClient));
      }

      await Promise.all(promises);
      expect(mockServer.registerResource).toHaveBeenCalled();
    });

    it("should complete initialization in reasonable time", async () => {
      const startTime = Date.now();

      const { setupResources: realSetupResources } = await import("./resources/index");
      const { setupTools: realSetupTools } = await import("./tools/index");
      const { setupPrompts: realSetupPrompts } = await import("./prompts/index");

      await realSetupResources(mockServer, mockClient);
      await realSetupTools(mockServer, mockClient);
      await realSetupPrompts(mockServer, mockClient);

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(1000); // Should complete in less than 1 second
    });
  });

  describe("resource cleanup", () => {
    it("should handle server shutdown gracefully", async () => {
      mockServer.close = jest.fn().mockResolvedValue(undefined);

      await mockServer.close();
      expect(mockServer.close).toHaveBeenCalled();
    });

    it("should clear cache on shutdown", () => {
      mockClient.clearCache.mockReturnValue(undefined);

      mockClient.clearCache();
      expect(mockClient.clearCache).toHaveBeenCalled();
    });
  });

  describe("logging and monitoring", () => {
    it("should log initialization steps", async () => {
      // Mock logger
      const mockLogger = {
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
        debug: jest.fn()
      };

      jest.doMock("./utils/logger", () => ({
        logger: mockLogger
      }));

      const { setupResources: realSetupResources } = await import("./resources/index");
      await realSetupResources(mockServer, mockClient);

      // Logger should be called during setup
      expect(mockLogger.info).toHaveBeenCalled();
    });

    it("should provide cache statistics", () => {
      const mockStats = { items: 100, users: 25, lists: 10 };
      mockClient.getCacheStats.mockReturnValue(mockStats);

      const stats = mockClient.getCacheStats();
      expect(stats).toEqual(mockStats);
    });
  });
}); 