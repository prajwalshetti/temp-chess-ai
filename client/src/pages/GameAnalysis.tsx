import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { AlertTriangle, TrendingDown, TrendingUp, Target, Clock } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

// Simple text output interface matching Python code

export default function GameAnalysis() {
  const [pgn, setPgn] = useState("");
  const [analysisOutput, setAnalysisOutput] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const analyzeGameMutation = useMutation({
    mutationFn: async (gameData: { pgn: string }): Promise<string> => {
      const response = await fetch("/api/analyze/game", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(gameData),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to analyze game");
      }
      
      return response.text();
    },
    onSuccess: (data) => {
      setAnalysisOutput(data);
      setError(null);
    },
    onError: (error) => {
      setError(error.message);
      setAnalysisOutput(null);
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

      {error && (
        <Card className="border-red-200 dark:border-red-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
              <AlertTriangle className="w-5 h-5" />
              Analysis Error
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-600 dark:text-red-400">{error}</p>
          </CardContent>
        </Card>
      )}

      {analysisOutput && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Game Analysis Output
            </CardTitle>
            <CardDescription>
              Move-by-move analysis matching Python Stockfish format
            </CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="bg-gray-100 dark:bg-gray-900 p-4 rounded-lg font-mono text-sm whitespace-pre-wrap overflow-x-auto">
              {analysisOutput}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}