# Chess Platform Project Export

## File Structure

```
educhessclub/
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.ts
├── drizzle.config.ts
├── postcss.config.js
├── components.json
├── README.md
├── client/
│   ├── index.html
│   └── src/
│       ├── main.tsx
│       ├── App.tsx
│       ├── index.css
│       ├── components/
│       ├── pages/
│       ├── hooks/
│       └── lib/
├── server/
│   ├── index.ts
│   ├── routes.ts
│   ├── db.ts
│   ├── storage.ts
│   ├── lichess.ts
│   ├── stockfish-analyzer.ts
│   ├── real-stockfish.ts
│   └── vite.ts
└── shared/
    └── schema.ts
```

## Installation Steps for Local Development

1. Create project directory: `mkdir educhessclub && cd educhessclub`
2. Copy all files from the sections below
3. Run: `npm install`
4. Set up environment variables
5. Run: `npm run dev`

## Environment Variables (.env)

```
DATABASE_URL=your_postgresql_connection_string
LICHESS_API_TOKEN=your_lichess_api_token
PGHOST=your_pg_host
PGPORT=your_pg_port
PGUSER=your_pg_user
PGPASSWORD=your_pg_password
PGDATABASE=your_pg_database
```

---

# File Contents

Copy each file exactly as shown below:

## 1. package.json

```json
{
  "name": "rest-express",
  "version": "1.0.0",
  "type": "module",
  "license": "MIT",
  "scripts": {
    "dev": "NODE_ENV=development tsx server/index.ts",
    "build": "vite build && esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist",
    "start": "NODE_ENV=production node dist/index.js",
    "check": "tsc",
    "db:push": "drizzle-kit push"
  },
  "dependencies": {
    "@hookform/resolvers": "^3.10.0",
    "@jridgewell/trace-mapping": "^0.3.25",
    "@neondatabase/serverless": "^0.10.4",
    "@radix-ui/react-accordion": "^1.2.4",
    "@radix-ui/react-alert-dialog": "^1.1.7",
    "@radix-ui/react-aspect-ratio": "^1.1.3",
    "@radix-ui/react-avatar": "^1.1.4",
    "@radix-ui/react-checkbox": "^1.1.5",
    "@radix-ui/react-collapsible": "^1.1.4",
    "@radix-ui/react-context-menu": "^2.2.7",
    "@radix-ui/react-dialog": "^1.1.7",
    "@radix-ui/react-dropdown-menu": "^2.1.7",
    "@radix-ui/react-hover-card": "^1.1.7",
    "@radix-ui/react-label": "^2.1.3",
    "@radix-ui/react-menubar": "^1.1.7",
    "@radix-ui/react-navigation-menu": "^1.2.6",
    "@radix-ui/react-popover": "^1.1.7",
    "@radix-ui/react-progress": "^1.1.3",
    "@radix-ui/react-radio-group": "^1.2.4",
    "@radix-ui/react-scroll-area": "^1.2.4",
    "@radix-ui/react-select": "^2.1.7",
    "@radix-ui/react-separator": "^1.1.3",
    "@radix-ui/react-slider": "^1.2.4",
    "@radix-ui/react-slot": "^1.2.0",
    "@radix-ui/react-switch": "^1.1.4",
    "@radix-ui/react-tabs": "^1.1.4",
    "@radix-ui/react-toast": "^1.2.7",
    "@radix-ui/react-toggle": "^1.1.3",
    "@radix-ui/react-toggle-group": "^1.1.3",
    "@radix-ui/react-tooltip": "^1.2.0",
    "@tanstack/react-query": "^5.60.5",
    "chess.js": "^1.2.0",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "cmdk": "^1.1.1",
    "connect-pg-simple": "^10.0.0",
    "date-fns": "^3.6.0",
    "drizzle-orm": "^0.39.1",
    "drizzle-zod": "^0.7.0",
    "embla-carousel-react": "^8.6.0",
    "express": "^4.21.2",
    "express-session": "^1.18.1",
    "framer-motion": "^11.13.1",
    "input-otp": "^1.4.2",
    "lucide-react": "^0.453.0",
    "memorystore": "^1.6.7",
    "nanoid": "^5.1.5",
    "next-themes": "^0.4.6",
    "openai": "^4.103.0",
    "passport": "^0.7.0",
    "passport-local": "^1.0.0",
    "react": "^18.3.1",
    "react-day-picker": "^8.10.1",
    "react-dom": "^18.3.1",
    "react-hook-form": "^7.55.0",
    "react-icons": "^5.4.0",
    "react-resizable-panels": "^2.1.7",
    "recharts": "^2.15.2",
    "stockfish": "^16.0.0",
    "tailwind-merge": "^2.6.0",
    "tailwindcss-animate": "^1.0.7",
    "tw-animate-css": "^1.2.5",
    "vaul": "^1.1.2",
    "wouter": "^3.3.5",
    "ws": "^8.18.0",
    "zod": "^3.24.2",
    "zod-validation-error": "^3.4.0"
  },
  "devDependencies": {
    "@replit/vite-plugin-cartographer": "^0.2.5",
    "@replit/vite-plugin-runtime-error-modal": "^0.0.3",
    "@tailwindcss/typography": "^0.5.15",
    "@tailwindcss/vite": "^4.1.3",
    "@types/connect-pg-simple": "^7.0.3",
    "@types/express": "4.17.21",
    "@types/express-session": "^1.18.0",
    "@types/node": "20.16.11",
    "@types/passport": "^1.0.16",
    "@types/passport-local": "^1.0.38",
    "@types/react": "^18.3.11",
    "@types/react-dom": "^18.3.1",
    "@types/ws": "^8.5.13",
    "@vitejs/plugin-react": "^4.3.2",
    "autoprefixer": "^10.4.20",
    "drizzle-kit": "^0.30.4",
    "esbuild": "^0.25.0",
    "postcss": "^8.4.47",
    "tailwindcss": "^3.4.17",
    "tsx": "^4.19.1",
    "typescript": "5.6.3",
    "vite": "^5.4.14"
  },
  "optionalDependencies": {
    "bufferutil": "^4.0.8"
  }
}
```

