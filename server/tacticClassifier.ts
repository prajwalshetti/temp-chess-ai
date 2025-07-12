interface Blunder {
  gameId: string;
  gameMoves: string;
  index: number;
  variation: string;
}

interface Tactic {
  fen: string;
  moves: string[];
  result: string;
  termination: string;
}

interface ClassificationInput {
  username: string;
  blunders: Blunder[];
  tactics: Tactic[];
  blunderCount: number;
}

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

interface TacticClassification {
  index: number;
  gameId: string;
  tacticType: TacticType;
  confidence: number;
  description: string;
  keySquares?: string[];
  targetPieces?: string[];
}

class ChessTacticsClassifier {
  private static readonly PIECE_VALUES = {
    'P': 1, 'p': 1,
    'N': 3, 'n': 3,
    'B': 3, 'b': 3,
    'R': 5, 'r': 5,
    'Q': 9, 'q': 9,
    'K': 0, 'k': 0
  };

  private static readonly FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
  private static readonly RANKS = ['1', '2', '3', '4', '5', '6', '7', '8'];

  static classifyTactics(input: ClassificationInput): TacticClassification[] {
    const classifications: TacticClassification[] = [];

    for (let i = 0; i < input.blunders.length; i++) {
      const blunder = input.blunders[i];
      const tactic = input.tactics[i];

      const classification = this.classifyTactic(blunder, tactic, i);
      classifications.push(classification);
    }

    return classifications;
  }

  private static classifyTactic(blunder: Blunder, tactic: Tactic, index: number): TacticClassification {
    const board = this.parseFEN(tactic.fen);
    const opponentMove = tactic.moves[0]; // What opponent actually played
    const ourMissedMove = tactic.moves[1]; // What WE should have played (this is what we analyze)

    // We need to analyze the position after opponent's move, then analyze our missed move
    const boardAfterOpponentMove = this.makeMove(board, opponentMove, tactic.fen);
    const updatedFen = this.updateFenAfterMove(tactic.fen, opponentMove);
    
    // Analyze our missed move
    const analysis = this.analyzePosition(boardAfterOpponentMove, ourMissedMove, null, updatedFen);
    
    return {
      index,
      gameId: blunder.gameId,
      tacticType: analysis.tacticType,
      confidence: analysis.confidence,
      description: analysis.description,
      keySquares: analysis.keySquares,
      targetPieces: analysis.targetPieces
    };
  }

  private static parseFEN(fen: string): string[][] {
    const board: string[][] = Array(8).fill(null).map(() => Array(8).fill(''));
    const boardPart = fen.split(' ')[0];
    const ranks = boardPart.split('/');

    for (let rank = 0; rank < 8; rank++) {
      let file = 0;
      for (const char of ranks[rank]) {
        if (char >= '1' && char <= '8') {
          file += parseInt(char);
        } else {
          board[rank][file] = char;
          file++;
        }
      }
    }

    return board;
  }

  private static analyzePosition(board: string[][], ourMissedMove: string, followUpMove: string | null, fen: string): {
    tacticType: TacticType;
    confidence: number;
    description: string;
    keySquares?: string[];
    targetPieces?: string[];
  } {
    const moveAnalysis = this.parseMove(ourMissedMove);
    const isWhiteToMove = fen.split(' ')[1] === 'w';

    // Check for immediate checkmate patterns
    if (ourMissedMove.includes('#')) {
      return this.analyzeMatePattern(board, moveAnalysis, isWhiteToMove);
    }

    // Check for check patterns
    if (ourMissedMove.includes('+')) {
      return this.analyzeCheckPattern(board, moveAnalysis, followUpMove, isWhiteToMove);
    }

    // Check for captures
    if (ourMissedMove.includes('x')) {
      return this.analyzeCapturePattern(board, moveAnalysis, followUpMove, isWhiteToMove);
    }

    // Check for piece development/positioning tactics
    return this.analyzePositionalTactic(board, moveAnalysis, followUpMove, isWhiteToMove);
  }

