# Chess Platform - JavaScript Conversion

## Project Overview
A sophisticated chess platform converted from TypeScript to JavaScript, featuring:
- React frontend with JSX
- Node.js + Express backend
- Chess.js integration for game logic
- React-chessboard for UI
- In-memory storage for data persistence
- Real-time chess analysis and evaluation

## Recent Changes (January 2025)
✅ **TypeScript to JavaScript Conversion Completed**
- Converted all `.ts` files to `.js` and `.tsx` to `.jsx`
- Removed TypeScript dependencies and type definitions
- Updated server entry point to `server/index.js`
- Implemented chess board using react-chessboard library
- Added FEN evaluation API endpoint at `/api/evaluate`
- Configured CORS for frontend-backend communication
- Maintained all chess functionality and UI components

## Architecture
### Backend (`server/`)
- `index.js` - Main Express server with CORS and middleware
- `routes.js` - API routes including `/api/evaluate` for chess engine
- `storage.js` - In-memory data storage with sample chess data
- `lichess.js` - Lichess API integration for game analysis
- `vite.js` - Development server configuration

### Frontend (`client/src/`)
- `main.jsx` - React application entry point
- `App.jsx` - Main application with routing
- `components/ChessBoard.jsx` - Interactive chess board using react-chessboard
- `pages/` - Application pages (Home, Games, Scout, Learn, Account)
- `lib/queryClient.js` - React Query configuration for API calls

## Key Features
- **Chess Board**: Interactive chess board with drag-and-drop pieces
- **Game Analysis**: Position evaluation and move analysis
- **Opponent Scout**: Player analysis and strategy recommendations  
- **Games Database**: Game history and replay functionality
- **Learning Tools**: Puzzles and tactical training
- **API Integration**: Lichess games and player data

## Development Setup
```bash
# Install dependencies
npm install

# Start development server
node server/index.js
```

The application runs on port 5000 with both frontend and backend served together.

## User Preferences
- JavaScript-only development (no TypeScript)
- React with JSX for frontend components
- Express.js for backend API
- react-chessboard for chess UI
- In-memory storage for simplicity