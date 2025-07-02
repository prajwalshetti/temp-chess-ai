# EduChessClub - Chess Analysis Platform

A comprehensive chess platform for tournament players featuring opponent analysis, game database, and advanced position evaluation.

## Features

- **Opponent Scout**: Analyze opponent statistics, opening preferences, and weaknesses
- **Games Database**: Store and analyze both tournament and online games
- **Position Analysis**: Real-time Stockfish engine evaluation
- **Lichess Integration**: Import games and tournament data
- **Advanced Statistics**: Performance tracking and opening analysis

## Tech Stack

- **Frontend**: React, TypeScript, Tailwind CSS, Shadcn/UI
- **Backend**: Node.js, Express, TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Chess Engine**: Stockfish integration
- **External APIs**: Lichess API for game data

## Installation

1. Clone the repository
2. Install dependencies: `npm install`
3. Set up environment variables (see below)
4. Run database migrations: `npm run db:push`
5. Start development: `npm run dev`

## Environment Variables

```
DATABASE_URL=your_postgresql_connection_string
LICHESS_API_TOKEN=your_lichess_api_token
PGHOST=your_pg_host
PGPORT=your_pg_port
PGUSER=your_pg_user
PGPASSWORD=your_pg_password
PGDATABASE=your_pg_database
```

## Deployment

For production deployment:

1. Build the application: `npm run build`
2. Start production server: `npm start`

## Project Structure

```
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # UI components
│   │   ├── pages/          # Application pages
│   │   ├── hooks/          # Custom React hooks
│   │   └── lib/            # Utility functions
├── server/                 # Express backend
│   ├── routes.ts          # API endpoints
│   ├── db.ts              # Database connection
│   ├── lichess.ts         # Lichess API integration
│   └── stockfish-analyzer.ts # Chess analysis
├── shared/                # Shared types and schemas
└── package.json           # Dependencies and scripts
```

## Key Features Implementation

- Authentic Lichess data integration for opponent analysis
- Real Stockfish engine evaluation for position analysis
- Advanced opening statistics and performance tracking
- Tournament player database with rating history
- Game import and analysis tools

## License

MIT License