# Chess Analysis Platform - Troubleshooting Guide

## Issue: API Returns HTML Instead of JSON (Local Development)

### Symptoms
- Error: `SyntaxError: Failed to execute 'json' on 'Response': Unexpected token '<', "<!DOCTYPE "... is not valid JSON`
- API calls return HTML content instead of expected JSON
- Works on Replit but fails locally

### Root Causes & Solutions

#### 1. API Routes Not Registered Before Vite Middleware

**Problem**: Vite's catch-all route intercepts API requests before they reach Express routes.

**✅ FIXED**: The middleware order has been corrected in `server/index.ts`:

```typescript
(async () => {
  // CRITICAL: Register API routes FIRST
  const server = await registerRoutes(app);
  
  // Error handling middleware
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });

  // Setup Vite AFTER API routes (development only)
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
})();
```

#### 2. Missing Environment Variables

**Problem**: Missing `LICHESS_API_TOKEN` or `DATABASE_URL` causes API failures.

**Solution**: Create `.env` file:
```bash
NODE_ENV=development
DATABASE_URL=postgresql://username:password@localhost:5432/chess_analysis
LICHESS_API_TOKEN=your_lichess_token_here
```

#### 3. Port Conflicts

**Problem**: `EADDRINUSE: address already in use 0.0.0.0:5000`

**Solutions**:
```bash
# Method 1: Kill all node processes
pkill -f "tsx server/index.ts"

# Method 2: Kill specific port
lsof -ti:5000 | xargs kill -9

# Method 3: Find and kill process
ps aux | grep "tsx server" | grep -v grep | awk '{print $2}' | xargs kill
```

#### 4. Database Connection Issues

**Problem**: Cannot connect to PostgreSQL.

**Solutions**:
- Install PostgreSQL locally
- Create database: `createdb chess_analysis`
- Update connection string in `.env`
- Run schema migration: `npm run db:push`

## Testing API Endpoints Locally

### 1. Health Check
```bash
curl http://localhost:5000/api/health
```
Expected response:
```json
{
  "status": "ok",
  "timestamp": "2025-07-02T10:55:00.000Z",
  "environment": "development",
  "lichessToken": "configured"
}
```

### 2. User Data
```bash
curl http://localhost:5000/api/user/1
```

### 3. Lichess Integration
```bash
curl http://localhost:5000/api/lichess/user/testuser/games
```

## Step-by-Step Local Setup

### 1. Prerequisites
```bash
# Node.js 18+
node --version

# PostgreSQL
psql --version

# Python 3.8+
python3 --version

# Stockfish (optional for analysis)
stockfish
```

### 2. Database Setup
```bash
# Start PostgreSQL
sudo service postgresql start  # Linux
brew services start postgresql  # macOS

# Create database
createdb chess_analysis

# Verify connection
psql -d chess_analysis -c "SELECT version();"
```

### 3. Install Dependencies
```bash
npm install
pip install chess stockfish  # For Python analysis
```

### 4. Environment Configuration
```bash
# Copy example environment file
cp .env.example .env  # If exists

# Or create .env manually
echo "NODE_ENV=development" > .env
echo "DATABASE_URL=postgresql://username:password@localhost:5432/chess_analysis" >> .env
echo "LICHESS_API_TOKEN=your_token_here" >> .env
```

### 5. Initialize Database
```bash
npm run db:push
```

### 6. Start Development Server
```bash
npm run dev
```

## Debugging Steps

### 1. Enable Verbose Logging
The server now includes debug middleware. Check console output for:
```
[2025-07-02T10:55:00.000Z] GET /api/lichess/user/testuser/games
[API Request] GET /api/lichess/user/testuser/games { max: '50' }
[API] Processing Lichess games request for: testuser
```

### 2. Check Network Tab
1. Open browser DevTools (F12)
2. Go to Network tab
3. Make API request
4. Check response content type and body

### 3. Test Individual Components

**Test API Only**:
```bash
# Start server without Vite
NODE_ENV=production npm run build
NODE_ENV=production npm start
```

**Test Frontend Only**:
```bash
# Start Vite dev server on different port
npx vite --port 3000
```

### 4. Common Error Patterns

**Error**: `Cannot find module 'drizzle-zod'`
**Solution**: `npm install drizzle-zod`

**Error**: `connect ECONNREFUSED ::1:5432`
**Solution**: Check PostgreSQL is running and connection string is correct

**Error**: `Unauthorized` from Lichess API
**Solution**: Verify `LICHESS_API_TOKEN` is valid

## Production vs Development Differences

| Aspect | Replit (Production) | Local Development |
|--------|-------------------|-------------------|
| Database | Auto-provisioned PostgreSQL | Manual setup required |
| Stockfish | Pre-installed | Manual installation |
| Environment | Managed automatically | Manual .env configuration |
| HTTPS | Automatic | HTTP only (localhost) |
| Port | Auto-assigned | Manual (usually 5000) |

## Alternative Local Setup (Docker)

If you prefer containerized development:

```dockerfile
# Dockerfile
FROM node:18
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 5000
CMD ["npm", "run", "dev"]
```

```yaml
# docker-compose.yml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "5000:5000"
    environment:
      - NODE_ENV=development
      - DATABASE_URL=postgresql://postgres:password@db:5432/chess_analysis
    depends_on:
      - db
  
  db:
    image: postgres:15
    environment:
      POSTGRES_PASSWORD: password
      POSTGRES_DB: chess_analysis
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

Run with: `docker-compose up`

## Still Having Issues?

1. **Check the logs**: Look for specific error messages in console
2. **Verify file structure**: Ensure all files are in correct locations
3. **Test step by step**: Isolate the problem by testing individual components
4. **Compare with working environment**: Check differences between local and Replit setup

The application is designed to work seamlessly on Replit with minimal configuration, while local development requires more manual setup but offers greater control and debugging capabilities.