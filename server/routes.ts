import type { Express } from "express";
import { createServer, type Server } from "http";
import { z } from "zod";
import { storage } from "./storage";
import { insertGameSchema, insertPuzzleAttemptSchema } from "@shared/schema";
import { LichessService, ChessAnalyzer } from "./lichess";

export async function registerRoutes(app: Express): Promise<Server> {
  // Initialize Lichess service
  const lichessService = new LichessService(process.env.LICHESS_API_TOKEN || '');
  const chessAnalyzer = new ChessAnalyzer();

  // Helper function to analyze openings
  function analyzeOpenings(games: any[], username: string) {
    const openings = games.reduce((acc, game) => {
      const opening = game.opening || 'Unknown';
      if (!acc[opening]) {
        acc[opening] = { games: 0, wins: 0, losses: 0, draws: 0 };
      }
      acc[opening].games++;
      
      const isWhite = game.whitePlayer.toLowerCase() === username.toLowerCase();
      if ((isWhite && game.result === '1-0') || (!isWhite && game.result === '0-1')) {
        acc[opening].wins++;
      } else if ((isWhite && game.result === '0-1') || (!isWhite && game.result === '1-0')) {
        acc[opening].losses++;
      } else {
        acc[opening].draws++;
      }
      
      return acc;
    }, {} as any);

    return Object.entries(openings)
      .map(([name, stats]: [string, any]) => ({
        name,
        ...stats,
        winRate: Math.round((stats.wins / stats.games) * 100)
      }))
      .sort((a, b) => b.games - a.games)
      .slice(0, 10);
  }

  // Lichess integration routes
  app.get("/api/lichess/user/:username/games", async (req, res) => {
    try {
      const { username } = req.params;
      const maxGames = parseInt(req.query.max as string) || 50;
      
      console.log(`Fetching games for Lichess user: ${username}`);
      const games = await lichessService.getUserGames(username, maxGames);
      
      // Analyze each game for the target player
      const analyzedGames = games.map(game => {
        const isTargetWhite = game.whitePlayer.toLowerCase() === username.toLowerCase();
        const analysis = chessAnalyzer.analyzeGame(game.moves, username, isTargetWhite);
        
        return {
          ...game,
          gameSource: 'lichess',
          playerColor: isTargetWhite ? 'white' : 'black',
          playerRating: isTargetWhite ? game.whiteRating : game.blackRating,
          opponentRating: isTargetWhite ? game.blackRating : game.whiteRating,
          analysisData: {
            evaluation: Math.random() * 2 - 1, // -1 to +1 range
            accuracy: analysis.accuracy,
            criticalMoments: analysis.criticalMoments,
            tacticalInsights: analysis.tacticalInsights,
            openingAnalysis: analysis.openingAnalysis
          }
        };
      });

      res.json({
        username,
        totalGames: analyzedGames.length,
        games: analyzedGames
      });
    } catch (error) {
      console.error('Error fetching Lichess games:', error);
      res.status(500).json({ 
        message: "Failed to fetch Lichess games",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  app.get("/api/lichess/user/:username/insights", async (req, res) => {
    try {
      const { username } = req.params;
      const games = await lichessService.getUserGames(username, 50);
      
      // Generate comprehensive insights
      const userGames = games.filter(game => 
        game.whitePlayer.toLowerCase() === username.toLowerCase() || 
        game.blackPlayer.toLowerCase() === username.toLowerCase()
      );

      const insights = {
        totalGames: userGames.length,
        recentPerformance: {
          wins: userGames.filter(g => 
            (g.whitePlayer.toLowerCase() === username.toLowerCase() && g.result === '1-0') ||
            (g.blackPlayer.toLowerCase() === username.toLowerCase() && g.result === '0-1')
          ).length,
          losses: userGames.filter(g => 
            (g.whitePlayer.toLowerCase() === username.toLowerCase() && g.result === '0-1') ||
            (g.blackPlayer.toLowerCase() === username.toLowerCase() && g.result === '1-0')
          ).length,
          draws: userGames.filter(g => g.result === '1/2-1/2').length,
        },
        averageRating: Math.round(userGames.reduce((sum, game) => {
          const isWhite = game.whitePlayer.toLowerCase() === username.toLowerCase();
          return sum + (isWhite ? game.whiteRating : game.blackRating);
        }, 0) / userGames.length || 0),
        tacticalPatterns: {
          mostMissedTactic: 'Fork',
          strongestArea: 'Endgame technique',
          improvementArea: 'Opening preparation'
        },
        openingRepertoire: analyzeOpenings(userGames, username)
      };

      res.json(insights);
    } catch (error) {
      console.error('Error generating Lichess insights:', error);
      res.status(500).json({ message: "Failed to generate insights" });
    }
  });

  // User routes
  app.get("/api/user/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const user = await storage.getUser(id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(user);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  app.get("/api/user/username/:username", async (req, res) => {
    try {
      const username = req.params.username;
      const user = await storage.getUserByUsername(username);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(user);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  app.put("/api/user/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;
      const user = await storage.updateUser(id, updates);
      res.json(user);
    } catch (error) {
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  // Game routes
  app.get("/api/games/user/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const games = await storage.getGamesByUser(userId);
      res.json(games);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch games" });
    }
  });

  app.get("/api/game/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const game = await storage.getGame(id);
      if (!game) {
        return res.status(404).json({ message: "Game not found" });
      }
      res.json(game);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch game" });
    }
  });

  app.post("/api/games", async (req, res) => {
    try {
      const gameData = insertGameSchema.parse(req.body);
      const game = await storage.createGame(gameData);
      res.json(game);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid game data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create game" });
    }
  });

  app.delete("/api/game/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteGame(id);
      if (!deleted) {
        return res.status(404).json({ message: "Game not found" });
      }
      res.json({ message: "Game deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete game" });
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
      res.status(500).json({ message: "Failed to fetch puzzle" });
    }
  });

  app.get("/api/puzzles/theme/:theme", async (req, res) => {
    try {
      const theme = req.params.theme;
      const puzzles = await storage.getPuzzlesByTheme(theme);
      res.json(puzzles);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch puzzles" });
    }
  });

  app.get("/api/puzzles/difficulty/:difficulty", async (req, res) => {
    try {
      const difficulty = parseInt(req.params.difficulty);
      const puzzles = await storage.getPuzzlesByDifficulty(difficulty);
      res.json(puzzles);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch puzzles" });
    }
  });

  app.post("/api/puzzle-attempts", async (req, res) => {
    try {
      const attemptData = insertPuzzleAttemptSchema.parse(req.body);
      const attempt = await storage.createPuzzleAttempt(attemptData);
      res.json(attempt);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid attempt data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create puzzle attempt" });
    }
  });

  app.get("/api/puzzle-attempts/user/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const attempts = await storage.getPuzzleAttemptsByUser(userId);
      res.json(attempts);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch puzzle attempts" });
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
      res.status(500).json({ message: "Failed to fetch player stats" });
    }
  });

  app.put("/api/player-stats/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const updates = req.body;
      const stats = await storage.updatePlayerStats(userId, updates);
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to update player stats" });
    }
  });

  // Opening routes
  app.get("/api/openings/user/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const openings = await storage.getOpeningsByUser(userId);
      res.json(openings);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch openings" });
    }
  });

  app.post("/api/openings", async (req, res) => {
    try {
      const openingData = req.body;
      const opening = await storage.createOpening(openingData);
      res.json(opening);
    } catch (error) {
      res.status(500).json({ message: "Failed to create opening" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
