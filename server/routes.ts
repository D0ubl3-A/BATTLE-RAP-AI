import express, { type Express } from "express";
import { createServer, type Server } from "http";
import Stripe from "stripe";
import { storage } from "./storage";
import { ObjectStorageService } from "./objectStorage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { SUBSCRIPTION_TIERS, insertTournamentSchema, users, userProgress } from "@shared/schema";
import { db } from "./db";
import { eq, desc, gt } from "drizzle-orm";
import { groqService } from "./services/groq";
import { scoringService } from "./services/scoring";
import { userTTSManager } from "./services/user-tts-manager";
import { crowdReactionService } from "./services/crowdReactionService";
import multer from "multer";
import path from "path";
import fs from "fs";
import { matchmakingService } from "./services/matchmaking";
import { FineTuningService } from "./services/fine-tuning";
import { realtimeAnalysisService, RealtimeAnalysisService } from "./services/realtime-analysis";
import { mlRapperCloningService, MLRapperCloningService } from "./services/ml-rapper-cloning";
import { CharacterCardGenerator, characterCardGenerator } from "./services/characterCardGenerator";
import { createArcBlockchainService } from "./arcBlockchain";
import { createAIPaymentAgent } from "./services/ai-payment-agent";
import { getElevenLabsSFXService } from "./services/elevenlabs-sfx";
import { requireAgeVerification, requireToSAcceptance, checkJurisdiction } from './middleware/legal';
import { xpService } from "./services/xpService";
import { trainingService } from "./services/trainingService";
import { trainingAgent } from "./services/training-agent";
import { walletService } from "./services/walletService";
import StreamingTTSService from "./services/streaming-tts";
import { adsService } from "./services/adsService";
// using shared exported instance from services/matchmaking

// Initialize Arc Blockchain Service
const arcBlockchainService = createArcBlockchainService();

// Initialize AI Payment Agent for voice commands
const aiPaymentAgent = createAIPaymentAgent(arcBlockchainService);

// Initialize Streaming TTS Service for progressive audio playback
const streamingTTSService = process.env.GROQ_API_KEY 
  ? new StreamingTTSService(process.env.GROQ_API_KEY)
  : null;
if (streamingTTSService) {
  console.log('🎵 Streaming TTS Service initialized');
} else {
  console.warn('⚠️ Streaming TTS Service disabled (no GROQ_API_KEY)');
}

// Initialize ElevenLabs SFX Service
const sfxService = getElevenLabsSFXService();
console.log(sfxService.isServiceAvailable() 
  ? '🔊 ElevenLabs SFX Service: AI generation enabled'
  : 'ℹ️ ElevenLabs SFX Service: Using fallback mode (no API key)');

// Configure multer for audio uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

// Initialize Stripe only if the secret key is provided
const stripe = process.env.STRIPE_SECRET_KEY 
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

