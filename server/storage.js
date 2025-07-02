export class MemStorage {
  constructor() {
    this.users = new Map();
    this.games = new Map();
    this.puzzles = new Map();
    this.puzzleAttempts = new Map();
    this.playerStats = new Map();
    this.openings = new Map();

    this.currentUserId = 1;
    this.currentGameId = 1;
    this.currentPuzzleId = 1;
    this.currentAttemptId = 1;
    this.currentStatsId = 1;
    this.currentOpeningId = 1;

    this.initializeData();
  }

  initializeData() {
    // Create sample user
    const user = {
      id: 1,
      username: "ChessPlayer2023",
      email: "player@chess.com",
      fideId: null,
      aicfId: null,
      lichessId: "testplayer",
      currentRating: 1800,
      puzzleRating: 1650,
      createdAt: new Date()
    };
    this.users.set(1, user);

    // Create sample player stats
    const stats = {
      id: 1,
      userId: 1,
      gamesPlayed: 265,
      wins: 142,
      losses: 98,
      draws: 25,
      winRate: 53.6,
      averageRating: 1800,
      highestRating: 1897,
      currentStreak: 3,
      longestWinStreak: 8,
      puzzlesSolved: 1247,
      puzzleAccuracy: 87.2,
      averageGameLength: 32,
      preferredTimeControl: "10+0",
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.playerStats.set(1, stats);

    // Create sample games
    for (let i = 1; i <= 10; i++) {
      const game = {
        id: i,
        userId: 1,
        whitePlayer: i % 2 === 0 ? "ChessPlayer2023" : "Opponent" + i,
        blackPlayer: i % 2 === 0 ? "Opponent" + i : "ChessPlayer2023",
        whiteRating: 1800 + (i * 10),
        blackRating: 1780 + (i * 8),
        result: i % 3 === 0 ? "1-0" : i % 3 === 1 ? "0-1" : "1/2-1/2",
        opening: i % 4 === 0 ? "Italian Game" : i % 4 === 1 ? "Sicilian Defense" : i % 4 === 2 ? "Queen's Gambit" : "French Defense",
        timeControl: "10+0",
        moves: ["e4", "e5", "Nf3", "Nc6", "Bc4"],
        pgn: `1. e4 e5 2. Nf3 Nc6 3. Bc4 ${i % 2 === 0 ? "1-0" : "0-1"}`,
        createdAt: new Date(Date.now() - i * 24 * 60 * 60 * 1000),
        gameUrl: `https://lichess.org/game${i}`,
        source: "lichess",
        tournament: null
      };
      this.games.set(i, game);
    }

    // Create sample puzzles
    for (let i = 1; i <= 5; i++) {
      const puzzle = {
        id: i,
        fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
        moves: ["e2e4", "e7e5"],
        rating: 1200 + (i * 100),
        themes: ["endgame", "checkmate"],
        popularity: 85 + i,
        solution: "Qh5+ Kf8 Qf7#",
        createdAt: new Date()
      };
      this.puzzles.set(i, puzzle);
    }
  }

  // User methods
  async getUser(id) {
    return this.users.get(id);
  }

  async getUserByUsername(username) {
    for (const user of this.users.values()) {
      if (user.username === username) {
        return user;
      }
    }
    return undefined;
  }

  async createUser(insertUser) {
    const user = {
      ...insertUser,
      id: this.currentUserId++,
      createdAt: new Date()
    };
    this.users.set(user.id, user);
    return user;
  }

  async updateUser(id, updates) {
    const user = this.users.get(id);
    if (!user) throw new Error("User not found");
    
    const updatedUser = { ...user, ...updates };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  // Game methods
  async getGame(id) {
    return this.games.get(id);
  }

  async getGamesByUser(userId) {
    const userGames = Array.from(this.games.values()).filter(game => game.userId === userId);
    return userGames.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async createGame(insertGame) {
    const game = {
      ...insertGame, 
      id: this.currentGameId++,
      createdAt: new Date()
    };
    this.games.set(game.id, game);
    return game;
  }

  async deleteGame(id) {
    return this.games.delete(id);
  }

  // Puzzle methods
  async getPuzzle(id) {
    return this.puzzles.get(id);
  }

  async getPuzzlesByTheme(theme) {
    return Array.from(this.puzzles.values()).filter(puzzle => 
      puzzle.themes.includes(theme)
    );
  }

  async getPuzzlesByDifficulty(difficulty) {
    return Array.from(this.puzzles.values()).filter(puzzle => 
      Math.abs(puzzle.rating - difficulty) <= 100
    );
  }

  async getRandomPuzzle() {
    const puzzles = Array.from(this.puzzles.values());
    if (puzzles.length === 0) return undefined;
    return puzzles[Math.floor(Math.random() * puzzles.length)];
  }

  async createPuzzle(insertPuzzle) {
    const puzzle = { ...insertPuzzle, id: this.currentPuzzleId++ };
    this.puzzles.set(puzzle.id, puzzle);
    return puzzle;
  }

  // Puzzle attempt methods
  async createPuzzleAttempt(insertAttempt) {
    const attempt = {
      ...insertAttempt,
      id: this.currentAttemptId++,
      attemptedAt: new Date()
    };
    this.puzzleAttempts.set(attempt.id, attempt);
    return attempt;
  }

  async getPuzzleAttemptsByUser(userId) {
    return Array.from(this.puzzleAttempts.values()).filter(attempt => 
      attempt.userId === userId
    );
  }

  // Player stats methods
  async getPlayerStats(userId) {
    return this.playerStats.get(userId);
  }

  async createPlayerStats(insertStats) {
    const stats = { ...insertStats, id: this.currentStatsId++ };
    this.playerStats.set(stats.id, stats);
    return stats;
  }

  async updatePlayerStats(userId, updates) {
    const stats = Array.from(this.playerStats.values()).find(s => s.userId === userId);
    if (!stats) throw new Error("Player stats not found");
    
    const updatedStats = { ...stats, ...updates, updatedAt: new Date() };
    this.playerStats.set(stats.id, updatedStats);
    return updatedStats;
  }

  // Opening methods
  async getOpeningsByUser(userId) {
    return Array.from(this.openings.values()).filter(opening => 
      opening.userId === userId
    );
  }

  async createOpening(insertOpening) {
    const opening = { ...insertOpening, id: this.currentOpeningId++ };
    this.openings.set(opening.id, opening);
    return opening;
  }

  async updateOpening(id, updates) {
    const opening = this.openings.get(id);
    if (!opening) throw new Error("Opening not found");
    
    const updatedOpening = { ...opening, ...updates };
    this.openings.set(id, updatedOpening);
    return updatedOpening;
  }
}

export const storage = new MemStorage();