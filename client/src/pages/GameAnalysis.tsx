import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ChessBoard } from "@/components/ChessBoard";
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
  }>;
  totalMoves: number;
  analysisLog: string;
}

interface MoveResult {
  moveNumber: number;
  whiteSan: string;
  whiteEval: number;
  whiteBestMove?: string;
  blackSan?: string;
  blackEval?: number;
  blackBestMove?: string;
  comment?: string;
  category?: 'excellent' | 'good' | 'inaccuracy' | 'mistake' | 'blunder';
}

export default function GameAnalysis() {
  const [pgnInput, setPgnInput] = useState("");
  const [analysisMode, setAnalysisMode] = useState<"fast" | "accurate">("accurate");
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [currentMoveIndex, setCurrentMoveIndex] = useState(-1);
  const { toast } = useToast();
  
  const chess = useChess();

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
      toast({
        title: "Analysis Complete",
        description: `Game analyzed with ${data.totalMoves} moves in ${data.mode} mode`
      });
    },
    onError: (error: any) => {
      toast({
        title: "Analysis Failed",
        description: error.message || "Failed to analyze game",
        variant: "destructive"
      });
    }
  });

  const handleAnalyze = () => {
    if (!pgnInput.trim()) {
      toast({
        title: "PGN Required",
        description: "Please enter a PGN to analyze",
        variant: "destructive"
      });
      return;
    }
    
    analyzeGameMutation.mutate({ pgn: pgnInput, mode: analysisMode });
  };

  const navigateToMove = (moveIndex: number) => {
    if (!analysisResult) return;
    
    setCurrentMoveIndex(moveIndex);
    chess.goToMove(moveIndex);
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
    
    // Use new analysisResults if available, otherwise fall back to parsing log
    if (analysisResult.analysisResults && analysisResult.analysisResults.length > 0) {
      let whiteMove: { san: string; eval: number; bestMove: string } | null = null;
      
      for (const analysis of analysisResult.analysisResults) {
        if (analysis.turn === 'White') {
          whiteMove = { 
            san: analysis.san, 
            eval: analysis.evalFloat,
            bestMove: analysis.bestMove
          };
        } else if (analysis.turn === 'Black' && whiteMove) {
          moves.push({
            moveNumber: analysis.moveNumber,
            whiteSan: whiteMove.san,
            whiteEval: whiteMove.eval,
            whiteBestMove: whiteMove.bestMove,
            blackSan: analysis.san,
            blackEval: analysis.evalFloat,
            blackBestMove: analysis.bestMove
          });
          whiteMove = null;
        }
      }
      
      // Add final white move if exists
      if (whiteMove) {
        moves.push({
          moveNumber: moves.length + 1,
          whiteSan: whiteMove.san,
          whiteEval: whiteMove.eval,
          whiteBestMove: whiteMove.bestMove
        });
      }
    } else {
      // Fallback to parsing log (without best moves)
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
      
      // Add final white move if exists
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

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Game Analysis</h1>
        <p className="text-gray-600 mt-2">
          Clean Stockfish analysis showing evaluation after each move from White's perspective
        </p>
      </div>

      {!analysisResult ? (
        /* Input Section - Full width when no analysis */
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle>Game Input</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">PGN:</label>
              <Textarea
                value={pgnInput}
                onChange={(e) => setPgnInput(e.target.value)}
                placeholder="Paste your PGN here..."
                rows={12}
                className="font-mono text-sm"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Analysis Mode:</label>
              <div className="flex space-x-2">
                <Button
                  variant={analysisMode === "fast" ? "default" : "outline"}
                  onClick={() => setAnalysisMode("fast")}
                  size="sm"
                >
                  ⚡ Fast (depth 12)
                </Button>
                <Button
                  variant={analysisMode === "accurate" ? "default" : "outline"}
                  onClick={() => setAnalysisMode("accurate")}
                  size="sm"
                >
                  🔍 Accurate (0.5s per move)
                </Button>
              </div>
            </div>

            <Button 
              onClick={handleAnalyze}
              disabled={analyzeGameMutation.isPending || !pgnInput.trim()}
              className="w-full"
            >
              {analyzeGameMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                  Analyzing...
                </>
              ) : (
                "Analyze Game"
              )}
            </Button>
          </CardContent>
        </Card>
      ) : (
        /* Analysis View - Lichess-style layout */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Chess Board - Left side */}
          <div className="lg:col-span-7">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Badge variant="secondary" className="text-xs font-mono">
                      SF 16 • {analysisMode === "fast" ? "Depth 12" : "0.5s/move"}
                    </Badge>
                    {getCurrentEvaluation() !== null && (
                      <div className="text-xl font-bold">
                        {formatEvaluation(getCurrentEvaluation()!)}
                      </div>
                    )}
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {currentMoveIndex === -1 ? "Starting Position" : `Move ${Math.floor(currentMoveIndex / 2) + 1}${currentMoveIndex % 2 === 0 ? "" : "..."}`}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pb-3">
                <ChessBoard 
                  fen={chess.fen}
                  size={450}
                  interactive={false}
                />
                
                {/* Navigation Controls */}
                <div className="flex justify-center space-x-1 mt-4">
                  <Button
                    variant="outline"
                    onClick={() => navigateToMove(-1)}
                    disabled={currentMoveIndex === -1}
                    size="sm"
                    className="px-3"
                  >
                    ⏪
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => navigateToMove(Math.max(-1, currentMoveIndex - 1))}
                    disabled={currentMoveIndex === -1}
                    size="sm"
                    className="px-3"
                  >
                    ⏮
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => navigateToMove(Math.min(analysisResult.totalMoves - 1, currentMoveIndex + 1))}
                    disabled={currentMoveIndex >= analysisResult.totalMoves - 1}
                    size="sm"
                    className="px-3"
                  >
                    ⏭
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => navigateToMove(analysisResult.totalMoves - 1)}
                    disabled={currentMoveIndex >= analysisResult.totalMoves - 1}
                    size="sm"
                    className="px-3"
                  >
                    ⏩
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Move Analysis - Right side */}
          <div className="lg:col-span-5">
            <Card className="h-full">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Move Analysis</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="max-h-96 overflow-y-auto">
                  {/* Column headers */}
                  <div className="grid grid-cols-12 gap-1 items-center py-2 px-4 border-b-2 border-gray-200 bg-gray-50 text-xs font-semibold text-gray-700">
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
                      className="grid grid-cols-12 gap-1 items-center py-2 px-4 text-sm border-b border-gray-100"
                    >
                      <div className="col-span-1 text-xs text-gray-500 font-medium">
                        {move.moveNumber}
                      </div>
                      <div 
                        className={`col-span-2 font-mono text-sm font-medium cursor-pointer rounded px-2 py-1 transition-colors ${
                          currentMoveIndex === index * 2 ? 'bg-blue-500 text-white' : 'hover:bg-blue-100'
                        }`}
                        onClick={() => navigateToMove(index * 2)}
                      >
                        {move.whiteSan}
                      </div>
                      <div className="col-span-1 text-xs text-right font-mono text-gray-600">
                        {formatEvaluation(move.whiteEval)}
                      </div>
                      <div className="col-span-2 text-xs text-center font-mono text-blue-600">
                        {move.whiteBestMove || '--'}
                      </div>
                      <div 
                        className={`col-span-2 font-mono text-sm font-medium text-gray-800 cursor-pointer rounded px-2 py-1 transition-colors ${
                          currentMoveIndex === index * 2 + 1 ? 'bg-blue-500 text-white' : 'hover:bg-blue-100'
                        }`}
                        onClick={() => move.blackSan ? navigateToMove(index * 2 + 1) : undefined}
                      >
                        {move.blackSan || '...'}
                      </div>
                      <div className="col-span-1 text-xs text-right font-mono text-gray-600">
                        {move.blackEval ? formatEvaluation(move.blackEval) : ''}
                      </div>
                      <div className="col-span-3 text-xs text-center font-mono text-blue-600">
                        {move.blackBestMove || '--'}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      
      {/* New Analysis Button */}
      {analysisResult && (
        <div className="mt-6 text-center">
          <Button 
            onClick={() => {
              setAnalysisResult(null);
              setPgnInput("");
              setCurrentMoveIndex(-1);
            }}
            variant="outline"
            className="px-6"
          >
            ← New Analysis
          </Button>
        </div>
      )}
    </div>
  );
}