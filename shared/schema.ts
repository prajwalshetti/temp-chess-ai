import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  phoneNumber: text("phone_number"),
  fideId: text("fide_id"),
  aicfId: text("aicf_id"),
  lichessId: text("lichess_id").notNull(),
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
  gameSource: text("game_source").notNull().default("offline"), // "offline", "lichess", "chess.com"
  tournamentName: text("tournament_name"),
  tournamentRound: text("tournament_round"),
  eventDate: timestamp("event_date"),
  whiteRating: integer("white_rating"),
  blackRating: integer("black_rating"),
  analysisData: jsonb("analysis_data").$type<{
    evaluation?: number;
    bestMoves?: string[];
    mistakes?: number;
    blunders?: number;
    inaccuracies?: number;
    missedTactics?: {
      type: string;
      move: string;
      description: string;
      position: string;
    }[];
    strongMoves?: {
      move: string;
      description: string;
      position: string;
    }[];
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
  // Performance by time control
  rapidRating: integer("rapid_rating").default(1200),
  blitzRating: integer("blitz_rating").default(1200),
  classicalRating: integer("classical_rating").default(1200),
  // Tactical insights
  tacticalStrengths: jsonb("tactical_strengths").$type<{
    forks: number;
    pins: number;
    skewers: number;
    backRank: number;
    discoveredAttacks: number;
    deflection: number;
  }>().default({ forks: 0, pins: 0, skewers: 0, backRank: 0, discoveredAttacks: 0, deflection: 0 }),
  tacticalWeaknesses: jsonb("tactical_weaknesses").$type<{
    missedForks: number;
    missedPins: number;
    missedSkewers: number;
    hangingPieces: number;
    poorEndgamePlay: number;
    timeManagement: number;
  }>().default({ missedForks: 0, missedPins: 0, missedSkewers: 0, hangingPieces: 0, poorEndgamePlay: 0, timeManagement: 0 }),
  // Opening performance
  openingPhaseScore: integer("opening_phase_score").default(50), // 0-100
  middlegameScore: integer("middlegame_score").default(50),
  endgameScore: integer("endgame_score").default(50),
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

// New tables for opponent scouting and advanced analysis
export const tournaments = pgTable("tournaments", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  location: text("location"),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  format: text("format"), // "swiss", "round_robin", "knockout"
  timeControl: text("time_control"),
  rounds: integer("rounds").default(9),
});

export const tournamentParticipants = pgTable("tournament_participants", {
  id: serial("id").primaryKey(),
  tournamentId: integer("tournament_id").references(() => tournaments.id).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  startingRating: integer("starting_rating"),
  finalRating: integer("final_rating"),
  finalPosition: integer("final_position"),
  points: integer("points").default(0),
});

export const opponentEncounters = pgTable("opponent_encounters", {
  id: serial("id").primaryKey(),
  playerId: integer("player_id").references(() => users.id).notNull(),
  opponentId: integer("opponent_id").references(() => users.id).notNull(),
  gamesPlayed: integer("games_played").default(0),
  wins: integer("wins").default(0),
  losses: integer("losses").default(0),
  draws: integer("draws").default(0),
  lastEncounter: timestamp("last_encounter"),
  // Head-to-head insights
  favoriteOpeningAgainst: text("favorite_opening_against"),
  weaknessesExploited: jsonb("weaknesses_exploited").$type<string[]>().default([]),
  strengthsToAvoid: jsonb("strengths_to_avoid").$type<string[]>().default([]),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
}).extend({
  email: z.string().email("Please enter a valid email address"),
  phoneNumber: z.string().min(10, "Phone number must be at least 10 digits").optional(),
  lichessId: z.string().min(1, "Lichess ID is required for tournament analysis"),
  fideId: z.string().optional(),
  aicfId: z.string().optional(),
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

export const insertTournamentSchema = createInsertSchema(tournaments).omit({
  id: true,
});

export const insertTournamentParticipantSchema = createInsertSchema(tournamentParticipants).omit({
  id: true,
});

export const insertOpponentEncounterSchema = createInsertSchema(opponentEncounters).omit({
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
export type Tournament = typeof tournaments.$inferSelect;
export type InsertTournament = z.infer<typeof insertTournamentSchema>;
export type TournamentParticipant = typeof tournamentParticipants.$inferSelect;
export type InsertTournamentParticipant = z.infer<typeof insertTournamentParticipantSchema>;
export type OpponentEncounter = typeof opponentEncounters.$inferSelect;
export type InsertOpponentEncounter = z.infer<typeof insertOpponentEncounterSchema>;
