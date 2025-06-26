import { spawn } from 'child_process';
import { Chess } from 'chess.js';

export class StockfishEngine {
  
  async analyzePosition(fen: string, depth = 15): Promise<number> {
    return new Promise((resolve, reject) => {
      const stockfish = spawn('stockfish');
      let evaluation = 0;
      let foundEvaluation = false;

      stockfish.stdout.on('data', (data) => {
        const output = data.toString();
        const lines = output.split('\n');
        
        for (const line of lines) {
          // Parse evaluation from UCI info lines at specified depth
          if (line.includes('info') && line.includes(`depth ${depth}`) && line.includes('cp ')) {
            const match = line.match(/cp (-?\d+)/);
            if (match) {
              evaluation = parseInt(match[1]);
              foundEvaluation = true;
            }
          }
          
          // Handle mate scores at specified depth
          if (line.includes('info') && line.includes(`depth ${depth}`) && line.includes('mate ')) {
            const match = line.match(/mate (-?\d+)/);
            if (match) {
              const mateIn = parseInt(match[1]);
              evaluation = mateIn > 0 ? 10000 : -10000;
              foundEvaluation = true;
            }
          }
          
          // When analysis is complete
          if (line.startsWith('bestmove')) {
            stockfish.kill();
            resolve(foundEvaluation ? evaluation : 0);
            return;
          }
        }
      });

      stockfish.stderr.on('data', (data) => {
        console.error('Stockfish error:', data.toString());
      });

      stockfish.on('close', () => {
        resolve(foundEvaluation ? evaluation : 0);
      });

      stockfish.on('error', (error) => {
        console.error('Failed to start Stockfish:', error);
        reject(error);
      });

      // Send UCI commands
      stockfish.stdin.write('uci\n');
      stockfish.stdin.write('isready\n');
      stockfish.stdin.write(`position fen ${fen}\n`);
      stockfish.stdin.write(`go depth ${depth}\n`);
      
      // Timeout after 10 seconds
      setTimeout(() => {
        stockfish.kill();
        resolve(foundEvaluation ? evaluation : 0);
      }, 10000);
    });
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