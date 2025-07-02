import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { User, Settings, Bell, Shield } from "lucide-react";

export default function Account() {
  const { data: user } = useQuery({
    queryKey: ["/api/user/1"],
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <User className="mr-3 h-8 w-8 text-blue-600" />
            Account Settings
          </h1>
          <p className="text-gray-600 mt-2">
            Manage your profile and preferences
          </p>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Username
                </label>
                <div className="text-gray-900">{user?.username || "ChessPlayer2023"}</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <div className="text-gray-900">{user?.email || "player@chess.com"}</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Current Rating
                </label>
                <div className="text-gray-900">{user?.currentRating || 1800}</div>
              </div>
              <Button>Edit Profile</Button>
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
              <div className="flex items-center justify-between">
                <span>Email Notifications</span>
                <Button variant="outline" size="sm">Configure</Button>
              </div>
              <div className="flex items-center justify-between">
                <span>Board Theme</span>
                <Button variant="outline" size="sm">Change</Button>
              </div>
              <div className="flex items-center justify-between">
                <span>Time Zone</span>
                <Button variant="outline" size="sm">Update</Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Shield className="mr-2 h-5 w-5" />
                Privacy & Security
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span>Change Password</span>
                <Button variant="outline" size="sm">Update</Button>
              </div>
              <div className="flex items-center justify-between">
                <span>Two-Factor Authentication</span>
                <Button variant="outline" size="sm">Enable</Button>
              </div>
              <div className="flex items-center justify-between">
                <span>Data Export</span>
                <Button variant="outline" size="sm">Download</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}