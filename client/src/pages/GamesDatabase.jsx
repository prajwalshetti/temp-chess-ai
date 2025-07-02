import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Database, Filter, Download, Play } from "lucide-react";

export default function GamesDatabase() {
  const { data: games, isLoading } = useQuery({
    queryKey: ["/api/games/user/1"],
  });

  if (isLoading) {
    return <div className="p-8 text-center">Loading games...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <Database className="mr-3 h-8 w-8 text-blue-600" />
            Games Database
          </h1>
          <p className="text-gray-600 mt-2">
            Analyze your game history and track your progress
          </p>
        </div>

        <div className="mb-6 flex justify-between items-center">
          <div className="flex space-x-4">
            <Button variant="outline">
              <Filter className="mr-2 h-4 w-4" />
              Filter Games
            </Button>
            <Button variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Export PGN
            </Button>
          </div>
          <div className="text-sm text-gray-500">
            {games?.length || 0} total games
          </div>
        </div>

        <div className="grid gap-4">
          {games?.map((game, index) => (
            <Card key={index} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className={`w-4 h-4 rounded-full ${
                      game.result === "1-0" && game.whitePlayer === "ChessPlayer2023" ? "bg-green-500" :
                      game.result === "0-1" && game.blackPlayer === "ChessPlayer2023" ? "bg-green-500" :
                      game.result === "1/2-1/2" ? "bg-yellow-500" : "bg-red-500"
                    }`} />
                    <div>
                      <div className="font-semibold">
                        {game.whitePlayer} vs {game.blackPlayer}
                      </div>
                      <div className="text-sm text-gray-500">
                        {game.opening} • {game.timeControl} • {game.result}
                      </div>
                      <div className="text-xs text-gray-400">
                        {new Date(game.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm">
                      <Play className="h-4 w-4 mr-1" />
                      Replay
                    </Button>
                    <Button variant="outline" size="sm">
                      Analyze
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}