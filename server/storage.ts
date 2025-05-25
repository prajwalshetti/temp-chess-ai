import { 
  users, games, puzzles, puzzleAttempts, playerStats, openings,
  type User, type InsertUser, type Game, type InsertGame, 
  type Puzzle, type InsertPuzzle, type PuzzleAttempt, type InsertPuzzleAttempt,
  type PlayerStats, type InsertPlayerStats, type Opening, type InsertOpening
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
    // Create sample user
    const user: User = {
      id: 1,
      username: "ChessPlayer2023",
      email: "player@chess.com",
      fideId: "2345678",
      aicfId: "IN123456",
      lichessId: "chessplayer2023",
      currentRating: 1847,
      puzzleRating: 1654,
      createdAt: new Date(),
    };
    this.users.set(1, user);
    this.currentUserId = 2;

    // Create sample puzzles
    const samplePuzzles: Puzzle[] = [
      {
        id: 1,
        fen: "r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/3P1N2/PPP2PPP/RNBQK2R w KQkq - 0 4",
        moves: ["Ng5", "d6", "Nxf7"],
        theme: "Fork",
        difficulty: 3,
        description: "White to play and win material",
        solution: "Ng5 attacks the queen and threatens Nxf7 fork"
      },
      {
        id: 2,
        fen: "r2qkb1r/ppp2ppp/2n1bn2/3pp3/3PP3/2N2N2/PPP2PPP/R1BQKB1R w KQkq - 0 6",
        moves: ["Bb5", "Bd7", "Bxc6"],
        theme: "Pin",
        difficulty: 2,
        description: "Find the winning tactic",
        solution: "Bb5 pins the knight to the king"
      }
    ];

    samplePuzzles.forEach(puzzle => {
      this.puzzles.set(puzzle.id, puzzle);
    });
    this.currentPuzzleId = 3;

    // Create sample player stats
    const stats: PlayerStats = {
      id: 1,
      userId: 1,
      gamesPlayed: 265,
      wins: 156,
      losses: 67,
      draws: 42,
      winsAsWhite: 84,
      winsAsBlack: 72,
      lossesAsWhite: 26,
      lossesAsBlack: 41,
      drawsAsWhite: 22,
      drawsAsBlack: 20,
      tacticalStrengths: {
        forks: 18,
        pins: 15,
        skewers: 12,
        backRank: 12
      },
      tacticalWeaknesses: {
        missedForks: 8,
        missedPins: 5,
        discoveryAttacks: 5,
        endgamePrecision: 11
      }
    };
    this.playerStats.set(1, stats);
    this.currentStatsId = 2;

    // Create sample openings
    const sampleOpenings: Opening[] = [
      {
        id: 1,
        userId: 1,
        name: "Italian Game",
        moves: "1.e4 e5 2.Nf3 Nc6 3.Bc4",
        color: "white",
        gamesPlayed: 24,
        wins: 16,
        losses: 5,
        draws: 3
      },
      {
        id: 2,
        userId: 1,
        name: "Sicilian Defense",
        moves: "1.e4 c5",
        color: "black",
        gamesPlayed: 31,
        wins: 18,
        losses: 8,
        draws: 5
      }
    ];

    sampleOpenings.forEach(opening => {
      this.openings.set(opening.id, opening);
    });
    this.currentOpeningId = 3;
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.username === username);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
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
    if (!user) throw new Error("User not found");
    
    const updatedUser = { ...user, ...updates };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  // Game methods
  async getGame(id: number): Promise<Game | undefined> {
    return this.games.get(id);
  }

  async getGamesByUser(userId: number): Promise<Game[]> {
    return Array.from(this.games.values()).filter(game => game.userId === userId);
  }

  async createGame(insertGame: InsertGame): Promise<Game> {
    const id = this.currentGameId++;
    const game: Game = {
      ...insertGame,
      id,
      uploadedAt: new Date(),
    };
    this.games.set(id, game);
    return game;
  }

  async deleteGame(id: number): Promise<boolean> {
    return this.games.delete(id);
  }

  // Puzzle methods
  async getPuzzle(id: number): Promise<Puzzle | undefined> {
    return this.puzzles.get(id);
  }

  async getPuzzlesByTheme(theme: string): Promise<Puzzle[]> {
    return Array.from(this.puzzles.values()).filter(puzzle => puzzle.theme === theme);
  }

  async getPuzzlesByDifficulty(difficulty: number): Promise<Puzzle[]> {
    return Array.from(this.puzzles.values()).filter(puzzle => puzzle.difficulty === difficulty);
  }

  async getRandomPuzzle(): Promise<Puzzle | undefined> {
    const puzzles = Array.from(this.puzzles.values());
    if (puzzles.length === 0) return undefined;
    return puzzles[Math.floor(Math.random() * puzzles.length)];
  }

  async createPuzzle(insertPuzzle: InsertPuzzle): Promise<Puzzle> {
    const id = this.currentPuzzleId++;
    const puzzle: Puzzle = { ...insertPuzzle, id };
    this.puzzles.set(id, puzzle);
    return puzzle;
  }

  // Puzzle attempt methods
  async createPuzzleAttempt(insertAttempt: InsertPuzzleAttempt): Promise<PuzzleAttempt> {
    const id = this.currentAttemptId++;
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

  // Player stats methods
  async getPlayerStats(userId: number): Promise<PlayerStats | undefined> {
    return Array.from(this.playerStats.values()).find(stats => stats.userId === userId);
  }

  async createPlayerStats(insertStats: InsertPlayerStats): Promise<PlayerStats> {
    const id = this.currentStatsId++;
    const stats: PlayerStats = { ...insertStats, id };
    this.playerStats.set(id, stats);
    return stats;
  }

  async updatePlayerStats(userId: number, updates: Partial<PlayerStats>): Promise<PlayerStats> {
    const stats = Array.from(this.playerStats.values()).find(s => s.userId === userId);
    if (!stats) throw new Error("Player stats not found");
    
    const updatedStats = { ...stats, ...updates };
    this.playerStats.set(stats.id, updatedStats);
    return updatedStats;
  }

  // Opening methods
  async getOpeningsByUser(userId: number): Promise<Opening[]> {
    return Array.from(this.openings.values()).filter(opening => opening.userId === userId);
  }

  async createOpening(insertOpening: InsertOpening): Promise<Opening> {
    const id = this.currentOpeningId++;
    const opening: Opening = { ...insertOpening, id };
    this.openings.set(id, opening);
    return opening;
  }

  async updateOpening(id: number, updates: Partial<Opening>): Promise<Opening> {
    const opening = this.openings.get(id);
    if (!opening) throw new Error("Opening not found");
    
    const updatedOpening = { ...opening, ...updates };
    this.openings.set(id, updatedOpening);
    return updatedOpening;
  }
}

export const storage = new MemStorage();
