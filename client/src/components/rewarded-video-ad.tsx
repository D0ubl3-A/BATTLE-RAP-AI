import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Video, Gift, Zap } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface RewardedVideoAdProps {
  onAdStarted?: () => Promise<void> | void;
  onRewardEarned: () => Promise<void> | void;
  rewardType: 'battle' | 'battles' | 'credits';
  rewardAmount: number;
}

/**
 * Rewarded Video Ad Component
 * Free users can watch ads to earn battles or credits
 */
export function RewardedVideoAd({ onAdStarted, onRewardEarned, rewardType, rewardAmount }: RewardedVideoAdProps) {
  const [isWatching, setIsWatching] = useState(false);
  const [adCompleted, setAdCompleted] = useState(false);
  const { toast } = useToast();

  const handleWatchAd = async () => {
    try {
      setIsWatching(true);
      await onAdStarted?.();
      // In production, integrate with Google AdMob rewarded video
      // For now, simulate ad watching
      
      // Simulate ad duration (30 seconds)
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      setAdCompleted(true);
      setIsWatching(false);
      
      // Award the reward
      await onRewardEarned();
      
      toast({
        title: "🎁 Reward Earned!",
        description: `You earned ${rewardAmount} ${rewardType}! Thank you for watching.`,
      });
    } catch (error) {
      console.error('Ad error:', error);
      setIsWatching(false);
      toast({
        title: "Ad Error",
        description: "Failed to load ad. Please try again.",
        variant: "destructive",
      });
    }
  };

  const getRewardText = () => {
    switch (rewardType) {
      case 'battle':
        return '1 Free Battle';
      case 'battles':
        return `${rewardAmount} Free Battles`;
      case 'credits':
        return `$${rewardAmount.toFixed(2)} Credits`;
      default:
        return 'Reward';
    }
  };

  return (
    <Card className="border-purple-500/50 bg-gradient-to-br from-purple-900/20 to-pink-900/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Video className="h-5 w-5 text-purple-400" />
          Watch Ad for Rewards
        </CardTitle>
        <CardDescription>
          Watch a short video to earn {getRewardText()}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="bg-purple-900/30 rounded-lg p-4 text-center">
            <Gift className="h-12 w-12 mx-auto mb-2 text-purple-400" />
            <p className="text-lg font-semibold text-purple-300">
              Earn: {getRewardText()}
            </p>
            <p className="text-sm text-gray-400 mt-1">~30 second video</p>
          </div>
          
          <Button
            onClick={handleWatchAd}
            disabled={isWatching || adCompleted}
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
          >
            {isWatching ? (
              <>
                <Zap className="mr-2 h-4 w-4 animate-pulse" />
                Loading Ad...
              </>
            ) : adCompleted ? (
              '✅ Reward Claimed'
            ) : (
              <>
                <Video className="mr-2 h-4 w-4" />
                Watch Video Ad
              </>
            )}
          </Button>
          
          {adCompleted && (
            <p className="text-center text-sm text-green-400">
              ✅ Reward has been added to your account!
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
