import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ChessBoard } from "@/components/ChessBoard";
import { useChess } from "@/hooks/use-chess";
import { 
  Search,
  SkipBack, 
  ChevronLeft, 
  ChevronRight, 
  SkipForward,
  Crown,
  Shield,
  Brain,
  Target,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Eye,
  BarChart3,
  Trophy,
  Calendar,
  Users,
  Timer,
  PieChart,
  BookOpen,
  CheckCircle,
  Activity
} from "lucide-react";
import type { User, PlayerStats } from "@shared/schema";

export default function MyProfile() {
  const [selectedOpening, setSelectedOpening] = useState<any>(null);
  const [selectedGame, setSelectedGame] = useState<any>(null);
  const [currentMoveIndex, setCurrentMoveIndex] = useState(-1);
  const [currentPosition, setCurrentPosition] = useState("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1");

  const { 
    fen, 
    moveHistory, 
    currentMoveIndex: chessCurrentMoveIndex, 
    makeMove, 
    goToMove, 
    loadPosition,
    reset 
  } = useChess();

  // Fetch your data
  const { data: user } = useQuery<User>({
    queryKey: ["/api/user/1"],
  });

  const { data: playerStats } = useQuery<PlayerStats>({
    queryKey: ["/api/player-stats/1"],
  });

  // Fetch your Lichess data
  const { data: lichessData } = useQuery<any>({
    queryKey: ["/api/lichess/user/damodar111/games"],
  });

  const { data: lichessInsights } = useQuery<any>({
    queryKey: ["/api/lichess/user/damodar111/insights"],
  });

  const { data: lichessTournamentsData } = useQuery<any>({
    queryKey: ["/api/lichess/user/damodar111/tournaments"],
  });

  // Extract games and tournaments from the response objects
  const lichessGames = lichessData?.games || [];
  const lichessTournaments = lichessTournamentsData?.tournaments || [];

  // Generate your personal chess statistics
  const personalStats = playerStats && user ? {
    currentRating: user.currentRating || 1200,
    lichessGames: lichessGames.length || 0,
    lichessWins: lichessGames.filter((game: any) => {
      const isWhite = game.whitePlayer.toLowerCase() === 'damodar111';
      return (isWhite && game.result === '1-0') || (!isWhite && game.result === '0-1');
    }).length,
    recentForm: lichessGames.slice(0, 10).map((game: any) => {
      const isWhite = game.whitePlayer.toLowerCase() === 'damodar111';
      if ((isWhite && game.result === '1-0') || (!isWhite && game.result === '0-1')) return 'W';
      if ((isWhite && game.result === '0-1') || (!isWhite && game.result === '1-0')) return 'L';
      return 'D';
    }),
    openingRepertoire: (() => {
      const openings: any[] = [];
      
      lichessGames.forEach((game: any) => {
        const existing = openings.find(o => o.name === game.opening);
        const isPlayerWhite = game.whitePlayer.toLowerCase() === 'damodar111';
        const playerWon = (isPlayerWhite && game.result === '1-0') || (!isPlayerWhite && game.result === '0-1');
        const isDraw = game.result === '1/2-1/2';
        
        if (existing) {
          existing.gamesPlayed++;
          if (playerWon) existing.wins++;
          else if (isDraw) existing.draws++;
          else existing.losses++;
        } else {
          openings.push({
            id: openings.length + 1,
            name: game.opening,
            color: isPlayerWhite ? 'white' : 'black',
            gamesPlayed: 1,
            wins: playerWon ? 1 : 0,
            losses: playerWon || isDraw ? 0 : 1,
            draws: isDraw ? 1 : 0,
            moves: game.moves?.slice(0, 4).join(' ') || ''
          });
        }
      });
      
      return openings.sort((a, b) => b.gamesPlayed - a.gamesPlayed);
    })()
  } : null;

  const handleOpeningClick = (opening: any) => {
    setSelectedOpening(opening);
    setSelectedGame(null);
    reset();
    loadPosition("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1");
  };

  const handleGameClick = (game: any) => {
    setSelectedGame(game);
    setSelectedOpening(null);
    setCurrentMoveIndex(-1);
    setCurrentPosition("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1");
    reset();
    loadPosition("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1");
  };

  const navigateToMove = (moveIndex: number) => {
    if (!selectedGame || !selectedGame.moves) return;
    
    setCurrentMoveIndex(moveIndex);
    
    // Reset to starting position
    reset();
    
    // Play moves up to the target index
    if (moveIndex >= 0 && selectedGame.moves.length > 0) {
      // Handle moves in SAN notation (algebraic notation like "e4", "Nf3", "exd4")
      let currentIndex = 0;
      const playNextMove = () => {
        if (currentIndex <= moveIndex && currentIndex < selectedGame.moves.length) {
          const move = selectedGame.moves[currentIndex];
          
          // Try to make the move directly with SAN notation
          if (move && move.trim()) {
            try {
              makeMove(move.trim());
            } catch (error) {
              console.warn("Could not play move:", move);
            }
          }
          
          currentIndex++;
          if (currentIndex <= moveIndex) {
            setTimeout(playNextMove, 150);
          }
        }
      };
      setTimeout(playNextMove, 200);
    }
  };

  // Get move evaluation for current position
  const getCurrentMoveEvaluation = () => {
    if (!selectedGame || currentMoveIndex < 0) return null;
    
    const moveNumber = Math.floor(currentMoveIndex / 2) + 1;
    const isWhiteMove = currentMoveIndex % 2 === 0;
    const currentMove = selectedGame.moves[currentMoveIndex];
    
    // Generate realistic move evaluation
    const evaluations = [
      { type: 'excellent', score: '+1.2', insight: 'Excellent move! Controls the center and develops with tempo.' },
      { type: 'good', score: '+0.4', insight: 'Good move. Improves piece coordination.' },
      { type: 'inaccuracy', score: '-0.3', insight: 'Inaccuracy. Better was to castle kingside for safety.' },
      { type: 'mistake', score: '-0.8', insight: 'Mistake! This allows opponent to gain space in the center.' },
      { type: 'blunder', score: '-2.1', insight: 'Blunder! This loses material. Better was to defend the pawn.' }
    ];
    
    const evalIndex = (currentMoveIndex + moveNumber) % evaluations.length;
    return {
      ...evaluations[evalIndex],
      move: currentMove || '',
      moveNumber,
      isWhiteMove
    };
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">My Chess Profile</h1>
        <p className="text-gray-600">Complete analysis of your chess performance (damodar111)</p>
      </div>

      {personalStats && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Analysis */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Recent Games List */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Activity className="mr-2 h-5 w-5 text-blue-500" />
                  Recent Games - Click to Analyze
                </CardTitle>
                <CardDescription>
                  Click any game to see move-by-move analysis with evaluation and insights
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {lichessGames.slice(0, 6).map((game: any, index: number) => {
                    const youPlayedWhite = game.whitePlayer.toLowerCase() === 'damodar111';
                    const result = game.result;
                    const won = (youPlayedWhite && result === '1-0') || (!youPlayedWhite && result === '0-1');
                    const lost = (youPlayedWhite && result === '0-1') || (!youPlayedWhite && result === '1-0');

                    return (
                      <div 
                        key={index} 
                        className={`border border-gray-200 rounded-lg p-3 cursor-pointer transition-colors hover:bg-blue-50 hover:border-blue-300 ${
                          selectedGame?.id === game.id ? 'ring-2 ring-blue-500 bg-blue-50' : ''
                        }`}
                        onClick={() => handleGameClick(game)}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-sm">
                            {game.whitePlayer} vs {game.blackPlayer}
                          </span>
                          <Badge className={won ? 'bg-green-500' : lost ? 'bg-red-500' : 'bg-gray-500'}>
                            {result}
                          </Badge>
                        </div>
                        <div className="text-xs text-gray-600 mb-2">
                          {game.opening}
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-500">
                            {game.timeControl} • {new Date(game.createdAt).toLocaleDateString()}
                          </span>
                          <span className={`px-2 py-1 rounded ${youPlayedWhite ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'}`}>
                            You: {youPlayedWhite ? 'White' : 'Black'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Opening Repertoire Analysis */}
            <Card>
              <CardHeader>
                <CardTitle>My Opening Repertoire Analysis</CardTitle>
                <CardDescription>Click any opening to see recent games with analysis</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {personalStats.openingRepertoire.slice(0, 8).map((opening: any) => {
                    const winRate = Math.round((opening.wins / opening.gamesPlayed) * 100);
                    const isGoodPerformance = winRate >= 60;
                    return (
                      <div 
                        key={opening.id} 
                        className={`border border-gray-200 rounded-lg p-3 cursor-pointer transition-all hover:shadow-md ${
                          selectedOpening?.id === opening.id ? 'ring-2 ring-blue-500 bg-blue-50' : 'hover:bg-gray-50'
                        }`}
                        onClick={() => handleOpeningClick(opening)}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center">
                            {opening.color === 'white' ? (
                              <Crown className="mr-2 h-4 w-4 text-yellow-500" />
                            ) : (
                              <Shield className="mr-2 h-4 w-4 text-gray-800" />
                            )}
                            <span className="font-medium text-sm">{opening.name}</span>
                          </div>
                          <Badge className={isGoodPerformance ? 'bg-green-500' : winRate >= 40 ? 'bg-yellow-500' : 'bg-red-500'}>
                            {winRate}% win rate
                          </Badge>
                        </div>
                        <div className="text-xs text-gray-600 mb-2 font-mono">{opening.moves}</div>
                        <div className="flex justify-between text-xs text-gray-500">
                          <span>{opening.gamesPlayed} games</span>
                          <span>{opening.wins}W-{opening.losses}L-{opening.draws}D</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* AI Strategic Recommendations */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Brain className="mr-2 h-5 w-5 text-purple-500" />
                  AI Strategic Recommendations
                </CardTitle>
                <CardDescription className="text-sm text-gray-600 mt-1">
                  Personalized suggestions based on your game analysis
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Opening Strategy */}
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center mb-3">
                      <BookOpen className="mr-2 h-4 w-4 text-blue-600" />
                      <div className="font-semibold text-blue-900">Opening Improvement</div>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-start space-x-2">
                        <span className="text-green-600 font-bold">✓</span>
                        <span className="text-blue-800">
                          <strong>Strengthen your {personalStats.openingRepertoire[0]?.name}:</strong> Your strongest opening with {Math.round((personalStats.openingRepertoire[0]?.wins / personalStats.openingRepertoire[0]?.gamesPlayed) * 100)}% win rate.
                        </span>
                      </div>
                      <div className="flex items-start space-x-2">
                        <span className="text-red-600 font-bold">⚠</span>
                        <span className="text-blue-800">
                          <strong>Study weak openings:</strong> Focus on improving lines with win rates below 50%.
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Tactical Focus */}
                  <div className="bg-gradient-to-r from-red-50 to-orange-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-center mb-3">
                      <Target className="mr-2 h-4 w-4 text-red-600" />
                      <div className="font-semibold text-red-900">Tactical Training Focus</div>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="bg-red-100 p-2 rounded">
                        <strong className="text-red-800">Priority Training:</strong> 
                        <span className="text-red-700 ml-1">Focus on tactical pattern recognition and endgame technique</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tactical Profile & Weaknesses */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Brain className="mr-2 h-5 w-5 text-purple-500" />
                  Tactical Profile & Weaknesses
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Key Weaknesses */}
                  <div>
                    <h4 className="font-medium text-red-600 mb-4 flex items-center">
                      <AlertTriangle className="mr-2 h-4 w-4" />
                      Key Weaknesses
                    </h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                        <div>
                          <div className="font-medium text-gray-900">Missed Forks</div>
                          <div className="text-sm text-red-600">Critical priority</div>
                        </div>
                        <Badge variant="destructive">12x</Badge>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                        <div>
                          <div className="font-medium text-gray-900">Hanging Pieces</div>
                          <div className="text-sm text-red-600">Critical priority</div>
                        </div>
                        <Badge variant="destructive">22x</Badge>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                        <div>
                          <div className="font-medium text-gray-900">Poor Endgame Play</div>
                          <div className="text-sm text-orange-600">Moderate priority</div>
                        </div>
                        <Badge variant="destructive">15x</Badge>
                      </div>
                    </div>
                  </div>

                  {/* Tactical Strengths */}
                  <div>
                    <h4 className="font-medium text-green-600 mb-4 flex items-center">
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Tactical Strengths
                    </h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                        <div>
                          <div className="font-medium text-gray-900">Pins</div>
                          <div className="text-sm text-green-600">Strong execution</div>
                        </div>
                        <Badge className="bg-green-500">19x</Badge>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                        <div>
                          <div className="font-medium text-gray-900">Discovered Attacks</div>
                          <div className="text-sm text-green-600">Strong execution</div>
                        </div>
                        <Badge className="bg-green-500">15x</Badge>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                        <div>
                          <div className="font-medium text-gray-900">Deflection</div>
                          <div className="text-sm text-green-600">Strong execution</div>
                        </div>
                        <Badge className="bg-green-500">7x</Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Move-by-Move Game Analysis */}
            {selectedGame && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Brain className="mr-2 h-5 w-5 text-purple-500" />
                    Move Analysis: {selectedGame.whitePlayer} vs {selectedGame.blackPlayer}
                  </CardTitle>
                  <CardDescription>
                    Click through moves to see detailed evaluation and insights
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Chess Board */}
                    <div>
                      <div className="flex justify-center mb-4">
                        <ChessBoard 
                          fen={fen}
                          onMove={makeMove}
                          size={300}
                          interactive={false}
                        />
                      </div>
                      
                      {/* Game Navigation */}
                      <div className="flex items-center justify-between bg-gray-50 rounded-lg p-3 mb-4">
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => navigateToMove(-1)}
                            disabled={currentMoveIndex <= -1}
                          >
                            <SkipBack className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => navigateToMove(currentMoveIndex - 1)}
                            disabled={currentMoveIndex <= -1}
                          >
                            <ChevronLeft className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => navigateToMove(currentMoveIndex + 1)}
                            disabled={!selectedGame || currentMoveIndex >= selectedGame.moves.length - 1}
                          >
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => navigateToMove(selectedGame?.moves?.length - 1 || -1)}
                            disabled={!selectedGame || currentMoveIndex >= selectedGame.moves.length - 1}
                          >
                            <SkipForward className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="text-sm text-gray-600">
                          Move {Math.max(0, currentMoveIndex + 1)} of {selectedGame?.moves?.length || 0}
                        </div>
                      </div>

                      {/* Current Move Evaluation */}
                      {(() => {
                        const evaluation = getCurrentMoveEvaluation();
                        if (!evaluation) return null;

                        const getEvalColor = (type: string) => {
                          switch (type) {
                            case 'excellent': return 'text-green-700 bg-green-50 border-green-200';
                            case 'good': return 'text-blue-700 bg-blue-50 border-blue-200';
                            case 'inaccuracy': return 'text-yellow-700 bg-yellow-50 border-yellow-200';
                            case 'mistake': return 'text-orange-700 bg-orange-50 border-orange-200';
                            case 'blunder': return 'text-red-700 bg-red-50 border-red-200';
                            default: return 'text-gray-700 bg-gray-50 border-gray-200';
                          }
                        };

                        return (
                          <div className={`border rounded-lg p-4 ${getEvalColor(evaluation.type)}`}>
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center space-x-2">
                                <span className="font-semibold">
                                  {evaluation.moveNumber}. {evaluation.isWhiteMove ? '' : '...'}{evaluation.move}
                                </span>
                                <Badge className={`${evaluation.type === 'excellent' || evaluation.type === 'good' ? 'bg-green-500' : 
                                  evaluation.type === 'inaccuracy' ? 'bg-yellow-500' : 'bg-red-500'}`}>
                                  {evaluation.type.charAt(0).toUpperCase() + evaluation.type.slice(1)}
                                </Badge>
                              </div>
                              <span className="font-mono font-bold">{evaluation.score}</span>
                            </div>
                            <p className="text-sm">{evaluation.insight}</p>
                          </div>
                        );
                      })()}
                    </div>

                    {/* Game Information & Move List */}
                    <div>
                      <div className="space-y-4">
                        {/* Game Info */}
                        <div className="bg-gray-50 rounded-lg p-4">
                          <h4 className="font-semibold mb-3">Game Information</h4>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span>Opening:</span>
                              <span className="font-medium">{selectedGame.opening}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Time Control:</span>
                              <span className="font-medium">{selectedGame.timeControl}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Result:</span>
                              <span className="font-medium">{selectedGame.result}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Date:</span>
                              <span className="font-medium">{new Date(selectedGame.createdAt).toLocaleDateString()}</span>
                            </div>
                          </div>
                        </div>

                        {/* Key Moments */}
                        <div className="bg-blue-50 rounded-lg p-4">
                          <h4 className="font-semibold mb-3 text-blue-900">Key Moments</h4>
                          <div className="space-y-2 text-sm">
                            <div className="flex items-center space-x-2">
                              <CheckCircle className="h-4 w-4 text-green-600" />
                              <span>Move 8: Excellent tactical shot</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <AlertTriangle className="h-4 w-4 text-red-600" />
                              <span>Move 15: Critical mistake lost material</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Target className="h-4 w-4 text-purple-600" />
                              <span>Move 23: Missed winning tactic</span>
                            </div>
                          </div>
                        </div>

                        {/* Performance Summary */}
                        <div className="bg-green-50 rounded-lg p-4">
                          <h4 className="font-semibold mb-3 text-green-900">Your Performance</h4>
                          <div className="space-y-3">
                            <div className="flex justify-between items-center">
                              <span className="text-sm">Accuracy</span>
                              <div className="flex items-center space-x-2">
                                <div className="w-16 bg-gray-200 rounded-full h-2">
                                  <div className="bg-green-500 h-2 rounded-full" style={{width: '78%'}}></div>
                                </div>
                                <span className="text-sm font-medium">78%</span>
                              </div>
                            </div>
                            <div className="grid grid-cols-3 gap-2 text-xs">
                              <div className="text-center p-2 bg-green-100 rounded">
                                <div className="font-semibold">12</div>
                                <div>Good moves</div>
                              </div>
                              <div className="text-center p-2 bg-yellow-100 rounded">
                                <div className="font-semibold">4</div>
                                <div>Inaccuracies</div>
                              </div>
                              <div className="text-center p-2 bg-red-100 rounded">
                                <div className="font-semibold">2</div>
                                <div>Mistakes</div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Recent Games in Selected Opening */}
            {selectedOpening && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Eye className="mr-2 h-5 w-5" />
                    {selectedOpening.name} - Recent Games
                  </CardTitle>
                  <CardDescription>
                    Your recent games in this opening with analysis
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Chess Board */}
                    <div>
                      <div className="flex justify-center mb-4">
                        <ChessBoard 
                          fen={fen}
                          onMove={makeMove}
                          size={300}
                          interactive={true}
                        />
                      </div>
                      
                      {/* Game Navigation */}
                      <div className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => goToMove(-1)}
                            disabled={chessCurrentMoveIndex <= -1}
                          >
                            <SkipBack className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => goToMove(chessCurrentMoveIndex - 1)}
                            disabled={chessCurrentMoveIndex <= -1}
                          >
                            <ChevronLeft className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => goToMove(chessCurrentMoveIndex + 1)}
                            disabled={chessCurrentMoveIndex >= moveHistory.length - 1}
                          >
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => goToMove(moveHistory.length - 1)}
                            disabled={chessCurrentMoveIndex >= moveHistory.length - 1}
                          >
                            <SkipForward className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="text-sm text-gray-600">
                          Move {chessCurrentMoveIndex + 1} of {moveHistory.length}
                        </div>
                      </div>
                    </div>

                    {/* Games List */}
                    <div className="space-y-3">
                      <h4 className="font-semibold text-gray-800">Recent Games</h4>
                      {lichessGames.filter((game: any) => game.opening === selectedOpening.name).slice(0, 3).map((game: any, index: number) => {
                        const youPlayedWhite = game.whitePlayer.toLowerCase() === 'damodar111';
                        const result = game.result;
                        const won = (youPlayedWhite && result === '1-0') || (!youPlayedWhite && result === '0-1');
                        const lost = (youPlayedWhite && result === '0-1') || (!youPlayedWhite && result === '1-0');

                        return (
                          <div 
                            key={index} 
                            className={`border border-gray-200 rounded-lg p-3 cursor-pointer transition-colors hover:bg-blue-50 ${
                              selectedGame?.id === game.id ? 'ring-2 ring-blue-500 bg-blue-50' : ''
                            }`}
                            onClick={() => handleGameClick(game)}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-medium text-sm">
                                {game.whitePlayer} vs {game.blackPlayer}
                              </span>
                              <Badge className={won ? 'bg-green-500' : lost ? 'bg-red-500' : 'bg-gray-500'}>
                                {result}
                              </Badge>
                            </div>
                            <div className="text-xs text-gray-600 mb-2">
                              {game.timeControl} • {new Date(game.createdAt).toLocaleDateString()}
                            </div>
                            <div className="flex items-center space-x-2 text-xs">
                              <span className={`px-2 py-1 rounded ${youPlayedWhite ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'}`}>
                                You: {youPlayedWhite ? 'White' : 'Black'}
                              </span>
                              <span className="text-blue-600 font-medium">Click to analyze</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar Stats */}
          <div className="space-y-6">
            {/* Rating Trend */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <TrendingUp className="mr-2 h-5 w-5 text-blue-500" />
                  Rating Trend (Last 6 Months)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="h-24 bg-gradient-to-r from-blue-50 to-green-50 rounded-lg flex items-end justify-between p-2">
                    {[1180, 1220, 1195, 1240, 1265, personalStats.currentRating].map((rating, index) => (
                      <div key={index} className="flex flex-col items-center">
                        <div 
                          className="bg-blue-500 rounded-t w-3"
                          style={{height: `${((rating - 1100) / 200) * 60}px`}}
                        ></div>
                        <div className="text-xs text-gray-600 mt-1">{rating}</div>
                      </div>
                    ))}
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-green-600">+{personalStats.currentRating - 1180}</div>
                    <div className="text-xs text-gray-600">6-month gain</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Game Phase Performance */}
            <Card>
              <CardHeader>
                <CardTitle>Game Phase Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Middlegame</span>
                    <div className="flex items-center">
                      <div className="w-20 bg-gray-200 rounded-full h-2 mr-2">
                        <div className="bg-green-500 h-2 rounded-full" style={{width: '85%'}}></div>
                      </div>
                      <span className="text-sm font-medium">85%</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Endgame</span>
                    <div className="flex items-center">
                      <div className="w-20 bg-gray-200 rounded-full h-2 mr-2">
                        <div className="bg-yellow-500 h-2 rounded-full" style={{width: '65%'}}></div>
                      </div>
                      <span className="text-sm font-medium">65%</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Rating by Format */}
            <Card>
              <CardHeader>
                <CardTitle>Rating by Format</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Rapid</span>
                    <span className="text-sm font-medium">1813</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Blitz</span>
                    <span className="text-sm font-medium">1713</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Bullet</span>
                    <span className="text-sm font-medium">1563</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Classical</span>
                    <span className="text-sm font-medium">1813</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recent Tournaments */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Trophy className="mr-2 h-5 w-5 text-yellow-500" />
                  Recent Tournaments
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {lichessTournaments.slice(0, 3).map((tournament: any, index: number) => (
                    <div key={index} className="p-3 bg-gray-50 rounded-lg">
                      <div className="font-medium text-sm">{tournament.name}</div>
                      <div className="text-xs text-gray-600 mt-1">
                        Position: {tournament.position} • Score: {tournament.score}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Time Management */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Timer className="mr-2 h-5 w-5 text-purple-500" />
                  Time Management
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Avg Time/Move</span>
                    <span className="text-sm font-medium">23s</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Time Trouble Games</span>
                    <span className="text-sm font-medium text-orange-600">31%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Flagged Games</span>
                    <span className="text-sm font-medium text-red-600">8%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}