import { Link, useLocation } from "wouter";
import { Crown, Database, GraduationCap, User, Plus, Search, Brain } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Navigation() {
  const [location] = useLocation();

  const navItems = [
    { href: "/", label: "Home", icon: Crown },
    { href: "/games", label: "Games DB", icon: Database },
    { href: "/scout", label: "Opponent Scout", icon: Search },
    { href: "/analysis", label: "Deep Analysis", icon: Brain },
    { href: "/learn", label: "Learn Chess", icon: GraduationCap },
    { href: "/account", label: "Account", icon: User },
  ];

  const isActive = (href: string) => {
    if (href === "/") return location === "/";
    return location.startsWith(href);
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-8">
            <Link href="/" className="flex items-center space-x-2">
              <Crown className="text-chess-dark text-2xl" />
              <span className="text-xl font-bold text-gray-900">ChessMaster Pro</span>
            </Link>
            <nav className="hidden md:flex space-x-8">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`font-medium pb-4 -mb-px transition-colors ${
                    isActive(item.href)
                      ? "text-chess-dark border-b-2 border-chess-dark"
                      : "text-gray-600 hover:text-chess-dark"
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex items-center space-x-4">
            <Button className="bg-chess-dark text-white hover:bg-chess-green">
              <Plus className="mr-2 h-4 w-4" />
              New Game
            </Button>
            <div className="w-8 h-8 chess-gold rounded-full flex items-center justify-center">
              <User className="text-white text-sm" />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
