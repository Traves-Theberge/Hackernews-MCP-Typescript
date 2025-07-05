# HackerNews MCP Server Setup Guide

## Quick Start

1. **Build the application:**
   ```bash
   npm run build
   ```

2. **Test the server:**
   ```bash
   npm start
   ```

3. **Restart Cursor** to load the new MCP configuration

## Usage in Cursor

Once set up, you can use the HackerNews MCP server in several ways:

### 🔧 Tools (Interactive Commands)

Ask Cursor to use these tools:

- **Search Posts**: "Find stories about 'AI' with score > 50"
- **Get Post Details**: "Get full details of HN story 38471822"
- **User Analysis**: "Analyze user 'pg' and show their top stories"
- **Trending Topics**: "What's trending on HackerNews today?"
- **Comment Analysis**: "Analyze the comments on story 38471822"

### 📋 Resources (Direct Data Access)

Reference these URIs directly:

- `hackernews://stories/top` - Top stories
- `hackernews://stories/new` - New stories
- `hackernews://stories/ask` - Ask HN stories
- `hackernews://user/pg` - User profile
- `hackernews://item/12345` - Specific item
- `hackernews://comments/12345` - Comment tree

### 🎯 Prompts (Analysis Templates)

Use these for comprehensive analysis:

- **Story Analysis**: "Analyze HN story 38471822 comprehensively"
- **User Profile**: "Analyze user 'dang' with focus on engagement"
- **Trending Summary**: "Summarize current HN trending topics"

## Example Conversations

### Story Research
```
You: "Find the top 5 stories about 'OpenAI' from this week"
Cursor: [Uses search_posts tool with filters]
```

### User Analysis
```
You: "Who is 'pg' and what are they known for on HackerNews?"
Cursor: [Uses search_user tool and analyze-user-profile prompt]
```

### Trend Analysis
```
You: "What topics are dominating HackerNews discussions today?"
Cursor: [Uses search_trending tool and summarize-trending-topics prompt]
```

## Configuration

The MCP server is configured via environment variables:

- `HACKERNEWS_API_BASE_URL`: API base URL (default: HN Firebase API)
- `HACKERNEWS_API_TIMEOUT`: Request timeout in ms (default: 10000)
- `CACHE_TTL_SECONDS`: Cache expiration time (default: 300)
- `CACHE_MAX_SIZE`: Maximum cache size (default: 1000)
- `LOG_LEVEL`: Logging level (default: info)

## Troubleshooting

1. **Server not starting**: Check if Node.js 18+ is installed
2. **Connection issues**: Restart Cursor after configuration changes
3. **API errors**: Check network connectivity to Firebase
4. **Performance**: Adjust cache settings for your usage patterns

## Features

- ✅ Full HackerNews API coverage
- ✅ Smart caching with TTL
- ✅ Batch operations for efficiency
- ✅ Advanced search and filtering
- ✅ User analytics and insights
- ✅ Trending topic analysis
- ✅ Comment tree analysis
- ✅ Real-time updates support 