import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { HackerNewsClient } from "../api/client.js";
import { logger } from "../utils/logger.js";
import { z } from "zod";

export async function setupPrompts(server: McpServer, hnClient: HackerNewsClient): Promise<void> {
  logger.info("Setting up MCP prompts for HackerNews...");

  // Story analysis prompt
  server.registerPrompt(
    "analyze-story",
    {
      title: "Analyze HackerNews Story",
      description: "Generate a comprehensive analysis of a HackerNews story including content, engagement, and discussion patterns",
      argsSchema: {
        storyId: z.string().describe("The HackerNews story ID to analyze"),
        includeComments: z.string().optional().describe("Whether to include comment analysis (true/false)"),
        analysisDepth: z.string().optional().describe("Level of analysis detail (basic/detailed/comprehensive)")
      }
    },
    async ({ storyId, includeComments, analysisDepth }) => {
      try {
        const story = await hnClient.getStoryWithMetadata(parseInt(storyId, 10));
        if (!story) {
          throw new Error(`Story ${storyId} not found`);
        }

        const depth = analysisDepth || "detailed";
        const shouldIncludeComments = includeComments === "true" || includeComments === undefined;

        let analysisPrompt = `Please analyze this HackerNews story in detail:

**Story Information:**
- Title: ${story.title}
- Author: ${story.by}
- Score: ${story.score} points
- Comments: ${story.commentCount} comments
- Age: ${Math.round(story.ageHours)} hours old
- URL: ${story.url || "No external URL"}
- Domain: ${story.domain || "Self post"}

**Story Content:**
${story.text ? `"${story.text}"` : "No additional content (link post)"}

**Analysis Tasks:**
1. Summarize the main topic and key points
2. Assess the story's relevance and newsworthiness
3. Evaluate the engagement level (score vs. comments ratio)
4. Identify the target audience and community interest
`;

        if (depth === "detailed" || depth === "comprehensive") {
          analysisPrompt += `5. Analyze the posting timing and its impact
6. Compare with typical HackerNews content patterns
7. Predict potential discussion themes
`;
        }

        if (depth === "comprehensive") {
          analysisPrompt += `8. Provide strategic insights for content creators
9. Suggest follow-up topics or related stories
10. Assess long-term discussion potential
`;
        }

        if (shouldIncludeComments && story.commentCount > 0) {
          const comments = await hnClient.getCommentTree(parseInt(storyId, 10));
          const topComments = comments.slice(0, 5);
          
          analysisPrompt += `

**Top Comments for Context:**
${topComments.map((comment, index) => 
  `${index + 1}. By ${comment.by}: "${comment.text?.substring(0, 200)}${comment.text && comment.text.length > 200 ? '...' : ''}"`
).join('\n')}

**Comment Analysis Tasks:**
- Identify main discussion themes
- Assess comment quality and engagement
- Note any expert opinions or insider knowledge
- Evaluate community sentiment
`;
        }

        return {
          messages: [{
            role: "user",
            content: {
              type: "text",
              text: analysisPrompt
            }
          }]
        };
      } catch (error) {
        logger.error(`Failed to create story analysis prompt for ${storyId}:`, error);
        throw error;
      }
    }
  );

  // User profile analysis prompt
  server.registerPrompt(
    "analyze-user-profile",
    {
      title: "Analyze HackerNews User Profile",
      description: "Generate insights about a HackerNews user's activity patterns, expertise, and community engagement",
      argsSchema: {
        username: z.string().describe("The HackerNews username to analyze"),
        includeRecentActivity: z.string().optional().describe("Whether to include recent submissions and comments (true/false)"),
        focusArea: z.string().optional().describe("Analysis focus area (general/expertise/engagement/influence)")
      }
    },
    async ({ username, includeRecentActivity, focusArea }) => {
      try {
        if (!username) {
          throw new Error("Username is required");
        }

        const userStats = await hnClient.getUserWithStats(username);
        if (!userStats) {
          throw new Error(`User ${username} not found`);
        }

        const shouldIncludeActivity = includeRecentActivity === "true" || includeRecentActivity === undefined;
        const focus = focusArea || "general";

        const accountAgeHours = (Date.now() / 1000 - userStats.created) / 3600;
        const accountAgeDays = Math.floor(accountAgeHours / 24);
        const karmaPerDay = accountAgeDays > 0 ? (userStats.karma / accountAgeDays).toFixed(2) : "0";

        let analysisPrompt = `Please analyze this HackerNews user profile:

**User Information:**
- Username: ${userStats.id}
- Karma: ${userStats.karma} points
- Account Age: ${accountAgeDays} days (${Math.round(accountAgeHours / 24 / 365 * 10) / 10} years)
- Karma per Day: ${karmaPerDay}
- Total Submissions: ${userStats.submitted?.length || 0}
- About: ${userStats.about || "No bio provided"}

**Activity Statistics:**
- Average Story Score: ${userStats.averageScore || "N/A"}
- Top Stories: ${userStats.topStories?.length || 0}
- Recent Activity Items: ${userStats.recentActivity?.length || 0}
`;

        if (shouldIncludeActivity && userStats.recentActivity && userStats.recentActivity.length > 0) {
          analysisPrompt += `

**Recent Activity Sample:**
${userStats.recentActivity.slice(0, 3).map((item, index) => 
            `${index + 1}. ${item.type}: "${item.title || item.text?.substring(0, 100) || 'No title'}${item.title && item.title.length > 100 ? '...' : ''}" (Score: ${item.score || 0})`
          ).join('\n')}
`;
        }

        if (userStats.topStories && userStats.topStories.length > 0) {
          analysisPrompt += `

**Top Performing Stories:**
${userStats.topStories.slice(0, 3).map((story, index) => 
            `${index + 1}. "${story.title}" (Score: ${story.score}, Comments: ${story.descendants || 0})`
          ).join('\n')}
`;
        }

        analysisPrompt += `

**Analysis Tasks based on ${focus} focus:**
`;

        switch (focus) {
          case "expertise":
            analysisPrompt += `1. Identify the user's areas of expertise based on submissions
2. Analyze the technical depth of their contributions
3. Assess their knowledge sharing patterns
4. Evaluate their reputation in specific domains
5. Note any recurring themes or specializations`;
            break;
          case "engagement":
            analysisPrompt += `1. Evaluate their community engagement level
2. Analyze their posting frequency and consistency
3. Assess the quality vs. quantity of their contributions
4. Review their interaction patterns with other users
5. Measure their influence on discussions`;
            break;
          case "influence":
            analysisPrompt += `1. Assess their influence within the HackerNews community
2. Analyze the reach and impact of their submissions
3. Evaluate their ability to drive meaningful discussions
4. Review their thought leadership indicators
5. Measure their contribution to community knowledge`;
            break;
          default:
            analysisPrompt += `1. Provide an overall assessment of their HackerNews presence
2. Identify their primary contribution patterns
3. Evaluate their community standing and reputation
4. Assess their activity level and engagement quality
5. Note any distinctive characteristics or specializations`;
        }

        return {
          messages: [{
            role: "user",
            content: {
              type: "text",
              text: analysisPrompt
            }
          }]
        };
      } catch (error) {
        logger.error(`Failed to create user analysis prompt for ${username}:`, error);
        throw error;
      }
    }
  );

  // Trending topics summary prompt
  server.registerPrompt(
    "summarize-trending-topics",
    {
      title: "Summarize HackerNews Trending Topics",
      description: "Generate a comprehensive summary of current trending topics and discussions on HackerNews",
      argsSchema: {
        timeframe: z.string().optional().describe("Timeframe for trending analysis (current/today/week)"),
        storyCount: z.string().optional().describe("Number of top stories to analyze (10-100)"),
        includeAnalysis: z.string().optional().describe("Whether to include trend analysis and insights (true/false)")
      }
    },
    async ({ timeframe, storyCount, includeAnalysis }) => {
      try {
        const count = parseInt(storyCount || "30", 10);
        const shouldAnalyze = includeAnalysis === "true" || includeAnalysis === undefined;
        const frame = timeframe || "current";

        const topStoryIds = await hnClient.getTopStories();
        const storiesToAnalyze = topStoryIds.slice(0, count);
        const stories = await hnClient.getMultipleItems(storiesToAnalyze);
        const validStories = stories.filter(story => story && story.title && story.type === "story");

        // Extract trending topics
        const wordCounts = new Map<string, number>();
        const commonWords = new Set(['the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how', 'its', 'may', 'new', 'now', 'old', 'see', 'two', 'way', 'who', 'boy', 'did', 'man', 'end', 'why', 'let', 'put', 'say', 'she', 'too', 'use']);

        validStories.forEach(story => {
          if (story?.title) {
            const words = story.title.toLowerCase()
              .replace(/[^\w\s]/g, ' ')
              .split(/\s+/)
              .filter(word => word.length >= 4 && !commonWords.has(word) && !/^\d+$/.test(word));

            words.forEach(word => {
              wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
            });
          }
        });

        const trendingTopics = Array.from(wordCounts.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 15);

        let summaryPrompt = `Please provide a comprehensive summary of current HackerNews trending topics and discussions:

**Analysis Scope:**
- Timeframe: ${frame}
- Stories Analyzed: ${validStories.length}
- Data Source: HackerNews front page

**Top Trending Keywords:**
${trendingTopics.map(([word, count], index) => 
  `${index + 1}. "${word}" (mentioned ${count} times)`
).join('\n')}

**Featured Stories Sample:**
${validStories.slice(0, 10).map((story, index) => 
  story ? `${index + 1}. "${story.title}" by ${story.by} (${story.score} points, ${story.descendants || 0} comments)` : ''
).filter(Boolean).join('\n')}
`;

        if (shouldAnalyze) {
          summaryPrompt += `

**Analysis Tasks:**
1. Identify the main themes and topics dominating HackerNews today
2. Analyze the technology trends and emerging technologies being discussed
3. Note any significant news events or industry developments
4. Assess the community's current interests and concerns
5. Highlight any recurring patterns or ongoing discussions
6. Provide insights into the tech community's mindset and priorities
7. Suggest what these trends might indicate for the near future
8. Compare with typical HackerNews discussion patterns

**Summary Requirements:**
- Provide a concise executive summary (2-3 paragraphs)
- List 5-7 key trending topics with brief explanations
- Note any surprising or unexpected trends
- Offer perspective on the significance of these trends for the tech community`;
        }

        return {
          messages: [{
            role: "user",
            content: {
              type: "text",
              text: summaryPrompt
            }
          }]
        };
      } catch (error) {
        logger.error("Failed to create trending topics summary prompt:", error);
        throw error;
      }
    }
  );



  logger.info("Successfully registered all HackerNews MCP prompts");
} 