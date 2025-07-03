import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ChessBoard } from "@/components/ChessBoard";
import { useChess } from "@/hooks/use-chess";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface AnalysisResult {
  pgn: string;
  mode: string;
  moveEvaluations: Record<string, number>;
  totalMoves: number;
  analysisLog: string;
}

export default function SimpleAnalysis() {
  const [pgnInput, setPgnInput] = useState("");
  const [analysisMode, setAnalysisMode] = useState<"fast" | "accurate">("accurate");
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [currentMoveIndex, setCurrentMoveIndex] = useState(0);
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
      // Load the game into the chess board
      chess.loadFromPgn(data.pgn);
      setCurrentMoveIndex(-1); // Start at beginning (before first move)
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
    // The evaluation is for the position after the move, so we use currentMoveIndex
    return analysisResult.moveEvaluations[currentMoveIndex.toString()];
  };

  const formatEvaluation = (evaluation: number) => {
    if (Math.abs(evaluation) > 100) {
      return evaluation > 0 ? `#${Math.ceil((evaluation - 100) / 10)}` : `#-${Math.ceil((100 - evaluation) / 10)}`;
    }
    return evaluation >= 0 ? `+${evaluation.toFixed(2)}` : evaluation.toFixed(2);
  };

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Simple Chess Analysis</h1>
        <p className="text-gray-600 mt-2">
          Clean Stockfish analysis just like your local script - shows evaluation after each move from White's perspective
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Section */}
        <Card>
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
                rows={8}
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

        {/* Chess Board */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Game Position
              {analysisResult && (
                <Badge variant="outline">
                  {currentMoveIndex === -1 ? "Starting Position" : `After Move ${currentMoveIndex + 1}`}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChessBoard 
              fen={chess.fen}
              size={400}
              interactive={false}
            />
            
            {getCurrentEvaluation() !== null && (
              <div className="mt-4 text-center">
                <div className="text-lg font-bold">
                  Evaluation: {formatEvaluation(getCurrentEvaluation()!)}
                </div>
                <div className="text-sm text-gray-600">
                  (White's perspective, after move)
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Analysis Results */}
      {analysisResult && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Analysis Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Move Navigation */}
              <div className="flex space-x-2 mb-4">
                <Button
                  variant="outline"
                  onClick={() => navigateToMove(-1)}
                  disabled={currentMoveIndex === -1}
                  size="sm"
                >
                  ⏪ Start
                </Button>
                <Button
                  variant="outline"
                  onClick={() => navigateToMove(Math.max(-1, currentMoveIndex - 1))}
                  disabled={currentMoveIndex === -1}
                  size="sm"
                >
                  ⏮ Previous
                </Button>
                <Button
                  variant="outline"
                  onClick={() => navigateToMove(Math.min(analysisResult.totalMoves - 1, currentMoveIndex + 1))}
                  disabled={currentMoveIndex >= analysisResult.totalMoves - 1}
                  size="sm"
                >
                  ⏭ Next
                </Button>
                <Button
                  variant="outline"
                  onClick={() => navigateToMove(analysisResult.totalMoves - 1)}
                  disabled={currentMoveIndex >= analysisResult.totalMoves - 1}
                  size="sm"
                >
                  ⏩ End
                </Button>
              </div>

              {/* Analysis Log */}
              {analysisResult.analysisLog && (
                <div>
                  <h3 className="font-semibold mb-2">Analysis Log:</h3>
                  <pre className="bg-gray-100 p-4 rounded text-sm font-mono overflow-auto max-h-60">
                    {analysisResult.analysisLog}
                  </pre>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}