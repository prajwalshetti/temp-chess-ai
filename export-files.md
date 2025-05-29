# Chess Platform Project Files for GitHub Deployment

## Project Structure

Your chess platform consists of:
- Frontend: React with TypeScript (client/ folder)
- Backend: Express.js server (server/ folder)
- Database: PostgreSQL with Drizzle ORM (shared/schema.ts)
- UI Components: Shadcn/UI components
- Chess Engine: Stockfish integration for position analysis

## Key Files to Deploy:

### Root Configuration Files:
- package.json
- tsconfig.json
- vite.config.ts
- tailwind.config.ts
- drizzle.config.ts
- postcss.config.js
- components.json

### Frontend Files (client/):
- client/index.html
- client/src/main.tsx
- client/src/App.tsx
- client/src/index.css
- All component files in client/src/components/
- All page files in client/src/pages/
- All utility files in client/src/lib/
- All hook files in client/src/hooks/

### Backend Files (server/):
- server/index.ts (main server file)
- server/routes.ts (API endpoints)
- server/db.ts (database connection)
- server/storage.ts (data layer)
- server/lichess.ts (Lichess API integration)
- server/stockfish-analyzer.ts (chess analysis)
- server/real-stockfish.ts (enhanced chess engine)
- server/vite.ts (development server)

### Shared Files:
- shared/schema.ts (database schema and types)

## Environment Variables Needed:
- DATABASE_URL
- LICHESS_API_TOKEN
- PGHOST, PGPORT, PGUSER, PGPASSWORD, PGDATABASE

## Deployment Commands:
- npm install
- npm run build
- npm start

Would you like me to show you the contents of specific files, or would you prefer a different format for the export?