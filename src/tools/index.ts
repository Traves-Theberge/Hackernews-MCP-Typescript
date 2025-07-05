import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { HackerNewsClient } from "../api/client.js";
import { SearchParams } from "../types/hackernews.js";
import { logger } from "../utils/logger.js";
import { z } from "zod";

export async function setupTools(server: McpServer, hnClient: HackerNewsClient): Promise<void> {
  logger.info("Setting up MCP tools for HackerNews...");

  // Search posts tool
  server.registerTool(
    "search_posts",
    {
      title: "Search HackerNews Posts",
      description: "Search and filter HackerNews posts by keywords, author, score, and date range",
      inputSchema: {
        query: z.string().optional(),
        author: z.string().optional(),
        minScore: z.number().optional(),
        startTime: z.number().optional(),
        endTime: z.number().optional(),
        limit: z.number().min(1).max(100).default(20).optional()
      }
    },
    async ({ query, author, minScore, startTime, endTime, limit }) => {
      try {
        const searchParams: SearchParams = {
          query,
          author,
          minScore,
          startTime,
          endTime,
          limit: limit || 20
        };

        const posts = await hnClient.searchStories(searchParams);

        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              search_params: searchParams,
              result_count: posts.length,
              posts: posts.map(post => ({
                id: post.id,
                title: post.title,
                by: post.by,
                score: post.score,
                time: post.time,
                url: post.url,
                descendants: post.descendants
              }))
            }, null, 2)
          }]
        };
      } catch (error) {
        logger.error("Failed to search posts:", error);
        return {
          content: [{
            type: "text",
            text: `Error searching posts: ${error instanceof Error ? error.message : String(error)}`
          }],
          isError: true
        };
      }
    }
  );

  // Get post details with full metadata
  server.registerTool(
    "get_post",
    {
      title: "Get Post Details",
      description: "Get comprehensive details about a HackerNews post including metadata and comments",
      inputSchema: {
        id: z.number(),
        includeComments: z.boolean().default(false).optional()
      }
    },
    async ({ id, includeComments }) => {
      try {
        const post = await hnClient.getStoryWithMetadata(id);
        if (!post) {
          return {
            content: [{
              type: "text",
              text: `Post ${id} not found or is not a post`
            }],
            isError: true
          };
        }

        let comments: any[] = [];
        if (includeComments) {
          comments = await hnClient.getCommentTree(id);
        }

        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              post: post,
              comments: includeComments ? {
                count: comments.length,
                tree: comments
              } : undefined
            }, null, 2)
          }]
        };
      } catch (error) {
        logger.error(`Failed to get post details for ${id}:`, error);
        return {
          content: [{
            type: "text",
            text: `Error fetching post details: ${error instanceof Error ? error.message : String(error)}`
          }],
          isError: true
        };
      }
    }
  );

  // Search user activity
  server.registerTool(
    "search_user",
    {
      title: "Search User Profile",
      description: "Get a HackerNews user's profile, activity, statistics, and contribution patterns",
      inputSchema: {
        username: z.string(),
        includeRecentItems: z.boolean().default(true).optional()
      }
    },
    async ({ username, includeRecentItems }) => {
      try {
        const userStats = await hnClient.getUserWithStats(username);
        if (!userStats) {
          return {
            content: [{
              type: "text",
              text: `User ${username} not found`
            }],
            isError: true
          };
        }

        // Calculate additional statistics
        const accountAgeHours = (Date.now() / 1000 - userStats.created) / 3600;
        const accountAgeDays = Math.floor(accountAgeHours / 24);
        const karmaPerDay = accountAgeDays > 0 ? (userStats.karma / accountAgeDays).toFixed(2) : "0";

        const analysis = {
          user_profile: {
            username: userStats.id,
            karma: userStats.karma,
            created: new Date(userStats.created * 1000).toISOString(),
            account_age_days: accountAgeDays,
            karma_per_day: parseFloat(karmaPerDay),
            about: userStats.about
          },
          statistics: {
            average_story_score: userStats.averageScore,
            total_submissions: userStats.submitted?.length || 0,
            top_stories_count: userStats.topStories?.length || 0,
            recent_activity_count: userStats.recentActivity?.length || 0
          },
          recent_items: includeRecentItems ? {
            top_stories: userStats.topStories,
            recent_activity: userStats.recentActivity
          } : undefined
        };

        return {
          content: [{
            type: "text",
            text: JSON.stringify(analysis, null, 2)
          }]
        };
      } catch (error) {
        logger.error(`Failed to search user ${username}:`, error);
        return {
          content: [{
            type: "text",
            text: `Error searching user: ${error instanceof Error ? error.message : String(error)}`
          }],
          isError: true
        };
      }
    }
  );

  // Search trending topics
  server.registerTool(
    "search_trending",
    {
      title: "Search Trending Topics",
      description: "Find current trending topics and keywords from top HackerNews posts",
      inputSchema: {
        postCount: z.number().min(10).max(100).default(50).optional(),
        minWordLength: z.number().min(3).max(10).default(4).optional()
      }
    },
    async ({ postCount, minWordLength }) => {
      try {
        const topStoryIds = await hnClient.getTopStories();
        const postsToAnalyze = topStoryIds.slice(0, postCount || 50);
        
        const posts = await hnClient.getMultipleItems(postsToAnalyze);
        const validPosts = posts.filter(post => post && post.title && post.type === "story");

        // Extract and count words from titles
        const wordCounts = new Map<string, number>();
        const commonWords = new Set(['the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how', 'its', 'may', 'new', 'now', 'old', 'see', 'two', 'way', 'who', 'boy', 'did', 'man', 'end', 'why', 'let', 'put', 'say', 'she', 'too', 'use']);

        validPosts.forEach(post => {
          if (post?.title) {
            const words = post.title.toLowerCase()
              .replace(/[^\w\s]/g, ' ')
              .split(/\s+/)
              .filter((word: string) => 
                word.length >= (minWordLength || 4) && 
                !commonWords.has(word) &&
                !/^\d+$/.test(word)
              );

            words.forEach((word: string) => {
              wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
            });
          }
        });

        // Get top trending words
        const trendingTopics = Array.from(wordCounts.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 20)
          .map(([word, count]) => ({ word, count, percentage: ((count / validPosts.length) * 100).toFixed(1) }));

        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              analysis_summary: {
                posts_analyzed: validPosts.length,
                total_unique_words: wordCounts.size,
                min_word_length: minWordLength
              },
              trending_topics: trendingTopics,
              timestamp: new Date().toISOString()
            }, null, 2)
          }]
        };
      } catch (error) {
        logger.error("Failed to get trending topics:", error);
        return {
          content: [{
            type: "text",
            text: `Error analyzing trending topics: ${error instanceof Error ? error.message : String(error)}`
          }],
          isError: true
        };
      }
    }
  );

  // Search comments analysis
  server.registerTool(
    "search_comments",
    {
      title: "Search Post Comments",
      description: "Analyze the comment tree of a post for engagement patterns and statistics",
      inputSchema: {
        postId: z.number(),
        maxDepth: z.number().min(1).max(10).default(5).optional()
      }
    },
    async ({ postId, maxDepth }) => {
      try {
        const comments = await hnClient.getCommentTree(postId);
        
        if (comments.length === 0) {
          return {
            content: [{
              type: "text",
              text: `No comments found for post ${postId}`
            }]
          };
        }

        // Calculate comment statistics
        const commentStats = {
          total_comments: comments.length,
          authors: new Set(comments.map(c => c.by).filter(Boolean)).size,
          avg_comment_length: comments.reduce((sum, c) => sum + (c.text?.length || 0), 0) / comments.length,
          deleted_comments: comments.filter(c => c.deleted).length,
          dead_comments: comments.filter(c => c.dead).length
        };

        // Find top commenters
        const authorCounts = new Map<string, number>();
        comments.forEach(comment => {
          if (comment.by) {
            authorCounts.set(comment.by, (authorCounts.get(comment.by) || 0) + 1);
          }
        });

        const topCommenters = Array.from(authorCounts.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10)
          .map(([author, count]) => ({ author, comment_count: count }));

        // Analyze comment depth (simplified - would need parent tracking for full depth analysis)
        const withParents = comments.filter(c => c.parent).length;
        const topLevel = comments.filter(c => !c.parent).length;

        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              post_id: postId,
              comment_statistics: commentStats,
              engagement_metrics: {
                top_level_comments: topLevel,
                reply_comments: withParents,
                reply_ratio: topLevel > 0 ? Math.round((withParents / topLevel) * 100) / 100 : 0
              },
              top_commenters: topCommenters,
              analysis_timestamp: new Date().toISOString()
            }, null, 2)
          }]
        };
      } catch (error) {
        logger.error(`Failed to search comments for post ${postId}:`, error);
        return {
          content: [{
            type: "text",
            text: `Error searching comments: ${error instanceof Error ? error.message : String(error)}`
          }],
          isError: true
        };
      }
    }
  );

  logger.info("Successfully registered all HackerNews MCP tools");
} 