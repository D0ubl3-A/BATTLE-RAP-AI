import { storage } from '../storage';
import NodeCache from 'node-cache';

export interface MatchmakingOptions {
  userId: string;
  difficulty?: 'easy' | 'normal' | 'hard' | 'nightmare';
  preferredCharacters?: string[];
}

export interface RandomMatch {
  opponentId: string;
  opponentName: string;
  opponentCharacterId: string;
  difficulty: string;
  lyricComplexity: number;
  styleIntensity: number;
}

interface AdvancedPlayerMetrics {
  eloRating: number;
  momentum: number;
  winStreak: number;
  volatility: number;
  winProbability: number;
  adaptiveDifficulty: number;
}

export class MatchmakingService {
  private matchQueue: Map<string, { userId: string; timestamp: number; options: MatchmakingOptions }> = new Map();
  private readonly MATCH_TIMEOUT = 30000; // 30 seconds
  private metricsCache = new NodeCache({ stdTTL: 300 }); // 5 minute cache for metrics

  // AI opponents with varying skill levels and ELO ratings
  private aiOpponents = [
    { id: 'razor', name: 'MC Razor', difficulty: 'easy', gender: 'female', baseElo: 1200 },
    { id: 'venom', name: 'MC Venom', difficulty: 'normal', gender: 'male', baseElo: 1400 },
    { id: 'silk', name: 'MC Silk', difficulty: 'normal', gender: 'male', baseElo: 1400 },
    { id: 'cypher', name: 'CYPHER-9000', difficulty: 'hard', gender: 'robot', baseElo: 1700 },
    { id: 'inferno', name: 'MC Inferno', difficulty: 'hard', gender: 'male', baseElo: 1700 },
    { id: 'phoenix', name: 'Phoenix', difficulty: 'nightmare', gender: 'female', baseElo: 2000 },
  ];

  async findRandomMatch(options: MatchmakingOptions): Promise<RandomMatch> {
    console.log(`🎮 Finding advanced match for user ${options.userId}...`);

    // Clean up old queue entries
    this.cleanupQueue();

    // Get user stats and calculate advanced metrics
    const userStats = await storage.getUserStats(options.userId);
    const metrics = await this.calculateAdvancedMetrics(options.userId, userStats);

    console.log(`📊 Advanced Metrics - ELO: ${metrics.eloRating}, Momentum: ${metrics.momentum.toFixed(2)}, Streak: ${metrics.winStreak}`);

    // Select opponent based on advanced metrics
    const opponent = this.selectOpponentByMetrics(options, metrics);

    // Calculate adaptive match parameters based on metrics
    const match: RandomMatch = {
      opponentId: opponent.id,
      opponentName: opponent.name,
      opponentCharacterId: opponent.id,
      difficulty: opponent.difficulty,
      lyricComplexity: this.calculateAdaptiveComplexity(metrics, opponent),
      styleIntensity: this.calculateAdaptiveIntensity(metrics, opponent),
    };

    console.log(`✅ Advanced match created: ${match.opponentName} (Adaptive Difficulty: ${metrics.adaptiveDifficulty.toFixed(2)})`);

    return match;
  }

  private cleanupQueue() {
    const now = Date.now();
    for (const [key, entry] of this.matchQueue.entries()) {
      if (now - entry.timestamp > this.MATCH_TIMEOUT) {
        this.matchQueue.delete(key);
      }
    }
  }

  // Advanced ELO-style rating calculation
  private calculateEloRating(stats: any): number {
    const baseElo = 1400;
    const winRate = stats.totalBattles > 0 ? stats.totalWins / stats.totalBattles : 0.5;
    const scoreFactor = (stats.averageScore || 50) / 100;
    const battlesFactor = Math.log10(stats.totalBattles + 1) * 100;
    
    // ELO calculation: base + win rate bonus + score bonus + battles played
    const eloRating = baseElo + (winRate * 300) + (scoreFactor * 200) + Math.min(battlesFactor, 300);
    
    return Math.round(Math.min(2500, Math.max(800, eloRating))); // Cap between 800-2500
  }

