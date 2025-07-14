import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { GameAnalyzer } from "@/components/GameAnalyzer";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import ChessPositionAnalysis from "./PositionAnalysis";

// Add type for mode
const MODES = ["board-editor", "analysis-board", "game-upload"] as const;
type AnalysisMode = typeof MODES[number];

export default function GameAnalysis() {
  // Mode state
  const [mode, setMode] = useState<AnalysisMode>("board-editor");

  // PGN upload state (existing)
  const [pgnInput, setPgnInput] = useState("");
  const [analysisType, setAnalysisType] = useState<"fast" | "accurate">("accurate");
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);
  const [showPgnUpload, setShowPgnUpload] = useState(false);
  const { toast } = useToast();

  const handleAnalyzeGame = () => {
    if (!pgnInput.trim()) {
      toast({
        title: "PGN Required",
        description: "Please enter a PGN to analyze",
        variant: "destructive"
      });
      return;
    }
    setShowAnalysisModal(true);
  };

  const handleBackToPositionAnalysis = () => {
    setShowPgnUpload(false);
    setPgnInput("");
    setShowAnalysisModal(false);
  };

  // Render toggles and the correct mode/component
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800">
      <div className="container mx-auto p-6">
        {/* Mode Toggle Buttons */}
        <div className="mb-8 flex justify-center">
          <div className="bg-slate-800 p-2 rounded-xl shadow-2xl border border-slate-700">
            <div className="flex space-x-2">
              <button
                onClick={() => setMode("board-editor")}
                className={`px-6 py-3 rounded-lg font-semibold transition-all duration-300 shadow-lg ${
                  mode === "board-editor"
                    ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-xl"
                    : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                }`}
              >
                🎨 Board Editor
              </button>
              <button
                onClick={() => setMode("analysis-board")}
                className={`px-6 py-3 rounded-lg font-semibold transition-all duration-300 shadow-lg ${
                  mode === "analysis-board"
                    ? "bg-gradient-to-r from-green-500 to-green-600 text-white shadow-xl"
                    : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                }`}
              >
                ♟️ Analysis Board
              </button>
              <button
                onClick={() => setMode("game-upload")}
                className={`px-6 py-3 rounded-lg font-semibold transition-all duration-300 shadow-lg ${
                  mode === "game-upload"
                    ? "bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-xl"
                    : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                }`}
              >
                📄 Game Upload
              </button>
            </div>
          </div>
        </div>

        {/* Render the selected mode */}
        {mode === "board-editor" && (
          <ChessPositionAnalysis mode="board-editor" />
        )}
        {mode === "analysis-board" && (
          <ChessPositionAnalysis mode="analysis-board" />
        )}
        {mode === "game-upload" && (
          <div>
            <Card className="max-w-3xl mx-auto shadow-xl border-0 bg-slate-800/70 backdrop-blur-sm">
              <CardHeader className="bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-t-lg">
                <CardTitle className="text-xl font-semibold flex items-center gap-2">
                  <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                    📄
                  </div>
                  Upload Game PGN
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8 space-y-6">
                <div>
                  <label className="block text-sm font-semibold mb-3 text-slate-200">
                    PGN Notation:
                  </label>
                  <Textarea
                    value={pgnInput}
                    onChange={(e) => setPgnInput(e.target.value)}
                    placeholder="Paste your PGN here..."
                    rows={12}
                    className="font-mono text-sm border-2 border-slate-600 focus:border-green-500 focus:ring-2 focus:ring-green-500/50 rounded-xl resize-none shadow-inner bg-slate-700 text-slate-200 placeholder-slate-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-3 text-slate-200">
                    Analysis Mode:
                  </label>
                  <div className="flex space-x-3">
                    <Button
                      variant={analysisType === "fast" ? "default" : "outline"}
                      onClick={() => setAnalysisType("fast")}
                      size="sm"
                      className={`px-4 py-2 rounded-lg font-medium transition-all ${
                        analysisType === "fast" 
                          ? "bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-lg hover:shadow-xl hover:from-green-700 hover:to-emerald-700" 
                          : "border-2 border-slate-600 hover:border-green-400 hover:bg-green-900/30 text-slate-200 bg-slate-700/50"
                      }`}
                    >
                      ⚡ Fast (depth 12)
                    </Button>
                    <Button
                      variant={analysisType === "accurate" ? "default" : "outline"}
                      onClick={() => setAnalysisType("accurate")}
                      size="sm"
                      className={`px-4 py-2 rounded-lg font-medium transition-all ${
                        analysisType === "accurate" 
                          ? "bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-lg hover:shadow-xl hover:from-green-700 hover:to-emerald-700" 
                          : "border-2 border-slate-600 hover:border-green-400 hover:bg-green-900/30 text-slate-200 bg-slate-700/50"
                      }`}
                    >
                      🔍 Accurate (0.5s per move)
                    </Button>
                  </div>
                </div>
                <Button 
                  onClick={handleAnalyzeGame}
                  disabled={!pgnInput.trim()}
                  className="w-full h-12 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <>
                    <span className="mr-2">🚀</span>
                    Analyze Game
                  </>
                </Button>
              </CardContent>
            </Card>
            {/* Game Analysis Modal */}
            <Dialog open={showAnalysisModal} onOpenChange={setShowAnalysisModal}>
              <DialogContent className="fixed inset-0 w-screen h-screen max-w-none max-h-none rounded-none p-6 m-0 bg-white overflow-hidden z-[9999] !left-0 !top-0 !right-0 !bottom-0 !transform-none !translate-x-0 !translate-y-0">
                {pgnInput && (
                  <div className="flex-1 overflow-auto mt-1">
                    <h1>        Game Analysis: Uploaded PGN
                    </h1>
                    <GameAnalyzer
                      pgn={pgnInput}
                      mode={analysisType}
                      onAnalysisComplete={(result) => {
                        console.log("Game analysis completed:", result);
                      }}
                      onAnalysisError={(error) => {
                        console.error("Game analysis failed:", error);
                      }}
                      className="h-full"
                    />
                  </div>
                )}
              </DialogContent>
            </Dialog>
          </div>
        )}
      </div>
    </div>
  );
}