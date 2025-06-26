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
  pgn: string;
  totalMoves: number;
  moves: Array<{
    moveNumber: number;
    move: string;
    evalBefore: number;
    evalAfter: number;
    bestMove: string;
    isBlunder: boolean;
    evalDrop: number;
  }>;
  bigDrops: Array<{
    moveNumber: number;
    playedMove: string;
    bestMove: string;
    evalBefore: number;
    evalAfter: number;
    evalDrop: number;
  }>;
  blunders: number;
  accuracy: number;
}

export default function GameAnalysis() {
  const [pgn, setPgn] = useState("");
  const [analysisData, setAnalysisData] = useState<GameAnalysisData | null>(null);

  const analyzeGameMutation = useMutation({
    mutationFn: async (gameData: { pgn: string }) => {
      return apiRequest("/api/analyze/game", {
        method: "POST",
        body: JSON.stringify(gameData),
      });
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

  const formatEvaluation = (eval: number) => {
    if (Math.abs(eval) > 500) {
      return eval > 0 ? `+${(eval / 100).toFixed(1)}` : `${(eval / 100).toFixed(1)}`;
    }
    return eval > 0 ? `+${eval}` : `${eval}`;
  };

  const getEvaluationColor = (eval: number) => {
    if (eval > 200) return "text-green-600 dark:text-green-400";
    if (eval < -200) return "text-red-600 dark:text-red-400";
    return "text-yellow-600 dark:text-yellow-400";
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
                  <div className="text-2xl font-bold">{analysisData.totalMoves}</div>
                  <div className="text-sm text-muted-foreground">Total Moves</div>
                </div>
                <div className="text-center space-y-1">
                  <div className="text-2xl font-bold text-red-600">{analysisData.blunders}</div>
                  <div className="text-sm text-muted-foreground">Blunders</div>
                </div>
                <div className="text-center space-y-1">
                  <div className="text-2xl font-bold text-green-600">{analysisData.accuracy}%</div>
                  <div className="text-sm text-muted-foreground">Accuracy</div>
                </div>
                <div className="text-center space-y-1">
                  <div className="text-2xl font-bold">{analysisData.bigDrops.length}</div>
                  <div className="text-sm text-muted-foreground">Major Errors</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Significant Blunders */}
          {analysisData.bigDrops.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                  Major Evaluation Drops (200+ centipawns)
                </CardTitle>
                <CardDescription>
                  Critical moments where better moves were available
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analysisData.bigDrops.map((drop, index) => (
                    <div key={index} className="border rounded-lg p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant="destructive">Move {drop.moveNumber}</Badge>
                          <span className="font-mono font-semibold">{drop.playedMove}</span>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-muted-foreground">Evaluation Drop</div>
                          <div className="font-bold text-red-600">-{drop.evalDrop}</div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <div>
                          <span className="text-muted-foreground">Best move: </span>
                          <span className="font-mono font-semibold text-green-600">{drop.bestMove}</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <span>
                            {formatEvaluation(drop.evalBefore)} → {formatEvaluation(drop.evalAfter)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Move-by-Move Analysis */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Move-by-Move Analysis
              </CardTitle>
              <CardDescription>
                Detailed evaluation of each move in the game
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {analysisData.moves.map((move, index) => (
                  <div 
                    key={index} 
                    className={`flex items-center justify-between p-3 rounded-lg border ${
                      move.isBlunder ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800' : 
                      'bg-gray-50 dark:bg-gray-900/50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="text-sm text-muted-foreground w-8">
                        {move.moveNumber}.
                      </div>
                      <div className="font-mono font-semibold w-16">
                        {move.move}
                      </div>
                      {move.isBlunder && (
                        <Badge variant="destructive" className="text-xs">
                          Blunder
                        </Badge>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm">
                      <div className="text-muted-foreground">
                        Best: <span className="font-mono">{move.bestMove}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={getEvaluationColor(move.evalBefore)}>
                          {formatEvaluation(move.evalBefore)}
                        </span>
                        <TrendingDown className="w-3 h-3 text-muted-foreground" />
                        <span className={getEvaluationColor(move.evalAfter)}>
                          {formatEvaluation(move.evalAfter)}
                        </span>
                      </div>
                      {move.evalDrop > 50 && (
                        <div className="text-red-600 font-semibold">
                          -{move.evalDrop}
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