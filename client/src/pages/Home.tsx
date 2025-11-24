import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Mic, Trophy, Zap, Crown, TrendingUp, Settings, Wallet, User } from "lucide-react";
import { Link } from "wouter";
import { motion } from "framer-motion";

import { SocialShare } from "@/components/SocialShare";
// import { XPDisplay } from "@/components/XPDisplay"; // Temporarily disabled - needs React hooks debugging

interface SubscriptionStatus {
  tier: 'free' | 'premium' | 'pro';
  status: string;
  battlesRemaining: number;
  canStartBattle: boolean;
}

interface UserStats {
  totalBattles: number;
  totalWins: number;
  winRate: number;
  battlesThisMonth: number;
}

interface Battle {
  id: string;
  aiCharacterName: string;
  createdAt: string;
  userScore: number;
  aiScore: number;
}

export default function Home() {
  const { user } = useAuth();
  
  const { data: subscriptionStatus } = useQuery<SubscriptionStatus>({
    queryKey: ["/api/subscription/status"],
    enabled: !!user,
  });

  const { data: userStats } = useQuery<UserStats>({
    queryKey: ["/api/user/stats"],
    enabled: !!user,
  });

  const { data: battleHistory } = useQuery<Battle[]>({
    queryKey: ["/api/battles/history"],
    enabled: !!user,
  });



  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'pro': return 'text-amber-500';
      case 'premium': return 'text-purple-500';
      default: return 'text-gray-500';
    }
  };

  const getTierIcon = (tier: string) => {
    switch (tier) {
      case 'pro': return <Crown className="h-4 w-4" />;
      case 'premium': return <Zap className="h-4 w-4" />;
      default: return <Mic className="h-4 w-4" />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
      <div className="container mx-auto max-w-6xl">
        {/* Header - Neon Apex Design */}
        <motion.div 
          className="glass-card neon-border-magenta p-6 mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-4xl font-orbitron font-bold text-white mb-3">
                Welcome back, {(user as any)?.firstName || 'Rapper'}!
              </h1>
              <div className="flex items-center gap-3">
                <div className="stat-badge flex items-center gap-2">
                  {getTierIcon(subscriptionStatus?.tier || 'free')}
                  <span className={`capitalize font-semibold ${getTierColor(subscriptionStatus?.tier || 'free')}`}>
                    {subscriptionStatus?.tier || 'Free'} Tier
                  </span>
                </div>
                {subscriptionStatus?.tier === 'free' && (
                  <Link to="/subscribe?tier=premium">
                    <Button size="sm" className="glass-panel border-2 border-purple-400 text-purple-400 hover:bg-purple-400 hover:text-white hover-lift">
                      Upgrade
                    </Button>
                  </Link>
                )}
              </div>
            </div>

            <div className="flex items-center gap-4">
              <Button
                onClick={() => window.location.href = '/api/logout'}
                className="glass-panel border border-slate-600 text-slate-300 hover:bg-slate-700 hover-lift"
              >
                Logout
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Quick Stats Cards - Neon Apex Design */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <motion.div
            className="glass-panel neon-border-cyan rounded-lg p-6 hover-lift"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <h3 className="text-sm font-medium text-prism-cyan uppercase tracking-wide mb-4">
              Battles Remaining
            </h3>
            <div className="stat-badge inline-block mb-3">
              <span className="text-3xl font-bold text-prism-cyan">
                {subscriptionStatus?.tier === 'pro' ? '∞' : subscriptionStatus?.battlesRemaining || 0}
              </span>
            </div>
            {subscriptionStatus?.tier !== 'pro' && (
              <Progress 
                value={((subscriptionStatus?.battlesRemaining || 0) / (subscriptionStatus?.tier === 'premium' ? 25 : 3)) * 100} 
                className="h-2 mb-2" 
              />
            )}
            <p className="text-xs text-gray-400">
              {subscriptionStatus?.tier === 'pro' 
                ? 'Unlimited battles' 
                : `Resets daily`}
            </p>
          </motion.div>

          <motion.div
            className="glass-panel neon-border-cyan rounded-lg p-6 hover-lift"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <h3 className="text-sm font-medium text-neon-magenta uppercase tracking-wide mb-4">
              Win Rate
            </h3>
            <div className="stat-badge inline-block mb-3">
              <span className="text-3xl font-bold text-neon-magenta">
                {userStats?.winRate?.toFixed(1) || 0}%
              </span>
            </div>
            <Progress value={userStats?.winRate || 0} className="h-2 mb-2" />
            <p className="text-xs text-gray-400">
              <span className="text-neon-magenta font-semibold">{userStats?.totalWins || 0}</span> wins of {userStats?.totalBattles || 0} battles
            </p>
          </motion.div>

          <motion.div
            className="glass-panel neon-border-cyan rounded-lg p-6 hover-lift"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <h3 className="text-sm font-medium text-prism-cyan uppercase tracking-wide mb-4">
              This Month
            </h3>
            <div className="stat-badge inline-block mb-3">
              <span className="text-3xl font-bold text-prism-cyan">
                {userStats?.battlesThisMonth || 0}
              </span>
            </div>
            <div className="flex items-center text-sm text-green-400 mt-2">
              <TrendingUp className="h-4 w-4 mr-1" />
              Active streak
            </div>
          </motion.div>
        </div>

        {/* Quick Action Buttons - Neon Apex Design */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <motion.div
            className="glass-card rounded-lg p-6 overflow-hidden relative"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-purple-600/20 to-pink-600/20 pointer-events-none"></div>
            <div className="relative z-10">
              <h3 className="flex items-center gap-2 text-xl font-bold mb-2">
                <Mic className="h-6 w-6 text-neon-magenta" />
                <span className="text-white">Start New Battle</span>
              </h3>
              <p className="text-gray-300 text-sm mb-4">
                Face off against AI opponents and test your skills
              </p>
              {subscriptionStatus?.canStartBattle ? (
                <Link to="/battle">
                  <Button className="w-full gradient-primary-bg text-white hover-lift glow-pulse-magenta font-bold text-lg py-6">
                    Battle Now
                  </Button>
                </Link>
              ) : (
                <>
                  <Button 
                    className="w-full glass-panel text-gray-400 cursor-not-allowed mb-3"
                    disabled
                  >
                    No Battles Left
                  </Button>
                  <Link to="/subscribe?tier=premium">
                    <Button className="w-full glass-panel border-2 border-purple-400 text-purple-400 hover:bg-purple-400 hover:text-white text-sm hover-lift">
                      Upgrade to Premium - $9.99/mo
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </motion.div>

          <motion.div
            className="glass-card rounded-lg p-6 overflow-hidden relative"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.5 }}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-amber-600/20 to-orange-600/20 pointer-events-none"></div>
            <div className="relative z-10">
              <h3 className="flex items-center gap-2 text-xl font-bold mb-2">
                <Trophy className="h-6 w-6 text-amber-400" />
                <span className="text-white">Tournament Mode</span>
              </h3>
              <p className="text-gray-300 text-sm mb-4">
                Compete in elimination brackets for ultimate glory
              </p>
              <Link to="/tournaments">
                <Button className="w-full glass-panel border-2 border-amber-400 text-amber-400 hover:bg-amber-400 hover:text-black font-semibold hover-lift glow-pulse-cyan" data-testid="button-tournament-mode">
                  Enter Tournament
                </Button>
              </Link>
            </div>
          </motion.div>

          <motion.div
            className="glass-card rounded-lg p-6 overflow-hidden relative"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.6 }}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-slate-600/20 to-gray-600/20 pointer-events-none"></div>
            <div className="relative z-10">
              <h3 className="flex items-center gap-2 text-xl font-bold mb-2">
                <Settings className="h-6 w-6 text-prism-cyan" />
                <span className="text-white">API Settings</span>
              </h3>
              <p className="text-gray-300 text-sm mb-4">
                Manage your OpenAI & Groq API keys for enhanced voice quality
              </p>
              <Link to="/settings">
                <Button className="w-full glass-panel border-2 border-prism-cyan text-prism-cyan hover:bg-prism-cyan hover:text-black font-semibold hover-lift" data-testid="button-settings">
                  Configure Settings
                </Button>
              </Link>
            </div>
          </motion.div>

          <motion.div
            className="glass-card rounded-lg p-6 overflow-hidden relative"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.7 }}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-green-600/20 to-emerald-600/20 pointer-events-none"></div>
            <div className="relative z-10">
              <h3 className="flex items-center gap-2 text-xl font-bold mb-2">
                <Wallet className="h-6 w-6 text-green-400" />
                <span className="text-white">My Wallet</span>
              </h3>
              <p className="text-gray-300 text-sm mb-4">
                Manage your store credits and USDC balance
              </p>
              <Link to="/wallet">
                <Button className="w-full glass-panel border-2 border-green-400 text-green-400 hover:bg-green-400 hover:text-black font-semibold hover-lift" data-testid="button-wallet">
                  View Wallet
                </Button>
              </Link>
            </div>
          </motion.div>

          <motion.div
            className="glass-card rounded-lg p-6 overflow-hidden relative"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.8 }}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 to-cyan-600/20 pointer-events-none"></div>
            <div className="relative z-10">
              <h3 className="flex items-center gap-2 text-xl font-bold mb-2">
                <User className="h-6 w-6 text-blue-400" />
                <span className="text-white">My Profile</span>
              </h3>
              <p className="text-gray-300 text-sm mb-4">
                View your stats, achievements, and customize your account
              </p>
              <Link to="/profile">
                <Button className="w-full glass-panel border-2 border-blue-400 text-blue-400 hover:bg-blue-400 hover:text-black font-semibold hover-lift" data-testid="button-profile">
                  Go to Profile
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>

        {/* Recent Battle History - Neon Apex Design */}
        <motion.div 
          className="glass-card rounded-lg p-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.7 }}
        >
          <h2 className="text-2xl font-orbitron font-bold text-white mb-6">
            Recent Battles
          </h2>
          {battleHistory && battleHistory.length > 0 ? (
            <div className="space-y-4">
              {battleHistory.slice(0, 5).map((battle: any, index: number) => {
                const isWin = battle.userScore > battle.aiScore;
                return (
                  <motion.div 
                    key={battle.id} 
                    className={`glass-panel rounded-lg p-4 flex items-center justify-between ${
                      isWin ? 'neon-border-cyan' : 'neon-border-magenta'
                    } hover-lift`}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.4, delay: 0.8 + (index * 0.1) }}
                  >
                    <div>
                      <div className="font-semibold text-lg text-white">
                        vs {battle.aiCharacterName}
                      </div>
                      <div className="text-sm text-gray-400 font-code">
                        {new Date(battle.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="text-right flex flex-col items-end gap-2">
                      <div className="stat-badge">
                        <span className={isWin ? 'text-prism-cyan' : 'text-neon-magenta'}>
                          {battle.userScore}
                        </span>
                        <span className="text-gray-500 mx-1">-</span>
                        <span className="text-gray-400">{battle.aiScore}</span>
                      </div>
                      <Badge 
                        className={`${
                          isWin 
                            ? 'bg-prism-cyan/20 text-prism-cyan border-prism-cyan' 
                            : 'bg-neon-magenta/20 text-neon-magenta border-neon-magenta'
                        } border font-semibold`}
                      >
                        {isWin ? '🏆 Victory' : '💀 Defeat'}
                      </Badge>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <motion.div 
              className="text-center py-12 text-gray-400"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.8 }}
            >
              <Mic className="h-16 w-16 mx-auto mb-4 opacity-30 text-prism-cyan" />
              <p className="text-lg">No battles yet. Start your first battle to see it here!</p>
            </motion.div>
          )}
        </motion.div>

        {/* Social Sharing Section */}
        {userStats && userStats.totalBattles > 0 && (
          <div className="mt-8">
            <SocialShare
              title="Rap Battle AI - Voice-Powered Battle Rap Game"
              text={`🎤 Join me on Rap Battle AI! I've fought ${userStats.totalBattles} battles with a ${userStats.winRate?.toFixed(1)}% win rate. Think you can beat the AI? Let's battle!`}
              hashtags={['RapBattleAI', 'FreestyleBattle', 'AIChallenge']}
              variant="default"
              className="mb-6"
            />
          </div>
        )}

        {/* Floating Social Share Button */}
        <SocialShare
          title="Rap Battle AI - Ultimate Voice-Powered Battle Rap Game"
          text="🔥 The future of freestyle battling is here! Challenge AI opponents with real voice synthesis and authentic rap scoring. Who's ready to test their flow?"
          hashtags={['RapBattleAI', 'VoiceAI', 'BattleRap', 'FreestyleBattle']}
          variant="floating"
        />
      </div>
    </div>
  );
}