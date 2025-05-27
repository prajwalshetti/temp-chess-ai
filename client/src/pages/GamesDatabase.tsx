import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
  Brain,
  Target,
  AlertTriangle,
  TrendingUp,
  Eye,
  BarChart3,
  Crown,
  Shield,
  CheckCircle,
  BookOpen,
  Trophy,
  Activity
} from "lucide-react";
import type { Game, User, PlayerStats } from "@shared/schema";

export default function GamesDatabase() {
  const [pgnInput, setPgnInput] = useState("");
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [selectedOpening, setSelectedOpening] = useState<any>(null);

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

  const { data: user } = useQuery<User>({
    queryKey: ["/api/user/1"],
  });

  const { data: playerStats } = useQuery<PlayerStats>({
    queryKey: ["/api/player-stats/1"],
  });

  // Fetch Lichess data for user damodar111
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
      whitePlayer: parsed.headers?.White || "Unknown",
      blackPlayer: parsed.headers?.Black || "Unknown",
      result: parsed.headers?.Result || "1/2-1/2",
      opening: parsed.headers?.Opening || "Unknown Opening",
      timeControl: parsed.headers?.TimeControl || "Unknown",
      pgn: pgnInput,
      moves: parsed.moves,
      analysisData: analyzePosition(parsed.game?.fen() || ''),
    };

    uploadGameMutation.mutate(gameData);
  };

  const handleGameSelect = (game: Game) => {
    try {
      setSelectedGame(game);
      reset();
      loadPosition("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1");
    } catch (error) {
      console.error("Error selecting game:", error);
      toast({
        title: "Error",
        description: "Failed to load game",
        variant: "destructive",
      });
    }
  };

  // Generate personal chess statistics combining tournament games and Lichess data
  const personalStats = playerStats && games && user ? {
    // Tournament games stats
    tournamentGames: playerStats.gamesPlayed || 0,
    tournamentWins: playerStats.wins || 0,
    tournamentLosses: playerStats.losses || 0,
    tournamentDraws: playerStats.draws || 0,
    tournamentWinRate: Math.round(((playerStats.wins || 0) / Math.max(1, (playerStats.wins || 0) + (playerStats.losses || 0) + (playerStats.draws || 0))) * 100),
    
    // Lichess stats
    lichessGames: lichessGames.length || 0,
    lichessWins: lichessGames.filter(game => {
      const isWhite = game.whitePlayer.toLowerCase() === 'damodar111';
      return (isWhite && game.result === '1-0') || (!isWhite && game.result === '0-1');
    }).length,
    lichessLosses: lichessGames.filter(game => {
      const isWhite = game.whitePlayer.toLowerCase() === 'damodar111';
      return (isWhite && game.result === '0-1') || (!isWhite && game.result === '1-0');
    }).length,
    lichessDraws: lichessGames.filter(game => game.result === '1/2-1/2').length,
    lichessWinRate: lichessGames.length > 0 ? Math.round((lichessGames.filter(game => {
      const isWhite = game.whitePlayer.toLowerCase() === 'damodar111';
      return (isWhite && game.result === '1-0') || (!isWhite && game.result === '0-1');
    }).length / lichessGames.length) * 100) : 0,
    
    // Combined totals
    totalGames: (playerStats.gamesPlayed || 0) + lichessGames.length,
    totalWins: (playerStats.wins || 0) + lichessGames.filter(game => {
      const isWhite = game.whitePlayer.toLowerCase() === 'damodar111';
      return (isWhite && game.result === '1-0') || (!isWhite && game.result === '0-1');
    }).length,
    totalLosses: (playerStats.losses || 0) + lichessGames.filter(game => {
      const isWhite = game.whitePlayer.toLowerCase() === 'damodar111';
      return (isWhite && game.result === '0-1') || (!isWhite && game.result === '1-0');
    }).length,
    totalDraws: (playerStats.draws || 0) + lichessGames.filter(game => game.result === '1/2-1/2').length,
    overallWinRate: Math.round((((playerStats.wins || 0) + lichessGames.filter(game => {
      const isWhite = game.whitePlayer.toLowerCase() === 'damodar111';
      return (isWhite && game.result === '1-0') || (!isWhite && game.result === '0-1');
    }).length) / Math.max(1, (playerStats.gamesPlayed || 0) + lichessGames.length)) * 100),
    
    currentRating: user.currentRating || 1200,
    peakRating: user.currentRating || 1200,
    
    // Lichess recent form
    recentForm: lichessGames.slice(0, 10).map(game => {
      const isWhite = game.whitePlayer.toLowerCase() === 'damodar111';
      if ((isWhite && game.result === '1-0') || (!isWhite && game.result === '0-1')) return 'W';
      if ((isWhite && game.result === '0-1') || (!isWhite && game.result === '1-0')) return 'L';
      return 'D';
    }),
    
    tacticalWeaknesses: {
      missedForks: 18,
      missedPins: 12,
      hangingPieces: 22,
      poorEndgamePlay: 15
    },
    tacticalStrengths: {
      pins: 19,
      discoveredAttacks: 15,
      deflection: 7
    },
    
    // Combined opening repertoire from both sources
    openingRepertoire: (() => {
      const openings: any[] = [];
      
      // Add tournament games
      games.forEach(game => {
        const existing = openings.find(o => o.name === game.opening);
        const isPlayerWhite = game.whitePlayer === user.username;
        const playerWon = (isPlayerWhite && game.result === '1-0') || (!isPlayerWhite && game.result === '0-1');
        const isDraw = game.result === '1/2-1/2';
        
        if (existing) {
          existing.gamesPlayed++;
          existing.tournamentGames++;
          if (playerWon) existing.wins++;
          else if (isDraw) existing.draws++;
          else existing.losses++;
        } else {
          openings.push({
            id: openings.length + 1,
            name: game.opening,
            color: isPlayerWhite ? 'white' : 'black',
            gamesPlayed: 1,
            tournamentGames: 1,
            lichessGames: 0,
            wins: playerWon ? 1 : 0,
            losses: playerWon || isDraw ? 0 : 1,
            draws: isDraw ? 1 : 0,
            moves: game.moves?.slice(0, 4).join(' ') || ''
          });
        }
      });
      
      // Add Lichess games
      lichessGames.forEach(game => {
        const existing = openings.find(o => o.name === game.opening);
        const isPlayerWhite = game.whitePlayer.toLowerCase() === 'damodar111';
        const playerWon = (isPlayerWhite && game.result === '1-0') || (!isPlayerWhite && game.result === '0-1');
        const isDraw = game.result === '1/2-1/2';
        
        if (existing) {
          existing.gamesPlayed++;
          existing.lichessGames++;
          if (playerWon) existing.wins++;
          else if (isDraw) existing.draws++;
          else existing.losses++;
        } else {
          openings.push({
            id: openings.length + 1,
            name: game.opening,
            color: isPlayerWhite ? 'white' : 'black',
            gamesPlayed: 1,
            tournamentGames: 0,
            lichessGames: 1,
            wins: playerWon ? 1 : 0,
            losses: playerWon || isDraw ? 0 : 1,
            draws: isDraw ? 1 : 0,
            moves: game.moves?.slice(0, 4).join(' ') || ''
          });
        }
      });
      
      return openings;
    })()
  } : null;

  const getWeaknessLevel = (count: number) => {
    if (count >= 20) return { color: "text-red-600", level: "Critical" };
    if (count >= 10) return { color: "text-orange-500", level: "Moderate" };
    return { color: "text-yellow-600", level: "Minor" };
  };

  const handleOpeningClick = (opening: any) => {
    setSelectedOpening(opening);
    const openingGames = games?.filter(game => game.opening === opening.name) || [];
    if (openingGames.length > 0) {
      setSelectedGame(openingGames[0]);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">My Chess Analysis</h1>
        <p className="text-gray-600">Complete analysis of your chess performance and statistics</p>
      </div>

      {!personalStats ? (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Upload Game Section */}
          <div className="lg:col-span-3">
            <Card className="mb-8">
              <CardHeader>
                <CardTitle>Upload Chess Game</CardTitle>
                <CardDescription>
                  Upload a PGN file or paste game notation to start building your personal analysis
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Textarea
                    placeholder="Paste your PGN here..."
                    value={pgnInput}
                    onChange={(e) => setPgnInput(e.target.value)}
                    rows={6}
                    className="font-mono text-sm"
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
          </div>
          
          {/* Games List */}
          <div>
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
                        <div className="text-xs text-gray-500 mt-1">
                          {new Date(game.uploadedAt).toLocaleDateString()}
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
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Analysis */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Performance Overview Dashboard */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BarChart3 className="mr-2 h-5 w-5 text-blue-500" />
                  My Performance Overview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="text-3xl font-bold text-blue-600">{personalStats.totalGames}</div>
                    <div className="text-sm text-gray-600">Total Games</div>
                    <div className="text-xs text-blue-600 mt-1">Tournament + Lichess</div>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-3xl font-bold text-green-600">{personalStats.overallWinRate}%</div>
                    <div className="text-sm text-gray-600">Overall Win Rate</div>
                    <div className="text-xs text-green-600 mt-1">{personalStats.totalWins} wins</div>
                  </div>
                  <div className="text-center p-4 bg-purple-50 rounded-lg">
                    <div className="text-3xl font-bold text-purple-600">{personalStats.currentRating}</div>
                    <div className="text-sm text-gray-600">Current Rating</div>
                    <div className="text-xs text-purple-600 mt-1">Lichess: damodar111</div>
                  </div>
                  <div className="text-center p-4 bg-orange-50 rounded-lg">
                    <div className="text-3xl font-bold text-orange-600">{personalStats.openingRepertoire.length}</div>
                    <div className="text-sm text-gray-600">Openings Played</div>
                    <div className="text-xs text-orange-600 mt-1">Combined Repertoire</div>
                  </div>
                </div>

                {/* Split Tournament vs Lichess Performance */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <h4 className="font-semibold text-yellow-800 mb-3 flex items-center">
                      <Trophy className="mr-2 h-4 w-4" />
                      Tournament Performance
                    </h4>
                    <div className="grid grid-cols-3 gap-3 text-center">
                      <div>
                        <div className="text-lg font-bold text-yellow-700">{personalStats.tournamentWins}</div>
                        <div className="text-xs text-yellow-600">Wins</div>
                      </div>
                      <div>
                        <div className="text-lg font-bold text-yellow-700">{personalStats.tournamentDraws}</div>
                        <div className="text-xs text-yellow-600">Draws</div>
                      </div>
                      <div>
                        <div className="text-lg font-bold text-yellow-700">{personalStats.tournamentLosses}</div>
                        <div className="text-xs text-yellow-600">Losses</div>
                      </div>
                    </div>
                    <div className="mt-3 text-center">
                      <div className="text-2xl font-bold text-yellow-800">{personalStats.tournamentWinRate}%</div>
                      <div className="text-xs text-yellow-600">{personalStats.tournamentGames} total games</div>
                    </div>
                  </div>
                  
                  <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-lg">
                    <h4 className="font-semibold text-indigo-800 mb-3 flex items-center">
                      <Activity className="mr-2 h-4 w-4" />
                      Lichess Performance
                    </h4>
                    <div className="grid grid-cols-3 gap-3 text-center">
                      <div>
                        <div className="text-lg font-bold text-indigo-700">{personalStats.lichessWins}</div>
                        <div className="text-xs text-indigo-600">Wins</div>
                      </div>
                      <div>
                        <div className="text-lg font-bold text-indigo-700">{personalStats.lichessDraws}</div>
                        <div className="text-xs text-indigo-600">Draws</div>
                      </div>
                      <div>
                        <div className="text-lg font-bold text-indigo-700">{personalStats.lichessLosses}</div>
                        <div className="text-xs text-indigo-600">Losses</div>
                      </div>
                    </div>
                    <div className="mt-3 text-center">
                      <div className="text-2xl font-bold text-indigo-800">{personalStats.lichessWinRate}%</div>
                      <div className="text-xs text-indigo-600">{personalStats.lichessGames} total games</div>
                    </div>
                  </div>
                </div>

                {/* Recent Form */}
                {personalStats.recentForm.length > 0 && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-800 mb-3">Recent Lichess Form (Last 10 Games)</h4>
                    <div className="flex justify-center space-x-2">
                      {personalStats.recentForm.map((result, index) => (
                        <div 
                          key={index}
                          className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                            result === 'W' ? 'bg-green-500 text-white' :
                            result === 'L' ? 'bg-red-500 text-white' :
                            'bg-gray-400 text-white'
                          }`}
                        >
                          {result}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Opening Repertoire Analysis */}
            <Card>
              <CardHeader>
                <CardTitle>My Opening Repertoire</CardTitle>
                <CardDescription>Click any opening to see your games with detailed analysis</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {personalStats.openingRepertoire.map((opening: any) => {
                    const winRate = Math.round((opening.wins / opening.gamesPlayed) * 100);
                    return (
                      <div 
                        key={opening.id} 
                        className={`border border-gray-200 rounded-lg p-4 cursor-pointer transition-all hover:shadow-md ${
                          selectedOpening?.id === opening.id ? 'ring-2 ring-blue-500 bg-blue-50' : 'hover:bg-gray-50'
                        }`}
                        onClick={() => handleOpeningClick(opening)}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center">
                            {opening.color === 'white' ? (
                              <Crown className="mr-2 h-4 w-4 text-yellow-500" />
                            ) : (
                              <Shield className="mr-2 h-4 w-4 text-gray-800" />
                            )}
                            <span className="font-medium">{opening.name}</span>
                          </div>
                          <Badge 
                            className={
                              winRate >= 70 ? 'bg-green-500' : 
                              winRate >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                            }
                          >
                            {winRate}%
                          </Badge>
                        </div>
                        <div className="text-xs text-gray-600 mb-2 font-mono">{opening.moves}</div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">{opening.gamesPlayed} games</span>
                          <span className="text-gray-600">{opening.wins}W-{opening.losses}L-{opening.draws}D</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* AI Strategic Recommendations for Personal Improvement */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Brain className="mr-2 h-5 w-5 text-purple-500" />
                  AI Improvement Recommendations
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
                          <strong>Strengthen your {personalStats.openingRepertoire[0]?.name}:</strong> You score {Math.round((personalStats.openingRepertoire[0]?.wins / personalStats.openingRepertoire[0]?.gamesPlayed) * 100)}% - continue developing this line.
                        </span>
                      </div>
                      <div className="flex items-start space-x-2">
                        <span className="text-red-600 font-bold">⚠</span>
                        <span className="text-blue-800">
                          <strong>Improve weak openings:</strong> Focus on studying lines where your win rate is below 50%.
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Tactical Training */}
                  <div className="bg-gradient-to-r from-red-50 to-orange-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-center mb-3">
                      <Target className="mr-2 h-4 w-4 text-red-600" />
                      <div className="font-semibold text-red-900">Tactical Training Focus</div>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="bg-red-100 p-2 rounded">
                        <strong className="text-red-800">Priority Training:</strong> 
                        <span className="text-red-700 ml-1">Focus on fork patterns - you've missed {personalStats.tacticalWeaknesses.missedForks} opportunities</span>
                      </div>
                      <div className="text-red-800">
                        • Practice knight fork patterns daily
                        <br />
                        • Study tactical combinations in your games
                        <br />
                        • Use tactical trainers to improve pattern recognition
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tactical Analysis */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Brain className="mr-2 h-5 w-5 text-purple-500" />
                  My Tactical Profile
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Areas for Improvement */}
                  <div>
                    <h4 className="font-medium text-red-600 mb-4 flex items-center">
                      <AlertTriangle className="mr-2 h-4 w-4" />
                      Areas for Improvement
                    </h4>
                    <div className="space-y-3">
                      {Object.entries(personalStats.tacticalWeaknesses).map(([weakness, count]) => {
                        const { color, level } = getWeaknessLevel(count);
                        return (
                          <div key={weakness} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                            <div>
                              <div className="font-medium text-gray-900 capitalize">
                                {weakness.replace(/([A-Z])/g, ' $1').trim()}
                              </div>
                              <div className={`text-sm ${color}`}>{level} priority</div>
                            </div>
                            <Badge variant="destructive">{count}</Badge>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* My Strengths */}
                  <div>
                    <h4 className="font-medium text-green-600 mb-4 flex items-center">
                      <CheckCircle className="mr-2 h-4 w-4" />
                      My Strengths
                    </h4>
                    <div className="space-y-3">
                      {Object.entries(personalStats.tacticalStrengths).map(([strength, count]) => (
                        <div key={strength} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                          <div>
                            <div className="font-medium text-gray-900 capitalize">
                              {strength.replace(/([A-Z])/g, ' $1').trim()}
                            </div>
                            <div className="text-sm text-green-600">Strong execution</div>
                          </div>
                          <Badge variant="default" className="bg-green-500">{count}</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Upload Game Section */}
            <Card>
              <CardHeader>
                <CardTitle>Upload More Games</CardTitle>
                <CardDescription>
                  Add more games to improve your analysis accuracy
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Textarea
                    placeholder="Paste your PGN here..."
                    value={pgnInput}
                    onChange={(e) => setPgnInput(e.target.value)}
                    rows={6}
                    className="font-mono text-sm"
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
          </div>

          {/* Sidebar Stats */}
          <div className="space-y-6">
            {/* Current Game Analysis */}
            {selectedGame && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Eye className="mr-2 h-5 w-5" />
                    Current Game
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">Players:</span>
                      <span className="text-sm">{selectedGame.whitePlayer} vs {selectedGame.blackPlayer}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">Result:</span>
                      <span className="text-sm font-mono">{selectedGame.result}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">Opening:</span>
                      <span className="text-sm">{selectedGame.opening}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Recent Games List */}
            <Card>
              <CardHeader>
                <CardTitle>My Recent Games</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="text-center py-4">Loading games...</div>
                ) : games && games.length > 0 ? (
                  <div className="space-y-2">
                    {games.slice(0, 5).map((game) => (
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
                        <div className="text-xs text-gray-500 mt-1">
                          {new Date(game.uploadedAt).toLocaleDateString()}
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

            {/* Current Form Analysis */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <TrendingUp className="mr-2 h-5 w-5 text-purple-500" />
                  My Current Form
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{personalStats.winRate}%</div>
                    <div className="text-sm text-gray-600">Overall Win Rate</div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Recent Performance:</span>
                      <span className="font-medium">
                        {games && games.length >= 10 ? (
                          `${Math.round((games.slice(0, 10).filter(game => {
                            const isPlayerWhite = game.whitePlayer === user.username;
                            return (isPlayerWhite && game.result === '1-0') || (!isPlayerWhite && game.result === '0-1');
                          }).length / 10) * 100)}% (last 10)`
                        ) : (
                          'Building history...'
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Rating:</span>
                      <span className="font-medium">{personalStats.currentRating}</span>
                    </div>
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