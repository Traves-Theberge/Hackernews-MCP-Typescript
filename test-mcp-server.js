#!/usr/bin/env node

/**
 * Simple test script to verify the MCP server is working correctly.
 * This script starts the server and checks if tools are registered.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { HackerNewsClient } from "./dist/api/client.js";
import { setupTools } from "./dist/tools/index.js";
import { setupResources } from "./dist/resources/index.js";
import { setupPrompts } from "./dist/prompts/index.js";

async function testMcpServer() {
  console.log("🧪 Testing HackerNews MCP Server...");
  
  try {
    // Initialize the MCP server
    const server = new McpServer({
      name: "hackernews-mcp-server",
      version: "1.0.0",
    });

    // Initialize the HackerNews API client
    const hnClient = new HackerNewsClient({
      baseUrl: "https://hacker-news.firebaseio.com/v0",
      timeout: 10000,
    });

    console.log("✅ MCP Server and HN Client initialized");

    // Setup MCP components
    await setupResources(server, hnClient);
    console.log("✅ Resources registered");

    await setupTools(server, hnClient);
    console.log("✅ Tools registered");

    await setupPrompts(server, hnClient);
    console.log("✅ Prompts registered");

    // Check if tools are registered
    console.log("\n📋 Checking registered tools...");
    
    // Try different ways to access the tools
    console.log("🔍 Inspecting server object...");
    console.log("Server keys:", Object.keys(server));
    
    // Check if there's a different property name
    const possibleToolProps = ['_registeredTools', 'registeredTools', 'tools', '_tools'];
    for (const prop of possibleToolProps) {
      if (server[prop]) {
        console.log(`Found ${prop}:`, typeof server[prop], server[prop].size || server[prop].length || 'unknown size');
      }
    }

    // Try to access the underlying server
    if (server.server) {
      console.log("🔍 Inspecting underlying server...");
      console.log("Underlying server keys:", Object.keys(server.server));
    }

    // Let's also manually test a tool registration
    console.log("\n🧪 Testing manual tool registration...");
    
    const testTool = server.registerTool(
      "test_tool",
      {
        title: "Test Tool",
        description: "A simple test tool",
        inputSchema: {}
      },
      async () => {
        return {
          content: [{
            type: "text",
            text: "Test successful!"
          }]
        };
      }
    );
    
    console.log("✅ Manual tool registered:", testTool ? "Success" : "Failed");
    
    // Check again after manual registration
    for (const prop of possibleToolProps) {
      if (server[prop]) {
        console.log(`After manual registration - ${prop}:`, typeof server[prop], server[prop].size || server[prop].length || 'unknown size');
      }
    }

    console.log("\n🎉 MCP Server test completed!");
    console.log("\n💡 If you're seeing 0 tools in Claude Desktop:");
    console.log("   1. Make sure Claude Desktop is completely restarted");
    console.log("   2. Check that the config file path is correct");
    console.log("   3. Verify the server path in claude_desktop_config.json");
    console.log("   4. Check Claude Desktop logs for any errors");
    console.log("   5. The tools might be registered but not visible in this test");

  } catch (error) {
    console.error("❌ Test failed:", error);
    console.error("Stack trace:", error.stack);
    process.exit(1);
  }
}

testMcpServer(); 