## 2. tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./client/src/*"],
      "@shared/*": ["./shared/*"],
      "@assets/*": ["./attached_assets/*"]
    }
  },
  "include": ["client/src", "server", "shared"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

## 3. vite.config.ts

```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { cartographer } from "@replit/vite-plugin-cartographer";
import runtimeErrorModal from "@replit/vite-plugin-runtime-error-modal";

export default defineConfig({
  plugins: [
    react(),
    cartographer(),
    runtimeErrorModal()
  ],
  root: "client",
  build: {
    outDir: "../dist/public",
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./client/src"),
      "@shared": path.resolve(__dirname, "./shared"),
      "@assets": path.resolve(__dirname, "./attached_assets"),
    },
  },
  server: {
    proxy: {
      "/api": "http://localhost:5000",
    },
  },
});
```

## 4. tailwind.config.ts

```ts
import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: [
    "./client/index.html",
    "./client/src/**/*.{ts,tsx}",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
```

## 5. drizzle.config.ts

```ts
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./shared/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
```

## 6. postcss.config.js

```js
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

## 7. components.json

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "default",
  "rsc": false,
  "tsx": true,
  "tailwind": {
    "config": "tailwind.config.ts",
    "css": "client/src/index.css",
    "baseColor": "slate",
    "cssVariables": true,
    "prefix": ""
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils"
  }
}
```

## 8. shared/schema.ts

```ts
import { pgTable, serial, text, integer, timestamp, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  fideId: text("fide_id"),
  aicfId: text("aicf_id"),
  lichessId: text("lichess_id"),
  currentRating: integer("current_rating"),
  puzzleRating: integer("puzzle_rating"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const games = pgTable("games", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  whitePlayer: text("white_player").notNull(),
  blackPlayer: text("black_player").notNull(),
  whiteRating: integer("white_rating"),
  blackRating: integer("black_rating"),
  result: text("result").notNull(),
  opening: text("opening"),
  timeControl: text("time_control"),
  moves: text("moves").notNull(),
  pgn: text("pgn").notNull(),
  gameUrl: text("game_url"),
  playedAt: timestamp("played_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const puzzles = pgTable("puzzles", {
  id: serial("id").primaryKey(),
  fen: text("fen").notNull(),
  moves: text("moves").notNull(),
  rating: integer("rating").notNull(),
  themes: text("themes").array(),
  gameUrl: text("game_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const puzzleAttempts = pgTable("puzzle_attempts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  puzzleId: integer("puzzle_id").notNull(),
  solved: boolean("solved").notNull(),
  timeSpent: integer("time_spent"),
  attemptedAt: timestamp("attempted_at").defaultNow().notNull(),
});

export const playerStats = pgTable("player_stats", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  gamesPlayed: integer("games_played").default(0),
  wins: integer("wins").default(0),
  losses: integer("losses").default(0),
  draws: integer("draws").default(0),
  currentStreak: integer("current_streak").default(0),
  longestStreak: integer("longest_streak").default(0),
  averageRating: integer("average_rating"),
  puzzlesSolved: integer("puzzles_solved").default(0),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const openings = pgTable("openings", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  name: text("name").notNull(),
  eco: text("eco"),
  moves: text("moves").notNull(),
  gamesPlayed: integer("games_played").default(0),
  wins: integer("wins").default(0),
  losses: integer("losses").default(0),
  draws: integer("draws").default(0),
  averageRating: integer("average_rating"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const tournaments = pgTable("tournaments", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  name: text("name").notNull(),
  date: timestamp("date").notNull(),
  format: text("format").notNull(),
  timeControl: text("time_control"),
  players: integer("players"),
  userPosition: integer("user_position"),
  userScore: text("user_score"),
  userPerformance: integer("user_performance"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const tournamentParticipants = pgTable("tournament_participants", {
  id: serial("id").primaryKey(),
  tournamentId: integer("tournament_id").notNull(),
  playerName: text("player_name").notNull(),
  rating: integer("rating"),
  position: integer("position"),
  score: text("score"),
  performance: integer("performance"),
});

export const opponentEncounters = pgTable("opponent_encounters", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  opponentName: text("opponent_name").notNull(),
  gamesPlayed: integer("games_played").default(0),
  wins: integer("wins").default(0),
  losses: integer("losses").default(0),
  draws: integer("draws").default(0),
  lastPlayed: timestamp("last_played"),
  averageOpponentRating: integer("average_opponent_rating"),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertGameSchema = createInsertSchema(games).omit({
  id: true,
  createdAt: true,
});

export const insertPuzzleSchema = createInsertSchema(puzzles).omit({
  id: true,
  createdAt: true,
});

export const insertPuzzleAttemptSchema = createInsertSchema(puzzleAttempts).omit({
  id: true,
  attemptedAt: true,
});

export const insertPlayerStatsSchema = createInsertSchema(playerStats).omit({
  id: true,
  updatedAt: true,
});

export const insertOpeningSchema = createInsertSchema(openings).omit({
  id: true,
  createdAt: true,
});

export const insertTournamentSchema = createInsertSchema(tournaments).omit({
  id: true,
  createdAt: true,
});

export const insertTournamentParticipantSchema = createInsertSchema(tournamentParticipants).omit({
  id: true,
});

export const insertOpponentEncounterSchema = createInsertSchema(opponentEncounters).omit({
  id: true,
});

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Game = typeof games.$inferSelect;
export type InsertGame = z.infer<typeof insertGameSchema>;
export type Puzzle = typeof puzzles.$inferSelect;
export type InsertPuzzle = z.infer<typeof insertPuzzleSchema>;
export type PuzzleAttempt = typeof puzzleAttempts.$inferSelect;
export type InsertPuzzleAttempt = z.infer<typeof insertPuzzleAttemptSchema>;
export type PlayerStats = typeof playerStats.$inferSelect;
export type InsertPlayerStats = z.infer<typeof insertPlayerStatsSchema>;
export type Opening = typeof openings.$inferSelect;
export type InsertOpening = z.infer<typeof insertOpeningSchema>;
export type Tournament = typeof tournaments.$inferSelect;
export type InsertTournament = z.infer<typeof insertTournamentSchema>;
export type TournamentParticipant = typeof tournamentParticipants.$inferSelect;
export type InsertTournamentParticipant = z.infer<typeof insertTournamentParticipantSchema>;
export type OpponentEncounter = typeof opponentEncounters.$inferSelect;
export type InsertOpponentEncounter = z.infer<typeof insertOpponentEncounterSchema>;
```

## 9. server/index.ts

```ts
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    log(`Error ${status}: ${message}`);
    res.status(status).json({ message });
  });

  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const PORT = 5000;
  server.listen(PORT, "0.0.0.0", () => {
    log(`Server running on port ${PORT}`);
  });
})();
```

## 10. server/db.ts

```ts
import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle({ client: pool, schema });
```

## 11. server/storage.ts

```ts
import { 
  users, games, puzzles, puzzleAttempts, playerStats, openings, tournaments, tournamentParticipants, opponentEncounters,
  type User, type InsertUser, type Game, type InsertGame, 
  type Puzzle, type InsertPuzzle, type PuzzleAttempt, type InsertPuzzleAttempt,
  type PlayerStats, type InsertPlayerStats, type Opening, type InsertOpening,
  type Tournament, type InsertTournament, type TournamentParticipant, type InsertTournamentParticipant,
  type OpponentEncounter, type InsertOpponentEncounter
} from "@shared/schema";

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, updates: Partial<User>): Promise<User>;

  // Game methods
  getGame(id: number): Promise<Game | undefined>;
  getGamesByUser(userId: number): Promise<Game[]>;
  createGame(game: InsertGame): Promise<Game>;
  deleteGame(id: number): Promise<boolean>;

  // Puzzle methods
  getPuzzle(id: number): Promise<Puzzle | undefined>;
  getPuzzlesByTheme(theme: string): Promise<Puzzle[]>;
  getPuzzlesByDifficulty(difficulty: number): Promise<Puzzle[]>;
  getRandomPuzzle(): Promise<Puzzle | undefined>;
  createPuzzle(puzzle: InsertPuzzle): Promise<Puzzle>;

  // Puzzle attempt methods
  createPuzzleAttempt(attempt: InsertPuzzleAttempt): Promise<PuzzleAttempt>;
  getPuzzleAttemptsByUser(userId: number): Promise<PuzzleAttempt[]>;

  // Player stats methods
  getPlayerStats(userId: number): Promise<PlayerStats | undefined>;
  createPlayerStats(stats: InsertPlayerStats): Promise<PlayerStats>;
  updatePlayerStats(userId: number, updates: Partial<PlayerStats>): Promise<PlayerStats>;

  // Opening methods
  getOpeningsByUser(userId: number): Promise<Opening[]>;
  createOpening(opening: InsertOpening): Promise<Opening>;
  updateOpening(id: number, updates: Partial<Opening>): Promise<Opening>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User> = new Map();
  private games: Map<number, Game> = new Map();
  private puzzles: Map<number, Puzzle> = new Map();
  private puzzleAttempts: Map<number, PuzzleAttempt> = new Map();
  private playerStats: Map<number, PlayerStats> = new Map();
  private openings: Map<number, Opening> = new Map();

  private currentUserId = 1;
  private currentGameId = 1;
  private currentPuzzleId = 1;
  private currentAttemptId = 1;
  private currentStatsId = 1;
  private currentOpeningId = 1;

  constructor() {
    this.initializeData();
  }

  private initializeData() {
    const user: User = {
      id: 1,
      username: "ChessPlayer2023",
      email: "player@chess.com",
      fideId: "12345678",
      aicfId: "AI123456",
      lichessId: "chessplayer2023",
      currentRating: 1850,
      puzzleRating: 2100,
      createdAt: new Date(),
    };
    this.users.set(1, user);

    const stats: PlayerStats = {
      id: 1,
      userId: 1,
      gamesPlayed: 265,
      wins: 142,
      losses: 98,
      draws: 25,
      currentStreak: 5,
      longestStreak: 12,
      averageRating: 1850,
      puzzlesSolved: 1250,
      updatedAt: new Date(),
    };
    this.playerStats.set(1, stats);

    // Add sample games
    for (let i = 1; i <= 5; i++) {
      const game: Game = {
        id: i,
        userId: 1,
        whitePlayer: i % 2 === 1 ? "ChessPlayer2023" : `Opponent${i}`,
        blackPlayer: i % 2 === 0 ? "ChessPlayer2023" : `Opponent${i}`,
        whiteRating: 1800 + Math.floor(Math.random() * 200),
        blackRating: 1800 + Math.floor(Math.random() * 200),
        result: Math.random() > 0.5 ? "1-0" : Math.random() > 0.5 ? "0-1" : "1/2-1/2",
        opening: ["Sicilian Defense", "Queen's Gambit", "Ruy Lopez", "French Defense", "Caro-Kann"][i - 1],
        timeControl: "10+0",
        moves: "1.e4 c5 2.Nf3 d6 3.d4 cxd4 4.Nxd4",
        pgn: `[Event "Sample Game ${i}"]
[Site "Online"]
[Date "2024.12.29"]
[Round "${i}"]
[White "${i % 2 === 1 ? "ChessPlayer2023" : `Opponent${i}`}"]
[Black "${i % 2 === 0 ? "ChessPlayer2023" : `Opponent${i}`}"]
[Result "${Math.random() > 0.5 ? "1-0" : Math.random() > 0.5 ? "0-1" : "1/2-1/2"}"]

1.e4 c5 2.Nf3 d6 3.d4 cxd4 4.Nxd4`,
        gameUrl: `https://lichess.org/game${i}`,
        playedAt: new Date(Date.now() - i * 24 * 60 * 60 * 1000),
        createdAt: new Date(),
      };
      this.games.set(i, game);
    }
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    for (const user of this.users.values()) {
      if (user.username === username) {
        return user;
      }
    }
    return undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = ++this.currentUserId;
    const user: User = {
      ...insertUser,
      id,
      createdAt: new Date(),
    };
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: number, updates: Partial<User>): Promise<User> {
    const user = this.users.get(id);
    if (!user) {
      throw new Error("User not found");
    }
    const updatedUser = { ...user, ...updates };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async getGame(id: number): Promise<Game | undefined> {
    return this.games.get(id);
  }

  async getGamesByUser(userId: number): Promise<Game[]> {
    return Array.from(this.games.values()).filter(game => game.userId === userId);
  }

  async createGame(insertGame: InsertGame): Promise<Game> {
    const id = ++this.currentGameId;
    const game: Game = {
      ...insertGame,
      id,
      createdAt: new Date(),
    };
    this.games.set(id, game);
    return game;
  }

  async deleteGame(id: number): Promise<boolean> {
    return this.games.delete(id);
  }

  async getPuzzle(id: number): Promise<Puzzle | undefined> {
    return this.puzzles.get(id);
  }

  async getPuzzlesByTheme(theme: string): Promise<Puzzle[]> {
    return Array.from(this.puzzles.values()).filter(puzzle => 
      puzzle.themes?.includes(theme)
    );
  }

  async getPuzzlesByDifficulty(difficulty: number): Promise<Puzzle[]> {
    const range = 100;
    return Array.from(this.puzzles.values()).filter(puzzle => 
      Math.abs(puzzle.rating - difficulty) <= range
    );
  }

  async getRandomPuzzle(): Promise<Puzzle | undefined> {
    const puzzles = Array.from(this.puzzles.values());
    if (puzzles.length === 0) return undefined;
    return puzzles[Math.floor(Math.random() * puzzles.length)];
  }

  async createPuzzle(insertPuzzle: InsertPuzzle): Promise<Puzzle> {
    const id = ++this.currentPuzzleId;
    const puzzle: Puzzle = { ...insertPuzzle, id };
    this.puzzles.set(id, puzzle);
    return puzzle;
  }

  async createPuzzleAttempt(insertAttempt: InsertPuzzleAttempt): Promise<PuzzleAttempt> {
    const id = ++this.currentAttemptId;
    const attempt: PuzzleAttempt = {
      ...insertAttempt,
      id,
      attemptedAt: new Date(),
    };
    this.puzzleAttempts.set(id, attempt);
    return attempt;
  }

  async getPuzzleAttemptsByUser(userId: number): Promise<PuzzleAttempt[]> {
    return Array.from(this.puzzleAttempts.values()).filter(attempt => attempt.userId === userId);
  }

  async getPlayerStats(userId: number): Promise<PlayerStats | undefined> {
    for (const stats of this.playerStats.values()) {
      if (stats.userId === userId) {
        return stats;
      }
    }
    return undefined;
  }

  async createPlayerStats(insertStats: InsertPlayerStats): Promise<PlayerStats> {
    const id = ++this.currentStatsId;
    const stats: PlayerStats = { ...insertStats, id };
    this.playerStats.set(id, stats);
    return stats;
  }

  async updatePlayerStats(userId: number, updates: Partial<PlayerStats>): Promise<PlayerStats> {
    for (const [id, stats] of this.playerStats.entries()) {
      if (stats.userId === userId) {
        const updatedStats = { ...stats, ...updates, updatedAt: new Date() };
        this.playerStats.set(id, updatedStats);
        return updatedStats;
      }
    }
    throw new Error("Player stats not found");
  }

  async getOpeningsByUser(userId: number): Promise<Opening[]> {
    return Array.from(this.openings.values()).filter(opening => opening.userId === userId);
  }

  async createOpening(insertOpening: InsertOpening): Promise<Opening> {
    const id = ++this.currentOpeningId;
    const opening: Opening = { ...insertOpening, id };
    this.openings.set(id, opening);
    return opening;
  }

  async updateOpening(id: number, updates: Partial<Opening>): Promise<Opening> {
    const opening = this.openings.get(id);
    if (!opening) {
      throw new Error("Opening not found");
    }
    const updatedOpening = { ...opening, ...updates };
    this.openings.set(id, updatedOpening);
    return updatedOpening;
  }
}

