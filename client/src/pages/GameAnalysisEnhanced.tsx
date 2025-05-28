import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChessBoard } from "@/components/ChessBoard";
import { useChess } from "@/hooks/use-chess";
import { 
  Brain, 
  Target, 
  AlertTriangle, 
  TrendingDown, 
  Clock, 
  Zap,
  Eye,
  ChevronRight,
  Play,
  RotateCcw
} from "lucide-react";
import type { Game } from "@shared/schema";

export default function GameAnalysisEnhanced() {
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [currentAnalysisMove, setCurrentAnalysisMove] = useState(0);
  
  const { 
    fen, 
    moveHistory, 
    currentMoveIndex, 
    goToMove, 
    loadPosition,
    reset 
  } = useChess();

  const { data: games } = useQuery<Game[]>({
    queryKey: ["/api/games/user/1"],
  });

  // Enhanced analysis with detailed tactical insights
  const detailedAnalysis = selectedGame ? {
    overallScore: 78,
    phases: {
      opening: { score: 85, moves: 12, evaluation: "+0.3" },
      middlegame: { score: 72, moves: 28, evaluation: "+0.8" },
      endgame: { score: 45, moves: 15, evaluation: "-1.2" }
    },
    criticalMoments: [
      {
        moveNumber: 14,
        move: "Nxe4",
        type: "Blunder",
        severity: "critical",
        description: "Hangs the knight to a simple fork",
        betterMove: "Bxe4",
        evaluation: { before: "+0.5", after: "-2.1" },
        explanation: "After 14.Nxe4, Black can play 14...d5! forking the knight and bishop. The knight has no good squares and will be lost."
      },
      {
        moveNumber: 23,
        move: "Qc2",
        type: "Missed Tactic",
        severity: "moderate", 
        description: "Missed a winning fork with Nd5",
        betterMove: "Nd5",
        evaluation: { before: "+0.2", after: "+2.3" },
        explanation: "23.Nd5! attacks both the queen on c7 and the rook on f6. Black cannot save both pieces."
      },
      {
        moveNumber: 31,
        move: "Kf1",
        type: "Inaccuracy",
        severity: "minor",
        description: "King move loses tempo in critical position",
        betterMove: "Rf1",
        evaluation: { before: "-0.8", after: "-1.3" },
        explanation: "The rook move maintains better coordination and keeps defensive options open."
      }
    ],
    patternRecognition: {
      missedTactics: [
        { type: "Fork", instances: 2, positions: ["move 23", "move 37"] },
        { type: "Pin", instances: 1, positions: ["move 19"] },
        { type: "Discovered Attack", instances: 1, positions: ["move 29"] }
      ],
      goodMoves: [
        { type: "Tactical Shot", move: "17.Bxh7+", description: "Excellent sacrificial attack" },
        { type: "Positional Play", move: "26.f4", description: "Strong pawn advance creating space" }
      ]
    },
    timeManagement: {
      totalTime: 5400, // 90 minutes
      timeRemaining: 480, // 8 minutes
      timePerMove: 193, // average seconds
      criticalTimePoints: [
        { move: 25, timeLeft: 1200, evaluation: "Time pressure began affecting play quality" },
        { move: 35, timeLeft: 300, evaluation: "Severe time trouble, missed multiple tactics" }
      ]
    },
    openingAssessment: {
      name: "Sicilian Defense, Najdorf Variation",
      evaluation: "Well played opening phase",
      knowledge: 85,
      preparation: "Deep preparation until move 12",
      recommendations: [
        "Study the Be3 line more thoroughly",
        "Practice typical pawn structures in this opening"
      ]
    }
  } : null;

  const handleGameSelect = (game: Game) => {
    setSelectedGame(game);
    setCurrentAnalysisMove(0);
    // Reset board and load game
    reset();
    // Here you would load the actual game moves
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-500';
      case 'moderate': return 'bg-orange-500';
      case 'minor': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  const getSeverityIcon = (type: string) => {
    switch (type) {
      case 'Blunder': return <AlertTriangle className="h-4 w-4" />;
      case 'Missed Tactic': return <Target className="h-4 w-4" />;
      case 'Inaccuracy': return <TrendingDown className="h-4 w-4" />;
      default: return <Eye className="h-4 w-4" />;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Enhanced Game Analysis</h1>
        <p className="text-gray-600">Deep AI-powered insights into your chess games with tactical pattern recognition</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Games List */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Your Games</CardTitle>
            </CardHeader>
            <CardContent>
              {games && games.length > 0 ? (
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
                      <div className="text-xs text-gray-500">
                        {game.gameSource === 'offline' ? '🏆 Tournament' : '💻 Online'}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Brain className="mx-auto h-8 w-8 mb-2 opacity-50" />
                  <p className="text-sm">No games for analysis</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Main Analysis */}
        <div className="lg:col-span-3">
          {selectedGame && detailedAnalysis ? (
            <div className="space-y-6">
              {/* Game Overview */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Game Analysis: {selectedGame.whitePlayer} vs {selectedGame.blackPlayer}</span>
                    <Badge className="bg-chess-dark text-white">
                      Score: {detailedAnalysis.overallScore}/100
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">{detailedAnalysis.phases.opening.score}</div>
                      <div className="text-sm text-gray-600">Opening ({detailedAnalysis.phases.opening.moves} moves)</div>
                      <div className="text-xs text-green-600">{detailedAnalysis.phases.opening.evaluation}</div>
                    </div>
                    <div className="text-center p-4 bg-yellow-50 rounded-lg">
                      <div className="text-2xl font-bold text-yellow-600">{detailedAnalysis.phases.middlegame.score}</div>
                      <div className="text-sm text-gray-600">Middlegame ({detailedAnalysis.phases.middlegame.moves} moves)</div>
                      <div className="text-xs text-yellow-600">{detailedAnalysis.phases.middlegame.evaluation}</div>
                    </div>
                    <div className="text-center p-4 bg-red-50 rounded-lg">
                      <div className="text-2xl font-bold text-red-600">{detailedAnalysis.phases.endgame.score}</div>
                      <div className="text-sm text-gray-600">Endgame ({detailedAnalysis.phases.endgame.moves} moves)</div>
                      <div className="text-xs text-red-600">{detailedAnalysis.phases.endgame.evaluation}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Critical Moments */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <AlertTriangle className="mr-2 h-5 w-5 text-red-500" />
                    Critical Moments & Learning Opportunities
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {detailedAnalysis.criticalMoments.map((moment, index) => (
                      <div key={index} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center space-x-3">
                            <Badge className={getSeverityColor(moment.severity)}>
                              {getSeverityIcon(moment.type)}
                              <span className="ml-1">{moment.type}</span>
                            </Badge>
                            <div>
                              <div className="font-medium">Move {moment.moveNumber}: {moment.move}</div>
                              <div className="text-sm text-gray-600">{moment.description}</div>
                            </div>
                          </div>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => goToMove(moment.moveNumber - 1)}
                          >
                            <Play className="h-4 w-4 mr-1" />
                            View Position
                          </Button>
                        </div>
                        
                        <div className="bg-blue-50 border-l-4 border-blue-400 p-3 mb-3">
                          <div className="font-medium text-blue-900 mb-1">
                            Better: {moment.betterMove} 
                            <span className="ml-2 text-sm">
                              ({moment.evaluation.before} → {moment.evaluation.after})
                            </span>
                          </div>
                          <p className="text-blue-800 text-sm">{moment.explanation}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Tactical Pattern Recognition */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Brain className="mr-2 h-5 w-5 text-purple-500" />
                    Tactical Pattern Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Missed Tactics */}
                    <div>
                      <h4 className="font-medium text-red-600 mb-4">Missed Tactical Opportunities</h4>
                      <div className="space-y-3">
                        {detailedAnalysis.patternRecognition.missedTactics.map((tactic, index) => (
                          <div key={index} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                            <div>
                              <div className="font-medium text-gray-900">{tactic.type}</div>
                              <div className="text-sm text-red-600">
                                Missed {tactic.instances} time{tactic.instances > 1 ? 's' : ''}
                              </div>
                              <div className="text-xs text-gray-500">
                                Positions: {tactic.positions.join(', ')}
                              </div>
                            </div>
                            <Badge variant="destructive">{tactic.instances}</Badge>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Good Moves */}
                    <div>
                      <h4 className="font-medium text-green-600 mb-4">Excellent Moves</h4>
                      <div className="space-y-3">
                        {detailedAnalysis.patternRecognition.goodMoves.map((move, index) => (
                          <div key={index} className="p-3 bg-green-50 rounded-lg">
                            <div className="font-medium text-gray-900">{move.move}</div>
                            <div className="text-sm text-green-600">{move.type}</div>
                            <div className="text-xs text-gray-600 mt-1">{move.description}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Time Management Analysis */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Clock className="mr-2 h-5 w-5 text-blue-500" />
                    Time Management Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <div className="space-y-4">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Total Time Used:</span>
                          <span className="font-medium">
                            {Math.floor(detailedAnalysis.timeManagement.totalTime / 60)} minutes
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Time Remaining:</span>
                          <span className="font-medium text-red-600">
                            {Math.floor(detailedAnalysis.timeManagement.timeRemaining / 60)} minutes
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Avg Time/Move:</span>
                          <span className="font-medium">
                            {Math.round(detailedAnalysis.timeManagement.timePerMove)}s
                          </span>
                        </div>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-medium mb-3">Time Pressure Points</h4>
                      <div className="space-y-2">
                        {detailedAnalysis.timeManagement.criticalTimePoints.map((point, index) => (
                          <div key={index} className="text-sm p-2 bg-yellow-50 rounded">
                            <div className="font-medium">Move {point.move}: {Math.floor(point.timeLeft / 60)}min left</div>
                            <div className="text-yellow-700">{point.evaluation}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Opening Assessment */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Zap className="mr-2 h-5 w-5 text-orange-500" />
                    Opening Analysis: {detailedAnalysis.openingAssessment.name}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <div className="space-y-4">
                        <div>
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-gray-600">Knowledge Level</span>
                            <span className="font-medium">{detailedAnalysis.openingAssessment.knowledge}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-green-500 h-2 rounded-full" 
                              style={{ width: `${detailedAnalysis.openingAssessment.knowledge}%` }}
                            />
                          </div>
                        </div>
                        <div className="text-sm text-gray-600">
                          {detailedAnalysis.openingAssessment.preparation}
                        </div>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-medium mb-3">Study Recommendations</h4>
                      <ul className="space-y-2">
                        {detailedAnalysis.openingAssessment.recommendations.map((rec, index) => (
                          <li key={index} className="text-sm text-gray-600 flex items-start">
                            <ChevronRight className="h-4 w-4 mr-1 mt-0.5 text-chess-dark" />
                            {rec}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardContent className="text-center py-16">
                <Brain className="mx-auto h-16 w-16 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Select a Game for Deep Analysis</h3>
                <p className="text-gray-600">
                  Choose a game from your collection to see detailed tactical insights, 
                  missed opportunities, and personalized improvement recommendations.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}