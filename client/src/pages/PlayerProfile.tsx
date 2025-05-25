import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  User, 
  Search, 
  Crown, 
  Shield, 
  CheckCircle, 
  AlertTriangle 
} from "lucide-react";
import type { User as UserType, PlayerStats, Opening } from "@shared/schema";

export default function PlayerProfile() {
  const [searchOpponent, setSearchOpponent] = useState("");

  const { data: user } = useQuery<UserType>({
    queryKey: ["/api/user/1"],
  });

  const { data: stats } = useQuery<PlayerStats>({
    queryKey: ["/api/player-stats/1"],
  });

  const { data: openings } = useQuery<Opening[]>({
    queryKey: ["/api/openings/user/1"],
  });

  const whiteOpenings = openings?.filter(o => o.color === "white") || [];
  const blackOpenings = openings?.filter(o => o.color === "black") || [];

  const winRate = stats ? Math.round((stats.wins / (stats.wins + stats.losses + stats.draws)) * 100) : 0;
  const whiteWinRate = stats ? Math.round((stats.winsAsWhite / (stats.winsAsWhite + stats.lossesAsWhite + stats.drawsAsWhite)) * 100) : 0;
  const blackWinRate = stats ? Math.round((stats.winsAsBlack / (stats.winsAsBlack + stats.lossesAsBlack + stats.drawsAsBlack)) * 100) : 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Player Information */}
        <div className="lg:col-span-1 space-y-6">
          {/* Profile Card */}
          <Card>
            <CardContent className="p-6">
              <div className="text-center mb-6">
                <div className="w-24 h-24 chess-gold rounded-full flex items-center justify-center mx-auto mb-4">
                  <User className="text-white text-3xl" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900">{user?.username || "Loading..."}</h2>
                <p className="text-gray-600">FIDE Master</p>
              </div>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="fideId" className="text-sm font-medium text-gray-700">FIDE ID</Label>
                  <Input 
                    id="fideId"
                    value={user?.fideId || ""} 
                    placeholder="Enter FIDE ID" 
                    readOnly
                  />
                </div>
                <div>
                  <Label htmlFor="aicfId" className="text-sm font-medium text-gray-700">AICF ID</Label>
                  <Input 
                    id="aicfId"
                    value={user?.aicfId || ""} 
                    placeholder="Enter AICF ID" 
                    readOnly
                  />
                </div>
                <div>
                  <Label htmlFor="lichessId" className="text-sm font-medium text-gray-700">Lichess Username</Label>
                  <Input 
                    id="lichessId"
                    value={user?.lichessId || ""} 
                    placeholder="Enter Lichess ID" 
                    readOnly
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Search Opponent */}
          <Card>
            <CardHeader>
              <CardTitle>Search Opponent</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Input
                  placeholder="Enter opponent's name or ID"
                  value={searchOpponent}
                  onChange={(e) => setSearchOpponent(e.target.value)}
                />
                <Button className="w-full bg-chess-dark hover:bg-chess-green">
                  <Search className="mr-2 h-4 w-4" />
                  Search Games
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Statistics and Analysis */}
        <div className="lg:col-span-2 space-y-6">
          {/* Win/Loss Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Overall Results */}
            <Card>
              <CardHeader>
                <CardTitle>Overall Results</CardTitle>
              </CardHeader>
              <CardContent>
                {stats ? (
                  <>
                    <div className="text-center mb-4">
                      <div className="text-3xl font-bold text-green-600 mb-2">{winRate}%</div>
                      <div className="text-sm text-gray-500">Win Rate</div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center text-sm">
                      <div>
                        <div className="w-4 h-4 bg-green-500 rounded mx-auto mb-1"></div>
                        <div className="font-semibold">{stats.wins}</div>
                        <div className="text-gray-500">Wins</div>
                      </div>
                      <div>
                        <div className="w-4 h-4 bg-gray-500 rounded mx-auto mb-1"></div>
                        <div className="font-semibold">{stats.draws}</div>
                        <div className="text-gray-500">Draws</div>
                      </div>
                      <div>
                        <div className="w-4 h-4 bg-red-500 rounded mx-auto mb-1"></div>
                        <div className="font-semibold">{stats.losses}</div>
                        <div className="text-gray-500">Losses</div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8 text-gray-500">Loading stats...</div>
                )}
              </CardContent>
            </Card>

            {/* Color Statistics */}
            <Card>
              <CardHeader>
                <CardTitle>Performance by Color</CardTitle>
              </CardHeader>
              <CardContent>
                {stats ? (
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium flex items-center">
                          <Crown className="mr-2 h-4 w-4 text-yellow-500" />
                          As White
                        </span>
                        <span className="text-sm text-gray-600">
                          {stats.winsAsWhite + stats.drawsAsWhite + stats.lossesAsWhite} games
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-sm">
                        <div className="text-center">
                          <div className="font-semibold text-green-600">{stats.winsAsWhite}</div>
                          <div className="text-gray-500">Wins</div>
                        </div>
                        <div className="text-center">
                          <div className="font-semibold text-gray-600">{stats.drawsAsWhite}</div>
                          <div className="text-gray-500">Draws</div>
                        </div>
                        <div className="text-center">
                          <div className="font-semibold text-red-600">{stats.lossesAsWhite}</div>
                          <div className="text-gray-500">Losses</div>
                        </div>
                      </div>
                      <div className="text-center mt-2">
                        <span className="text-sm text-green-600 font-medium">{whiteWinRate}% win rate</span>
                      </div>
                    </div>
                    <hr className="border-gray-200" />
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium flex items-center">
                          <Shield className="mr-2 h-4 w-4 text-gray-800" />
                          As Black
                        </span>
                        <span className="text-sm text-gray-600">
                          {stats.winsAsBlack + stats.drawsAsBlack + stats.lossesAsBlack} games
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-sm">
                        <div className="text-center">
                          <div className="font-semibold text-green-600">{stats.winsAsBlack}</div>
                          <div className="text-gray-500">Wins</div>
                        </div>
                        <div className="text-center">
                          <div className="font-semibold text-gray-600">{stats.drawsAsBlack}</div>
                          <div className="text-gray-500">Draws</div>
                        </div>
                        <div className="text-center">
                          <div className="font-semibold text-red-600">{stats.lossesAsBlack}</div>
                          <div className="text-gray-500">Losses</div>
                        </div>
                      </div>
                      <div className="text-center mt-2">
                        <span className="text-sm text-green-600 font-medium">{blackWinRate}% win rate</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">Loading stats...</div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Opening Repertoire */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Openings as White */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Crown className="mr-2 text-chess-dark" />
                  Openings as White
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {whiteOpenings.length > 0 ? (
                    whiteOpenings.map((opening) => {
                      const winRate = opening.gamesPlayed > 0 
                        ? Math.round((opening.wins / opening.gamesPlayed) * 100) 
                        : 0;
                      
                      return (
                        <div key={opening.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                          <div>
                            <div className="font-medium text-gray-900">{opening.name}</div>
                            <div className="text-sm text-gray-600">{opening.moves}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-semibold text-green-600">{winRate}%</div>
                            <div className="text-xs text-gray-500">{opening.gamesPlayed} games</div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-4 text-gray-500 text-sm">
                      No white openings recorded
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Openings as Black */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Shield className="mr-2 text-gray-800" />
                  Openings as Black
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {blackOpenings.length > 0 ? (
                    blackOpenings.map((opening) => {
                      const winRate = opening.gamesPlayed > 0 
                        ? Math.round((opening.wins / opening.gamesPlayed) * 100) 
                        : 0;
                      
                      return (
                        <div key={opening.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                          <div>
                            <div className="font-medium text-gray-900">{opening.name}</div>
                            <div className="text-sm text-gray-600">{opening.moves}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-semibold text-green-600">{winRate}%</div>
                            <div className="text-xs text-gray-500">{opening.gamesPlayed} games</div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-4 text-gray-500 text-sm">
                      No black openings recorded
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* AI Insights */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <svg className="mr-2 h-5 w-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                AI Tactical Analysis
              </CardTitle>
            </CardHeader>
            <CardContent>
              {stats ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Strengths */}
                  <div>
                    <h4 className="font-medium text-green-600 mb-4 flex items-center">
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Tactical Strengths
                    </h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                        <div>
                          <div className="font-medium text-gray-900">Found Forks</div>
                          <div className="text-sm text-gray-600">1-move tactical shots</div>
                        </div>
                        <div className="text-green-600 font-semibold">
                          {stats.tacticalStrengths.forks}/20
                        </div>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                        <div>
                          <div className="font-medium text-gray-900">Pin Recognition</div>
                          <div className="text-sm text-gray-600">Identifying pinned pieces</div>
                        </div>
                        <div className="text-green-600 font-semibold">
                          {stats.tacticalStrengths.pins}/18
                        </div>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                        <div>
                          <div className="font-medium text-gray-900">Back Rank Tactics</div>
                          <div className="text-sm text-gray-600">Mate threats & defenses</div>
                        </div>
                        <div className="text-green-600 font-semibold">
                          {stats.tacticalStrengths.backRank}/14
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Weaknesses */}
                  <div>
                    <h4 className="font-medium text-red-600 mb-4 flex items-center">
                      <AlertTriangle className="mr-2 h-4 w-4" />
                      Areas for Improvement
                    </h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                        <div>
                          <div className="font-medium text-gray-900">Missed Forks</div>
                          <div className="text-sm text-gray-600">2-move tactical sequences</div>
                        </div>
                        <div className="text-red-600 font-semibold">
                          {stats.tacticalWeaknesses.missedForks}/30
                        </div>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                        <div>
                          <div className="font-medium text-gray-900">Discovery Attacks</div>
                          <div className="text-sm text-gray-600">Complex tactical motifs</div>
                        </div>
                        <div className="text-red-600 font-semibold">
                          {stats.tacticalWeaknesses.discoveryAttacks}/12
                        </div>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                        <div>
                          <div className="font-medium text-gray-900">Endgame Precision</div>
                          <div className="text-sm text-gray-600">Converting advantages</div>
                        </div>
                        <div className="text-red-600 font-semibold">
                          {stats.tacticalWeaknesses.endgamePrecision}/20
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">Loading tactical analysis...</div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