  // Calculate momentum (recent performance multiplier)
  private calculateMomentum(stats: any): number {
    if (!stats.totalBattles || stats.totalBattles === 0) return 1.0;

    // Get recent win rate (last 10 battles weighted)
    const recentWins = Math.min(stats.recentWins || 0, 10);
    const recentBattles = Math.min(stats.recentBattles || 1, 10);
    const recentWinRate = recentBattles > 0 ? recentWins / recentBattles : 0;

    // Momentum multiplier: 0.5 (cold streak) to 2.0 (hot streak)
    const momentumMultiplier = 0.5 + (recentWinRate * 1.5);

    return momentumMultiplier;
  }

  // Detect win streak for psychological boost/challenge
  private detectWinStreak(stats: any): number {
    if (!stats.totalBattles || stats.totalBattles === 0) return 0;
    
    // Simple streak tracking (would need battle history for accurate tracking)
    const winRate = stats.totalWins / stats.totalBattles;
    const estimatedStreak = Math.floor(winRate * 5); // Estimate based on win rate

    return Math.min(estimatedStreak, 10); // Cap at 10 streak
  }

  // Calculate performance volatility (consistency score)
  private calculateVolatility(stats: any): number {
    if (!stats.totalBattles || stats.totalBattles < 3) return 1.0;

    const scoreVariance = Math.max(stats.scoreStdDev || 15, 5);
    const volatility = Math.min(2.0, Math.max(0.5, 30 / scoreVariance));

    return volatility;
  }

  // Win probability against AI opponent
  private calculateWinProbability(userElo: number, opponentElo: number): number {
    // Standard ELO probability formula
    const probability = 1 / (1 + Math.pow(10, (opponentElo - userElo) / 400));
    return probability;
  }

  // Advanced metrics calculation combining all factors
  private async calculateAdvancedMetrics(userId: string, stats: any): Promise<AdvancedPlayerMetrics> {
    const cacheKey = `metrics_${userId}`;
    const cached = this.metricsCache.get(cacheKey) as AdvancedPlayerMetrics;
    
    if (cached) return cached;

    const eloRating = this.calculateEloRating(stats);
    const momentum = this.calculateMomentum(stats);
    const winStreak = this.detectWinStreak(stats);
    const volatility = this.calculateVolatility(stats);
    const adaptiveDifficulty = (eloRating - 1000) / 300; // Normalize to 1-5 scale

    // Predict win prob against average opponent (1400 ELO)
    const winProbability = this.calculateWinProbability(eloRating, 1400);

    const metrics: AdvancedPlayerMetrics = {
      eloRating,
      momentum,
      winStreak,
      volatility,
      winProbability,
      adaptiveDifficulty: Math.max(1, Math.min(5, adaptiveDifficulty)),
    };

    this.metricsCache.set(cacheKey, metrics);
    return metrics;
  }

  // Select opponent based on advanced metrics
  private selectOpponentByMetrics(options: MatchmakingOptions, metrics: AdvancedPlayerMetrics): typeof this.aiOpponents[0] {
    let availableOpponents = this.aiOpponents;

    // Filter by preferences
    if (options.preferredCharacters && options.preferredCharacters.length > 0) {
      availableOpponents = availableOpponents.filter(opp => 
        options.preferredCharacters!.includes(opp.id)
      );
    }

    if (options.difficulty) {
      availableOpponents = availableOpponents.filter(opp => 
        opp.difficulty === options.difficulty
      );
    }

    if (availableOpponents.length === 0) {
      availableOpponents = this.aiOpponents;
    }

    // Weight opponents by ELO proximity AND momentum
    const weightedOpponents = availableOpponents.map(opp => {
      const eloDiff = Math.abs(opp.baseElo - metrics.eloRating);
      const eloWeight = Math.max(0.1, 1 - (eloDiff / 1000));
      
      // Boost weights for hot streaks (challenge harder opponents)
      const momentumBoost = metrics.momentum > 1.2 ? 1.3 : 1.0;
      
      // Reduce weights if cold streak (give easier opponents)
      const coldStreakBoost = metrics.momentum < 0.8 ? 1.2 : 1.0;
      
      const finalWeight = eloWeight * momentumBoost * coldStreakBoost;

      return { opponent: opp, weight: Math.max(0.1, finalWeight) };
    });

    // Weighted random selection
    const totalWeight = weightedOpponents.reduce((sum, item) => sum + item.weight, 0);
    let random = Math.random() * totalWeight;

    for (const item of weightedOpponents) {
      random -= item.weight;
      if (random <= 0) {
        return item.opponent;
      }
    }

    return weightedOpponents[weightedOpponents.length - 1].opponent;
  }

