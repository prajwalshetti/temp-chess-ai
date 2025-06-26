import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { AlertTriangle, TrendingDown, TrendingUp, Target, Clock } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface GameAnalysisData {
  moves: Array<{
    moveNumber: number;
    move: string;
    evaluation: number;
    accuracy: number;
    phase: string;
    bestMove: string;
    insights: string[];
  }>;
  positionEval: number;
  accuracy: number;
  phase: string;
}

export default function GameAnalysis() {
  const [pgn, setPgn] = useState("");
  const [analysisData, setAnalysisData] = useState<GameAnalysisData | null>(null);

  const analyzeGameMutation = useMutation({
    mutationFn: async (gameData: { pgn: string }): Promise<GameAnalysisData> => {
      const response = await fetch("/api/analyze/game", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(gameData),
      });
      
      if (!response.ok) {
        throw new Error("Failed to analyze game");
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      setAnalysisData(data);
    },
  });

  const handleAnalyze = () => {
    if (pgn.trim()) {
      analyzeGameMutation.mutate({ pgn: pgn.trim() });
    }
  };

  const formatEvaluation = (evalValue: number) => {
    return evalValue > 0 ? `+${evalValue.toFixed(1)}` : `${evalValue.toFixed(1)}`;
  };

  const getEvaluationColor = (evalValue: number) => {
    if (evalValue > 2) return "text-green-600 dark:text-green-400";
    if (evalValue < -2) return "text-red-600 dark:text-red-400";
    return "text-yellow-600 dark:text-yellow-400";
  };

  const getLabelColor = (label: string) => {
    switch (label) {
      case "Excellent Find": return "text-green-600 bg-green-50 dark:bg-green-900/20";
      case "Missed Tactic": return "text-red-600 bg-red-50 dark:bg-red-900/20";
      default: return "text-gray-600 bg-gray-50 dark:bg-gray-900/20";
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">Stockfish Game Analysis</h1>
        <p className="text-muted-foreground">
          Deep analysis of your chess games using authentic Stockfish evaluation
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5" />
            Game Input
          </CardTitle>
          <CardDescription>
            Paste your game in PGN format for detailed move-by-move analysis
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            placeholder="1. e4 e5 2. Nf3 Nc6 3. Bb5 a6..."
            value={pgn}
            onChange={(e) => setPgn(e.target.value)}
            rows={6}
            className="font-mono text-sm"
          />
          <Button 
            onClick={handleAnalyze} 
            disabled={!pgn.trim() || analyzeGameMutation.isPending}
            className="w-full"
          >
            {analyzeGameMutation.isPending ? "Analyzing..." : "Analyze Game"}
          </Button>
        </CardContent>
      </Card>

      {analysisData && (
        <div className="space-y-6">
          {/* Position Analysis Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5" />
                Position Analysis
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-6">
                <div className="text-center space-y-2">
                  <div className="text-sm text-muted-foreground">Position Eval</div>
                  <div className={`text-2xl font-bold ${getEvaluationColor(analysisData.positionEval)}`}>
                    {formatEvaluation(analysisData.positionEval)}
                  </div>
                </div>
                <div className="text-center space-y-2">
                  <div className="text-sm text-muted-foreground">Accuracy</div>
                  <div className="text-2xl font-bold text-blue-600">
                    {analysisData.accuracy}%
                  </div>
                </div>
                <div className="text-center space-y-2">
                  <div className="text-sm text-muted-foreground">Phase</div>
                  <div className="text-2xl font-bold">
                    {analysisData.phase}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* AI Insights & Analysis */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                AI Insights & Analysis
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {analysisData.moves
                  .filter(move => move.insights.length > 0)
                  .map((move, index) => (
                    <div key={index} className="border-l-4 border-green-500 pl-4 py-2">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-semibold">Move {move.moveNumber}</span>
                        <Badge variant="outline" className="text-xs">
                          {move.accuracy}% accuracy
                        </Badge>
                      </div>
                      {move.insights.map((insight, i) => (
                        <div key={i} className="text-sm text-muted-foreground">
                          {insight}
                        </div>
                      ))}
                    </div>
                  ))
                }
              </div>
            </CardContent>
          </Card>

          {/* Move-by-Move Analysis */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Move Analysis
              </CardTitle>
              <CardDescription>
                Detailed evaluation of each move with accuracy and phase
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {analysisData.moves.map((move, index) => (
                  <div 
                    key={index} 
                    className="flex items-center justify-between p-3 rounded-lg border bg-gray-50 dark:bg-gray-900/50"
                  >
                    <div className="flex items-center gap-4">
                      <div className="text-sm text-muted-foreground w-8">
                        {move.moveNumber}.
                      </div>
                      <div className="font-mono font-semibold w-16">
                        {move.move}
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {move.phase}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm">
                      <div className="text-muted-foreground">
                        Best: <span className="font-mono">{move.bestMove}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span>Eval:</span>
                        <span className={getEvaluationColor(move.evaluation)}>
                          {formatEvaluation(move.evaluation)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span>Accuracy:</span>
                        <span className="font-semibold text-blue-600">
                          {move.accuracy}%
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}