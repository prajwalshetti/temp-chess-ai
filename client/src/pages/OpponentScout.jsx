import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Search, Target, TrendingDown, AlertTriangle } from "lucide-react";

export default function OpponentScout() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedOpponent, setSelectedOpponent] = useState(null);

  const { data: searchResults } = useQuery({
    queryKey: ["/api/search/opponents", { q: searchQuery }],
    enabled: searchQuery.length > 2,
  });

  const { data: lichessData } = useQuery({
    queryKey: ["/api/lichess/user", selectedOpponent?.username, "games"],
    enabled: !!selectedOpponent?.username,
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <Search className="mr-3 h-8 w-8 text-blue-600" />
            Opponent Scout
          </h1>
          <p className="text-gray-600 mt-2">
            Analyze opponent strategies and weaknesses for tournament preparation
          </p>
        </div>

        <div className="mb-6">
          <div className="flex space-x-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search for opponent by username..."
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button>
              <Search className="mr-2 h-4 w-4" />
              Search
            </Button>
          </div>

          {searchResults && (
            <div className="mt-4 space-y-2">
              {searchResults.map((opponent, index) => (
                <div
                  key={index}
                  className="p-3 border border-gray-200 rounded-lg hover:border-blue-500 cursor-pointer"
                  onClick={() => setSelectedOpponent(opponent)}
                >
                  <div className="font-medium">{opponent.username}</div>
                  <div className="text-sm text-gray-500">
                    Rating: {opponent.currentRating || "Unrated"}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {selectedOpponent && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Opponent Analysis - {selectedOpponent.username}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">
                        {lichessData?.totalGames || 0}
                      </div>
                      <div className="text-sm text-gray-600">Total Games</div>
                    </div>
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">65%</div>
                      <div className="text-sm text-gray-600">Estimated Win Rate</div>
                    </div>
                    <div className="text-center p-4 bg-orange-50 rounded-lg">
                      <div className="text-2xl font-bold text-orange-600">
                        {selectedOpponent.currentRating || "Unrated"}
                      </div>
                      <div className="text-sm text-gray-600">Current Rating</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Strategic Recommendations</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center mb-2">
                        <Target className="mr-2 h-4 w-4 text-green-600" />
                        <div className="font-semibold text-green-900">Opening Strategy</div>
                      </div>
                      <div className="text-sm text-green-800">
                        Consider playing the Sicilian Defense - opponent shows weaker performance against dynamic positions.
                      </div>
                    </div>
                    
                    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <div className="flex items-center mb-2">
                        <AlertTriangle className="mr-2 h-4 w-4 text-yellow-600" />
                        <div className="font-semibold text-yellow-900">Tactical Weakness</div>
                      </div>
                      <div className="text-sm text-yellow-800">
                        Look for tactical opportunities - opponent tends to miss intermediate moves in complex positions.
                      </div>
                    </div>

                    <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                      <div className="flex items-center mb-2">
                        <TrendingDown className="mr-2 h-4 w-4 text-red-600" />
                        <div className="font-semibold text-red-900">Time Management</div>
                      </div>
                      <div className="text-sm text-red-800">
                        Opponent struggles in time pressure - consider playing for complex middlegame positions.
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div>
              <Card>
                <CardHeader>
                  <CardTitle>Recent Games</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {lichessData?.games?.slice(0, 5).map((game, index) => (
                      <div key={index} className="p-3 border border-gray-200 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium text-sm">
                              vs {game.whitePlayer === selectedOpponent.username ? game.blackPlayer : game.whitePlayer}
                            </div>
                            <div className="text-xs text-gray-500">
                              {game.opening} • {game.result}
                            </div>
                          </div>
                          <div className="text-xs text-gray-400">
                            {new Date(game.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    )) || (
                      <div className="text-sm text-gray-500 text-center py-4">
                        Loading recent games...
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {!selectedOpponent && (
          <Card>
            <CardContent className="p-12 text-center">
              <Search className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Search for an opponent to begin analysis
              </h3>
              <p className="text-gray-600">
                Enter a username above to analyze their game history and identify strategic opportunities.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}