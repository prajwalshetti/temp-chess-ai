import type { Express } from "express";
import { createServer, type Server } from "http";
import { z } from "zod";
import { storage } from "./storage";
import { insertGameSchema, insertPuzzleAttemptSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
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
