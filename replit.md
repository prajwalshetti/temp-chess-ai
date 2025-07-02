# Chess Analysis Platform - replit.md

## Overview

EduChessClub is a comprehensive chess analysis platform designed for tournament players. It provides opponent scouting, game database management, position analysis, and learning tools. The application integrates with external chess services like Lichess and includes a real-time Stockfish chess engine for deep position analysis.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter for client-side routing
- **State Management**: TanStack Query for server state management
- **UI Framework**: Shadcn/UI components with Radix UI primitives
- **Styling**: Tailwind CSS with custom chess-themed color scheme
- **Build Tool**: Vite for development and production builds

### Backend Architecture
- **Runtime**: Node.js with Express.js server
- **Language**: TypeScript with ES modules
- **API Design**: RESTful endpoints with JSON responses
- **Session Management**: Express sessions with PostgreSQL storage
- **Error Handling**: Centralized error middleware with structured responses

### Database Architecture
- **Primary Database**: PostgreSQL with Drizzle ORM
- **Schema Management**: Type-safe schema definitions in shared module
- **Connection**: Neon serverless PostgreSQL adapter
- **Migrations**: Drizzle-kit for schema migrations

## Key Components

### Chess Engine Integration
- **Primary Engine**: Stockfish integration for position analysis
- **Fallback Analysis**: Custom evaluation algorithms when Stockfish unavailable
- **Analysis Features**: Position evaluation, best move suggestions, tactical pattern recognition
- **Performance**: Configurable depth analysis (default 15 ply)

### External API Integrations
- **Lichess API**: Game import, player statistics, tournament data retrieval
- **API Management**: Token-based authentication with rate limiting consideration
- **Data Processing**: PGN parsing and chess.js integration for move validation

### User Management System
- **Player Profiles**: FIDE ID, AICF ID, Lichess ID linking
- **Rating Tracking**: Current rating, puzzle rating, performance statistics
- **Game History**: Personal game database with analysis metadata

### Game Analysis System
- **PGN Processing**: Full game parsing with move-by-move analysis
- **Opening Classification**: Automatic opening detection and repertoire analysis
- **Tactical Analysis**: Blunder detection, missed tactics identification
- **Performance Metrics**: Accuracy calculation, move quality assessment

## Data Flow

### Game Import Flow
1. User inputs opponent username or game PGN
2. System queries Lichess API for game data
3. Games are processed through chess.js for validation
4. Stockfish analysis is applied to each position
5. Results stored in PostgreSQL with analysis metadata
6. Frontend displays analyzed games with insights

### Opponent Scouting Flow
1. User searches for opponent by username/ID
2. System retrieves historical games from database and Lichess
3. Opening repertoire analysis is performed
4. Tactical weaknesses are identified through pattern recognition
5. Statistical summaries are generated and cached
6. Results presented in interactive dashboard format

### Position Analysis Flow
1. User inputs FEN position or selects from game
2. Position is validated through chess.js
3. Stockfish engine analyzes position at configured depth
4. Alternative moves are evaluated and ranked
5. Tactical themes are identified (pins, forks, skewers, etc.)
6. Analysis results displayed with visual board representation

## External Dependencies

### Core Dependencies
- **chess.js**: Chess logic, move validation, and PGN parsing
- **@neondatabase/serverless**: PostgreSQL database connectivity
- **drizzle-orm**: Type-safe database operations and query building
- **@tanstack/react-query**: Server state management and caching