export const storage = new MemStorage();
```

## 12. server/vite.ts

```ts
import fs from "fs";
import { createServer as createViteServer } from "vite";
import type { Express } from "express";
import { Server } from "http";

export function log(message: string, source = "express") {
  const time = new Date().toLocaleTimeString("en-US", { hour12: false });
  console.log(`${time} [${source}] ${message}`);
}

export async function setupVite(app: Express, server: Server) {
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: "custom",
  });

  app.use(vite.ssrFixStacktrace);
  app.use(vite.middlewares);

  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    try {
      const template = fs.readFileSync("client/index.html", "utf-8");
      const html = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(html);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  app.use(express.static("dist/public"));
  app.get("*", (_req, res) => {
    res.sendFile(path.resolve("dist/public/index.html"));
  });
}
```

## 13. client/index.html

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1" />
    <title>EduChessClub - Chess Analysis Platform</title>
    <meta name="description" content="Comprehensive chess platform for tournament players featuring opponent analysis, game database, and advanced position evaluation." />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

## 14. client/src/main.tsx

```tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "./App";
import "./index.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: async ({ queryKey, signal }) => {
        const response = await fetch(queryKey[0] as string, {
          signal,
          credentials: "include",
        });

        if (!response.ok) {
          if (response.status >= 500) {
            throw new Error(`Server error: ${response.status}`);
          }

          if (response.status === 404) {
            throw new Error("Not found");
          }

          if (response.status === 401) {
            throw new Error("Unauthorized");
          }

          throw new Error(`HTTP error: ${response.status}`);
        }

        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          return response.json();
        }

        return response.text();
      },
    },
  },
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>
);
```

## 15. client/src/App.tsx

```tsx
import { Router, Route, Switch } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import Navigation from "@/components/Navigation";
import Home from "@/pages/Home";
import OpponentScout from "@/pages/OpponentScout";
import GamesDatabase from "@/pages/GamesDatabase";
import LearnChess from "@/pages/LearnChess";
import Account from "@/pages/Account";
import PlayerProfile from "@/pages/PlayerProfile";
import GameAnalysisEnhanced from "@/pages/GameAnalysisEnhanced";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/opponent-scout" component={OpponentScout} />
      <Route path="/games" component={GamesDatabase} />
      <Route path="/learn" component={LearnChess} />
      <Route path="/account" component={Account} />
      <Route path="/profile" component={PlayerProfile} />
      <Route path="/analysis" component={GameAnalysisEnhanced} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <div className="min-h-screen bg-background font-sans antialiased">
      <Navigation />
      <main className="flex-1">
        <Router />
      </main>
      <Toaster />
    </div>
  );
}

