import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Navigation } from "@/components/Navigation";
import Home from "@/pages/Home";
import GamesDatabase from "@/pages/GamesDatabase";
import PlayerProfile from "@/pages/PlayerProfile";
import LearnChess from "@/pages/LearnChess";
import Account from "@/pages/Account";
import OpponentScout from "@/pages/OpponentScout";
import GameAnalysis from "@/pages/GameAnalysis";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/games" component={GamesDatabase} />
      <Route path="/profile" component={PlayerProfile} />
      <Route path="/scout" component={OpponentScout} />
      <Route path="/opponent-scout" component={OpponentScout} />
      <Route path="/learn" component={LearnChess} />
      <Route path="/account" component={Account} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <div className="min-h-screen bg-gray-50">
          <Navigation />
          <Router />
        </div>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
