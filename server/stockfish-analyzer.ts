import { Chess } from 'chess.js';
import Stockfish from 'stockfish';

export interface TacticalOpportunity {
  moveNumber: number;
  position: string;
  actualMove: string;
  bestMove: string;
  tacticalType: string;
  description: string;
  evaluationBefore: number;
  evaluationAfter: number;
  severity: 'low' | 'medium' | 'high';
}

export class StockfishAnalyzer {
  private engine: any;
  private engineReady: boolean = false;

  constructor() {
    this.engine = Stockfish();
    this.initializeEngine();
  }

  private initializeEngine(): Promise<void> {
    return new Promise((resolve) => {
      this.engine.onmessage = (line: string) => {
        if (line === 'uciok') {
          this.engineReady = true;
          resolve();
        }
      };
      this.engine.postMessage('uci');
    });
  }

  async analyzeGameForTactics(moves: string[], targetPlayer: string, isWhite: boolean): Promise<TacticalOpportunity[]> {
    const tacticalOpportunities: TacticalOpportunity[] = [];
    const chess = new Chess();
    
    for (let moveIndex = 0; moveIndex < moves.length; moveIndex++) {
      const isPlayerMove = isWhite ? (moveIndex % 2 === 0) : (moveIndex % 2 === 1);
      
      if (isPlayerMove) {
        // Analyze position before the move
        const positionBefore = chess.fen();
        const actualMove = moves[moveIndex];
        
        // Get Stockfish evaluation before the move
        const evaluationBefore = await this.evaluatePosition(positionBefore);
        
        // Play the actual move
        chess.move(actualMove);
        const positionAfter = chess.fen();
        
        // Get Stockfish's best move recommendation for the position before
        const bestMove = await this.getBestMove(positionBefore);
        
        // Get evaluation after best move
        const testChess = new Chess(positionBefore);
        try {
          testChess.move(bestMove);
          const evaluationAfterBest = await this.evaluatePosition(testChess.fen());
          
          // Check if there was a significant tactical opportunity missed
          const evaluationDiff = Math.abs(evaluationAfterBest - evaluationBefore);
          
          if (evaluationDiff > 100 && bestMove !== actualMove) { // 1+ pawn advantage
            const tacticalType = await this.identifyTacticalType(positionBefore, bestMove);
            
            tacticalOpportunities.push({
              moveNumber: Math.floor(moveIndex / 2) + 1,
              position: positionBefore,
              actualMove: actualMove,
              bestMove: bestMove,
              tacticalType: tacticalType,
              description: `${bestMove} was a strong ${tacticalType} that was missed`,
              evaluationBefore: evaluationBefore,
              evaluationAfter: evaluationAfterBest,
              severity: evaluationDiff > 300 ? 'high' : evaluationDiff > 200 ? 'medium' : 'low'
            });
          }
        } catch (error) {
          // Skip if best move is invalid
          continue;
        }
      } else {
        // Just play opponent's move
        chess.move(moves[moveIndex]);
      }
    }
    
    return tacticalOpportunities.slice(0, 5); // Return top 5 missed tactics
  }

  private async evaluatePosition(fen: string, depth: number = 12): Promise<number> {
    return new Promise((resolve) => {
      this.engine.onmessage = (line: string) => {
        if (line.includes('score cp')) {
          const match = line.match(/score cp (-?\d+)/);
          if (match) {
            resolve(parseInt(match[1]));
          }
        }
      };
      
      this.engine.postMessage(`position fen ${fen}`);
      this.engine.postMessage(`go depth ${depth}`);
      
      // Timeout after 2 seconds
      setTimeout(() => resolve(0), 2000);
    });
  }

  private async getBestMove(fen: string, depth: number = 12): Promise<string> {
    return new Promise((resolve) => {
      this.engine.onmessage = (line: string) => {
        if (line.includes('bestmove')) {
          const match = line.match(/bestmove (\w+)/);
          if (match) {
            // Convert UCI move to SAN notation
            const chess = new Chess(fen);
            try {
              const move = chess.move(match[1]);
              resolve(move.san);
            } catch {
              resolve(match[1]); // Return UCI if SAN conversion fails
            }
          }
        }
      };
      
      this.engine.postMessage(`position fen ${fen}`);
      this.engine.postMessage(`go depth ${depth}`);
      
      // Timeout after 3 seconds
      setTimeout(() => resolve(''), 3000);
    });
  }

