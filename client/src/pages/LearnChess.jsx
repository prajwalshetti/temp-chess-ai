import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { ChessBoard } from "../components/ChessBoard";
import { GraduationCap, Puzzle, Play, BookOpen } from "lucide-react";

export default function LearnChess() {
  const { data: puzzle } = useQuery({
    queryKey: ["/api/puzzles/random"],
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <GraduationCap className="mr-3 h-8 w-8 text-green-600" />
            Learn Chess
          </h1>
          <p className="text-gray-600 mt-2">
            Improve your skills with puzzles, lessons, and practice
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Puzzle className="mr-2 h-5 w-5 text-blue-600" />
                  Daily Puzzle
                </CardTitle>
              </CardHeader>
              <CardContent>
                {puzzle && (
                  <div>
                    <div className="aspect-square mb-4">
                      <ChessBoard 
                        fen={puzzle.fen}
                        size={300}
                        interactive={true}
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="text-sm text-gray-600">
                        Rating: {puzzle.rating} • Themes: {puzzle.themes.join(", ")}
                      </div>
                      <div className="text-sm">
                        Find the best move for White
                      </div>
                      <Button className="w-full">
                        Submit Solution
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BookOpen className="mr-2 h-5 w-5 text-purple-600" />
                  Learning Modules
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 border border-gray-200 rounded-lg hover:border-purple-600 transition-colors cursor-pointer">
                    <h3 className="font-semibold">Basic Tactics</h3>
                    <p className="text-sm text-gray-600 mt-1">Learn forks, pins, and skewers</p>
                    <div className="text-xs text-purple-600 mt-2">12 lessons • 45 min</div>
                  </div>
                  
                  <div className="p-4 border border-gray-200 rounded-lg hover:border-purple-600 transition-colors cursor-pointer">
                    <h3 className="font-semibold">Opening Principles</h3>
                    <p className="text-sm text-gray-600 mt-1">Master the fundamentals of opening play</p>
                    <div className="text-xs text-purple-600 mt-2">8 lessons • 30 min</div>
                  </div>

                  <div className="p-4 border border-gray-200 rounded-lg hover:border-purple-600 transition-colors cursor-pointer">
                    <h3 className="font-semibold">Endgame Basics</h3>
                    <p className="text-sm text-gray-600 mt-1">Essential endgame patterns and techniques</p>
                    <div className="text-xs text-purple-600 mt-2">15 lessons • 60 min</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Practice Arena</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Button className="w-full" variant="outline">
                    <Play className="mr-2 h-4 w-4" />
                    Tactical Puzzles
                  </Button>
                  <Button className="w-full" variant="outline">
                    <Play className="mr-2 h-4 w-4" />
                    Opening Trainer
                  </Button>
                  <Button className="w-full" variant="outline">
                    <Play className="mr-2 h-4 w-4" />
                    Endgame Studies
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