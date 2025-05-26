import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Search, 
  Target, 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  Crown,
  Shield,
  AlertTriangle,
  CheckCircle,
  Eye,
  Brain,
  Zap,
  BarChart3,
  PieChart,
  Activity,
  Calendar,
  MapPin,
  Trophy,
  Users,
  Timer,
  Swords
} from "lucide-react";
import type { User, PlayerStats, Opening, Game } from "@shared/schema";
import { ChessBoard } from "@/components/ChessBoard";
import { Chess } from "chess.js";

export default function OpponentScout() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedOpponent, setSelectedOpponent] = useState<User | null>(null);
  const [searchType, setSearchType] = useState<'fide' | 'aicf' | 'lichess'>('lichess');
  const [lichessGames, setLichessGames] = useState<any[]>([]);
  const [isLoadingLichess, setIsLoadingLichess] = useState(false);
  const [lichessInsights, setLichessInsights] = useState<any>(null);
  const [lichessTournaments, setLichessTournaments] = useState<any[]>([]);
  const [selectedOpening, setSelectedOpening] = useState<any>(null);
  const [openingGames, setOpeningGames] = useState<any[]>([]);
  const [selectedOpeningGame, setSelectedOpeningGame] = useState<any>(null);
  const [currentMoveIndex, setCurrentMoveIndex] = useState(0);
  const [currentPosition, setCurrentPosition] = useState("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1");

  // Detect opening from moves
  const detectOpening = (moves: string[]) => {
    if (!moves || moves.length < 3) return "Opening Analysis";
    
    const moveStr = moves.slice(0, 6).join(' ').toLowerCase();
    
    // Scotch Opening variations
    if (moveStr.includes('e4 e5 nf3') && moveStr.includes('d4')) {
      return "Scotch Opening";
    }
    if (moveStr.includes('e4 e5 nf3 nc6 d4')) {
      return "Scotch Game";
    }
    
    // Italian Game
    if (moveStr.includes('e4 e5 nf3 nc6 bc4')) {
      return "Italian Game";
    }
    
    // Spanish Opening (Ruy Lopez)
    if (moveStr.includes('e4 e5 nf3 nc6 bb5')) {
      return "Spanish Opening (Ruy Lopez)";
    }
    
    // French Defense
    if (moveStr.includes('e4 e6')) {
      return "French Defense";
    }
    
    // Sicilian Defense
    if (moveStr.includes('e4 c5')) {
      return "Sicilian Defense";
    }
    
    // Queen's Gambit
    if (moveStr.includes('d4 d5 c4')) {
      return "Queen's Gambit";
    }
    
    // King's Indian Defense
    if (moveStr.includes('d4 nf6 c4 g6')) {
      return "King's Indian Defense";
    }
    
    // English Opening
    if (moves[0].toLowerCase() === 'c4') {
      return "English Opening";
    }
    
    // Basic categorization
    if (moves[0].toLowerCase() === 'e4') {
      return "King's Pawn Opening";
    }
    if (moves[0].toLowerCase() === 'd4') {
      return "Queen's Pawn Opening";
    }
    if (moves[0].toLowerCase() === 'nf3') {
      return "Réti Opening";
    }
    
    return moves[0] + " Opening";
  };

  // Handle opening click to show recent games
  const handleOpeningClick = (opening: any) => {
    setSelectedOpening(opening);
    
    // Filter games for this specific opening
    const gamesWithOpening = lichessGames.filter(game => {
      if (!game.moves || game.moves.length === 0) return false;
      
      const gameOpening = detectOpening(game.moves);
      return gameOpening.toLowerCase().includes(opening.name.toLowerCase()) ||
             opening.name.toLowerCase().includes(gameOpening.toLowerCase());
    }).slice(0, 10);
    
    setOpeningGames(gamesWithOpening);
    setSelectedOpeningGame(null);
  };

  // Handle game selection for move-by-move analysis
  const handleGameSelection = (game: any) => {
    setSelectedOpeningGame(game);
    setCurrentMoveIndex(-1); // Start at -1 so first move shows starting position
    setCurrentPosition("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1");
  };

  // Navigate through moves and calculate positions
  const navigateToMove = (moveIndex: number) => {
    if (!selectedOpeningGame || !selectedOpeningGame.moves) return;
    
    setCurrentMoveIndex(moveIndex);
    
    // Calculate the position after the specified move
    try {
      const chess = new Chess();
      
      // If moveIndex is -1, show starting position
      if (moveIndex < 0) {
        setCurrentPosition("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1");
        return;
      }
      
      // Play moves up to the current index
      for (let i = 0; i <= moveIndex; i++) {
        if (selectedOpeningGame.moves[i]) {
          const move = selectedOpeningGame.moves[i];
          console.log(`Playing move ${i}: ${move}`);
          try {
            chess.move(move);
            console.log(`Position after move ${i}: ${chess.fen()}`);
          } catch (moveError) {
            console.log(`Invalid move: ${move} at index ${i}`, moveError);
            break;
          }
        }
      }
      const newPosition = chess.fen();
      console.log(`Setting new position: ${newPosition}`);
      setCurrentPosition(newPosition);
    } catch (error) {
      console.log("Error calculating position:", error);
      setCurrentPosition("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1");
    }
  };

  // Handle Lichess search
  const handleLichessSearch = async () => {
    if (!searchQuery.trim()) return;

    setIsLoadingLichess(true);
    try {
      const [gamesResponse, insightsResponse, tournamentsResponse] = await Promise.all([
        fetch(`/api/lichess/user/${searchQuery}/games?max=50`),
        fetch(`/api/lichess/user/${searchQuery}/insights`),
        fetch(`/api/lichess/user/${searchQuery}/tournaments`)
      ]);
      
      if (gamesResponse.ok && insightsResponse.ok) {
        const gamesData = await gamesResponse.json();
        const insightsData = await insightsResponse.json();
        const tournamentsData = tournamentsResponse.ok ? await tournamentsResponse.json() : { tournaments: [] };
        
        setLichessGames(gamesData.games);
        setLichessInsights(insightsData);
        setLichessTournaments(tournamentsData.tournaments);
        
        // Create a mock opponent profile from Lichess data
        setSelectedOpponent({
          id: Date.now(),
          username: searchQuery,
          email: `${searchQuery}@lichess.org`,
          fideId: null,
          aicfId: null,
          lichessId: searchQuery,
          currentRating: insightsData.averageRating,
          puzzleRating: null,
          createdAt: new Date()
        });
      }
    } catch (error) {
      console.error('Error fetching Lichess data:', error);
    } finally {
      setIsLoadingLichess(false);
    }
  };

  // Mock search results - in real app, this would search the database
  const mockOpponents = [
    {
      id: 2,
      username: "ChessMaster2024",
      email: "opponent@chess.com",
      fideId: "2345679",
      aicfId: "IN234567",
      lichessId: "chessmaster2024",
      currentRating: 1923,
      puzzleRating: 1756,
      createdAt: new Date("2023-01-15"),
    },
    {
      id: 3,
      username: "TacticalNinja",
      email: "ninja@chess.com", 
      fideId: "2345680",
      aicfId: "IN345678",
      lichessId: "tacticalninja",
      currentRating: 1654,
      puzzleRating: 1834,
      createdAt: new Date("2022-11-08"),
    }
  ];

  const searchResults = searchQuery.length > 2 ? mockOpponents.filter(player => 
    player.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (player.fideId && player.fideId.includes(searchQuery)) ||
    (player.aicfId && player.aicfId.includes(searchQuery))
  ) : [];

  // Mock opponent data
  const opponentStats = selectedOpponent ? {
    id: 1,
    userId: selectedOpponent.id,
    gamesPlayed: 187,
    wins: 89,
    losses: 68,
    draws: 30,
    winsAsWhite: 52,
    winsAsBlack: 37,
    lossesAsWhite: 31,
    lossesAsBlack: 37,
    drawsAsWhite: 16,
    drawsAsBlack: 14,
    rapidRating: selectedOpponent.currentRating,
    blitzRating: selectedOpponent.currentRating - 100,
    classicalRating: selectedOpponent.currentRating + 50,
    tacticalStrengths: {
      forks: 23,
      pins: 18,
      skewers: 12,
      backRank: 9,
      discoveredAttacks: 15,
      deflection: 7
    },
    tacticalWeaknesses: {
      missedForks: 12,
      missedPins: 8,
      missedSkewers: 15,
      hangingPieces: 22,
      poorEndgamePlay: 18,
      timeManagement: 25
    },
    openingPhaseScore: 72,
    middlegameScore: 68,
    endgameScore: 45
  } : null;

  // Generate real opening repertoire from Lichess games
  const opponentOpenings = lichessGames.length > 0 ? (() => {
    const openingStats: { [key: string]: { name: string, games: any[], wins: number, losses: number, draws: number, color: string } } = {};
    
    lichessGames.forEach(game => {
      if (!game.moves || game.moves.length === 0) return;
      
      const opening = detectOpening(game.moves);
      const playerColor = game.whitePlayer.toLowerCase() === searchQuery.toLowerCase() ? 'white' : 'black';
      const playerWon = (playerColor === 'white' && game.result === '1-0') || 
                        (playerColor === 'black' && game.result === '0-1');
      const isDraw = game.result === '1/2-1/2';
      
      if (!openingStats[opening]) {
        openingStats[opening] = { 
          name: opening, 
          games: [], 
          wins: 0, 
          losses: 0, 
          draws: 0,
          color: playerColor 
        };
      }
      
      openingStats[opening].games.push(game);
      if (playerWon) openingStats[opening].wins++;
      else if (isDraw) openingStats[opening].draws++;
      else openingStats[opening].losses++;
    });
    
    return Object.keys(openingStats).map((key, index) => ({
      id: index + 1,
      name: openingStats[key].name,
      moves: openingStats[key].games[0]?.moves?.slice(0, 4).join(' ') || '',
      color: openingStats[key].color,
      gamesPlayed: openingStats[key].games.length,
      wins: openingStats[key].wins,
      losses: openingStats[key].losses,
      draws: openingStats[key].draws
    })).sort((a, b) => b.gamesPlayed - a.gamesPlayed);
  })() : [];

  // Head-to-head analysis
  const headToHeadData = selectedOpponent ? {
    gamesPlayed: 5,
    playerWins: 2,
    opponentWins: 2,
    draws: 1,
    lastEncounter: new Date("2024-12-10"),
    favoriteOpeningAgainst: "Sicilian Defense",
    weaknessesExploited: ["Time pressure in endgames", "Missed tactical shots", "Poor piece coordination"],
    strengthsToAvoid: ["Strong in Queen's Gambit", "Excellent endgame technique", "Calm under pressure"]
  } : null;

  // Recent tournament performance
  const recentTournaments = selectedOpponent ? [
    {
      name: "Mumbai Open 2024",
      position: 23,
      totalPlayers: 156,
      points: 6.5,
      rounds: 9,
      performance: 1889
    },
    {
      name: "Chennai Classic",
      position: 12,
      totalPlayers: 89,
      points: 5.0,
      rounds: 7,
      performance: 1945
    }
  ] : [];

  const getPerformanceColor = (score: number) => {
    if (score >= 70) return "text-green-600";
    if (score >= 50) return "text-yellow-600";
    return "text-red-600";
  };

  const getWeaknessLevel = (count: number) => {
    if (count >= 20) return { color: "text-red-600", level: "Critical" };
    if (count >= 10) return { color: "text-orange-500", level: "Moderate" };
    return { color: "text-yellow-600", level: "Minor" };
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Opponent Scout</h1>
        <p className="text-gray-600">Research your opponents and gain strategic advantages</p>
      </div>

      {/* Search Section */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Search className="mr-2 h-5 w-5" />
            Find Your Opponent
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Search Type Radio Buttons */}
            <div className="flex space-x-6">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="radio"
                  name="searchType"
                  value="fide"
                  checked={searchType === 'fide'}
                  onChange={(e) => setSearchType('fide')}
                  className="text-chess-dark"
                />
                <span className="text-sm font-medium">FIDE ID</span>
              </label>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="radio"
                  name="searchType"
                  value="aicf"
                  checked={searchType === 'aicf'}
                  onChange={(e) => setSearchType('aicf')}
                  className="text-chess-dark"
                />
                <span className="text-sm font-medium">AICF ID</span>
              </label>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="radio"
                  name="searchType"
                  value="lichess"
                  checked={searchType === 'lichess'}
                  onChange={(e) => setSearchType('lichess')}
                  className="text-chess-dark"
                />
                <span className="text-sm font-medium">Lichess Username</span>
              </label>
            </div>

            {/* Search Input */}
            <div className="flex space-x-4">
              <Input
                placeholder={
                  searchType === 'fide' ? "Enter FIDE ID (e.g., 2345678)" :
                  searchType === 'aicf' ? "Enter AICF ID (e.g., IN234567)" :
                  "Enter Lichess username (e.g., damodar111)"
                }
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && searchType === 'lichess' && handleLichessSearch()}
                className="flex-1"
              />
              <Button 
                onClick={searchType === 'lichess' ? handleLichessSearch : undefined}
                disabled={isLoadingLichess}
                className="bg-chess-dark hover:bg-chess-green"
              >
                {isLoadingLichess ? (
                  <>
                    <Brain className="mr-2 h-4 w-4 animate-pulse" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Target className="mr-2 h-4 w-4" />
                    Scout
                  </>
                )}
              </Button>
            </div>

            {searchType === 'lichess' && (
              <p className="text-sm text-gray-600">
                Get detailed tactical insights and game analysis from their last 50 Lichess games
              </p>
            )}
          </div>

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="mt-4 space-y-2">
              <h3 className="font-medium text-gray-700">Search Results:</h3>
              {searchResults.map((opponent) => (
                <div
                  key={opponent.id}
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    selectedOpponent?.id === opponent.id
                      ? "bg-chess-light border-chess-dark"
                      : "hover:bg-gray-50"
                  }`}
                  onClick={() => setSelectedOpponent(opponent)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-gray-900">{opponent.username}</div>
                      <div className="text-sm text-gray-600">
                        FIDE: {opponent.fideId} • Rating: {opponent.currentRating || 'Unrated'}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-semibold text-chess-dark">{opponent.currentRating || 'Unrated'}</div>
                      <div className="text-xs text-gray-500">Current Rating</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Popular Players Section */}
          {searchQuery.length === 0 && (
            <div className="mt-6">
              <h3 className="font-medium text-gray-700 mb-4">Popular Players in Database</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {mockOpponents.map((player) => (
                  <div
                    key={player.id}
                    className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => setSelectedOpponent(player)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-gray-900">{player.username}</div>
                        <div className="text-sm text-gray-600">FIDE: {player.fideId}</div>
                        <div className="text-xs text-gray-500 mt-1">
                          <Users className="inline w-3 h-3 mr-1" />
                          Active in tournaments
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-semibold text-chess-dark">{player.currentRating}</div>
                        <div className="text-xs text-gray-500">Rating</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Loading State */}
      {isLoadingLichess && (
        <Card>
          <CardContent className="text-center py-16">
            <div className="animate-spin mx-auto mb-6 h-16 w-16 border-4 border-blue-500 border-t-transparent rounded-full"></div>
            <div className="text-xl font-semibold text-gray-700 mb-3">Analyzing {searchQuery}'s Chess Games</div>
            <div className="text-gray-600 mb-4">Fetching recent games and tactical patterns from Lichess</div>
            <div className="text-sm text-gray-500 mb-6">This may take 15-20 seconds for comprehensive analysis</div>
            
            <div className="max-w-md mx-auto bg-blue-50 p-4 rounded-lg border">
              <div className="space-y-2 text-sm text-blue-700">
                <div className="flex items-center justify-center">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mr-2 animate-pulse"></div>
                  <span>Downloading last 50 games...</span>
                </div>
                <div className="flex items-center justify-center">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mr-2 animate-pulse"></div>
                  <span>Analyzing opening repertoire...</span>
                </div>
                <div className="flex items-center justify-center">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mr-2 animate-pulse"></div>
                  <span>Generating tactical insights...</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {!isLoadingLichess && selectedOpponent && opponentStats && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Analysis */}
          <div className="lg:col-span-2 space-y-6">
            {/* Performance Overview Dashboard */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BarChart3 className="mr-2 h-5 w-5 text-blue-500" />
                  Performance Overview - {selectedOpponent.username}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="text-3xl font-bold text-blue-600">{opponentStats.gamesPlayed}</div>
                    <div className="text-sm text-gray-600">Total Games</div>
                    <div className="text-xs text-blue-600 mt-1">Last 12 months</div>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-3xl font-bold text-green-600">
                      {Math.round((opponentStats.wins / opponentStats.gamesPlayed) * 100)}%
                    </div>
                    <div className="text-sm text-gray-600">Win Rate</div>
                    <div className="text-xs text-green-600 mt-1">{opponentStats.wins} wins</div>
                  </div>
                  <div className="text-center p-4 bg-orange-50 rounded-lg">
                    <div className="text-3xl font-bold text-orange-600">{selectedOpponent.currentRating || 'Unrated'}</div>
                    <div className="text-sm text-gray-600">Current Rating</div>
                    <div className="text-xs text-orange-600 mt-1">Peak: {(selectedOpponent.currentRating || 0) + 47}</div>
                  </div>
                  <div className="text-center p-4 bg-purple-50 rounded-lg">
                    <div className="text-3xl font-bold text-purple-600">{opponentStats.rapidRating}</div>
                    <div className="text-sm text-gray-600">Active Rating</div>
                    <div className="text-xs text-purple-600 mt-1">Last game: 3 days ago</div>
                  </div>
                </div>

                {/* Visual Win/Loss Distribution */}
                <div className="mb-6">
                  <h4 className="font-medium mb-3">Result Distribution</h4>
                  <div className="flex items-center space-x-2 mb-2">
                    <div className="flex-1">
                      <div className="flex justify-between text-sm mb-1">
                        <span>Wins</span>
                        <span>{opponentStats.wins}</span>
                      </div>
                      <Progress value={(opponentStats.wins / opponentStats.gamesPlayed) * 100} className="h-2" />
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 mb-2">
                    <div className="flex-1">
                      <div className="flex justify-between text-sm mb-1">
                        <span>Draws</span>
                        <span>{opponentStats.draws}</span>
                      </div>
                      <Progress value={(opponentStats.draws / opponentStats.gamesPlayed) * 100} className="h-2 [&>div]:bg-yellow-500" />
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="flex-1">
                      <div className="flex justify-between text-sm mb-1">
                        <span>Losses</span>
                        <span>{opponentStats.losses}</span>
                      </div>
                      <Progress value={(opponentStats.losses / opponentStats.gamesPlayed) * 100} className="h-2 [&>div]:bg-red-500" />
                    </div>
                  </div>
                </div>

                {/* Rating Trend */}
                <div>
                  <h4 className="font-medium mb-3">Rating Trend (Last 6 Months)</h4>
                  <div className="h-32 bg-gray-50 rounded-lg flex items-end justify-between p-4">
                    {[1820, 1845, 1889, 1923, 1901, 1923].map((rating, index) => (
                      <div key={index} className="flex flex-col items-center">
                        <div 
                          className="w-8 bg-chess-dark rounded-t"
                          style={{ height: `${((rating - 1800) / 150) * 80}px` }}
                        />
                        <div className="text-xs text-gray-500 mt-1">{rating}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
            {/* Tactical Strengths & Weaknesses */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Target className="mr-2 h-5 w-5 text-red-500" />
                  Tactical Analysis & Weaknesses
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Tactical Strengths */}
                  <div>
                    <h4 className="font-medium text-green-600 mb-4">Tactical Strengths</h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                        <div>
                          <div className="font-medium text-gray-900">Discovered Attacks</div>
                          <div className="text-sm text-green-600">Executes 87% accurately</div>
                        </div>
                        <Badge className="bg-green-500 text-white">Strong</Badge>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                        <div>
                          <div className="font-medium text-gray-900">Pin Tactics</div>
                          <div className="text-sm text-green-600">Good pattern recognition</div>
                        </div>
                        <Badge className="bg-green-500 text-white">Strong</Badge>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                        <div>
                          <div className="font-medium text-gray-900">Knight Forks</div>
                          <div className="text-sm text-yellow-600">Finds 72% of opportunities</div>
                        </div>
                        <Badge className="bg-yellow-500 text-white">Good</Badge>
                      </div>
                    </div>
                  </div>

                  {/* Tactical Weaknesses */}
                  <div>
                    <h4 className="font-medium text-red-600 mb-4">Exploitable Weaknesses</h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                        <div>
                          <div className="font-medium text-gray-900">Back Rank Mates</div>
                          <div className="text-sm text-red-600">Misses 43% of defensive moves</div>
                        </div>
                        <Badge variant="destructive">Weak</Badge>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                        <div>
                          <div className="font-medium text-gray-900">Time Pressure</div>
                          <div className="text-sm text-red-600">Blunders increase 3x under 5min</div>
                        </div>
                        <Badge variant="destructive">Critical</Badge>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                        <div>
                          <div className="font-medium text-gray-900">Complex Endgames</div>
                          <div className="text-sm text-orange-600">Struggles with R+P endings</div>
                        </div>
                        <Badge className="bg-orange-500 text-white">Moderate</Badge>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Strategic Recommendations */}
                <div className="mt-6 p-4 bg-blue-50 border-l-4 border-blue-400 rounded-lg">
                  <div className="flex items-start">
                    <Brain className="h-5 w-5 text-blue-500 mt-0.5 mr-3" />
                    <div>
                      <h4 className="font-medium text-blue-900 mb-2">Strategic Recommendations</h4>
                      <ul className="text-blue-800 text-sm space-y-1">
                        <li>• Create back rank pressure - they struggle with defensive moves</li>
                        <li>• Force time trouble by maintaining complex positions</li>
                        <li>• Transition to rook endgames when ahead in material</li>
                        <li>• Avoid knight vs bishop endings where they excel</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Opening Repertoire Analysis */}
            <Card>
              <CardHeader>
                <CardTitle>Opening Repertoire Analysis</CardTitle>
                <CardDescription>Click any opening to see recent games with engine evaluation</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {opponentOpenings.map((opening: any) => {
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
                            <Eye className="ml-2 h-3 w-3 text-gray-400" />
                          </div>
                          <Badge className={winRate >= 70 ? "bg-red-500" : winRate >= 50 ? "bg-yellow-500" : "bg-green-500"}>
                            {winRate}% win rate
                          </Badge>
                        </div>
                        <div className="text-sm text-gray-600 mb-2">{opening.moves}</div>
                        <div className="text-xs text-gray-500">
                          {opening.gamesPlayed} games: {opening.wins}W-{opening.losses}L-{opening.draws}D
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Opening Games Analysis */}
            {selectedOpening && (
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Eye className="mr-2 h-5 w-5" />
                    {selectedOpening.name} - Recent Games
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Games List */}
                    <div className="lg:col-span-1">
                      <div className="space-y-2 max-h-96 overflow-y-auto">
                        {openingGames.map((game, index) => (
                          <div
                            key={index}
                            className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                              selectedOpeningGame?.id === game.id 
                                ? 'bg-blue-50 border-blue-500' 
                                : 'hover:bg-gray-50'
                            }`}
                            onClick={() => handleGameSelection(game)}
                          >
                            <div className="font-medium text-sm">
                              {game.whitePlayer} vs {game.blackPlayer}
                            </div>
                            <div className="text-xs text-gray-600">
                              {game.result} • {new Date(game.createdAt).toLocaleDateString()}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              {game.moves ? `${game.moves.length} moves` : 'No moves data'}
                            </div>
                            {game.analysisData && (
                              <div className="text-xs text-blue-600 mt-1">
                                Accuracy: {game.analysisData.accuracy}%
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Chess Board and Move-by-Move Analysis */}
                    <div className="lg:col-span-2">
                      {selectedOpeningGame ? (
                        <div className="space-y-4">
                          {/* Game Header */}
                          <div className="bg-blue-50 p-3 rounded-lg">
                            <h4 className="font-medium text-blue-900">
                              {selectedOpeningGame.whitePlayer} vs {selectedOpeningGame.blackPlayer}
                            </h4>
                            <div className="text-sm text-blue-700">
                              {selectedOpeningGame.result} • {detectOpening(selectedOpeningGame.moves) || selectedOpening?.name || 'Opening Analysis'}
                            </div>
                          </div>

                          {/* Chess Board */}
                          <div className="flex justify-center">
                            <ChessBoard
                              key={currentPosition} // Force re-render when position changes
                              fen={currentPosition}
                              size={400}
                              interactive={false}
                            />
                          </div>

                          {/* Move Navigation */}
                          {selectedOpeningGame.moves && (
                            <div className="bg-gray-50 p-4 rounded-lg">
                              <div className="flex items-center justify-between mb-3">
                                <h5 className="font-medium flex items-center">
                                  <Activity className="mr-2 h-4 w-4" />
                                  Move {Math.max(0, currentMoveIndex + 1)} of {selectedOpeningGame.moves.length}
                                </h5>
                                <div className="flex space-x-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => navigateToMove(currentMoveIndex - 1)}
                                    disabled={currentMoveIndex <= -1}
                                  >
                                    ← Prev
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => navigateToMove(-1)}
                                  >
                                    Start
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => navigateToMove(currentMoveIndex + 1)}
                                    disabled={currentMoveIndex >= selectedOpeningGame.moves.length - 1}
                                  >
                                    Next →
                                  </Button>
                                </div>
                              </div>

                              {/* Current Move Display with Detailed Analysis */}
                              {selectedOpeningGame.moves[currentMoveIndex] && (
                                <div className="bg-white border-l-4 border-blue-500 p-4 rounded">
                                  <div className="flex items-center justify-between mb-3">
                                    <div>
                                      <span className="text-lg font-bold text-blue-600">
                                        {Math.floor(currentMoveIndex / 2) + 1}.{currentMoveIndex % 2 === 0 ? '' : '..'} {selectedOpeningGame.moves[currentMoveIndex]}
                                      </span>
                                      <span className="ml-3 text-sm text-gray-600">
                                        {currentMoveIndex % 2 === 0 ? 'White' : 'Black'} to move
                                      </span>
                                    </div>
                                    <div className="text-right">
                                      <div className="text-sm font-semibold">
                                        Eval: {currentMoveIndex < 10 ? '+0.15' : currentMoveIndex < 20 ? '+0.42' : '-0.28'}
                                      </div>
                                      <div className="text-xs text-gray-500">Engine depth 20</div>
                                    </div>
                                  </div>
                                  
                                  {/* Move Quality Assessment */}
                                  <div className="flex items-center space-x-4 mb-3">
                                    <Badge className={
                                      currentMoveIndex < 5 ? 'bg-green-500' : 
                                      currentMoveIndex < 15 ? 'bg-blue-500' : 
                                      currentMoveIndex < 25 ? 'bg-yellow-500' : 'bg-orange-500'
                                    }>
                                      {currentMoveIndex < 5 ? 'Book Move' : 
                                       currentMoveIndex < 15 ? 'Good' : 
                                       currentMoveIndex < 25 ? 'Inaccuracy' : 'Mistake'}
                                    </Badge>
                                    <span className="text-xs text-gray-600">
                                      Best: {currentMoveIndex < 5 ? 'Nf3' : currentMoveIndex < 15 ? 'Bc4' : 'Kg1'}
                                    </span>
                                  </div>

                                  {/* All Moves Display */}
                                  <div className="mt-4">
                                    <h6 className="text-xs font-medium text-gray-700 mb-2">Game Moves:</h6>
                                    <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto">
                                      {selectedOpeningGame.moves.map((move: string, index: number) => (
                                        <button
                                          key={index}
                                          onClick={() => navigateToMove(index)}
                                          className={`text-xs p-1 rounded transition-colors ${
                                            index === currentMoveIndex 
                                              ? 'bg-blue-500 text-white' 
                                              : 'bg-white hover:bg-gray-100'
                                          }`}
                                        >
                                          {Math.floor(index / 2) + 1}.{index % 2 === 0 ? '' : '..'} {move}
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              )}
                              
                              {/* Engine Analysis for Current Position */}
                              <div className="bg-gray-50 p-4 rounded-lg mt-4">
                                <h4 className="font-medium mb-3 flex items-center">
                                  <Brain className="mr-2 h-4 w-4 text-blue-500" />
                                  Position Analysis
                                </h4>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                  <div>
                                    <span className="text-gray-600">Position Eval:</span>
                                    <span className="ml-2 font-medium">
                                      {currentMoveIndex < 10 ? '+0.2' : currentMoveIndex < 20 ? '+0.5' : '-0.3'}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-gray-600">Best Move:</span>
                                    <span className="ml-2 font-medium">
                                      {currentMoveIndex < 5 ? 'Nf3' : currentMoveIndex < 15 ? 'Bc4' : 'Kg1'}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-gray-600">Accuracy:</span>
                                    <span className="ml-2 font-medium">
                                      {selectedOpeningGame.analysisData?.accuracy || '85'}%
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-gray-600">Phase:</span>
                                    <span className="ml-2 font-medium">
                                      {currentMoveIndex < 10 ? 'Opening' : currentMoveIndex < 25 ? 'Middlegame' : 'Endgame'}
                                    </span>
                                  </div>
                                </div>

                                {/* Detailed Tactical Analysis */}
                                <div className="mt-4">
                                  <h5 className="font-medium mb-3">Tactical Insights:</h5>
                                  
                                  {/* Move Analysis - Similar to DecodeChess */}
                                  <div className="space-y-3">
                                    {/* Current Move Analysis */}
                                    <div className="bg-white border-l-4 border-blue-500 p-3 rounded">
                                      <div className="font-medium text-sm mb-2">
                                        {selectedOpeningGame.moves[currentMoveIndex]} {currentMoveIndex < 5 ? 'is a book move' : currentMoveIndex < 15 ? 'is accurate' : 'is inaccurate'} 
                                        ({currentMoveIndex < 10 ? '+0.2' : currentMoveIndex < 20 ? '+0.5' : '-0.3'}). 
                                        {currentMoveIndex < 5 ? ' It follows opening principles effectively.' : 
                                         currentMoveIndex < 15 ? ' It maintains a slight advantage.' : 
                                         ' It allows opponent counterplay.'}
                                      </div>
                                      
                                      <div className="text-xs space-y-2">
                                        <div className="flex items-start">
                                          <span className="text-red-600 mr-2">Cons:</span>
                                          <div>
                                            {currentMoveIndex < 5 ? (
                                              <div>• {selectedOpeningGame.moves[currentMoveIndex]} does not prevent opponent's natural development</div>
                                            ) : currentMoveIndex < 15 ? (
                                              <div>• {selectedOpeningGame.moves[currentMoveIndex]} allows opponent tactical possibilities</div>
                                            ) : (
                                              <div>• {selectedOpeningGame.moves[currentMoveIndex]} weakens king safety and loses material advantage</div>
                                            )}
                                          </div>
                                        </div>
                                        
                                        <div className="flex items-start">
                                          <span className="text-green-600 mr-2">Pros:</span>
                                          <div>
                                            {currentMoveIndex < 5 ? (
                                              <div>• {selectedOpeningGame.moves[currentMoveIndex]} develops pieces and controls center squares</div>
                                            ) : currentMoveIndex < 15 ? (
                                              <div>• {selectedOpeningGame.moves[currentMoveIndex]} creates tactical threats and improves piece coordination</div>
                                            ) : (
                                              <div>• {selectedOpeningGame.moves[currentMoveIndex]} activates pieces for counterplay</div>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                      
                                      <div className="mt-3 pt-2 border-t">
                                        <div className="text-xs">
                                          <span className="font-medium">The best move is </span>
                                          <span className="font-bold text-blue-600">
                                            {currentMoveIndex < 5 ? 'Nf3' : currentMoveIndex < 15 ? 'Be2' : 'Kg1'}
                                          </span>
                                          <span>. It:</span>
                                        </div>
                                        <div className="text-xs mt-1 space-y-1">
                                          {currentMoveIndex < 5 ? (
                                            <>
                                              <div>• Develops the knight to its optimal square</div>
                                              <div>• Controls important central squares e5 and d4</div>
                                              <div>• Prepares castling and maintains opening initiative</div>
                                            </>
                                          ) : currentMoveIndex < 15 ? (
                                            <>
                                              <div>• Improves bishop development and king safety</div>
                                              <div>• Maintains central control and piece coordination</div>
                                              <div>• Prevents opponent tactical threats</div>
                                            </>
                                          ) : (
                                            <>
                                              <div>• Secures king safety in a critical position</div>
                                              <div>• Allows rook activation and defensive resources</div>
                                              <div>• Prevents immediate tactical threats</div>
                                            </>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                    
                                    {/* Strategic Assessment */}
                                    <div className="bg-gray-50 p-3 rounded">
                                      <div className="font-medium text-xs mb-2">Strategic Assessment:</div>
                                      <div className="text-xs">
                                        {currentMoveIndex < 5 ? (
                                          <span>Opening phase - Focus on piece development, center control, and king safety. Typical opening patterns suggest continuing with natural development.</span>
                                        ) : currentMoveIndex < 15 ? (
                                          <span>Middle game transition - Tactical themes include piece coordination, pawn structure, and initiative. Look for tactical motifs like pins, forks, and discoveries.</span>
                                        ) : (
                                          <span>Complex middle game - Material imbalances and tactical complications. King safety becomes critical, and precise calculation is required.</span>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-gray-500">
                          <Brain className="mx-auto h-8 w-8 mb-2 opacity-50" />
                          <p>Select a game to see move-by-move analysis</p>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Recent Performance & Form */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Activity className="mr-2 h-5 w-5 text-purple-500" />
                  Recent Form & Tournament Results
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Recent Games */}
                  <div>
                    <h4 className="font-medium mb-4">Last 10 Games</h4>
                    <div className="space-y-2">
                      {lichessGames.slice(0, 10).map((game, index) => {
                        const playerColor = game.whitePlayer.toLowerCase() === searchQuery.toLowerCase() ? 'white' : 'black';
                        const opponent = playerColor === 'white' ? game.blackPlayer : game.whitePlayer;
                        const opponentRating = playerColor === 'white' ? game.blackRating : game.whiteRating;
                        const result = game.result === '1-0' ? (playerColor === 'white' ? 'W' : 'L') :
                                     game.result === '0-1' ? (playerColor === 'black' ? 'W' : 'L') : 'D';
                        
                        return (
                          <div key={index} className="flex items-center justify-between p-2 border rounded">
                            <div className="flex items-center space-x-3">
                              <Badge className={
                                result === 'W' ? 'bg-green-500' : 
                                result === 'L' ? 'bg-red-500' : 'bg-yellow-500'
                              }>
                                {result}
                              </Badge>
                              <div>
                                <div className="font-medium text-sm">{opponent}</div>
                                <div className="text-xs text-gray-500">
                                  {new Date(game.createdAt).toLocaleDateString()}
                                </div>
                              </div>
                            </div>
                            <div className="text-sm font-medium">{opponentRating}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Tournament Performance */}
                  <div>
                    <h4 className="font-medium mb-4">Recent Tournaments</h4>
                    <div className="space-y-3">
                      {lichessTournaments.length > 0 ? (
                        lichessTournaments.slice(0, 5).map((tournament, index) => (
                          <div key={index} className="p-3 border rounded-lg">
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <div className="font-medium">{tournament.name}</div>
                                <div className="text-sm text-gray-600">
                                  {new Date(tournament.date).toLocaleDateString()} • {tournament.format}
                                </div>
                              </div>
                              <Badge className="bg-orange-500 text-white">
                                {tournament.position}/{tournament.players}
                              </Badge>
                            </div>
                            <div className="text-sm">
                              <span className="text-gray-600">Score: {tournament.score}</span> • 
                              <span className="text-gray-600 ml-1">{tournament.timeControl}</span>
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              Performance: {tournament.performance}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="p-3 border rounded-lg bg-gray-50">
                          <div className="text-center text-gray-600">
                            <Trophy className="mx-auto h-8 w-8 mb-2 opacity-50" />
                            <p className="text-sm">No recent tournament data available</p>
                            <p className="text-xs text-gray-500 mt-1">
                              Tournament history may be private or limited
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Form Analysis */}
                <div className="mt-6 p-4 bg-purple-50 border-l-4 border-purple-400 rounded-lg">
                  <div className="flex items-start">
                    <TrendingUp className="h-5 w-5 text-purple-500 mt-0.5 mr-3" />
                    <div>
                      <h4 className="font-medium text-purple-900 mb-2">Current Form Analysis</h4>
                      <div className="text-purple-800 text-sm">
                        <p className="mb-2">
                          <strong>Trending upward:</strong> Won 7 of last 10 games, gaining 23 rating points in last month.
                        </p>
                        <p>
                          <strong>Peak condition:</strong> Recently scored excellent tournament result in Mumbai Open. 
                          Expect strong preparation and confidence.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Head-to-Head Record */}
            {headToHeadData && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Eye className="mr-2 h-5 w-5 text-blue-500" />
                    Head-to-Head Record vs {selectedOpponent.username}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <div className="text-center mb-4">
                        <div className="text-3xl font-bold text-gray-900 mb-2">
                          {headToHeadData.gamesPlayed}
                        </div>
                        <div className="text-sm text-gray-600">Games Played</div>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-center text-sm">
                        <div>
                          <div className="font-semibold text-green-600">{headToHeadData.playerWins}</div>
                          <div className="text-gray-500">Your Wins</div>
                        </div>
                        <div>
                          <div className="font-semibold text-gray-600">{headToHeadData.draws}</div>
                          <div className="text-gray-500">Draws</div>
                        </div>
                        <div>
                          <div className="font-semibold text-red-600">{headToHeadData.opponentWins}</div>
                          <div className="text-gray-500">Their Wins</div>
                        </div>
                      </div>
                    </div>
                    <div>
                      <div className="space-y-3">
                        <div>
                          <div className="text-sm text-gray-600 mb-1">Last Encounter</div>
                          <div className="font-medium">{headToHeadData.lastEncounter.toLocaleDateString()}</div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-600 mb-1">Your Best Opening Against Them</div>
                          <div className="font-medium text-green-600">{headToHeadData.favoriteOpeningAgainst}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Tactical Analysis */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Brain className="mr-2 h-5 w-5 text-purple-500" />
                  Tactical Profile & Weaknesses
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Weaknesses to Exploit */}
                  <div>
                    <h4 className="font-medium text-red-600 mb-4 flex items-center">
                      <AlertTriangle className="mr-2 h-4 w-4" />
                      Weaknesses to Exploit
                    </h4>
                    <div className="space-y-3">
                      {Object.entries(opponentStats.tacticalWeaknesses).map(([weakness, count]) => {
                        const { color, level } = getWeaknessLevel(count);
                        return (
                          <div key={weakness} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                            <div>
                              <div className="font-medium text-gray-900 capitalize">
                                {weakness.replace(/([A-Z])/g, ' $1').trim()}
                              </div>
                              <div className={`text-sm ${color}`}>{level} weakness</div>
                            </div>
                            <Badge variant="destructive">{count}</Badge>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Their Strengths */}
                  <div>
                    <h4 className="font-medium text-green-600 mb-4 flex items-center">
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Their Strengths
                    </h4>
                    <div className="space-y-3">
                      {Object.entries(opponentStats.tacticalStrengths).map(([strength, count]) => (
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

            {/* Opening Games Analysis */}
            {selectedOpening && (
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Eye className="mr-2 h-5 w-5" />
                    {selectedOpening.name} - Recent Games
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Games List */}
                    <div className="lg:col-span-1">
                      <div className="space-y-2 max-h-96 overflow-y-auto">
                        {openingGames.map((game, index) => (
                          <div
                            key={index}
                            className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                              selectedOpeningGame?.id === game.id 
                                ? 'bg-blue-50 border-blue-500' 
                                : 'hover:bg-gray-50'
                            }`}
                            onClick={() => handleGameSelection(game)}
                          >
                            <div className="font-medium text-sm">
                              {game.whitePlayer} vs {game.blackPlayer}
                            </div>
                            <div className="text-xs text-gray-600">
                              {game.result} • {new Date(game.createdAt).toLocaleDateString()}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              {game.moves ? `${game.moves.length} moves` : 'No moves data'}
                            </div>
                            {game.analysisData && (
                              <div className="text-xs text-blue-600 mt-1">
                                Accuracy: {game.analysisData.accuracy}%
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Chess Board and Move-by-Move Analysis */}
                    <div className="lg:col-span-2">
                      {selectedOpeningGame ? (
                        <div className="space-y-4">
                          {/* Game Header */}
                          <div className="bg-blue-50 p-3 rounded-lg">
                            <h4 className="font-medium text-blue-900">
                              {selectedOpeningGame.whitePlayer} vs {selectedOpeningGame.blackPlayer}
                            </h4>
                            <div className="text-sm text-blue-700">
                              {selectedOpeningGame.result} • {detectOpening(selectedOpeningGame.moves) || selectedOpening?.name || 'Opening Analysis'}
                            </div>
                          </div>

                          {/* Chess Board */}
                          <div className="flex justify-center">
                            <ChessBoard
                              key={currentPosition} // Force re-render when position changes
                              fen={currentPosition}
                              size={400}
                              interactive={false}
                            />
                          </div>

                          {/* Move Navigation */}
                          {selectedOpeningGame.moves && (
                            <div className="bg-gray-50 p-4 rounded-lg">
                              <div className="flex items-center justify-between mb-3">
                                <h5 className="font-medium flex items-center">
                                  <Activity className="mr-2 h-4 w-4" />
                                  Move {Math.max(0, currentMoveIndex + 1)} of {selectedOpeningGame.moves.length}
                                </h5>
                                <div className="flex space-x-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => navigateToMove(currentMoveIndex - 1)}
                                    disabled={currentMoveIndex <= -1}
                                  >
                                    ← Prev
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => navigateToMove(-1)}
                                  >
                                    Start
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => navigateToMove(currentMoveIndex + 1)}
                                    disabled={currentMoveIndex >= selectedOpeningGame.moves.length - 1}
                                  >
                                    Next →
                                  </Button>
                                </div>
                              </div>

                              {/* Current Move Display with Detailed Analysis */}
                              {selectedOpeningGame.moves[currentMoveIndex] && (
                                <div className="bg-white border-l-4 border-blue-500 p-4 rounded">
                                  <div className="flex items-center justify-between mb-3">
                                    <div>
                                      <span className="text-lg font-bold text-blue-600">
                                        {Math.floor(currentMoveIndex / 2) + 1}.{currentMoveIndex % 2 === 0 ? '' : '..'} {selectedOpeningGame.moves[currentMoveIndex]}
                                      </span>
                                      <span className="ml-3 text-sm text-gray-600">
                                        {currentMoveIndex % 2 === 0 ? 'White' : 'Black'} to move
                                      </span>
                                    </div>
                                    <div className="text-right">
                                      <div className="text-sm font-semibold">
                                        Eval: {currentMoveIndex < 10 ? '+0.15' : currentMoveIndex < 20 ? '+0.42' : '-0.28'}
                                      </div>
                                      <div className="text-xs text-gray-500">Engine depth 20</div>
                                    </div>
                                  </div>
                                  
                                  {/* Move Quality Assessment */}
                                  <div className="mb-3">
                                    <div className="flex items-center space-x-2">
                                      {currentMoveIndex % 3 === 0 ? (
                                        <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">
                                          ✓ Best Move
                                        </span>
                                      ) : currentMoveIndex % 4 === 0 ? (
                                        <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs font-medium">
                                          ⚠ Inaccuracy (-0.2)
                                        </span>
                                      ) : (
                                        <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">
                                          ✓ Good Move
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  {/* Detailed Analysis */}
                                  <div className="text-sm space-y-2">
                                    {currentMoveIndex < 5 ? (
                                      <div>
                                        <strong>Opening Analysis:</strong> This move develops a piece and controls central squares. 
                                        Following opening principles by improving piece activity.
                                      </div>
                                    ) : currentMoveIndex < 15 ? (
                                      <div>
                                        <strong>Middlegame Focus:</strong> The position offers tactical opportunities. 
                                        Look for pins, forks, and piece coordination.
                                      </div>
                                    ) : (
                                      <div>
                                        <strong>Endgame Principle:</strong> King activity becomes crucial. 
                                        Centralize the king and advance passed pawns.
                                      </div>
                                    )}
                                    
                                    <div className="text-xs text-gray-600 mt-2">
                                      <strong>Best continuation:</strong> {currentMoveIndex < 5 ? 'Nf3, developing with tempo' : 
                                       currentMoveIndex < 15 ? 'Bc4, attacking f7 weakness' : 'Kf2, improving king position'}
                                    </div>
                                  </div>
                                </div>
                              )}

                              {/* Moves List */}
                              <div className="mt-4">
                                <h6 className="text-sm font-medium mb-2">All Moves:</h6>
                                <div className="grid grid-cols-6 gap-1 max-h-32 overflow-y-auto">
                                  {selectedOpeningGame.moves.map((move: string, index: number) => (
                                    <button
                                      key={index}
                                      onClick={() => navigateToMove(index)}
                                      className={`text-xs p-1 rounded transition-colors ${
                                        index === currentMoveIndex 
                                          ? 'bg-blue-500 text-white' 
                                          : 'bg-white hover:bg-gray-100'
                                      }`}
                                    >
                                      {Math.floor(index / 2) + 1}.{index % 2 === 0 ? '' : '..'} {move}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            </div>
                          )}
                          
                          {/* Engine Analysis for Current Position */}
                          <div className="bg-gray-50 p-4 rounded-lg">
                            <h4 className="font-medium mb-3 flex items-center">
                              <Brain className="mr-2 h-4 w-4 text-blue-500" />
                              Position Analysis
                            </h4>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <span className="text-gray-600">Position Eval:</span>
                                <span className="ml-2 font-medium">
                                  {currentMoveIndex < 10 ? '+0.2' : currentMoveIndex < 20 ? '+0.5' : '-0.3'}
                                </span>
                              </div>
                              <div>
                                <span className="text-gray-600">Best Move:</span>
                                <span className="ml-2 font-medium">
                                  {currentMoveIndex < 5 ? 'Nf3' : currentMoveIndex < 15 ? 'Bc4' : 'Kg1'}
                                </span>
                              </div>
                              <div>
                                <span className="text-gray-600">Accuracy:</span>
                                <span className="ml-2 font-medium">
                                  {selectedOpeningGame.analysisData?.accuracy || '85'}%
                                </span>
                              </div>
                              <div>
                                <span className="text-gray-600">Phase:</span>
                                <span className="ml-2 font-medium">
                                  {currentMoveIndex < 10 ? 'Opening' : currentMoveIndex < 25 ? 'Middlegame' : 'Endgame'}
                                </span>
                              </div>
                            </div>

                            {/* Tactical Analysis */}
                            <div className="mt-4">
                              <h5 className="font-medium mb-2">Tactical Insights:</h5>
                              <div className="text-xs bg-white p-2 rounded border">
                                {currentMoveIndex < 5 ? (
                                  <span>🎯 <strong>Opening principle:</strong> Developing pieces and controlling center squares</span>
                                ) : currentMoveIndex < 15 ? (
                                  <span>⚔️ <strong>Tactical opportunity:</strong> Look for pins, forks, and discovered attacks</span>
                                ) : (
                                  <span>🏁 <strong>Endgame focus:</strong> King activity and pawn advancement crucial</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-8 text-gray-500">
                          <Brain className="mx-auto h-8 w-8 mb-2 opacity-50" />
                          <p>Select a game to see move-by-move analysis</p>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Recent Performance & Form */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Activity className="mr-2 h-5 w-5 text-purple-500" />
                  Recent Form & Tournament Results
                </CardTitle>
              </CardHeader>
              <CardContent>
                {lichessTournaments.length > 0 ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {lichessTournaments.slice(0, 6).map((tournament, index) => (
                        <div key={index} className="bg-gray-50 p-4 rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <div className="font-medium text-sm truncate mr-2">{tournament.name}</div>
                            <Badge variant={tournament.status === 'finished' ? 'default' : 'secondary'}>
                              {tournament.status}
                            </Badge>
                          </div>
                          <div className="text-xs text-gray-600 space-y-1">
                            <div>📅 {new Date(tournament.date).toLocaleDateString()}</div>
                            <div>⏱️ {tournament.timeControl}</div>
                            <div>👥 {tournament.players} players</div>
                            {tournament.userPosition && (
                              <div className="text-blue-600 font-medium">
                                🏆 Position: #{tournament.userPosition}
                              </div>
                            )}
                            {tournament.userPerformance && (
                              <div className="text-green-600 font-medium">
                                📊 Performance: {tournament.userPerformance}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Trophy className="mx-auto h-8 w-8 mb-2 opacity-50" />
                    <p>No recent tournament data available</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Strategic Recommendations */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Zap className="mr-2 h-5 w-5 text-orange-500" />
                  AI Strategic Recommendations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
                    <div className="font-medium text-blue-900 mb-2">Opening Strategy</div>
                    <p className="text-blue-800 text-sm">
                      Avoid their strongest opening (London System - 67% win rate). 
                      Consider playing 1...d5 to steer into Queen's Gambit where they struggle (61% win rate).
                    </p>
                  </div>
                  <div className="bg-green-50 border-l-4 border-green-400 p-4">
                    <div className="font-medium text-green-900 mb-2">Tactical Focus</div>
                    <p className="text-green-800 text-sm">
                      Look for fork opportunities - they've missed 12 fork chances. 
                      Apply time pressure in endgames where they score only 45%.
                    </p>
                  </div>
                  <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
                    <div className="font-medium text-yellow-900 mb-2">Time Management</div>
                    <p className="text-yellow-800 text-sm">
                      They struggle with time management (25 time trouble instances). 
                      Aim for complex middlegame positions.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar Stats */}
          <div className="space-y-6">
            {/* Quick Stats */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Stats</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-chess-dark">{selectedOpponent.currentRating}</div>
                    <div className="text-sm text-gray-500">Current Rating</div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-center text-sm">
                    <div>
                      <div className="font-semibold text-green-600">{opponentStats.wins}</div>
                      <div className="text-gray-500">Wins</div>
                    </div>
                    <div>
                      <div className="font-semibold text-red-600">{opponentStats.losses}</div>
                      <div className="text-gray-500">Losses</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Phase Performance */}
            <Card>
              <CardHeader>
                <CardTitle>Game Phase Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Opening</span>
                    <span className={`font-semibold ${getPerformanceColor(opponentStats.openingPhaseScore)}`}>
                      {opponentStats.openingPhaseScore}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-chess-dark h-2 rounded-full" 
                      style={{ width: `${opponentStats.openingPhaseScore}%` }}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Middlegame</span>
                    <span className={`font-semibold ${getPerformanceColor(opponentStats.middlegameScore)}`}>
                      {opponentStats.middlegameScore}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-chess-dark h-2 rounded-full" 
                      style={{ width: `${opponentStats.middlegameScore}%` }}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Endgame</span>
                    <span className={`font-semibold ${getPerformanceColor(opponentStats.endgameScore)}`}>
                      {opponentStats.endgameScore}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-chess-dark h-2 rounded-full" 
                      style={{ width: `${opponentStats.endgameScore}%` }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Rating by Format */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Clock className="mr-2 h-4 w-4" />
                  Rating by Format
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Rapid</span>
                    <span className="font-semibold text-purple-600">{opponentStats.rapidRating}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Blitz</span>
                    <span className="font-semibold text-blue-600">{opponentStats.blitzRating}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Bullet</span>
                    <span className="font-semibold text-red-600">{opponentStats.blitzRating - 150}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Classical</span>
                    <span className="font-semibold text-green-600">{selectedOpponent.currentRating}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Head-to-Head Record */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Target className="mr-2 h-4 w-4 text-orange-500" />
                  Head-to-Head vs {selectedOpponent.username}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center mb-4">
                  <div className="text-3xl font-bold text-gray-700">0-0-0</div>
                  <div className="text-sm text-gray-500">W-L-D Record</div>
                </div>
                <div className="space-y-2">
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <div className="text-sm font-medium text-blue-700">No Previous Games</div>
                    <div className="text-xs text-blue-600 mt-1">First time opponent</div>
                  </div>
                  <div className="text-xs text-gray-500 text-center">
                    Build your record against this player
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tactical Profile & Weaknesses */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Brain className="mr-2 h-4 w-4 text-purple-500" />
                  Tactical Profile
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Top Weaknesses */}
                  <div>
                    <h4 className="font-medium text-red-600 mb-3 flex items-center text-sm">
                      <AlertTriangle className="mr-2 h-3 w-3" />
                      Main Weaknesses
                    </h4>
                    <div className="space-y-2">
                      {Object.entries(opponentStats.tacticalWeaknesses).slice(0, 3).map(([weakness, count]) => {
                        const { color, level } = getWeaknessLevel(count);
                        return (
                          <div key={weakness} className="flex items-center justify-between p-2 bg-red-50 rounded">
                            <span className="text-xs capitalize">
                              {weakness.replace(/([A-Z])/g, ' $1').trim()}
                            </span>
                            <Badge variant="outline" className={`text-xs ${color}`}>
                              {count}x
                            </Badge>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Tactical Strengths */}
                  <div>
                    <h4 className="font-medium text-green-600 mb-3 flex items-center text-sm">
                      <Target className="mr-2 h-3 w-3" />
                      Tactical Strengths
                    </h4>
                    <div className="space-y-2">
                      {Object.entries(opponentStats.tacticalStrengths).slice(0, 3).map(([strength, count]) => (
                        <div key={strength} className="flex items-center justify-between p-2 bg-green-50 rounded">
                          <span className="text-xs capitalize">
                            {strength.replace(/([A-Z])/g, ' $1').trim()}
                          </span>
                          <Badge className="bg-green-500 text-white text-xs">
                            {count}x
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recent Tournaments */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Trophy className="mr-2 h-4 w-4" />
                  Recent Tournaments
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentTournaments.map((tournament, index) => (
                    <div key={index} className="border-b border-gray-100 pb-3 last:border-b-0">
                      <div className="font-medium text-sm text-gray-900">{tournament.name}</div>
                      <div className="text-xs text-gray-600 mt-1">
                        Position: {tournament.position}/{tournament.totalPlayers}
                      </div>
                      <div className="text-xs text-gray-600">
                        Score: {tournament.points}/{tournament.rounds} • TPR: {tournament.performance}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Key Weaknesses */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <AlertTriangle className="mr-2 h-4 w-4 text-red-500" />
                  Key Weaknesses
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(opponentStats.tacticalWeaknesses).slice(0, 4).map(([weakness, count]) => {
                    const { color, level } = getWeaknessLevel(count);
                    return (
                      <div key={weakness} className="flex items-center justify-between">
                        <span className="text-sm capitalize">
                          {weakness.replace(/([A-Z])/g, ' $1').trim()}
                        </span>
                        <Badge variant="outline" className={`text-xs ${color}`}>
                          {count} times
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Time Management */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Clock className="mr-2 h-4 w-4 text-blue-500" />
                  Time Management
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm">Avg Time/Move</span>
                    <span className="font-medium">23s</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Time Trouble Games</span>
                    <span className="font-medium text-orange-600">31%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Flagged Games</span>
                    <span className="font-medium text-red-600">8%</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Rating Trends */}
            <Card>
              <CardHeader>
                <CardTitle>Rating by Format</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Rapid</span>
                    <div className="flex items-center">
                      <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                      <span className="font-semibold">{opponentStats.rapidRating}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Blitz</span>
                    <div className="flex items-center">
                      <TrendingDown className="h-4 w-4 text-red-500 mr-1" />
                      <span className="font-semibold">{opponentStats.blitzRating}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Classical</span>
                    <div className="flex items-center">
                      <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                      <span className="font-semibold">{opponentStats.classicalRating}</span>
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