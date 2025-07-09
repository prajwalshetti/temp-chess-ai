import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Chessboard } from "react-chessboard";
import { useChess } from "@/hooks/use-chess";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { EvalChangeBadge } from "./EvalChangeBadge";
import { Chess } from "chess.js";

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
    bestLineSan?: string[]; // Added for best line SAN
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
  whiteEvalString?: string; // <-- Add this line

  blackSan?: string;
  blackEval?: number;
  blackBestMove?: string;
  blackCurrentBest?: string;
  blackNextBestSan?: string;
  blackNextBestUci?: string;
  blackEvalString?: string; // <-- Add this line

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
  const [exploreMode, setExploreMode] = useState(false);
  const [exploreFen, setExploreFen] = useState<string | null>(null);
  const [exploreEval, setExploreEval] = useState<number | string | null>(null);
  const [exploreEvalLoading, setExploreEvalLoading] = useState(false);
  const [exploreEvalError, setExploreEvalError] = useState<string | null>(null);
  const [exploreBestMoveUci, setExploreBestMoveUci] = useState<string | null>(null);
  // Add liveEval state for backend eval
  const [liveEval, setLiveEval] = useState<number | string | null>(null);
  // Add liveBestLine state for backend best line
  const [liveBestLine, setLiveBestLine] = useState<string[] | null>(null);
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

  // Helper to exit explore mode
  const exitExploreMode = () => {
    setExploreMode(false);
    setExploreFen(null);
    setExploreEval(null);
    setExploreEvalError(null);
    setExploreEvalLoading(false);
    setExploreBestMoveUci(null);
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (exploreMode) exitExploreMode();
      if (event.key === "ArrowLeft") {
        navigateToMove(Math.max(-1, currentMoveIndex - 1));
      } else if (event.key === "ArrowRight") {
        if (analysisResult && typeof analysisResult.totalMoves === 'number') {
          navigateToMove(Math.min(analysisResult.totalMoves - 1, currentMoveIndex + 1));
        }
      } else if(event.key ==="space") {
        toggleAutoPlay();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentMoveIndex, analysisResult, exploreMode]);

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
    exitExploreMode();
    if (!analysisResult) return;
    
    setCurrentMoveIndex(moveIndex);
    chess.goToMove(moveIndex);
  };

  const toggleAutoPlay = () => {
    exitExploreMode();
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
    const evalFromGame = analysisResult.moveEvaluations[currentMoveIndex.toString()];
    if (typeof evalFromGame === 'number' && (evalFromGame > 200 || evalFromGame < -200)) {
      // Use backend response
      if (exploreMode && exploreEval !== null && exploreFen) {
        let rawEval = null;
        if (typeof exploreEval === 'object' && exploreEval !== null && 'eval' in exploreEval) {
          rawEval = (exploreEval as any).eval;
        }
        if (typeof rawEval === 'number') {
          const fenParts = exploreFen.split(' ');
          const isBlackTurn = fenParts[1] === 'b';
          return isBlackTurn ? -rawEval : rawEval;
        } else if (typeof rawEval === 'string') {
          return rawEval; // Show mate strings like 'M1', 'M2', etc.
        } else {
          return null;
        }
      } else if (!exploreMode && liveEval !== null) {
        const fenParts = chess.fen.split(' ');
        const isBlackTurn = fenParts[1] === 'b';
        if (typeof liveEval === 'number') {
          return isBlackTurn ? -liveEval : liveEval;
        } else if (typeof liveEval === 'string') {
          return liveEval;
        } else {
          return null;
        }
      } else {
        return null;
      }
    }
    return evalFromGame;
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
            whiteNextBestUci: analysis.nextBestMoveUci,
            whiteEvalString: analysis.evaluation
          };
        } else if (analysis.turn === "Black" && whiteMove) {
          moves.push({
            ...whiteMove,
            blackSan: analysis.san,
            blackEval: analysis.evalFloat,
            blackBestMove: analysis.bestMove,
            blackCurrentBest: analysis.currentBestMoveSan,
            blackNextBestSan: analysis.nextBestMoveSan,
            blackNextBestUci: analysis.nextBestMoveUci,
            blackEvalString: analysis.evaluation
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

  const handleAnalyzePosition = () => {
    if (chess.fen) {
      localStorage.setItem('analyze_fen', chess.fen);
      window.open('/position', '_blank');
    }
  };

  // Handler for user move (explore mode)
  const handlePieceDrop = (sourceSquare: string, targetSquare: string, piece: string) => {
    if (!exploreMode) {
      setExploreMode(true);
    }
    const currentFen = exploreFen || chess.fen;
    const chessInstance = new Chess(currentFen);
    let move;
    try {
      move = chessInstance.move({ from: sourceSquare, to: targetSquare, promotion: 'q' });
    } catch (error) {
      return false;
    }
    if (move) {
      const newFen = chessInstance.fen();
      setExploreFen(newFen);
      setExploreEval(null);
      setExploreEvalError(null);
      setExploreEvalLoading(true);
      return true;
    }
    return false;
  };

  // Trigger backend evaluation when exploreFen changes in explore mode
  useEffect(() => {
    if (exploreMode && exploreFen) {
      setExploreEvalLoading(true);
      setExploreEvalError(null);
      setExploreEval(null);
      fetch('/api/analyze-position', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fen: exploreFen, depth: 15, timeLimit: 1000 }),
      })
        .then(async (response) => {
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Analysis failed');
          }
          return response.json();
        })
        .then((result) => {
          setExploreEval(result);
          setExploreBestMoveUci(result.uci_best_move);
        })
        .catch((err) => {
          setExploreEvalError(err.message || 'Error analyzing position');
        })
        .finally(() => {
          setExploreEvalLoading(false);
        });
    }
  }, [exploreFen, exploreMode]);

  // Add this after the state declarations and before the render logic
  useEffect(() => {
    if (!exploreMode) {
      const fen = chess.fen;
      if (!fen) return;
      setLiveEval(null); // Reset before fetching
      setLiveBestLine(null); // Reset best line
      fetch('/api/analyze-position', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fen, depth: 15, timeLimit: 1000 }),
      })
        .then(async (response) => {
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Analysis failed');
          }
          return response.json();
        })
        .then((result) => {
          if (typeof result.eval === 'number' || typeof result.eval === 'string') {
            setLiveEval(result.eval);
          } else {
            setLiveEval(null);
          }
          if (Array.isArray(result.san_best_line)) {
            setLiveBestLine(result.san_best_line);
          } else {
            setLiveBestLine(null);
          }
        })
        .catch(() => {
          setLiveEval(null);
          setLiveBestLine(null);
        });
    }
    // Only trigger when not in explore mode and FEN changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exploreMode, chess.fen]);

  // Show loading state while analyzing
  if (analyzeGameMutation.isPending) {
    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        <Card className="w-full max-w-2xl bg-slate-800/70 backdrop-blur-sm border-0 shadow-xl">
          <CardContent className="p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mx-auto mb-4"></div>
            <h3 className="text-lg font-semibold mb-2 text-slate-200">Analyzing Game...</h3>
            <p className="text-slate-400">Please wait while Stockfish analyzes your game</p>
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
    <div className={`grid grid-cols-1 lg:grid-cols-12 gap-4 ${className} min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 p-3`}>
      {/* Chess Board - Left side */}
      <div className="lg:col-span-7">
        <Card className="shadow-2xl border-0 bg-slate-800/90 backdrop-blur-md hover:shadow-3xl transition-all duration-300 overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700 text-white rounded-t-lg pb-4 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-purple-600/20"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between">
                <EvalChangeBadge
                  currentEvaluation={getCurrentEvaluation()}
                  evalChange={getCurrentEvalChange()}
                  isWhiteMove={currentMoveIndex % 2 === 0}
                />
                {/* Best line SAN display */}
                {(() => {
                  let bestLine: string[] | undefined = undefined;
                  if (exploreMode && exploreEval !== null && typeof exploreEval === 'object' && exploreEval !== null && 'san_best_line' in exploreEval) {
                    bestLine = (exploreEval as any).san_best_line;
                  } else if (!exploreMode && liveBestLine) {
                    bestLine = liveBestLine;
                  }
                  if (!bestLine && analysisResult && analysisResult.analysisResults && currentMoveIndex >= 0 && currentMoveIndex < analysisResult.analysisResults.length) {
                    bestLine = analysisResult.analysisResults[currentMoveIndex]?.bestLineSan;
                  }
                  if (bestLine && bestLine.length > 0) {
                    return (
                      <div className="mx-4 flex flex-wrap gap-1 text-sm font-mono text-slate-200 bg-slate-700/60 px-3 py-1 rounded-lg shadow-sm border border-slate-600/40">
                        {bestLine.map((move, idx) => (
                          <span key={idx}>{move}</span>
                        ))}
                      </div>
                    );
                  }
                  return <div className="mx-4" />;
                })()}
                <Badge variant="outline" className="text-xs bg-white/20 text-white border-white/30 px-3 py-1 shadow-lg backdrop-blur-sm">
                  <div className="flex items-center gap-1">
                    <div className="w-1.5 h-1.5 bg-blue-400 rounded-full"></div>
                    {currentMoveIndex === -1 ? "Starting Position" : `Move ${Math.floor(currentMoveIndex / 2) + 1}${currentMoveIndex % 2 === 0 ? "" : "..."}`}
                  </div>
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4 bg-gradient-to-br from-slate-800 to-slate-900">
            <div className="flex justify-center">
              {/* Enhanced Evaluation Bar */}
              {(() => {
                // Always use game analysis for eval bar and number
                let evalValue: number | string | null = getCurrentEvaluation();
                return (
                  <div className="flex flex-col items-center mr-4 space-y-3">
                    {/* Evaluation Score */}
                    <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white px-4 py-2 rounded-xl shadow-2xl border border-slate-600 relative overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-purple-600/20"></div>
                      <div className="relative z-10">
                        <div className="text-xs font-medium text-slate-300 text-center mb-1">Eval</div>
                        <div className="text-lg font-bold text-center">
                          {typeof evalValue === 'number'
                            ? `${evalValue >= 0 ? '+' : ''}${evalValue.toFixed(1)}`
                            : typeof evalValue === 'string'
                              ? evalValue
                              : '--'}
                        </div>
                      </div>
                    </div>
                    {/* Vertical Bar */}
                    <div className="relative w-8 h-64 bg-gradient-to-t from-slate-800 to-slate-700 rounded-2xl shadow-2xl border-2 border-slate-600 overflow-hidden">
                      {/* Gradient background */}
                      <div className="absolute inset-0 bg-gradient-to-t from-red-900/50 via-gray-800 to-green-900/50"></div>
                      {/* Fill based on evaluation */}
                      <div 
                        className="absolute bottom-0 w-full bg-gradient-to-t from-emerald-400 via-green-400 to-green-300 transition-all duration-700 ease-out shadow-lg"
                        style={{ height: `${typeof evalValue === 'number' ? Math.max(0, Math.min(100, (evalValue + 10) / 20 * 100)) : 50}%` }}
                      >
                        <div className="absolute inset-0 bg-gradient-to-t from-transparent to-white/20"></div>
                      </div>
                      {/* Center line */}
                      <div className="absolute left-0 right-0 top-1/2 h-1 bg-gradient-to-r from-transparent via-white to-transparent shadow-lg"></div>
                      {/* Markers */}
                      <div className="absolute left-0 right-0 top-1/4 h-0.5 bg-white/40"></div>
                      <div className="absolute left-0 right-0 top-3/4 h-0.5 bg-white/40"></div>
                    </div>
                  </div>
                );
              })()}
              
              <div className="rounded-2xl overflow-hidden shadow-2xl border-4 border-slate-600/50 bg-gradient-to-br from-slate-700 to-slate-800">
                <Chessboard 
                  position={exploreFen || chess.fen}
                  boardWidth={380}
                  arePiecesDraggable={true}
                  onPieceDrop={handlePieceDrop}
                  customArrows={(() => {
                    if (exploreMode && exploreEval !== null && typeof exploreEval !== 'undefined' && typeof exploreEval !== 'string' && exploreFen && typeof exploreEval !== 'undefined') {
                      // Try to get the best move arrow from the last analysis result
                      // We'll need to store the last analysis result (from the backend) in a state
                      // For now, let's use a new state: exploreBestMoveUci
                      if (exploreBestMoveUci && exploreBestMoveUci.length >= 4) {
                        return [[exploreBestMoveUci.slice(0, 2), exploreBestMoveUci.slice(2, 4)]];
                      }
                    }
                    if (from && to) return [[from, to]];
                    return [];
                  })()}
                /> 
              </div>
            </div>
            
            {/* Navigation Controls */}
            <div className="flex justify-center space-x-2 mt-4">
              <Button
                variant="outline"
                onClick={() => navigateToMove(-1)}
                disabled={currentMoveIndex === -1}
                size="sm"
                className="px-3 py-2 rounded-xl border-2 border-slate-600 bg-gradient-to-r from-slate-700 to-slate-800 hover:from-slate-600 hover:to-slate-700 hover:border-slate-500 hover:shadow-lg disabled:opacity-50 transition-all duration-200 text-slate-200"
              >
                ⏪
              </Button>
              <Button
                variant="outline"
                onClick={() => navigateToMove(Math.max(-1, currentMoveIndex - 1))}
                disabled={currentMoveIndex === -1}
                size="sm"
                className="px-3 py-2 rounded-xl border-2 border-slate-600 bg-gradient-to-r from-slate-700 to-slate-800 hover:from-slate-600 hover:to-slate-700 hover:border-slate-500 hover:shadow-lg disabled:opacity-50 transition-all duration-200 text-slate-200"
              >
                ⏮
              </Button>
              <Button
                variant="outline"
                onClick={toggleAutoPlay}
                size="sm"
                className={`px-4 py-2 rounded-xl border-2 font-medium transition-all duration-200 shadow-lg ${
                  isAutoPlaying 
                    ? "bg-gradient-to-r from-red-500 to-red-600 text-white border-red-400 hover:from-red-600 hover:to-red-700 hover:shadow-xl" 
                    : "border-green-500 bg-gradient-to-r from-green-700 to-green-800 hover:from-green-600 hover:to-green-700 hover:border-green-400 hover:shadow-xl text-green-200"
                }`}
              >
                {isAutoPlaying ? "⏸️" : "▶️"}
              </Button>
              <Button
                variant="outline"
                onClick={() => navigateToMove(Math.min(analysisResult.totalMoves - 1, currentMoveIndex + 1))}
                disabled={currentMoveIndex >= analysisResult.totalMoves - 1}
                size="sm"
                className="px-3 py-2 rounded-xl border-2 border-slate-600 bg-gradient-to-r from-slate-700 to-slate-800 hover:from-slate-600 hover:to-slate-700 hover:border-slate-500 hover:shadow-lg disabled:opacity-50 transition-all duration-200 text-slate-200"
              >
                ⏭
              </Button>
              <Button
                variant="outline"
                onClick={() => navigateToMove(analysisResult.totalMoves - 1)}
                disabled={currentMoveIndex >= analysisResult.totalMoves - 1}
                size="sm"
                className="px-3 py-2 rounded-xl border-2 border-slate-600 bg-gradient-to-r from-slate-700 to-slate-800 hover:from-slate-600 hover:to-slate-700 hover:border-slate-500 hover:shadow-lg disabled:opacity-50 transition-all duration-200 text-slate-200"
              >
                ⏩
              </Button>
            </div>
            
            {/* Auto-play speed controls */}
            <div className="flex justify-center items-center space-x-3 mt-3">
              <span className="text-sm font-semibold text-slate-200 bg-slate-700/80 px-2 py-1 rounded-lg shadow-sm">Speed:</span>
              <div className="flex space-x-1 bg-slate-700/80 rounded-xl p-1 shadow-lg">
                <Button
                  variant={autoPlaySpeed === 2000 ? "default" : "outline"}
                  onClick={() => setAutoPlaySpeed(2000)}
                  size="sm"
                  className={`px-3 py-1 text-sm rounded-lg font-medium transition-all duration-200 ${
                    autoPlaySpeed === 2000 
                      ? "bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-md" 
                      : "bg-slate-600 hover:bg-slate-500 border border-slate-500 hover:border-slate-400 text-slate-200"
                  }`}
                >
                  0.5x
                </Button>
                <Button
                  variant={autoPlaySpeed === 1000 ? "default" : "outline"}
                  onClick={() => setAutoPlaySpeed(1000)}
                  size="sm"
                  className={`px-3 py-1 text-sm rounded-lg font-medium transition-all duration-200 ${
                    autoPlaySpeed === 1000 
                      ? "bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-md" 
                      : "bg-slate-600 hover:bg-slate-500 border border-slate-500 hover:border-slate-400 text-slate-200"
                  }`}
                >
                  1x
                </Button>
                <Button
                  variant={autoPlaySpeed === 500 ? "default" : "outline"}
                  onClick={() => setAutoPlaySpeed(500)}
                  size="sm"
                  className={`px-3 py-1 text-sm rounded-lg font-medium transition-all duration-200 ${
                    autoPlaySpeed === 500 
                      ? "bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-md" 
                      : "bg-slate-600 hover:bg-slate-500 border border-slate-500 hover:border-slate-400 text-slate-200"
                  }`}
                >
                  2x
                </Button>
                <Button
                  variant={autoPlaySpeed === 250 ? "default" : "outline"}
                  onClick={() => setAutoPlaySpeed(250)}
                  size="sm"
                  className={`px-3 py-1 text-sm rounded-lg font-medium transition-all duration-200 ${
                    autoPlaySpeed === 250 
                      ? "bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-md" 
                      : "bg-slate-600 hover:bg-slate-500 border border-slate-500 hover:border-slate-400 text-slate-200"
                  }`}
                >
                  4x
                </Button>
                <Button
                onClick={handleAnalyzePosition}
                className="ml-2"
              >
                Try manual moves
              </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
  
      {/* Move Analysis - Right side */}
      <div className="lg:col-span-5">
  <Card className="h-full shadow-lg border-0 bg-slate-800/80 backdrop-blur-sm hover:shadow-xl transition-all duration-300 overflow-hidden">
    <CardHeader className="bg-gradient-to-r from-indigo-600 via-purple-500 to-pink-500 text-white rounded-t-lg pb-4">
      <CardTitle className="flex items-center gap-2 text-xl font-bold">
        <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center border border-white/25">
          📊
        </div>
        <div>
          <div>Move Analysis</div>
          <div className="text-sm text-white/80 font-normal">Engine evaluation & best moves</div>
        </div>
      </CardTitle>
    </CardHeader>

    <CardContent className="p-0 bg-slate-900">
    <div className="overflow-y-auto max-h-[32rem]">
    <div className="grid grid-cols-12 gap-1 items-center py-2 px-4 border-b border-slate-700 bg-slate-800 text-xs font-semibold text-slate-200 sticky top-0 z-10">
          <div className="col-span-1 text-center">#</div>
          <div className="col-span-2">White</div>
          <div className="col-span-1 text-right">Eval</div>
          <div className="col-span-2 text-center">Best</div>
          <div className="col-span-2">Black</div>
          <div className="col-span-1 text-right">Eval</div>
          <div className="col-span-3 text-center">Best</div>
        </div>

        {parseMoveData().map((move, idx) => (
          <div
            key={idx}
            className="grid grid-cols-12 gap-1 items-center py-2 px-4 text-sm border-b border-slate-700 hover:bg-slate-800 transition-all duration-200 group"
          >
            <div className="col-span-1 text-center text-slate-400">{move.moveNumber}</div>

            <div
              className={`col-span-2 font-mono text-sm font-medium cursor-pointer rounded-md px-2 py-1 transition-all duration-200 ${
                currentMoveIndex === idx * 2
                  ? 'bg-blue-600 text-white shadow-md scale-105'
                  : 'bg-slate-700 hover:bg-slate-600 border border-slate-600 hover:border-blue-400 text-slate-200'
              }`}
              onClick={() => navigateToMove(idx * 2)}
            >
              {move.whiteSan}
            </div>

            <div className="col-span-1 text-right font-mono text-slate-300 text-xs">{move.whiteEvalString && move.whiteEvalString[0]=='#'?'#M'+move.whiteEvalString.slice(1): formatEvaluation(move.whiteEval??0)}</div>

            <div className="col-span-2 text-center font-mono text-xs text-blue-300 bg-slate-700 rounded-md py-1">
              <div>{move.whiteCurrentBest || '--'}</div>
            </div>

            <div
              className={`col-span-2 font-mono text-sm font-medium cursor-pointer rounded-md px-2 py-1 transition-all duration-200 ${
                currentMoveIndex === idx * 2 + 1
                  ? 'bg-blue-600 text-white shadow-md scale-105'
                  : 'bg-slate-700 hover:bg-slate-600 border border-slate-600 hover:border-blue-400 text-slate-200'
              }`}
              onClick={() => move.blackSan && navigateToMove(idx * 2 + 1)}
            >
              {move.blackSan || '...'}
            </div>

            <div className="col-span-1 text-right font-mono text-slate-300 text-xs">{move.blackEvalString && move.blackEvalString[0]=='#'?'#M'+move.blackEvalString.slice(1): formatEvaluation(move.blackEval??0)}</div>


            <div className="col-span-3 text-center font-mono text-xs text-blue-300 bg-slate-700 rounded-md py-1">
              <div>{move.blackCurrentBest || '--'}</div>
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