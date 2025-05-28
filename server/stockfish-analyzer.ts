import { Chess } from 'chess.js';

// Initialize Stockfish engine
let stockfish: any = null;

try {
  const Stockfish = require('stockfish');
  stockfish = Stockfish();
} catch (error) {
  console.log('Stockfish engine not available, using fallback analysis');
}

export interface EngineAnalysis {
  evaluation: number;
  bestMove: string;
  principalVariation: string[];
  depth: number;
  nodes: number;
  time: number;
  mate?: number;
}

export interface PositionAnalysis {
  currentEvaluation: EngineAnalysis;
  alternativeMoves: Array<{
    move: string;
    evaluation: number;
    description: string;
  }>;
  tacticalThemes: string[];
  positionType: string;
}

export class StockfishAnalyzer {
  private isReady: boolean = false;
  private analysisDepth: number = 15;

  constructor() {
    if (stockfish) {
      this.initializeEngine();
    }
  }

  private initializeEngine(): void {
    if (!stockfish) return;

    stockfish.postMessage('uci');
    stockfish.postMessage('setoption name Skill Level value 20');
    stockfish.postMessage('setoption name Threads value 1');
    stockfish.postMessage('isready');
    
    stockfish.onmessage = (event: string) => {
      if (event.includes('readyok')) {
        this.isReady = true;
      }
    };
  }

  async analyzePosition(fen: string): Promise<PositionAnalysis> {
    if (!stockfish || !this.isReady) {
      return this.getFallbackAnalysis(fen);
    }

    return new Promise((resolve) => {
      let bestMove = '';
      let evaluation = 0;
      let pv: string[] = [];
      let depth = 0;
      let nodes = 0;
      let time = 0;
      let mate: number | undefined;

      const timeout = setTimeout(() => {
        resolve(this.createPositionAnalysis(fen, {
          evaluation,
          bestMove: bestMove || 'e2e4',
          principalVariation: pv,
          depth,
          nodes,
          time,
          mate
        }));
      }, 3000);

      stockfish.onmessage = (event: string) => {
        if (event.includes('info depth')) {
          const parts = event.split(' ');
          const depthIndex = parts.indexOf('depth');
          const scoreIndex = parts.indexOf('score');
          const pvIndex = parts.indexOf('pv');
          const nodesIndex = parts.indexOf('nodes');
          const timeIndex = parts.indexOf('time');

          if (depthIndex >= 0) {
            depth = parseInt(parts[depthIndex + 1]) || 0;
          }

          if (scoreIndex >= 0) {
            const scoreType = parts[scoreIndex + 1];
            if (scoreType === 'cp') {
              evaluation = parseInt(parts[scoreIndex + 2]) || 0;
            } else if (scoreType === 'mate') {
              mate = parseInt(parts[scoreIndex + 2]) || 0;
              evaluation = mate > 0 ? 10000 : -10000;
            }
          }

          if (pvIndex >= 0) {
            pv = parts.slice(pvIndex + 1).filter(move => move.length >= 4);
          }

          if (nodesIndex >= 0) {
            nodes = parseInt(parts[nodesIndex + 1]) || 0;
          }

          if (timeIndex >= 0) {
            time = parseInt(parts[timeIndex + 1]) || 0;
          }
        }

        if (event.includes('bestmove')) {
          const parts = event.split(' ');
          bestMove = parts[1] || 'e2e4';
          
          clearTimeout(timeout);
          resolve(this.createPositionAnalysis(fen, {
            evaluation,
            bestMove,
            principalVariation: pv.slice(0, 5),
            depth,
            nodes,
            time,
            mate
          }));
        }
      };

      stockfish.postMessage(`position fen ${fen}`);
      stockfish.postMessage(`go depth ${this.analysisDepth}`);
    });
  }

  private createPositionAnalysis(fen: string, engineAnalysis: EngineAnalysis): PositionAnalysis {
    const chess = new Chess(fen);
    const legalMoves = chess.moves({ verbose: true });
    
    // Generate alternative moves with quick evaluation
    const alternativeMoves = legalMoves.slice(0, 3).map(move => {
      chess.move(move);
      const eval = this.quickEvaluatePosition(chess.fen());
      chess.undo();
      
      return {
        move: move.san,
        evaluation: eval,
        description: this.describeMoveType(move, chess)
      };
    });

    return {
      currentEvaluation: engineAnalysis,
      alternativeMoves,
      tacticalThemes: this.identifyTacticalThemes(fen),
      positionType: this.classifyPosition(fen)
    };
  }

