import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChessBoard } from "@/components/ChessBoard";
import { 
  Puzzle, 
  Search, 
  GraduationCap, 
  Database, 
  Trophy, 
  X, 
  Handshake,
  TrendingUp,
  Crown
} from "lucide-react";
import { Link } from "wouter";
import type { User, PlayerStats, Game } from "@shared/schema";

export default function Home() {
  const { data: user } = useQuery<User>({
    queryKey: ["/api/auth/current-user"],
  });

  const { data: stats } = useQuery<PlayerStats>({
    queryKey: ["/api/player-stats", user?.id],
    enabled: !!user?.id,
  });

  const { data: games } = useQuery<Game[]>({
    queryKey: ["/api/games/user", user?.id],
    enabled: !!user?.id,
  });

  const quickAccessItems = [
    {
      icon: Puzzle,
      title: "Daily Puzzles",
      description: "Solve tactical puzzles to improve your pattern recognition",
      status: "3 puzzles remaining",
      color: "chess-dark",
      link: "/learn"
    },
    {
      icon: Search,
      title: "Find Opponent",
      description: "Search and analyze games against specific opponents",
      status: "Search database",
      color: "blue-500",
      link: "/scout"
    },
    {
      icon: GraduationCap,
      title: "Learn Chess",
      description: "Master openings, tactics, and endgames",
      status: "Continue learning",
      color: "purple-500",
      link: "/learn"
    },
    {
      icon: Database,
      title: "Games Database",
      description: "Upload and analyze your games with AI insights",
      status: `${games?.length || 0} games analyzed`,
      color: "chess-gold",
      link: "/games"
    }
  ];

  const recentGames = games?.slice(0, 3) || [];

  const getResultIcon = (result: string) => {
    switch (result) {
      case "1-0":
        return <Trophy className="text-green-600" />;
      case "0-1":
        return <X className="text-red-600" />;
      case "1/2-1/2":
        return <Handshake className="text-gray-600" />;
      default:
        return <Handshake className="text-gray-600" />;
    }
  };

  const getResultText = (result: string) => {
    switch (result) {
      case "1-0":
        return "1-0";
      case "0-1":
        return "0-1";
      case "1/2-1/2":
        return "½-½";
      default:
        return "½-½";
    }
  };

  const winPercentage = stats ? Math.round((stats.wins / (stats.wins + stats.losses + stats.draws)) * 100) : 0;

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-green-700 to-green-800 rounded-2xl p-8 mb-8 text-white">
        <div className="flex flex-col lg:flex-row items-center justify-between">
          <div className="lg:w-1/2 mb-6 lg:mb-0">
            <h1 className="text-4xl font-bold mb-4">Master Your Chess Game</h1>
            <p className="text-lg opacity-90 mb-6">
              Analyze your games, solve puzzles, and improve with AI-powered insights.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link href="/learn">
                <Button variant="secondary" size="lg">
                  <Puzzle className="mr-2 h-5 w-5" />
                  Solve Puzzles
                </Button>
              </Link>
              <Link href="/games">
                <Button variant="outline" size="lg" className="border-white text-white hover:bg-white hover:text-green-800">
                  <Database className="mr-2 h-5 w-5" />
                  Upload Game
                </Button>
              </Link>
            </div>
          </div>
          <div className="lg:w-1/2 flex justify-center">
            <ChessBoard 
              size={256} 
              interactive={false}
              className="shadow-2xl"
            />
          </div>
        </div>
      </div>

      {/* Quick Access Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {quickAccessItems.map((item, index) => (
          <Link key={index} href={item.link}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-6">
                <div className={`w-12 h-12 bg-${item.color} rounded-lg flex items-center justify-center mb-4`}>
                  <item.icon className="text-white text-xl" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-gray-600 text-sm mb-3">{item.description}</p>
                <div className={`text-${item.color} font-medium text-sm`}>{item.status}</div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Recent Activity & Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Games */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Recent Games</CardTitle>
            </CardHeader>
            <CardContent>
              {recentGames.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Database className="mx-auto h-12 w-12 mb-4 opacity-50" />
                  <p>No games uploaded yet</p>
                  <Link href="/games">
                    <Button className="mt-4">Upload Your First Game</Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {recentGames.map((game, index) => (
                    <div key={game.id} className="flex items-center justify-between py-4 border-b border-gray-100 last:border-b-0">
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                          {getResultIcon(game.result)}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">
                            vs. {user?.username === game.whitePlayer ? game.blackPlayer : game.whitePlayer}
                          </div>
                          <div className="text-sm text-gray-600">
                            {game.opening} • {game.timeControl}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">{getResultText(game.result)}</div>
                        <div className="text-sm text-gray-500">
                          {new Date(game.uploadedAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Stats */}
        <div className="space-y-6">
          {/* Win Rate Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Performance</CardTitle>
            </CardHeader>
            <CardContent>
              {stats ? (
                <>
                  <div className="text-center mb-4">
                    <div className="text-3xl font-bold text-green-600 mb-2">{winPercentage}%</div>
                    <div className="text-sm text-gray-500">Win Rate</div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center text-sm">
                    <div>
                      <div className="font-semibold text-green-600">{stats.wins}</div>
                      <div className="text-gray-500">Wins</div>
                    </div>
                    <div>
                      <div className="font-semibold text-gray-600">{stats.draws}</div>
                      <div className="text-gray-500">Draws</div>
                    </div>
                    <div>
                      <div className="font-semibold text-red-600">{stats.losses}</div>
                      <div className="text-gray-500">Losses</div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center text-gray-500">
                  <Trophy className="mx-auto h-8 w-8 mb-2 opacity-50" />
                  <p>No stats available</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Rating Progress */}
          <Card>
            <CardHeader>
              <CardTitle>Rating</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                <div className="text-3xl font-bold text-chess-dark mb-2">
                  {user?.currentRating || 1200}
                </div>
                <div className="text-green-600 text-sm font-medium mb-4">
                  <TrendingUp className="inline mr-1 h-4 w-4" />
                  +23 this week
                </div>
                <div className="text-xs text-gray-500">Rapid Rating</div>
              </div>
            </CardContent>
          </Card>

          {/* Daily Puzzle */}
          <Card>
            <CardHeader>
              <CardTitle>Daily Puzzle</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                <div className="w-16 h-16 chess-dark rounded-lg flex items-center justify-center mx-auto mb-3">
                  <Puzzle className="text-white text-2xl" />
                </div>
                <div className="text-sm text-gray-600 mb-3">Find the winning move</div>
                <Link href="/learn">
                  <Button className="w-full bg-chess-dark hover:bg-chess-green text-white">
                    Solve Puzzle
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
