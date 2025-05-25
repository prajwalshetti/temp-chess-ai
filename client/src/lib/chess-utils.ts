import { Chess } from "chess.js";

export interface GameAnalysis {
  evaluation: number;
  bestMove?: string;
  mistakes: number;
  blunders: number;
}

export function parseGame(pgn: string) {
  const chess = new Chess();
  try {
    chess.loadPgn(pgn);
    return {
      success: true,
      game: chess,
      moves: chess.history(),
      headers: chess.header()
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Invalid PGN"
    };
  }
}

export function analyzePosition(fen: string): GameAnalysis {
  // Mock analysis - in a real app, this would call a chess engine
  const evaluation = Math.random() * 2 - 1; // Random evaluation between -1 and 1
  const mistakes = Math.floor(Math.random() * 5);
  const blunders = Math.floor(Math.random() * 2);
  
  return {
    evaluation,
    bestMove: "Nf3",
    mistakes,
    blunders
  };
}

export function getOpeningName(moves: string[]): string {
  // Simple opening detection
  const moveString = moves.slice(0, 6).join(" ");
  
  const openings: { [key: string]: string } = {
    "e4 e5 Nf3 Nc6 Bc4": "Italian Game",
    "e4 e5 Nf3 Nc6 Bb5": "Ruy Lopez",
    "e4 c5": "Sicilian Defense",
    "d4 d5 c4": "Queen's Gambit",
    "Nf3 Nf6 g3": "King's Indian Attack",
    "e4 e6": "French Defense",
    "e4 c6": "Caro-Kann Defense"
  };

  for (const [pattern, name] of Object.entries(openings)) {
    if (moveString.includes(pattern)) {
      return name;
    }
  }

  return "Unknown Opening";
}

export function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

export function calculateWinPercentage(wins: number, losses: number, draws: number): number {
  const total = wins + losses + draws;
  if (total === 0) return 0;
  return Math.round((wins / total) * 100);
}
