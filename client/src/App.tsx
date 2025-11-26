import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { SponsoredBanner } from "@/components/sponsored-banner";
import { ErrorBoundary } from "@/components/error-boundary";
import { InstallPrompt } from "@/components/install-prompt";
import { AudioAutoplayGate } from "@/components/AudioAutoplayGate";
import Landing from "@/pages/Landing";
import Home from "@/pages/Home";
import Subscribe from "@/pages/Subscribe";
import BattleArena from "@/pages/battle-arena";
import Tournaments from "@/pages/tournaments";
import TournamentDetail from "@/pages/tournament-detail";
import TournamentLeaderboard from "@/pages/tournament-leaderboard";
import TournamentHistory from "@/pages/tournament-history";
import TournamentBrackets from "@/pages/tournament-brackets";
import FineTuning from "@/pages/fine-tuning";
import Settings from "@/pages/settings";
import SafetyCenter from "@/pages/SafetyCenter";
import CloneManager from "@/pages/clone-manager";
import ProfilePage from "@/pages/profile";
import WalletPage from "@/pages/wallet";
import TrainingPage from "@/pages/Training";
import AdminWalletPage from "@/pages/AdminWallet";
import BattlePassPage from "@/pages/battle-pass";
import ShopPage from "@/pages/shop";
import ChallengesPage from "@/pages/challenges";
import MatchmakingPage from "@/pages/matchmaking";
import NotFound from "@/pages/not-found";
import AdminPage from "@/pages/admin";
import BlogIndex from "@/pages/blog/index";
import RedBullBatalla from "@/pages/blog/red-bull-batalla-2025";
import URLSummerMadness from "@/pages/blog/url-summer-madness";
import RisingStars from "@/pages/blog/rising-stars";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-void-black">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-cyber-red border-t-transparent rounded-full mb-4 glow-red" />
          <div className="text-cyber-red font-orbitron text-lg glow-red digital-flicker">
            🤖 SYSTEM INITIALIZING...
          </div>
        </div>
      </div>
    );
  }

  return (
    <Switch>
      {/* Public routes - accessible to everyone */}
      <Route path="/blog" component={BlogIndex} />
      <Route path="/blog/red-bull-batalla-2025" component={RedBullBatalla} />
      <Route path="/blog/url-summer-madness" component={URLSummerMadness} />
      <Route path="/blog/rising-stars" component={RisingStars} />
      <Route path="/tournaments/leaderboard" component={TournamentLeaderboard} />
      
      {/* Main routes - conditional based on auth */}
      {!isAuthenticated ? (
        <>
          <Route path="/" component={Landing} />
          <Route path="/tournaments" component={Tournaments} />
        </>
      ) : (
        <>
          {/* Authenticated routes */}
          <Route path="/" component={Home} />
          <Route path="/subscribe" component={Subscribe} />
          <Route path="/battle" component={BattleArena} />
          <Route path="/battle/:id" component={BattleArena} />
          <Route path="/tournaments" component={Tournaments} />
          <Route path="/tournaments/history" component={TournamentHistory} />
          <Route path="/tournaments/brackets" component={TournamentBrackets} />
          <Route path="/tournament/:id" component={TournamentDetail} />
          <Route path="/tournament/:tournamentId/battle/:battleId" component={BattleArena} />
          <Route path="/fine-tuning" component={FineTuning} />
          <Route path="/settings" component={Settings} />
          <Route path="/safety-center" component={SafetyCenter} />
          <Route path="/clone" component={CloneManager} />
          <Route path="/profile/:userId" component={ProfilePage} />
          <Route path="/profile" component={ProfilePage} />
          <Route path="/wallet" component={WalletPage} />
          <Route path="/training" component={TrainingPage} />
          <Route path="/battle-pass" component={BattlePassPage} />
          <Route path="/shop" component={ShopPage} />
          <Route path="/challenges" component={ChallengesPage} />
          <Route path="/matchmaking" component={MatchmakingPage} />
          <Route path="/admin" component={AdminPage} />
          <Route path="/admin/wallets" component={AdminWalletPage} />
        </>
      )}
      
      {/* 404 fallback */}
      <Route component={NotFound} />
    </Switch>
  );
}

function AppContent() {
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-dark via-secondary-dark to-primary-dark">
      <Toaster />
      <SponsoredBanner interval={25000} enabled={true} />
      <InstallPrompt />
      {/* Only show audio gate for authenticated users */}
      {!isLoading && isAuthenticated && (
        <AudioAutoplayGate 
          showDetailedInstructions={true}
          onAudioUnlocked={() => {
            console.log('🎵 Global audio unlocked - all auto-play features enabled');
          }}
        />
      )}
      <ErrorBoundary>
        <Router />
      </ErrorBoundary>
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <AppContent />
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;