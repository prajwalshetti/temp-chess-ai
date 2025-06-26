import { spawn } from 'child_process';
import { Chess } from 'chess.js';

export class StockfishEngine {
  
  async analyzePosition(fen: string, depth = 15): Promise<number> {
    return new Promise((resolve, reject) => {
      const stockfish = spawn('stockfish');
      let evaluation = 0;
      let output = '';

      stockfish.stdout.on('data', (data) => {
        output += data.toString();
        const lines = output.split('\n');
        
        for (const line of lines) {
          // Parse evaluation from UCI info lines
          if (line.includes('info') && line.includes('depth') && line.includes('cp ')) {
            const match = line.match(/cp (-?\d+)/);
            if (match) {
              evaluation = parseInt(match[1]);
            }
          }
          
          // Handle mate scores
          if (line.includes('info') && line.includes('depth') && line.includes('mate ')) {
            const match = line.match(/mate (-?\d+)/);
            if (match) {
              const mateIn = parseInt(match[1]);
              evaluation = mateIn > 0 ? 10000 : -10000;
            }
          }
          
          // When analysis is complete
          if (line.startsWith('bestmove')) {
            stockfish.kill();
            resolve(evaluation);
            return;
          }
        }
      });

      stockfish.stderr.on('data', (data) => {
        console.error('Stockfish error:', data.toString());
      });

      stockfish.on('close', (code) => {
        resolve(evaluation);
      });

      // Send UCI commands
      stockfish.stdin.write('uci\n');
      stockfish.stdin.write('isready\n');
      stockfish.stdin.write(`position fen ${fen}\n`);
      stockfish.stdin.write(`go depth ${depth}\n`);
      stockfish.stdin.write('quit\n');
      
      // Timeout after 10 seconds
      setTimeout(() => {
        stockfish.kill();
        reject(new Error('Stockfish analysis timeout'));
      }, 10000);
    });
  }

  private handleEngineOutput(line: string) {
    if (line === 'uciok') {
      this.isReady = true;
      this.processPendingCommands();
      return;
    }

    if (line.startsWith('info') && line.includes('depth')) {
      // Parse evaluation from info line
      const cpMatch = line.match(/cp (-?\d+)/);
      const mateMatch = line.match(/mate (-?\d+)/);
      
      if (cpMatch) {
        const centipawns = parseInt(cpMatch[1]);
        this.resolveLastCommand({ evaluation: centipawns });
      } else if (mateMatch) {
        const mateIn = parseInt(mateMatch[1]);
        const mateScore = mateIn > 0 ? 10000 : -10000;
        this.resolveLastCommand({ evaluation: mateScore });
      }
      return;
    }

    if (line.startsWith('bestmove ')) {
      const bestMove = line.split(' ')[1];
      this.resolveLastCommand({ bestMove });
      return;
    }
  }

  private resolveLastCommand(result: any) {
    const pending = this.pendingCommands.shift();
    if (pending) {
      pending.resolve(result);
    }
  }

  private sendCommand(command: string): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.engine || !this.isReady) {
        this.pendingCommands.push({ command, resolve, reject });
        return;
      }

      this.pendingCommands.push({ command, resolve, reject });
      this.engine.stdin?.write(command + '\n');
    });
  }

  private processPendingCommands() {
    const commands = [...this.pendingCommands];
    this.pendingCommands = [];
    
    for (const { command } of commands) {
      this.engine?.stdin?.write(command + '\n');
    }
  }

  async analyzePosition(fen: string, depth = 15): Promise<{ evaluation: number; bestMove?: string }> {
    if (!this.isReady) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    try {
      // Set position
      this.engine?.stdin?.write(`position fen ${fen}\n`);
      
      // Start analysis and wait for evaluation
      const analysisPromise = new Promise<{ evaluation: number; bestMove?: string }>((resolve, reject) => {
        this.pendingCommands.push({
          command: `go depth ${depth}`,
          resolve,
          reject
        });
        
        // Set a timeout to avoid hanging
        setTimeout(() => {
          reject(new Error('Analysis timeout'));
        }, 10000);
      });
      
      this.engine?.stdin?.write(`go depth ${depth}\n`);
      
      const result = await analysisPromise;
      return result;
    } catch (error) {
      console.error('Analysis error:', error);
      // Return fallback evaluation
      return { evaluation: 0, bestMove: 'e2e4' };
    }
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
      
      // Get Stockfish evaluation for current position
      const analysis = await this.analyzePosition(chess.fen(), depth);
      const evaluation = analysis.evaluation;
      
      // Convert centipawns to pawn units and format
      const evalInPawns = evaluation / 100;
      const formattedEval = evalInPawns >= 0 ? `+${evalInPawns.toFixed(2)}` : evalInPawns.toFixed(2);
      
      // Format output exactly like Python code
      const moveStr = move.san.padEnd(6);
      output += `${i + 1}. ${moveStr} | Eval: ${formattedEval}\n`;
    }
    
    return output;
  }

  close() {
    if (this.engine) {
      this.engine.kill();
      this.engine = null;
    }
  }
}

export const stockfishEngine = new StockfishEngine();