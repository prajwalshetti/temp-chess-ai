import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChessBoard } from "@/components/ChessBoard";
import { useChess } from "@/hooks/use-chess";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  Puzzle, 
  Crown, 
  GraduationCap, 
  Play, 
  Lightbulb, 
  Check, 
  RotateCcw,
  Shuffle,
  Filter,
  BarChart3,
  Star
} from "lucide-react";
import type { Puzzle as PuzzleType, PuzzleAttempt } from "@shared/schema";

export default function LearnChess() {
  const [currentPuzzle, setCurrentPuzzle] = useState<PuzzleType | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [solved, setSolved] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { fen, makeMove, loadPosition, reset } = useChess();

  const { data: randomPuzzle, refetch: fetchNewPuzzle } = useQuery<PuzzleType>({
    queryKey: ["/api/puzzles/random"],
    enabled: !currentPuzzle,
  });

  const { data: puzzleAttempts } = useQuery<PuzzleAttempt[]>({
    queryKey: ["/api/puzzle-attempts/user/1"],
  });

  const submitAttemptMutation = useMutation({
    mutationFn: async (attemptData: any) => {
      return apiRequest("POST", "/api/puzzle-attempts", attemptData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/puzzle-attempts/user/1"] });
    },
  });

  // Set current puzzle when random puzzle is fetched
  if (randomPuzzle && !currentPuzzle) {
    setCurrentPuzzle(randomPuzzle);
    loadPosition(randomPuzzle.fen);
  }

  const handleMove = (move: string) => {
    if (!currentPuzzle || solved) return;
    
    const moveResult = makeMove(move);
    if (moveResult) {
      // Check if this move is in the solution
      const solutionMoves = currentPuzzle.moves;
      if (solutionMoves.includes(move)) {
        setSolved(true);
        toast({
          title: "Correct!",
          description: "You found the winning move!",
        });
        
        // Submit the attempt
        submitAttemptMutation.mutate({
          userId: 1,
          puzzleId: currentPuzzle.id,
          solved: true,
          timeSpent: 60, // Mock time
        });
      } else {
        toast({
          title: "Not quite",
          description: "Try a different move",
          variant: "destructive",
        });
        
        submitAttemptMutation.mutate({
          userId: 1,
          puzzleId: currentPuzzle.id,
          solved: false,
          timeSpent: 30,
        });
      }
    }
  };

  const handleNewPuzzle = () => {
    setCurrentPuzzle(null);
    setSolved(false);
    setShowHint(false);
    fetchNewPuzzle();
  };

  const handleReset = () => {
    if (currentPuzzle) {
      loadPosition(currentPuzzle.fen);
      setSolved(false);
      setShowHint(false);
    }
  };

  const learningCategories = [
    {
      icon: Puzzle,
      title: "Tactical Puzzles",
      description: "Master forks, pins, skewers and more",
      count: "247 puzzles",
      color: "purple-500"
    },
    {
      icon: Crown,
      title: "Opening Theory",
      description: "Learn popular opening systems",
      count: "45 lessons",
      color: "chess-dark"
    },
    {
      icon: Crown,
      title: "Endgame Studies",
      description: "Master crucial endgame positions",
      count: "68 studies",
      color: "orange-500"
    },
    {
      icon: Play,
      title: "Video Tutorials",
      description: "Watch expert explanations",
      count: "156 videos",
      color: "blue-500"
    }
  ];

  const puzzleThemes = [
    { name: "Fork", description: "Attack two pieces", solved: 47, rate: 85 },
    { name: "Pin", description: "Immobilize pieces", solved: 32, rate: 67 },
    { name: "Skewer", description: "Force piece movement", solved: 23, rate: 52 },
    { name: "Checkmate", description: "Finish the game", solved: 41, rate: 78 },
  ];

  const openingTutorials = [
    {
      title: "Sicilian Defense Basics",
      description: "Learn the fundamental ideas behind 1...c5 and common variations",
      duration: "12:34",
      level: "Beginner"
    },
    {
      title: "Queen's Gambit Accepted",
      description: "Master the QGA with proper development and central control",
      duration: "18:42",
      level: "Intermediate"
    },
    {
      title: "Ruy Lopez Main Line",
      description: "Deep dive into the most analyzed opening in chess history",
      duration: "25:17",
      level: "Advanced"
    }
  ];

  const solvedToday = puzzleAttempts?.filter(attempt => 
    attempt.solved && 
    new Date(attempt.attemptedAt).toDateString() === new Date().toDateString()
  ).length || 0;

  const totalSolved = puzzleAttempts?.filter(attempt => attempt.solved).length || 0;
  const totalAttempts = puzzleAttempts?.length || 0;
  const successRate = totalAttempts > 0 ? Math.round((totalSolved / totalAttempts) * 100) : 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Learn Chess</h1>
        <p className="text-gray-600">Improve your skills with puzzles, tutorials, and strategic insights</p>
      </div>

      {/* Learning Categories */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {learningCategories.map((category, index) => (
          <Card key={index} className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-6">
              <div className={`w-12 h-12 bg-${category.color} rounded-lg flex items-center justify-center mb-4`}>
                <category.icon className="text-white text-xl" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">{category.title}</h3>
              <p className="text-gray-600 text-sm mb-3">{category.description}</p>
              <div className={`text-${category.color} font-medium text-sm`}>{category.count}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Puzzle Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        {/* Puzzle Board */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Daily Puzzle</CardTitle>
                <div className="flex items-center space-x-4">
                  <div className="text-sm text-gray-600">
                    <span className="font-medium">Difficulty:</span> 
                    <span className="text-orange-500">
                      {Array.from({ length: currentPuzzle?.difficulty || 3 }, (_, i) => (
                        <Star key={i} className="inline h-4 w-4 fill-current" />
                      ))}
                      {Array.from({ length: 5 - (currentPuzzle?.difficulty || 3) }, (_, i) => (
                        <Star key={i} className="inline h-4 w-4" />
                      ))}
                    </span>
                  </div>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => setShowHint(!showHint)}
                    className="bg-chess-dark text-white hover:bg-chess-green"
                  >
                    <Lightbulb className="mr-2 h-4 w-4" />
                    Hint
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Puzzle Description */}
              {currentPuzzle && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                  <h3 className="font-medium text-blue-900 mb-2">{currentPuzzle.description}</h3>
                  {showHint && (
                    <p className="text-blue-800 text-sm">{currentPuzzle.solution}</p>
                  )}
                </div>
              )}

              {/* Chess Board */}
              <div className="flex justify-center mb-6">
                <ChessBoard 
                  fen={fen}
                  onMove={handleMove}
                  size={400}
                  interactive={!solved}
                />
              </div>

              {/* Puzzle Controls */}
              <div className="flex items-center justify-between">
                <div className="flex space-x-2">
                  <Button 
                    className="bg-green-500 hover:bg-green-600 text-white"
                    disabled={solved}
                  >
                    <Check className="mr-2 h-4 w-4" />
                    {solved ? "Solved!" : "Submit"}
                  </Button>
                  <Button variant="outline" onClick={handleReset}>
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Reset
                  </Button>
                </div>
                <div className="text-sm text-gray-600">
                  <span className="font-medium">Theme:</span> {currentPuzzle?.theme}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Puzzle Stats & Progress */}
        <div className="space-y-6">
          {/* Progress Stats */}
          <Card>
            <CardHeader>
              <CardTitle>Your Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">Puzzle Rating</span>
                    <span className="font-medium">1654</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-chess-dark h-2 rounded-full" style={{ width: "65%" }}></div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-chess-dark">{solvedToday}</div>
                    <div className="text-sm text-gray-600">Solved Today</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-green-600">{successRate}%</div>
                    <div className="text-sm text-gray-600">Success Rate</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Puzzle Themes */}
          <Card>
            <CardHeader>
              <CardTitle>Puzzle Themes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {puzzleThemes.map((theme, index) => (
                  <div key={index} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                    <div>
                      <div className="font-medium text-gray-900">{theme.name}</div>
                      <div className="text-sm text-gray-600">{theme.description}</div>
                    </div>
                    <div className="text-right">
                      <div className={`text-sm font-semibold ${
                        theme.rate >= 75 ? 'text-green-600' : 
                        theme.rate >= 50 ? 'text-orange-500' : 'text-red-500'
                      }`}>
                        {theme.rate}%
                      </div>
                      <div className="text-xs text-gray-500">{theme.solved} solved</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Button 
                  className="w-full bg-purple-500 hover:bg-purple-600 text-white"
                  onClick={handleNewPuzzle}
                >
                  <Shuffle className="mr-2 h-4 w-4" />
                  Random Puzzle
                </Button>
                <Button variant="outline" className="w-full">
                  <Filter className="mr-2 h-4 w-4" />
                  Filter by Theme
                </Button>
                <Button variant="outline" className="w-full">
                  <BarChart3 className="mr-2 h-4 w-4" />
                  View Statistics
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Opening Tutorials */}
      <Card>
        <CardHeader>
          <CardTitle>Opening Tutorials</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {openingTutorials.map((tutorial, index) => (
              <div key={index} className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow">
                <div className="aspect-video bg-gray-900 flex items-center justify-center relative">
                  <Play className="text-white text-4xl" />
                  <div className="absolute bottom-2 right-2 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded">
                    {tutorial.duration}
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-gray-900 mb-2">{tutorial.title}</h3>
                  <p className="text-gray-600 text-sm mb-3">{tutorial.description}</p>
                  <div className="flex items-center justify-between text-sm">
                    <span className={`px-2 py-1 rounded text-xs ${
                      tutorial.level === 'Beginner' ? 'bg-green-100 text-green-800' :
                      tutorial.level === 'Intermediate' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {tutorial.level}
                    </span>
                    <span className="text-chess-dark font-medium cursor-pointer hover:underline">
                      Watch Now
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