  // Adaptive complexity based on player metrics
  private calculateAdaptiveComplexity(metrics: AdvancedPlayerMetrics, opponent: typeof this.aiOpponents[0]): number {
    const baseComplexity = this.getComplexityForDifficulty(opponent.difficulty);
    
    // Adjust based on momentum: winning streaks = harder complexity
    const momentumAdjustment = (metrics.momentum - 1) * 10; // ±10 points
    
    // Adjust based on volatility: consistent players get higher complexity
    const volatilityAdjustment = (metrics.volatility - 1) * 5;
    
    const adaptiveComplexity = baseComplexity + momentumAdjustment + volatilityAdjustment;
    
    return Math.max(20, Math.min(95, adaptiveComplexity));
  }

  // Adaptive intensity based on player metrics
  private calculateAdaptiveIntensity(metrics: AdvancedPlayerMetrics, opponent: typeof this.aiOpponents[0]): number {
    const baseIntensity = this.getIntensityForDifficulty(opponent.difficulty);
    
    // Increase intensity for high-win-probability battles
    const probabilityAdjustment = metrics.winProbability > 0.6 ? 10 : -5;
    
    // Increase intensity for win streaks
    const streakAdjustment = metrics.winStreak * 2;
    
    const adaptiveIntensity = baseIntensity + probabilityAdjustment + streakAdjustment;
    
    return Math.max(20, Math.min(95, adaptiveIntensity));
  }

  private getComplexityForDifficulty(difficulty: string): number {
    const complexityMap: Record<string, number> = {
      'easy': 30,
      'normal': 50,
      'hard': 70,
      'nightmare': 90,
    };
    return complexityMap[difficulty] || 50;
  }

  private getIntensityForDifficulty(difficulty: string): number {
    const intensityMap: Record<string, number> = {
      'easy': 30,
      'normal': 50,
      'hard': 75,
      'nightmare': 95,
    };
    return intensityMap[difficulty] || 50;
  }

  private selectRandomOpponent(options: MatchmakingOptions, userSkillLevel: number): typeof this.aiOpponents[0] {
    // Filter opponents by preferred characters if specified
    let availableOpponents = this.aiOpponents;
    
    if (options.preferredCharacters && options.preferredCharacters.length > 0) {
      availableOpponents = this.aiOpponents.filter(opp => 
        options.preferredCharacters!.includes(opp.id)
      );
    }

    // If user has a difficulty preference, filter by that
    if (options.difficulty) {
      availableOpponents = availableOpponents.filter(opp => 
        opp.difficulty === options.difficulty
      );
    }

    // If no opponents match filters, use all opponents
    if (availableOpponents.length === 0) {
      availableOpponents = this.aiOpponents;
    }

    // Skill-based matchmaking: prefer opponents close to user skill level
    const skillWeightedOpponents = availableOpponents.map(opp => {
      const oppSkill = this.getDifficultySkillLevel(opp.difficulty);
      const skillDiff = Math.abs(oppSkill - userSkillLevel);
      const weight = Math.max(0.1, 1 - (skillDiff / 10)); // Higher weight for closer skill
      return { opponent: opp, weight };
    });

    // Weighted random selection
    const totalWeight = skillWeightedOpponents.reduce((sum, item) => sum + item.weight, 0);
    let random = Math.random() * totalWeight;
    
    for (const item of skillWeightedOpponents) {
      random -= item.weight;
      if (random <= 0) {
        return item.opponent;
      }
    }

    // Fallback to last opponent
    return skillWeightedOpponents[skillWeightedOpponents.length - 1].opponent;
  }

