# Chess Analysis Platform - Local Development Setup

## Prerequisites

1. **Node.js**: Install Node.js 18+ from [nodejs.org](https://nodejs.org/)
2. **PostgreSQL**: Install PostgreSQL locally or use a cloud service
3. **Python**: Python 3.8+ for chess analysis features
4. **Stockfish**: Install Stockfish chess engine

## Installation Steps

### 1. Clone and Install Dependencies
```bash
git clone https://github.com/yourusername/chess-analysis-platform.git
cd chess-analysis-platform
npm install
```

### 2. Install Python Dependencies
```bash
pip install chess stockfish
```

### 3. Set Up Environment Variables
Create a `.env` file in the root directory:
```bash
# Database Configuration
DATABASE_URL=postgresql://username:password@localhost:5432/chess_analysis

# Lichess API (Optional - get from https://lichess.org/account/oauth/token)
LICHESS_API_TOKEN=your_lichess_api_token_here

# Environment
NODE_ENV=development
```

### 4. Set Up Database
```bash
# Push database schema
npm run db:push
```

### 5. Start Development Server
```bash
npm run dev
```

## Common Issues and Solutions

### Issue 1: API Returns HTML Instead of JSON

**Problem**: When running locally, API endpoints return HTML instead of JSON, causing "Unexpected token '<'" errors.

**Root Cause**: The Vite development server's catch-all route intercepts API requests before they reach Express routes.

**Solution**: 

1. **Check Server Order**: Ensure API routes are registered BEFORE Vite middleware in `server/index.ts`

2. **Verify API Route Registration**: Make sure routes are properly registered:
```typescript
// server/index.ts
(async () => {
  // Register API routes FIRST
  const server = await registerRoutes(app);
  
  // Then setup Vite (development only)
  if (app.get("env") === "development") {
    await setupVite(app, server);
  }
})();
```

3. **Test API Endpoints**: Verify endpoints work by testing directly:
```bash
curl http://localhost:5000/api/lichess/user/testuser/games
```

### Issue 2: Port Already in Use

**Problem**: `EADDRINUSE: address already in use 0.0.0.0:5000`

**Solution**:
```bash
# Kill existing processes
pkill -f "tsx server/index.ts"
# Or find and kill specific process
lsof -ti:5000 | xargs kill -9
```

### Issue 3: Database Connection Issues

**Problem**: Cannot connect to PostgreSQL database

**Solutions**:
- Verify PostgreSQL is running: `pg_ctl status`
- Check connection string in `.env`
- Ensure database exists: `createdb chess_analysis`

### Issue 4: Stockfish Not Found

**Problem**: Chess analysis fails with Stockfish errors

**Solutions**:
- **macOS**: `brew install stockfish`
- **Ubuntu/Debian**: `sudo apt install stockfish`
- **Windows**: Download from [stockfishchess.org](https://stockfishchess.org/download/)

## Development Workflow

### Starting the Application
```bash
# Development mode (with hot reload)
npm run dev

# Production build
npm run build
npm start
```

### Database Operations
```bash
# Apply schema changes
npm run db:push

# View database
npm run db:studio  # If you have Drizzle Studio
```

### Testing API Endpoints

1. **User Profile**:
```bash
curl http://localhost:5000/api/user/1
```

2. **Lichess Integration**:
```bash
curl http://localhost:5000/api/lichess/user/testuser/games
```

3. **Game Analysis**:
```bash
curl -X POST http://localhost:5000/api/analyze/game \
  -H "Content-Type: application/json" \
  -d '{"pgn":"1. e4 e5 2. Nf3 Nc6"}'
```

## File Structure for Local Development

```
chess-analysis-platform/
├── client/                 # React frontend
│   ├── src/
│   │   ├── pages/         # App pages
│   │   ├── components/    # UI components
│   │   └── lib/          # Utilities
├── server/                # Express backend
│   ├── routes.ts         # API routes
│   ├── lichess.ts        # Lichess integration
│   └── *.py             # Python analysis scripts
├── shared/               # Shared types/schema
├── package.json         # Dependencies
├── .env                 # Environment variables (create this)
└── README.md           # Project documentation
```

## Differences Between Replit and Local

### Replit Environment
- Automatic PostgreSQL database provisioning
- Pre-installed Stockfish engine
- Integrated development environment
- Automatic port forwarding

### Local Environment
- Manual database setup required
- Manual Stockfish installation
- Need to manage environment variables
- Port conflicts possible

## Troubleshooting Tips

1. **Enable Verbose Logging**: Add console.log statements in API routes to debug
2. **Check Network Tab**: Use browser dev tools to see actual API responses
3. **Verify Environment**: Ensure `NODE_ENV=development` is set
4. **Test Individual Components**: Test backend and frontend separately

## Production Deployment

For production deployment, the app is designed to work on Replit with:
- PostgreSQL module
- Stockfish module
- Node.js 20 runtime
- Automatic HTTPS and domain provisioning