import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { GameAnalyzer } from "@/components/GameAnalyzer";
import { useToast } from "@/hooks/use-toast";

export default function GameAnalysis() {
  const [pgnInput, setPgnInput] = useState("");
  const [analysisMode, setAnalysisMode] = useState<"fast" | "accurate">("accurate");
  const [showAnalysis, setShowAnalysis] = useState(false);
  const { toast } = useToast();

  const handleAnalyze = () => {
    if (!pgnInput.trim()) {
      toast({
        title: "PGN Required",
        description: "Please enter a PGN to analyze",
        variant: "destructive"
      });
      return;
    }
    
    setShowAnalysis(true);
  };

  const handleNewAnalysis = () => {
    setShowAnalysis(false);
    setPgnInput("");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="container mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-900 to-blue-900 bg-clip-text text-transparent">
            Game Analysis
          </h1>
          <p className="text-slate-600 mt-3 text-lg">
            Professional Stockfish analysis with real-time evaluation tracking
          </p>
        </div>

        {!showAnalysis ? (
          /* Input Section - Enhanced with modern styling */
          <Card className="max-w-3xl mx-auto shadow-xl border-0 bg-white/70 backdrop-blur-sm">
            <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-t-lg">
              <CardTitle className="text-xl font-semibold flex items-center gap-2">
                <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                  ♘
                </div>
                Game Input
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8 space-y-6">
              <div>
                <label className="block text-sm font-semibold mb-3 text-slate-700">
                  PGN Notation:
                </label>
                <Textarea
                  value={pgnInput}
                  onChange={(e) => setPgnInput(e.target.value)}
                  placeholder="Paste your PGN here..."
                  rows={12}
                  className="font-mono text-sm border-2 border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 rounded-xl resize-none shadow-inner"
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold mb-3 text-slate-700">
                  Analysis Mode:
                </label>
                <div className="flex space-x-3">
                  <Button
                    variant={analysisMode === "fast" ? "default" : "outline"}
                    onClick={() => setAnalysisMode("fast")}
                    size="sm"
                    className={`px-4 py-2 rounded-lg font-medium transition-all ${
                      analysisMode === "fast" 
                        ? "bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg hover:shadow-xl" 
                        : "border-2 border-slate-200 hover:border-green-400 hover:bg-green-50"
                    }`}
                  >
                    ⚡ Fast (depth 12)
                  </Button>
                  <Button
                    variant={analysisMode === "accurate" ? "default" : "outline"}
                    onClick={() => setAnalysisMode("accurate")}
                    size="sm"
                    className={`px-4 py-2 rounded-lg font-medium transition-all ${
                      analysisMode === "accurate" 
                        ? "bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-lg hover:shadow-xl" 
                        : "border-2 border-slate-200 hover:border-blue-400 hover:bg-blue-50"
                    }`}
                  >
                    🔍 Accurate (0.5s per move)
                  </Button>
                </div>
              </div>

              <Button 
                onClick={handleAnalyze}
                disabled={!pgnInput.trim()}
                className="w-full h-12 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <>
                  <span className="mr-2">🚀</span>
                  Analyze Game
                </>
              </Button>
            </CardContent>
          </Card>
        ) : (
          /* Analysis View using reusable component */
          <div>
            <GameAnalyzer 
              pgn={pgnInput}
              mode={analysisMode}
              onAnalysisComplete={(result) => {
                console.log("Analysis completed:", result);
              }}
              onAnalysisError={(error) => {
                console.error("Analysis failed:", error);
              }}
            />
            
            {/* New Analysis Button */}
            <div className="mt-8 text-center">
              <Button 
                onClick={handleNewAnalysis}
                variant="outline"
                className="px-8 py-3 rounded-xl border-2 border-slate-300 hover:border-slate-400 hover:bg-slate-50 font-semibold transition-all transform hover:scale-105 shadow-lg"
              >
                ← New Analysis
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}