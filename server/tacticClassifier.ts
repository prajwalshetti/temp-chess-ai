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
  MATE_IN_THREE = "mate_in_three",
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

function detectMatePattern(bestmoves: string[]): Omit<TacticClassification, "index" | "gameId"> | null {
  const movePairs = Math.ceil(bestmoves.length / 2);
  let i = 0;
  
  for (i = 0; i < bestmoves.length; i += 2) {
    if (bestmoves[i].includes('#')) {
      break;
    }
  }
  
  if(i >= bestmoves.length){
    return null;
  }
  
  let tacticType: TacticType;
  let description: string;
  
  if(i == 0) {
    tacticType = TacticType.MATE_IN_ONE;
    description = "Mate in one move";
  } else if(i == 2) {
    tacticType = TacticType.MATE_IN_TWO;
    description = "Mate in two moves";
  } else if(i == 4) {
    tacticType = TacticType.MATE_IN_THREE;
    description = "Mate in three moves";
  } else {
    tacticType = TacticType.MATE_THREAT;
    description = "Mate threat";
  }
  
  return {
    tacticType: tacticType,
    confidence: 0.9,
    description: description
  };
}

function detectFork(chess: Chess,bestmoves:string[],originalmoves:string[]): boolean {
  if(bestmoves[0].includes('N')==false)return false;
  const m=bestmoves[0].match(/([a-h][1-8])$/);
  if(m==null)return false;
  const toSquare=m[1];
  
  // Get knight position after move
  const file = toSquare.charCodeAt(0) - 97; // a=0, b=1, etc.
  const rank = parseInt(toSquare[1]) - 1; // 1=0, 2=1, etc.
  
  // Knight jumping squares (8 possible moves)
  const knightMoves = [
    [file-2, rank-1], [file-2, rank+1], [file-1, rank-2], [file-1, rank+2],
    [file+1, rank-2], [file+1, rank+2], [file+2, rank-1], [file+2, rank+1]
  ];
  
  let valuableTargets = 0;
  for(const [targetFile, targetRank] of knightMoves) {
    if(targetFile >= 0 && targetFile < 8 && targetRank >= 0 && targetRank < 8) {
      const targetSquare = String.fromCharCode(targetFile + 97) + (targetRank + 1) as any;
      const piece = chess.get(targetSquare);
      if(piece && piece.color !== chess.turn()) {
        // Check if piece is valuable (not pawn)
        if(piece.type !== 'p') {
          valuableTargets++;
        }
      }
    }
  }
  
  return valuableTargets >= 2;
}

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

  // First, check for mate patterns
  const mateResult = detectMatePattern(bestmoves);
  if(mateResult !== null){
    return mateResult;
  }

  // Check for fork
  if(detectFork(chess, bestmoves, originalmoves)){
    return {
      tacticType: TacticType.FORK,
      confidence: 0.8,
      description: "Knight fork attacking two valuable pieces"
    };
  }

  //Complete the code by finding the tactic type
  //If u find we could have taken a big piece not pawn which would not have been captured back in the best line return hanging piece
  //If u find a check in the next move of the best line which was not given by the piece which moved return discovered attack
  //If u find a big piece attacking two unsupported pieces return double attack
  //If u find a bishop moving in line of opponent knight in the same diagonal opponent king or queen is present return pin
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