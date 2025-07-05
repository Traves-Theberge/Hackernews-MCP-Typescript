# HackerNews MCP Server - Deployment Guide

This guide explains how to deploy and configure the HackerNews MCP Server with different AI assistants and environments.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ installed
- TypeScript/tsx for development
- Docker (optional, for containerized deployment)

### Build the Server
```bash
# Install dependencies
npm install

# Build for production
npm run build

# Test the server
npm run dev
```

## 📋 Configuration Files

### 1. Claude Desktop Integration

**File**: `claude_desktop_config.json`

**Location**: 
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Linux**: `~/.config/Claude/claude_desktop_config.json`

**Configuration**:
```json
{
  "mcpServers": {
    "hackernews": {
      "command": "node",
      "args": ["C:/Users/trave/Desktop/Programs/Hackernews-MCP/dist/index.js"],
      "env": {
        "HACKERNEWS_API_BASE_URL": "https://hacker-news.firebaseio.com/v0",
        "HACKERNEWS_API_TIMEOUT": "10000",
        "HACKERNEWS_API_RETRY_ATTEMPTS": "3",
        "HACKERNEWS_API_RETRY_DELAY": "1000",
        "HACKERNEWS_CACHE_DEFAULT_TTL": "300000",
        "HACKERNEWS_CACHE_MAX_SIZE": "1000",
        "HACKERNEWS_CACHE_CLEANUP_INTERVAL": "600000",
        "HACKERNEWS_LOG_LEVEL": "info"
      }
    }
  }
}
```

**Setup Steps**:
1. Build the project: `npm run build`
2. Update the path in `args` to match your installation directory
3. Copy the configuration to your Claude Desktop config file
4. Restart Claude Desktop
5. Look for the 🔨 hammer icon in the input box

### 2. Cursor Integration

**File**: `cursor_mcp_config.json`

**Usage**: For development with Cursor using Context 7

**Configuration**:
```json
{
  "mcpServers": {
    "hackernews": {
      "command": "tsx",
      "args": ["src/index.ts"],
      "cwd": "C:/Users/trave/Desktop/Programs/Hackernews-MCP",
      "env": {
        "NODE_ENV": "development",
        "HACKERNEWS_API_BASE_URL": "https://hacker-news.firebaseio.com/v0",
        "HACKERNEWS_API_TIMEOUT": "10000",
        "HACKERNEWS_API_RETRY_ATTEMPTS": "3",
        "HACKERNEWS_API_RETRY_DELAY": "1000",
        "HACKERNEWS_CACHE_DEFAULT_TTL": "300000",
        "HACKERNEWS_CACHE_MAX_SIZE": "1000",
        "HACKERNEWS_CACHE_CLEANUP_INTERVAL": "600000",
        "HACKERNEWS_LOG_LEVEL": "info"
      }
    }
  }
}
```

**Setup Steps**:
1. Install tsx: `npm install -g tsx`
2. Update the `cwd` path to match your project directory
3. Configure Cursor to use this MCP server
4. Use `cursor use context 7` to enable MCP integration

### 3. Docker Deployment

**Files**: `Dockerfile` and `docker-compose.yml`

**Build and Run**:
```bash
# Build the Docker image
docker build -t hackernews-mcp .

# Run with Docker Compose
docker-compose up -d

# Check logs
docker-compose logs -f hackernews-mcp

# Stop the service
docker-compose down
```

**Features**:
- Production-ready container
- Health checks
- Log volume mounting
- Non-root user for security
- Automatic restart policy

## ⚙️ Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `HACKERNEWS_API_BASE_URL` | HackerNews API base URL | `https://hacker-news.firebaseio.com/v0` |
| `HACKERNEWS_API_TIMEOUT` | API request timeout (ms) | `10000` |
| `HACKERNEWS_API_RETRY_ATTEMPTS` | Number of retry attempts | `3` |
| `HACKERNEWS_API_RETRY_DELAY` | Delay between retries (ms) | `1000` |
| `HACKERNEWS_CACHE_DEFAULT_TTL` | Cache TTL (ms) | `300000` (5 minutes) |
| `HACKERNEWS_CACHE_MAX_SIZE` | Maximum cache entries | `1000` |
| `HACKERNEWS_CACHE_CLEANUP_INTERVAL` | Cache cleanup interval (ms) | `600000` (10 minutes) |
| `HACKERNEWS_LOG_LEVEL` | Logging level | `info` |

