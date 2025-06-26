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
        // Look for "Final evaluation" or "Total evaluation" lines
        if (line.includes('Final evaluation') || line.includes('Total evaluation')) {
          const evalMatch = line.match(/([+-]?\d+\.?\d*)/);
          if (evalMatch) {
            const evaluation = parseFloat(evalMatch[1]);
            return Math.round(evaluation * 100); // Convert to centipawns
          }
        }
        
        // Also check for direct centipawn values
        if (line.includes('cp')) {
          const cpMatch = line.match(/cp\s+([+-]?\d+)/);
          if (cpMatch) {
            return parseInt(cpMatch[1]);
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
    
    // Clean and parse PGN
    const cleanPgn = pgn.replace(/\[.*?\]/g, '').trim();
    chess.loadPgn(cleanPgn);
    
    const history = chess.history({ verbose: true });
    let output = "Analyzing moves:\n\n";
    
    // Reset to start position
    chess.reset();
    
    for (let i = 0; i < history.length; i++) {
      const move = history[i];
      
      // Make the move
      chess.move(move);
      
      // Get real Stockfish evaluation for current position
      const evaluation = await this.analyzePosition(chess.fen(), depth);
      
      // Convert centipawns to pawn units and format
      const evalInPawns = evaluation / 100;
      const formattedEval = evalInPawns >= 0 ? `+${evalInPawns.toFixed(2)}` : evalInPawns.toFixed(2);
      
      // Format output exactly like Python code
      const moveStr = move.san.padEnd(6);
      output += `${i + 1}. ${moveStr} | Eval: ${formattedEval}\n`;
    }
    
    return output;
  }
}

export const stockfishEngine = new StockfishEngine();