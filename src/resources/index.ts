import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { HackerNewsClient } from "../api/client.js";
import { logger } from "../utils/logger.js";

export async function setupResources(server: McpServer, hnClient: HackerNewsClient): Promise<void> {
  logger.info("Setting up MCP resources for HackerNews...");

  // Individual item resource (stories, comments, jobs, polls)
  server.registerResource(
    "item",
    new ResourceTemplate("hackernews://item/{id}", { list: undefined }),
    {
      title: "HackerNews Item",
      description: "Access individual HackerNews items (stories, comments, jobs, polls) by ID",
      mimeType: "application/json"
    },
    async (uri, { id }) => {
      try {
        const itemId = parseInt(id as string, 10);
        if (isNaN(itemId)) {
          throw new Error(`Invalid item ID: ${id}`);
        }

        const item = await hnClient.getItem(itemId);
        if (!item) {
          throw new Error(`Item ${itemId} not found`);
        }

        return {
          contents: [{
            uri: uri.href,
            mimeType: "application/json",
            text: JSON.stringify(item, null, 2)
          }]
        };
      } catch (error) {
        logger.error(`Failed to fetch item ${id}:`, error);
        throw error;
      }
    }
  );

  // Story with enhanced metadata
  server.registerResource(
    "story",
    new ResourceTemplate("hackernews://story/{id}", { list: undefined }),
    {
      title: "HackerNews Story with Metadata",
      description: "Access HackerNews stories with enhanced metadata (age, domain, comment count)",
      mimeType: "application/json"
    },
    async (uri, { id }) => {
      try {
        const itemId = parseInt(id as string, 10);
        if (isNaN(itemId)) {
          throw new Error(`Invalid story ID: ${id}`);
        }

        const story = await hnClient.getStoryWithMetadata(itemId);
        if (!story) {
          throw new Error(`Story ${itemId} not found or is not a story`);
        }

        return {
          contents: [{
            uri: uri.href,
            mimeType: "application/json",
            text: JSON.stringify(story, null, 2)
          }]
        };
      } catch (error) {
        logger.error(`Failed to fetch story ${id}:`, error);
        throw error;
      }
    }
  );

  // User profile resource
  server.registerResource(
    "user",
    new ResourceTemplate("hackernews://user/{username}", { list: undefined }),
    {
      title: "HackerNews User Profile",
      description: "Access HackerNews user profiles and activity",
      mimeType: "application/json"
    },
    async (uri, { username }) => {
      try {
        const user = await hnClient.getUser(username as string);
        if (!user) {
          throw new Error(`User ${username} not found`);
        }

        return {
          contents: [{
            uri: uri.href,
            mimeType: "application/json",
            text: JSON.stringify(user, null, 2)
          }]
        };
      } catch (error) {
        logger.error(`Failed to fetch user ${username}:`, error);
        throw error;
      }
    }
  );

  // User with statistics
  server.registerResource(
    "user-stats",
    new ResourceTemplate("hackernews://user-stats/{username}", { list: undefined }),
    {
      title: "HackerNews User with Statistics",
      description: "Access HackerNews user profiles with calculated statistics and recent activity",
      mimeType: "application/json"
    },
    async (uri, { username }) => {
      try {
        const userStats = await hnClient.getUserWithStats(username as string);
        if (!userStats) {
          throw new Error(`User ${username} not found`);
        }

        return {
          contents: [{
            uri: uri.href,
            mimeType: "application/json",
            text: JSON.stringify(userStats, null, 2)
          }]
        };
      } catch (error) {
        logger.error(`Failed to fetch user stats for ${username}:`, error);
        throw error;
      }
    }
  );

  // Top stories collection
  server.registerResource(
    "top-stories",
    "hackernews://stories/top",
    {
      title: "HackerNews Top Stories",
      description: "Current top stories from HackerNews front page",
      mimeType: "application/json"
    },
    async (uri) => {
      try {
        const storyIds = await hnClient.getTopStories();
        const topStories = storyIds.slice(0, 30); // Limit to top 30

        return {
          contents: [{
            uri: uri.href,
            mimeType: "application/json",
            text: JSON.stringify({
              type: "story_collection",
              title: "Top Stories",
              count: topStories.length,
              story_ids: topStories,
              last_updated: new Date().toISOString()
            }, null, 2)
          }]
        };
      } catch (error) {
        logger.error("Failed to fetch top stories:", error);
        throw error;
      }
    }
  );

  // New stories collection
  server.registerResource(
    "new-stories",
    "hackernews://stories/new",
    {
      title: "HackerNews New Stories",
      description: "Latest new stories from HackerNews",
      mimeType: "application/json"
    },
    async (uri) => {
      try {
        const storyIds = await hnClient.getNewStories();
        const newStories = storyIds.slice(0, 30); // Limit to top 30

        return {
          contents: [{
            uri: uri.href,
            mimeType: "application/json",
            text: JSON.stringify({
              type: "story_collection",
              title: "New Stories",
              count: newStories.length,
              story_ids: newStories,
              last_updated: new Date().toISOString()
            }, null, 2)
          }]
        };
      } catch (error) {
        logger.error("Failed to fetch new stories:", error);
        throw error;
      }
    }
  );

  // Best stories collection
  server.registerResource(
    "best-stories",
    "hackernews://stories/best",
    {
      title: "HackerNews Best Stories",
      description: "Best stories from HackerNews",
      mimeType: "application/json"
    },
    async (uri) => {
      try {
        const storyIds = await hnClient.getBestStories();
        const bestStories = storyIds.slice(0, 30); // Limit to top 30

        return {
          contents: [{
            uri: uri.href,
            mimeType: "application/json",
            text: JSON.stringify({
              type: "story_collection",
              title: "Best Stories",
              count: bestStories.length,
              story_ids: bestStories,
              last_updated: new Date().toISOString()
            }, null, 2)
          }]
        };
      } catch (error) {
        logger.error("Failed to fetch best stories:", error);
        throw error;
      }
    }
  );

  // Ask HN stories
  server.registerResource(
    "ask-stories",
    "hackernews://stories/ask",
    {
      title: "Ask HackerNews Stories",
      description: "Latest Ask HN stories and discussions",
      mimeType: "application/json"
    },
    async (uri) => {
      try {
        const storyIds = await hnClient.getAskStories();
        const askStories = storyIds.slice(0, 30); // Limit to top 30

        return {
          contents: [{
            uri: uri.href,
            mimeType: "application/json",
            text: JSON.stringify({
              type: "story_collection",
              title: "Ask HN Stories",
              count: askStories.length,
              story_ids: askStories,
              last_updated: new Date().toISOString()
            }, null, 2)
          }]
        };
      } catch (error) {
        logger.error("Failed to fetch Ask HN stories:", error);
        throw error;
      }
    }
  );

  // Show HN stories
  server.registerResource(
    "show-stories",
    "hackernews://stories/show",
    {
      title: "Show HackerNews Stories",
      description: "Latest Show HN stories and projects",
      mimeType: "application/json"
    },
    async (uri) => {
      try {
        const storyIds = await hnClient.getShowStories();
        const showStories = storyIds.slice(0, 30); // Limit to top 30

        return {
          contents: [{
            uri: uri.href,
            mimeType: "application/json",
            text: JSON.stringify({
              type: "story_collection",
              title: "Show HN Stories",
              count: showStories.length,
              story_ids: showStories,
              last_updated: new Date().toISOString()
            }, null, 2)
          }]
        };
      } catch (error) {
        logger.error("Failed to fetch Show HN stories:", error);
        throw error;
      }
    }
  );

  // Job stories
  server.registerResource(
    "job-stories",
    "hackernews://stories/jobs",
    {
      title: "HackerNews Job Postings",
      description: "Latest job postings from HackerNews",
      mimeType: "application/json"
    },
    async (uri) => {
      try {
        const storyIds = await hnClient.getJobStories();
        const jobStories = storyIds.slice(0, 30); // Limit to top 30

        return {
          contents: [{
            uri: uri.href,
            mimeType: "application/json",
            text: JSON.stringify({
              type: "story_collection",
              title: "Job Stories",
              count: jobStories.length,
              story_ids: jobStories,
              last_updated: new Date().toISOString()
            }, null, 2)
          }]
        };
      } catch (error) {
        logger.error("Failed to fetch job stories:", error);
        throw error;
      }
    }
  );

  // Comment tree for a story
  server.registerResource(
    "comments",
    new ResourceTemplate("hackernews://comments/{id}", { list: undefined }),
    {
      title: "HackerNews Comment Tree",
      description: "Complete comment tree for a HackerNews story or item",
      mimeType: "application/json"
    },
    async (uri, { id }) => {
      try {
        const itemId = parseInt(id as string, 10);
        if (isNaN(itemId)) {
          throw new Error(`Invalid item ID: ${id}`);
        }

        const comments = await hnClient.getCommentTree(itemId);

        return {
          contents: [{
            uri: uri.href,
            mimeType: "application/json",
            text: JSON.stringify({
              type: "comment_tree",
              item_id: itemId,
              comment_count: comments.length,
              comments: comments,
              last_updated: new Date().toISOString()
            }, null, 2)
          }]
        };
      } catch (error) {
        logger.error(`Failed to fetch comments for item ${id}:`, error);
        throw error;
      }
    }
  );

  // Live updates resource
  server.registerResource(
    "updates",
    "hackernews://updates",
    {
      title: "HackerNews Live Updates",
      description: "Recently changed items and user profiles on HackerNews",
      mimeType: "application/json"
    },
    async (uri) => {
      try {
        const updates = await hnClient.getUpdates();

        return {
          contents: [{
            uri: uri.href,
            mimeType: "application/json",
            text: JSON.stringify({
              type: "live_updates",
              changed_items: updates.items,
              changed_profiles: updates.profiles,
              last_updated: new Date().toISOString()
            }, null, 2)
          }]
        };
      } catch (error) {
        logger.error("Failed to fetch live updates:", error);
        throw error;
      }
    }
  );

  // Max item ID resource
  server.registerResource(
    "max-item",
    "hackernews://max-item",
    {
      title: "HackerNews Max Item ID",
      description: "The current maximum item ID on HackerNews",
      mimeType: "application/json"
    },
    async (uri) => {
      try {
        const maxId = await hnClient.getMaxItemId();

        return {
          contents: [{
            uri: uri.href,
            mimeType: "application/json",
            text: JSON.stringify({
              type: "max_item_id",
              max_id: maxId,
              last_updated: new Date().toISOString()
            }, null, 2)
          }]
        };
      } catch (error) {
        logger.error("Failed to fetch max item ID:", error);
        throw error;
      }
    }
  );

  // Cache statistics resource
  server.registerResource(
    "cache-stats",
    "hackernews://cache/stats",
    {
      title: "HackerNews API Cache Statistics",
      description: "Current cache statistics and performance metrics",
      mimeType: "application/json"
    },
    async (uri) => {
      try {
        const cacheStats = hnClient.getCacheStats();

        return {
          contents: [{
            uri: uri.href,
            mimeType: "application/json",
            text: JSON.stringify({
              type: "cache_statistics",
              cache_stats: cacheStats,
              total_cached_items: cacheStats.items + cacheStats.users + cacheStats.lists,
              last_updated: new Date().toISOString()
            }, null, 2)
          }]
        };
      } catch (error) {
        logger.error("Failed to fetch cache stats:", error);
        throw error;
      }
    }
  );

  logger.info("Successfully registered all HackerNews MCP resources");
} 