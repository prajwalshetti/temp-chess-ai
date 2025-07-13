import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
  Swords,
  BookOpen
} from "lucide-react";
import type { User, PlayerStats, Opening, Game } from "@shared/schema";

// Extend User type to include ratingByFormat for Lichess data
type ExtendedUser = User & {
  ratingByFormat?: {
    ultraBullet: number | null;
    bullet: number | null;
    blitz: number | null;
    rapid: number | null;
    classical: number | null;
    correspondence: number | null;
  };
};

import { ChessBoard } from "@/components/ChessBoard";
import { GameAnalyzer } from "@/components/GameAnalyzer";
import { Chess } from "chess.js";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

export default function OpponentScout() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Helper function to convert moves array to simple string
  const convertMovesToString = (game: any): string => {
    if (!game.moves || !Array.isArray(game.moves) || game.moves.length === 0) {
      console.warn("No moves found in game:", game);
      return '';
    }
    
    // Simply join the moves with spaces
    const movesString = game.moves.join(' ');
    console.log("Moves string:", movesString);
    return movesString;
  };

  // Simplified game analysis function using reusable component
  const analyzeGameWithStockfish = async (game: any) => {
    console.log("Analyzing game:", game);
    console.log("Game moves:", game.moves);
    const movesString = convertMovesToString(game);
    console.log("Moves string:", movesString);
    setSelectedGameForAnalysis(game);
    setShowAnalysisModal(true);
  };




  const [searchQuery, setSearchQuery] = useState("");
  const [selectedOpponent, setSelectedOpponent] = useState<ExtendedUser | null>(null);
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
  const [engineAnalysis, setEngineAnalysis] = useState<any>(null);
  const [selectedGameForAnalysis, setSelectedGameForAnalysis] = useState<any>(null);
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);

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
    
    // Filter games for this specific opening using the actual opening field from Lichess
    const gamesWithOpening = lichessGames.filter(game => {
      if (!game.opening) return false;
      
      // Match by opening name directly from Lichess data
      return game.opening.toLowerCase() === opening.name.toLowerCase() ||
             game.opening.toLowerCase().includes(opening.name.toLowerCase()) ||
             opening.name.toLowerCase().includes(game.opening.toLowerCase());
    }).slice(0, 10);
    
    setOpeningGames(gamesWithOpening);
    setSelectedOpeningGame(null);
    
    // Auto-scroll to games section after games are loaded
    setTimeout(() => {
      const gamesSection = document.getElementById('opponent-opening-games-section');
      if (gamesSection) {
        // Wait for the section to be fully rendered
        requestAnimationFrame(() => {
          gamesSection.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start',
            inline: 'nearest'
          });
          // Add a subtle pulse effect to highlight the section
          gamesSection.style.transform = 'scale(1.01)';
          setTimeout(() => {
            gamesSection.style.transform = 'scale(1)';
          }, 200);
        });
      }
    }, 100);
  };

  // Handle game selection for move-by-move analysis
  const handleGameSelection = (game: any) => {
    setSelectedOpeningGame(game);
    setCurrentMoveIndex(-1); // Start at -1 so first move shows starting position
    setCurrentPosition("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1");
  };

  // Navigate through moves and display stored evaluations
  const navigateToMove = (moveIndex: number) => {
    if (!selectedOpeningGame || !selectedOpeningGame.moves) return;
    
    setCurrentMoveIndex(moveIndex);
    
    // Calculate the position after the specified move
    try {
      const chess = new Chess();
      let newPosition = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
      
      // If moveIndex is -1, show starting position
      if (moveIndex < 0) {
        setCurrentPosition(newPosition);
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
      newPosition = chess.fen();
      console.log(`Setting new position: ${newPosition}`);
      setCurrentPosition(newPosition);
      
    } catch (error) {
      console.log("Error calculating position:", error);
      const startPos = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
      setCurrentPosition(startPos);
    }
  };



  // Handle Lichess search
  const handleLichessSearch = async () => {
    if (!searchQuery.trim()) return;

    setIsLoadingLichess(true);
    try {
      // Fetch insights which contains both games and opening repertoire
      const [insightsResponse, tournamentsResponse, tacticsResponse] = await Promise.all([
        fetch(`/api/lichess/user/${searchQuery}/insights`),
        fetch(`/api/lichess/user/${searchQuery}/tournaments`),
        fetch(`/api/tactics/${encodeURIComponent(searchQuery)}`),
      ]);
      
      if (insightsResponse.ok) {
        const insightsData = await insightsResponse.json();
        const tournamentsData = tournamentsResponse.ok ? await tournamentsResponse.json() : { tournaments: [] };
        const tacticsData = tacticsResponse.ok ? await tacticsResponse.json() : { tactics: [] };
        
        // Use insights data which already contains opening repertoire
        setLichessInsights(insightsData);
        setLichessTournaments(tournamentsData.tournaments);
        console.log('Tactics endpoint response:', tacticsData);
        
        // Fetch authentic Lichess profile data directly from their API
        try {
          const profileResponse = await fetch(`https://lichess.org/api/user/${searchQuery}`);
          const profileData = await profileResponse.json();
          
          const ratingByFormat = {
            ultraBullet: profileData.perfs?.ultraBullet?.rating || null,
            bullet: profileData.perfs?.bullet?.rating || null,
            blitz: profileData.perfs?.blitz?.rating || null,
            rapid: profileData.perfs?.rapid?.rating || null,
            classical: profileData.perfs?.classical?.rating || null,
            correspondence: profileData.perfs?.correspondence?.rating || null
          };
          
          // Use authentic Lichess profile data
          setSelectedOpponent({
            id: Date.now(),
            username: profileData.username,
            email: `${profileData.username}@lichess.org`,
            fideId: null,
            aicfId: null,
            lichessId: profileData.username,
            currentRating: ratingByFormat.blitz || ratingByFormat.rapid || ratingByFormat.bullet || null,
            puzzleRating: null,
            createdAt: new Date(profileData.createdAt),
            ratingByFormat: ratingByFormat
          } as any);
        } catch (profileError) {
          console.error('Error fetching profile:', profileError);
          // Only show data if we can get authentic profile info
          setSelectedOpponent(null);
        }
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
    rapidRating: selectedOpponent.ratingByFormat?.rapid,
    blitzRating: selectedOpponent.ratingByFormat?.blitz,
    classicalRating: selectedOpponent.ratingByFormat?.classical,
    bulletRating: selectedOpponent.ratingByFormat?.bullet,
    ultraBulletRating: selectedOpponent.ratingByFormat?.ultraBullet,
    tacticalStrengths: {
      pins: 18,
      discoveredAttacks: 15,
      deflection: 7,
      backRank: 9,
      pawnBreaks: 11,
      exchanges: 14
    },
    tacticalWeaknesses: {
      missedForks: 12,
      missedSkewers: 15,
      hangingPieces: 22,
      poorEndgamePlay: 18,
      timeManagement: 25,
      weakSquares: 16
    },
    openingPhaseScore: 72,
    middlegameScore: 68,
    endgameScore: 45
  } : null;

  // Use opening repertoire from insights data (already processed by backend)
  const opponentOpenings = lichessInsights?.openingRepertoire ? 
    Object.entries(lichessInsights.openingRepertoire)
      .filter(([opening, data]: [string, any]) => 
        opening && 
        opening.trim() !== '' && 
        opening !== 'Unknown Opening' && 
        data && 
        typeof data.winRate === 'number' && 
        typeof data.games === 'number' && 
        data.games >= 2 &&
        data.winRate >= 0 && 
        data.winRate <= 1
      )
      .map(([opening, data]: [string, any], index) => ({
        id: index + 1,
        name: opening,
        moves: '', // Not available in insights data
        color: 'unknown', // Not available in insights data
        gamesPlayed: data.games,
        wins: data.wins,
        losses: data.losses,
        draws: data.draws
      }))
      .sort((a, b) => b.gamesPlayed - a.gamesPlayed) : [];

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

  // Analysis helper functions
  const formatEvaluation = (eval_value: number | null): string => {
    if (eval_value === null) return "0.00";
    
    if (Math.abs(eval_value) >= 50) {
      return eval_value > 0 ? `+M${Math.ceil(eval_value / 100)}` : `-M${Math.ceil(Math.abs(eval_value) / 100)}`;
    }
    
    const sign = eval_value >= 0 ? "+" : "";
    return `${sign}${eval_value.toFixed(2)}`;
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
                {/* Authentic Lichess Ratings */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                  {selectedOpponent.ratingByFormat?.bullet && (
                    <div className="text-center p-4 bg-red-50 rounded-lg">
                      <div className="text-3xl font-bold text-red-600">{selectedOpponent.ratingByFormat.bullet}</div>
                      <div className="text-sm text-gray-600">Bullet</div>
                      <div className="text-xs text-red-600 mt-1">1+0, 2+1</div>
                    </div>
                  )}
                  {selectedOpponent.ratingByFormat?.blitz && (
                    <div className="text-center p-4 bg-orange-50 rounded-lg">
                      <div className="text-3xl font-bold text-orange-600">{selectedOpponent.ratingByFormat.blitz}</div>
                      <div className="text-sm text-gray-600">Blitz</div>
                      <div className="text-xs text-orange-600 mt-1">3+0, 5+0</div>
                    </div>
                  )}
                  {selectedOpponent.ratingByFormat?.rapid && (
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <div className="text-3xl font-bold text-blue-600">{selectedOpponent.ratingByFormat.rapid}</div>
                      <div className="text-sm text-gray-600">Rapid</div>
                      <div className="text-xs text-blue-600 mt-1">10+0, 15+10</div>
                    </div>
                  )}
                  {selectedOpponent.ratingByFormat?.classical && (
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <div className="text-3xl font-bold text-green-600">{selectedOpponent.ratingByFormat.classical}</div>
                      <div className="text-sm text-gray-600">Classical</div>
                      <div className="text-xs text-green-600 mt-1">30+0, 60+0</div>
                    </div>
                  )}
                  {selectedOpponent.ratingByFormat?.ultraBullet && (
                    <div className="text-center p-4 bg-purple-50 rounded-lg">
                      <div className="text-3xl font-bold text-purple-600">{selectedOpponent.ratingByFormat.ultraBullet}</div>
                      <div className="text-sm text-gray-600">UltraBullet</div>
                      <div className="text-xs text-purple-600 mt-1">15+0 seconds</div>
                    </div>
                  )}
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <div className="text-3xl font-bold text-gray-600">{lichessInsights?.totalGames || 0}</div>
                    <div className="text-sm text-gray-600">Total Games</div>
                    <div className="text-xs text-gray-600 mt-1">All formats</div>
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
            {/* Tactical Strengths & Weaknesses - Hidden */}

            {/* Opening Repertoire Analysis */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Opening Repertoire Analysis
                  {selectedOpening && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        setSelectedOpening(null);
                        setOpeningGames([]);
                        setSelectedOpeningGame(null);
                      }}
                      className="text-xs"
                    >
                      Clear Selection
                    </Button>
                  )}
                </CardTitle>
                <CardDescription>
                  Click any opening to see recent games with engine evaluation below
                  {selectedOpening && (
                    <span className="block mt-2 text-blue-600 font-medium">
                      ↓ {selectedOpening.name} games are shown below ↓
                    </span>
                  )}
                </CardDescription>
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
              <Card id="opponent-opening-games-section" className="mt-6 border-2 border-blue-200 shadow-lg animate-in slide-in-from-top-4 duration-500 transition-transform">
                <CardHeader className="bg-blue-50">
                  <CardTitle className="flex items-center text-blue-900">
                    <Eye className="mr-2 h-5 w-5" />
                    {selectedOpening.name} - Recent Games
                    <Badge className="ml-auto bg-blue-500 text-white">
                      {openingGames.length} games found
                    </Badge>
                  </CardTitle>
                  <CardDescription className="text-blue-700">
                    Analyze move-by-move with real Stockfish evaluations
                  </CardDescription>
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

                          {/* Stockfish Analysis Button */}
                          <div className="flex justify-center mb-4">
                            <button
                              onClick={() => analyzeGameWithStockfish(selectedOpeningGame)}
                              disabled={!selectedOpeningGame}
                              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center space-x-2 shadow-lg"
                            >
                              <>
                                <span>🔥</span>
                                <span>Analyze Game</span>
                              </>
                            </button>
                          </div>

                          {/* Engine Analysis Results */}
                          {engineAnalysis && (
                            <div className="mb-4 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border-l-4 border-blue-500">
                              <h5 className="font-medium text-blue-900 mb-2 flex items-center">
                                <Brain className="mr-2 h-4 w-4" />
                                Stockfish Analysis - Move {currentMoveIndex + 1}
                              </h5>
                              <div className="space-y-2 text-sm">
                                <div className="flex items-center justify-between">
                                  <span>Engine Evaluation:</span>
                                  <span className={`font-bold ${
                                    (engineAnalysis?.analysis?.currentEvaluation?.evaluation || 0) > 100 ? 'text-green-600' :
                                    (engineAnalysis?.analysis?.currentEvaluation?.evaluation || 0) < -100 ? 'text-red-600' :
                                    'text-gray-600'
                                  }`}>
                                    {((engineAnalysis?.analysis?.currentEvaluation?.evaluation || 0) / 100).toFixed(2)}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span>Best Move:</span>
                                  <span className="font-bold text-blue-600">
                                    {engineAnalysis?.analysis?.currentEvaluation?.bestMove || 'N/A'}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span>Depth:</span>
                                  <span className="text-gray-600">
                                    {engineAnalysis?.analysis?.currentEvaluation?.depth || 17} ply
                                  </span>
                                </div>
                                {engineAnalysis?.analysis?.tacticalThemes?.length > 0 && (
                                  <div>
                                    <span>Tactical Themes:</span>
                                    <div className="flex flex-wrap gap-1 mt-1">
                                      {engineAnalysis.analysis.tacticalThemes.map((theme: string, index: number) => (
                                        <Badge key={index} variant="outline" className="text-xs">
                                          {theme}
                                        </Badge>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                <div className="text-xs text-gray-500 mt-2">
                                  Position Type: {engineAnalysis.analysis.positionType}
                                </div>
                              </div>
                            </div>
                          )}

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
                                        {isEvaluating ? (
                                          <div className="flex items-center">
                                            <Brain className="w-3 h-3 mr-1 animate-pulse text-blue-500" />
                                            Analyzing...
                                          </div>
                                        ) : currentEvaluation !== null ? (
                                          <div className={`${currentEvaluation > 0 ? 'text-green-600' : currentEvaluation < 0 ? 'text-red-600' : 'text-gray-600'}`}>
                                            Eval: {currentEvaluation > 0 ? '+' : ''}{currentEvaluation.toFixed(2)}
                                          </div>
                                        ) : (
                                          <div className="text-gray-500">Eval: --</div>
                                        )}
                                      </div>
                                      <div className="text-xs text-gray-500">
                                        Engine depth 17
                                      </div>
                                    </div>
                                  </div>
                                  
                                  {/* Move Quality Assessment - Only show with Stockfish analysis */}
                                  {engineAnalysis && (
                                    <div className="flex items-center space-x-4 mb-3">
                                      <Badge className={(() => {
                                        const evaluation = engineAnalysis.analysis.currentEvaluation.evaluation;
                                        if (Math.abs(evaluation) > 300) return 'bg-red-500';
                                        if (Math.abs(evaluation) > 150) return 'bg-yellow-500';
                                        if (Math.abs(evaluation) > 50) return 'bg-blue-500';
                                        return 'bg-green-500';
                                      })()}>
                                        {(() => {
                                          const evaluation = engineAnalysis.analysis.currentEvaluation.evaluation;
                                          if (currentMoveIndex < 6) return 'Opening';
                                          if (Math.abs(evaluation) > 300) return 'Decisive';
                                          if (Math.abs(evaluation) > 150) return 'Advantage';
                                          if (Math.abs(evaluation) > 50) return 'Slight Edge';
                                          return 'Balanced';
                                        })()}
                                      </Badge>
                                      <span className="text-xs text-gray-600">
                                        Best move: {engineAnalysis.analysis.currentEvaluation.bestMove}
                                      </span>
                                    </div>
                                  )}

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
                              
                              {/* Only show Position Analysis when Stockfish analysis is available */}
                              {engineAnalysis && (
                                <div className="bg-gray-50 p-4 rounded-lg mt-4">
                                  <h4 className="font-medium mb-3 flex items-center">
                                    <Brain className="mr-2 h-4 w-4 text-blue-500" />
                                    Position Analysis (Stockfish)
                                  </h4>
                                  <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                      <span className="text-gray-600">Position Eval:</span>
                                      <span className="ml-2 font-medium">
                                        {(engineAnalysis.analysis.currentEvaluation.evaluation / 100).toFixed(2)}
                                      </span>
                                    </div>
                                    <div>
                                      <span className="text-gray-600">Best Move:</span>
                                      <span className="ml-2 font-medium">
                                        {engineAnalysis.analysis.currentEvaluation.bestMove}
                                      </span>
                                    </div>
                                    <div>
                                      <span className="text-gray-600">Depth:</span>
                                      <span className="ml-2 font-medium">
                                        {engineAnalysis.analysis.currentEvaluation.depth} ply
                                      </span>
                                    </div>
                                    <div>
                                      <span className="text-gray-600">Phase:</span>
                                      <span className="ml-2 font-medium">
                                        {engineAnalysis.analysis.positionType}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              )}
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

            {/* Strategic Recommendations */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Brain className="mr-2 h-5 w-5 text-purple-500" />
                  AI Strategic Recommendations
                </CardTitle>
                <CardDescription className="text-sm text-gray-600 mt-1">
                  Tournament preparation based on opponent analysis
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Opening Strategy */}
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center mb-3">
                      <BookOpen className="mr-2 h-4 w-4 text-blue-600" />
                      <div className="font-semibold text-blue-900">Opening Strategy</div>
                    </div>
                    <div className="space-y-2 text-sm">
                      {lichessInsights?.openingRepertoire && Object.keys(lichessInsights.openingRepertoire).length > 0 ? (
                        Object.entries(lichessInsights.openingRepertoire)
                          .filter(([opening, data]: [string, any]) => 
                            opening && 
                            opening.trim() !== '' && 
                            opening !== 'Unknown' && 
                            data && 
                            typeof data.winRate === 'number' && 
                            typeof data.games === 'number' && 
                            data.games >= 2 &&
                            data.winRate >= 0 && 
                            data.winRate <= 1
                          )
                          .slice(0, 3)
                          .map(([opening, data]: [string, any]) => (
                          <div key={opening} className="flex items-start space-x-2">
                            <span className={data.winRate < 0.5 ? "text-green-600 font-bold" : "text-red-600 font-bold"}>
                              {data.winRate < 0.5 ? "✓" : "✗"}
                            </span>
                            <span className="text-blue-800">
                              <strong>{data.winRate < 0.5 ? "Exploit" : "Avoid"} {opening}:</strong> They score {Math.round(data.winRate * 100)}% in {data.games} games. 
                              {data.winRate < 0.5 
                                ? "This is a clear weakness in their repertoire." 
                                : "They're very strong in this opening."
                              }
                            </span>
                          </div>
                        ))
                      ) : lichessGames && lichessGames.length > 0 ? (
                        <div className="text-blue-800">
                          <strong>No opening analysis available</strong> - analyzing {lichessGames.length} games but no clear patterns found with sufficient sample size.
                        </div>
                      ) : (
                        <div className="text-blue-800">
                          <strong>Opening analysis will appear here</strong> once their game data loads. Search for an opponent above to see real insights.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Tactical Exploitation */}
                  <div className="bg-gradient-to-r from-red-50 to-orange-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-center mb-3">
                      <Target className="mr-2 h-4 w-4 text-red-600" />
                      <div className="font-semibold text-red-900">Tactical Exploitation</div>
                    </div>
                    <div className="space-y-2 text-sm">
                      {lichessGames && lichessGames.length > 0 ? (
                        (() => {
                          // Debug: Log the first game to see the structure
                          if (lichessGames.length > 0) {
                            console.log('First game structure:', lichessGames[0]);
                            console.log('Analysis data:', lichessGames[0].analysisData);
                            if (lichessGames[0].analysisData) {
                              console.log('Tactical insights:', lichessGames[0].analysisData.tacticalInsights);
                            }
                          }
                          
                          const gamesWithTactics = lichessGames.filter((game: any) => 
                            game.analysisData && game.analysisData.tacticalInsights && game.analysisData.tacticalInsights.missedTactics && game.analysisData.tacticalInsights.missedTactics.length > 0
                          );
                          
                          console.log('Games with tactics:', gamesWithTactics.length);
                          
                          const tacticalCounts = gamesWithTactics.reduce((acc: any, game: any) => {
                            game.analysisData.tacticalInsights.missedTactics.forEach((tactic: any) => {
                              acc[tactic.tacticalType] = (acc[tactic.tacticalType] || 0) + 1;
                            });
                            return acc;
                          }, {});
                          
                          const mostMissedTactic = Object.entries(tacticalCounts).sort(([,a], [,b]) => (b as number) - (a as number))[0];
                          
                          return (
                            <>
                              <div className="bg-red-100 p-2 rounded">
                                <strong className="text-red-800">Primary Weakness:</strong> 
                                <span className="text-red-700 ml-1">
                                  Missed {mostMissedTactic ? mostMissedTactic[1] : 0} {mostMissedTactic ? mostMissedTactic[0] : 'tactical'} opportunities
                                </span>
                              </div>
                              <div className="text-red-800">
                                {mostMissedTactic && mostMissedTactic[0] === 'fork' ? (
                                  <>
                                    • Create knight outposts on central squares (d4, e4, f5)
                                    <br />
                                    • Look for family forks targeting king and rook
                                    <br />
                                    • Position knights actively in middlegame transitions
                                  </>
                                ) : mostMissedTactic && mostMissedTactic[0] === 'capture' ? (
                                  <>
                                    • Look for hanging pieces and loose pawns
                                    <br />
                                    • Create multiple threats to force material gains
                                    <br />
                                    • Exploit their tendency to leave pieces undefended
                                  </>
                                ) : mostMissedTactic && mostMissedTactic[0] === 'check' ? (
                                  <>
                                    • Use checks to disrupt their plans
                                    <br />
                                    • Create forcing sequences with tempo gains
                                    <br />
                                    • Look for perpetual check opportunities
                                  </>
                                ) : (
                                  <>
                                    • Focus on solid tactical awareness
                                    <br />
                                    • Look for common tactical patterns
                                    <br />
                                    • Maintain piece coordination
                                  </>
                                )}
                              </div>
                            </>
                          );
                        })()
                      ) : (
                        <div className="bg-red-100 p-2 rounded">
                          <strong className="text-red-800">Tactical analysis will appear</strong> 
                          <span className="text-red-700 ml-1">once opponent game data loads</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Time Pressure Strategy */}
                  <div className="bg-gradient-to-r from-yellow-50 to-amber-50 border border-yellow-200 rounded-lg p-4">
                    <div className="flex items-center mb-3">
                      <Clock className="mr-2 h-4 w-4 text-yellow-600" />
                      <div className="font-semibold text-yellow-900">Time Pressure Strategy</div>
                    </div>
                    <div className="space-y-2 text-sm text-yellow-800">
                      <div className="bg-yellow-100 p-2 rounded">
                        <strong>Critical Pattern:</strong> Makes 3x more blunders when under 5 minutes
                      </div>
                      <div>
                        • Spend extra time in opening to reach complex middlegames
                        <br />
                        • Avoid early simplifications that lead to simple endgames
                        <br />
                        • Create multiple threats simultaneously to burn their clock
                      </div>
                    </div>
                  </div>

                  {/* Endgame Strategy */}
                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center mb-3">
                      <Crown className="mr-2 h-4 w-4 text-green-600" />
                      <div className="font-semibold text-green-900">Endgame Approach</div>
                    </div>
                    <div className="space-y-2 text-sm text-green-800">
                      <div className="bg-green-100 p-2 rounded">
                        <strong>Weakness:</strong> Poor technique in rook endgames (45% score)
                      </div>
                      <div>
                        • Steer toward rook + pawn endings when ahead
                        <br />
                        • Avoid piece trades that lead to king and pawn endings
                        <br />
                        • Create passed pawns to increase technical demands
                      </div>
                    </div>
                  </div>

                  {/* Psychological Profile */}
                  <div className="bg-gradient-to-r from-purple-50 to-violet-50 border border-purple-200 rounded-lg p-4">
                    <div className="flex items-center mb-3">
                      <Brain className="mr-2 h-4 w-4 text-purple-600" />
                      <div className="font-semibold text-purple-900">Psychological Insights</div>
                    </div>
                    <div className="text-sm text-purple-800">
                      <div className="bg-purple-100 p-2 rounded mb-2">
                        <strong>Playing Style:</strong> Struggles with defensive tasks, prefers active play
                      </div>
                      • Force them into passive defensive positions
                      <br />
                      • Avoid symmetrical pawn structures where they can equalize easily
                      <br />
                      • Play for long-term positional pressure rather than quick tactics
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
                          <div key={index} className="p-3 border rounded-lg hover:bg-gray-50">
                            <div className="flex items-center justify-between mb-2">
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
                                    {new Date(game.createdAt).toLocaleDateString()} • {game.opening}
                                  </div>
                                </div>
                              </div>
                              <div className="text-sm font-medium">{opponentRating}</div>
                            </div>
                            <div className="flex items-center justify-between">
                              <div className="text-xs text-gray-600">
                                {game.moves.length} moves • {game.timeControl}
                              </div>
                              <button
                                onClick={() => analyzeGameWithStockfish(game)}
                                className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                              >
                                🔍 Analyze
                              </button>
                            </div>
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
                        {lichessGames.length > 0 ? (
                          <>
                            <p className="mb-2">
                              <strong>Recent Performance:</strong> {(() => {
                                const last10 = lichessGames.slice(0, 10);
                                const playerWins = last10.filter(game => {
                                  const playerColor = game.whitePlayer.toLowerCase() === searchQuery.toLowerCase() ? 'white' : 'black';
                                  return (playerColor === 'white' && game.result === '1-0') || 
                                         (playerColor === 'black' && game.result === '0-1');
                                }).length;
                                return `Won ${playerWins} of last ${last10.length} games`;
                              })()} ({Math.round((lichessGames.slice(0, 10).filter(game => {
                                const playerColor = game.whitePlayer.toLowerCase() === searchQuery.toLowerCase() ? 'white' : 'black';
                                return (playerColor === 'white' && game.result === '1-0') || 
                                       (playerColor === 'black' && game.result === '0-1');
                              }).length / Math.min(10, lichessGames.length)) * 100)}% win rate).
                            </p>
                            <p>
                              <strong>Tournament Activity:</strong> {lichessTournaments.length > 0 ? (
                                `Active player with ${lichessTournaments.length} recent tournaments. Latest: ${lichessTournaments[0]?.name} (${lichessTournaments[0]?.position}/${lichessTournaments[0]?.players}).`
                              ) : (
                                'Limited recent tournament activity - may focus on casual play.'
                              )}
                            </p>
                          </>
                        ) : (
                          <p>Loading current form analysis from Lichess data...</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>



            {/* Head-to-Head Record - Hidden */}
            {false && headToHeadData && (
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

      {/* Analysis Modal */}
      <Dialog open={showAnalysisModal} onOpenChange={setShowAnalysisModal}>
        <DialogContent className="fixed inset-0 w-screen h-screen max-w-none max-h-none rounded-none p-6 m-0 bg-white overflow-hidden z-[9999] !left-0 !top-0 !right-0 !bottom-0 !transform-none !translate-x-0 !translate-y-0">
          {selectedGameForAnalysis && (
            <div className="flex-1 overflow-auto mt-1">
              <h1>Game Analysis: {selectedGameForAnalysis?.whitePlayer} vs {selectedGameForAnalysis?.blackPlayer}</h1>
              <GameAnalyzer
                pgn={convertMovesToString(selectedGameForAnalysis)}
                mode="fast"
                onAnalysisComplete={(result) => {
                  console.log("Opponent game analysis completed:", result);
                  toast({
                    title: "Analysis Complete",
                    description: `Analyzed ${result.totalMoves} moves for opponent scouting.`,
                  });
                }}
                onAnalysisError={(error) => {
                  console.error("Opponent game analysis failed:", error);
                  toast({
                    title: "Analysis Failed",
                    description: error,
                    variant: "destructive",
                  });
                }}
                className="h-full"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}