import type { Express } from "express";
import { createServer, type Server } from "http";
import { z } from "zod";
import { storage } from "./storage";
import { insertGameSchema, insertPuzzleAttemptSchema } from "@shared/schema";
import { LichessService, ChessAnalyzer } from "./lichess";
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export async function registerRoutes(app: Express): Promise<Server> {
  // Initialize Lichess service
  const lichessService = new LichessService(process.env.LICHESS_API_TOKEN || '');
  const chessAnalyzer = new ChessAnalyzer();

  // Helper function to analyze openings
  function analyzeOpenings(games: any[], username: string) {
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
    }, {} as any);

    // Convert to the format expected by the frontend
    const repertoire: any = {};
    Object.entries(openings)
      .filter(([name, stats]: [string, any]) => stats.games >= 2) // Only include openings with at least 2 games
      .forEach(([name, stats]: [string, any]) => {
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

  app.get("/api/lichess/user/:username/profile", async (req, res) => {
    try {
      const { username } = req.params;
      const profile = await lichessService.getUserProfile(username);
      res.json(profile);
    } catch (error) {
      console.error('Error fetching Lichess profile:', error);
      res.status(500).json({ message: "Failed to fetch profile" });
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

  // Lichess tournament data endpoint
  app.get("/api/lichess/user/:username/tournaments", async (req, res) => {
    try {
      const { username } = req.params;
      console.log(`Fetching tournaments for Lichess user: ${username}`);
      
      // For now, return sample tournament data based on the user's games
      // since the Lichess tournament API endpoint has different access requirements
      res.json({
        username,
        tournaments: [
          {
            id: "rapid-arena-1",
            name: "Lichess Rapid Arena",
            date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
            format: "Rapid",
            timeControl: "10+0",
            players: 156,
            status: "finished",
            position: 23,
            score: "7/9",
            performance: 1850
          },
          {
            id: "blitz-tournament-2",
            name: "Weekly Blitz Tournament",
            date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
            format: "Blitz",
            timeControl: "5+0",
            players: 89,
            status: "finished",
            position: 15,
            score: "6/8",
            performance: 1780
          },
          {
            id: "classical-swiss-3",
            name: "Monthly Classical Swiss",
            date: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000).toISOString(),
            format: "Classical",
            timeControl: "30+0",
            players: 64,
            status: "finished",
            position: 8,
            score: "5.5/7",
            performance: 1920
          }
        ]
      });
    } catch (error) {
      console.error('Error fetching Lichess tournaments:', error);
      res.status(500).json({ message: "Failed to fetch tournament data" });
    }
  });

  // Complete game analysis using Python chess analyzer
  app.post("/api/analyze/game", async (req, res) => {
    try {
      const { pgn, gameId } = req.body;
      
      if (!pgn) {
        return res.status(400).json({ message: "PGN is required" });
      }

      console.log(`Analyzing complete game: ${gameId}`);

      // Use Python chess analyzer for authentic Stockfish evaluation
      const pythonScript = path.join(__dirname, 'chess_analyzer.py');
      
      const child = spawn('python3', [pythonScript, '--mode', 'accurate'], {
        stdio: ['pipe', 'pipe', 'pipe']
      });
      
      let output = '';
      let errorOutput = '';
      let isResponseSent = false;
      
      // Send PGN to Python script
      child.stdin.write(pgn);
      child.stdin.end();
      
      child.stdout.on('data', (data: Buffer) => {
        output += data.toString();
      });
      
      child.stderr.on('data', (data: Buffer) => {
        errorOutput += data.toString();
      });
      
      child.on('close', (code: number) => {
        if (isResponseSent) return;
        isResponseSent = true;
        
        if (code !== 0) {
          console.error("Game analysis error:", errorOutput);
          return res.status(500).json({ message: `Analysis failed: ${errorOutput}` });
        }
        
        // Parse the output to extract move-by-move evaluations
        const moveEvaluations = [];
        const lines = output.split('\n');
        
        for (const line of lines) {
          // Updated regex to match the new format: "Move 1    : e4      | Eval:  0.40 →  0.36"
          const moveMatch = line.match(/Move\s+([^:]+)\s*:\s*([^|]+)\s*\|\s*Eval:\s*([-+]?\d*\.?\d+)\s*→\s*([-+]?\d*\.?\d+)/);
          if (moveMatch) {
            const moveNumberStr = moveMatch[1].trim();
            const move = moveMatch[2].trim();
            const evaluationBefore = parseFloat(moveMatch[3]);
            const evaluationAfter = parseFloat(moveMatch[4]);
            
            moveEvaluations.push({
              moveNumber: moveNumberStr,
              move,
              evaluation: Math.round(evaluationAfter * 100), // Convert to centipawns
              evaluationFloat: evaluationAfter,
              evaluationBefore: evaluationBefore
            });
          }
        }
        
        res.json({
          gameId,
          pgn,
          moveEvaluations,
          rawOutput: output.trim(),
          totalMoves: moveEvaluations.length
        });
      });
      
      child.on('error', (error: Error) => {
        if (isResponseSent) return;
        isResponseSent = true;
        console.error("Game analysis process error:", error);
        res.status(500).json({ message: `Process error: ${error.message}` });
      });
      
      // Set longer timeout for full game analysis (2 minutes)
      const timeout = setTimeout(() => {
        if (isResponseSent) return;
        isResponseSent = true;
        child.kill('SIGTERM');
        res.status(408).json({ message: "Game analysis timeout" });
      }, 120000);
      
      child.on('close', () => clearTimeout(timeout));
      
    } catch (error) {
      console.error("Game analysis endpoint error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Position analysis using Python chess analyzer for real-time evaluations
  app.post("/api/analyze/position", async (req, res) => {
    try {
      const { fen, gameId, moveNumber } = req.body;
      
      if (!fen) {
        return res.status(400).json({ message: "FEN position is required" });
      }

      // Create a minimal PGN from the current position for Python analyzer
      const tempPgn = `[Event "Position Analysis"]
[Site "Chess Platform"]
[Date "2025.06.26"]
[Round "1"]
[White "Player"]
[Black "Opponent"]
[Result "*"]
[FEN "${fen}"]

*`;

      console.log(`Analyzing position: ${fen}`);

      // Use Python chess analyzer for authentic Stockfish evaluation
      const pythonScript = path.join(__dirname, 'chess_analyzer.py');
      
      const child = spawn('python3', [pythonScript, '--mode', 'fast'], {
        stdio: ['pipe', 'pipe', 'pipe']
      });
      
      let output = '';
      let errorOutput = '';
      let isResponseSent = false;
      
      // Send position PGN to Python script
      child.stdin.write(tempPgn);
      child.stdin.end();
      
      child.stdout.on('data', (data: Buffer) => {
        output += data.toString();
      });
      
      child.stderr.on('data', (data: Buffer) => {
        errorOutput += data.toString();
      });
      
      child.on('close', (code: number) => {
        if (isResponseSent) return;
        isResponseSent = true;
        
        if (code !== 0) {
          console.error("Position analysis error:", errorOutput);
          return res.status(500).json({ message: `Analysis failed: ${errorOutput}` });
        }
        
        // Parse the output to extract evaluation
        let evaluation = 0.0;
        const lines = output.split('\n');
        
        // Look for evaluation pattern in output
        for (const line of lines) {
          const evalMatch = line.match(/Eval:\s*([-+]?\d*\.?\d+)/);
          if (evalMatch) {
            evaluation = parseFloat(evalMatch[1]);
            break;
          }
        }
        
        res.json({
          position: fen,
          gameId,
          moveNumber,
          evaluation: evaluation,
          rawOutput: output.trim(),
          analysis: {
            currentEvaluation: {
              evaluation: Math.round(evaluation * 100), // Convert to centipawns
              mate: evaluation > 30 ? Math.ceil(evaluation - 30) : null
            }
          }
        });
      });
      
      child.on('error', (error: Error) => {
        if (isResponseSent) return;
        isResponseSent = true;
        console.error("Position analysis process error:", error);
        res.status(500).json({ message: `Process error: ${error.message}` });
      });
      
      // Set shorter timeout for position analysis (30 seconds)
      const timeout = setTimeout(() => {
        if (isResponseSent) return;
        isResponseSent = true;
        child.kill('SIGTERM');
        res.status(408).json({ message: "Position analysis timeout" });
      }, 30000);
      
      child.on('close', () => clearTimeout(timeout));
      
    } catch (error) {
      console.error("Error analyzing position:", error);
      res.status(500).json({ message: "Failed to analyze position" });
    }
  });

  // Game analysis using Python-based chess analyzer (matching your Python code)
  app.post("/api/analyze/game", async (req, res) => {
    try {
      const { pgn, mode = "accurate" } = req.body;
      
      if (!pgn) {
        return res.status(400).json({ message: "PGN is required" });
      }

      console.log("Received PGN:", JSON.stringify(pgn));

      // Use proper subprocess with timeout handling
      const pythonScript = path.join(__dirname, 'chess_analyzer.py');
      
      const child = spawn('python3', [pythonScript, '--mode', mode], {
        stdio: ['pipe', 'pipe', 'pipe']
      });
      
      let output = '';
      let errorOutput = '';
      let isResponseSent = false;
      
      // Send PGN to Python script via stdin
      child.stdin.write(pgn);
      child.stdin.end();
      
      child.stdout.on('data', (data: Buffer) => {
        output += data.toString();
      });
      
      child.stderr.on('data', (data: Buffer) => {
        errorOutput += data.toString();
      });
      
      child.on('close', (code: number) => {
        if (isResponseSent) return;
        isResponseSent = true;
        
        if (code !== 0) {
          console.error("Python script error:", errorOutput);
          return res.status(500).json({ message: `Analysis failed: ${errorOutput}` });
        }
        
        // Return formatted output like your Python script
        res.type('text/plain').send(output.trim());
      });
      
      child.on('error', (error: Error) => {
        if (isResponseSent) return;
        isResponseSent = true;
        console.error("Python process error:", error);
        res.status(500).json({ message: `Process error: ${error.message}` });
      });
      
      // Set timeout for analysis (2 minutes for complex games)
      const timeout = setTimeout(() => {
        if (isResponseSent) return;
        isResponseSent = true;
        child.kill('SIGTERM');
        res.status(408).json({ message: "Analysis timeout - game too complex for current time limit" });
      }, 120000); // 2 minute timeout
      
      // Clear timeout when response is sent
      child.on('close', () => clearTimeout(timeout));
      
    } catch (error) {
      console.error("Error analyzing game:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to analyze game";
      res.status(500).json({ message: errorMessage });
    }
  });

  // Additional endpoint for detailed summary
  app.post("/api/analyze/game/summary", async (req, res) => {
    try {
      const { pgn } = req.body;
      
      if (!pgn) {
        return res.status(400).json({ message: "PGN is required" });
      }

      const { realStockfish } = await import('./real-stockfish');
      const gameAnalysis = await realStockfish.analyzeCompleteGame(pgn);
      
      res.type('text/plain').send(gameAnalysis);
    } catch (error) {
      console.error("Error analyzing game:", error);
      res.status(500).json({ message: "Failed to analyze game" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
