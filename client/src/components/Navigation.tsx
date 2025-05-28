import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Crown, Database, GraduationCap, User, Plus, Search, Brain, Menu, X, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Navigation() {
  const [location] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navItems = [
    { href: "/", label: "Home", icon: Crown },
    { href: "/games", label: "Games DB", icon: Database },
    { href: "/scout", label: "Opponent Scout", icon: Search },
    { href: "/learn", label: "Learn Chess", icon: GraduationCap },
    { href: "/account", label: "Account", icon: User },
  ];

  const isActive = (href: string) => {
    if (href === "/") return location === "/";
    return location.startsWith(href);
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo and Brand */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center space-x-2">
              <Crown className="text-chess-dark text-2xl" />
              <span className="text-xl font-bold text-gray-900">ChessMaster Pro</span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex space-x-8">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center space-x-2 font-medium pb-4 -mb-px transition-colors ${
                    isActive(item.href)
                      ? "text-chess-dark border-b-2 border-chess-dark"
                      : "text-gray-600 hover:text-chess-dark"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center space-x-4">
            <Button className="bg-chess-dark text-white hover:bg-chess-green">
              <Plus className="mr-2 h-4 w-4" />
              New Game
            </Button>
            <Button 
              variant="outline" 
              onClick={async () => {
                try {
                  await fetch('/api/auth/logout', { method: 'POST' });
                  window.location.href = '/auth';
                } catch (error) {
                  console.error('Logout failed:', error);
                  window.location.href = '/auth';
                }
              }}
              className="text-red-600 border-red-200 hover:bg-red-50"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
            <div className="w-8 h-8 chess-gold rounded-full flex items-center justify-center">
              <User className="text-white text-sm" />
            </div>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2"
            >
              {isMobileMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-gray-200 bg-white">
            <div className="px-2 pt-2 pb-3 space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center space-x-3 px-3 py-3 rounded-md text-base font-medium transition-colors w-full ${
                      isActive(item.href)
                        ? "bg-chess-light text-chess-dark"
                        : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                    }`}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <Icon className="h-5 w-5" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
              
              {/* Mobile Actions */}
              <div className="px-3 py-2 space-y-3">
                <Button className="bg-chess-dark text-white hover:bg-chess-green w-full">
                  <Plus className="mr-2 h-4 w-4" />
                  New Game
                </Button>
                <div className="flex items-center space-x-2 text-gray-600">
                  <div className="w-8 h-8 chess-gold rounded-full flex items-center justify-center">
                    <User className="text-white text-sm" />
                  </div>
                  <span className="text-sm font-medium">ChessPlayer2023</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
