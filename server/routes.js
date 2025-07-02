import { createServer } from "http";
import { storage } from "./storage.js";
import { LichessService, ChessAnalyzer } from "./lichess.js";

export async function registerRoutes(app) {
  // Initialize Lichess service
  const lichessService = new LichessService(process.env.LICHESS_API_TOKEN || '');
  const chessAnalyzer = new ChessAnalyzer();

  // Helper function to analyze openings
  function analyzeOpenings(games, username) {
    const openings = games.reduce((acc, game) => {
      // Only analyze games with valid opening data
      if (!game.opening || game.opening === 'Unknown' || !game.opening.trim()) {
        return acc;
      }
      
      const opening = game.opening.trim();
      if (!acc[opening]) {
        acc[opening] = { games: 0, wins: 0, losses: 0, draws: 0 };
      }
      acc[opening].games++;
      
      const isWhite = game.whitePlayer.toLowerCase() === username.toLowerCase();
      if ((isWhite && game.result === '1-0') || (!isWhite && game.result === '0-1')) {
        acc[opening].wins++;
      } else if ((isWhite && game.result === '0-1') || (!isWhite && game.result === '1-0')) {
        acc[opening].losses++;
      } else if (game.result === '1/2-1/2') {
        acc[opening].draws++;
      }
      
      return acc;
    }, {});

    // Convert to the format expected by the frontend
    const repertoire = {};
    Object.entries(openings)
      .filter(([name, stats]) => stats.games >= 2) // Only include openings with at least 2 games
      .forEach(([name, stats]) => {
        repertoire[name] = {
          games: stats.games,
          winRate: stats.wins / stats.games, // Return as decimal (0-1), not percentage
          wins: stats.wins,
          losses: stats.losses,
          draws: stats.draws
        };
      });

    return repertoire;
  }

  // Add FEN evaluation route for chess engine
  app.post("/api/evaluate", async (req, res) => {
    try {
      const { fen } = req.body;
      
      if (!fen) {
        return res.status(400).json({ error: "FEN position is required" });
      }

      // Placeholder for Stockfish integration - you can add the engine here
      const evaluation = {
        evaluation: 0.0,
        bestMove: null,
        depth: 0,
        nodes: 0,
        time: 0,
        pv: [],
        mate: null
      };
      
      res.json(evaluation);
    } catch (error) {
      console.error("Error evaluating position:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // User routes
  app.get("/api/user/:id", async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(user);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/users", async (req, res) => {
    try {
      const userData = req.body;
      const user = await storage.createUser(userData);
      res.status(201).json(user);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Game routes
  app.get("/api/games/user/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const games = await storage.getGamesByUser(userId);
      res.json(games);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/games", async (req, res) => {
    try {
      const gameData = req.body;
      const game = await storage.createGame(gameData);
      res.status(201).json(game);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Puzzle routes
  app.get("/api/puzzles/random", async (req, res) => {
    try {
      const puzzle = await storage.getRandomPuzzle();
      if (!puzzle) {
        return res.status(404).json({ message: "No puzzles available" });
      }
      res.json(puzzle);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/puzzles/theme/:theme", async (req, res) => {
    try {
      const theme = req.params.theme;
      const puzzles = await storage.getPuzzlesByTheme(theme);
      res.json(puzzles);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/puzzle-attempts", async (req, res) => {
    try {
      const attemptData = req.body;
      const attempt = await storage.createPuzzleAttempt(attemptData);
      res.status(201).json(attempt);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Player stats routes
  app.get("/api/player-stats/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const stats = await storage.getPlayerStats(userId);
      if (!stats) {
        return res.status(404).json({ message: "Player stats not found" });
      }
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Lichess integration routes
  app.get("/api/lichess/user/:username", async (req, res) => {
    try {
      const username = req.params.username;
      const profile = await lichessService.getUserProfile(username);
      res.json(profile);
    } catch (error) {
      console.error("Error fetching Lichess profile:", error);
      res.status(500).json({ error: "Failed to fetch Lichess profile" });
    }
  });

  app.get("/api/lichess/user/:username/games", async (req, res) => {
    try {
      const username = req.params.username;
      const maxGames = parseInt(req.query.max) || 50;
      
      const games = await lichessService.getUserGames(username, maxGames);
      const openingRepertoire = analyzeOpenings(games, username);
      
      // Analyze games for tactical insights
      const tacticalAnalysis = games.map(game => {
        const analysis = chessAnalyzer.analyzeGame(game.moves, username, game.whitePlayer.toLowerCase() === username.toLowerCase());
        return {
          gameId: game.id,
          ...analysis
        };
      });

      res.json({
        games,
        openingRepertoire,
        tacticalAnalysis,
        totalGames: games.length,
        ratingByFormat: {
          bullet: 0, // Will be populated from actual profile data
          blitz: 0,
          rapid: 0,
          classical: 0
        }
      });
    } catch (error) {
      console.error("Error fetching Lichess games:", error);
      res.status(500).json({ error: "Failed to fetch Lichess games" });
    }
  });

  // Search routes
  app.get("/api/search/opponents", async (req, res) => {
    try {
      const query = req.query.q;
      if (!query) {
        return res.json([]);
      }

      // For now, return mock search results - in a real app you'd search your database
      const results = [
        { id: 1, username: query, lichessId: query, currentRating: null }
      ];
      
      res.json(results);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  const server = createServer(app);
  return server;
}