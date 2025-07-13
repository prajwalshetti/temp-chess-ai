import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { GameAnalyzer } from "@/components/GameAnalyzer";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import ChessPositionAnalysis from "./PositionAnalysis";

export default function GameAnalysis() {
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

  const convertMovesToString = (game: any): string => {
    if (!game || !game.moves) return "";
    return game.moves.join(" ");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800">
      <div className="container mx-auto p-6">
        {!showPgnUpload ? (
          /* Position Analysis with Upload Option */
          <div>
            {/* Upload Game Button */}
            <div className="mb-6 flex justify-end">
              <Button 
                onClick={() => setShowPgnUpload(true)}
                className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all transform hover:scale-105"
              >
                📄 Upload Game PGN
              </Button>
            </div>
            
            {/* Position Analysis Component */}
            <ChessPositionAnalysis />
          </div>
        ) : (
          /* PGN Upload View */
          <div>
            <div className="mb-6">
              <Button 
                onClick={handleBackToPositionAnalysis}
                variant="outline"
                className="px-6 py-3 rounded-xl border-2 border-slate-600 hover:border-slate-500 hover:bg-slate-700/50 font-semibold transition-all transform hover:scale-105 shadow-lg text-slate-200 bg-slate-800/50"
              >
                ← Back to Position Analysis
              </Button>
            </div>
            
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
          </div>
        )}

        {/* Game Analysis Modal */}
        <Dialog open={showAnalysisModal} onOpenChange={setShowAnalysisModal}>
          <DialogContent className="fixed inset-0 w-screen h-screen max-w-none max-h-none rounded-none p-6 m-0 bg-white overflow-hidden z-[9999] !left-0 !top-0 !right-0 !bottom-0 !transform-none !translate-x-0 !translate-y-0">
            {/* <DialogHeader>
              <DialogTitle>
                Game Analysis: {selectedGameForAnalysis?.whitePlayer} vs {selectedGameForAnalysis?.blackPlayer}
              </DialogTitle>
            </DialogHeader> */}
            
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
    </div>
  );
}