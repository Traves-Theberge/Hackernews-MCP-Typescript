# HackerNews MCP Server

A Model Context Protocol (MCP) server that provides seamless integration with the HackerNews API, enabling LLMs to access and analyze HackerNews content through standardized MCP interfaces.

## Features

### Resources
- **Stories**: Access individual stories, comments, and metadata
- **Collections**: Top stories, new stories, best stories, Ask HN, Show HN, and job postings
- **Users**: User profiles, karma, submission history
- **Live Data**: Real-time updates and change notifications

### Tools
- **Search**: Find stories by keywords, author, or date range
- **Analysis**: Analyze story trends, engagement metrics, and discussion patterns
- **Summarization**: Generate summaries of stories and comment threads
- **User Insights**: Track user activity and contribution patterns

### Prompts
- **Story Analysis**: Templates for analyzing story content and engagement
- **Comment Analysis**: Sentiment analysis and discussion summarization
- **Trend Reporting**: Generate reports on trending topics and patterns
- **User Profiling**: Create insights about user behavior and contributions

## Installation

```bash
# Clone the repository
git clone <repository-url>
cd hackernews-mcp-server

# Install dependencies
npm install

# Copy environment configuration
cp env.example .env

# Build the project
npm run build

# Start the server
npm start
```

## Development

```bash
# Run in development mode with hot reload
npm run dev

# Run tests
npm test

# Lint code
npm run lint

# Fix linting issues
npm run lint:fix
```

## Configuration

Copy `env.example` to `.env` and configure the following variables:

- `SERVER_NAME`: Name of the MCP server
- `SERVER_VERSION`: Version identifier
- `HACKERNEWS_API_BASE_URL`: HackerNews API base URL
- `HACKERNEWS_API_TIMEOUT`: API request timeout in milliseconds
- `CACHE_TTL_SECONDS`: Cache time-to-live in seconds
- `CACHE_MAX_SIZE`: Maximum number of cached items
- `LOG_LEVEL`: Logging level (debug, info, warn, error)

## Usage

The server implements the Model Context Protocol and can be used with any MCP-compatible client. It provides access to HackerNews data through three main interfaces:

1. **Resources**: Read-only access to HN data
2. **Tools**: Interactive operations for searching and analysis
3. **Prompts**: Template-based workflows for common tasks

## API Coverage

This MCP server covers the complete HackerNews API:

- `/v0/item/{id}` - Individual items (stories, comments, jobs, polls)
- `/v0/user/{id}` - User profiles and activity
- `/v0/maxitem` - Latest item ID
- `/v0/topstories` - Top stories
- `/v0/newstories` - New stories
- `/v0/beststories` - Best stories
- `/v0/askstories` - Ask HN stories
- `/v0/showstories` - Show HN stories
- `/v0/jobstories` - Job postings
- `/v0/updates` - Changed items and profiles

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

## License

MIT License - see LICENSE file for details. 