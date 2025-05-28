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
  getUserForLogin(username: string): Promise<User | undefined>;
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

    // Add sample games to showcase analysis features
    const sampleGames = [
      {
        id: this.currentGameId++,
        userId: 1,
        whitePlayer: "ChessPlayer2023",
        blackPlayer: "IM Patel (2234)",
        result: "1-0",
        opening: "Sicilian Defense, Najdorf Variation",
        timeControl: "90+30",
        pgn: `1.e4 c5 2.Nf3 d6 3.d4 cxd4 4.Nxd4 Nf6 5.Nc3 a6 6.Be3 e6 7.f3 b5 8.Qd2 Bb7 9.O-O-O Nbd7 10.h4 Rc8 11.Kb1 Be7 12.g4 h6 13.h5 Qc7 14.Bh3 Nc5 15.f4 Nfd7 16.g5 hxg5 17.fxg5 Bxg5 18.Qf2 Bxe3 19.Qxe3 f6 20.Nf5 exf5 21.exf5 Ne5 22.Nd5 Bxd5 23.Rxd5 Qc6 24.Rd4 Rc7 25.Re1 Kf7 26.Qg3 Re8 27.Bg4 Nxg4 28.Rxg4 Re5 29.h6 Rxf5 30.hxg7 Rxg7 31.Qh4 1-0`,
        moves: ["e4", "c5", "Nf3", "d6", "d4", "cxd4", "Nxd4", "Nf6", "Nc3", "a6", "Be3", "e6"],
        gameSource: "offline",
        tournamentName: "Mumbai Open 2024",
        date: new Date("2024-01-20"),
        analysisData: {
          accuracy: { white: 89, black: 72 },
          blunders: { white: 0, black: 2 },
          mistakes: { white: 1, black: 4 },
          bestMoves: { white: 12, black: 6 }
        },
        uploadedAt: new Date("2024-01-21")
      },
      {
        id: this.currentGameId++,
        userId: 1,
        whitePlayer: "FM Singh (2187)",
        blackPlayer: "ChessPlayer2023",
        result: "1-0",
        opening: "Queen's Gambit Declined",
        timeControl: "90+30",
        pgn: `1.d4 d5 2.c4 e6 3.Nc3 Nf6 4.cxd5 exd5 5.Bg5 Be7 6.e3 O-O 7.Bd3 Nbd7 8.Qc2 h6 9.Bh4 Re8 10.Nge2 c6 11.O-O Nf8 12.f3 Be6 13.Rad1 Qd7 14.Bg3 Red8 15.Kh1 Rac8 16.Ng1 Nh5 17.Bf2 Nhg6 18.Nge2 Bf5 19.Bxf5 Qxf5 20.Qxf5 Nxf5 21.g3 Ngh4 22.Kg2 g6 23.Rd2 Kg7 24.Rfd1 Rc7 25.Ne4 dxe4 26.fxe4 Nxe3+ 27.Bxe3 Rxd2+ 28.Rxd2 Nf3 29.Rd3 Nxd4 30.Bxd4+ f6 31.Rd1 1-0`,
        moves: ["d4", "d5", "c4", "e6", "Nc3", "Nf6", "cxd5", "exd5", "Bg5", "Be7"],
        gameSource: "offline",
        tournamentName: "Delhi Championship 2023",
        date: new Date("2023-12-05"),
        analysisData: {
          accuracy: { white: 94, black: 64 },
          blunders: { white: 0, black: 3 },
          mistakes: { white: 0, black: 6 },
          bestMoves: { white: 18, black: 4 }
        },
        uploadedAt: new Date("2023-12-06")
      },
      {
        id: this.currentGameId++,
        userId: 1,
        whitePlayer: "ChessPlayer2023",
        blackPlayer: "Sharma (1945)",
        result: "1-0",
        opening: "Italian Game",
        timeControl: "15+10",
        pgn: `1.e4 e5 2.Nf3 Nc6 3.Bc4 Bc5 4.c3 Nf6 5.d4 exd4 6.cxd4 Bb4+ 7.Bd2 Bxd2+ 8.Nbxd2 d5 9.exd5 Nxd5 10.Qb3 Na5 11.Qa4+ Nc6 12.Qb3 Na5 13.Qa4+ c6 14.Bb5 Qd6 15.Ne4 Qf4 16.Ng3 O-O 17.O-O Bg4 18.Bxc6 Nxc6 19.Qxg4 Qxg4 20.h3 Qh4 21.Nh5 g6 22.Nf4 Nxf4 23.Ng5 Qf6 24.Nxf7 Rxf7 25.Rfe1 Re8 26.Rxe8+ Qxe8 27.g3 Ne2+ 28.Kg2 Qe4+ 29.f3 Qe3 30.Rf1 Qe2+ 31.Rf2 Qe1 32.g4 h5 33.gxh5 gxh5 34.Kh2 1-0`,
        moves: ["e4", "e5", "Nf3", "Nc6", "Bc4", "Bc5", "c3", "Nf6", "d4", "exd4"],
        gameSource: "online",
        tournamentName: null,
        date: new Date("2024-01-15"),
        analysisData: {
          accuracy: { white: 87, black: 71 },
          blunders: { white: 0, black: 1 },
          mistakes: { white: 2, black: 3 },
          bestMoves: { white: 15, black: 8 }
        },
        uploadedAt: new Date("2024-01-15")
      }
    ];

    sampleGames.forEach(gameData => {
      const game: Game = {
        ...gameData,
        opening: gameData.opening,
        timeControl: gameData.timeControl,
        tournamentName: gameData.tournamentName,
        analysisData: gameData.analysisData
      };
      this.games.set(game.id, game);
    });
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.username === username);
  }

  async getUserForLogin(username: string): Promise<User | undefined> {
    // This method returns the user with password for login verification
    return Array.from(this.users.values()).find(user => user.username === username);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = {
      ...insertUser,
      id,
      phoneNumber: insertUser.phoneNumber || null,
      fideId: insertUser.fideId || null,
      aicfId: insertUser.aicfId || null,
      currentRating: insertUser.currentRating || 1200,
      puzzleRating: insertUser.puzzleRating || 1200,
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