  private async identifyTacticalType(fen: string, bestMove: string): Promise<string> {
    const chess = new Chess(fen);
    
    try {
      const move = chess.move(bestMove);
      
      // Check for various tactical patterns
      if (move.captured) {
        return 'capture';
      }
      
      if (chess.inCheck()) {
        return 'check';
      }
      
      // Check for fork (piece attacking multiple pieces)
      if (this.detectsFork(chess, move)) {
        return 'fork';
      }
      
      // Check for pin
      if (this.detectsPin(chess, move)) {
        return 'pin';
      }
      
      // Check for discovered attack
      if (this.detectsDiscoveredAttack(fen, chess.fen(), move)) {
        return 'discovered attack';
      }
      
      // Default to tactical shot
      return 'tactical shot';
      
    } catch (error) {
      return 'tactical opportunity';
    }
  }

  private detectsFork(chess: Chess, move: any): boolean {
    const piece = chess.get(move.to);
    if (!piece) return false;
    
    // Get squares attacked by the moved piece
    const attacks = this.getSquaresAttackedBy(chess, move.to, piece.type, piece.color);
    let enemyPiecesAttacked = 0;
    
    for (const square of attacks) {
      const targetPiece = chess.get(square);
      if (targetPiece && targetPiece.color !== piece.color) {
        enemyPiecesAttacked++;
      }
    }
    
    return enemyPiecesAttacked >= 2;
  }

  private detectsPin(chess: Chess, move: any): boolean {
    // Simple pin detection - check if move restricts enemy piece movement
    const piece = chess.get(move.to);
    if (!piece) return false;
    
    // This is a simplified implementation
    // A full implementation would check for pieces aligned with the king
    return piece.type === 'b' || piece.type === 'r' || piece.type === 'q';
  }

  private detectsDiscoveredAttack(beforeFen: string, afterFen: string, move: any): boolean {
    // Check if moving a piece reveals an attack from another piece
    // This is a simplified implementation
    const beforeChess = new Chess(beforeFen);
    const afterChess = new Chess(afterFen);
    
    // Compare number of attacked squares before and after
    const beforeAttacks = this.getTotalAttacks(beforeChess, move.color);
    const afterAttacks = this.getTotalAttacks(afterChess, move.color);
    
    return afterAttacks > beforeAttacks;
  }

  private getSquaresAttackedBy(chess: Chess, square: string, pieceType: string, color: string): string[] {
    const attacks = [];
    const file = square.charCodeAt(0) - 97;
    const rank = parseInt(square[1]) - 1;
    
    switch (pieceType) {
      case 'n': // Knight
        const knightMoves = [
          [-2, -1], [-2, 1], [-1, -2], [-1, 2],
          [1, -2], [1, 2], [2, -1], [2, 1]
        ];
        for (const [df, dr] of knightMoves) {
          const newFile = file + df;
          const newRank = rank + dr;
          if (newFile >= 0 && newFile < 8 && newRank >= 0 && newRank < 8) {
            attacks.push(String.fromCharCode(97 + newFile) + (newRank + 1));
          }
        }
        break;
      
      case 'b': // Bishop
      case 'r': // Rook  
      case 'q': // Queen
        const directions = pieceType === 'r' ? [[0,1],[0,-1],[1,0],[-1,0]] :
                          pieceType === 'b' ? [[1,1],[1,-1],[-1,1],[-1,-1]] :
                          [[0,1],[0,-1],[1,0],[-1,0],[1,1],[1,-1],[-1,1],[-1,-1]];
        
        for (const [df, dr] of directions) {
          for (let i = 1; i < 8; i++) {
            const newFile = file + df * i;
            const newRank = rank + dr * i;
            if (newFile < 0 || newFile >= 8 || newRank < 0 || newRank >= 8) break;
            
            const targetSquare = String.fromCharCode(97 + newFile) + (newRank + 1);
            attacks.push(targetSquare);
            
            if (chess.get(targetSquare)) break; // Stop at first piece
          }
        }
        break;
    }
    
    return attacks;
  }

  private getTotalAttacks(chess: Chess, color: string): number {
    let totalAttacks = 0;
    const board = chess.board();
    
    for (let rank = 0; rank < 8; rank++) {
      for (let file = 0; file < 8; file++) {
        const piece = board[rank][file];
        if (piece && piece.color === color) {
          const square = String.fromCharCode(97 + file) + (8 - rank);
          const attacks = this.getSquaresAttackedBy(chess, square, piece.type, piece.color);
          totalAttacks += attacks.length;
        }
      }
    }
    
    return totalAttacks;
  }
}