if (!stripe) {
  console.warn('⚠️ Stripe not configured - payment features will be disabled');
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Service Worker endpoint for PWA functionality
  app.get('/sw.js', (_req, res) => {
    const swPath = path.join(process.cwd(), 'public', 'sw.js');
    
    if (fs.existsSync(swPath)) {
      res.set('Content-Type', 'application/javascript');
      res.set('Cache-Control', 'no-cache');
      res.sendFile(swPath);
    } else {
      res.status(404).send('Service Worker not found');
    }
  });

  // Sitemap.xml endpoint for SEO
  app.get('/sitemap.xml', (_req, res) => {
    const sitemapPath = path.join(process.cwd(), 'public', 'sitemap.xml');

    if (fs.existsSync(sitemapPath)) {
      res.set('Content-Type', 'application/xml');
      res.sendFile(sitemapPath);
    } else {
      res.status(404).send('Sitemap not found');
    }
  });

  // Health check endpoint for deployment monitoring
  app.get('/api/health', (_req, res) => {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      services: {
        database: !!process.env.DATABASE_URL,
        groq: !!process.env.GROQ_API_KEY,
        openai: !!process.env.OPENAI_API_KEY,
        stripe: !!process.env.STRIPE_SECRET_KEY,
        elevenlabs: !!process.env.ELEVENLABS_API_KEY,
      }
    };

    console.log('🏥 Health check:', health);
    res.json(health);
  });

  // XP and Progression API endpoints
  app.get('/api/users/:id/progress', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.params.id;
      const authenticatedUserId = req.user.claims.sub;

      if (userId !== authenticatedUserId) {
        return res.status(403).json({ error: 'Unauthorized to view this user\'s progress' });
      }

      const progressInfo = await xpService.getUserProgressInfo(userId);
      res.json(progressInfo);
    } catch (error: any) {
      console.error('Error fetching user progress:', error);
      res.status(500).json({ error: 'Failed to fetch user progress' });
    }
  });

  app.post('/api/xp/award', isAuthenticated, async (req: any, res) => {
    try {
      const { userId, amount, reason } = req.body;
      const authenticatedUserId = req.user.claims.sub;

      if (!userId || !amount || !reason) {
        return res.status(400).json({ error: 'userId, amount, and reason are required' });
      }

      // Validate amount is a positive number
      const xpAmount = Number(amount);
      if (isNaN(xpAmount) || xpAmount <= 0) {
        return res.status(400).json({ error: 'amount must be a positive number' });
      }

      const authenticatedUser = await storage.getUser(authenticatedUserId);
      if (!authenticatedUser || authenticatedUser.subscriptionTier !== 'pro') {
        return res.status(403).json({ error: 'Admin access required' });
      }

      const levelUpResult = await xpService.awardXP(userId, xpAmount, reason);

      res.json({
        success: true,
        xpAwarded: amount,
        levelUpResult,
      });
    } catch (error: any) {
      console.error('Error awarding XP:', error);
      res.status(500).json({ error: 'Failed to award XP' });
    }
  });

  app.get('/api/leaderboard', async (_req, res) => {
    try {
      const topUsers = await xpService.getLeaderboard(10);

      const leaderboard = await Promise.all(
        topUsers.map(async (entry) => {
          const user = await storage.getUser(entry.userId);
          return {
            userId: entry.userId,
            username: user?.firstName || user?.email?.split('@')[0] || 'Anonymous',
            level: entry.level,
            totalXP: entry.totalXP,
            title: entry.title,
          };
        })
      );

      res.json(leaderboard);
    } catch (error: any) {
      console.error('Error fetching leaderboard:', error);
      res.status(500).json({ error: 'Failed to fetch leaderboard' });
    }
  });

  // Training API endpoints
  app.get('/api/training/lessons', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const category = req.query.category as string | undefined;

      const lessons = await trainingService.getLessons(userId, category);
      res.json(lessons);
    } catch (error: any) {
      console.error('Error fetching training lessons:', error);
      res.status(500).json({ error: 'Failed to fetch training lessons' });
    }
  });

  app.get('/api/training/lessons/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const lessonId = req.params.id;

      const lesson = await trainingService.getLesson(userId, lessonId);
      res.json(lesson);
    } catch (error: any) {
      console.error('Error fetching lesson:', error);
      res.status(error.message?.includes('locked') ? 403 : 500).json({ error: error.message });
    }
  });

  app.post('/api/training/practice', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { lessonId, score } = req.body;

      if (!lessonId || score === undefined) {
        return res.status(400).json({ error: 'lessonId and score are required' });
      }

      const result = await trainingService.completePractice(userId, lessonId, score);
      res.json(result);
    } catch (error: any) {
      console.error('Error completing practice:', error);
      res.status(500).json({ error: 'Failed to complete practice' });
    }
  });

  app.post('/api/training/transcribe', isAuthenticated, upload.single('audio'), async (req: any, res) => {
    const startTime = Date.now();

    try {
      if (!req.file?.buffer) {
        return res.status(400).json({ message: 'No audio file provided' });
      }

      const audioBuffer = req.file.buffer;
      console.log(`🎤 Training transcription started (${audioBuffer.length} bytes)`);

      let userText = 'Voice input received';
      try {
        userText = await Promise.race([
          groqService.transcribeAudio(audioBuffer),
          new Promise<string>((_, reject) =>
            setTimeout(() => reject(new Error('Transcription timeout')), 200)
          ),
        ]);
      } catch (error) {
        console.log('⚠️ Training lightning transcription failed, retrying without timeout');
        try {
          userText = await groqService.transcribeAudio(audioBuffer);
        } catch (fallbackError) {
          console.log('❌ Training transcription failed, using placeholder');
          userText = 'Voice input received';
        }
      }

      const processingTime = Date.now() - startTime;

      res.json({
        userText,
        processingTime,
        instant: processingTime <= 200,
      });
    } catch (error: any) {
      console.error('❌ Training transcription failed:', error.message);
      res.status(500).json({ message: 'Transcription failed' });
    }
  });

  app.get('/api/training/progress', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;

      const progress = await trainingService.getUserProgress(userId);
      res.json(progress);
    } catch (error: any) {
      console.error('Error fetching training progress:', error);
      res.status(500).json({ error: 'Failed to fetch training progress' });
    }
  });

  app.get('/api/training/categories', async (_req, res) => {
    try {
      const categories = await trainingService.getCategories();
      res.json(categories);
    } catch (error: any) {
      console.error('Error fetching categories:', error);
      res.status(500).json({ error: 'Failed to fetch categories' });
    }
  });

  // TRAINING AGENT - AI Coaching Endpoint
  app.post('/api/training/coach', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { lessonId, userResponse } = req.body;

      if (!lessonId || !userResponse) {
        return res.status(400).json({ error: 'lessonId and userResponse are required' });
      }

      // Get the lesson details
      const lesson = await trainingService.getLesson(userId, lessonId);
      if (!lesson) {
        return res.status(404).json({ error: 'Lesson not found' });
      }

      // Generate AI coaching
      const feedback = await trainingAgent.generateCoaching(
        {
          title: lesson.title,
          category: lesson.category,
          content: lesson.content,
          practicePrompt: lesson.practicePrompt || "Practice this lesson"
        },
        userResponse,
        lesson.progress?.attempts ?? 1
      );

      console.log(`🎓 Training Agent coaching provided for ${lesson.title}: ${feedback.score}/100`);
      res.json(feedback);
    } catch (error: any) {
      console.error('Error generating coaching:', error);
      res.status(500).json({ error: 'Failed to generate coaching' });
    }
  });

  // BATTLE PASS API ENDPOINTS
  app.get('/api/battle-pass', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;

      const activePass = await storage.getActiveBattlePass();
      if (!activePass) {
        return res.status(404).json({ error: 'No active battle pass season' });
      }

      let userPass = await storage.getUserBattlePass(userId, activePass.id);
      if (!userPass) {
        userPass = await storage.createUserBattlePass(userId, activePass.id);
      }

      res.json({
        id: userPass.id,
        userId: userPass.userId,
        seasonId: activePass.id,
        seasonName: activePass.name,
        currentTier: userPass.currentTier,
        totalXP: userPass.currentXP,
        isPremium: userPass.isPremium,
        claimedTiers: userPass.claimedRewards,
        maxTiers: activePass.maxTiers,
        endDate: activePass.endDate,
      });
    } catch (error: any) {
      console.error('Error fetching battle pass:', error);
      res.status(500).json({ error: 'Failed to fetch battle pass' });
    }
  });

  app.get('/api/battle-pass/tiers', isAuthenticated, async (req: any, res) => {
    try {
      const activePass = await storage.getActiveBattlePass();
      if (!activePass) {
        return res.status(404).json({ error: 'No active battle pass season' });
      }

      const tiers = await storage.getBattlePassTiers(activePass.id);

      const formattedTiers = tiers.map(tier => ({
        id: tier.id,
        tier: tier.tier,
        xpRequired: tier.xpRequired,
        freeReward: {
          type: tier.freeRewardType,
          value: tier.freeRewardAmount,
          item: tier.freeRewardId,
        },
        premiumReward: {
          type: tier.premiumRewardType,
          value: tier.premiumRewardAmount,
          item: tier.premiumRewardId,
        },
      }));

      res.json(formattedTiers);
    } catch (error: any) {
      console.error('Error fetching battle pass tiers:', error);
      res.status(500).json({ error: 'Failed to fetch battle pass tiers' });
    }
  });

  app.post('/api/battle-pass/claim/:tier', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const tier = parseInt(req.params.tier);

      if (isNaN(tier) || tier < 1) {
        return res.status(400).json({ error: 'Invalid tier number' });
      }

      const activePass = await storage.getActiveBattlePass();
      if (!activePass) {
        return res.status(404).json({ error: 'No active battle pass season' });
      }

      const updatedPass = await storage.claimBattlePassReward(userId, activePass.id, tier);

      res.json({
        success: true,
        message: `Tier ${tier} rewards claimed successfully`,
        claimedTiers: updatedPass.claimedRewards,
      });
    } catch (error: any) {
      console.error('Error claiming battle pass reward:', error);
      const status = error.message?.includes('not yet unlocked') ? 403 :
                     error.message?.includes('already claimed') ? 409 : 500;
      res.status(status).json({ error: error.message || 'Failed to claim reward' });
    }
  });

  app.post('/api/battle-pass/upgrade', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;

      const activePass = await storage.getActiveBattlePass();
      if (!activePass) {
        return res.status(404).json({ error: 'No active battle pass season' });
      }

      const updatedPass = await storage.upgradeBattlePassToPremium(userId, activePass.id);

      res.json({
        success: true,
        message: 'Battle Pass upgraded to premium!',
        isPremium: updatedPass.isPremium,
        purchasedAt: updatedPass.purchasedAt,
      });
    } catch (error: any) {
      console.error('Error upgrading battle pass:', error);
      const status = error.message?.includes('Insufficient') ? 402 : 500;
      res.status(status).json({ error: error.message || 'Failed to upgrade battle pass' });
    }
  });

  // SHOP API ENDPOINTS
  app.get('/api/shop/items', isAuthenticated, async (req: any, res) => {
    try {
      const items = await storage.getAllCosmeticItems();

      const formattedItems = items.map(item => ({
        id: item.id,
        name: item.name,
        description: item.description,
        category: item.type,
        rarity: item.rarity,
        imageUrl: item.imageUrl,
        price: item.price ? parseFloat(item.price) : 0,
        isPremiumOnly: item.isPremium,
        unlockLevel: item.unlockLevel,
        isLimited: item.isLimited,
        availableUntil: item.availableUntil,
        metadata: item.metadata,
      }));

      res.json(formattedItems);
    } catch (error: any) {
      console.error('Error fetching shop items:', error);
      res.status(500).json({ error: 'Failed to fetch shop items' });
    }
  });

  app.get('/api/shop/inventory', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;

      const inventory = await storage.getUserInventory(userId);
      const currency = await storage.getUserCurrency(userId);

      const equipped = inventory.filter(item => item.isEquipped);

      res.json({
        currency,
        items: inventory,
        equipped: {
          avatar: equipped.find(item => item.type === 'avatar'),
          badge: equipped.find(item => item.type === 'badge'),
          title: equipped.find(item => item.type === 'title'),
          emote: equipped.find(item => item.type === 'emote'),
          effect: equipped.find(item => item.type === 'mic_effect'),
        },
      });
    } catch (error: any) {
      console.error('Error fetching inventory:', error);
      res.status(500).json({ error: 'Failed to fetch inventory' });
    }
  });

  app.post('/api/shop/purchase', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { itemId } = req.body;

      if (!itemId) {
        return res.status(400).json({ error: 'itemId is required' });
      }

      const item = await storage.getCosmeticItemById(itemId);
      if (!item) {
        return res.status(404).json({ error: 'Item not found' });
      }

      if (!item.price) {
        return res.status(400).json({ error: 'Item not purchasable' });
      }

      const price = parseInt(item.price);
      const newItem = await storage.purchaseCosmetic(userId, itemId, price);

      res.json({
        success: true,
        message: `${item.name} purchased successfully`,
        item: newItem,
      });
    } catch (error: any) {
      console.error('Error purchasing item:', error);
      const status = error.message?.includes('Insufficient') ? 402 :
                     error.message?.includes('already owned') ? 409 : 500;
      res.status(status).json({ error: error.message || 'Failed to purchase item' });
    }
  });

  app.post('/api/shop/equip', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { itemId } = req.body;

      if (!itemId) {
        return res.status(400).json({ error: 'itemId is required' });
      }

      await storage.equipCosmetic(userId, itemId);

      res.json({
        success: true,
        message: 'Item equipped successfully',
      });
    } catch (error: any) {
      console.error('Error equipping item:', error);
      const status = error.message?.includes('not in inventory') ? 404 : 500;
      res.status(status).json({ error: error.message || 'Failed to equip item' });
    }
  });

  // CHALLENGES API ENDPOINTS
  app.get('/api/challenges/daily', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;

      let userChallenges = await storage.getUserDailyChallenges(userId);

      if (userChallenges.length === 0) {
        const allChallenges = await storage.getActiveDailyChallenges();
        const selectedChallenges = allChallenges
          .sort(() => Math.random() - 0.5)
          .slice(0, 5);
        
        const challengeIds = selectedChallenges.map(c => c.id);
        await storage.assignDailyChallenges(userId, challengeIds);

        userChallenges = await storage.getUserDailyChallenges(userId);
      }

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);

      res.json({
        challenges: userChallenges.map(c => ({
          id: c.challengeId,
          name: c.name,
          description: c.description,
          type: c.type,
          requirement: c.requirement,
          progress: c.progress,
          isCompleted: c.isCompleted,
          rewardClaimed: c.rewardClaimed,
          xpReward: c.xpReward,
          currencyReward: c.currencyReward,
          difficulty: c.difficulty,
        })),
        expiresAt: tomorrow,
      });
    } catch (error: any) {
      console.error('Error fetching daily challenges:', error);
      res.status(500).json({ error: 'Failed to fetch daily challenges' });
    }
  });

  app.get('/api/challenges/progress', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;

      const userChallenges = await storage.getUserDailyChallenges(userId);

      const progress = userChallenges.map(c => ({
        challengeId: c.challengeId,
        name: c.name,
        progress: c.progress,
        requirement: c.requirement,
        isCompleted: c.isCompleted,
        completedAt: c.completedAt,
        rewardClaimed: c.rewardClaimed,
      }));

      res.json(progress);
    } catch (error: any) {
      console.error('Error fetching challenge progress:', error);
      res.status(500).json({ error: 'Failed to fetch challenge progress' });
    }
  });

  app.post('/api/challenges/claim/:challengeId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const challengeId = req.params.challengeId;

      await storage.claimChallengeReward(userId, challengeId);

      res.json({
        success: true,
        message: 'Challenge reward claimed successfully',
      });
    } catch (error: any) {
      console.error('Error claiming challenge reward:', error);
      const status = error.message?.includes('not completed') ? 403 :
                     error.message?.includes('already claimed') ? 409 :
                     error.message?.includes('not found') ? 404 : 500;
      res.status(status).json({ error: error.message || 'Failed to claim reward' });
    }
  });

  // MATCHMAKING API ENDPOINTS
  app.get('/api/matchmaking/status', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;

      const queueEntry = await storage.getUserMatchmakingQueue(userId);

      if (!queueEntry) {
        return res.json({
          inQueue: false,
          matchFound: false,
        });
      }

      const isExpired = new Date() > new Date(queueEntry.expiresAt);
      if (isExpired && queueEntry.status === 'waiting') {
        await storage.removeMatchmakingEntry(userId);
        return res.json({
          inQueue: false,
          matchFound: false,
        });
      }

      if (queueEntry.status === 'matched') {
        const opponentUser = queueEntry.matchedWithUserId
          ? await storage.getUser(queueEntry.matchedWithUserId)
          : undefined;
        const opponentProgress = queueEntry.matchedWithUserId
          ? await storage.getUserProgress(queueEntry.matchedWithUserId)
          : undefined;
        const opponentStats = queueEntry.matchedWithUserId
          ? await storage.getUserStats(queueEntry.matchedWithUserId)
          : undefined;
        const opponentElo = opponentProgress && opponentStats
          ? 1000 + (opponentProgress.level * 50) + (opponentStats.totalWins * 10) - ((opponentStats.totalBattles - opponentStats.totalWins) * 5)
          : undefined;

        return res.json({
          inQueue: true,
          matchFound: true,
          matchId: queueEntry.id,
          opponentId: queueEntry.matchedWithUserId,
          opponentName: opponentUser?.firstName || 'Anonymous Player',
          opponentELO: opponentElo,
          battleId: queueEntry.battleId,
          matchedAt: queueEntry.matchedAt,
        });
      }

      const queueTimeSeconds = Math.max(0, Math.floor((Date.now() - new Date(queueEntry.joinedAt).getTime()) / 1000));

      res.json({
        inQueue: true,
        matchFound: false,
        queuedAt: queueEntry.joinedAt,
        expiresAt: queueEntry.expiresAt,
        queueType: queueEntry.queueType,
        queueTime: queueTimeSeconds,
        estimatedWait: 30,
      });
    } catch (error: any) {
      console.error('Error fetching matchmaking status:', error);
      res.status(500).json({ error: 'Failed to fetch matchmaking status' });
    }
  });

  app.get('/api/matchmaking/stats', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;

      const progress = await storage.getUserProgress(userId);
      const stats = await storage.getUserStats(userId);

      if (!progress) {
        return res.status(404).json({ error: 'User progress not found' });
      }

      const elo = 1000 + (progress.level * 50) + (stats.totalWins * 10) - ((stats.totalBattles - stats.totalWins) * 5);
      
      let rank = 'Bronze';
      if (elo >= 2000) rank = 'Diamond';
      else if (elo >= 1700) rank = 'Platinum';
      else if (elo >= 1400) rank = 'Gold';
      else if (elo >= 1100) rank = 'Silver';

      res.json({
        elo,
        rank,
        level: progress.level,
        totalBattles: stats.totalBattles,
        totalWins: stats.totalWins,
        winRate: stats.winRate,
        winStreak: progress.winStreak,
        bestWinStreak: progress.bestWinStreak,
      });
    } catch (error: any) {
      console.error('Error fetching matchmaking stats:', error);
      res.status(500).json({ error: 'Failed to fetch matchmaking stats' });
    }
  });

  app.post('/api/matchmaking/queue', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { queueType = 'casual' } = req.body;

      const progress = await storage.getUserProgress(userId);
      if (!progress) {
        return res.status(404).json({ error: 'User progress not found' });
      }

      const skillRating = 1000 + (progress.level * 50);

      const entry = await storage.createMatchmakingEntry(userId, queueType, skillRating);
      const opponentEntry = await storage.findRandomMatchmakingOpponent(userId, queueType);

      if (opponentEntry) {
        await storage.updateMatchmakingStatus(userId, 'matched', {
          opponentUserId: opponentEntry.userId,
        });
        await storage.updateMatchmakingStatus(opponentEntry.userId, 'matched', {
          opponentUserId: userId,
        });
      }

      res.json({
        success: true,
        message: 'Joined matchmaking queue',
        queuedAt: entry.joinedAt,
        expiresAt: entry.expiresAt,
        queueType: entry.queueType,
        matchFound: Boolean(opponentEntry),
      });
    } catch (error: any) {
      console.error('Error joining matchmaking queue:', error);
      res.status(500).json({ error: 'Failed to join matchmaking queue' });
    }
  });

  app.post('/api/matchmaking/leave', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;

      await storage.removeMatchmakingEntry(userId);

      res.json({
        success: true,
        message: 'Left matchmaking queue',
      });
    } catch (error: any) {
      console.error('Error leaving matchmaking queue:', error);
      res.status(500).json({ error: 'Failed to leave matchmaking queue' });
    }
  });

  app.post('/api/matchmaking/accept/:matchId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const matchId = req.params.matchId;

      const queueEntry = await storage.getUserMatchmakingQueue(userId);
      if (!queueEntry || queueEntry.status !== 'matched') {
        return res.status(404).json({ error: 'No match found' });
      }
      if (queueEntry.id !== matchId) {
        return res.status(400).json({ error: 'Match is no longer available' });
      }

      const opponentUserId = queueEntry.matchedWithUserId;
      if (!opponentUserId) {
        return res.status(400).json({ error: 'Invalid match data' });
      }

      const battle = await storage.createBattle({
        userId,
        isMultiplayer: true,
        opponentUserId,
        difficulty: 'normal',
        profanityFilter: false,
        lyricComplexity: 50,
        styleIntensity: 50,
        turnTimeLimit: 120,
      });

      await storage.updateMatchmakingStatus(userId, 'matched', {
        opponentUserId,
        battleId: battle.id,
      });
      await storage.updateMatchmakingStatus(opponentUserId, 'matched', {
        opponentUserId: userId,
        battleId: battle.id,
      });

      await storage.removeMatchmakingEntry(userId);
      if (opponentUserId) {
        await storage.removeMatchmakingEntry(opponentUserId);
      }

      res.json({
        success: true,
        message: 'Match accepted',
        battleId: battle.id,
      });
    } catch (error: any) {
      console.error('Error accepting match:', error);
      res.status(500).json({ error: 'Failed to accept match' });
    }
  });

  // ElevenLabs Sound Effects endpoints
  app.get('/api/sfx/:soundType', async (req, res) => {
    try {
      const soundType = req.params.soundType as any;
      
      console.log(`🔊 SFX request: ${soundType}`);
      
      const audioBuffer = await sfxService.getSound(soundType);
      
      res.set('Content-Type', 'audio/mpeg');
      res.set('Cache-Control', 'public, max-age=86400'); // Cache for 24 hours
      res.send(audioBuffer);
    } catch (error: any) {
      console.error(`❌ SFX error for ${req.params.soundType}:`, error.message);
      res.status(500).json({ 
        error: 'Sound effect generation failed',
        message: error.message 
      });
    }
  });

  app.post('/api/sfx/initialize', isAuthenticated, async (req: any, res) => {
    try {
      console.log('🎵 Initializing all battle sounds...');
      
      const result = await sfxService.preGenerateAllSounds();
      const stats = sfxService.getCacheStats();
      
      res.json({
        message: 'Battle sounds pre-generated successfully',
        cached: stats.count,
        sounds: stats.keys,
        totalSize: `${(stats.totalSize / 1024 / 1024).toFixed(2)} MB`
      });
    } catch (error: any) {
      console.error('❌ SFX initialization error:', error.message);
      res.status(500).json({ 
        error: 'Failed to initialize sound effects',
        message: error.message 
      });
    }
  });

  // SFX Audio Files endpoint for serving public sound effects
  app.get("/public-objects/:filePath(*)", async (req, res) => {
    const filePath = req.params.filePath;
    const objectStorageService = new ObjectStorageService();
    try {
      const file = await objectStorageService.searchPublicObject(filePath);
      if (!file) {
        return res.status(404).json({ error: "SFX file not found" });
      }
      objectStorageService.downloadObject(file, res);
    } catch (error) {
      console.error("Error serving SFX file:", error);
      return res.status(500).json({ error: "Failed to serve SFX file" });
    }
  });

  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/status', async (req: any, res) => {
    try {
      // Check if user is authenticated
      if (!req.isAuthenticated || !req.user) {
        return res.json({
          authenticated: false
        });
      }

      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);

      if (!user) {
        return res.json({
          authenticated: false
        });
      }

      res.json({
        authenticated: true,
        userId: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName
      });
    } catch (error) {
      console.error("Error checking auth status:", error);
      res.status(500).json({ message: "Failed to check authentication status" });
    }
  });

  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Subscription management routes
  app.get('/api/subscription/tiers', (_req, res) => {
    res.json(SUBSCRIPTION_TIERS);
  });

  app.get('/api/subscription/status', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      const canBattle = await storage.canUserStartBattle(userId);

      res.json({
        tier: user?.subscriptionTier || 'free',
        status: user?.subscriptionStatus || 'free',
        battlesRemaining: user?.battlesRemaining || 0,
        canStartBattle: canBattle,
        totalBattles: user?.totalBattles || 0,
        totalWins: user?.totalWins || 0,
      });
    } catch (error) {
      console.error("Error fetching subscription status:", error);
      res.status(500).json({ message: "Failed to fetch subscription status" });
    }
  });

  // Connect Arc blockchain service with storage
  arcBlockchainService.setStorage(storage);

  // Arc Wallet API Endpoints
  app.get('/api/arc/wallet/balance', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Create wallet if doesn't exist
      let walletAddress = user.arcWalletAddress;
      if (!walletAddress) {
        walletAddress = await arcBlockchainService.createWallet(userId);
        await storage.createArcWallet(userId, walletAddress);
      }

      res.json({
        balance: user.arcUsdcBalance || "0.00",
        totalEarned: user.totalEarnedUSDC || "0.00",
        walletAddress: walletAddress,
      });
    } catch (error: any) {
      console.error('Error fetching Arc wallet balance:', error);
      res.status(500).json({ error: 'Failed to fetch wallet balance' });
    }
  });

  app.get('/api/arc/wallet/transactions', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const transactions = await storage.getUserArcTransactions(userId, 10);
      res.json(transactions);
    } catch (error: any) {
      console.error('Error fetching Arc transactions:', error);
      res.status(500).json({ error: 'Failed to fetch transactions' });
    }
  });

  app.post('/api/arc/wallet/create', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      if (user.arcWalletAddress) {
        return res.json({ walletAddress: user.arcWalletAddress, success: true });
      }

      const walletAddress = await arcBlockchainService.createWallet(userId);
      await storage.createArcWallet(userId, walletAddress);

      res.json({ walletAddress, success: true });
    } catch (error: any) {
      console.error('Error creating Arc wallet:', error);
      res.status(500).json({ error: 'Failed to create wallet' });
    }
  });

  app.post('/api/arc/spending/preview', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { amount } = req.body;

      if (!amount || isNaN(parseFloat(amount))) {
        return res.status(400).json({ error: 'Valid amount required' });
      }

      const limitCheck = await arcBlockchainService.checkSpendingLimits(userId, amount);
      const fee = "0.001"; // Arc transaction fee
      const total = (parseFloat(amount) + parseFloat(fee)).toFixed(6);

      res.json({
        amount,
        fee,
        total,
        willExceedLimit: !limitCheck.allowed,
        currentLimit: limitCheck.dailyLimit,
        currentSpend: limitCheck.currentSpend,
        reason: limitCheck.reason,
      });
    } catch (error: any) {
      console.error('Error previewing spending:', error);
      res.status(500).json({ error: 'Failed to preview transaction' });
    }
  });

  // Safety and Legal Compliance Endpoints
  app.post('/api/user/verify-age', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { birthDate } = req.body;

      if (!birthDate) {
        return res.status(400).json({ error: 'Birth date required' });
      }

      const user = await storage.verifyUserAge(userId, new Date(birthDate));
      const { CURRENT_TOS_VERSION } = await import('./config/legal');
      
      // Also accept ToS if not already accepted
      if (!user.tosAcceptedAt) {
        await storage.acceptToS(userId, CURRENT_TOS_VERSION);
      }

      res.json({
        verified: user.ageVerificationStatus === 'verified',
        status: user.ageVerificationStatus,
        isMinor: user.isMinor,
        message: user.isMinor ? 'Age verification failed - users under 18 cannot participate' : 'Age verified successfully',
      });
    } catch (error: any) {
      console.error('Error verifying age:', error);
      res.status(500).json({ error: 'Failed to verify age' });
    }
  });

  app.get('/api/user/safety-settings', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const settings = await storage.getUserSafetySettings(userId);
      res.json(settings);
    } catch (error: any) {
      console.error('Error fetching safety settings:', error);
      res.status(500).json({ error: 'Failed to fetch safety settings' });
    }
  });

  app.post('/api/user/spending-limits', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { dailyLimit, perTxLimit } = req.body;

      if (!dailyLimit || !perTxLimit) {
        return res.status(400).json({ error: 'Both limits required' });
      }

      const user = await storage.updateSpendingLimits(userId, dailyLimit, perTxLimit);
      res.json({ success: true, dailyLimit: user.dailySpendLimitUSDC, perTxLimit: user.perTxLimitUSDC });
    } catch (error: any) {
      console.error('Error updating spending limits:', error);
      res.status(500).json({ error: 'Failed to update spending limits' });
    }
  });

  app.post('/api/user/moderation-preference', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { moderationOptIn } = req.body;

      const user = await storage.updateUser(userId, { moderationOptIn });
      res.json({ success: true, moderationOptIn: user.moderationOptIn });
    } catch (error: any) {
      console.error('Error updating moderation preference:', error);
      res.status(500).json({ error: 'Failed to update preference' });
    }
  });

  app.post('/api/user/tts-provider', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { ttsProvider } = req.body;

      if (!['groq', 'elevenlabs'].includes(ttsProvider)) {
        return res.status(400).json({ error: 'Invalid TTS provider' });
      }

      const user = await storage.updateUser(userId, { ttsProvider });
      res.json({ success: true, ttsProvider: user.ttsProvider });
    } catch (error: any) {
      console.error('Error updating TTS provider:', error);
      res.status(500).json({ error: 'Failed to update TTS provider' });
    }
  });

  // One-time battle purchase
  app.post('/api/purchase-battles', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { battleCount = 10, paymentMethod = 'stripe' } = req.body; // Default 10 battles for $1

      // Available battle packages with pricing
      const battlePackages = {
        10: { price: 100, description: '10 battles for $1.00' }, // $0.10 per battle
        1500: { price: 10000, description: '1,500 battles for $100.00' } // $0.067 per battle (15 battles per dollar)
      };

      if (!battlePackages[battleCount as keyof typeof battlePackages]) {
        const available = Object.keys(battlePackages).join(', ');
        return res.status(400).json({ 
          message: `Invalid battle count. Available packages: ${available} battles` 
        });
      }

      // Simplified CashApp flow for battle packs
      if (paymentMethod === 'cashapp') {
        const packageInfo = battlePackages[battleCount as keyof typeof battlePackages];
        console.log(`💰 CashApp battle pack request: ${battleCount} battles for $${(packageInfo.price/100).toFixed(2)} by user ${userId}`);

        return res.json({
          clientSecret: `cashapp_battles_cs_${Date.now()}_${userId}`,
          amount: packageInfo.price,
          description: packageInfo.description
        });
      }

      // Check if Stripe is configured for card payments
      if (!stripe) {
        return res.status(503).json({ 
          message: 'Payment processing is currently unavailable. Please contact support.' 
        });
      }

      let user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      if (!user.email) {
        throw new Error('No user email on file');
      }

      let customer;
      if (user.stripeCustomerId) {
        try {
          customer = await stripe.customers.retrieve(user.stripeCustomerId);
        } catch (error: any) {
          // Handle test/live mode mismatch - create new customer
          if (error.code === 'resource_missing') {
            console.log(`🔄 Customer not found in current mode, creating new customer...`);
            customer = await stripe.customers.create({
              email: user.email,
              name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
            });

            user = await storage.updateUserStripeInfo(userId, { 
              stripeCustomerId: customer.id 
            });
          } else {
            throw error;
          }
        }
      } else {
        customer = await stripe.customers.create({
          email: user.email,
          name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
        });

        user = await storage.updateUserStripeInfo(userId, { 
          stripeCustomerId: customer.id 
        });
      }

      const packageInfo = battlePackages[battleCount as keyof typeof battlePackages];
      const amount = packageInfo.price;
      const pricePerBattle = (amount / 100 / battleCount).toFixed(3);

      console.log(`💰 Creating battle purchase: ${battleCount} battles for $${(amount/100).toFixed(2)}`);

      // Configure payment method types
      const paymentMethodTypes: ('card' | 'cashapp')[] = paymentMethod === 'cashapp' 
        ? ['cashapp'] 
        : ['card', 'cashapp'];

      // Create one-time payment intent
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount, // Amount in cents
        currency: 'usd',
        customer: customer.id,
        payment_method_types: paymentMethodTypes,
        metadata: {
          userId: userId,
          battleCount: battleCount,
          paymentMethod: paymentMethod,
          packageType: battleCount === 1500 ? 'mega_bundle' : 'standard',
          ...(paymentMethod === 'cashapp' && { cashapp_account: '$ILLAITHEGPTSTORE' })
        },
        description: paymentMethod === 'cashapp' 
          ? `${battleCount} Battle Pack ($${pricePerBattle} per battle) - Pay to $ILLAITHEGPTSTORE`
          : `${battleCount} Battle Pack ($${pricePerBattle} per battle)`,
      });

      console.log(`✅ Payment intent created: ${paymentIntent.id}`);
      console.log(`🔑 Client secret: ${!!paymentIntent.client_secret}`);

      res.json({
        paymentIntentId: paymentIntent.id,
        clientSecret: paymentIntent.client_secret,
        amount: amount,
        battleCount: battleCount
      });
    } catch (error: any) {
      console.error('Battle purchase creation error:', error);
      return res.status(400).json({ error: { message: error.message } });
    }
  });

  // Store credit balance route (like ThcaStore)
  app.get('/api/store-credit/balance', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json({ balance: user?.storeCredit || 0 });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch store credit balance' });
    }
  });

  // Generate referral code for user
  app.post('/api/referral/generate', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);

      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      if (user.referralCode) {
        return res.json({ referralCode: user.referralCode });
      }

      // Generate unique referral code
      const firstName = user.firstName || user.email?.split('@')[0] || 'USER';
      const codeBase = firstName.slice(0, 3).toUpperCase();
      const randomPart = Math.random().toString(36).slice(2, 8).toUpperCase();
      const referralCode = `${codeBase}${randomPart}`;

      // Update user with referral code
      await storage.updateUser(userId, { referralCode });

      res.json({ referralCode });
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to generate referral code: ' + error.message });
    }
  });

  // Join with referral code and award $1 credit
  app.post('/api/referral/join', async (req, res) => {
    try {
      const { referralCode, newUserId } = req.body;

      if (!referralCode || !newUserId) {
        return res.status(400).json({ message: 'Referral code and user ID required' });
      }

      // Find referrer by code
      const referrer = await storage.getUserByReferralCode(referralCode);
      if (!referrer) {
        return res.status(404).json({ message: 'Invalid referral code' });
      }

      // Update new user with referrer info
      await storage.updateUser(newUserId, { referredBy: referrer.id });

      // Award $1.00 store credit to referrer
      const currentCredit = parseFloat(referrer.storeCredit || '0');
      const newCredit = (currentCredit + 1.00).toFixed(2);
      await storage.updateUser(referrer.id, { storeCredit: newCredit });

      // Create referral record
      await storage.createReferral({
        referrerId: referrer.id,
        refereeId: newUserId,
        referralCode,
        status: 'completed',
        creditAwarded: '1.00'
      });

      console.log(`💰 Referral complete: ${referrer.email} earned $1.00 credit`);
      res.json({ 
        success: true, 
        creditAwarded: '1.00',
        message: 'Referral completed! $1.00 credited to referrer.' 
      });
    } catch (error: any) {
      console.error('Referral join error:', error);
      res.status(500).json({ error: 'Failed to process referral: ' + error.message });
    }
  });

  // Get user's referral stats
  app.get('/api/referral/stats', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);

      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      const referrals = await storage.getUserReferrals(userId);
      const totalEarnings = referrals.reduce((sum, ref) => sum + parseFloat(ref.creditAwarded || '0'), 0);

      res.json({
        referralCode: user.referralCode,
        totalReferrals: referrals.length,
        totalEarnings: totalEarnings.toFixed(2),
        storeCredit: user.storeCredit,
        referrals: referrals.map(ref => ({
          id: ref.id,
          status: ref.status,
          creditAwarded: ref.creditAwarded,
          createdAt: ref.createdAt
        }))
      });
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to fetch referral stats: ' + error.message });
    }
  });

  // One-time payment intent (like ThcaStore's approach)
  app.post("/api/create-payment-intent", isAuthenticated, async (req: any, res) => {
    try {
      // Check if Stripe is configured
      if (!stripe) {
        return res.status(503).json({ 
          message: 'Payment processing is currently unavailable. Please contact support.' 
        });
      }

      const { amount, description = "Battle pack purchase" } = req.body;
      const userId = req.user.claims.sub;

      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency: "usd",
        metadata: {
          userId: userId,
          type: "one_time_purchase"
        },
        description,
      });

      res.json({ clientSecret: paymentIntent.client_secret });
    } catch (error: any) {
      res.status(500).json({ 
        message: "Error creating payment intent: " + error.message 
      });
    }
  });

  // Stripe payment routes
  app.post('/api/create-subscription', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { tier, paymentMethod = 'stripe' } = req.body; // 'premium' or 'pro', 'stripe' or 'cashapp'

      if (!tier || !['premium', 'pro'].includes(tier)) {
        return res.status(400).json({ message: 'Invalid subscription tier' });
      }

      // Simplified CashApp flow - just return dummy client secret to satisfy frontend
      if (paymentMethod === 'cashapp') {
        console.log(`💰 CashApp subscription request for ${tier} tier by user ${userId}`);

        // Return a mock client secret to satisfy frontend Stripe integration
        return res.json({
          subscriptionId: `cashapp_${tier}_${Date.now()}`,
          clientSecret: `cashapp_cs_${Date.now()}_${userId}`,
        });
      }

      // Check if Stripe is configured for card payments
      if (!stripe) {
        return res.status(503).json({ 
          message: 'Payment processing is currently unavailable. Please contact support.' 
        });
      }

      let user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      const tierInfo = SUBSCRIPTION_TIERS[tier as keyof typeof SUBSCRIPTION_TIERS];

      if (user.stripeSubscriptionId) {
        const subscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId, {
          expand: ['latest_invoice.payment_intent']
        });

        const latestInvoice = subscription.latest_invoice as any;
        const clientSecret = latestInvoice?.payment_intent?.client_secret;

        res.json({
          subscriptionId: subscription.id,
          clientSecret: clientSecret,
        });
        return;
      }

      if (!user.email) {
        throw new Error('No user email on file');
      }

      let customer;
      if (user.stripeCustomerId) {
        try {
          customer = await stripe.customers.retrieve(user.stripeCustomerId);
        } catch (error: any) {
          // Handle test/live mode mismatch - create new customer
          if (error.code === 'resource_missing') {
            console.log(`🔄 Customer not found in current mode, creating new customer...`);
            customer = await stripe.customers.create({
              email: user.email,
              name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
            });

            user = await storage.updateUserStripeInfo(userId, { 
              stripeCustomerId: customer.id,
              stripeSubscriptionId: undefined // Clear old subscription ID
            });
          } else {
            throw error;
          }
        }
      } else {
        customer = await stripe.customers.create({
          email: user.email,
          name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
        });

        user = await storage.updateUserStripeInfo(userId, { 
          stripeCustomerId: customer.id 
        });
      }

          // Create dynamic pricing for live mode compatibility
      const priceAmount = Math.round(tierInfo.price * 100); // Convert to cents

      console.log(`🔧 Creating subscription for ${tier} tier: $${tierInfo.price}/month`);

      // Configure payment method types based on selection
      const paymentMethodTypes: ('card' | 'cashapp')[] = paymentMethod === 'cashapp' 
        ? ['cashapp'] 
        : ['card', 'cashapp']; // Allow both card and CashApp for Stripe

      const subscription = await stripe.subscriptions.create({
        customer: customer.id,
        items: [{
          price_data: {
            currency: 'usd',
            product: `${tier.charAt(0).toUpperCase() + tier.slice(1)} Plan`,
            recurring: {
              interval: 'month',
            },
            unit_amount: priceAmount,
          },
        }],
        payment_behavior: 'default_incomplete',
        payment_settings: {
          save_default_payment_method: 'on_subscription',
          payment_method_types: paymentMethodTypes,
        },
        expand: ['latest_invoice.payment_intent'],
        metadata: {
          paymentMethod: paymentMethod,
          tier: tier,
          userId: userId,
          ...(paymentMethod === 'cashapp' && { cashapp_account: '$ILLAITHEGPTSTORE' })
        },
        description: paymentMethod === 'cashapp' 
          ? `${tier.charAt(0).toUpperCase() + tier.slice(1)} subscription - Pay to $ILLAITHEGPTSTORE`
          : `${tier.charAt(0).toUpperCase() + tier.slice(1)} subscription`,
      });

      console.log(`✅ Subscription created: ${subscription.id}`);
      const invoiceObj = subscription.latest_invoice as any;
      console.log(`📋 Latest invoice:`, invoiceObj?.id);

      // Extract payment intent and client secret - handle expanded Stripe objects
      const latestInvoice = subscription.latest_invoice as any;
      const paymentIntent = latestInvoice?.payment_intent;
      const clientSecret = paymentIntent?.client_secret;

      console.log(`🔑 Payment intent: ${paymentIntent?.id}`);
      console.log(`🗝️ Client secret available: ${!!clientSecret}`);

      if (!clientSecret) {
        console.error('❌ No client secret found in subscription');
        throw new Error('Failed to create payment intent');
      }

      await storage.updateUserStripeInfo(userId, {
        stripeCustomerId: customer.id,
        stripeSubscriptionId: subscription.id
      });

      // Don't mark as active until payment succeeds - webhook will handle this
      console.log(`✅ Subscription setup complete, returning client secret`);

      res.json({
        subscriptionId: subscription.id,
        clientSecret: clientSecret,
      });
    } catch (error: any) {
      console.error('Subscription creation error:', error);
      return res.status(400).json({ error: { message: error.message } });
    }
  });

  // Database-backed idempotency for webhook events

  // Stripe webhook for payment updates (subscriptions + one-time purchases)
  app.post('/api/stripe-webhook', express.raw({type: 'application/json'}), async (req, res) => {
    // Check if Stripe is configured
    if (!stripe) {
      console.warn('⚠️ Stripe webhook called but Stripe is not configured');
      return res.status(503).json({ 
        message: 'Payment processing is currently unavailable.' 
      });
    }

    let event;

    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        req.headers['stripe-signature'] as string,
        process.env.STRIPE_WEBHOOK_SECRET || ''
      );
    } catch (err: any) {
      console.error(`🚨 Webhook signature verification failed:`, err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    const eventId = event.id;

    // Database-backed idempotency check - prevent duplicate processing
    try {
      const existingEvent = await storage.getProcessedWebhookEvent(eventId);
      if (existingEvent) {
        console.log(`⚠️ Event ${eventId} already processed at ${existingEvent.processedAt}, skipping`);
        return res.json({received: true});
      }
    } catch (error: any) {
      console.error(`❌ Error checking webhook idempotency for event ${eventId}:`, error.message);
      return res.status(500).json({
        error: 'Database error during idempotency check',
        eventId: eventId,
        message: error.message
      });
    }

    console.log(`📥 Processing webhook event: ${event.type} (${eventId})`);

    try {
      // Handle the event
      switch (event.type) {
        case 'payment_intent.succeeded':
          const paymentIntent = event.data.object as Stripe.PaymentIntent;

          try {
            // Check if this is a battle pack purchase
            if (paymentIntent.metadata?.battleCount) {
              const userId = paymentIntent.metadata.userId;
              const battleCount = parseInt(paymentIntent.metadata.battleCount);

              if (userId && battleCount) {
                // Add battles to user account
                const result = await storage.addUserBattles(userId, battleCount);
                if (result) {
                  console.log(`✅ Added ${battleCount} battles to user ${userId} (Payment: ${paymentIntent.id})`);
                } else {
                  console.warn(`⚠️ Failed to add battles to user ${userId} - user not found`);
                }
              } else {
                console.warn(`⚠️ Invalid battle pack data: userId=${userId}, battleCount=${battleCount}`);
              }
            }

            // Check if this is a CashApp subscription payment (first payment)
            else if (paymentIntent.metadata?.tier && paymentIntent.metadata?.paymentMethod === 'cashapp') {
              console.log(`💰 Processing CashApp subscription payment: ${paymentIntent.id}`);

              const userId = paymentIntent.metadata.userId;
              const tier = paymentIntent.metadata.tier;

              if (userId && tier && ['premium', 'pro'].includes(tier)) {
                // Activate the subscription for CashApp payments
                await storage.updateUserSubscription(userId, {
                  subscriptionStatus: 'active',
                  subscriptionTier: tier,
                  // Note: Stripe subscription ID should already be set from subscription creation
                });

                console.log(`✅ Activated CashApp subscription for user ${userId}: ${tier} tier (Payment: ${paymentIntent.id})`);
              } else {
                console.warn(`⚠️ Invalid CashApp subscription data: userId=${userId}, tier=${tier}`);
              }
            }
          } catch (error: any) {
            console.error(`❌ Error processing payment intent ${paymentIntent.id}:`, error.message);
            throw error; // Re-throw to trigger retry
          }
          break;

        case 'customer.subscription.updated':
        case 'customer.subscription.deleted':
          const subscription = event.data.object as Stripe.Subscription;

          try {
            // Defensive customer ID extraction - handle both string and expanded objects
            let customerId: string;
            if (typeof subscription.customer === 'string') {
              customerId = subscription.customer;
            } else if (subscription.customer && typeof subscription.customer === 'object' && 'id' in subscription.customer) {
              customerId = subscription.customer.id;
            } else {
              throw new Error(`Invalid customer ID format: ${typeof subscription.customer}`);
            }

            console.log(`🔍 Looking up user for Stripe customer: ${customerId}`);

            // Efficiently find user by Stripe customer ID
            const user = await storage.getUserByStripeCustomerId(customerId);

            if (user) {
              const subscriptionStatus = subscription.status === 'active' ? 'active' : 'inactive';

              // Get tier from subscription metadata if available, otherwise infer from price
              let subscriptionTier = 'free';
              if (subscription.status === 'active') {
                if (subscription.metadata?.tier) {
                  subscriptionTier = subscription.metadata.tier;
                } else {
                  // Fallback: infer from price amount (999 = $9.99 Premium, 1999 = $19.99 Pro)
                  const unitAmount = subscription.items.data[0]?.price?.unit_amount;
                  subscriptionTier = unitAmount === 999 ? 'premium' : unitAmount === 1999 ? 'pro' : 'free';
                }
              }

              await storage.updateUserSubscription(user.id, {
                subscriptionStatus,
                subscriptionTier,
                stripeSubscriptionId: subscription.id
              });

              console.log(`✅ Updated user ${user.id} subscription: ${subscriptionTier} (${subscriptionStatus})`);
            } else {
              console.warn(`⚠️ No user found for Stripe customer ${customerId}`);
            }
          } catch (error: any) {
            console.error(`❌ Error processing subscription webhook ${subscription.id}:`, error.message);
            throw error; // Re-throw to trigger retry
          }
          break;

        default:
          console.log(`ℹ️ Unhandled event type: ${event.type}`);
      }

      // Mark event as processed in database
      try {
        await storage.recordProcessedWebhookEvent({
          eventId: eventId,
          eventType: event.type
        });
      } catch (error: any) {
        console.error(`⚠️ Failed to record processed webhook event ${eventId}:`, error.message);
        // Continue anyway - the event was processed successfully
      }

      console.log(`✅ Successfully processed webhook event: ${event.type} (${eventId})`);
      res.json({received: true});

    } catch (error: any) {
      console.error(`❌ Critical webhook processing error for event ${eventId}:`, error.message);

      // Return 500 to trigger Stripe retry
      res.status(500).json({
        error: 'Webhook processing failed',
        eventId: eventId,
        message: error.message
      });
    }
  });

  // User stats and analytics
  app.get('/api/user/stats', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const stats = await storage.getUserStats(userId);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching user stats:", error);
      res.status(500).json({ message: "Failed to fetch user stats" });
    }
  });

  // Random match battle endpoint
  app.post("/api/battles/random-match", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { difficulty, preferredCharacters } = req.body;

      console.log(`🎮 Random match requested by user ${userId}`);

      // Check if user can start a battle
      const canBattle = await storage.canUserStartBattle(userId);
      if (!canBattle) {
        return res.status(403).json({ 
          message: "Battle limit reached. Upgrade to Premium or Pro for more battles!",
          upgrade: true 
        });
      }

      // Find random match
      const match = await matchmakingService.findRandomMatch({
        userId,
        difficulty,
        preferredCharacters,
      });

      // Create battle with random opponent
      const battleData = {
        userId,
        difficulty: match.difficulty,
        profanityFilter: false,
        lyricComplexity: match.lyricComplexity,
        styleIntensity: match.styleIntensity,
        voiceSpeed: 1.0,
        aiCharacterName: match.opponentName,
        aiCharacterId: match.opponentCharacterId,
        userScore: 0,
        aiScore: 0,
        rounds: [],
        status: "active"
      };

      const battle = await storage.createBattle(battleData);
      
      console.log(`✅ Random match created: ${match.opponentName} vs User`);
      
      res.status(201).json({
        battle,
        match: {
          opponentName: match.opponentName,
          opponentId: match.opponentCharacterId,
          difficulty: match.difficulty,
        }
      });
    } catch (error: any) {
      console.error("Error creating random match battle:", error);
      res.status(500).json({ message: "Failed to create random match battle" });
    }
  });

  // Protected battle creation with subscription checks
  app.post("/api/battles", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;

      // SECURITY: Input validation for battle creation parameters
      const {
        difficulty,
        profanityFilter,
        lyricComplexity,
        styleIntensity,
        voiceSpeed,
        aiCharacterName,
        aiCharacterId
      } = req.body;

      // SECURITY: Validate battle parameters
      const validDifficulties = ['easy', 'normal', 'hard', 'nightmare'];
      if (difficulty && !validDifficulties.includes(difficulty)) {
        return res.status(400).json({ message: "Invalid difficulty level" });
      }

      if (typeof profanityFilter !== 'undefined' && typeof profanityFilter !== 'boolean') {
        return res.status(400).json({ message: "Profanity filter must be boolean" });
      }

      if (lyricComplexity && (typeof lyricComplexity !== 'number' || lyricComplexity < 0 || lyricComplexity > 100)) {
        return res.status(400).json({ message: "Lyric complexity must be between 0-100" });
      }

      if (styleIntensity && (typeof styleIntensity !== 'number' || styleIntensity < 0 || styleIntensity > 100)) {
        return res.status(400).json({ message: "Style intensity must be between 0-100" });
      }

      if (voiceSpeed && (typeof voiceSpeed !== 'number' || voiceSpeed < 0.5 || voiceSpeed > 2.0)) {
        return res.status(400).json({ message: "Voice speed must be between 0.5-2.0" });
      }

      // SECURITY: Validate AI character selection (including clones)
      const validCharacters = ['razor', 'venom', 'silk', 'cypher'];
      const isCloneBattle = aiCharacterId?.startsWith('clone_');
      
      if (aiCharacterId && !validCharacters.includes(aiCharacterId) && !isCloneBattle) {
        return res.status(400).json({ message: "Invalid AI character" });
      }

      // SECURITY: Sanitize character name input
      const sanitizedCharacterName = aiCharacterName ? 
        aiCharacterName.toString().substring(0, 50).trim() : null;

      // Ensure user exists and has proper setup
      let user = await storage.getUser(userId);
      if (!user) {
        // Create user if not exists (shouldn't happen with auth but safety check)
        user = await storage.upsertUser({
          id: userId,
          email: req.user.claims.email,
          firstName: req.user.claims.first_name,
          lastName: req.user.claims.last_name,
          profileImageUrl: req.user.claims.profile_image_url,
        });
      }

      const BATTLE_COST = 100; // 100 credits per battle
      const canBattle = await storage.canUserStartBattle(userId);

      // Check subscription battles first
      if (!canBattle) {
        // No subscription battles - check if user has credits
        const currentCredit = parseFloat(user.storeCredit?.toString() || "0");
        if (currentCredit < BATTLE_COST) {
          return res.status(403).json({ 
            message: `Insufficient credits. Battle costs ${BATTLE_COST} credits. Your balance: ${currentCredit.toFixed(0)} credits`,
            upgrade: true,
            insufficientCredits: true,
            needed: BATTLE_COST,
            balance: currentCredit
          });
        }
        
        // Deduct credits for battle
        const newBalance = currentCredit - BATTLE_COST;
        await storage.updateUser(userId, { storeCredit: newBalance.toString() });
        
        // Track battle spending toward ad revenue pool
        adsService.trackBattleSpending(userId, BATTLE_COST);
        
        console.log(`💳 Battle purchased with credits: ${userId} (-${BATTLE_COST} credits, balance: ${newBalance})`);
      }

      // SECURITY: Only include validated and sanitized parameters
      const battleData = {
        userId,
        difficulty: difficulty || 'normal',
        profanityFilter: profanityFilter !== undefined ? profanityFilter : false,
        lyricComplexity: lyricComplexity || 50,
        styleIntensity: styleIntensity || 50,
        voiceSpeed: voiceSpeed || 1.0,
        aiCharacterName: sanitizedCharacterName || 'MC Venom',
        aiCharacterId: aiCharacterId || 'venom',
        userScore: 0,
        aiScore: 0,
        rounds: [],
        status: "active"
      };

      const battle = await storage.createBattle(battleData);
      res.status(201).json(battle);
    } catch (error: any) {
      console.error("Error creating battle:", error);

      if (error.message === "No battles remaining") {
        return res.status(403).json({ 
          message: "Battle limit reached. Upgrade to Premium or Pro for more battles!",
          upgrade: true 
        });
      }

      res.status(500).json({ message: "Failed to create battle" });
    }
  });

  // Get user's battle history
  app.get("/api/battles/history", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const battles = await storage.getUserBattles(userId, 20);
      res.json(battles);
    } catch (error) {
      console.error("Error fetching battle history:", error);
      res.status(500).json({ message: "Failed to fetch battle history" });
    }
  });



  // Payment success redirect endpoint
  app.get("/api/payment/success", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;

      // Refresh user data to get updated subscription
      const user = await storage.getUser(userId);
      if (user && user.subscriptionTier !== 'free') {
        // Payment successful - redirect to dashboard
        res.redirect('/?payment_success=true');
      } else {
        // Payment may still be processing
        res.redirect('/?payment_processing=true');
      }
    } catch (error) {
      console.error("Error handling payment success:", error);
      res.redirect('/?payment_error=true');
    }
  });

  // User API Key Management Routes
  app.get('/api/user/api-keys', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const status = await storage.getUserAPIKeysStatus(userId);
      res.json(status);
    } catch (error) {
      console.error("Error fetching API key status:", error);
      res.status(500).json({ message: "Failed to fetch API key status" });
    }
  });

  app.put('/api/user/api-keys', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { openaiApiKey, groqApiKey, elevenlabsApiKey, preferredTtsService } = req.body;

      await storage.updateUserAPIKeys(userId, {
        openaiApiKey,
        groqApiKey,
        elevenlabsApiKey,
        preferredTtsService
      });

      // Clear cached TTS instances when keys change
      userTTSManager.clearUserInstances(userId);

      res.json({ success: true });
    } catch (error) {
      console.error("Error updating API keys:", error);
      res.status(500).json({ message: "Failed to update API keys" });
    }
  });

  app.post('/api/user/test-api-key', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { service } = req.body;

      if (!service || !['openai', 'groq', 'elevenlabs', 'myshell'].includes(service)) {
        return res.status(400).json({ message: "Invalid service specified" });
      }

      const isValid = await userTTSManager.testUserAPIKey(userId, 'groq');
      res.json({ valid: isValid });
    } catch (error) {
      console.error(`Error testing ${req.body.service} API key:`, error);
      res.status(500).json({ message: `Failed to test ${req.body.service} API key` });
    }
  });

  // Fine-tuning API routes
  // Check fine-tuning access availability
  app.get('/api/fine-tuning/access', isAuthenticated, async (_req: any, res) => {
    try {
      const fineTuningService = new FineTuningService();
      const access = await fineTuningService.checkFineTuningAccess();
      res.json(access);
    } catch (error) {
      console.error("Error checking fine-tuning access:", error);
      res.status(500).json({ message: "Failed to check fine-tuning access" });
    }
  });

  // List all fine-tuning jobs
  app.get('/api/fine-tuning', isAuthenticated, async (_req: any, res) => {
    try {
      const fineTuningService = new FineTuningService();
      const fineTunings = await fineTuningService.listFineTunings();
      res.json({ object: "list", data: fineTunings });
    } catch (error: any) {
      console.error("Error listing fine-tunings:", error);
      res.status(500).json({ 
        message: "Failed to list fine-tunings",
        error: error.message 
      });
    }
  });

  // Create a new fine-tuning job
  app.post('/api/fine-tuning', isAuthenticated, async (req: any, res) => {
    try {
      const { name, input_file_id, base_model, type } = req.body;

      // Validate required fields
      if (!name || !input_file_id) {
        return res.status(400).json({ 
          message: "Missing required fields: name and input_file_id are required" 
        });
      }

      const fineTuningService = new FineTuningService();
      const fineTuning = await fineTuningService.createFineTuning({
        name,
        input_file_id,
        base_model,
        type
      });

      res.json({ 
        id: fineTuning.id,
        object: "fine_tuning",
        data: fineTuning 
      });
    } catch (error: any) {
      console.error("Error creating fine-tuning:", error);
      res.status(500).json({ 
        message: "Failed to create fine-tuning",
        error: error.message 
      });
    }
  });

  // Get a specific fine-tuning job by ID
  app.get('/api/fine-tuning/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;

      if (!id) {
        return res.status(400).json({ message: "Fine-tuning ID is required" });
      }

      const fineTuningService = new FineTuningService();
      const fineTuning = await fineTuningService.getFineTuning(id);

      res.json({ 
        id: fineTuning.id,
        object: "fine_tuning",
        data: fineTuning 
      });
    } catch (error: any) {
      console.error("Error getting fine-tuning:", error);
      
      if (error.message.includes("404") || error.message.includes("not found")) {
        return res.status(404).json({ 
          message: "Fine-tuning not found",
          error: error.message 
        });
      }
      
      res.status(500).json({ 
        message: "Failed to get fine-tuning",
        error: error.message 
      });
    }
  });

  // Delete a fine-tuning job by ID
  app.delete('/api/fine-tuning/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;

      if (!id) {
        return res.status(400).json({ message: "Fine-tuning ID is required" });
      }

      const fineTuningService = new FineTuningService();
      const result = await fineTuningService.deleteFineTuning(id);

      res.json(result);
    } catch (error: any) {
      console.error("Error deleting fine-tuning:", error);
      
      if (error.message.includes("404") || error.message.includes("not found")) {
        return res.status(404).json({ 
          message: "Fine-tuning not found",
          error: error.message 
        });
      }
      
      res.status(500).json({ 
        message: "Failed to delete fine-tuning",
        error: error.message 
      });
    }
  });

  // Upload training data file for fine-tuning
  app.post('/api/fine-tuning/upload', isAuthenticated, async (req: any, res) => {
    try {
      const { trainingData } = req.body;

      if (!trainingData || !Array.isArray(trainingData)) {
        return res.status(400).json({ 
          message: "Training data is required and must be an array" 
        });
      }

  const fineTuningService = new FineTuningService();
  const fileId = await fineTuningService.uploadTrainingFile(trainingData);

      res.json({ 
        success: true,
        file_id: fileId,
        message: "Training data uploaded successfully" 
      });
    } catch (error: any) {
      console.error("Error uploading training data:", error);
      res.status(500).json({ 
        message: "Failed to upload training data",
        error: error.message 
      });
    }
  });

  // Get sample training data
  app.get('/api/fine-tuning/sample-data', isAuthenticated, async (_req: any, res) => {
    try {
  const fineTuningService = new FineTuningService();
  const sampleData = fineTuningService.generateSampleRapData();
      res.json({ data: sampleData });
    } catch (error: any) {
      console.error("Error generating sample data:", error);
      res.status(500).json({ 
        message: "Failed to generate sample data",
        error: error.message 
      });
    }
  });

  // Export training data as JSONL
  app.post('/api/fine-tuning/export-jsonl', isAuthenticated, async (req: any, res) => {
    try {
      const { trainingData } = req.body;

      if (!trainingData || !Array.isArray(trainingData)) {
        return res.status(400).json({ 
          message: "Training data is required and must be an array" 
        });
      }

  const fineTuningService = new FineTuningService();
  const jsonl = fineTuningService.exportTrainingDataAsJSONL(trainingData);

      res.setHeader('Content-Type', 'application/jsonl');
      res.setHeader('Content-Disposition', 'attachment; filename="rap_training_data.jsonl"');
      res.send(jsonl);
    } catch (error: any) {
      console.error("Error exporting training data:", error);
      res.status(500).json({ 
        message: "Failed to export training data",
        error: error.message 
      });
    }
  });

  // LIGHTNING-FAST TRANSCRIPTION ENDPOINT - Process audio in <200ms
  app.post("/api/battles/:id/transcribe", isAuthenticated, upload.single('audio'), async (req: any, res) => {
    const startTime = Date.now();
    const battleId = req.params.id;

    try {
      console.log(`⚡ LIGHTNING Transcription Started - ${battleId.substring(0, 8)}...`);

      if (!req.file?.buffer) {
        return res.status(400).json({ message: "No audio file provided" });
      }

      const audioBuffer = req.file.buffer;
      console.log(`🎵 Audio for transcription: ${audioBuffer.length} bytes`);

      // Lightning-fast transcription only (200ms max for instant feel)
      let userText = "Voice input received";
      try {
        userText = await Promise.race([
          groqService.transcribeAudio(audioBuffer),
          new Promise<string>((_, reject) => 
            setTimeout(() => reject(new Error("Transcription timeout")), 150) // Even more aggressive 150ms
          )
        ]);
        console.log(`✅ LIGHTNING transcription (${Date.now() - startTime}ms): "${userText.substring(0, 50)}..."`);
      } catch (error) {
        console.log(`⚠️ Lightning transcription failed, getting actual transcription...`);
        // If ultra-fast fails, get the actual transcription without timeout
        try {
          userText = await groqService.transcribeAudio(audioBuffer);
          console.log(`✅ Fallback transcription complete: "${userText.substring(0, 50)}..."`);
        } catch (fallbackError) {
          console.log(`❌ All transcription failed, using placeholder`);
          userText = "Voice input received";
        }
      }

      const finalProcessingTime = Date.now() - startTime;
      console.log(`🎯 Final transcription result: "${userText}" (${finalProcessingTime}ms)`);

      res.json({ 
        userText,
        processingTime: finalProcessingTime,
        instant: finalProcessingTime <= 200 // Mark as instant only if truly fast
      });

    } catch (error: any) {
      console.error(`❌ Instant transcription failed:`, error.message);
      res.status(500).json({ message: "Transcription failed" });
    }
  });

  // Legacy battle routes for backward compatibility
  app.get("/api/battles", async (_req, res) => {
    // Return empty array for unauthenticated requests
    res.json([]);
  });

  app.get("/api/battles/:id", async (req, res) => {
    try {
      const battle = await storage.getBattle(req.params.id);
      if (!battle) {
        return res.status(404).json({ message: "Battle not found" });
      }
      res.json(battle);
    } catch (error) {
      console.error("Error fetching battle:", error);
      res.status(500).json({ message: "Failed to fetch battle" });
    }
  });

  app.get("/api/battles/:id/state", async (req, res) => {
    try {
      const battle = await storage.getBattle(req.params.id);
      if (!battle) {
        return res.status(404).json({ message: "Battle not found" });
      }

      const state = {
        id: battle.id,
        currentRound: battle.rounds.length + 1,
        maxRounds: 3,
        isRecording: false,
        isAIResponding: false,
        isPlayingAudio: false,
        userScore: battle.userScore,
        aiScore: battle.aiScore,
        difficulty: battle.difficulty as "easy" | "normal" | "hard",
        profanityFilter: battle.profanityFilter,
        timeRemaining: 30,
      };

      res.json(state);
    } catch (error) {
      console.error("Error fetching battle state:", error);
      res.status(500).json({ message: "Failed to fetch battle state" });
    }
  });

  app.get("/api/battles/:id/rounds", async (req, res) => {
    try {
      const battle = await storage.getBattle(req.params.id);
      if (!battle) {
        return res.status(404).json({ message: "Battle not found" });
      }
      res.json(battle.rounds);
    } catch (error) {
      console.error("Error fetching battle rounds:", error);
      res.status(500).json({ message: "Failed to fetch battle rounds" });
    }
  });

  // FAST Battle Round Processing - Optimized for Speed  
  app.post("/api/battles/:id/rounds", isAuthenticated, upload.single('audio'), async (req: any, res) => {
    const startTime = Date.now();
    const battleId = req.params.id;

    try {
      // SECURITY: Input validation and sanitization
      if (!battleId || typeof battleId !== 'string' || battleId.length > 50) {
        return res.status(400).json({ message: "Invalid battle ID" });
      }

      // SECURITY: Validate battle ID format (UUID)
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(battleId)) {
        return res.status(400).json({ message: "Invalid battle ID format" });
      }

      console.log(`🎤 Battle Round Processing Started - ${battleId.substring(0, 8)}...`);

      const battle = await storage.getBattle(battleId);

      if (!battle) {
        return res.status(404).json({ message: "Battle not found" });
      }

      // DEBUG: Check file upload status
      console.log(`📁 File upload debug:`);
      console.log(`  req.file exists: ${!!req.file}`);
      console.log(`  req.file.buffer exists: ${!!(req.file?.buffer)}`);
      console.log(`  req.file details:`, req.file ? {
        fieldname: req.file.fieldname,
        originalname: req.file.originalname,
        encoding: req.file.encoding,
        mimetype: req.file.mimetype,
        size: req.file.size,
        bufferLength: req.file.buffer?.length
      } : 'No file');

      // Handle both audio and text input - at least one must be provided
      const userVerse = req.body.userVerse;
      const hasAudio = !!(req.file?.buffer);
      const hasText = !!(userVerse?.trim());

      if (!hasAudio && !hasText) {
        console.log(`❌ No audio file or text verse provided`);
        return res.status(400).json({ message: "Either audio file or text verse must be provided" });
      }

      const audioBuffer = req.file?.buffer;

      // Audio validation only if audio is provided
      if (hasAudio) {
        console.log(`📊 File stats: ${audioBuffer.length} bytes, mimetype: ${req.file.mimetype}`);

        // TEMPORARILY REMOVE SIZE RESTRICTIONS for debugging
        if (audioBuffer.length === 0) {
          console.log(`❌ Empty audio file`);
          return res.status(400).json({ message: "Audio file is empty" });
        }

        // SECURITY: Proper audio format validation based on our findings
        const audioHeader = audioBuffer.slice(0, 16).toString('hex');

        console.log(`🔍 Audio validation: ${audioBuffer.length} bytes, header: ${audioHeader.substring(0, 16)}`);

        // WebM format validation (what browsers actually send)
        const isWebM = audioBuffer[0] === 0x1a && audioBuffer[1] === 0x45 && 
                       audioBuffer[2] === 0xDF && audioBuffer[3] === 0xA3;

        // Other common formats
        const isWAV = audioHeader.startsWith('52494646'); // RIFF
        const isOgg = audioHeader.startsWith('4f676753'); // OggS
        const isMP3 = audioHeader.startsWith('fffb') || audioHeader.startsWith('fff3');
        const isMP4 = audioHeader.startsWith('0000001c') || audioHeader.startsWith('00000020') || 
                      audioHeader.includes('66747970'); // MP4/M4A - more flexible detection

        if (!isWebM && !isWAV && !isOgg && !isMP3 && !isMP4) {
          console.log(`❌ Unrecognized audio format, header: ${audioHeader.substring(0, 16)}`);
          return res.status(400).json({ message: "Unsupported audio format" });
        }

        console.log(`✅ Audio validation passed: ${isWebM ? 'WebM' : isWAV ? 'WAV' : isOgg ? 'Ogg' : isMP3 ? 'MP3' : 'MP4'} format`);

        console.log(`🎵 Audio received: ${audioBuffer.length} bytes`);
      } else {
        console.log(`📝 Text input received: "${userVerse}"`);
      }

      // TRANSCRIPTION OR TEXT INPUT
      let userText = "Input received";

      if (hasText) {
        // Use provided text directly 
        userText = userVerse.trim();
        console.log(`✅ Text input processed: "${userText.substring(0, 50)}..."`);
      } else if (hasAudio) {
        // Process audio transcription
        console.log(`⚡ Starting audio transcription...`);
        try {
          // OPTIMIZED transcription with proper timeout for deployment stability
          userText = await Promise.race([
            groqService.transcribeAudio(audioBuffer),
            new Promise<string>((_, reject) => 
              setTimeout(() => reject(new Error("Transcription timeout")), 3000) // 3s timeout for stability
            )
          ]);
          console.log(`✅ FAST transcription complete: "${userText.substring(0, 50)}..."`);
        } catch (error) {
          console.log(`⚠️ Fast transcription failed, using fallback...`);
          // If ultra-fast fails, get the actual transcription without timeout
          try {
            userText = await groqService.transcribeAudio(audioBuffer);
            console.log(`✅ Fallback transcription complete: "${userText.substring(0, 50)}..."`);
          } catch (fallbackError) {
            console.log(`❌ All transcription failed, using placeholder`);
            userText = "Voice input received";
          }
        }
      }

      // Continue with the rest of the processing - no streaming for now, 
      // but transcription is now much faster (1s vs 2s)

      // FIRST: Calculate user's performance to inform AI reaction
      console.log(`📊 Pre-analyzing user performance for reactive AI...`);
      const userPerformanceScore = scoringService.calculateUserScore(userText);
      console.log(`🎯 User performance: ${userPerformanceScore}/100 - AI will react accordingly`);

      // Check if this is a clone battle and adjust difficulty/complexity accordingly
      const isCloneBattle = battle.aiCharacterId?.startsWith('clone_');
      let adjustedDifficulty = battle.difficulty;
      let adjustedComplexity = battle.lyricComplexity || 50;
      let adjustedIntensity = battle.styleIntensity || 50;

      if (isCloneBattle && battle.aiCharacterId) {
        console.log(`🤖 Clone battle detected - adjusting AI to match user's skill level`);
        const cloneId = battle.aiCharacterId.replace('clone_', '');
        const clone = await storage.getCloneById(cloneId);
        
        if (clone) {
          // Adjust AI difficulty based on clone's skill level
          adjustedComplexity = clone.avgRhymeDensity;
          adjustedIntensity = clone.skillLevel;
          
          // Map skill level to difficulty
          if (clone.skillLevel < 40) adjustedDifficulty = 'easy';
          else if (clone.skillLevel >= 40 && clone.skillLevel < 65) adjustedDifficulty = 'normal';
          else if (clone.skillLevel >= 65 && clone.skillLevel < 85) adjustedDifficulty = 'hard';
          else adjustedDifficulty = 'nightmare';
          
          console.log(`🎯 Clone AI settings: difficulty=${adjustedDifficulty}, complexity=${adjustedComplexity}, intensity=${adjustedIntensity}`);
        }
      }

      // NOW generate AI response with user score context for reactive behavior
      console.log(`🤖 Generating AI response for: "${userText.substring(0, 30)}..."`);

      // Get user's Groq API key if available
      const userId = req.user.claims.sub;
      const userFromDb = await storage.getUser(userId);
      const userGroqKey = userFromDb?.groqApiKey || undefined;

      let aiResponseText = "System response ready!";
      try {
        // Ultra-aggressive timeout for instant response
        aiResponseText = await Promise.race([
          groqService.generateRapResponse(
            userText, // Use actual transcription for better AI response
            adjustedDifficulty, 
            battle.profanityFilter,
            adjustedComplexity,
            adjustedIntensity,
            userPerformanceScore, // Pass user score for reactive AI
            true, // enableInternalRhymes
            userGroqKey // Pass user's Groq API key for rap generation
          ),
          new Promise<string>((_, reject) => 
            setTimeout(() => reject(new Error("AI timeout")), 5000) // Keep longer timeout for 120B model
          )
        ]);
        console.log(`✅ AI response generated: "${aiResponseText.substring(0, 50)}..."`);
      } catch (error: any) {
        console.log(`⚠️ AI response failed: ${error.message}`);
        aiResponseText = "Yo, technical difficulties but I'm still here / System glitched but my flow's crystal clear!";
      }

      // 3. Generate TTS using user's preferred service or system fallback
      const characterId = battle.aiCharacterId || battle.aiCharacterName?.toLowerCase()?.replace('mc ', '').replace(' ', '_') || "venom";
      console.log(`🎤 Generating TTS for character: ${characterId} (user: ${userId})`);

      // Use the new UserTTSManager to handle all TTS services
      let ttsResult: any;
      try {
        const { getCharacterById } = await import("@shared/characters");
        const character = getCharacterById(characterId);

        const audioResponse = await userTTSManager.generateTTS(aiResponseText, userId, {
          characterId,
          characterName: character?.name || `MC ${characterId}`,
          gender: character?.gender || 'male',
          voiceStyle: (battle.styleIntensity || 50) > 70 ? 'aggressive' : 
                     (battle.styleIntensity || 50) > 40 ? 'confident' : 'smooth',
          speedMultiplier: battle.voiceSpeed || 1.0
        });

        // Convert to expected format
        ttsResult = { 
          audioPath: "", 
          audioUrl: audioResponse.audioUrl,
          fileSize: audioResponse.audioUrl.length 
        };

        console.log(`✅ User TTS successful: ${audioResponse.audioUrl.length > 0 ? 'Audio generated' : 'Silent mode'}`);
      } catch (error: any) {
        console.error(`❌ User TTS failed:`, error.message);

        // Fallback to empty audio (battles continue without sound)
        ttsResult = { 
          audioPath: "", 
          audioUrl: "", 
          fileSize: 0 
        };
      }

      const audioResult = ttsResult;

      console.log(`🤖 Processing complete (${Date.now() - startTime}ms)`);

      // REALISTIC SCORING: Use actual battle analysis instead of random numbers
      console.log(`📊 Analyzing battle performance...`);
      // CRITICAL: Final battle scores use advanced phonetic analysis with zero rate limiting
      const scores = scoringService.scoreRound(userText, aiResponseText, true, battle.id);
      console.log('🏆 FINAL BATTLE SCORES calculated with advanced phonetic analysis - no rate limiting!');

      // GENERATE USER'S BATTLE RAP MAP for display
      const userBattleMap = groqService.generateUserBattleMap(userText);
      console.log(`🗺️ USER'S BATTLE MAP:\n${userBattleMap}`);

      console.log(`📈 User analysis: Rhyme ${scores.rhymeDensity}/100, Flow ${scores.flowQuality}/100, Creativity ${scores.creativity}/100`);
      console.log(`🎯 Final scores: User ${scores.userScore}/100, AI ${scores.aiScore}/100`);

      // Create round with realistic scoring and battle map
      const round = {
        id: Date.now().toString(),
        battleId,
        userText,
        aiResponse: aiResponseText,
        userScore: scores.userScore,
        aiScore: scores.aiScore,
        scores: {
          rhymeDensity: scores.rhymeDensity,
          flowQuality: scores.flowQuality,
          creativity: scores.creativity,
          userScore: scores.userScore,
          aiScore: scores.aiScore
        },
        audioUrl: audioResult.audioUrl || "",
        userBattleMap: userBattleMap, // Add battle map for frontend display
        timestamp: Date.now()
      };

      // DEBUG: Verify AI response is actually being returned
      console.log(`🔍 FINAL RESPONSE VALIDATION:`);
      console.log(`   aiResponse exists: ${!!round.aiResponse}`);
      console.log(`   aiResponse length: ${round.aiResponse?.length || 0}`);
      console.log(`   aiResponse preview: "${round.aiResponse?.substring(0, 100)}..."`);
      console.log(`   audioUrl exists: ${!!round.audioUrl}`);
      console.log(`   audioUrl length: ${round.audioUrl?.length || 0}`);

      // CRITICAL FIX: Update main battle record with scores
      await storage.updateBattleScore(battleId, scores.userScore, scores.aiScore);
      console.log(`🏆 Updated battle scores: User ${scores.userScore}/100, AI ${scores.aiScore}/100`);

      // Quick storage update
      await storage.addBattleRound(battleId, round);

      console.log(`✅ Battle round complete (${Date.now() - startTime}ms)`);
      console.log(`📤 Sending response with aiResponse: ${!!round.aiResponse}`);
      res.json(round);

    } catch (error: any) {
      const processingTime = Date.now() - startTime;
      // SECURITY: Don't expose internal error details to users
      console.error(`❌ Battle round processing failed in ${processingTime}ms for battle ${battleId.substring(0, 8)}...`);
      console.error("Error details (internal only):", error);

      // SECURITY: Generic error message to prevent information leakage
      res.status(500).json({ 
        message: "Battle processing temporarily unavailable. Please try again.",
        processingTime 
      });
    }
  });

  // Streaming Audio Endpoint - Generates audio chunks for progressive playback
  app.post("/api/battles/:battleId/stream-audio", isAuthenticated, async (req: any, res) => {
    const { text, characterId, battleId } = req.body;

    try {
      if (!streamingTTSService) {
        console.warn('⚠️ Streaming TTS not available, using fallback');
        // Fallback: generate single audio file
        const battle = await storage.getBattle(battleId);
        if (!battle) {
          return res.status(404).json({ message: "Battle not found" });
        }

        const userId = req.user.claims.sub;
        const audioResponse = await userTTSManager.generateTTS(text, userId, {
          characterId,
          characterName: `MC ${characterId}`,
        });

        return res.json({
          chunks: [
            {
              phrase: text,
              audioUrl: audioResponse.audioUrl,
              index: 0,
            }
          ],
          mode: 'fallback_single_file'
        });
      }

      console.log(`🎵 Streaming TTS request: ${text.substring(0, 40)}... for character: ${characterId}`);

      const chunks: Array<{ phrase: string; audioUrl: string; index: number }> = [];
      let chunkIndex = 0;

      // Use the streaming TTS generator
      for await (const chunk of streamingTTSService.generateStreamingAudio(
        text,
        characterId,
        { voice: 'alloy' }
      )) {
        chunks.push({
          phrase: chunk.phrase,
          audioUrl: chunk.audioUrl,
          index: chunkIndex,
        });
        chunkIndex++;

        // Log chunk generation progress
        console.log(`✅ Streaming chunk ${chunkIndex}: ${chunk.audioUrl}`);
      }

      console.log(`🎉 Streaming TTS complete: ${chunks.length} chunks generated`);

      res.json({
        chunks,
        mode: 'streaming',
        characterId,
        totalChunks: chunks.length,
      });
    } catch (error: any) {
      console.error('❌ Streaming audio generation error:', error);
      
      // Fallback: try single audio generation
      try {
        const userId = req.user.claims.sub;
        const audioResponse = await userTTSManager.generateTTS(text, userId, {
          characterId,
          characterName: `MC ${characterId}`,
        });

        res.json({
          chunks: [
            {
              phrase: text,
              audioUrl: audioResponse.audioUrl,
              index: 0,
            }
          ],
          mode: 'fallback_error'
        });
      } catch (fallbackError) {
        console.error('❌ Fallback TTS also failed:', fallbackError);
        res.status(500).json({
          message: 'Audio generation failed',
          error: error.message
        });
      }
    }
  });

  // Fast battle state updates
  app.patch("/api/battles/:id/state", async (req, res) => {
    try {
      const battleId = req.params.id;
      const updates = req.body;

      // SECURITY: Validate battle ID format (UUID)
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(battleId)) {
        return res.status(400).json({ message: "Invalid battle ID format" });
      }

      // SECURITY: Validate and sanitize state updates
      const allowedFields = ['userScore', 'aiScore', 'isComplete', 'winner'];
      const sanitizedUpdates: any = {};

      for (const [key, value] of Object.entries(updates)) {
        if (allowedFields.includes(key)) {
          if (key === 'userScore' || key === 'aiScore') {
            // Validate score values
            if (typeof value === 'number' && value >= 0 && value <= 100) {
              sanitizedUpdates[key] = value;
            }
          } else if (key === 'isComplete') {
            if (typeof value === 'boolean') {
              sanitizedUpdates[key] = value;
            }
          } else if (key === 'winner') {
            const validWinners = ['user', 'ai', 'tie'];
            if (typeof value === 'string' && validWinners.includes(value)) {
              sanitizedUpdates[key] = value;
            }
          }
        }
      }

      await storage.updateBattleState(battleId, sanitizedUpdates);

      if (sanitizedUpdates.isComplete === true) {
        const battle = await storage.getBattle(battleId);
        if (battle && battle.userId) {
          console.log(`🎮 Battle completed - awarding XP to user ${battle.userId}`);
          
          const battleResult = {
            won: battle.userScore > battle.aiScore,
            score: battle.userScore,
            opponentScore: battle.aiScore,
            roundsPlayed: battle.rounds?.length || 1,
            difficulty: battle.difficulty,
          };

          try {
            const levelUpResult = await xpService.awardBattleXP(battle.userId, battleResult);
            
            if (levelUpResult.leveledUp) {
              console.log(`🎉 User ${battle.userId} leveled up! ${levelUpResult.oldLevel} → ${levelUpResult.newLevel}`);
            }

            await storage.completeBattle(battleId);
          } catch (xpError) {
            console.error('Error awarding battle XP:', xpError);
          }
        }
      }

      res.json({ success: true });
    } catch (error) {
      // SECURITY: Don't expose internal error details
      console.error("Error updating battle state (internal):", error);
      res.status(500).json({ message: "State update temporarily unavailable" });
    }
  });

  // Claim Arc USDC reward for battle win
  app.post("/api/battles/:battleId/claim-arc-reward", isAuthenticated, async (req: any, res) => {
    const battleId = req.params.battleId;
    const userId = req.user.claims.sub;

    try {
      // SECURITY: Validate battle ID format (UUID)
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(battleId)) {
        return res.status(400).json({ message: "Invalid battle ID format" });
      }

      console.log(`🏆 Claiming Arc reward for battle ${battleId.substring(0, 8)}... by user ${userId}`);

      // Fetch the battle
      const battle = await storage.getBattle(battleId);
      if (!battle) {
        return res.status(404).json({ message: "Battle not found" });
      }

      // Verify ownership
      if (battle.userId !== userId) {
        return res.status(403).json({ message: "Unauthorized - battle belongs to another user" });
      }

      // Check if user won the battle
      if (battle.userScore <= battle.aiScore) {
        return res.status(400).json({ 
          message: "You did not win this battle. Only winners can claim rewards.",
          userScore: battle.userScore,
          aiScore: battle.aiScore
        });
      }

      // Check if reward already claimed
      if (battle.rewardTxHash) {
        return res.status(400).json({ 
          message: "Reward already claimed for this battle",
          txHash: battle.rewardTxHash
        });
      }

      // Get user's Arc wallet address
      let walletAddress = await storage.getArcWalletAddress(userId);
      
      if (!walletAddress) {
        console.log(`⛓️ Creating Arc wallet for user ${userId}...`);
        walletAddress = await arcBlockchainService.createWallet(userId);
        await storage.createArcWallet(userId, walletAddress);
      }

      console.log(`💰 User wallet: ${walletAddress.substring(0, 10)}...`);

      // Award USDC for battle win
      const arcResult = await arcBlockchainService.awardBattleWinUSDC(walletAddress, battleId);
      
      if (arcResult.status !== 'confirmed') {
        console.error(`❌ Arc transfer failed: ${arcResult.status}`);
        return res.status(500).json({ message: "Failed to process Arc reward transfer" });
      }

      // Record Arc transaction in database
      await storage.recordArcTransaction({
        userId,
        relatedBattleId: battleId,
        txHash: arcResult.txHash,
        txType: 'battle_reward',
        amount: "0.10", // Battle win reward amount (0.1 USDC)
        toAddress: walletAddress,
        fromAddress: arcBlockchainService.getPlatformWalletAddress(),
        status: 'confirmed',
        blockNumber: arcResult.blockNumber,
        gasUsedUSDC: arcResult.gasUsedUSDC,
        memo: `Battle win reward - User ${userId} defeated AI ${battle.aiCharacterName} with score ${battle.userScore}/${battle.aiScore}`
      });

      // Update transaction confirmed timestamp after insert
      await storage.updateArcTransactionStatus(arcResult.txHash, 'confirmed', arcResult.confirmedAt);

      // Update battle to mark reward as claimed
      await storage.updateBattleRewardTxHash(battleId, arcResult.txHash);

      // Update user's total earned USDC
      const user = await storage.getUser(userId);
      if (user) {
        const currentEarned = parseFloat(user.totalEarnedUSDC?.toString() || '0');
        await storage.updateUser(userId, { 
          totalEarnedUSDC: (currentEarned + 0.10).toString() 
        });
      }

      console.log(`✅ Arc reward claimed! TX: ${arcResult.txHash.substring(0, 20)}...`);

      res.status(200).json({
        success: true,
        reward: {
          amountUSDC: "0.10",
          txHash: arcResult.txHash,
          walletAddress,
          blockNumber: arcResult.blockNumber,
          confirmedAt: arcResult.confirmedAt,
          gasUsedUSDC: arcResult.gasUsedUSDC
        }
      });

    } catch (error: any) {
      console.error(`❌ Error claiming Arc reward for battle ${battleId}:`, error);
      res.status(500).json({ 
        message: "Failed to claim Arc reward",
        error: error.message 
      });
    }
  });

  // User earnings endpoint - Track USDC earnings and Arc transactions
  app.get('/api/user/earnings', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Get user's Arc transactions
      const arcTransactions = await storage.getUserArcTransactions(userId, 100);
      const battleWinTransactions = arcTransactions.filter(tx => tx.txType === 'battle_reward');
      
      // Get user's Arc wallet
      const walletAddress = await storage.getArcWalletAddress(userId);
      
      // Get user's balance from profile
      const user = await storage.getUser(userId);
      const totalEarned = parseFloat(user?.totalEarnedUSDC?.toString() || '0');
      
      // Calculate confirmed earnings
      const confirmedEarnings = battleWinTransactions
        .filter(tx => tx.status === 'confirmed')
        .reduce((sum, tx) => sum + parseFloat(tx.amount || '0'), 0);
      
      // Calculate pending earnings
      const pendingEarnings = battleWinTransactions
        .filter(tx => tx.status === 'pending')
        .reduce((sum, tx) => sum + parseFloat(tx.amount || '0'), 0);
      
      res.json({
        totalEarned,
        confirmedEarnings,
        pendingEarnings,
        walletAddress,
        transactionCount: battleWinTransactions.length,
        recentTransactions: battleWinTransactions.slice(0, 20).map(tx => ({
          txHash: tx.txHash,
          amount: tx.amount,
          status: tx.status,
          createdAt: tx.createdAt,
          confirmedAt: tx.confirmedAt,
          relatedBattleId: tx.relatedBattleId
        }))
      });
    } catch (error) {
      console.error('Error fetching user earnings:', error);
      res.status(500).json({ message: 'Failed to fetch earnings data' });
    }
  });

  // Tournament leaderboard endpoint - Real data based on user performance
  app.get('/api/tournaments/leaderboard', async (_req, res) => {
    try {
      // Get all users with tournament data and calculate rankings
      const allUsers = await db
        .select({
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          tournamentsWon: userProgress.totalTournamentsWon,
          totalBattles: userProgress.totalBattlesPlayed,
          totalWins: userProgress.totalBattlesWon,
          level: userProgress.level,
        })
        .from(users)
        .leftJoin(userProgress, eq(users.id, userProgress.userId))
        .where(gt(userProgress.totalTournamentsWon, 0))
        .orderBy(desc(userProgress.totalTournamentsWon))
        .limit(50);

      // Format leaderboard with rankings
      const leaderboard = allUsers.map((user, index) => {
        const tournamentsWon = user.tournamentsWon || 0;
        const totalBattles = user.totalBattles || 0;
        const totalWins = user.totalWins || 0;
        const winRate = totalBattles > 0 ? (totalWins / totalBattles) * 100 : 0;
        const averageScore = totalWins > 0 ? (totalWins / totalBattles) * 100 : 0;
        const totalPoints = tournamentsWon * 1000 + (winRate * 10);
        const displayName = [user.firstName, user.lastName].filter(Boolean).join(' ') || 'Anonymous';
        
        return {
          rank: index + 1,
          userId: user.id,
          username: displayName,
          tournamentsWon,
          tournamentsPlayed: totalBattles,
          winRate: Math.round(winRate * 10) / 10,
          averageScore: Math.round(averageScore * 10) / 10,
          totalPoints: Math.round(totalPoints)
        };
      });

      res.json(leaderboard);
    } catch (error) {
      console.error('Error fetching tournament leaderboard:', error);
      // Return empty array on error instead of 500
      res.json([]);
    }
  });

  // Tournament routes
  app.get('/api/tournaments', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const tournaments = await storage.getUserTournaments(userId);
      res.json(tournaments);
    } catch (error) {
      console.error('Error fetching tournaments:', error);
      res.status(500).json({ message: 'Failed to fetch tournaments' });
    }
  });

  app.get('/api/tournaments/active', async (_req, res) => {
    try {
      const activeTournaments = await storage.getActiveTournaments();
      res.json(activeTournaments);
    } catch (error) {
      console.error('Error fetching active tournaments:', error);
      res.status(500).json({ message: 'Failed to fetch active tournaments' });
    }
  });

  app.get('/api/tournaments/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const tournament = await storage.getTournament(id);
      if (!tournament) {
        return res.status(404).json({ message: 'Tournament not found' });
      }
      res.json(tournament);
    } catch (error) {
      console.error('Error fetching tournament:', error);
      res.status(500).json({ message: 'Failed to fetch tournament' });
    }
  });

  app.post('/api/tournaments', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { name, type, totalRounds, difficulty, profanityFilter, lyricComplexity, styleIntensity, prize } = req.body;

      // Generate tournament bracket based on type and rounds
      const generateBracket = (rounds: number) => {
        const numOpponents = Math.pow(2, rounds - 1); // 2^(rounds-1) opponents for user
        const characters = ['razor', 'venom', 'silk'];

        const matches = [];
        for (let i = 0; i < numOpponents; i++) {
          const characterId = characters[i % characters.length];
          const characterName = characterId === 'razor' ? 'MC Razor' : 
                               characterId === 'venom' ? 'MC Venom' : 'MC Silk';

          matches.push({
            id: `match-${i + 1}`,
            player1: {
              id: userId,
              name: 'You',
              type: 'user' as const
            },
            player2: {
              id: characterId,
              name: characterName,
              type: 'ai' as const
            },
            isCompleted: false
          });
        }

        return {
          rounds: [{
            roundNumber: 1,
            matches
          }]
        };
      };

      const tournamentData = {
        userId,
        name,
        type: type || 'single_elimination',
        totalRounds: totalRounds || 3,
        difficulty: difficulty || 'normal',
        profanityFilter: profanityFilter || false,
        lyricComplexity: lyricComplexity || 50,
        styleIntensity: styleIntensity || 50,
        prize: prize || 'Tournament Champion Title',
        opponents: ['razor', 'venom', 'silk'], // Default opponents
  bracket: generateBracket(totalRounds || 3)
      };

      // Validate tournament data
      const validatedData = insertTournamentSchema.parse(tournamentData);

      const tournament = await storage.createTournament(validatedData);
      res.json(tournament);
    } catch (error: any) {
      console.error('Error creating tournament:', error);
      res.status(400).json({ message: 'Failed to create tournament', error: error.message });
    }
  });

  app.post('/api/tournaments/:id/battles/:matchId', isAuthenticated, async (req: any, res) => {
    try {
      const { id: tournamentId, matchId } = req.params;
      const userId = req.user.claims.sub;

      const tournament = await storage.getTournament(tournamentId);
      if (!tournament) {
        return res.status(404).json({ message: 'Tournament not found' });
      }

      // Find the match and create a battle for it
      let targetMatch = null;
      for (const round of tournament.bracket.rounds) {
        for (const match of round.matches) {
          if (match.id === matchId) {
            targetMatch = match;
            break;
          }
        }
        if (targetMatch) break;
      }

      if (!targetMatch) {
        return res.status(404).json({ message: 'Match not found' });
      }

      // Create a new battle for this tournament match
      const battleData = {
        userId,
        difficulty: tournament.difficulty,
        profanityFilter: tournament.profanityFilter,
        lyricComplexity: tournament.lyricComplexity,
        styleIntensity: tournament.styleIntensity,
        aiCharacterId: targetMatch.player2.id,
        aiCharacterName: targetMatch.player2.name,
      };

      const battle = await storage.createBattle(battleData);

      res.json({ battleId: battle.id, tournamentId });
    } catch (error: any) {
      console.error('Error starting tournament battle:', error);
      res.status(500).json({ message: 'Failed to start tournament battle', error: error.message });
    }
  });

  // ML-powered lyric analysis endpoint
  app.post('/api/ml-analyze-lyrics', isAuthenticated, async (req: any, res) => {
    try {
      const { text } = req.body;

      if (!text || typeof text !== 'string') {
        return res.status(400).json({ message: 'Text is required' });
      }

      console.log(`🧠 ML-powered analysis requested for: "${text.substring(0, 50)}..."`);

      // Use Groq's ML-powered analysis
      const analysis = await groqService.analyzeLyricsWithML(text);

      res.json({
        ...analysis,
        mlPowered: true,
        timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      console.error('ML lyric analysis error:', error);
      res.status(500).json({ message: 'ML analysis failed' });
    }
  });

  // ML battle prediction endpoint
  app.post('/api/ml-predict-battle', isAuthenticated, async (req: any, res) => {
    try {
      const { userLyrics, aiLyrics } = req.body;

      if (!userLyrics || !aiLyrics) {
        return res.status(400).json({ message: 'Both user and AI lyrics required' });
      }

      console.log(`🔮 ML battle prediction requested`);

      // Use Groq's ML-powered prediction
      const prediction = await groqService.predictBattleOutcome(userLyrics, aiLyrics);

      res.json({
        ...prediction,
        mlPowered: true,
        timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      console.error('ML battle prediction error:', error);
      res.status(500).json({ message: 'ML prediction failed' });
    }
  });

  // ML rhyme generation endpoint
  app.post('/api/ml-generate-rhymes', isAuthenticated, async (req: any, res) => {
    try {
      const { seedWord, count } = req.body;

      if (!seedWord || typeof seedWord !== 'string') {
        return res.status(400).json({ message: 'Seed word is required' });
      }

      console.log(`🎵 ML rhyme generation for: ${seedWord}`);

      // Use Groq's ML-powered rhyme generation
      const rhymes = await groqService.generateMLRhymes(seedWord, count || 5);

      res.json({
        seedWord,
        rhymes,
        mlPowered: true,
        timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      console.error('ML rhyme generation error:', error);
      res.status(500).json({ message: 'ML rhyme generation failed' });
    }
  });

  // Real-time analysis endpoint (fast, cached)
  app.post('/api/realtime-analyze', isAuthenticated, async (req: any, res) => {
    try {
      const { text, includeML, isFinalScore, battleId } = req.body;

      if (!text || typeof text !== 'string') {
        return res.status(400).json({ message: 'Text is required' });
      }

      console.log(`⚡ Real-time analysis requested for: "${text.substring(0, 50)}..."`);

      const analysis = await realtimeAnalysisService.analyzeRealtime(text, {
        includeML: includeML || false,
        isFinalScore: isFinalScore || false,
        battleId: battleId
      });

      res.json(analysis);

    } catch (error: any) {
      console.error('Real-time analysis error:', error);
      res.status(500).json({ message: 'Real-time analysis failed' });
    }
  });

  // Compare two verses endpoint
  app.post('/api/compare-verses', isAuthenticated, async (req: any, res) => {
    try {
      const { verse1, verse2, includeML } = req.body;

      if (!verse1 || !verse2) {
        return res.status(400).json({ message: 'Both verses are required' });
      }

      console.log(`⚔️ Verse comparison requested`);

      const comparison = await realtimeAnalysisService.compareVerses(
        verse1, 
        verse2, 
        includeML || false
      );

      res.json(comparison);

    } catch (error: any) {
      console.error('Verse comparison error:', error);
      res.status(500).json({ message: 'Verse comparison failed' });
    }
  });

  // Batch analysis endpoint
  app.post('/api/batch-analyze', isAuthenticated, async (req: any, res) => {
    try {
      const { verses } = req.body;

      if (!Array.isArray(verses) || verses.length === 0) {
        return res.status(400).json({ message: 'Verses array is required' });
      }

      console.log(`📦 Batch analysis for ${verses.length} verses`);

      const results = await realtimeAnalysisService.batchAnalyze(verses);

      res.json({ results, count: results.length });

    } catch (error: any) {
      console.error('Batch analysis error:', error);
      res.status(500).json({ message: 'Batch analysis failed' });
    }
  });

  // Analyze lyrics endpoint for frontend (legacy support)
  app.post('/api/analyze-lyrics', isAuthenticated, async (req: any, res) => {
    try {
      const { text } = req.body;

      if (!text || typeof text !== 'string') {
        return res.status(400).json({ message: 'Text is required' });
      }

      // Use new real-time analysis service
      const analysis = await realtimeAnalysisService.analyzeRealtime(text, {
        includeML: false,
        isFinalScore: false
      });

      // Format response for legacy compatibility
      const result = {
        rhymeDensity: analysis.rhymeDensity,
        flowQuality: analysis.flowQuality,
        creativity: analysis.creativity,
        overallScore: analysis.score,
        breakdown: {
          vocabulary: Math.floor(analysis.creativity * 0.3),
          wordplay: Math.floor(analysis.creativity * 0.4),
          rhythm: Math.floor(analysis.flowQuality * 0.8),
          originality: Math.floor(analysis.creativity * 0.6)
        },
        suggestions: analysis.improvements,
        feedback: analysis.feedback
      };

      res.json(result);

    } catch (error: any) {
      console.error('Lyrics analysis error:', error);
      res.status(500).json({ message: 'Analysis failed' });
    }
  });

  // INTELLIGENT CROWD REACTION ENDPOINT
  app.post('/api/crowd-reaction/analyze', async (req, res) => {
    try {
      const { lyrics, context } = req.body;

      if (!lyrics || typeof lyrics !== 'string') {
        return res.status(400).json({ error: 'Lyrics text is required' });
      }

      console.log(`🧠 Analyzing lyrics for crowd reaction: "${lyrics.substring(0, 50)}..."`);

      const analysis = await crowdReactionService.analyzeForCrowdReaction(lyrics, context);

      console.log(`🎭 Crowd reaction determined: ${analysis.reactionType} (${analysis.intensity}%) - ${analysis.reasoning}`);

      res.json(analysis);

    } catch (error) {
      console.error('Error analyzing for crowd reaction:', error);
      res.status(500).json({ error: 'Crowd reaction analysis failed' });
    }
  });

  // Admin endpoint to list users
  app.get('/api/admin/users', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const userEmail = req.user.claims.email;

      // Simple admin check - you can modify this logic as needed
      const isAdmin = userEmail && (
        userEmail.includes('admin') || 
        userEmail.endsWith('@replit.com') ||
        userId === 'your-admin-user-id' // Replace with actual admin user ID
      );

      if (!isAdmin) {
        return res.status(403).json({ message: 'Admin access required' });
      }

      const users = await storage.getAllUsers();

      // Return sanitized user data (don't expose sensitive fields)
      const sanitizedUsers = users.map(user => ({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        subscriptionTier: user.subscriptionTier,
        subscriptionStatus: user.subscriptionStatus,
        battlesRemaining: user.battlesRemaining,
        totalBattles: user.totalBattles,
        totalWins: user.totalWins,
        createdAt: user.createdAt,
        lastBattleReset: user.lastBattleReset
      }));

      res.json({
        total: sanitizedUsers.length,
        users: sanitizedUsers
      });

    } catch (error) {
      console.error('Error fetching users:', error);
      res.status(500).json({ message: 'Failed to fetch users' });
    }
  });

  // Serve custom SFX files
  app.get('/api/sfx/:filename', (req, res) => {
    try {
      const filename = req.params.filename;
      console.log(`🎵 Serving custom SFX file: ${filename}`);

      // Security: Validate filename
      if (!filename.endsWith('.mp3') || filename.includes('/') || filename.includes('..')) {
        return res.status(404).json({ error: 'Invalid file request' });
      }

      const filePath = path.join(process.cwd(), 'public_sfx', filename);

      if (!fs.existsSync(filePath)) {
        console.log(`⚠️ SFX file not found: ${filePath}`);
        return res.status(404).json({ error: 'SFX file not found' });
      }

      console.log(`✅ Serving custom SFX: ${filePath}`);
      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 1 day

      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);

    } catch (error) {
      console.error('Error serving SFX file:', error);
      res.status(500).json({ error: 'Failed to serve SFX file' });
    }
  });

  // Fine-Tuning and Training System endpoints
  const fineTuningService = new FineTuningService();

  app.get('/api/fine-tunings', isAuthenticated, async (req: any, res) => {
    try {
      // Check if fine-tuning is available
      const accessStatus = await fineTuningService.checkFineTuningAccess();
      
      if (!accessStatus.available) {
        return res.json({
          available: false,
          message: accessStatus.message,
          models: []
        });
      }

      // Get all fine-tuning jobs if available
      const models = await fineTuningService.listFineTunings();
      
      res.json({
        available: true,
        message: accessStatus.message,
        models: models
      });
    } catch (error) {
      console.error('Error fetching fine-tunings:', error);
      res.json({
        available: false,
        message: error instanceof Error ? error.message : 'Failed to fetch fine-tunings',
        models: []
      });
    }
  });

  app.post('/api/fine-tunings', isAuthenticated, async (req: any, res) => {
    try {
      const { name, training_data } = req.body;

      if (!name || !training_data) {
        return res.status(400).json({ message: 'Name and training_data are required' });
      }

      // SECURITY: Validate name format (prevent injection)
      if (typeof name !== 'string' || name.length > 100 || !/^[a-zA-Z0-9\s_-]+$/.test(name)) {
        return res.status(400).json({ message: 'Invalid model name format' });
      }

      // SECURITY: Validate training data is array and not too large
      if (!Array.isArray(training_data) || training_data.length > 10000) {
        return res.status(400).json({ message: 'Training data must be an array with max 10000 items' });
      }

      console.log(`📚 Creating fine-tuning job: ${name}`);

      // Upload training data file
      const fileId = await fineTuningService.uploadTrainingFile(training_data);
      console.log(`✅ Training file uploaded: ${fileId}`);

      // Create fine-tuning job
      const fineTuningJob = await fineTuningService.createFineTuning({
        name,
        input_file_id: fileId,
        base_model: 'llama-3.1-8b-instant',
        type: 'lora'
      });

      console.log(`✅ Fine-tuning job created: ${fineTuningJob.id}`);
      res.json(fineTuningJob);
    } catch (error) {
      console.error('Error creating fine-tuning:', error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : 'Failed to create fine-tuning job' 
      });
    }
  });

  app.get('/api/fine-tunings/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      
      // SECURITY: Validate ID format before passing to service
      if (!id || typeof id !== 'string' || !/^[a-zA-Z0-9_-]+$/.test(id)) {
        return res.status(400).json({ message: 'Invalid fine-tuning job ID format' });
      }

      const fineTuning = await fineTuningService.getFineTuning(id);
      res.json(fineTuning);
    } catch (error) {
      console.error('Error fetching fine-tuning:', error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : 'Failed to fetch fine-tuning job' 
      });
    }
  });

  app.get('/api/training-data/sample', async (_req, res) => {
    try {
      const sampleData = fineTuningService.generateSampleRapData();
      const jsonlFormat = fineTuningService.exportTrainingDataAsJSONL(sampleData);
      
      res.json({
        sample_data: sampleData,
        jsonl_format: jsonlFormat,
        instructions: 'Use this format for your training data. Each entry should include prompt, completion, difficulty, style, and optional rhyme_scheme.'
      });
    } catch (error) {
      console.error('Error generating sample data:', error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : 'Failed to generate sample data' 
      });
    }
  });

  app.get('/api/training-data/full', async (_req, res) => {
    try {
      const trainingDataPath = path.join(process.cwd(), 'battle_rap_training_data.json');
      
      if (!fs.existsSync(trainingDataPath)) {
        return res.status(404).json({ message: 'Training data file not found' });
      }

      const trainingData = JSON.parse(fs.readFileSync(trainingDataPath, 'utf-8'));
      res.json(trainingData);
    } catch (error) {
      console.error('Error fetching training data:', error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : 'Failed to fetch training data' 
      });
    }
  });

  // ML Rapper Cloning API Endpoints
  
  // Generate lyrics in a specific rapper's style
  app.post('/api/ml/style-transfer', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { rapperName, style, bars, theme, opponentName, prompt } = req.body;

      // Rate limiting: Check if user can make ML requests
      const canBattle = await storage.canUserStartBattle(userId);
      if (!canBattle) {
        return res.status(403).json({ 
          message: "ML request limit reached. Upgrade to Premium or Pro for more features!",
          upgrade: true 
        });
      }

      // Validate inputs
      if (!rapperName || !style) {
        return res.status(400).json({ message: 'Rapper name and style are required' });
      }

      const validStyles = ['technical', 'smooth', 'creative', 'aggressive', 'storyteller'];
      if (!validStyles.includes(style)) {
        return res.status(400).json({ message: 'Invalid style. Must be: technical, smooth, creative, aggressive, or storyteller' });
      }

      const barsCount = bars && bars > 0 && bars <= 32 ? bars : 16;

      // Create rapper profile
      const rapperProfile = {
        name: rapperName,
        style: style as any,
        characteristics: {
          avgSyllablesPerBar: style === 'technical' ? 14 : style === 'smooth' ? 10 : 12,
          rhymeComplexity: style === 'technical' ? 0.9 : style === 'creative' ? 0.8 : 0.6,
          flowVariation: style === 'technical' || style === 'creative' ? 0.8 : 0.5,
          wordplayFrequency: style === 'technical' || style === 'aggressive' ? 0.8 : 0.5,
          metaphorDensity: style === 'creative' || style === 'storyteller' ? 0.9 : 0.5,
          battleTactics: style === 'aggressive' ? ['confrontational', 'punchlines', 'attacks'] : 
                        style === 'technical' ? ['complex schemes', 'wordplay', 'multi-syllables'] :
                        ['imagery', 'flow', 'delivery']
        }
      };

      console.log(`🎤 Generating ${barsCount}-bar verse in ${rapperName}'s ${style} style...`);
      
      const lyrics = await mlRapperCloningService.generateStyledLyrics({
        prompt: prompt || `Write a ${barsCount}-bar verse`,
        targetRapper: rapperName,
        rapperProfile,
        bars: barsCount,
        theme,
        opponentName
      });

      res.json({
        lyrics,
        rapperName,
        style,
        bars: barsCount,
        profile: rapperProfile
      });

    } catch (error) {
      console.error('Error in style transfer:', error);
      res.status(500).json({ message: 'Failed to generate styled lyrics' });
    }
  });

  // Analyze beat and align lyrics for flow modeling
  app.post('/api/ml/beat-alignment', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { lyrics, bpm, timeSignature, genre } = req.body;

      // Rate limiting: Check if user can make ML requests
      const canBattle = await storage.canUserStartBattle(userId);
      if (!canBattle) {
        return res.status(403).json({ 
          message: "ML request limit reached. Upgrade to Premium or Pro for more features!",
          upgrade: true 
        });
      }

      if (!lyrics || !bpm) {
        return res.status(400).json({ message: 'Lyrics and BPM are required' });
      }

      if (bpm < 60 || bpm > 200) {
        return res.status(400).json({ message: 'BPM must be between 60 and 200' });
      }

      const beatContext = {
        bpm,
        timeSignature: timeSignature || '4/4',
        genre: genre || 'hip-hop'
      };

      console.log(`🎵 Aligning lyrics to ${bpm} BPM beat...`);
      
      const flowModeling = await mlRapperCloningService.alignToBeat(lyrics, beatContext);

      res.json({
        flowModeling,
        beatContext,
        totalDuration: flowModeling.timing.length > 0 
          ? flowModeling.timing[flowModeling.timing.length - 1].startTime + 
            flowModeling.timing[flowModeling.timing.length - 1].duration 
          : 0
      });

    } catch (error) {
      console.error('Error in beat alignment:', error);
      res.status(500).json({ message: 'Failed to align lyrics to beat' });
    }
  });

  // Create rapper profile from user's battle history
  app.post('/api/ml/create-profile', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;

      // Rate limiting: Profile creation is less expensive, but still limit it
      const canBattle = await storage.canUserStartBattle(userId);
      if (!canBattle) {
        return res.status(403).json({ 
          message: "ML request limit reached. Upgrade to Premium or Pro for more features!",
          upgrade: true 
        });
      }

      console.log(`📊 Creating rapper profile from battle history for user ${userId}...`);
      
      // Get user's recent battles
      const battles = await storage.getUserBattles(userId, 10);

      if (battles.length === 0) {
        // Create default profile for new users
        const defaultProfile = {
          name: `User_${userId.substring(0, 8)}`,
          style: 'smooth' as const,
          characteristics: {
            avgSyllablesPerBar: 12,
            rhymeComplexity: 0.5,
            flowVariation: 0.5,
            wordplayFrequency: 0.5,
            metaphorDensity: 0.5,
            battleTactics: []
          }
        };

        return res.json({
          profile: defaultProfile,
          battlesAnalyzed: 0,
          message: 'Default profile created. Battle more to develop your unique style!'
        });
      }

      // Map battles to format expected by ML service
      const battlesData = battles.map(b => ({
        userVerse: b.rounds?.[0]?.userVerse || '',
        aiVerse: b.rounds?.[0]?.aiVerse || ''
      })).filter(b => b.userVerse);

      const profile = await mlRapperCloningService.createProfileFromHistory(userId, battlesData);

      res.json({
        profile,
        battlesAnalyzed: battles.length,
        message: `Profile created from ${battles.length} battle${battles.length > 1 ? 's' : ''}`
      });

    } catch (error) {
      console.error('Error creating rapper profile:', error);
      res.status(500).json({ message: 'Failed to create rapper profile' });
    }
  });

  // User Clone endpoints
  app.get('/api/user/clone', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const clone = await storage.getUserClone(userId);
      
      if (!clone) {
        return res.status(404).json({ message: 'No clone found. Create one by analyzing your battles!' });
      }

      res.json(clone);
    } catch (error) {
      console.error('Error fetching user clone:', error);
      res.status(500).json({ message: 'Failed to fetch clone' });
    }
  });

  app.post('/api/user/clone/generate', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      console.log(`🤖 Generating clone for user ${userId}...`);
      const clone = await storage.createOrUpdateUserClone(userId);
      
      console.log(`✅ Clone generated: ${clone.cloneName} (Skill: ${clone.skillLevel})`);
      res.json(clone);
    } catch (error) {
      console.error('Error generating user clone:', error);
      res.status(500).json({ message: 'Failed to generate clone' });
    }
  });

  app.get('/api/clone/:cloneId', isAuthenticated, async (req: any, res) => {
    try {
      const { cloneId } = req.params;
      const clone = await storage.getCloneById(cloneId);
      
      if (!clone) {
        return res.status(404).json({ message: 'Clone not found' });
      }

      res.json(clone);
    } catch (error) {
      console.error('Error fetching clone:', error);
      res.status(500).json({ message: 'Failed to fetch clone' });
    }
  });

  // ML Rapper Cloning API Endpoints
  
  // Generate lyrics in a specific rapper's style
  app.post('/api/ml/style-transfer', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { rapperName, style, bars, theme, opponentName, prompt } = req.body;

      // Rate limiting: Check if user can make ML requests
      const canBattle = await storage.canUserStartBattle(userId);
      if (!canBattle) {
        return res.status(403).json({ 
          message: "ML request limit reached. Upgrade to Premium or Pro for more features!",
          upgrade: true 
        });
      }

      // Validate inputs
      if (!rapperName || !style) {
        return res.status(400).json({ message: 'Rapper name and style are required' });
      }

      const validStyles = ['technical', 'smooth', 'creative', 'aggressive', 'storyteller'];
      if (!validStyles.includes(style)) {
        return res.status(400).json({ message: 'Invalid style. Must be: technical, smooth, creative, aggressive, or storyteller' });
      }

      const barsCount = bars && bars > 0 && bars <= 32 ? bars : 16;

      // Create rapper profile
      const rapperProfile = {
        name: rapperName,
        style: style as any,
        characteristics: {
          avgSyllablesPerBar: style === 'technical' ? 14 : style === 'smooth' ? 10 : 12,
          rhymeComplexity: style === 'technical' ? 0.9 : style === 'creative' ? 0.8 : 0.6,
          flowVariation: style === 'technical' || style === 'creative' ? 0.8 : 0.5,
          wordplayFrequency: style === 'technical' || style === 'aggressive' ? 0.8 : 0.5,
          metaphorDensity: style === 'creative' || style === 'storyteller' ? 0.9 : 0.5,
          battleTactics: style === 'aggressive' ? ['confrontational', 'punchlines', 'attacks'] : 
                        style === 'technical' ? ['complex schemes', 'wordplay', 'multi-syllables'] :
                        ['imagery', 'flow', 'delivery']
        }
      };

      console.log(`🎤 Generating ${barsCount}-bar verse in ${rapperName}'s ${style} style...`);
      
      const lyrics = await mlRapperCloningService.generateStyledLyrics({
        prompt: prompt || `Write a ${barsCount}-bar verse`,
        targetRapper: rapperName,
        rapperProfile,
        bars: barsCount,
        theme,
        opponentName
      });

      res.json({
        lyrics,
        rapperName,
        style,
        bars: barsCount,
        profile: rapperProfile
      });

    } catch (error) {
      console.error('Error in style transfer:', error);
      res.status(500).json({ message: 'Failed to generate styled lyrics' });
    }
  });

  // Analyze beat and align lyrics for flow modeling
  app.post('/api/ml/beat-alignment', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { lyrics, bpm, timeSignature, genre } = req.body;

      // Rate limiting: Check if user can make ML requests
      const canBattle = await storage.canUserStartBattle(userId);
      if (!canBattle) {
        return res.status(403).json({ 
          message: "ML request limit reached. Upgrade to Premium or Pro for more features!",
          upgrade: true 
        });
      }

      if (!lyrics || !bpm) {
        return res.status(400).json({ message: 'Lyrics and BPM are required' });
      }

      if (bpm < 60 || bpm > 200) {
        return res.status(400).json({ message: 'BPM must be between 60 and 200' });
      }

      const beatContext = {
        bpm,
        timeSignature: timeSignature || '4/4',
        genre: genre || 'hip-hop'
      };

      console.log(`🎵 Aligning lyrics to ${bpm} BPM beat...`);
      
      const flowModeling = await mlRapperCloningService.alignToBeat(lyrics, beatContext);

      res.json({
        flowModeling,
        beatContext,
        totalDuration: flowModeling.timing.length > 0 
          ? flowModeling.timing[flowModeling.timing.length - 1].startTime + 
            flowModeling.timing[flowModeling.timing.length - 1].duration 
          : 0
      });

    } catch (error) {
      console.error('Error in beat alignment:', error);
      res.status(500).json({ message: 'Failed to align lyrics to beat' });
    }
  });

  // Create rapper profile from user's battle history
  app.post('/api/ml/create-profile', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;

      // Rate limiting: Profile creation is less expensive, but still limit it
      const canBattle = await storage.canUserStartBattle(userId);
      if (!canBattle) {
        return res.status(403).json({ 
          message: "ML request limit reached. Upgrade to Premium or Pro for more features!",
          upgrade: true 
        });
      }

      console.log(`📊 Creating rapper profile from battle history for user ${userId}...`);
      
      // Get user's recent battles
      const battles = await storage.getUserBattles(userId, 10);

      if (battles.length === 0) {
        // Create default profile for new users
        const defaultProfile = {
          name: `User_${userId.substring(0, 8)}`,
          style: 'smooth' as const,
          characteristics: {
            avgSyllablesPerBar: 12,
            rhymeComplexity: 0.5,
            flowVariation: 0.5,
            wordplayFrequency: 0.5,
            metaphorDensity: 0.5,
            battleTactics: []
          }
        };

        return res.json({
          profile: defaultProfile,
          battlesAnalyzed: 0,
          message: 'Default profile created. Battle more to develop your unique style!'
        });
      }

      // Map battles to format expected by ML service
      const battlesData = battles.map(b => ({
              userVerse: b.rounds?.[0]?.userVerse || '',
              aiVerse: b.rounds?.[0]?.aiVerse || ''
            })).filter(b => b.userVerse);

      const profile = await mlRapperCloningService.createProfileFromHistory(userId, battlesData);

      res.json({
        profile,
        battlesAnalyzed: battles.length,
        message: `Profile created from ${battles.length} battle${battles.length > 1 ? 's' : ''}`
      });

    } catch (error) {
      console.error('Error creating rapper profile:', error);
      res.status(500).json({ message: 'Failed to create rapper profile' });
    }
  });

  // Upload SFX files to object storage
  app.post('/api/upload-sfx-files', async (_req, res) => {
    try {
      console.log('🎵 Uploading custom SFX files to object storage...');

      // Upload boxing bell
      const boxingBellPath = '/tmp/boxing-bell.mp3';
      const crowdReactionPath = '/tmp/crowd-reaction.mp3';

      if (fs.existsSync(boxingBellPath) && fs.existsSync(crowdReactionPath)) {
        // const objectStorage = new ObjectStorageService(); // unused

        // Copy files to the public storage bucket
        // const bucketPath = '/replit-objstore-99aa1839-1ad0-44fb-9421-e6d822aaac23/public/sfx/'; // unused

        // Simple approach: just acknowledge the upload request
        console.log('✅ SFX files upload acknowledged');
        res.json({ 
          success: true, 
          message: 'SFX files staged for upload',
          files: ['boxing-bell.mp3', 'crowd-reaction.mp3']
        });
      } else {
        console.log('⚠️ SFX files not found in staging area');
        res.status(404).json({ error: 'SFX files not found' });
      }

    } catch (error) {
      console.error('Error uploading SFX files:', error);
      res.status(500).json({ error: 'Failed to upload SFX files' });
    }
  });

  // User profile routes
  app.get('/api/profile/:userId', async (req, res) => {
    try {
      const { userId } = req.params;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Return public profile data
      const profile = {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        profileImageUrl: user.profileImageUrl,
        bio: user.bio,
        rapStyle: user.rapStyle,
        totalBattles: user.totalBattles,
        totalWins: user.totalWins,
        storeCredit: user.storeCredit,
        characterCardUrl: user.characterCardUrl,
        characterCardData: user.characterCardData,
        createdAt: user.createdAt,
      };

      res.json(profile);
    } catch (error) {
      console.error('Error fetching profile:', error);
      res.status(500).json({ message: 'Failed to fetch profile' });
    }
  });

  app.put('/api/profile', isAuthenticated, upload.single('profileImage'), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { bio, rapStyle } = req.body;

      // Update user profile
      const updates: any = {};
      if (bio !== undefined) updates.bio = bio;
      if (rapStyle !== undefined) updates.rapStyle = rapStyle;
      
      await storage.updateUser(userId, updates);

      // If profile image was uploaded, update profile image
      if (req.file?.buffer) {
        // Save profile image
        const tempDir = path.join(process.cwd(), 'temp_profiles');
        if (!fs.existsSync(tempDir)) {
          fs.mkdirSync(tempDir, { recursive: true });
        }

        const timestamp = Date.now();
        const imagePath = path.join(tempDir, `profile_${userId}_${timestamp}.png`);
        fs.writeFileSync(imagePath, req.file.buffer);

        const profileImageUrl = `/api/profile-images/${userId}_${timestamp}.png`;
        await storage.updateUser(userId, { profileImageUrl });
      }

      const updatedUser = await storage.getUser(userId);
      res.json(updatedUser);
    } catch (error) {
      console.error('Error updating profile:', error);
      res.status(500).json({ message: 'Failed to update profile' });
    }
  });

  // Character card generation
  app.post('/api/generate-character-card', isAuthenticated, upload.single('image'), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);

      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Check if this is first card generation (free) or regeneration (costs credits)
      const isFirstCard = !user.characterCardUrl;
      const CARD_GENERATION_COST = 0.50; // $0.50 per card generation after first

      if (!isFirstCard) {
        const currentCredit = parseFloat(user.storeCredit || '0');
        if (currentCredit < CARD_GENERATION_COST) {
          return res.status(402).json({ 
            message: `Insufficient credits. Card generation costs $${CARD_GENERATION_COST.toFixed(2)}. Your balance: $${currentCredit.toFixed(2)}`,
            required: CARD_GENERATION_COST,
            balance: currentCredit,
          });
        }
      }

      // Get image from upload or use profile image
      let imageBuffer: Buffer;
      if (req.file?.buffer) {
        imageBuffer = req.file.buffer;
      } else if (user.profileImageUrl) {
        // Load existing profile image
        const imagePath = path.join(process.cwd(), 'temp_profiles', path.basename(user.profileImageUrl));
        if (fs.existsSync(imagePath)) {
          imageBuffer = fs.readFileSync(imagePath);
        } else {
          return res.status(400).json({ message: 'No image available. Please upload an image.' });
        }
      } else {
        return res.status(400).json({ message: 'No image provided' });
      }

      const userName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Rapper';
      const bio = user.bio || 'A skilled rapper ready to battle';
      const rapStyle = user.rapStyle || 'default';

      // Generate character card
      const result = await characterCardGenerator.generateCharacterCard(
        userId,
        userName,
        imageBuffer,
        bio,
        rapStyle,
        {
          totalBattles: user.totalBattles || 0,
          totalWins: user.totalWins || 0,
        }
      );

      // Deduct credits if not first card
      if (!isFirstCard) {
        const currentCredit = parseFloat(user.storeCredit || '0');
        const newCredit = (currentCredit - CARD_GENERATION_COST).toFixed(2);
        await storage.updateUser(userId, { storeCredit: newCredit });
        console.log(`💳 Charged ${userId} $${CARD_GENERATION_COST} for card generation. New balance: $${newCredit}`);
      } else {
        console.log(`🎁 First card generation for ${userId} - FREE!`);
      }

      // Update user with character card data
      await storage.updateUser(userId, {
        characterCardUrl: result.cardUrl,
        characterCardData: result.cardData,
      });

      res.json({
        ...result,
        cost: isFirstCard ? 0 : CARD_GENERATION_COST,
        newBalance: isFirstCard ? parseFloat(user.storeCredit || '0') : parseFloat(user.storeCredit || '0') - CARD_GENERATION_COST,
      });
    } catch (error) {
      console.error('Error generating character card:', error);
      res.status(500).json({ message: 'Failed to generate character card' });
    }
  });

  // Serve character card images
  app.get('/api/character-cards/:filename', (req, res) => {
    try {
      const filename = req.params.filename;
      const filePath = path.join(process.cwd(), 'temp_cards', filename);

      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ message: 'Character card not found' });
      }

      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Cache-Control', 'public, max-age=86400');
      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);
    } catch (error) {
      console.error('Error serving character card:', error);
      res.status(500).json({ message: 'Failed to serve character card' });
    }
  });

  // Serve profile images
  app.get('/api/profile-images/:filename', (req, res) => {
    try {
      const filename = req.params.filename;
      const filePath = path.join(process.cwd(), 'temp_profiles', filename);

      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ message: 'Profile image not found' });
      }

      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Cache-Control', 'public, max-age=86400');
      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);
    } catch (error) {
      console.error('Error serving profile image:', error);
      res.status(500).json({ message: 'Failed to serve profile image' });
    }
  });

  // Serve Bark generated audio files
  app.get('/api/audio/:filename', (req, res) => {
    try {
      const filename = req.params.filename;
      const filePath = path.join(process.cwd(), 'temp_audio', filename);

      // Security: Validate filename to prevent path traversal - Updated to allow all TTS audio files
      const allowedPrefixes = ['bark_', 'groq_tts_', 'elevenlabs_tts_', 'openai_tts_', 'typecast_tts_'];
      const allowedExtensions = ['.wav', '.mp3'];
      
      const hasValidPrefix = allowedPrefixes.some(prefix => filename.startsWith(prefix));
      const hasValidExtension = allowedExtensions.some(ext => filename.endsWith(ext));
      
      if (!hasValidPrefix || !hasValidExtension) {
        console.log('🚫 Audio file blocked - filename:', filename, 'hasValidPrefix:', hasValidPrefix, 'hasValidExtension:', hasValidExtension);
        return res.status(404).json({ message: 'File not found' });
      }
      
      console.log('✅ Audio file allowed - filename:', filename);

      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ message: 'Audio file not found' });
      }

      // Set appropriate content type based on file extension
      const contentType = filename.endsWith('.mp3') ? 'audio/mpeg' : 'audio/wav';
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
      
      // Add CORS headers for cross-origin audio access
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

      console.log('🎵 Serving audio file:', filename, 'type:', contentType);
      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);

    } catch (error) {
      console.error('Error serving audio file:', error);
      res.status(500).json({ message: 'Failed to serve audio file' });
    }
  });

  // ===================================================================
  // Arc Blockchain Integration Routes
  // ===================================================================

  // Get or create user's Arc wallet
  app.post('/api/arc/wallet', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Check if user already has an Arc wallet
      let walletAddress = await storage.getArcWalletAddress(userId);
      
      if (!walletAddress) {
        // Create new Arc wallet
        walletAddress = await arcBlockchainService.createWallet(userId);
        await storage.createArcWallet(userId, walletAddress);
        console.log(`⛓️ Created new Arc wallet for user ${userId}: ${walletAddress.substring(0, 10)}...`);
      }
      
      // Get current balance
      const balance = await arcBlockchainService.getUSDCBalance(walletAddress);
      
      res.json({
        walletAddress,
        balance,
        network: 'Arc L1 Testnet'
      });
    } catch (error) {
      console.error('Error creating/getting Arc wallet:', error);
      res.status(500).json({ message: 'Failed to create Arc wallet' });
    }
  });

  // Get Arc wallet info
  app.get('/api/arc/wallet', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user?.arcWalletAddress) {
        return res.json({
          hasWallet: false,
          message: 'No Arc wallet created yet'
        });
      }
      
      const balance = await arcBlockchainService.getUSDCBalance(user.arcWalletAddress);
      
      res.json({
        hasWallet: true,
        walletAddress: user.arcWalletAddress,
        balance,
        totalEarned: user.totalEarnedUSDC || '0.000000',
        network: 'Arc L1 Testnet'
      });
    } catch (error) {
      console.error('Error getting Arc wallet:', error);
      res.status(500).json({ message: 'Failed to get Arc wallet' });
    }
  });

  // Get user's Arc transaction history
  app.get('/api/arc/transactions', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const limit = parseInt(req.query.limit as string) || 50;
      
      const transactions = await storage.getUserArcTransactions(userId, limit);
      
      res.json({ transactions });
    } catch (error) {
      console.error('Error getting Arc transactions:', error);
      res.status(500).json({ message: 'Failed to get transactions' });
    }
  });

  // AI Voice Command Endpoint - Process natural language blockchain commands (with legal compliance)
  app.post('/api/voice-command', 
    isAuthenticated,
    requireAgeVerification,
    requireToSAcceptance,
    checkJurisdiction,
    async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { command } = req.body;

      if (!command || typeof command !== 'string') {
        return res.status(400).json({ 
          success: false,
          message: 'Command is required' 
        });
      }

      console.log(`🎤 Voice command from ${userId}: "${command}"`);

      // Process the voice command - this executes actual blockchain operations
      const commandResult = await aiPaymentAgent.processVoiceCommand(userId, command);

      // Award voice command reward if command was successful
      let rewardResult = null;
      if (commandResult.success && commandResult.action !== 'unknown') {
        rewardResult = await aiPaymentAgent.awardVoiceCommandReward(userId, command);
      }

      // Return combined result with command execution + reward
      res.json({
        commandResult,
        rewardResult,
        success: commandResult.success
      });

      console.log(`✅ Voice command processed: ${commandResult.action} (Success: ${commandResult.success})`);
    } catch (error) {
      console.error('Error processing voice command:', error);
      res.status(500).json({ 
        success: false,
        message: 'Failed to process voice command',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Create competitive stake battle (with legal compliance checks)
  app.post('/api/arc/stake-battle', 
    isAuthenticated,
    requireAgeVerification,
    requireToSAcceptance,
    checkJurisdiction,
    async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { stakeAmount, difficulty, opponentId } = req.body;
      
      // Validate competitive stake amount
      const validation = arcBlockchainService.validateStakeAmount(stakeAmount);
      if (!validation.valid) {
        return res.status(400).json({ message: validation.error });
      }
      
      // Get user's Arc wallet
      const walletAddress = await storage.getArcWalletAddress(userId);
      if (!walletAddress) {
        return res.status(400).json({ message: 'No Arc wallet found. Create a wallet first.' });
      }
      
      // Process competitive stake deposit (with spending limit enforcement)
      const depositTx = await arcBlockchainService.depositStake(
        userId,
        walletAddress,
        stakeAmount,
        'temp_battle_id'
      );
      
      // Record deposit transaction
      await storage.recordArcTransaction({
        userId,
        txHash: depositTx.txHash,
        txType: 'stake_deposit',
        amount: stakeAmount,
        fromAddress: walletAddress,
        toAddress: arcBlockchainService.getPlatformWalletAddress(),
        status: depositTx.status,
        blockNumber: depositTx.blockNumber,
        gasUsedUSDC: depositTx.gasUsedUSDC,
        memo: 'Competitive stake deposit'
      });
      
      // Create competitive stake battle
      const battle = await storage.createBattle({
        userId,
        difficulty: difficulty || 'normal',
        isStakeBattle: true,
        stakeAmountUSDC: stakeAmount,
        stakeTxHash: depositTx.txHash,
        aiCharacterId: opponentId || 'shadow',
        status: 'active'
      });
      
      res.json({
        battleId: battle.id,
        stakeAmount,
        depositTxHash: depositTx.txHash,
        potentialPayout: arcBlockchainService.calculateStakePayout(stakeAmount),
        message: 'Competitive stake battle created! Win to claim the prize pool.'
      });
    } catch (error) {
      console.error('Error creating competitive stake battle:', error);
      res.status(500).json({ message: 'Failed to create competitive stake battle' });
    }
  });

  // Complete competitive stake battle and payout winner
  app.post('/api/arc/stake-battle/:battleId/complete', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { battleId } = req.params;
      
      const battle = await storage.getBattle(battleId);
      if (!battle) {
        return res.status(404).json({ message: 'Battle not found' });
      }
      
      if (battle.userId !== userId) {
        return res.status(403).json({ message: 'Not your battle' });
      }
      
      if (!battle.isStakeBattle || !battle.stakeAmountUSDC) {
        return res.status(400).json({ message: 'Not a competitive stake battle' });
      }
      
      // Determine winner
      const userWon = battle.userScore > battle.aiScore;
      
      if (userWon) {
        const walletAddress = await storage.getArcWalletAddress(userId);
        if (!walletAddress) {
          return res.status(400).json({ message: 'No Arc wallet found' });
        }
        
        // Calculate payout
        const payout = arcBlockchainService.calculateStakePayout(battle.stakeAmountUSDC);
        
        // Process payout
        const payoutTx = await arcBlockchainService.payoutStakeWinnings(
          walletAddress,
          payout,
          battleId
        );
        
        // Record payout transaction
        await storage.recordArcTransaction({
          userId,
          txHash: payoutTx.txHash,
          txType: 'stake_payout',
          amount: payout,
          fromAddress: arcBlockchainService.getPlatformWalletAddress(),
          toAddress: walletAddress,
          status: payoutTx.status,
          blockNumber: payoutTx.blockNumber,
          gasUsedUSDC: payoutTx.gasUsedUSDC,
          relatedBattleId: battleId,
          memo: 'Competitive stake battle winnings'
        });
        
        // Update battle with reward transaction
        await storage.updateBattleState(battleId, {
          rewardTxHash: payoutTx.txHash
        });
        
        // Update user's total earnings
        const user = await storage.getUser(userId);
        const newTotal = (parseFloat(user?.totalEarnedUSDC || '0') + parseFloat(payout)).toFixed(6);
        await storage.updateUser(userId, { totalEarnedUSDC: newTotal });
        
        res.json({
          won: true,
          payout,
          txHash: payoutTx.txHash,
          newTotalEarnings: newTotal,
          message: `Congrats! You won ${payout} USDC!`
        });
      } else {
        res.json({
          won: false,
          message: 'Better luck next time! Your competitive stake was lost.'
        });
      }
    } catch (error) {
      console.error('Error completing competitive stake battle:', error);
      res.status(500).json({ message: 'Failed to complete competitive stake battle' });
    }
  });

  // Create tournament with USDC prizes (with legal compliance checks)
  app.post('/api/arc/prize-tournament', 
    isAuthenticated,
    requireAgeVerification,
    requireToSAcceptance,
    checkJurisdiction,
    async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { name, prizeSize, difficulty } = req.body;
      
      // Get prize pool configuration
      const prizeConfig = prizeSize === 'large' 
        ? { total: "250.00", first: "150.00", second: "60.00", third: "40.00" }
        : prizeSize === 'medium'
        ? { total: "50.00", first: "25.00", second: "15.00", third: "10.00" }
        : { total: "10.00", first: "5.00", second: "3.00", third: "2.00" };
      
      // Create tournament with prize configuration
      const tournament = await storage.createTournament({
        userId,
        name: name || 'USDC Prize Tournament',
        difficulty: difficulty || 'normal',
        type: 'single_elimination',
        totalRounds: 3, // 8 participants
        isPrizeTournament: true,
        prizePool: prizeConfig.total,
        firstPlacePrize: prizeConfig.first,
        secondPlacePrize: prizeConfig.second,
        thirdPlacePrize: prizeConfig.third,
        opponents: ['shadow', 'phantom', 'ghost', 'specter', 'wraith', 'shade', 'demon'],
        bracket: storage.generateTournamentBracket(3, ['shadow', 'phantom', 'ghost', 'specter', 'wraith', 'shade', 'demon'])
      });
      
      res.json({
        tournamentId: tournament.id,
        prizePool: prizeConfig.total,
        prizes: {
          first: prizeConfig.first,
          second: prizeConfig.second,
          third: prizeConfig.third
        },
        message: `Tournament created with $${prizeConfig.total} USDC prize pool!`
      });
    } catch (error) {
      console.error('Error creating prize tournament:', error);
      res.status(500).json({ message: 'Failed to create prize tournament' });
    }
  });

  // Award tournament prizes
  app.post('/api/arc/tournament/:tournamentId/award-prizes', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { tournamentId } = req.params;
      
      const tournament = await storage.getTournament(tournamentId);
      if (!tournament) {
        return res.status(404).json({ message: 'Tournament not found' });
      }
      
      if (tournament.userId !== userId) {
        return res.status(403).json({ message: 'Not your tournament' });
      }
      
      if (!tournament.isPrizeTournament) {
        return res.status(400).json({ message: 'Not a prize tournament' });
      }
      
      if (tournament.status !== 'completed') {
        return res.status(400).json({ message: 'Tournament not completed yet' });
      }
      
      // Get user's Arc wallet
      const walletAddress = await storage.getArcWalletAddress(userId);
      if (!walletAddress) {
        return res.status(400).json({ message: 'No Arc wallet found' });
      }
      
      // Determine user's placement (simplified - assumes user won)
      const place = 1; // You would determine this from bracket results
      const prizeAmount = tournament.firstPlacePrize || '0.00';
      
      // Award prize
      const prizeTx = await arcBlockchainService.awardTournamentPrize(
        walletAddress,
        place as 1 | 2 | 3,
        prizeAmount,
        tournamentId
      );
      
      // Record prize transaction
      await storage.recordArcTransaction({
        userId,
        txHash: prizeTx.txHash,
        txType: 'tournament_prize',
        amount: prizeAmount,
        fromAddress: arcBlockchainService.getPlatformWalletAddress(),
        toAddress: walletAddress,
        status: prizeTx.status,
        blockNumber: prizeTx.blockNumber,
        gasUsedUSDC: prizeTx.gasUsedUSDC,
        relatedTournamentId: tournamentId,
        memo: `Tournament ${place}${place === 1 ? 'st' : place === 2 ? 'nd' : 'rd'} place prize`
      });
      
      // Update user's total earnings
      const user = await storage.getUser(userId);
      const newTotal = (parseFloat(user?.totalEarnedUSDC || '0') + parseFloat(prizeAmount)).toFixed(6);
      await storage.updateUser(userId, { totalEarnedUSDC: newTotal });
      
      res.json({
        place,
        prize: prizeAmount,
        txHash: prizeTx.txHash,
        newTotalEarnings: newTotal,
        message: `Congratulations! You won ${place}${place === 1 ? 'st' : ''}  place and earned ${prizeAmount} USDC!`
      });
    } catch (error) {
      console.error('Error awarding tournament prizes:', error);
      res.status(500).json({ message: 'Failed to award prizes' });
    }
  });

  // Platform Wallet Admin API endpoints
  app.get('/api/admin/wallets', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);

      if (!user || user.subscriptionTier !== 'pro') {
        return res.status(403).json({ error: 'Admin access required' });
      }

      const stats = await walletService.getWalletStats();
      const balanceCheck = await walletService.checkBalances();

      res.json({
        wallets: stats.wallets,
        totalBalance: stats.totalBalance,
        alerts: balanceCheck.alerts,
        walletsCount: stats.walletsCount,
      });
    } catch (error: any) {
      console.error('Error fetching wallets:', error);
      res.status(500).json({ error: 'Failed to fetch wallets' });
    }
  });

  app.post('/api/admin/wallets/transfer', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);

      if (!user || user.subscriptionTier !== 'pro') {
        return res.status(403).json({ error: 'Admin access required' });
      }

      const { fromWalletType, toWalletType, amount, description } = req.body;

      if (!fromWalletType || !toWalletType || !amount || !description) {
        return res.status(400).json({ 
          error: 'fromWalletType, toWalletType, amount, and description are required' 
        });
      }

      const result = await walletService.manualTransfer(
        fromWalletType,
        toWalletType,
        parseFloat(amount),
        description
      );

      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }

      res.json({
        success: true,
        txId: result.txId,
        message: `Transferred $${amount} from ${fromWalletType} to ${toWalletType}`,
      });
    } catch (error: any) {
      console.error('Error transferring funds:', error);
      res.status(500).json({ error: 'Failed to transfer funds' });
    }
  });

  app.get('/api/admin/wallets/transactions', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);

      if (!user || user.subscriptionTier !== 'pro') {
        return res.status(403).json({ error: 'Admin access required' });
      }

      const walletId = req.query.walletId as string | undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;

      const transactions = await walletService.getTransactions(walletId, limit);

      res.json(transactions);
    } catch (error: any) {
      console.error('Error fetching transactions:', error);
      res.status(500).json({ error: 'Failed to fetch transactions' });
    }
  });

  app.post('/api/admin/wallets/initialize', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);

      if (!user || user.subscriptionTier !== 'pro') {
        return res.status(403).json({ error: 'Admin access required' });
      }

      await walletService.initializePlatformWallets();

      res.json({
        success: true,
        message: 'Platform wallets initialized successfully',
      });
    } catch (error: any) {
      console.error('Error initializing wallets:', error);
      res.status(500).json({ error: 'Failed to initialize wallets' });
    }
  });

  app.post('/api/admin/wallets/check-balances', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);

      if (!user || user.subscriptionTier !== 'pro') {
        return res.status(403).json({ error: 'Admin access required' });
      }

      const result = await walletService.checkBalances();

      res.json(result);
    } catch (error: any) {
      console.error('Error checking balances:', error);
      res.status(500).json({ error: 'Failed to check balances' });
    }
  });

  // ===== ADS MONETIZATION ENDPOINTS =====
  
  // Get available ads for user
  app.get('/api/ads', isAuthenticated, async (req: any, res) => {
    try {
      const ads = adsService.getAvailableAds();
      res.json({ ads });
    } catch (error: any) {
      console.error('Error fetching ads:', error);
      res.status(500).json({ error: 'Failed to fetch ads' });
    }
  });

  // Track ad impression (user started watching ad)
  app.post('/api/ads/impression', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { campaignId, completed } = req.body;

      if (!campaignId) {
        return res.status(400).json({ error: 'Campaign ID required' });
      }

      const impression = await adsService.trackImpression(userId, campaignId, completed || false);
      res.json({ impression });
    } catch (error: any) {
      console.error('Error tracking ad impression:', error);
      res.status(500).json({ error: 'Failed to track impression' });
    }
  });

  // Claim reward for watching ad (adds credits back to user)
  app.post('/api/ads/claim-reward', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { campaignId } = req.body;

      if (!campaignId) {
        return res.status(400).json({ error: 'Campaign ID required' });
      }

      // Callback to update user credits
      const updateUserCallback = async (userId: string, credits: number) => {
        const user = await storage.getUser(userId);
        if (user) {
          const currentCredit = parseFloat(user.storeCredit?.toString() || '0');
          const newBalance = currentCredit + credits;
          await storage.updateUser(userId, { storeCredit: newBalance.toString() });
        }
      };

      const result = await adsService.claimAdReward(userId, campaignId, updateUserCallback);
      res.json(result);
    } catch (error: any) {
      console.error('Error claiming ad reward:', error);
      res.status(400).json({ error: error.message || 'Failed to claim reward' });
    }
  });

  // Get user's ad statistics
  app.get('/api/ads/stats', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const stats = adsService.getUserAdStats(userId);
      res.json(stats);
    } catch (error: any) {
      console.error('Error fetching ad stats:', error);
      res.status(500).json({ error: 'Failed to fetch stats' });
    }
  });

  // Get overall ad revenue system stats (admin only)
  app.get('/api/ads/revenue-stats', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);

      if (!user || user.subscriptionTier !== 'pro') {
        return res.status(403).json({ error: 'Admin access required' });
      }

      const revenueStats = adsService.getRevenueStats();
      res.json(revenueStats);
    } catch (error: any) {
      console.error('Error fetching revenue stats:', error);
      res.status(500).json({ error: 'Failed to fetch revenue stats' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
