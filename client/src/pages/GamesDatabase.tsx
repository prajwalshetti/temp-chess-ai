import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ChessBoard } from "@/components/ChessBoard";
import { useChess } from "@/hooks/use-chess";
import { parseGame, analyzePosition } from "@/lib/chess-utils";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  Upload, 
  Download, 
  SkipBack, 
  ChevronLeft, 
  ChevronRight, 
  SkipForward,
  Zap,
  Clock,
  Brain,
  Target,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Eye,
  BarChart3,
  Activity
} from "lucide-react";
import type { Game } from "@shared/schema";

export default function GamesDatabase() {
  const [pgnInput, setPgnInput] = useState("");
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { 
    fen, 
    moveHistory, 
    currentMoveIndex, 
    makeMove, 
    goToMove, 
    loadPosition,
    reset 
  } = useChess();

  const { data: games, isLoading } = useQuery<Game[]>({
    queryKey: ["/api/games/user/1"],
  });

  const uploadGameMutation = useMutation({
    mutationFn: async (gameData: any) => {
      return apiRequest("POST", "/api/games", gameData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/games/user/1"] });
      toast({
        title: "Success",
        description: "Game uploaded successfully",
      });
      setPgnInput("");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to upload game",
        variant: "destructive",
      });
    },
  });

  const handleUploadGame = () => {
    if (!pgnInput.trim()) {
      toast({
        title: "Error",
        description: "Please enter a PGN",
        variant: "destructive",
      });
      return;
    }

    const parsed = parseGame(pgnInput);
    if (!parsed.success) {
      toast({
        title: "Error",
        description: `Invalid PGN: ${parsed.error}`,
        variant: "destructive",
      });
      return;
    }

    const gameData = {
      userId: 1,
      whitePlayer: parsed.headers.White || "Unknown",
      blackPlayer: parsed.headers.Black || "Unknown",
      result: parsed.headers.Result || "1/2-1/2",
      opening: parsed.headers.Opening || "Unknown Opening",
      timeControl: parsed.headers.TimeControl || "Unknown",
      pgn: pgnInput,
      moves: parsed.moves,
      analysisData: analyzePosition(parsed.game.fen()),
    };

    uploadGameMutation.mutate(gameData);
  };

  const handleGameSelect = (game: Game) => {
    setSelectedGame(game);
    const parsed = parseGame(game.pgn);
    if (parsed.success) {
      reset();
      // Load the starting position and replay moves
      for (const move of game.moves) {
        makeMove(move);
      }
      // Go back to the beginning
      goToMove(-1);
    }
  };

  // Enhanced analysis for selected game
  const getGameAnalysis = (game: Game) => {
    if (!game) return null;
    
    const isPlayerWhite = game.whitePlayer === "ChessPlayer2023";
    const playerAccuracy = game.analysisData?.accuracy ? 
      (isPlayerWhite ? game.analysisData.accuracy.white : game.analysisData.accuracy.black) : 75;
    
    return {
      playerAccuracy,
      criticalMoments: [
        {
          moveNumber: 14,
          move: "Nxe4",
          type: "Blunder",
          severity: "critical",
          description: "Hangs the knight to a simple fork",
          betterMove: "Bxe4",
          evaluation: { before: "+0.5", after: "-2.1" },
          explanation: "After 14.Nxe4, Black can play 14...d5! forking the knight and bishop."
        },
        {
          moveNumber: 23,
          move: "Qc2",
          type: "Missed Tactic",
          severity: "moderate", 
          description: "Missed a winning fork with Nd5",
          betterMove: "Nd5",
          evaluation: { before: "+0.2", after: "+2.3" },
          explanation: "23.Nd5! attacks both the queen on c7 and the rook on f6."
        }
      ],
      tacticalInsights: {
        missedTactics: [
          { type: "Fork", instances: 2, positions: ["move 23", "move 37"] },
          { type: "Pin", instances: 1, positions: ["move 19"] }
        ],
        goodMoves: [
          { type: "Tactical Shot", move: "17.Bxh7+", description: "Excellent sacrificial attack" },
          { type: "Positional Play", move: "26.f4", description: "Strong pawn advance" }
        ]
      },
      openingAssessment: {
        name: game.opening || "Unknown Opening",
        evaluation: "Well prepared opening phase",
        depth: 12,
        accuracy: 89
      },
      gameInsight: game.result === "1-0" && isPlayerWhite ? "Victory through tactical superiority" :
                   game.result === "1-0" && !isPlayerWhite ? "Lost due to tactical oversights" :
                   game.result === "0-1" && isPlayerWhite ? "Tactical mistakes cost the game" :
                   game.result === "0-1" && !isPlayerWhite ? "Strong tactical play secured victory" :
                   "Hard-fought draw"
    };
  };

  const analysis = selectedGame?.analysisData;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Games Database</h1>
        <p className="text-gray-600">Upload, analyze, and learn from your chess games</p>
      </div>

      {/* Upload Section */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Upload New Game</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Textarea
              placeholder="Paste your PGN here..."
              value={pgnInput}
              onChange={(e) => setPgnInput(e.target.value)}
              className="min-h-32"
            />
            <Button 
              onClick={handleUploadGame}
              disabled={uploadGameMutation.isPending}
              className="bg-chess-dark hover:bg-chess-green"
            >
              <Upload className="mr-2 h-4 w-4" />
              {uploadGameMutation.isPending ? "Uploading..." : "Upload Game"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Games List */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Your Games</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-4">Loading games...</div>
              ) : games && games.length > 0 ? (
                <div className="space-y-2">
                  {games.map((game) => (
                    <div
                      key={game.id}
                      className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedGame?.id === game.id 
                          ? "bg-chess-light border-chess-dark" 
                          : "hover:bg-gray-50"
                      }`}
                      onClick={() => handleGameSelect(game)}
                    >
                      <div className="font-medium text-sm">{game.whitePlayer} vs {game.blackPlayer}</div>
                      <div className="text-xs text-gray-600">{game.result} • {game.opening}</div>
                      <div className="flex items-center justify-between mt-1">
                        <div className="text-xs text-gray-500">
                          {game.gameSource === 'offline' ? '🏆 Tournament' : '💻 Online'} • {new Date(game.uploadedAt).toLocaleDateString()}
                        </div>
                        {game.analysisData && (
                          <div className="flex items-center space-x-1">
                            <Brain className="h-3 w-3 text-blue-500" />
                            <span className="text-xs text-blue-600 font-medium">
                              {game.whitePlayer === "ChessPlayer2023" ? 
                                `${game.analysisData.accuracy?.white}%` : 
                                `${game.analysisData.accuracy?.black}%`}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Upload className="mx-auto h-8 w-8 mb-2 opacity-50" />
                  <p className="text-sm">No games uploaded yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Chess Board and Analysis */}
        <div className="lg:col-span-3">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Chess Board */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Game Analysis</CardTitle>
                    <div className="flex space-x-2">
                      <Button size="sm" className="bg-blue-500 hover:bg-blue-600">
                        <Zap className="mr-2 h-4 w-4" />
                        Analyze
                      </Button>
                      <Button size="sm" variant="outline">
                        <Download className="mr-2 h-4 w-4" />
                        Export
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-center mb-6">
                    <ChessBoard 
                      fen={fen}
                      onMove={makeMove}
                      size={400}
                      interactive={true}
                    />
                  </div>

                  {/* Game Navigation */}
                  <div className="flex items-center justify-between bg-gray-50 rounded-lg p-4">
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => goToMove(-1)}
                        disabled={currentMoveIndex <= -1}
                      >
                        <SkipBack className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => goToMove(currentMoveIndex - 1)}
                        disabled={currentMoveIndex <= -1}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => goToMove(currentMoveIndex + 1)}
                        disabled={currentMoveIndex >= moveHistory.length - 1}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => goToMove(moveHistory.length - 1)}
                        disabled={currentMoveIndex >= moveHistory.length - 1}
                      >
                        <SkipForward className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="text-sm text-gray-600 font-mono">
                      Move {currentMoveIndex + 1} of {moveHistory.length}
                    </div>
                    <div className="text-sm text-gray-600">
                      {currentMoveIndex >= 0 && (
                        <>
                          <span className="font-semibold">Last move:</span> {moveHistory[currentMoveIndex]}
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Analysis Panel */}
            <div className="space-y-6">
              {/* Engine Evaluation */}
              <Card>
                <CardHeader>
                  <CardTitle>Engine Evaluation</CardTitle>
                </CardHeader>
                <CardContent>
                  {analysis ? (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Position Score</span>
                        <span className={`font-semibold ${
                          analysis.evaluation > 0 ? 'text-green-600' : 
                          analysis.evaluation < 0 ? 'text-red-600' : 'text-gray-600'
                        }`}>
                          {analysis.evaluation > 0 ? '+' : ''}{analysis.evaluation?.toFixed(1) || '0.0'}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-chess-dark h-2 rounded-full transition-all" 
                          style={{ 
                            width: `${Math.min(Math.max((analysis.evaluation + 2) / 4 * 100, 0), 100)}%` 
                          }}
                        />
                      </div>
                      {analysis.bestMoves && (
                        <div className="text-sm text-gray-600">
                          <div className="font-medium mb-2">Best continuation:</div>
                          <div className="font-mono text-chess-dark">
                            {analysis.bestMoves.join(' ')}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-4 text-gray-500">
                      <Zap className="mx-auto h-8 w-8 mb-2 opacity-50" />
                      <p className="text-sm">Select a game to view analysis</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Move List */}
              <Card>
                <CardHeader>
                  <CardTitle>Move History</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="max-h-64 overflow-y-auto space-y-1">
                    {moveHistory.length > 0 ? (
                      moveHistory.map((move, index) => (
                        <div
                          key={index}
                          className={`flex items-center justify-between py-1 px-2 rounded cursor-pointer transition-colors ${
                            index === currentMoveIndex 
                              ? "bg-chess-light" 
                              : "hover:bg-gray-50"
                          }`}
                          onClick={() => goToMove(index)}
                        >
                          <span className="text-sm font-mono">
                            {Math.floor(index / 2) + 1}{index % 2 === 0 ? '.' : '...'} {move}
                          </span>
                          <Clock className="h-3 w-3 text-gray-400" />
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-4 text-gray-500 text-sm">
                        No moves to display
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Game Information */}
              {selectedGame && (
                <Card>
                  <CardHeader>
                    <CardTitle>Game Details</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">White:</span>
                        <span className="font-medium">{selectedGame.whitePlayer}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Black:</span>
                        <span className="font-medium">{selectedGame.blackPlayer}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Result:</span>
                        <span className="font-medium">{selectedGame.result}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Opening:</span>
                        <span className="font-medium">{selectedGame.opening}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Time Control:</span>
                        <span className="font-medium">{selectedGame.timeControl}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
