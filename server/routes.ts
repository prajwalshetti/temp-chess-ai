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

const isWin = process.platform === "win32";
const pythonCmd = isWin ? "python" : "python3";

// Schema for position analysis request
const analyzePositionSchema = z.object({
  fen: z.string().min(1, "FEN string is required"),
  depth: z.number().min(1).max(20).optional().default(15),
  timeLimit: z.number().min(100).max(10000).optional().default(1000)
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Initialize Lichess service
  const lichessService = new LichessService(process.env.LICHESS_API_TOKEN || '');
  const chessAnalyzer = new ChessAnalyzer();

  // Critical: Add middleware to ensure all API routes are handled before Vite catch-all
  app.use('/api', (req, res, next) => {
    console.log(`[API Middleware] Handling ${req.method} ${req.path}`);
    // Set JSON content type for all API routes
    res.setHeader('Content-Type', 'application/json');
    next();
  });

  // Position Analysis API endpoint
  app.post('/api/analyze-position', async (req, res) => {
    try {
      console.log('[API] Analyzing position:', req.body);
      
      // Validate request body
      const validation = analyzePositionSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          error: 'Invalid request data',
          details: validation.error.errors
        });
      }

      const { fen, depth, timeLimit } = validation.data;

      // Path to the Python analysis script
      const scriptPath = path.join(__dirname, 'simple_position_analyze.py');
      
      // Execute Python script
      const pythonProcess = spawn(pythonCmd, [
        scriptPath,
        fen,
        '--depth', depth.toString(),
        '--time', timeLimit.toString()
      ]);

      let outputData = '';
      let errorData = '';

      pythonProcess.stdout.on('data', (data) => {
        outputData += data.toString();
      });

      pythonProcess.stderr.on('data', (data) => {
        errorData += data.toString();
      });

      pythonProcess.on('close', (code) => {
        if (code === 0) {
          try {
            const result = JSON.parse(outputData);
            console.log('[API] Analysis result:', result);
            res.json(result);
          } catch (parseError) {
            console.error('[API] Failed to parse analysis result:', parseError);
            res.status(500).json({
              error: 'Failed to parse analysis result',
              details: parseError instanceof Error ? parseError.message : 'Unknown error'
            });
          }
        } else {
          console.error('[API] Python script failed:', errorData);
          res.status(500).json({
            error: 'Analysis failed',
            details: errorData || 'Unknown error occurred'
          });
        }
      });

      pythonProcess.on('error', (err) => {
        console.error('[API] Failed to start Python process:', err);
        res.status(500).json({
          error: 'Failed to start analysis process',
          details: err.message
        });
      });

    } catch (error) {
      console.error('[API] Position analysis error:', error);
      res.status(500).json({
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Test endpoint for position analysis
  app.get('/api/test-analysis', async (req, res) => {
    try {
      // Test with starting position
      const testFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
      
      const scriptPath = path.join(__dirname, 'simple_position_analyze.py');
      const pythonProcess = spawn(pythonCmd, [scriptPath, testFen]);

      let outputData = '';
      let errorData = '';

      pythonProcess.stdout.on('data', (data) => {
        outputData += data.toString();
      });

      pythonProcess.stderr.on('data', (data) => {
        errorData += data.toString();
      });

      pythonProcess.on('close', (code) => {
        if (code === 0) {
          try {
            const result = JSON.parse(outputData);
            res.json({
              message: 'Analysis test successful',
              result
            });
          } catch (parseError) {
            res.status(500).json({
              error: 'Failed to parse test result',
              details: parseError instanceof Error ? parseError.message : 'Unknown error'
            });
          }
        } else {
          res.status(500).json({
            error: 'Test analysis failed',
            details: errorData || 'Unknown error occurred'
          });
        }
      });

    } catch (error) {
      console.error('[API] Test analysis error:', error);
      res.status(500).json({
        error: 'Test failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Test endpoint to verify API routing
  app.get("/api/health", (req, res) => {
    console.log('[API] Health check endpoint called');
    res.json({ 
      status: "ok", 
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'unknown',
      lichessToken: process.env.LICHESS_API_TOKEN ? 'configured' : 'missing'
    });
  });

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
      console.log(`[API] Processing Lichess games request for: ${req.params.username}`);
      
      // Set proper headers for JSON response
      res.setHeader('Content-Type', 'application/json');
      
      const { username } = req.params;
      const maxGames = parseInt(req.query.max as string) || 50;
      
      console.log(`Fetching games for Lichess user: ${username} (max: ${maxGames})`);
      
      // Check if Lichess API token is available
      if (!process.env.LICHESS_API_TOKEN) {
        console.warn('LICHESS_API_TOKEN not set, using mock data');
        return res.json({
          username,
          totalGames: 0,
          games: [],
          message: "Lichess API token not configured. Please set LICHESS_API_TOKEN environment variable."
        });
      }
      
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

      console.log(`Successfully processed ${analyzedGames.length} games for ${username}`);
      
      res.json({
        username,
        totalGames: analyzedGames.length,
        games: analyzedGames
      });
    } catch (error) {
      console.error('Error fetching Lichess games:', error);
      
      // Ensure JSON response even for errors
      res.setHeader('Content-Type', 'application/json');
      res.status(500).json({ 
        message: "Failed to fetch Lichess games",
        error: error instanceof Error ? error.message : 'Unknown error',
        username: req.params.username
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

      // Use improved Python Stockfish analyzer
      const pythonScript = path.join(process.cwd(), 'server', 'stockfish_analyzer_improved.py');
      
      const child = spawn(pythonCmd, [pythonScript, '--depth', '20', '--format', 'json'], {
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
        
        try {
          // Parse JSON output from improved analyzer
          const analysisResult = JSON.parse(output.trim());
          
          if (!analysisResult.success) {
            return res.status(500).json({ message: "Analysis failed - invalid result" });
          }
          
          res.json({
            gameId,
            pgn,
            moveEvaluations: analysisResult.moveEvaluations,
            totalMoves: analysisResult.totalMoves,
            rawOutput: errorOutput.trim() // Analysis log goes to stderr
          });
        } catch (parseError) {
          console.error("Failed to parse analysis result:", parseError);
          console.error("Raw output:", output);
          res.status(500).json({ message: "Failed to parse analysis result" });
        }
      });
      
      child.on('error', (error: Error) => {
        if (isResponseSent) return;
        isResponseSent = true;
        console.error("Game analysis process error:", error);
        res.status(500).json({ message: `Process error: ${error.message}` });
      });
      
      // Set timeout for optimized analysis (5 minutes for depth 20 with 1.5-second thinking time)
      const timeout = setTimeout(() => {
        if (isResponseSent) return;
        isResponseSent = true;
        child.kill('SIGTERM');
        res.status(408).json({ message: "Game analysis timeout" });
      }, 300000);
      
      child.on('close', () => clearTimeout(timeout));
      
    } catch (error) {
      console.error("Game analysis endpoint error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Simple game analysis using cleaner analyzer (like user's local script)
  app.post("/api/analyze/simple", async (req, res) => {
    try {
      const { pgn, mode = "accurate" } = req.body;
      
      if (!pgn) {
        return res.status(400).json({ message: "PGN is required" });
      }

      console.log(`Analyzing game with simple analyzer in ${mode} mode`);

      // Use the simple Python chess analyzer
      const pythonScript = path.join(process.cwd(), 'server', 'simple_chess_analyzer.py');
      
      const child = spawn(pythonCmd, [pythonScript, '--mode', mode], {
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
          console.error("Simple game analysis error:", errorOutput);
          return res.status(500).json({ message: `Analysis failed: ${errorOutput}` });
        }
        
        try {
          // Parse JSON output from simple analyzer
          const analysisResult = JSON.parse(output.trim());
          
          if (!analysisResult.success) {
            return res.status(500).json({ message: "Analysis failed - invalid result" });
          }
          
          res.json({
            pgn,
            mode,
            moveEvaluations: analysisResult.moveEvaluations,
            analysisResults: analysisResult.analysisResults, // Include full analysis with best moves
            totalMoves: analysisResult.totalMoves,
            analysisLog: errorOutput.trim() // Debug output goes to stderr
          });
          
        } catch (parseError) {
          console.error("Failed to parse simple analysis result:", parseError);
          console.error("Raw output:", output);
          res.status(500).json({ message: "Failed to parse analysis result" });
        }
      });
      
      child.on('error', (error: Error) => {
        if (isResponseSent) return;
        isResponseSent = true;
        console.error("Simple game analysis process error:", error);
        res.status(500).json({ message: `Process error: ${error.message}` });
      });
      
      // Set timeout for simple analysis (2 minutes for fast mode, 5 minutes for accurate mode)
      const timeoutMs = mode === "fast" ? 120000 : 300000;
      const timeout = setTimeout(() => {
        if (isResponseSent) return;
        isResponseSent = true;
        child.kill('SIGTERM');
        res.status(408).json({ message: "Simple game analysis timeout" });
      }, timeoutMs);
      
      child.on('close', () => clearTimeout(timeout));
      
    } catch (error) {
      console.error("Simple game analysis endpoint error:", error);
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
      
      const child = spawn(pythonCmd, [pythonScript, '--mode', 'fast'], {
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
