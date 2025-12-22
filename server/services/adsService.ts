export interface AdCampaign {
  id: string;
  title: string;
  description: string;
  rewardValue: number; // Arc/Credits earned by user watching ad
  arcContributionUSDC: string; // USDC contribution to Arc rewards pool per completion
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

export interface AdRevenue {
  totalSpent: number; // Total credits spent by users on battles
  totalRewards: number; // Total credits given via ads
  netProfit: number; // totalSpent - totalRewards (covers Arc rewards)
}

export class AdsService {
  private impressions: Map<string, AdImpression[]> = new Map();
  private totalBattleSpending: number = 0; // Track all credits spent on battles
  
  // Sample ad campaigns (can be stored in DB)
  private campaigns: AdCampaign[] = [
    {
      id: 'ad_001',
      title: 'Battle Pass Premium',
      description: 'Unlock premium features',
      rewardValue: 50,
      arcContributionUSDC: "0.02",
      duration: 30,
      enabled: true,
      createdAt: new Date(),
    },
    {
      id: 'ad_002',
      title: 'Cosmetics Shop',
      description: 'Discover new character skins',
      rewardValue: 25,
      arcContributionUSDC: "0.01",
      duration: 15,
      enabled: true,
      createdAt: new Date(),
    },
    {
      id: 'ad_003',
      title: 'Tournament Sign-up',
      description: 'Join competitive tournaments',
      rewardValue: 75,
      arcContributionUSDC: "0.03",
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

  getCampaignById(campaignId: string): AdCampaign | undefined {
    return this.campaigns.find(campaign => campaign.id === campaignId);
  }

  /**
   * Track battle spending (revenue source to pay for Arc rewards)
   */
  trackBattleSpending(userId: string, creditsCost: number): void {
    this.totalBattleSpending += creditsCost;
    console.log(`💳 Battle Revenue: +${creditsCost} credits (User: ${userId}, Total Pool: ${this.totalBattleSpending})`);
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
   * Claim reward for watching ad (funded by battle spending revenue)
   */
  async claimAdReward(userId: string, campaignId: string, updateUserCallback: (userId: string, credits: number) => Promise<void>): Promise<{ reward: number; message: string }> {
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

    // Check if revenue pool has enough to cover reward
    if (this.totalBattleSpending < campaign.rewardValue) {
      throw new Error('Ad reward pool insufficient - not enough revenue from battles');
    }

    // Mark impression as reward claimed
    const impression = userImpressions.find(
      imp => imp.campaignId === campaignId && imp.completed && !imp.rewardClaimed
    );
    if (impression) {
      impression.rewardClaimed = true;
    }

    // Deduct from revenue pool and award to user
    this.totalBattleSpending -= campaign.rewardValue;
    await updateUserCallback(userId, campaign.rewardValue);

    console.log(`💰 Ad Reward Claimed: User ${userId} earned ${campaign.rewardValue} credits (Revenue pool: ${this.totalBattleSpending})`);

    return {
      reward: campaign.rewardValue,
      message: `Earned ${campaign.rewardValue} credits from ad! (Funded by battle spending)`,
    };
  }

  /**
   * Get total ad revenue system stats
   */
  getRevenueStats(): AdRevenue {
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

    return {
      totalSpent: this.totalBattleSpending + totalRewards,
      totalRewards,
      netProfit: this.totalBattleSpending,
    };
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
