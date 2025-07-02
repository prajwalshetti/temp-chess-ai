import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { User, Trophy, Target, TrendingUp } from "lucide-react";

export default function PlayerProfile() {
  const { data: user } = useQuery({
    queryKey: ["/api/user/1"],
  });

  const { data: stats } = useQuery({
    queryKey: ["/api/player-stats/1"],
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <User className="mr-3 h-8 w-8 text-blue-600" />
            Player Profile
          </h1>
          <p className="text-gray-600 mt-2">
            Your chess performance statistics and achievements
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Performance Overview</CardTitle>
              </CardHeader>
              <CardContent>
                {stats && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">{stats.gamesPlayed}</div>
                      <div className="text-sm text-gray-500">Games Played</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">{stats.winRate}%</div>
                      <div className="text-sm text-gray-500">Win Rate</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600">{stats.currentStreak}</div>
                      <div className="text-sm text-gray-500">Current Streak</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-orange-600">{stats.puzzlesSolved}</div>
                      <div className="text-sm text-gray-500">Puzzles Solved</div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div>
            <Card>
              <CardHeader>
                <CardTitle>Quick Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Current Rating</span>
                  <span className="font-semibold">{user?.currentRating || 1800}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Highest Rating</span>
                  <span className="font-semibold">{stats?.highestRating || 1850}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Puzzle Rating</span>
                  <span className="font-semibold">{user?.puzzleRating || 1650}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}