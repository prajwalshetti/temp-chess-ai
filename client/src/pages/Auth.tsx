import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { insertUserSchema } from "@shared/schema";
import type { InsertUser } from "@shared/schema";

// Login form schema
const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type LoginFormData = z.infer<typeof loginSchema>;

// Registration form schema - extends the database schema
const registerSchema = insertUserSchema.extend({
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string().min(6, "Please confirm your password"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type RegisterFormData = z.infer<typeof registerSchema>;

export default function Auth() {
  const [, setLocation] = useLocation();
  const [isRegistering, setIsRegistering] = useState(false);
  const { toast } = useToast();
  const { login } = useAuth();
  const queryClient = useQueryClient();

  // Login form
  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  // Registration form
  const registerForm = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: "",
      email: "",
      password: "",
      confirmPassword: "",
      phoneNumber: "",
      lichessId: "",
      fideId: "",
      aicfId: "",
    },
  });

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: async (data: LoginFormData) => {
      const response = await apiRequest("POST", "/api/auth/login", data);
      return response.json();
    },
    onSuccess: (user) => {
      login(user);
      toast({
        title: "Login Successful!",
        description: `Welcome back, ${user.username}!`,
      });
      setLocation("/games");
    },
    onError: (error: any) => {
      toast({
        title: "Login Failed",
        description: error.message || "Invalid username or password.",
        variant: "destructive",
      });
    },
  });

  // Registration mutation
  const registerMutation = useMutation({
    mutationFn: async (data: RegisterFormData) => {
      const { confirmPassword, ...userData } = data;
      const response = await apiRequest("POST", "/api/users", userData);
      return response.json();
    },
    onSuccess: (user) => {
      login(user);
      toast({
        title: "Registration Successful!",
        description: `Welcome ${user.username}! Your chess analysis profile is ready.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setLocation("/games");
    },
    onError: (error: any) => {
      toast({
        title: "Registration Failed",
        description: error.message || "Please check your information and try again.",
        variant: "destructive",
      });
    },
  });

  const handleLogin = (data: LoginFormData) => {
    loginMutation.mutate(data);
  };

  const handleRegister = (data: RegisterFormData) => {
    registerMutation.mutate(data);
  };

  if (isRegistering) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
        <Card className="w-full max-w-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-slate-800">Create Account</CardTitle>
            <CardDescription>
              Set up your chess analysis profile to get started
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={registerForm.handleSubmit(handleRegister)} className="space-y-4">
              <div className="space-y-4">
                <div className="text-sm font-medium text-slate-700">Basic Information</div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="username">Username *</Label>
                    <Input
                      {...registerForm.register("username")}
                      placeholder="Your username"
                      className="mt-1"
                    />
                    {registerForm.formState.errors.username && (
                      <p className="text-sm text-red-600 mt-1">
                        {registerForm.formState.errors.username.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="email">Email Address *</Label>
                    <Input
                      {...registerForm.register("email")}
                      type="email"
                      placeholder="your@email.com"
                      className="mt-1"
                    />
                    {registerForm.formState.errors.email && (
                      <p className="text-sm text-red-600 mt-1">
                        {registerForm.formState.errors.email.message}
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <Label htmlFor="phoneNumber">Phone Number</Label>
                  <Input
                    {...registerForm.register("phoneNumber")}
                    placeholder="Your phone number"
                    className="mt-1"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="password">Password *</Label>
                    <Input
                      {...registerForm.register("password")}
                      type="password"
                      placeholder="Create password"
                      className="mt-1"
                    />
                    {registerForm.formState.errors.password && (
                      <p className="text-sm text-red-600 mt-1">
                        {registerForm.formState.errors.password.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="confirmPassword">Confirm Password *</Label>
                    <Input
                      {...registerForm.register("confirmPassword")}
                      type="password"
                      placeholder="Confirm password"
                      className="mt-1"
                    />
                    {registerForm.formState.errors.confirmPassword && (
                      <p className="text-sm text-red-600 mt-1">
                        {registerForm.formState.errors.confirmPassword.message}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t">
                <div className="text-sm font-medium text-slate-700">Tournament IDs</div>
                
                <div>
                  <Label htmlFor="lichessId">Lichess Username * <span className="text-blue-600">Required</span></Label>
                  <Input
                    {...registerForm.register("lichessId")}
                    placeholder="Your Lichess username"
                    className="mt-1"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Used for importing your online games and opponent analysis
                  </p>
                  {registerForm.formState.errors.lichessId && (
                    <p className="text-sm text-red-600 mt-1">
                      {registerForm.formState.errors.lichessId.message}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="fideId">FIDE ID</Label>
                    <Input
                      {...registerForm.register("fideId")}
                      placeholder="12345678"
                      className="mt-1"
                    />
                    <p className="text-xs text-slate-500 mt-1">International chess federation ID</p>
                  </div>

                  <div>
                    <Label htmlFor="aicfId">AICF ID</Label>
                    <Input
                      {...registerForm.register("aicfId")}
                      placeholder="IND12345678"
                      className="mt-1"
                    />
                    <p className="text-xs text-slate-500 mt-1">All India Chess Federation ID</p>
                  </div>
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full" 
                disabled={registerMutation.isPending}
              >
                {registerMutation.isPending ? "Creating Account..." : "Create Account"}
              </Button>

              <div className="text-center">
                <Button 
                  type="button" 
                  variant="ghost" 
                  onClick={() => setIsRegistering(false)}
                  className="text-sm"
                >
                  Already have an account? Sign in
                </Button>
              </div>

              <p className="text-xs text-center text-slate-500">
                By registering, you agree to use authentic chess data for tournament preparation
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-slate-800">Welcome Back</CardTitle>
          <CardDescription>
            Sign in to access your chess analysis dashboard
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-4">
            <div>
              <Label htmlFor="username">Username</Label>
              <Input
                {...loginForm.register("username")}
                placeholder="Enter your username"
                className="mt-1"
              />
              {loginForm.formState.errors.username && (
                <p className="text-sm text-red-600 mt-1">
                  {loginForm.formState.errors.username.message}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                {...loginForm.register("password")}
                type="password"
                placeholder="Enter your password"
                className="mt-1"
              />
              {loginForm.formState.errors.password && (
                <p className="text-sm text-red-600 mt-1">
                  {loginForm.formState.errors.password.message}
                </p>
              )}
            </div>

            <Button 
              type="submit" 
              className="w-full" 
              disabled={loginMutation.isPending}
            >
              {loginMutation.isPending ? "Signing In..." : "Sign In"}
            </Button>

            <div className="text-center">
              <Button 
                type="button" 
                variant="ghost" 
                onClick={() => setIsRegistering(true)}
                className="text-sm"
              >
                New to chess analysis? Create account
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}