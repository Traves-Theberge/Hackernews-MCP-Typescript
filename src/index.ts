#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { config } from "./config.js";
import { setupResources } from "./resources/index.js";
import { setupTools } from "./tools/index.js";
import { setupPrompts } from "./prompts/index.js";
import { HackerNewsClient } from "./api/client.js";
import { logger } from "./utils/logger.js";

async function main() {
  try {
    // Initialize the MCP server
    const server = new McpServer({
      name: config.serverName,
      version: config.serverVersion,
    });

    // Initialize the HackerNews API client
    const hnClient = new HackerNewsClient({
      baseUrl: config.api.baseUrl,
      timeout: config.api.timeout,
    });

    // Setup MCP components
    await setupResources(server, hnClient);
    await setupTools(server, hnClient);
    await setupPrompts(server, hnClient);

    // Connect to stdio transport
    const transport = new StdioServerTransport();
    
    logger.info(`Starting ${config.serverName} v${config.serverVersion}`);
    
    await server.connect(transport);
    
    logger.info("HackerNews MCP server is running");
  } catch (error) {
    logger.error("Failed to start server:", error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on("SIGINT", () => {
  logger.info("Received SIGINT, shutting down gracefully");
  process.exit(0);
});

process.on("SIGTERM", () => {
  logger.info("Received SIGTERM, shutting down gracefully");
  process.exit(0);
});

// Start the server
main().catch((error) => {
  logger.error("Unhandled error:", error);
  process.exit(1);
}); 