## 🔧 Customization

### Performance Tuning
```json
{
  "env": {
    "HACKERNEWS_CACHE_DEFAULT_TTL": "600000",  // 10 minutes for slower updates
    "HACKERNEWS_CACHE_MAX_SIZE": "5000",       // More cache entries
    "HACKERNEWS_API_TIMEOUT": "15000"          // Longer timeout for slow networks
  }
}
```

### Development Mode
```json
{
  "env": {
    "NODE_ENV": "development",
    "HACKERNEWS_LOG_LEVEL": "debug",           // More verbose logging
    "HACKERNEWS_CACHE_DEFAULT_TTL": "60000"    // Shorter cache for testing
  }
}
```

### Production Mode
```json
{
  "env": {
    "NODE_ENV": "production",
    "HACKERNEWS_LOG_LEVEL": "warn",            // Less verbose logging
    "HACKERNEWS_CACHE_DEFAULT_TTL": "900000"   // Longer cache for stability
  }
}
```

## 🔍 Troubleshooting

### Common Issues

1. **"Command not found" error**
   - Ensure Node.js is installed and in PATH
   - Verify the path to the built JavaScript file
   - Check file permissions

2. **"Connection refused" error**
   - Verify HackerNews API is accessible
   - Check firewall settings
   - Ensure network connectivity

3. **"Module not found" error**
   - Run `npm install` to install dependencies
   - Ensure the build completed successfully
   - Check the working directory path

4. **Tools not appearing in Claude Desktop**
   - Restart Claude Desktop after config changes
   - Check the config file syntax (valid JSON)
   - Verify the server starts without errors

### Debug Mode

Enable debug logging:
```json
{
  "env": {
    "HACKERNEWS_LOG_LEVEL": "debug"
  }
}
```

### Health Check

Test the server manually:
```bash
# Development
npm run dev

# Production
npm start

# Docker
docker-compose exec hackernews-mcp npm run health-check
```

## 📊 Monitoring

### Log Files
- Development: Console output
- Docker: `./logs/` directory
- Production: Configure log rotation

### Performance Metrics
- Cache hit/miss ratios available via `clear-cache` tool
- API response times logged at debug level
- Memory usage monitored by Docker health checks

## 🔐 Security

### Best Practices
- Run with non-root user (Docker automatically configured)
- Use environment variables for sensitive configuration
- Regularly update dependencies
- Monitor log files for suspicious activity

### Network Security
- MCP servers communicate via stdin/stdout (no network exposure)
- Docker configuration includes isolated network
- No external ports exposed by default

## 📈 Scaling

### Horizontal Scaling
- Each AI assistant instance runs its own MCP server
- No shared state between instances
- Cache is per-instance for optimal performance

### Vertical Scaling
- Increase cache size for better performance
- Adjust timeout values for slower networks
- Monitor memory usage and adjust container limits

## 🚀 Production Deployment

### Recommended Setup
1. Use Docker deployment for consistency
2. Configure log rotation
3. Set up monitoring and alerting
4. Use production environment variables
5. Regular backups of configuration files

### CI/CD Integration
```yaml
# Example GitHub Actions workflow
name: Deploy HackerNews MCP
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Build and deploy
        run: |
          npm install
          npm run build
          docker build -t hackernews-mcp .
          docker-compose up -d
```

## 📞 Support

For issues and questions:
1. Check the troubleshooting section
2. Review server logs
3. Verify configuration syntax
4. Test with minimal configuration first

---

**Happy coding with your HackerNews MCP Server!** 🎉 