import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  fideId: text("fide_id"),
  aicfId: text("aicf_id"),
  lichessId: text("lichess_id"),
  currentRating: integer("current_rating").default(1200),
  puzzleRating: integer("puzzle_rating").default(1200),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const games = pgTable("games", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  whitePlayer: text("white_player").notNull(),
  blackPlayer: text("black_player").notNull(),
  result: text("result").notNull(), // "1-0", "0-1", "1/2-1/2"
  opening: text("opening"),
  timeControl: text("time_control"),
  pgn: text("pgn").notNull(),
  moves: jsonb("moves").$type<string[]>().notNull(),
  analysisData: jsonb("analysis_data").$type<{
    evaluation?: number;
    bestMoves?: string[];
    mistakes?: number;
    blunders?: number;
  }>(),
  uploadedAt: timestamp("uploaded_at").defaultNow().notNull(),
});

export const puzzles = pgTable("puzzles", {
  id: serial("id").primaryKey(),
  fen: text("fen").notNull(),
  moves: jsonb("moves").$type<string[]>().notNull(),
  theme: text("theme").notNull(),
  difficulty: integer("difficulty").notNull(), // 1-5
  description: text("description").notNull(),
  solution: text("solution").notNull(),
});

export const puzzleAttempts = pgTable("puzzle_attempts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  puzzleId: integer("puzzle_id").references(() => puzzles.id).notNull(),
  solved: boolean("solved").notNull(),
  timeSpent: integer("time_spent"), // in seconds
  attemptedAt: timestamp("attempted_at").defaultNow().notNull(),
});

export const playerStats = pgTable("player_stats", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  gamesPlayed: integer("games_played").default(0),
  wins: integer("wins").default(0),
  losses: integer("losses").default(0),
  draws: integer("draws").default(0),
  winsAsWhite: integer("wins_as_white").default(0),
  winsAsBlack: integer("wins_as_black").default(0),
  lossesAsWhite: integer("losses_as_white").default(0),
  lossesAsBlack: integer("losses_as_black").default(0),
  drawsAsWhite: integer("draws_as_white").default(0),
  drawsAsBlack: integer("draws_as_black").default(0),
  tacticalStrengths: jsonb("tactical_strengths").$type<{
    forks: number;
    pins: number;
    skewers: number;
    backRank: number;
  }>().default({ forks: 0, pins: 0, skewers: 0, backRank: 0 }),
  tacticalWeaknesses: jsonb("tactical_weaknesses").$type<{
    missedForks: number;
    missedPins: number;
    discoveryAttacks: number;
    endgamePrecision: number;
  }>().default({ missedForks: 0, missedPins: 0, discoveryAttacks: 0, endgamePrecision: 0 }),
});

export const openings = pgTable("openings", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  name: text("name").notNull(),
  moves: text("moves").notNull(),
  color: text("color").notNull(), // "white" or "black"
  gamesPlayed: integer("games_played").default(0),
  wins: integer("wins").default(0),
  losses: integer("losses").default(0),
  draws: integer("draws").default(0),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertGameSchema = createInsertSchema(games).omit({
  id: true,
  uploadedAt: true,
});

export const insertPuzzleSchema = createInsertSchema(puzzles).omit({
  id: true,
});

export const insertPuzzleAttemptSchema = createInsertSchema(puzzleAttempts).omit({
  id: true,
  attemptedAt: true,
});

export const insertPlayerStatsSchema = createInsertSchema(playerStats).omit({
  id: true,
});

export const insertOpeningSchema = createInsertSchema(openings).omit({
  id: true,
});

// Types
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
