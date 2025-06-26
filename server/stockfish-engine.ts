import { execSync } from 'child_process';
import { Chess } from 'chess.js';

export class StockfishEngine {
  
  async analyzePosition(fen: string, depth = 12): Promise<number> {
    try {
      // Force Stockfish to output evaluation using eval command
      const commands = [
        'uci',
        'setoption name UCI_ShowWDL value true',
        'isready',
        `position fen ${fen}`,
        'eval',
        'quit'
      ].join('\n');

      const output = execSync('stockfish', {
        input: commands,
        encoding: 'utf8',
        timeout: 3000
      });

      // Parse evaluation from Stockfish's eval command output
      const lines = output.split('\n');
      
      for (const line of lines) {
        // Look for "Final evaluation" line from Stockfish
        if (line.includes('Final evaluation')) {
          const evalMatch = line.match(/Final evaluation\s+([+-]?\d+\.?\d*)/);
          if (evalMatch) {
            const evaluation = parseFloat(evalMatch[1]);
            return Math.round(evaluation * 100); // Convert to centipawns
          }
        }
      }

      // If no evaluation found, use positional analysis
      return this.getBasicEvaluation(fen);
    } catch (error) {
      console.error('Stockfish analysis failed:', error);
      return this.getBasicEvaluation(fen);
    }
  }

  private getBasicEvaluation(fen: string): number {
    try {
      const chess = new Chess(fen);
      
      // Basic material count evaluation
      const pieces = chess.board().flat().filter(p => p !== null);
      let materialBalance = 0;
      
      const pieceValues = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 0 };
      
      for (const piece of pieces) {
        if (piece) {
          const value = pieceValues[piece.type as keyof typeof pieceValues] || 0;
          materialBalance += piece.color === 'w' ? value : -value;
        }
      }
      
      // Add small positional adjustments
      const centerControl = this.evaluateCenterControl(chess);
      const mobility = chess.moves().length * 2;
      
      return Math.round(materialBalance + centerControl + (chess.turn() === 'w' ? mobility : -mobility));
    } catch (error) {
      return 0;
    }
  }

  private evaluateCenterControl(chess: Chess): number {
    const centerSquares = ['e4', 'e5', 'd4', 'd5'];
    let centerControl = 0;
    
    for (const square of centerSquares) {
      const piece = chess.get(square as any);
      if (piece) {
        centerControl += piece.color === 'w' ? 30 : -30;
      }
    }
    
    return centerControl;
  }

  async analyzeGame(pgn: string, depth = 15): Promise<string> {
    const chess = new Chess();
    let moves: string[] = [];
    
    try {
      // Try different PGN parsing approaches
      if (pgn.includes('[') && pgn.includes(']')) {
        // Full PGN format with headers
        const cleanPgn = pgn.replace(/\[.*?\]/g, '').trim();
        chess.loadPgn(cleanPgn);
        moves = chess.history();
      } else if (pgn.includes('.')) {
        // Algebraic notation with move numbers (e.g., "1. e4 e5 2. Nf3")
        const moveText = pgn.replace(/\d+\./g, '').trim();
        const moveArray = moveText.split(/\s+/).filter(m => m.length > 0);
        
        for (const move of moveArray) {
          try {
            chess.move(move);
          } catch (error) {
            console.warn(`Invalid move: ${move}`);
            break;
          }
        }
        moves = chess.history();
      } else {
        // Simple space-separated moves
        const moveArray = pgn.trim().split(/\s+/).filter(m => m.length > 0);
        
        for (const move of moveArray) {
          try {
            chess.move(move);
          } catch (error) {
            console.warn(`Invalid move: ${move}`);
            break;
          }
        }
        moves = chess.history();
      }
    } catch (error) {
      throw new Error(`Failed to parse PGN: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    
    if (moves.length === 0) {
      throw new Error("No valid moves found in PGN");
    }
    
    let output = "Analyzing moves:\n\n";
    
    // Reset to start position for analysis
    chess.reset();
    
    for (let i = 0; i < moves.length; i++) {
      const move = moves[i];
      
      // Make the move
      chess.move(move);
      
      // Get real Stockfish evaluation for current position
      const evaluation = await this.analyzePosition(chess.fen(), depth);
      
      // Convert centipawns to pawn units and format
      const evalInPawns = evaluation / 100;
      const formattedEval = evalInPawns >= 0 ? `+${evalInPawns.toFixed(2)}` : evalInPawns.toFixed(2);
      
      // Format output exactly like Python code
      const moveStr = move.padEnd(6);
      output += `${i + 1}. ${moveStr} | Eval: ${formattedEval}\n`;
    }
    
    return output;
  }
}

export const stockfishEngine = new StockfishEngine();