### UI Dependencies
- **@radix-ui/***: Accessible UI component primitives
- **tailwindcss**: Utility-first CSS framework
- **class-variance-authority**: Component variant management
- **wouter**: Lightweight React router

### Development Dependencies
- **vite**: Fast build tool and development server
- **typescript**: Type safety and development tooling
- **tsx**: TypeScript execution for development
- **esbuild**: Production bundling for server code

## Deployment Strategy

### Development Environment
- **Package Manager**: npm with package-lock.json for dependency locking
- **Development Server**: Vite dev server with HMR on port 5000
- **Database**: PostgreSQL provisioned through Replit modules
- **Environment**: NODE_ENV=development with tsx execution

### Production Build Process
1. Frontend build: `vite build` outputs to `dist/public`
2. Backend build: `esbuild` bundles server code to `dist/index.js`
3. Database migrations: `drizzle-kit push` applies schema changes
4. Environment variables: DATABASE_URL and LICHESS_API_TOKEN required

### Replit Configuration
- **Modules**: nodejs-20, web, postgresql-16, stockfish
- **Ports**: Local 5000 mapped to external 80
- **Deployment**: Autoscale target with npm build/start commands
- **Hidden Files**: .config, .git, node_modules, dist excluded from workspace

## Changelog

Changelog:
- June 26, 2025. Initial setup
- June 26, 2025. Implemented authentic Stockfish 16 engine integration with real evaluations
- June 26, 2025. Fixed PGN parsing to handle full Lichess format with headers and game results
- June 26, 2025. Added robust error handling and improved user feedback for game analysis
- June 26, 2025. Replaced TypeScript Stockfish with Python-based chess analyzer using chess.pgn and chess.engine libraries
- June 26, 2025. Integrated user's original Python analysis code for authentic move-by-move evaluation and blunder detection
- June 26, 2025. Successfully implemented authentic Python chess analysis matching local script output exactly
- June 26, 2025. Verified blunder detection and mate score handling working correctly with real Stockfish evaluations
- June 26, 2025. Updated Python analyzer with improved code structure including argparse, analysis modes (fast/accurate), and proper command-line interface matching user's original Python script exactly
- June 26, 2025. Fixed timeout issues with proper subprocess handling, performance optimizations, and 60-move limit for complex games
- June 26, 2025. Verified authentic Stockfish analysis working correctly with mate detection, proper blunder identification, and complete game processing matching user's Python script structure
- June 26, 2025. Implemented real-time Stockfish evaluation display in game viewers - users now see live engine evaluations when navigating through moves
- June 26, 2025. Added position analysis API endpoint and integrated with both OpponentScout and GamesDatabase components for automatic evaluation display
- June 26, 2025. Fixed null safety issues and added evaluation caching system for optimal performance during move navigation
- June 26, 2025. Completed comprehensive game analysis system - changed "Analyze Position" to "Analyze Game" button that processes entire PGN once and stores all move evaluations
- June 26, 2025. Fixed 0.00 evaluation issue by implementing complete game analysis instead of position-by-position analysis, now shows authentic Stockfish evaluations like +0.30, -0.44, +0.38
- June 26, 2025. Updated both OpponentScout and GamesDatabase navigation systems to use stored move evaluations for instant display when navigating through moves
- June 26, 2025. Removed duplicate "Game Moves:" sections from UI, cleaning up the interface for better user experience
- June 26, 2025. Fixed game analysis failures by removing duplicate /api/analyze/game endpoints that were causing conflicts
- June 26, 2025. Verified complete game analysis system working correctly with authentic Stockfish evaluations and proper error handling
- June 26, 2025. Integrated improved Python Stockfish analyzer with better error handling, JSON output, and enhanced evaluation accuracy
- June 26, 2025. Added stockfish Python package for direct Stockfish engine integration with configurable depth and threading
- June 26, 2025. Enhanced Stockfish analysis settings to depth 20 with 3-second minimum thinking time per position for maximum evaluation accuracy
- June 26, 2025. Increased API timeout to 10 minutes to accommodate deep analysis with 3-second thinking time per position
- June 26, 2025. Optimized Stockfish settings to depth 20 with 1.5-second thinking time and 4 threads to prevent timeouts while maintaining strong analysis quality
- July 1, 2025. Fixed evaluation display inconsistency between OpponentScout and GamesDatabase pages - both now show consistent decimal format (e.g., -2.52 instead of mixed centipawn/decimal values)
- July 1, 2025. Fixed evaluation perspective to match Lichess standard - all evaluations now displayed from White's perspective for consistency with industry standards
- July 1, 2025. Fixed evaluation timing to match Lichess methodology - evaluations now calculated for position before move is played, not after, ensuring accurate comparison with Lichess analysis
- July 2, 2025. Fixed critical local development issue - API routes now properly prioritized over Vite catch-all route, resolving "Unexpected token '<'" JSON parsing errors when running locally
- July 2, 2025. Enhanced error handling and debugging for local development with comprehensive logging and proper CORS headers for API endpoints
- July 2, 2025. Created comprehensive troubleshooting documentation for common local development issues including database setup, port conflicts, and API routing problems

## User Preferences

Preferred communication style: Simple, everyday language.