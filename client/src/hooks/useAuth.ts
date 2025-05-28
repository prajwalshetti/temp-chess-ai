import { useState, useEffect } from "react";

interface User {
  id: number;
  username: string;
  email: string;
  phoneNumber?: string | null;
  fideId?: string | null;
  aicfId?: string | null;
  lichessId: string;
  currentRating?: number | null;
  puzzleRating?: number | null;
  createdAt?: Date;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if user is logged in (for now, simulate with localStorage)
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setIsLoading(false);
  }, []);

  const login = (userData: User) => {
    setUser(userData);
    localStorage.setItem('currentUser', JSON.stringify(userData));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('currentUser');
  };

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    logout,
  };
}