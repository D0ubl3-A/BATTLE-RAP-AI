import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Wallet, Copy, Check, ExternalLink, TrendingUp, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { RewardedVideoAd } from "@/components/rewarded-video-ad";
import { AdBanner } from "@/components/ad-banner";
import { apiRequest } from "@/lib/queryClient";
import { Link } from "wouter";

interface WalletData {
  balance: string;
  totalEarned: string;
  walletAddress: string;
}

interface StoreCreditData {
  balance: string;
}

interface Transaction {
  txHash: string;
  txType: string;
  amountUSDC: string;
  status: string;
  createdAt: string;
  confirmedAt?: string;
}

interface AdCampaign {
  id: string;
  title: string;
  rewardValue: number;
  duration: number;
}

interface AdImpression {
  id: string;
  rewardToken: string;
}

export function WalletDashboard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState(false);
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [displayBalance, setDisplayBalance] = useState(0);
  const [activeImpression, setActiveImpression] = useState<AdImpression | null>(null);

  // Fetch store credits (in-app credits for battles)
  const { data: storeCredit, isLoading: storeCreditLoading } = useQuery<StoreCreditData>({
    queryKey: ["/api/store-credit/balance"],
  });

  // Fetch wallet balance
  const { data: walletData, isLoading: walletLoading } = useQuery<WalletData>({
    queryKey: ["/api/arc/wallet/balance"],
  });

  // Fetch recent transactions
  const { data: transactions, isLoading: txLoading } = useQuery<Transaction[]>({
    queryKey: ["/api/arc/wallet/transactions"],
  });

  const { data: adData } = useQuery<{ ads: AdCampaign[] }>({
    queryKey: ["/api/ads"],
  });

  const activeAd = adData?.ads?.[0];

  // Count-up animation for balance
  useEffect(() => {
    if (walletData?.balance) {
      const targetBalance = parseFloat(walletData.balance);
      const duration = 1500; // 1.5 seconds
      const steps = 60;
      const increment = targetBalance / steps;
      let current = 0;
      
      const timer = setInterval(() => {
        current += increment;
        if (current >= targetBalance) {
          setDisplayBalance(targetBalance);
          clearInterval(timer);
        } else {
          setDisplayBalance(current);
        }
      }, duration / steps);
      
      return () => clearInterval(timer);
    }
  }, [walletData?.balance]);

  const copyAddress = () => {
    if (walletData?.walletAddress) {
      navigator.clipboard.writeText(walletData.walletAddress);
      setCopied(true);
      toast({
        title: "Address Copied",
        description: "Wallet address copied to clipboard",
      });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "confirmed":
        return (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <Check className="w-4 h-4 text-prism-cyan" data-testid="icon-confirmed" style={{ filter: 'drop-shadow(0 0 4px hsla(180, 100%, 50%, 0.6))' }} />
          </motion.div>
        );
      case "pending":
        return (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="w-4 h-4 border-2 border-neon-magenta border-t-transparent rounded-full"
            data-testid="icon-pending"
            style={{ boxShadow: '0 0 8px hsla(330, 100%, 50%, 0.4)' }}
          />
        );
      case "failed":
        return <span className="text-red-500" data-testid="icon-failed" style={{ filter: 'drop-shadow(0 0 4px rgba(239, 68, 68, 0.6))' }}>✕</span>;
      default:
        return null;
    }
  };

  const getTypeIcon = (type: string) => {
    if (type.includes("deposit") || type.includes("stake")) {
      return (
        <ArrowDownRight
          className="w-5 h-5 text-neon-magenta"
          data-testid="icon-outgoing"
          style={{ filter: 'drop-shadow(0 0 6px hsla(330, 100%, 50%, 0.6))' }}
        />
      );
    }
    return (
      <ArrowUpRight
        className="w-5 h-5 text-prism-cyan"
        data-testid="icon-incoming"
        style={{ filter: 'drop-shadow(0 0 6px hsla(180, 100%, 50%, 0.6))' }}
      />
    );
  };

  const handleAdStarted = async () => {
    if (!activeAd) {
      throw new Error("No ad campaign available");
    }

    const impressionResponse = await apiRequest("POST", "/api/ads/impression", {
      campaignId: activeAd.id,
    });

    if (!impressionResponse.ok) {
      throw new Error("Failed to track ad impression");
    }

    const impressionData = await impressionResponse.json();
    const impression = impressionData?.impression;
    if (!impression?.id || !impression?.rewardToken) {
      throw new Error("Ad impression was not issued correctly");
    }

    setActiveImpression({ id: impression.id, rewardToken: impression.rewardToken });
  };

  const handleRewardEarned = async () => {
    if (!activeAd) {
      throw new Error("No ad campaign available");
    }

    if (!activeImpression?.id || !activeImpression?.rewardToken) {
      throw new Error("Ad impression was not issued correctly");
    }

    const rewardResponse = await apiRequest("POST", "/api/ads/claim-reward", {
      campaignId: activeAd.id,
      impressionId: activeImpression.id,
      rewardToken: activeImpression.rewardToken,
    });

    if (!rewardResponse.ok) {
      const error = await rewardResponse.json();
      throw new Error(error?.error || "Failed to claim ad reward");
    }

    setActiveImpression(null);
    await queryClient.invalidateQueries({ queryKey: ["/api/store-credit/balance"] });
  };

  if (walletLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Arc Wallet</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!walletData) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Arc Wallet</CardTitle>
          <CardDescription>Create your Arc wallet to earn USDC</CardDescription>
        </CardHeader>
        <CardContent>
          <Button className="w-full" data-testid="button-create-wallet">
            <Wallet className="w-4 h-4 mr-2" />
            Create Wallet
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Store Credits Card - Neon Apex Style */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="glass-card neon-border-cyan glow-pulse-cyan"
      >
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-prism-cyan font-orbitron">
                💰 Store Credits
              </CardTitle>
              <CardDescription className="text-gray-400">Use these credits to battle AI opponents</CardDescription>
            </div>
            <Badge className="stat-badge text-prism-cyan border-prism-cyan/50">
              Active
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {storeCreditLoading ? (
            <div className="flex items-center justify-center p-8">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="w-8 h-8 border-4 border-prism-cyan border-t-transparent rounded-full"
              />
            </div>
          ) : storeCredit ? (
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              className="p-6 gradient-card-bg rounded-lg border border-prism-cyan/30"
            >
              <div className="text-sm text-prism-cyan mb-1">Available Credits</div>
              <div className="text-5xl font-orbitron font-bold text-prism-cyan mb-2 glow-pulse-cyan" data-testid="text-store-credits">
                ${parseFloat(storeCredit.balance || '0').toFixed(2)}
              </div>
              <p className="text-xs text-gray-400 mt-2">
                🎤 Use credits to enter battles, train with AI, and unlock features
              </p>
            </motion.div>
          ) : (
            <div className="p-6 glass-panel rounded-lg border border-red-500/30">
              <p className="text-red-400 text-sm">
                Unable to load store credits. Please refresh the page or contact support if the issue persists.
              </p>
            </div>
          )}
        </CardContent>
      </motion.div>

      {activeAd && (
        <RewardedVideoAd
          onAdStarted={handleAdStarted}
          onRewardEarned={handleRewardEarned}
          rewardType="credits"
          rewardAmount={activeAd.rewardValue}
        />
      )}

      <div className="glass-card neon-border-magenta p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-lg font-orbitron text-white">Need more credits?</h3>
            <p className="text-sm text-gray-400">Buy credits instantly to keep battling and training.</p>
          </div>
          <Link to="/subscribe?purchase=credits">
            <Button className="gradient-primary-bg hover-lift text-white font-orbitron">
              Buy Credits
            </Button>
          </Link>
        </div>
      </div>

      <AdBanner
        slot={import.meta.env.VITE_ADSENSE_WALLET_SLOT || "0000000000"}
        className="rounded-lg overflow-hidden"
      />

      {/* Arc Wallet Card - Neon Apex Hero */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="glass-card neon-border-magenta glow-pulse-magenta"
      >
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 font-orbitron text-neon-magenta">
                <Wallet className="w-5 h-5" style={{ filter: 'drop-shadow(0 0 8px hsla(330, 100%, 50%, 0.6))' }} />
                Arc Wallet
              </CardTitle>
              <CardDescription className="text-gray-400">Circle's Arc L1 Blockchain</CardDescription>
            </div>
            <Badge className="stat-badge text-prism-cyan border-prism-cyan/50">
              <span className="w-2 h-2 bg-prism-cyan rounded-full mr-1 animate-pulse"></span>
              Live
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Balance Display Hero */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="p-8 gradient-primary-bg rounded-lg border neon-border-cyan shadow-lg"
          >
            <div className="text-sm text-gray-300 mb-2">USDC Balance</div>
            <motion.div
              className="text-6xl font-orbitron font-bold text-white mb-4"
              data-testid="text-balance"
              style={{ textShadow: '0 0 20px hsla(180, 100%, 50%, 0.8), 0 0 40px hsla(180, 100%, 50%, 0.4)' }}
            >
              ${displayBalance.toFixed(2)}
            </motion.div>
            <div className="flex items-center gap-2 text-sm">
              <TrendingUp className="w-4 h-4 text-neon-magenta" style={{ filter: 'drop-shadow(0 0 6px hsla(330, 100%, 50%, 0.6))' }} />
              <span className="text-gray-300">Total Earned:</span>
              <span className="stat-badge text-neon-magenta" data-testid="text-total-earned">
                ${parseFloat(walletData.totalEarned).toFixed(2)} USDC
              </span>
            </div>
          </motion.div>

          {/* Arc Wallet Info */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="glass-panel rounded-lg p-4"
          >
            <div className="text-sm font-medium text-prism-cyan mb-3 flex items-center gap-2">
              <Wallet className="w-4 h-4" style={{ filter: 'drop-shadow(0 0 6px hsla(180, 100%, 50%, 0.6))' }} />
              Wallet Address
            </div>
            <div className="flex items-center gap-2 p-3 glass-panel neon-border-cyan rounded-lg">
              <code className="flex-1 text-xs font-code truncate text-prism-cyan" data-testid="text-wallet-address">
                {walletData.walletAddress}
              </code>
              <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={copyAddress}
                  className="hover-lift"
                  data-testid="button-copy-address"
                >
                  <AnimatePresence mode="wait">
                    {copied ? (
                      <motion.div
                        key="check"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0 }}
                      >
                        <Check className="w-4 h-4 text-prism-cyan" />
                      </motion.div>
                    ) : (
                      <motion.div
                        key="copy"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0 }}
                      >
                        <Copy className="w-4 h-4 text-gray-400" />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Button>
              </motion.div>
            </div>
            <p className="text-xs text-gray-400 mt-2">
              Send USDC to this address on Arc L1 to add funds
            </p>
          </motion.div>

          {/* Transaction History Timeline */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm font-medium text-neon-magenta font-orbitron">Recent Transactions</div>
              {transactions && transactions.length > 0 && (
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button variant="ghost" size="sm" className="hover-lift text-prism-cyan" data-testid="button-view-all">
                    <ExternalLink className="w-3 h-3 mr-1" />
                    View All
                  </Button>
                </motion.div>
              )}
            </div>
            <div className="space-y-3">
              {txLoading ? (
                <div className="text-center py-4 text-sm text-gray-400">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="w-6 h-6 border-4 border-prism-cyan border-t-transparent rounded-full mx-auto"
                  />
                  <p className="mt-2">Loading transactions...</p>
                </div>
              ) : transactions && transactions.length > 0 ? (
                transactions.slice(0, 5).map((tx, index) => {
                  const isDeposit = tx.txType.includes("deposit") || tx.txType.includes("stake");
                  const isPending = tx.status === "pending";
                  return (
                    <motion.button
                      key={tx.txHash}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.05 }}
                      whileHover={{ scale: 1.02, x: 4 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setSelectedTx(tx)}
                      className={`w-full p-4 glass-panel rounded-lg flex items-center justify-between transition-all text-left hover-lift ${
                        isDeposit ? 'neon-border-magenta' : 'neon-border-cyan'
                      } ${isPending ? 'animate-pulse' : ''}`}
                      data-testid={`transaction-${tx.txHash}`}
                    >
                      <div className="flex items-center gap-3">
                        {getTypeIcon(tx.txType)}
                        <div>
                          <div className="text-sm font-medium capitalize text-white">
                            {tx.txType.replace(/_/g, " ")}
                          </div>
                          <div className="stat-badge text-xs mt-1">
                            {new Date(tx.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <div className={`stat-badge font-orbitron ${isDeposit ? 'text-neon-magenta' : 'text-prism-cyan'}`}>
                            ${parseFloat(tx.amountUSDC).toFixed(2)}
                          </div>
                          <div className="text-xs text-gray-400 flex items-center gap-1 mt-1">
                            {getStatusIcon(tx.status)}
                            <span className="capitalize">{tx.status}</span>
                          </div>
                        </div>
                      </div>
                    </motion.button>
                  );
                })
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-8 glass-panel rounded-lg"
                >
                  <Wallet className="w-12 h-12 mx-auto mb-2 opacity-20 text-prism-cyan" />
                  <p className="text-gray-400">No transactions yet</p>
                  <p className="text-xs mt-1 text-gray-500">Win battles to earn USDC!</p>
                </motion.div>
              )}
            </div>
          </motion.div>

          {/* Add Funds Button */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Button
              variant="outline"
              className="w-full gradient-card-bg neon-border-cyan hover-lift font-orbitron text-prism-cyan"
              data-testid="button-add-funds"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              How to Add USDC
            </Button>
          </motion.div>
        </CardContent>
      </motion.div>

      {/* Transaction Details Modal - Neon Apex Style */}
      <AnimatePresence>
        {selectedTx && (
          <Dialog open={!!selectedTx} onOpenChange={() => setSelectedTx(null)}>
            <DialogContent className="glass-card neon-border-magenta">
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <DialogHeader>
                  <DialogTitle className="font-orbitron text-neon-magenta text-xl">
                    Transaction Details
                  </DialogTitle>
                  <DialogDescription className="text-gray-400">Arc Blockchain Transaction</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div className="glass-panel p-3 rounded-lg">
                    <div className="text-xs font-medium mb-1 text-prism-cyan">Type</div>
                    <div className="text-sm text-white capitalize font-medium">
                      {selectedTx.txType.replace(/_/g, " ")}
                    </div>
                  </div>
                  <div className="glass-panel p-4 rounded-lg gradient-card-bg neon-border-cyan">
                    <div className="text-xs font-medium mb-2 text-prism-cyan">Amount</div>
                    <div className="text-3xl font-orbitron font-bold text-white" style={{ textShadow: '0 0 15px hsla(180, 100%, 50%, 0.6)' }}>
                      ${parseFloat(selectedTx.amountUSDC).toFixed(2)} USDC
                    </div>
                  </div>
                  <div className="glass-panel p-3 rounded-lg">
                    <div className="text-xs font-medium mb-2 text-prism-cyan">Status</div>
                    <Badge className={`stat-badge ${selectedTx.status === "confirmed" ? "text-prism-cyan border-prism-cyan" : "text-neon-magenta border-neon-magenta"}`}>
                      {selectedTx.status}
                    </Badge>
                  </div>
                  <div className="glass-panel p-3 rounded-lg">
                    <div className="text-xs font-medium mb-2 text-prism-cyan">Transaction Hash</div>
                    <code className="text-xs font-code glass-panel p-2 rounded block overflow-x-auto text-gray-300">
                      {selectedTx.txHash}
                    </code>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="glass-panel p-3 rounded-lg">
                      <div className="text-xs font-medium mb-1 text-prism-cyan">Created</div>
                      <div className="text-xs text-gray-300">
                        {new Date(selectedTx.createdAt).toLocaleString()}
                      </div>
                    </div>
                    {selectedTx.confirmedAt && (
                      <div className="glass-panel p-3 rounded-lg">
                        <div className="text-xs font-medium mb-1 text-prism-cyan">Confirmed</div>
                        <div className="text-xs text-gray-300">
                          {new Date(selectedTx.confirmedAt).toLocaleString()}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            </DialogContent>
          </Dialog>
        )}
      </AnimatePresence>
    </div>
  );
}