  private static parseMove(move: string): {
    piece: string;
    from?: string;
    to: string;
    capture: boolean;
    check: boolean;
    mate: boolean;
    promotion?: string;
  } {
    const cleanMove = move.replace(/[+#]/, '');
    const capture = move.includes('x');
    const check = move.includes('+');
    const mate = move.includes('#');

    // Handle castling
    if (move === 'O-O' || move === 'O-O-O') {
      return {
        piece: 'K',
        to: move === 'O-O' ? 'g1' : 'c1',
        capture,
        check,
        mate
      };
    }

    // Parse regular moves
    let piece = 'P'; // Default to pawn
    let from = '';
    let to = '';
    let promotion = '';

    if (cleanMove.length >= 2) {
      const lastTwo = cleanMove.slice(-2);
      if (this.isValidSquare(lastTwo)) {
        to = lastTwo;
        
        if (cleanMove.length > 2) {
          const remaining = cleanMove.slice(0, -2).replace('x', '');
          if (remaining.length === 1 && 'NBRQK'.includes(remaining)) {
            piece = remaining;
          } else if (remaining.length === 1 && 'abcdefgh'.includes(remaining)) {
            from = remaining;
          } else if (remaining.length === 2) {
            if ('NBRQK'.includes(remaining[0])) {
              piece = remaining[0];
              from = remaining[1];
            }
          }
        }
      }
    }

    return { piece, from, to, capture, check, mate, promotion };
  }

  private static isValidSquare(square: string): boolean {
    return square.length === 2 && 
           'abcdefgh'.includes(square[0]) && 
           '12345678'.includes(square[1]);
  }

  private static analyzeMatePattern(board: string[][], moveAnalysis: any, isWhiteToMove: boolean): {
    tacticType: TacticType;
    confidence: number;
    description: string;
    keySquares?: string[];
    targetPieces?: string[];
  } {
    // Check for smothered mate pattern
    if (moveAnalysis.piece === 'N') {
      return {
        tacticType: TacticType.SMOTHERED_MATE,
        confidence: 0.8,
        description: "Smothered mate pattern with knight",
        keySquares: [moveAnalysis.to],
        targetPieces: ['K']
      };
    }

    // Check for back rank mate
    if (moveAnalysis.piece === 'R' || moveAnalysis.piece === 'Q') {
      const rank = moveAnalysis.to[1];
      if (rank === '8' || rank === '1') {
        return {
          tacticType: TacticType.BACK_RANK,
          confidence: 0.7,
          description: "Back rank mate threat",
          keySquares: [moveAnalysis.to],
          targetPieces: ['K']
        };
      }
    }

    return {
      tacticType: TacticType.MATE_IN_ONE,
      confidence: 0.6,
      description: "Mate in one opportunity",
      keySquares: [moveAnalysis.to]
    };
  }

  private static analyzeCheckPattern(board: string[][], moveAnalysis: any, followUpMove: string | null, isWhiteToMove: boolean): {
    tacticType: TacticType;
    confidence: number;
    description: string;
    keySquares?: string[];
    targetPieces?: string[];
  } {
    // Check for fork (piece gives check and attacks another piece)
    if (moveAnalysis.piece === 'N') {
      return {
        tacticType: TacticType.FORK,
        confidence: 0.8,
        description: "Knight fork giving check",
        keySquares: [moveAnalysis.to],
        targetPieces: ['K']
      };
    }

    // Check for discovered attack
    if (moveAnalysis.piece === 'B' || moveAnalysis.piece === 'R' || moveAnalysis.piece === 'Q') {
      return {
        tacticType: TacticType.DISCOVERED_ATTACK,
        confidence: 0.7,
        description: "Discovered check attack",
        keySquares: [moveAnalysis.to],
        targetPieces: ['K']
      };
    }

    return {
      tacticType: TacticType.MATE_THREAT,
      confidence: 0.6,
      description: "Check creating mate threat",
      keySquares: [moveAnalysis.to]
    };
  }

  private static analyzeCapturePattern(board: string[][], moveAnalysis: any, followUpMove: string | null, isWhiteToMove: boolean): {
    tacticType: TacticType;
    confidence: number;
    description: string;
    keySquares?: string[];
    targetPieces?: string[];
  } {
    // Check for sacrifice patterns
    const capturedPiece = this.getPieceAt(board, moveAnalysis.to);
    const movingPiece = moveAnalysis.piece;
    
    const movingPieceValue = this.PIECE_VALUES[movingPiece as keyof typeof this.PIECE_VALUES] || 0;
    const capturedPieceValue = this.PIECE_VALUES[capturedPiece as keyof typeof this.PIECE_VALUES] || 0;
    
    if (movingPieceValue > capturedPieceValue) {
      return {
        tacticType: TacticType.SACRIFICE,
        confidence: 0.7,
        description: "Tactical sacrifice",
        keySquares: [moveAnalysis.to],
        targetPieces: [capturedPiece]
      };
    }

    // Check for removal of defender
    return {
      tacticType: TacticType.REMOVAL_OF_DEFENDER,
      confidence: 0.6,
      description: "Removal of defender",
      keySquares: [moveAnalysis.to],
      targetPieces: [capturedPiece]
    };
  }

  private static analyzePositionalTactic(board: string[][], moveAnalysis: any, followUpMove: string | null, isWhiteToMove: boolean): {
    tacticType: TacticType;
    confidence: number;
    description: string;
    keySquares?: string[];
    targetPieces?: string[];
  } {
    // Check for pin patterns
    if (moveAnalysis.piece === 'B' || moveAnalysis.piece === 'R' || moveAnalysis.piece === 'Q') {
      return {
        tacticType: TacticType.PIN,
        confidence: 0.6,
        description: "Pin tactic",
        keySquares: [moveAnalysis.to]
      };
    }

    // Check for fork patterns
    if (moveAnalysis.piece === 'N') {
      return {
        tacticType: TacticType.FORK,
        confidence: 0.7,
        description: "Knight fork",
        keySquares: [moveAnalysis.to]
      };
    }

    // Check for skewer patterns
    if (moveAnalysis.piece === 'B' || moveAnalysis.piece === 'R' || moveAnalysis.piece === 'Q') {
      return {
        tacticType: TacticType.SKEWER,
        confidence: 0.5,
        description: "Skewer tactic",
        keySquares: [moveAnalysis.to]
      };
    }

    return {
      tacticType: TacticType.UNKNOWN,
      confidence: 0.3,
      description: "Unidentified tactic",
      keySquares: [moveAnalysis.to]
    };
  }

  private static getPieceAt(board: string[][], square: string): string {
    const file = square.charCodeAt(0) - 'a'.charCodeAt(0);
    const rank = 8 - parseInt(square[1]);
    return board[rank][file] || '';
  }

  // Helper method to make a move on the board (simplified version)
  private static makeMove(board: string[][], move: string, fen: string): string[][] {
    // This is a simplified version - in a real implementation, you'd want
    // a full chess engine to properly make moves
    const newBoard = board.map(row => [...row]);
    const moveAnalysis = this.parseMove(move);
    
    // For now, return the same board - this would need proper move execution
    // In a real implementation, you'd update the board based on the move
    return newBoard;
  }

  // Helper method to update FEN after a move (simplified version)
  private static updateFenAfterMove(fen: string, move: string): string {
    // This is a simplified version - in a real implementation, you'd want
    // to properly update the FEN notation after making a move
    const fenParts = fen.split(' ');
    
    // Switch the active color (who's turn it is)
    fenParts[1] = fenParts[1] === 'w' ? 'b' : 'w';
    
    // In a real implementation, you'd also need to:
    // - Update the board position
    // - Update castling rights
    // - Update en passant square
    // - Update halfmove and fullmove counters
    
    return fenParts.join(' ');
  }
}

// Usage example:
function classifyChessTactics(input: ClassificationInput): TacticClassification[] {
  return ChessTacticsClassifier.classifyTactics(input);
}

// Export for use
export { 
  ChessTacticsClassifier, 
  TacticType, 
  TacticClassification, 
  ClassificationInput,
  Blunder,
  Tactic,
  classifyChessTactics 
}; 