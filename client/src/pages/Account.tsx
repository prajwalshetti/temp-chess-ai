import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User, Settings, Bell, Shield } from "lucide-react";
import type { User as UserType } from "@shared/schema";

export default function Account() {
  const { data: user } = useQuery<UserType>({
    queryKey: ["/api/user/1"],
  });

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Account Settings</h1>
        <p className="text-gray-600">Manage your chess profile and preferences</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Profile Information */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <User className="mr-2 h-5 w-5" />
                Profile Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="username">Username</Label>
                  <Input id="username" value={user?.username || ""} readOnly />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" value={user?.email || ""} readOnly />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="fideId">FIDE ID</Label>
                  <Input id="fideId" value={user?.fideId || ""} placeholder="Enter FIDE ID" />
                </div>
                <div>
                  <Label htmlFor="aicfId">AICF ID</Label>
                  <Input id="aicfId" value={user?.aicfId || ""} placeholder="Enter AICF ID" />
                </div>
                <div>
                  <Label htmlFor="lichessId">Lichess ID</Label>
                  <Input id="lichessId" value={user?.lichessId || ""} placeholder="Enter Lichess ID" />
                </div>
              </div>
              <Button className="bg-chess-dark hover:bg-chess-green">
                Save Changes
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Settings className="mr-2 h-5 w-5" />
                Preferences
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="boardTheme">Board Theme</Label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                  <option>Classic</option>
                  <option>Wood</option>
                  <option>Blue</option>
                  <option>Green</option>
                </select>
              </div>
              <div>
                <Label htmlFor="pieceSet">Piece Set</Label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                  <option>Classic</option>
                  <option>Modern</option>
                  <option>Medieval</option>
                </select>
              </div>
              <Button className="bg-chess-dark hover:bg-chess-green">
                Save Preferences
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Bell className="mr-2 h-5 w-5" />
                Notifications
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Daily puzzles</span>
                <input type="checkbox" className="rounded" defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Game analysis</span>
                <input type="checkbox" className="rounded" defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">New features</span>
                <input type="checkbox" className="rounded" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Shield className="mr-2 h-5 w-5" />
                Security
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button variant="outline" className="w-full">
                Change Password
              </Button>
              <Button variant="outline" className="w-full">
                Two-Factor Auth
              </Button>
              <Button variant="outline" className="w-full text-red-600 hover:text-red-700">
                Delete Account
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 text-center">
              <div className="text-2xl font-bold text-chess-dark mb-2">
                {user?.currentRating || 1200}
              </div>
              <div className="text-sm text-gray-600 mb-4">Current Rating</div>
              <div className="text-xs text-gray-500">
                Member since {user?.createdAt ? new Date(user.createdAt).getFullYear() : "2023"}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
