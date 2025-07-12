// Tactic Type Enum
enum TacticType {
  FORK = "fork",
  PIN = "pin",
  SKEWER = "skewer",
  DISCOVERED_ATTACK = "discovered_attack",
  DOUBLE_ATTACK = "double_attack",
  SACRIFICE = "sacrifice",
  DEFLECTION = "deflection",
  DECOY = "decoy",
  INTERFERENCE = "interference",
  CLEARANCE = "clearance",
  ZUGZWANG = "zugzwang",
  BACK_RANK = "back_rank",
  SMOTHERED_MATE = "smothered_mate",
  MATE_IN_ONE = "mate_in_one",
  MATE_IN_TWO = "mate_in_two",
  MATE_THREAT = "mate_threat",
  HANGING_PIECE = "hanging_piece",
  TRAPPED_PIECE = "trapped_piece",
  REMOVAL_OF_DEFENDER = "removal_of_defender",
  ATTRACTION = "attraction",
  UNKNOWN = "unknown"
}

interface Blunder {
  gameId: string;
  gameMoves: string;
  index: number;
  variation: string;
  isUsernameWhite: boolean;
}

interface Tactic {
  fen: string;
  moves: string[]; // [opponentMove, ourBestResponse]
  result: string;
  termination: string;
}

interface ClassificationInput {
  username: string;
  blunders: Blunder[];
  tactics: Tactic[];
  blunderCount: number;
}

interface TacticClassification {
  index: number;
  gameId: string;
  tacticType: TacticType;
  confidence: number;
  description: string;
  keySquares?: string[];
  targetPieces?: string[];
}

import { Chess } from "chess.js";

function classifyChessTactics(input: ClassificationInput): TacticClassification[] {
  const classifications: TacticClassification[] = [];

  for (let i = 0; i < input.blunders.length; i++) {
    const blunder = input.blunders[i];
    const tactic = input.tactics[i];
    const bestChess = new Chess();
    for(let j=0;j<=blunder.index;j++){
      const moveResult = bestChess.move(blunder.gameMoves.split(' ')[j]);
      if(!moveResult){
        console.log(`Failed to apply move ${blunder.gameMoves.split(' ')[j]} at index ${j}`);
        break;
      }
    }
    const typeoftactic = detectTypeOfTactic(bestChess, tactic.moves.slice(1),blunder.gameMoves.split(' ').slice(blunder.index+1));
    classifications.push({
      index: i,
      gameId: blunder.gameId,
      ...typeoftactic
    });
  }

  return classifications;
}

function detectTypeOfTactic(chess: Chess,bestmoves:string[],originalmoves:string[]): Omit<TacticClassification, "index" | "gameId"> {
  console.log("position of the game",chess.fen());
  console.log("best moves",bestmoves);
  console.log("original moves",originalmoves);
  return {
    tacticType: TacticType.UNKNOWN,
    confidence: 0.1,
    description: "Printing"
  }
}

export {
  classifyChessTactics,
  TacticType,
  TacticClassification,
  ClassificationInput,
  Blunder,
  Tactic
};