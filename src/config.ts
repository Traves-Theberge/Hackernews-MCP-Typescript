import { config as dotenvConfig } from "dotenv";

// Load environment variables
dotenvConfig();

export const config = {
  serverName: process.env.SERVER_NAME || "hackernews-mcp-server",
  serverVersion: process.env.SERVER_VERSION || "1.0.0",
  
  api: {
    baseUrl: process.env.HACKERNEWS_API_BASE_URL || "https://hacker-news.firebaseio.com/v0",
    timeout: parseInt(process.env.HACKERNEWS_API_TIMEOUT || "10000", 10),
  },
  
  cache: {
    ttlSeconds: parseInt(process.env.CACHE_TTL_SECONDS || "300", 10),
    maxSize: parseInt(process.env.CACHE_MAX_SIZE || "1000", 10),
  },
  
  logging: {
    level: process.env.LOG_LEVEL || "info",
  },
} as const; 