export default App;
```

## 16. client/src/index.css

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --card: 0 0% 100%;
    --card-foreground: 222.2 84% 4.9%;
    --popover: 0 0% 100%;
    --popover-foreground: 222.2 84% 4.9%;
    --primary: 222.2 47.4% 11.2%;
    --primary-foreground: 210 40% 98%;
    --secondary: 210 40% 96%;
    --secondary-foreground: 222.2 84% 4.9%;
    --muted: 210 40% 96%;
    --muted-foreground: 215.4 16.3% 46.9%;
    --accent: 210 40% 96%;
    --accent-foreground: 222.2 84% 4.9%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 210 40% 98%;
    --border: 214.3 31.8% 91.4%;
    --input: 214.3 31.8% 91.4%;
    --ring: 222.2 84% 4.9%;
    --radius: 0.5rem;
    --chart-1: 12 76% 61%;
    --chart-2: 173 58% 39%;
    --chart-3: 197 37% 24%;
    --chart-4: 43 74% 66%;
    --chart-5: 27 87% 67%;
  }

  .dark {
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
    --card: 222.2 84% 4.9%;
    --card-foreground: 210 40% 98%;
    --popover: 222.2 84% 4.9%;
    --popover-foreground: 210 40% 98%;
    --primary: 210 40% 98%;
    --primary-foreground: 222.2 47.4% 11.2%;
    --secondary: 217.2 32.6% 17.5%;
    --secondary-foreground: 210 40% 98%;
    --muted: 217.2 32.6% 17.5%;
    --muted-foreground: 215 20.2% 65.1%;
    --accent: 217.2 32.6% 17.5%;
    --accent-foreground: 210 40% 98%;
    --destructive: 0 62.8% 30.6%;
    --destructive-foreground: 210 40% 98%;
    --border: 217.2 32.6% 17.5%;
    --input: 217.2 32.6% 17.5%;
    --ring: 212.7 26.8% 83.9%;
    --chart-1: 220 70% 50%;
    --chart-2: 160 60% 45%;
    --chart-3: 30 80% 55%;
    --chart-4: 280 65% 60%;
    --chart-5: 340 75% 55%;
  }
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
  }
}

/* Chess board styling */
.chess-square {
  @apply aspect-square flex items-center justify-center text-2xl font-semibold cursor-pointer transition-colors;
}

.chess-square.light {
  @apply bg-amber-100 text-amber-900;
}

.chess-square.dark {
  @apply bg-amber-800 text-amber-100;
}

.chess-square.selected {
  @apply ring-2 ring-blue-500 ring-inset;
}

.chess-square.highlighted {
  @apply bg-green-400 bg-opacity-50;
}

.chess-square.last-move {
  @apply bg-yellow-300 bg-opacity-60;
}

/* Animation classes */
.fade-in {
  animation: fadeIn 0.3s ease-in;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.slide-up {
  animation: slideUp 0.3s ease-out;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Loading spinner */
.loading-spinner {
  @apply animate-spin rounded-full border-2 border-gray-200 border-t-blue-600;
}

/* Chess piece styling */
.chess-piece {
  @apply select-none cursor-grab active:cursor-grabbing;
}

/* Responsive design helpers */
@media (max-width: 768px) {
  .chess-board {
    @apply max-w-sm;
  }
}
```