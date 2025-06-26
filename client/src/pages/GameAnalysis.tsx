import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { AlertTriangle, TrendingDown, TrendingUp, Target, Clock } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface MoveAnalysis {
  moveNumber: number;
  move: string;
  evaluation: number;
  label: string;
  bestMove: string;
  delta: number;
}

export default function GameAnalysis() {
  const [pgn, setPgn] = useState("");
  const [analysisData, setAnalysisData] = useState<MoveAnalysis[] | null>(null);

  const analyzeGameMutation = useMutation({
    mutationFn: async (gameData: { pgn: string }): Promise<MoveAnalysis[]> => {
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
          {/* Game Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Analysis Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center space-y-1">
                  <div className="text-2xl font-bold">{analysisData.length}</div>
                  <div className="text-sm text-muted-foreground">Total Moves</div>
                </div>
                <div className="text-center space-y-1">
                  <div className="text-2xl font-bold text-green-600">
                    {analysisData.filter(move => move.label === "Excellent Find").length}
                  </div>
                  <div className="text-sm text-muted-foreground">Excellent Finds</div>
                </div>
                <div className="text-center space-y-1">
                  <div className="text-2xl font-bold text-red-600">
                    {analysisData.filter(move => move.label === "Missed Tactic").length}
                  </div>
                  <div className="text-sm text-muted-foreground">Missed Tactics</div>
                </div>
                <div className="text-center space-y-1">
                  <div className="text-2xl font-bold">
                    {analysisData.filter(move => move.label === "Normal").length}
                  </div>
                  <div className="text-sm text-muted-foreground">Normal Moves</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Move-by-Move Analysis */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Move-by-Move Analysis
              </CardTitle>
              <CardDescription>
                Each move analyzed with evaluation and quality assessment
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {analysisData.map((move, index) => (
                  <div 
                    key={index} 
                    className={`flex items-center justify-between p-3 rounded-lg border ${getLabelColor(move.label)}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="text-sm text-muted-foreground w-8">
                        {move.moveNumber}.
                      </div>
                      <div className="font-mono font-semibold w-20">
                        {move.move}
                      </div>
                      <Badge 
                        variant={move.label === "Excellent Find" ? "default" : 
                                move.label === "Missed Tactic" ? "destructive" : "secondary"}
                        className="text-xs"
                      >
                        {move.label}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm">
                      <div className="text-muted-foreground">
                        Best: <span className="font-mono">{move.bestMove}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={getEvaluationColor(move.evaluation)}>
                          {formatEvaluation(move.evaluation)}
                        </span>
                      </div>
                      {Math.abs(move.delta) > 50 && (
                        <div className={move.delta > 0 ? "text-green-600 font-semibold" : "text-red-600 font-semibold"}>
                          {move.delta > 0 ? '+' : ''}{move.delta}
                        </div>
                      )}
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