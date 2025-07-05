import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Chessboard } from "react-chessboard";
import { useChess } from "@/hooks/use-chess";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

interface AnalysisResult {
  pgn: string;
  mode: string;
  moveEvaluations: Record<string, number>;
  analysisResults?: Array<{
    moveNumber: number;
    turn: string;
    san: string;
    evaluation: string;
    evalFloat: number;
    bestMove: string;
    currentBestMoveSan?: string;
    nextBestMoveSan?: string;
    nextBestMoveUci?: string;
  }>;
  totalMoves: number;
  analysisLog: string;
}

interface MoveResult {
  moveNumber: number;
  whiteSan: string;
  whiteEval: number;
  whiteBestMove?: string;
  whiteCurrentBest?: string;
  whiteNextBestSan?: string;
  whiteNextBestUci?: string;

  blackSan?: string;
  blackEval?: number;
  blackBestMove?: string;
  blackCurrentBest?: string;
  blackNextBestSan?: string;
  blackNextBestUci?: string;

  comment?: string;
  category?: 'excellent' | 'good' | 'inaccuracy' | 'mistake' | 'blunder';
}

interface GameAnalyzerProps {
  pgn: string;
  mode?: "fast" | "accurate";
  onAnalysisComplete?: (result: AnalysisResult) => void;
  onAnalysisError?: (error: string) => void;
  className?: string;
}

// EvaluationBar component (inline)
function EvaluationBar({ evaluation }: { evaluation: number | null }) {
  // Clamp eval to [-10, 10] for bar display
  const minEval = -10, maxEval = 10;
  let percent = 50;
  if (typeof evaluation === 'number') {
    percent = Math.max(0, Math.min(100, 50 - (evaluation / (maxEval - minEval)) * 100));
  }
  return (
    <div className="flex flex-col items-center mr-4">
      <div className="relative h-[450px] w-6 bg-gradient-to-b from-white to-black rounded-xl border-2 border-slate-200 shadow-inner flex flex-col justify-between">
        {/* Marker */}
        <div
          className="absolute left-0 w-6 flex items-center justify-center"
          style={{ top: `calc(${percent}% - 10px)` }}
        >
          <div className="w-6 h-4 bg-blue-500 rounded-md shadow-lg border-2 border-white flex items-center justify-center">
            <span className="text-xs font-bold text-white drop-shadow-sm">
              {evaluation !== null ? (evaluation > 0 ? `+${evaluation.toFixed(1)}` : evaluation.toFixed(1)) : ''}
            </span>
          </div>
        </div>
        {/* Top/Bottom labels */}
        <div className="absolute left-0 top-1 w-6 text-center text-xs font-bold text-slate-700">W</div>
        <div className="absolute left-0 bottom-1 w-6 text-center text-xs font-bold text-slate-700">B</div>
      </div>
    </div>
  );
}

