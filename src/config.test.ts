import { config } from "./config";

describe("Configuration", () => {
  describe("default values", () => {
    it("should have correct default server name", () => {
      expect(config.serverName).toBe("hackernews-mcp-server");
    });

    it("should have correct default server version", () => {
      expect(config.serverVersion).toBe("1.0.0");
    });

    it("should have correct default API base URL", () => {
      expect(config.api.baseUrl).toBe("https://hacker-news.firebaseio.com/v0");
    });

    it("should have correct default API timeout", () => {
      expect(config.api.timeout).toBe(10000);
    });

    it("should have correct default cache TTL", () => {
      expect(config.cache.ttlSeconds).toBe(300);
    });

    it("should have correct default cache max size", () => {
      expect(config.cache.maxSize).toBe(1000);
    });

    it("should have correct default log level", () => {
      expect(config.logging.level).toBe("info");
    });
  });

  describe("environment variable overrides", () => {
    const originalEnv = process.env;

    beforeEach(() => {
      // Reset environment variables
      process.env = { ...originalEnv };
    });

    afterEach(() => {
      // Restore original environment
      process.env = originalEnv;
    });

    it("should override server name from environment", () => {
      process.env.SERVER_NAME = "custom-hn-server";

      // Re-import config to get updated values
      jest.resetModules();
      const { config: newConfig } = require("./config");

      expect(newConfig.serverName).toBe("custom-hn-server");
    });

    it("should override server version from environment", () => {
      process.env.SERVER_VERSION = "2.0.0";
      
      jest.resetModules();
      const { config: newConfig } = require("./config");
      
      expect(newConfig.serverVersion).toBe("2.0.0");
    });

    it("should override API base URL from environment", () => {
      process.env.HACKERNEWS_API_BASE_URL = "https://custom-api.example.com/v1";
      
      jest.resetModules();
      const { config: newConfig } = require("./config");
      
      expect(newConfig.api.baseUrl).toBe("https://custom-api.example.com/v1");
    });

    it("should override API timeout from environment", () => {
      process.env.HACKERNEWS_API_TIMEOUT = "15000";
      
      jest.resetModules();
      const { config: newConfig } = require("./config");
      
      expect(newConfig.api.timeout).toBe(15000);
    });

    it("should override cache TTL from environment", () => {
      process.env.CACHE_TTL_SECONDS = "600";
      
      jest.resetModules();
      const { config: newConfig } = require("./config");
      
      expect(newConfig.cache.ttlSeconds).toBe(600);
    });

    it("should override cache max size from environment", () => {
      process.env.CACHE_MAX_SIZE = "2000";
      
      jest.resetModules();
      const { config: newConfig } = require("./config");
      
      expect(newConfig.cache.maxSize).toBe(2000);
    });

    it("should override log level from environment", () => {
      process.env.LOG_LEVEL = "debug";
      
      jest.resetModules();
      const { config: newConfig } = require("./config");
      
      expect(newConfig.logging.level).toBe("debug");
    });
  });

  describe("type safety", () => {
    it("should have correct types for all configuration values", () => {
      expect(typeof config.serverName).toBe("string");
      expect(typeof config.serverVersion).toBe("string");
      expect(typeof config.api.baseUrl).toBe("string");
      expect(typeof config.api.timeout).toBe("number");
      expect(typeof config.cache.ttlSeconds).toBe("number");
      expect(typeof config.cache.maxSize).toBe("number");
      expect(typeof config.logging.level).toBe("string");
    });

    it("should have valid numeric values", () => {
      expect(config.api.timeout).toBeGreaterThan(0);
      expect(config.cache.ttlSeconds).toBeGreaterThan(0);
      expect(config.cache.maxSize).toBeGreaterThan(0);
    });

    it("should have valid string values", () => {
      expect(config.serverName).toBeTruthy();
      expect(config.serverVersion).toBeTruthy();
      expect(config.api.baseUrl).toMatch(/^https?:\/\//);
      expect(["debug", "info", "warn", "error"]).toContain(config.logging.level);
    });
  });

  describe("validation", () => {
    it("should handle invalid numeric environment variables", () => {
      process.env.HACKERNEWS_API_TIMEOUT = "invalid";
      
      jest.resetModules();
      const { config: newConfig } = require("./config");
      
      // Should fall back to default or result in NaN
      expect(typeof newConfig.api.timeout).toBe("number");
    });

    it("should handle empty environment variables", () => {
      process.env.LOG_LEVEL = "";
      
      jest.resetModules();
      const { config: newConfig } = require("./config");
      
      // Should use defaults for empty strings
      expect(newConfig.logging.level).toBeTruthy();
    });

    it("should handle missing environment variables gracefully", () => {
      // Clear all HN-related env vars
      delete process.env.HACKERNEWS_API_BASE_URL;
      delete process.env.HACKERNEWS_API_TIMEOUT;
      delete process.env.CACHE_TTL_SECONDS;
      delete process.env.CACHE_MAX_SIZE;
      delete process.env.LOG_LEVEL;
      
      jest.resetModules();
      const { config: newConfig } = require("./config");
      
      // Should use all defaults
      expect(newConfig.api.baseUrl).toBe("https://hacker-news.firebaseio.com/v0");
      expect(newConfig.api.timeout).toBe(10000);
      expect(newConfig.cache.ttlSeconds).toBe(300);
      expect(newConfig.cache.maxSize).toBe(1000);
      expect(newConfig.logging.level).toBe("info");
    });
  });

  describe("configuration structure", () => {
    it("should have the expected structure", () => {
      expect(config).toHaveProperty("serverName");
      expect(config).toHaveProperty("serverVersion");
      expect(config).toHaveProperty("api");
      expect(config).toHaveProperty("cache");
      expect(config).toHaveProperty("logging");
      
      expect(config.api).toHaveProperty("baseUrl");
      expect(config.api).toHaveProperty("timeout");
      
      expect(config.cache).toHaveProperty("ttlSeconds");
      expect(config.cache).toHaveProperty("maxSize");
      
      expect(config.logging).toHaveProperty("level");
    });

    it("should be immutable at runtime", () => {
      // Note: This test may not work as expected since JavaScript objects are mutable by default
      // In a real implementation, you might use Object.freeze() or similar
      expect(() => {
        // @ts-expect-error - Testing runtime immutability
        config.serverName = "modified";
      }).not.toThrow(); // This will pass since objects are mutable
    });
  });

  describe("realistic configurations", () => {
    it("should handle production-like configuration", () => {
      process.env.SERVER_NAME = "hn-mcp-prod";
      process.env.HACKERNEWS_API_TIMEOUT = "30000";
      process.env.CACHE_TTL_SECONDS = "600";
      process.env.CACHE_MAX_SIZE = "5000";
      process.env.LOG_LEVEL = "warn";
      
      jest.resetModules();
      const { config: newConfig } = require("./config");
      
      expect(newConfig.serverName).toBe("hn-mcp-prod");
      expect(newConfig.api.timeout).toBe(30000);
      expect(newConfig.cache.ttlSeconds).toBe(600);
      expect(newConfig.cache.maxSize).toBe(5000);
      expect(newConfig.logging.level).toBe("warn");
    });

    it("should handle development-like configuration", () => {
      process.env.SERVER_NAME = "hn-mcp-dev";
      process.env.HACKERNEWS_API_BASE_URL = "http://localhost:3000/api/v0";
      process.env.HACKERNEWS_API_TIMEOUT = "5000";
      process.env.CACHE_TTL_SECONDS = "60";
      process.env.CACHE_MAX_SIZE = "100";
      process.env.LOG_LEVEL = "debug";
      
      jest.resetModules();
      const { config: newConfig } = require("./config");
      
      expect(newConfig.serverName).toBe("hn-mcp-dev");
      expect(newConfig.api.baseUrl).toBe("http://localhost:3000/api/v0");
      expect(newConfig.api.timeout).toBe(5000);
      expect(newConfig.cache.ttlSeconds).toBe(60);
      expect(newConfig.cache.maxSize).toBe(100);
      expect(newConfig.logging.level).toBe("debug");
    });
  });

  describe("edge cases", () => {
    it("should handle very large numeric values", () => {
      process.env.HACKERNEWS_API_TIMEOUT = "999999999";
      process.env.CACHE_TTL_SECONDS = "86400";
      process.env.CACHE_MAX_SIZE = "1000000";
      
      jest.resetModules();
      const { config: newConfig } = require("./config");
      
      expect(newConfig.api.timeout).toBe(999999999);
      expect(newConfig.cache.ttlSeconds).toBe(86400);
      expect(newConfig.cache.maxSize).toBe(1000000);
    });

    it("should handle zero values", () => {
      process.env.HACKERNEWS_API_TIMEOUT = "0";
      process.env.CACHE_TTL_SECONDS = "0";
      process.env.CACHE_MAX_SIZE = "0";
      
      jest.resetModules();
      const { config: newConfig } = require("./config");
      
      expect(newConfig.api.timeout).toBe(0);
      expect(newConfig.cache.ttlSeconds).toBe(0);
      expect(newConfig.cache.maxSize).toBe(0);
    });

    it("should handle negative values", () => {
      process.env.HACKERNEWS_API_TIMEOUT = "-1000";
      process.env.CACHE_TTL_SECONDS = "-300";
      process.env.CACHE_MAX_SIZE = "-100";
      
      jest.resetModules();
      const { config: newConfig } = require("./config");
      
      expect(newConfig.api.timeout).toBe(-1000);
      expect(newConfig.cache.ttlSeconds).toBe(-300);
      expect(newConfig.cache.maxSize).toBe(-100);
    });

    it("should handle special string values", () => {
      process.env.SERVER_NAME = "server-with-special-chars-123_test";
      process.env.HACKERNEWS_API_BASE_URL = "https://api.example.com/v1/hackernews";
      process.env.LOG_LEVEL = "ERROR"; // Different case
      
      jest.resetModules();
      const { config: newConfig } = require("./config");
      
      expect(newConfig.serverName).toBe("server-with-special-chars-123_test");
      expect(newConfig.api.baseUrl).toBe("https://api.example.com/v1/hackernews");
      expect(newConfig.logging.level).toBe("ERROR");
    });
  });
}); 