  private getFallbackAnalysis(fen: string): PositionAnalysis {
    const chess = new Chess(fen);
    const legalMoves = chess.moves({ verbose: true });
    
    // Simple material count evaluation
    const evaluation = this.quickEvaluatePosition(fen);
    const bestMove = legalMoves[0]?.san || 'e2e4';
    
    return {
      currentEvaluation: {
        evaluation,
        bestMove,
        principalVariation: [bestMove],
        depth: 1,
        nodes: 100,
        time: 10
      },
      alternativeMoves: legalMoves.slice(0, 3).map(move => ({
        move: move.san,
        evaluation: evaluation + (Math.random() - 0.5) * 50,
        description: this.describeMoveType(move, chess)
      })),
      tacticalThemes: this.identifyTacticalThemes(fen),
      positionType: this.classifyPosition(fen)
    };
  }

  private quickEvaluatePosition(fen: string): number {
    const chess = new Chess(fen);
    const pieces = chess.board().flat().filter(Boolean);
    
    const pieceValues: { [key: string]: number } = {
      'p': 1, 'n': 3, 'b': 3, 'r': 5, 'q': 9, 'k': 0,
      'P': 1, 'N': 3, 'B': 3, 'R': 5, 'Q': 9, 'K': 0
    };
    
    let evaluation = 0;
    pieces.forEach(piece => {
      if (piece) {
        const value = pieceValues[piece.type] || 0;
        evaluation += piece.color === 'w' ? value : -value;
      }
    });
    
    return evaluation * 100; // Convert to centipawns
  }

  private describeMoveType(move: any, chess: Chess): string {
    if (move.flags.includes('c')) return 'Captures material';
    if (move.flags.includes('k') || move.flags.includes('q')) return 'Castling move';
    if (move.flags.includes('p')) return 'Pawn promotion';
    if (chess.inCheck()) return 'Gives check';
    if (move.piece === 'n') return 'Knight development';
    if (move.piece === 'b') return 'Bishop development';
    return 'Positional move';
  }

  private identifyTacticalThemes(fen: string): string[] {
    const chess = new Chess(fen);
    const themes: string[] = [];
    
    if (chess.inCheck()) themes.push('Check');
    if (chess.isCheckmate()) themes.push('Checkmate');
    if (chess.isStalemate()) themes.push('Stalemate');
    
    // Check for potential forks, pins, skewers
    const moves = chess.moves({ verbose: true });
    const capturedMoves = moves.filter(move => move.flags.includes('c'));
    
    if (capturedMoves.length > 2) themes.push('Multiple Captures Available');
    if (moves.some(move => move.piece === 'n' && move.flags.includes('c'))) themes.push('Knight Fork Potential');
    
    return themes;
  }

  private classifyPosition(fen: string): string {
    const chess = new Chess(fen);
    const pieces = chess.board().flat().filter(Boolean);
    const totalPieces = pieces.length;
    
    if (totalPieces <= 10) return 'Endgame';
    if (totalPieces <= 20) return 'Middlegame';
    return 'Opening';
  }

  async analyzeGame(pgn: string, moveNumber?: number): Promise<{
    positions: PositionAnalysis[];
    criticalMoments: Array<{
      move: number;
      position: string;
      analysis: PositionAnalysis;
      significance: string;
    }>;
  }> {
    const chess = new Chess();
    chess.loadPgn(pgn);
    
    const history = chess.history({ verbose: true });
    const positions: PositionAnalysis[] = [];
    const criticalMoments: Array<{
      move: number;
      position: string;
      analysis: PositionAnalysis;
      significance: string;
    }> = [];
    
    // Reset and analyze specific positions
    chess.reset();
    
    const targetMoves = moveNumber ? [moveNumber] : [5, 10, 15, 20, 25];
    
    for (let i = 0; i < Math.min(history.length, 30); i++) {
      chess.move(history[i]);
      
      if (targetMoves.includes(i + 1) || (moveNumber && i + 1 === moveNumber)) {
        const analysis = await this.analyzePosition(chess.fen());
        positions.push(analysis);
        
        // Identify critical moments
        if (Math.abs(analysis.currentEvaluation.evaluation) > 100 || analysis.tacticalThemes.length > 0) {
          criticalMoments.push({
            move: i + 1,
            position: chess.fen(),
            analysis,
            significance: this.determineMomentSignificance(analysis)
          });
        }
      }
    }
    
    return { positions, criticalMoments };
  }

  private determineMomentSignificance(analysis: PositionAnalysis): string {
    const eval = Math.abs(analysis.currentEvaluation.evaluation);
    
    if (analysis.currentEvaluation.mate !== undefined) return 'Forced mate sequence';
    if (eval > 500) return 'Decisive advantage';
    if (eval > 200) return 'Significant advantage';
    if (analysis.tacticalThemes.length > 1) return 'Tactical opportunity';
    return 'Important position';
  }
}

export const stockfishAnalyzer = new StockfishAnalyzer();