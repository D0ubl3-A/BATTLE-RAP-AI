import { db } from "../db";
import { platformWallets, walletTransactions, type PlatformWallet, type WalletTransaction } from "@shared/schema";
import { eq, desc, sql } from "drizzle-orm";

export class WalletService {
  private async getRewardsPoolWallet(): Promise<PlatformWallet> {
    let wallet = await this.getWallet('rewards_pool');

    if (!wallet) {
      await this.initializePlatformWallets();
      wallet = await this.getWallet('rewards_pool');
    }

    if (!wallet) {
      throw new Error('Rewards pool wallet not initialized');
    }

    return wallet;
  }

  async recordRewardsFunding(amount: string, description: string, metadata?: any): Promise<string> {
    const rewardsPool = await this.getRewardsPoolWallet();

    return this.recordTransaction(
      rewardsPool.id,
      'deposit',
      parseFloat(amount).toFixed(6),
      description,
      metadata
    );
  }

  async getRewardsPoolBalance(): Promise<string> {
    const rewardsPool = await this.getRewardsPoolWallet();
    return rewardsPool.balance;
  }

  async recordRewardsPayout(
    amount: string,
    description: string,
    metadata?: any,
    userId?: string,
    txHash?: string
  ): Promise<string> {
    const rewardsPool = await this.getRewardsPoolWallet();
    const balance = parseFloat(rewardsPool.balance);
    const payoutAmount = parseFloat(amount);

    if (balance < payoutAmount) {
      throw new Error(`Rewards pool balance insufficient. Balance: $${rewardsPool.balance}`);
    }

    return this.recordTransaction(
      rewardsPool.id,
      'reward_payout',
      `-${payoutAmount.toFixed(6)}`,
      description,
      metadata,
      userId,
      txHash
    );
  }

  async checkBalances(): Promise<{ alerts: string[]; balances: Record<string, string> }> {
    const allWallets = await db.select().from(platformWallets).where(eq(platformWallets.isActive, true));
    
    const alerts: string[] = [];
    const balances: Record<string, string> = {};

    for (const wallet of allWallets) {
      balances[wallet.walletType] = wallet.balance;

      if (wallet.minBalance && parseFloat(wallet.balance) < parseFloat(wallet.minBalance)) {
        const alert = `⚠️ Low balance alert: ${wallet.walletType} wallet has $${wallet.balance} (minimum: $${wallet.minBalance})`;
        alerts.push(alert);
        console.warn(alert);
        
        await this.alertLowBalance(wallet.walletType, wallet.balance, wallet.minBalance);
      }
    }

    return { alerts, balances };
  }

  async alertLowBalance(walletType: string, currentBalance: string, minBalance: string): Promise<void> {
    console.error(`🚨 LOW BALANCE ALERT: ${walletType}`);
    console.error(`   Current: $${currentBalance}`);
    console.error(`   Minimum: $${minBalance}`);
    console.error(`   Action Required: Add funds to ${walletType} wallet`);
  }

  async transferProfits(fromWalletType: string = 'rewards_pool', toWalletType: string = 'company_profit', threshold: number = 1000): Promise<{ transferred: boolean; amount?: string; txId?: string }> {
    const [fromWallet] = await db
      .select()
      .from(platformWallets)
      .where(eq(platformWallets.walletType, fromWalletType));

    if (!fromWallet) {
      throw new Error(`Wallet ${fromWalletType} not found`);
    }

    const currentBalance = parseFloat(fromWallet.balance);

    if (currentBalance <= threshold) {
      console.log(`💰 No profit transfer needed. Balance $${currentBalance} <= threshold $${threshold}`);
      return { transferred: false };
    }

    const transferAmount = currentBalance - threshold;

    const [toWallet] = await db
      .select()
      .from(platformWallets)
      .where(eq(platformWallets.walletType, toWalletType));

    if (!toWallet) {
      throw new Error(`Wallet ${toWalletType} not found`);
    }

    const newFromBalance = threshold.toFixed(6);
    const newToBalance = (parseFloat(toWallet.balance) + transferAmount).toFixed(6);

    await db
      .update(platformWallets)
      .set({
        balance: newFromBalance,
        updatedAt: new Date(),
      })
      .where(eq(platformWallets.id, fromWallet.id));

    await db
      .update(platformWallets)
      .set({
        balance: newToBalance,
        updatedAt: new Date(),
      })
      .where(eq(platformWallets.id, toWallet.id));

    const txId = await this.recordTransaction(
      fromWallet.id,
      'profit_transfer',
      `-${transferAmount.toFixed(6)}`,
      `Automatic profit transfer to ${toWalletType}`,
      { toWalletId: toWallet.id, toWalletType }
    );

    await this.recordTransaction(
      toWallet.id,
      'profit_transfer',
      transferAmount.toFixed(6),
      `Automatic profit transfer from ${fromWalletType}`,
      { fromWalletId: fromWallet.id, fromWalletType }
    );

    console.log(`💸 Transferred $${transferAmount.toFixed(2)} from ${fromWalletType} to ${toWalletType}`);

    return {
      transferred: true,
      amount: transferAmount.toFixed(6),
      txId,
    };
  }

