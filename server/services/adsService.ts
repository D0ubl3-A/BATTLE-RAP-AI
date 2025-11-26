import { storage } from '../storage';

export interface AdCampaign {
  id: string;
  title: string;
  description: string;
  rewardValue: number; // Arc/Credits earned by user watching ad
  duration: number; // seconds
  enabled: boolean;
  createdAt: Date;
}

export interface AdImpression {
  userId: string;
  campaignId: string;
  timestamp: Date;
  completed: boolean;
  rewardClaimed: boolean;
}

export class AdsService {
  private impressions: Map<string, AdImpression[]> = new Map();
  
  // Sample ad campaigns (can be stored in DB)
  private campaigns: AdCampaign[] = [
    {
      id: 'ad_001',
      title: 'Battle Pass Premium',
      description: 'Unlock premium features',
      rewardValue: 50,
      duration: 30,
      enabled: true,
      createdAt: new Date(),
    },
    {
      id: 'ad_002',
      title: 'Cosmetics Shop',
      description: 'Discover new character skins',
      rewardValue: 25,
      duration: 15,
      enabled: true,
      createdAt: new Date(),
    },
    {
      id: 'ad_003',
      title: 'Tournament Sign-up',
      description: 'Join competitive tournaments',
      rewardValue: 75,
      duration: 45,
      enabled: true,
      createdAt: new Date(),
    },
  ];

  /**
   * Get available ads for user
   */
  getAvailableAds(): AdCampaign[] {
    return this.campaigns.filter(c => c.enabled);
  }

  /**
   * Track ad impression
   */
  async trackImpression(userId: string, campaignId: string, completed: boolean): Promise<AdImpression> {
    const impression: AdImpression = {
      userId,
      campaignId,
      timestamp: new Date(),
      completed,
      rewardClaimed: false,
    };

    if (!this.impressions.has(userId)) {
      this.impressions.set(userId, []);
    }
    this.impressions.get(userId)!.push(impression);

    console.log(`📺 Ad Impression: User ${userId}, Campaign ${campaignId}, Completed: ${completed}`);
    
    return impression;
  }

  /**
   * Claim reward for watching ad
   */
  async claimAdReward(userId: string, campaignId: string): Promise<{ reward: number; message: string }> {
    const campaign = this.campaigns.find(c => c.id === campaignId);
    if (!campaign) {
      throw new Error('Campaign not found');
    }

    // Check if user watched the ad
    const userImpressions = this.impressions.get(userId) || [];
    const adWatched = userImpressions.some(
      imp => imp.campaignId === campaignId && imp.completed && !imp.rewardClaimed
    );

    if (!adWatched) {
      throw new Error('Ad not completed or already claimed');
    }

    // Mark impression as reward claimed
    const impression = userImpressions.find(
      imp => imp.campaignId === campaignId && imp.completed && !imp.rewardClaimed
    );
    if (impression) {
      impression.rewardClaimed = true;
    }

    // Award credits to user
    await storage.updateUserCredits(userId, campaign.rewardValue);

    console.log(`💰 Ad Reward Claimed: User ${userId} earned ${campaign.rewardValue} credits from ad ${campaignId}`);

    return {
      reward: campaign.rewardValue,
      message: `Earned ${campaign.rewardValue} credits from ad!`,
    };
  }

  /**
   * Calculate total ad revenue from completed campaigns
   */
  getTotalAdRevenue(): number {
    let totalRewards = 0;
    this.impressions.forEach(userImpressions => {
      userImpressions.forEach(imp => {
        if (imp.completed && imp.rewardClaimed) {
          const campaign = this.campaigns.find(c => c.id === imp.campaignId);
          if (campaign) {
            totalRewards += campaign.rewardValue;
          }
        }
      });
    });
    return totalRewards;
  }

  /**
   * Get user's ad statistics
   */
  getUserAdStats(userId: string): {
    watched: number;
    completed: number;
    totalEarned: number;
  } {
    const userImpressions = this.impressions.get(userId) || [];
    const completed = userImpressions.filter(imp => imp.completed).length;
    const totalEarned = userImpressions
      .filter(imp => imp.completed && imp.rewardClaimed)
      .reduce((sum, imp) => {
        const campaign = this.campaigns.find(c => c.id === imp.campaignId);
        return sum + (campaign?.rewardValue || 0);
      }, 0);

    return {
      watched: userImpressions.length,
      completed,
      totalEarned,
    };
  }
}

export const adsService = new AdsService();