export function GameAnalyzer({ 
  pgn, 
  mode = "accurate", 
  onAnalysisComplete,
  onAnalysisError,
  className = ""
}: GameAnalyzerProps) {
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [currentMoveIndex, setCurrentMoveIndex] = useState(-1);
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);
  const [autoPlaySpeed, setAutoPlaySpeed] = useState(1000); // milliseconds
  const { toast } = useToast();
  const autoPlayIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const chess = useChess();

  useEffect(() => {
    console.log('Current move index:', currentMoveIndex);
    console.log('Current move:', parseMoveData()[currentMoveIndex]);
  }, [currentMoveIndex]);

  // Auto-play effect
  useEffect(() => {
    if (isAutoPlaying && analysisResult) {
      autoPlayIntervalRef.current = setInterval(() => {
        setCurrentMoveIndex(prev => {
          if (prev >= analysisResult.totalMoves - 1) {
            setIsAutoPlaying(false);
            return prev;
          }
          const nextMove = prev + 1;
          chess.goToMove(nextMove);
          return nextMove;
        });
      }, autoPlaySpeed);
    } else {
      if (autoPlayIntervalRef.current) {
        clearInterval(autoPlayIntervalRef.current);
        autoPlayIntervalRef.current = null;
      }
    }

    return () => {
      if (autoPlayIntervalRef.current) {
        clearInterval(autoPlayIntervalRef.current);
      }
    };
  }, [isAutoPlaying, autoPlaySpeed, analysisResult, chess]);

  const analyzeGameMutation = useMutation({
    mutationFn: async ({ pgn, mode }: { pgn: string; mode: string }): Promise<AnalysisResult> => {
      const response = await fetch(`/api/analyze/simple`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ pgn, mode })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Analysis failed");
      }
      
      return response.json();
    },
    onSuccess: (data: AnalysisResult) => {
      setAnalysisResult(data);
      chess.loadFromPgn(data.pgn);
      setCurrentMoveIndex(-1);
      setIsAutoPlaying(false);
      
      // Call the callback if provided
      onAnalysisComplete?.(data);
      
      toast({
        title: "Analysis Complete",
        description: `Game analyzed with ${data.totalMoves} moves in ${data.mode} mode`
      });
    },
    onError: (error: any) => {
      const errorMessage = error.message || "Failed to analyze game";
      
      // Call the error callback if provided
      onAnalysisError?.(errorMessage);
      
      toast({
        title: "Analysis Failed",
        description: errorMessage,
        variant: "destructive"
      });
    }
  });

  // Auto-analyze when PGN changes
  useEffect(() => {
    if (pgn.trim()) {
      analyzeGameMutation.mutate({ pgn: pgn.trim(), mode });
    }
  }, [pgn, mode]);

  const navigateToMove = (moveIndex: number) => {
    if (!analysisResult) return;
    
    setCurrentMoveIndex(moveIndex);
    chess.goToMove(moveIndex);
  };

  const toggleAutoPlay = () => {
    if (isAutoPlaying) {
      setIsAutoPlaying(false);
    } else {
      if (currentMoveIndex >= (analysisResult?.totalMoves || 0) - 1) {
        // If at the end, restart from beginning
        setCurrentMoveIndex(-1);
        chess.goToMove(-1);
      }
      setIsAutoPlaying(true);
    }
  };

  const getCurrentEvaluation = () => {
    if (!analysisResult || currentMoveIndex < 0) return null;
    return analysisResult.moveEvaluations[currentMoveIndex.toString()];
  };

  const formatEvaluation = (evaluation: number) => {
    if (Math.abs(evaluation) > 100) {
      return evaluation > 0 ? `#${Math.ceil((evaluation - 100) / 10)}` : `#-${Math.ceil((100 - evaluation) / 10)}`;
    }
    return evaluation >= 0 ? `+${evaluation.toFixed(1)}` : evaluation.toFixed(1);
  };

  // Parse analysis data into structured move data with best moves
  const parseMoveData = (): MoveResult[] => {
    if (!analysisResult) return [];

    const moves: MoveResult[] = [];
    if (analysisResult.analysisResults && analysisResult.analysisResults.length > 0) {
      let whiteMove: Partial<MoveResult> = {};

      for (const analysis of analysisResult.analysisResults) {
        if (analysis.turn === "White") {
          whiteMove = {
            moveNumber: analysis.moveNumber,
            whiteSan: analysis.san,
            whiteEval: analysis.evalFloat,
            whiteBestMove: analysis.bestMove,
            whiteCurrentBest: analysis.currentBestMoveSan,
            whiteNextBestSan: analysis.nextBestMoveSan,
            whiteNextBestUci: analysis.nextBestMoveUci
          };
        } else if (analysis.turn === "Black" && whiteMove) {
          moves.push({
            ...whiteMove,
            blackSan: analysis.san,
            blackEval: analysis.evalFloat,
            blackBestMove: analysis.bestMove,
            blackCurrentBest: analysis.currentBestMoveSan,
            blackNextBestSan: analysis.nextBestMoveSan,
            blackNextBestUci: analysis.nextBestMoveUci
          } as MoveResult);
          whiteMove = {};
        }
      }
      // Final move if only white played
      if (whiteMove && whiteMove.whiteSan) {
        moves.push(whiteMove as MoveResult);
      }
    } else {
      // Fallback to log parsing (older format)
      const lines = analysisResult.analysisLog.split('\n');
      let whiteMove: { san: string; eval: number } | null = null;
      for (const line of lines) {
        const moveMatch = line.match(/(White|Black) Move (\d+): (\S+)\s+\|\s+Eval after move: ([\+\-\#]?[\d\.]+)/);
        if (moveMatch) {
          const [, color, num, san, evalStr] = moveMatch;
          const evaluation = parseFloat(evalStr.replace('#', ''));
          if (color === 'White') {
            whiteMove = { san, eval: evaluation };
          } else if (color === 'Black' && whiteMove) {
            moves.push({
              moveNumber: parseInt(num),
              whiteSan: whiteMove.san,
              whiteEval: whiteMove.eval,
              blackSan: san,
              blackEval: evaluation
            });
            whiteMove = null;
          }
        }
      }
      if (whiteMove) {
        moves.push({
          moveNumber: moves.length + 1,
          whiteSan: whiteMove.san,
          whiteEval: whiteMove.eval
        });
      }
    }
    return moves;
  };

  function getBestMoveUci(): [string | null, string | null] {
    const boardIndex = Math.floor(currentMoveIndex / 2);
    const move = parseMoveData()[boardIndex];
    let uci: string | undefined = undefined;
    if (move) {
      uci = currentMoveIndex % 2 === 0 ? move.whiteNextBestUci : move.blackNextBestUci;
    }
    if (uci && uci.length >= 4) {
      return [uci.slice(0, 2), uci.slice(2, 4)];
    }
    return [null, null];
  }

  const [from, to] = getBestMoveUci();

  function getCurrentEvalChange(): number {
    const moves = parseMoveData();
    const boardIndex = Math.floor(currentMoveIndex / 2);
    const currmove = moves[boardIndex];
    if (!currmove) return 0;
    if (currentMoveIndex % 2 !== 0) {
      return (currmove.blackEval ?? 0) - (currmove.whiteEval ?? 0);
    } else {
      const prevmove = moves[boardIndex - 1];
      return (currmove.whiteEval ?? 0) - (prevmove?.blackEval ?? 0);
    }
  }

  // Show loading state while analyzing
  if (analyzeGameMutation.isPending) {
    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        <Card className="w-full max-w-2xl">
          <CardContent className="p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mx-auto mb-4"></div>
            <h3 className="text-lg font-semibold mb-2">Analyzing Game...</h3>
            <p className="text-slate-600">Please wait while Stockfish analyzes your game</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show error state
  if (analyzeGameMutation.isError) {
    return (
      <div className={`p-4 ${className}`}>
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-6 text-center">
            <h3 className="text-lg font-semibold text-red-800 mb-2">Analysis Failed</h3>
            <p className="text-red-600 mb-4">{analyzeGameMutation.error?.message}</p>
            <Button 
              onClick={() => analyzeGameMutation.mutate({ pgn: pgn.trim(), mode })}
              variant="outline"
            >
              Retry Analysis
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show analysis results
  if (!analysisResult) {
    return (
      <div className={`p-4 ${className}`}>
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-slate-600">No analysis data available</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={`grid grid-cols-1 lg:grid-cols-12 gap-8 ${className}`}>
      {/* Chess Board - Left side */}
      <div className="lg:col-span-7">
        <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader className="bg-gradient-to-r from-slate-800 to-slate-700 text-white rounded-t-lg pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Badge variant="secondary" className="text-xs font-mono bg-white/20 text-white border-0 px-3 py-1">
                  SF 16 • {mode === "fast" ? "Depth 12" : "0.5s/move"}
                </Badge>
                {/* Eval change badge */}
                <Badge variant="secondary" className="text-xs font-mono bg-white/20 text-white border-0 px-3 py-1">
                  {(() => {
                    const evalChange = getCurrentEvalChange();
                    const isWhiteMove = currentMoveIndex % 2 === 0;
                    if (Math.abs(evalChange) <= 0.1) {
                      return `Great move (${evalChange >= 0 ? '+' : ''}${evalChange.toFixed(2)})`;
                    }
                    if (Math.abs(evalChange) <= 0.3) {
                      return `Decent move (${evalChange >= 0 ? '+' : ''}${evalChange.toFixed(2)})`;
                    }
                    if (evalChange > 0) {
                      return isWhiteMove
                        ? `Good move (+${evalChange.toFixed(2)})`
                        : `Bad move (+${evalChange.toFixed(2)})`;
                    }
                    if (evalChange < 0) {
                      return isWhiteMove
                        ? `Bad move (${evalChange.toFixed(2)})`
                        : `Good move (${evalChange.toFixed(2)})`;
                    }
                    return `Good move (0)`;
                  })()}
                </Badge>
                {getCurrentEvaluation() !== null && (
                  <div className="text-2xl font-bold bg-white/10 rounded-lg px-4 py-2">
                    {formatEvaluation(getCurrentEvaluation()!)}
                  </div>
                )}
              </div>
              <Badge variant="outline" className="text-xs bg-white/10 text-white border-white/20">
                {currentMoveIndex === -1 ? "Starting Position" : `Move ${Math.floor(currentMoveIndex / 2) + 1}${currentMoveIndex % 2 === 0 ? "" : "..."}`}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-8">
            <div className="flex justify-center">
              {/* Enhanced Evaluation Bar */}
              {(() => {
                const evalValue = getCurrentEvaluation();
                return (
                  <div className="flex flex-col items-center mr-6 space-y-9">
                    {/* Evaluation Score */}
                    <div className="bg-slate-800 text-white px-4 py-2 rounded-lg shadow-lg border border-slate-600">
                      <div className="text-xs font-medium text-slate-300 text-center">Eval</div>
                      <div className="text-lg font-bold text-center">
                        {evalValue !== null ? `${evalValue >= 0 ? '+' : ''}${evalValue.toFixed(1)}` : '--'}
                      </div>
                    </div>
                    {/* Vertical Bar */}
                    <div className="relative w-8 h-64 bg-slate-700 rounded-full shadow-inner border border-slate-600 overflow-hidden">
                      {/* Fill based on evaluation */}
                      <div 
                        className="absolute bottom-0 w-full bg-gradient-to-t from-green-400 to-green-500 transition-all duration-500 ease-out"
                        style={{ height: `${evalValue !== null ? Math.max(0, Math.min(100, (evalValue + 10) / 20 * 100)) : 50}%` }}
                      ></div>
                      {/* Center line */}
                      <div className="absolute left-0 right-0 top-1/2 h-0.5 bg-gray-800"></div>
                    </div>
                  </div>
                );
              })()}
              
              <div className="rounded-xl overflow-hidden shadow-2xl">
                <Chessboard 
                  position={chess.fen}
                  boardWidth={450}
                  arePiecesDraggable={false}
                  customArrows={from && to ? [[from, to]] : []}
                />
              </div>
            </div>
            
            {/* Navigation Controls */}
            <div className="flex justify-center space-x-2 mt-6">
              <Button
                variant="outline"
                onClick={() => navigateToMove(-1)}
                disabled={currentMoveIndex === -1}
                size="sm"
                className="px-4 py-2 rounded-lg border-2 border-slate-200 hover:border-slate-400 hover:bg-slate-50 disabled:opacity-50"
              >
                ⏪
              </Button>
              <Button
                variant="outline"
                onClick={() => navigateToMove(Math.max(-1, currentMoveIndex - 1))}
                disabled={currentMoveIndex === -1}
                size="sm"
                className="px-4 py-2 rounded-lg border-2 border-slate-200 hover:border-slate-400 hover:bg-slate-50 disabled:opacity-50"
              >
                ⏮
              </Button>
              <Button
                variant="outline"
                onClick={toggleAutoPlay}
                size="sm"
                className={`px-4 py-2 rounded-lg border-2 font-medium transition-all ${
                  isAutoPlaying 
                    ? "bg-gradient-to-r from-red-500 to-red-600 text-white border-red-400 hover:from-red-600 hover:to-red-700" 
                    : "border-green-400 hover:border-green-500 hover:bg-green-50"
                }`}
              >
                {isAutoPlaying ? "⏸️" : "▶️"}
              </Button>
              <Button
                variant="outline"
                onClick={() => navigateToMove(Math.min(analysisResult.totalMoves - 1, currentMoveIndex + 1))}
                disabled={currentMoveIndex >= analysisResult.totalMoves - 1}
                size="sm"
                className="px-4 py-2 rounded-lg border-2 border-slate-200 hover:border-slate-400 hover:bg-slate-50 disabled:opacity-50"
              >
                ⏭
              </Button>
              <Button
                variant="outline"
                onClick={() => navigateToMove(analysisResult.totalMoves - 1)}
                disabled={currentMoveIndex >= analysisResult.totalMoves - 1}
                size="sm"
                className="px-4 py-2 rounded-lg border-2 border-slate-200 hover:border-slate-400 hover:bg-slate-50 disabled:opacity-50"
              >
                ⏩
              </Button>
            </div>
            
            {/* Auto-play speed controls */}
            <div className="flex justify-center items-center space-x-3 mt-4">
              <span className="text-sm font-medium text-slate-600">Speed:</span>
              <div className="flex space-x-2">
                <Button
                  variant={autoPlaySpeed === 2000 ? "default" : "outline"}
                  onClick={() => setAutoPlaySpeed(2000)}
                  size="sm"
                  className="px-3 py-1 text-xs rounded-md"
                >
                  0.5x
                </Button>
                <Button
                  variant={autoPlaySpeed === 1000 ? "default" : "outline"}
                  onClick={() => setAutoPlaySpeed(1000)}
                  size="sm"
                  className="px-3 py-1 text-xs rounded-md"
                >
                  1x
                </Button>
                <Button
                  variant={autoPlaySpeed === 500 ? "default" : "outline"}
                  onClick={() => setAutoPlaySpeed(500)}
                  size="sm"
                  className="px-3 py-1 text-xs rounded-md"
                >
                  2x
                </Button>
                <Button
                  variant={autoPlaySpeed === 250 ? "default" : "outline"}
                  onClick={() => setAutoPlaySpeed(250)}
                  size="sm"
                  className="px-3 py-1 text-xs rounded-md"
                >
                  4x
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Move Analysis - Right side */}
      <div className="lg:col-span-5">
        <Card className="h-full shadow-xl border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-t-lg pb-4">
            <CardTitle className="text-xl font-semibold flex items-center gap-2">
              <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                📊
              </div>
              Move Analysis
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-96 overflow-y-auto">
              {/* Column headers */}
              <div className="grid grid-cols-12 gap-1 items-center py-3 px-4 border-b-2 border-slate-200 bg-gradient-to-r from-slate-100 to-slate-50 text-xs font-bold text-slate-700">
                <div className="col-span-1">#</div>
                <div className="col-span-2">White</div>
                <div className="col-span-1 text-right">Eval</div>
                <div className="col-span-2 text-center">Best</div>
                <div className="col-span-2">Black</div>
                <div className="col-span-1 text-right">Eval</div>
                <div className="col-span-3 text-center">Best</div>
              </div>
              
              {parseMoveData().map((move, index) => (
                <div 
                  key={index} 
                  className="grid grid-cols-12 gap-1 items-center py-3 px-4 text-sm border-b border-slate-100 hover:bg-slate-50 transition-colors"
                >
                  <div className="col-span-1 text-xs text-slate-500 font-bold">
                    {move.moveNumber}
                  </div>
                  <div 
                    className={`col-span-2 font-mono text-sm font-semibold cursor-pointer rounded-lg px-3 py-2 transition-all ${
                      currentMoveIndex === index * 2 
                        ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-md' 
                        : 'hover:bg-blue-100 hover:shadow-sm'
                    }`}
                    onClick={() => navigateToMove(index * 2)}
                  >
                    {move.whiteSan}
                  </div>
                  <div className="col-span-1 text-xs text-right font-mono text-slate-600 font-medium">
                    {formatEvaluation(move.whiteEval)}
                  </div>
                  <div className="col-span-2 text-xs text-center font-mono text-blue-600 font-medium">
                    <div><span className="font-bold">Current:</span> {move.whiteCurrentBest || '--'}</div>
                    <div><span className="font-bold">Next:</span> {move.whiteNextBestUci || '--'}</div>
                  </div>
                  <div 
                    className={`col-span-2 font-mono text-sm font-semibold text-slate-800 cursor-pointer rounded-lg px-3 py-2 transition-all ${
                      currentMoveIndex === index * 2 + 1 
                        ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-md' 
                        : 'hover:bg-blue-100 hover:shadow-sm'
                    }`}
                    onClick={() => move.blackSan ? navigateToMove(index * 2 + 1) : undefined}
                  >
                    {move.blackSan || '...'}
                  </div>
                  <div className="col-span-1 text-xs text-right font-mono text-slate-600 font-medium">
                    {move.blackEval ? formatEvaluation(move.blackEval) : ''}
                  </div>
                  <div className="col-span-3 text-xs text-center font-mono text-blue-600 font-medium">
                    <div><span className="font-bold">Current:</span> {move.blackCurrentBest || '--'}</div>
                    <div><span className="font-bold">Next:</span> {move.blackNextBestUci || '--'}</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 