  async recordTransaction(
    walletId: string,
    txType: 'deposit' | 'withdrawal' | 'reward_payout' | 'profit_transfer',
    amount: string,
    description: string,
    metadata?: any,
    userId?: string,
    txHash?: string
  ): Promise<string> {
    const [wallet] = await db
      .select()
      .from(platformWallets)
      .where(eq(platformWallets.id, walletId));

    if (!wallet) {
      throw new Error(`Wallet ${walletId} not found`);
    }

    const balanceBefore = wallet.balance;
    const amountNum = parseFloat(amount);
    const balanceAfter = (parseFloat(balanceBefore) + amountNum).toFixed(6);

    const [transaction] = await db
      .insert(walletTransactions)
      .values({
        walletId,
        txType,
        amount,
        balanceBefore,
        balanceAfter,
        txHash,
        userId,
        description,
        metadata: metadata ? JSON.stringify(metadata) : null,
      })
      .returning();

    await db
      .update(platformWallets)
      .set({
        balance: balanceAfter,
        updatedAt: new Date(),
      })
      .where(eq(platformWallets.id, walletId));

    console.log(`📝 Recorded transaction: ${txType} ${amount} for ${wallet.walletType}`);

    return transaction.id;
  }

  async getWallet(walletType: string): Promise<PlatformWallet | undefined> {
    const [wallet] = await db
      .select()
      .from(platformWallets)
      .where(eq(platformWallets.walletType, walletType));

    return wallet;
  }

  async getAllWallets(): Promise<PlatformWallet[]> {
    return await db.select().from(platformWallets).where(eq(platformWallets.isActive, true));
  }

  async getTransactions(walletId?: string, limit: number = 100): Promise<WalletTransaction[]> {
    let query = db.select().from(walletTransactions);

    if (walletId) {
      query = query.where(eq(walletTransactions.walletId, walletId)) as any;
    }

    return await query.orderBy(desc(walletTransactions.createdAt)).limit(limit);
  }

  async initializePlatformWallets(): Promise<void> {
    console.log('💼 Initializing platform wallets...');

    const walletsToCreate = [
      {
        walletType: 'rewards_pool',
        walletAddress: process.env.REWARDS_POOL_WALLET || 'rewards_pool_address',
        balance: '0.000000',
        minBalance: '100.000000',
        description: 'Pool for user battle and tournament rewards',
        isActive: true,
      },
      {
        walletType: 'company_profit',
        walletAddress: process.env.COMPANY_PROFIT_WALLET || 'company_profit_address',
        balance: '0.000000',
        minBalance: null,
        description: 'Company profit wallet for revenue collection',
        isActive: true,
      },
      {
        walletType: 'revenue_share',
        walletAddress: process.env.REVENUE_SHARE_WALLET || 'revenue_share_address',
        balance: '0.000000',
        minBalance: null,
        description: 'Revenue share pool for creators and partners',
        isActive: true,
      },
    ];

    for (const walletData of walletsToCreate) {
      try {
        const existingWallet = await this.getWallet(walletData.walletType);

        if (!existingWallet) {
          await db.insert(platformWallets).values(walletData);
          console.log(`✅ Created wallet: ${walletData.walletType}`);
        } else {
          console.log(`ℹ️ Wallet already exists: ${walletData.walletType}`);
        }
      } catch (error) {
        console.error(`❌ Error creating wallet ${walletData.walletType}:`, error);
      }
    }

    console.log('✅ Platform wallets initialized');
  }

  async manualTransfer(
    fromWalletType: string,
    toWalletType: string,
    amount: number,
    description: string
  ): Promise<{ success: boolean; txId?: string; error?: string }> {
    try {
      const [fromWallet] = await db
        .select()
        .from(platformWallets)
        .where(eq(platformWallets.walletType, fromWalletType));

      const [toWallet] = await db
        .select()
        .from(platformWallets)
        .where(eq(platformWallets.walletType, toWalletType));

      if (!fromWallet || !toWallet) {
        return { success: false, error: 'Wallet not found' };
      }

      if (parseFloat(fromWallet.balance) < amount) {
        return { success: false, error: 'Insufficient balance' };
      }

      const newFromBalance = (parseFloat(fromWallet.balance) - amount).toFixed(6);
      const newToBalance = (parseFloat(toWallet.balance) + amount).toFixed(6);

      await db
        .update(platformWallets)
        .set({ balance: newFromBalance, updatedAt: new Date() })
        .where(eq(platformWallets.id, fromWallet.id));

      await db
        .update(platformWallets)
        .set({ balance: newToBalance, updatedAt: new Date() })
        .where(eq(platformWallets.id, toWallet.id));

      const txId = await this.recordTransaction(
        fromWallet.id,
        'withdrawal',
        `-${amount.toFixed(6)}`,
        description,
        { toWalletId: toWallet.id, toWalletType, manual: true }
      );

      await this.recordTransaction(
        toWallet.id,
        'deposit',
        amount.toFixed(6),
        description,
        { fromWalletId: fromWallet.id, fromWalletType, manual: true }
      );

      console.log(`✅ Manual transfer: $${amount} from ${fromWalletType} to ${toWalletType}`);

      return { success: true, txId };
    } catch (error: any) {
      console.error('❌ Manual transfer failed:', error);
      return { success: false, error: error.message };
    }
  }

  async getWalletStats() {
    const wallets = await this.getAllWallets();
    const totalBalance = wallets.reduce((sum, w) => sum + parseFloat(w.balance), 0);

    const recentTransactions = await this.getTransactions(undefined, 10);

    return {
      wallets,
      totalBalance: totalBalance.toFixed(6),
      recentTransactions,
      walletsCount: wallets.length,
    };
  }
}

export const walletService = new WalletService();
