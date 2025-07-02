import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { ChessBoard } from "../components/ChessBoard";
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

export default function Home() {
  const { data: user } = useQuery({
    queryKey: ["/api/user/1"],
  });

  const { data: stats } = useQuery({
    queryKey: ["/api/player-stats/1"],
  });

  const { data: games } = useQuery({
    queryKey: ["/api/games/user/1"],
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
      title: "Study Openings",
      description: "Learn and practice chess openings",
      status: "Continue studying",
      color: "green-500",
      link: "/learn"
    },
    {
      icon: Database,
      title: "Games Database",
      description: "Browse and analyze your game history",
      status: `${games?.length || 0} games`,
      color: "purple-500",
      link: "/games"
    }
  ];

  const recentGames = games?.slice(0, 3) || [];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Welcome back, {user?.username || "ChessPlayer"}!
              </h1>
              <p className="text-gray-600 mt-1">
                Ready to improve your chess skills today?
              </p>
            </div>
            <div className="hidden sm:flex items-center space-x-4">
              <div className="text-right">
                <div className="text-2xl font-bold text-chess-dark">
                  {user?.currentRating || 1800}
                </div>
                <div className="text-sm text-gray-500">Current Rating</div>
              </div>
              <Crown className="h-8 w-8 text-chess-gold" />
            </div>
          </div>
        </div>

        {/* Stats Overview */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">Games Played</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.gamesPlayed}</div>
                <p className="text-xs text-gray-500">
                  +12 this month
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">Win Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.winRate}%</div>
                <p className="text-xs text-green-600">
                  +2.3% improvement
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">Current Streak</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.currentStreak}</div>
                <p className="text-xs text-gray-500">
                  {stats.currentStreak > 0 ? "wins" : "losses"}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">Puzzles Solved</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.puzzlesSolved}</div>
                <p className="text-xs text-blue-600">
                  {stats.puzzleAccuracy}% accuracy
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Quick Access */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Quick Access</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {quickAccessItems.map((item, index) => {
                    const Icon = item.icon;
                    return (
                      <Link key={index} href={item.link}>
                        <div className="p-4 border border-gray-200 rounded-lg hover:border-chess-dark transition-colors cursor-pointer">
                          <div className="flex items-start space-x-3">
                            <div className={`p-2 rounded-lg bg-${item.color} bg-opacity-10`}>
                              <Icon className={`h-5 w-5 text-${item.color}`} />
                            </div>
                            <div className="flex-1">
                              <h3 className="font-semibold text-gray-900">{item.title}</h3>
                              <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                              <p className="text-xs text-blue-600 mt-2">{item.status}</p>
                            </div>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Recent Games */}
            <Card className="mt-6">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Recent Games</CardTitle>
                  <Link href="/games">
                    <Button variant="outline" size="sm">
                      View All
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentGames.map((game, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className={`w-3 h-3 rounded-full ${
                          game.result === "1-0" && game.whitePlayer === user?.username ? "bg-green-500" :
                          game.result === "0-1" && game.blackPlayer === user?.username ? "bg-green-500" :
                          game.result === "1/2-1/2" ? "bg-yellow-500" : "bg-red-500"
                        }`} />
                        <div>
                          <div className="font-medium">
                            vs {game.whitePlayer === user?.username ? game.blackPlayer : game.whitePlayer}
                          </div>
                          <div className="text-sm text-gray-500">
                            {game.opening} • {game.timeControl}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">{game.result}</div>
                        <div className="text-sm text-gray-500">
                          {new Date(game.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Live Chess Board */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle>Practice Position</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="aspect-square">
                  <ChessBoard 
                    fen="rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
                    size={280}
                    interactive={true}
                  />
                </div>
                <div className="mt-4 space-y-2">
                  <Button className="w-full">
                    Start Analysis
                  </Button>
                  <Button variant="outline" className="w-full">
                    Load Position
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}