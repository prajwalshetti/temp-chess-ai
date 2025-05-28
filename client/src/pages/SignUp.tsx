import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { insertUserSchema, type InsertUser } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { UserPlus, Trophy, Globe, Users } from "lucide-react";

export default function SignUp() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<InsertUser>({
    resolver: zodResolver(insertUserSchema),
    defaultValues: {
      username: "",
      email: "",
      phoneNumber: "",
      fideId: "",
      aicfId: "",
      lichessId: "",
    },
  });

  const signUpMutation = useMutation({
    mutationFn: async (data: InsertUser) => {
      const response = await apiRequest("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return response.json();
    },
    onSuccess: (user) => {
      toast({
        title: "Registration Successful!",
        description: `Welcome ${user.username}! Your tournament analysis profile is ready.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setLocation("/games-database");
    },
    onError: (error: any) => {
      toast({
        title: "Registration Failed",
        description: error.message || "Please check your information and try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InsertUser) => {
    signUpMutation.mutate(data);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-2xl mx-auto pt-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="bg-blue-600 p-3 rounded-full">
              <Trophy className="h-8 w-8 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Join EduChess Club
          </h1>
          <p className="text-gray-600 text-lg">
            Advanced chess analysis platform for tournament players
          </p>
        </div>

        {/* Benefits Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white p-4 rounded-lg shadow-sm border border-blue-100">
            <Globe className="h-6 w-6 text-blue-600 mb-2" />
            <h3 className="font-semibold text-sm">Opponent Analysis</h3>
            <p className="text-xs text-gray-600">Scout opponents before tournaments</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border border-green-100">
            <Users className="h-6 w-6 text-green-600 mb-2" />
            <h3 className="font-semibold text-sm">Game Database</h3>
            <p className="text-xs text-gray-600">Track offline & online games</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border border-purple-100">
            <Trophy className="h-6 w-6 text-purple-600 mb-2" />
            <h3 className="font-semibold text-sm">AI Analysis</h3>
            <p className="text-xs text-gray-600">Advanced tactical insights</p>
          </div>
        </div>

        {/* Registration Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <UserPlus className="mr-2 h-5 w-5 text-blue-600" />
              Tournament Player Registration
            </CardTitle>
            <CardDescription>
              Create your chess analysis profile to get started
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Basic Information */}
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-900 border-b pb-2">Basic Information</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="username">Username *</Label>
                    <Input
                      id="username"
                      {...form.register("username")}
                      placeholder="Your display name"
                      className="mt-1"
                    />
                    {form.formState.errors.username && (
                      <p className="text-sm text-red-600 mt-1">
                        {form.formState.errors.username.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="email">Email Address *</Label>
                    <Input
                      id="email"
                      type="email"
                      {...form.register("email")}
                      placeholder="your.email@example.com"
                      className="mt-1"
                    />
                    {form.formState.errors.email && (
                      <p className="text-sm text-red-600 mt-1">
                        {form.formState.errors.email.message}
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <Label htmlFor="phoneNumber">Phone Number</Label>
                  <Input
                    id="phoneNumber"
                    {...form.register("phoneNumber")}
                    placeholder="+91 98765 43210"
                    className="mt-1"
                  />
                  {form.formState.errors.phoneNumber && (
                    <p className="text-sm text-red-600 mt-1">
                      {form.formState.errors.phoneNumber.message}
                    </p>
                  )}
                </div>
              </div>

              {/* Tournament IDs */}
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-900 border-b pb-2">Tournament IDs</h3>
                
                <div>
                  <Label htmlFor="lichessId" className="flex items-center">
                    Lichess Username *
                    <span className="ml-2 text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">Required</span>
                  </Label>
                  <Input
                    id="lichessId"
                    {...form.register("lichessId")}
                    placeholder="Your Lichess username"
                    className="mt-1"
                  />
                  <p className="text-xs text-gray-600 mt-1">
                    Used for importing your online games and opponent analysis
                  </p>
                  {form.formState.errors.lichessId && (
                    <p className="text-sm text-red-600 mt-1">
                      {form.formState.errors.lichessId.message}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="fideId">FIDE ID</Label>
                    <Input
                      id="fideId"
                      {...form.register("fideId")}
                      placeholder="12345678"
                      className="mt-1"
                    />
                    <p className="text-xs text-gray-600 mt-1">
                      International chess federation ID
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="aicfId">AICF ID</Label>
                    <Input
                      id="aicfId"
                      {...form.register("aicfId")}
                      placeholder="IND12345678"
                      className="mt-1"
                    />
                    <p className="text-xs text-gray-600 mt-1">
                      All India Chess Federation ID
                    </p>
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-4 border-t">
                <Button
                  type="submit"
                  className="w-full"
                  disabled={signUpMutation.isPending}
                >
                  {signUpMutation.isPending ? "Creating Account..." : "Create Tournament Profile"}
                </Button>
                <p className="text-xs text-gray-600 text-center mt-3">
                  By registering, you agree to use authentic chess data for tournament preparation
                </p>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Footer Note */}
        <div className="text-center mt-8 text-gray-600">
          <p className="text-sm">
            Already have an account? 
            <Button variant="link" className="p-0 ml-1 h-auto" onClick={() => setLocation("/")}>
              Go to Dashboard
            </Button>
          </p>
        </div>
      </div>
    </div>
  );
}