  private getDifficultySkillLevel(difficulty: string): number {
    const difficultyMap: Record<string, number> = {
      'easy': 2,
      'normal': 5,
      'hard': 7,
      'nightmare': 10,
    };
    return difficultyMap[difficulty] || 5;
  }

  private calculateComplexity(difficulty: string): number {
    const complexityMap: Record<string, number> = {
      'easy': 30,
      'normal': 50,
      'hard': 70,
      'nightmare': 90,
    };
    return complexityMap[difficulty] || 50;
  }

  private calculateIntensity(difficulty: string): number {
    const intensityMap: Record<string, number> = {
      'easy': 30,
      'normal': 50,
      'hard': 75,
      'nightmare': 95,
    };
    return intensityMap[difficulty] || 50;
  }

  // Queue a user for matchmaking (for future PvP features)
  async queueForMatch(options: MatchmakingOptions): Promise<void> {
    console.log(`📥 Adding user ${options.userId} to matchmaking queue...`);
    
    this.matchQueue.set(options.userId, {
      userId: options.userId,
      timestamp: Date.now(),
      options,
    });

    console.log(`✅ User queued. Queue size: ${this.matchQueue.size}`);
  }

  // Check if a match is available - REAL PVP SUPPORT
  async checkForMatch(userId: string): Promise<RandomMatch | null> {
    const userEntry = this.matchQueue.get(userId);
    if (!userEntry) {
      return null;
    }

    // Look for another real player in queue
    for (const [otherId, otherEntry] of this.matchQueue.entries()) {
      if (otherId !== userId) {
        // Found a real player match!
        console.log(`🎮 PVP MATCH FOUND: ${userId} vs ${otherId}`);
        
        // Remove both players from queue
        this.matchQueue.delete(userId);
        this.matchQueue.delete(otherId);
        
        // Get opponent's user data
        const opponentUser = await storage.getUser(otherId);
        if (!opponentUser) {
          console.error('Opponent user not found, falling back to AI');
          return this.findRandomMatch(userEntry.options);
        }
        
        // Calculate opponent's skill level for match difficulty
        const opponentStats = await storage.getUserStats(otherId);
        const opponentSkillLevel = this.calculateSkillLevel(opponentStats);
        
        // Return real player as opponent
        const match: RandomMatch = {
          opponentId: otherId,
          opponentName: opponentUser.firstName || 'Anonymous Player',
          opponentCharacterId: 'pvp_player', // Special ID for real players
          difficulty: this.skillLevelToDifficulty(opponentSkillLevel),
          lyricComplexity: Math.min(90, 50 + (opponentSkillLevel * 4)),
          styleIntensity: Math.min(95, 50 + (opponentSkillLevel * 4.5)),
        };
        
        console.log(`✅ Real PVP match created: ${match.opponentName} (skill ${opponentSkillLevel})`);
        return match;
      }
    }

    return null;
  }
  
  // Convert skill level (1-10) to difficulty label
  private skillLevelToDifficulty(skillLevel: number): string {
    if (skillLevel <= 3) return 'easy';
    if (skillLevel <= 6) return 'normal';
    if (skillLevel <= 8) return 'hard';
    return 'nightmare';
  }

  // Cancel matchmaking
  cancelMatchmaking(userId: string): void {
    this.matchQueue.delete(userId);
    console.log(`❌ User ${userId} cancelled matchmaking`);
  }
}

export const matchmakingService = new MatchmakingService();
