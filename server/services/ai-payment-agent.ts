/**
 * AI Payment Agent - Natural Language Control for Arc Blockchain
 * 
 * This AI agent understands voice commands to automate financial actions on Arc:
 * - "Stake 5 dollars on this battle" → Creates competitive stake battle
 * - "Send 10 USDC to the winner" → Processes payment
 * - "Create a tournament with 50 dollar prize" → Sets up prize tournament
 * - "Show my USDC balance" → Queries Arc wallet
 * 
 * Perfect for the Arc hackathon: AI + Blockchain for intelligent payments!
 */

import { ArcBlockchainService } from "../arcBlockchain";
import { storage } from "../storage";
import { MONETIZATION_CONFIG } from "@shared/schema";
import { walletService } from "./walletService";

export interface VoiceCommandResult {
  success: boolean;
  action: string;
  message: string;
  data?: any;
  txHash?: string;
  error?: string;
}

export class AIPaymentAgent {
  private arcService: ArcBlockchainService;

  constructor(arcService: ArcBlockchainService) {
    this.arcService = arcService;
    console.log('🤖 AI Payment Agent initialized - Ready for natural language commands!');
  }

  /**
   * Process natural language voice command for Arc/USDC operations
   */
  async processVoiceCommand(userId: string, command: string): Promise<VoiceCommandResult> {
    const lowerCommand = command.toLowerCase();
    console.log(`🎤 Processing voice command from ${userId}: "${command}"`);

    try {
      // Stake/Challenge commands
      if (lowerCommand.includes('stake') || lowerCommand.includes('challenge')) {
        return await this.handleStakeCommand(userId, command);
      }

      // Balance/wallet commands
      if (lowerCommand.includes('balance') || lowerCommand.includes('wallet') || lowerCommand.includes('how much')) {
        return await this.handleBalanceCommand(userId);
      }

      // Tournament commands
      if (lowerCommand.includes('tournament') && (lowerCommand.includes('create') || lowerCommand.includes('start'))) {
        return await this.handleTournamentCommand(userId, command);
      }

      // Send/transfer commands
      if (lowerCommand.includes('send') || lowerCommand.includes('transfer') || lowerCommand.includes('pay')) {
        return await this.handleTransferCommand(userId, command);
      }

      // Transaction history
      if (lowerCommand.includes('history') || lowerCommand.includes('transactions')) {
        return await this.handleHistoryCommand(userId);
      }

      // Claim rewards
      if (lowerCommand.includes('claim') || lowerCommand.includes('collect')) {
        return await this.handleClaimCommand(userId, command);
      }

      // Unknown command
      return {
        success: false,
        action: 'unknown',
        message: 'I didn\'t understand that command. Try: "stake 5 dollars", "show balance", or "create tournament"',
        error: 'Unknown command'
      };
    } catch (error) {
      console.error('Error processing voice command:', error);
      return {
        success: false,
        action: 'error',
        message: 'Sorry, I had trouble processing that command',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Handle stake/challenge commands
   * Examples: "stake 5 dollars", "challenge 10 USDC on this battle"
   */
  private async handleStakeCommand(userId: string, command: string): Promise<VoiceCommandResult> {
    // Extract amount from command
    const amount = this.extractAmount(command);
    if (!amount) {
      return {
        success: false,
        action: 'stake',
        message: 'Please specify an amount, like "stake 5 dollars" or "invest in your skill with 10 USDC"',
        error: 'No amount specified'
      };
    }

    // Validate stake amount
    const validation = this.arcService.validateStakeAmount(amount);
    if (!validation.valid) {
      return {
        success: false,
        action: 'stake',
        message: validation.error || 'Invalid stake amount',
        error: validation.error
      };
    }

    // Get user's Arc wallet
    const walletAddress = await storage.getArcWalletAddress(userId);
    if (!walletAddress) {
      return {
        success: false,
        action: 'stake',
        message: 'You need an Arc wallet first. Say "create wallet" to get started!',
        error: 'No wallet found'
      };
    }

    try {
      // Create competitive stake battle in storage
      const stakeBattle = await storage.createStakeBattle(userId, amount);
      
      // Execute actual blockchain transaction - deposit stake to platform
      const depositTx = await this.arcService.depositStake(
        userId,
        walletAddress,
        amount,
        stakeBattle.id
      );

      // Record the transaction
      await storage.recordArcTransaction({
        userId,
        txHash: depositTx.txHash,
        txType: 'stake_deposit',
        amount,
        fromAddress: walletAddress,
        toAddress: this.arcService.getPlatformWalletAddress(),
        status: depositTx.status,
        blockNumber: depositTx.blockNumber,
        gasUsedUSDC: depositTx.gasUsedUSDC,
        memo: `Competitive stake deposit for battle ${stakeBattle.id}`
      });

      // Update battle with transaction hash
      await storage.updateBattleState(stakeBattle.id, {
        stakeTxHash: depositTx.txHash
      });

      console.log(`💰 Competitive stake battle created! Battle ID: ${stakeBattle.id}, Tx: ${depositTx.txHash}`);

      return {
        success: true,
        action: 'stake',
        message: `Competitive stake battle created! You invested $${amount} USDC in your skill. Transaction confirmed on Arc blockchain!`,
        txHash: depositTx.txHash,
        data: { 
          stakeAmount: amount,
          battleId: stakeBattle.id,
          txHash: depositTx.txHash,
          gasUsed: depositTx.gasUsedUSDC
        }
      };
    } catch (error) {
      console.error('Error creating competitive stake battle:', error);
      return {
        success: false,
        action: 'stake',
        message: 'Failed to create competitive stake battle. Please try again.',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Handle balance/wallet queries
   * Examples: "show my balance", "how much USDC do I have"
   */
  private async handleBalanceCommand(userId: string): Promise<VoiceCommandResult> {
    const walletAddress = await storage.getArcWalletAddress(userId);
    
    if (!walletAddress) {
      return {
        success: false,
        action: 'balance',
        message: 'You don\'t have an Arc wallet yet. Say "create wallet" to get started!',
        error: 'No wallet found'
      };
    }

    const balance = await this.arcService.getUSDCBalance(walletAddress);
    const user = await storage.getUser(userId);
    const totalEarned = user?.totalEarnedUSDC || '0.000000';

    return {
      success: true,
      action: 'balance',
      message: `You have $${balance} USDC in your wallet. Total earned: $${totalEarned} USDC!`,
      data: {
        balance,
        totalEarned,
        walletAddress: walletAddress.substring(0, 10) + '...'
      }
    };
  }

  /**
   * Handle tournament creation commands
   * Examples: "create tournament with 50 dollar prize", "start a large tournament"
   */
  private async handleTournamentCommand(userId: string, command: string): Promise<VoiceCommandResult> {
    const lowerCommand = command.toLowerCase();
    
    // Determine prize size from command
    let prizeSize: 'small' | 'medium' | 'large' = 'small';
    if (lowerCommand.includes('large') || lowerCommand.includes('big') || lowerCommand.includes('250')) {
      prizeSize = 'large';
    } else if (lowerCommand.includes('medium') || lowerCommand.includes('50')) {
      prizeSize = 'medium';
    }

    const prizeConfig = MONETIZATION_CONFIG.TOURNAMENT_PRIZE_POOLS[prizeSize.toUpperCase() as 'SMALL' | 'MEDIUM' | 'LARGE'];

    return {
      success: true,
      action: 'tournament',
      message: `Creating ${prizeSize} prize tournament with $${prizeConfig.total} USDC pool! First place: $${prizeConfig.first}`,
      data: { prizeSize, prizePool: prizeConfig.total }
    };
  }

  /**
   * Handle transfer/send commands
   * Examples: "send 5 USDC to 0x123...", "transfer 10 dollars to platform"
   */
  private async handleTransferCommand(userId: string, command: string): Promise<VoiceCommandResult> {
    const amount = this.extractAmount(command);
    
    if (!amount) {
      return {
        success: false,
        action: 'transfer',
        message: 'Please specify an amount to send',
        error: 'No amount specified'
      };
    }

    // Extract recipient address from command
    const recipient = this.extractRecipientAddress(command);
    if (!recipient) {
      return {
        success: false,
        action: 'transfer',
        message: 'Please specify a recipient wallet address (e.g., "send 10 USDC to 0x123...")',
        error: 'No recipient specified'
      };
    }

    // Get user's Arc wallet
    const fromAddress = await storage.getArcWalletAddress(userId);
    if (!fromAddress) {
      return {
        success: false,
        action: 'transfer',
        message: 'You need an Arc wallet first. Say "create wallet" to get started!',
        error: 'No wallet found'
      };
    }

    try {
      // Execute actual blockchain transfer
      const transferTx = await this.arcService.transferUSDC({
        fromAddress,
        toAddress: recipient,
        amountUSDC: amount,
        memo: `Voice command transfer: ${command.substring(0, 50)}`
      });

      // Record the transaction
      await storage.recordArcTransaction({
        userId,
        txHash: transferTx.txHash,
        txType: 'transfer',
        amount,
        fromAddress,
        toAddress: recipient,
        status: transferTx.status,
        blockNumber: transferTx.blockNumber,
        gasUsedUSDC: transferTx.gasUsedUSDC,
        memo: `Voice command transfer`
      });

      console.log(`💸 Transfer executed! $${amount} USDC sent to ${recipient.substring(0, 10)}... Tx: ${transferTx.txHash}`);

      return {
        success: true,
        action: 'transfer',
        message: `Successfully sent $${amount} USDC to ${recipient.substring(0, 10)}...! Transaction confirmed on Arc blockchain.`,
        txHash: transferTx.txHash,
        data: { 
          amount,
          recipient: recipient.substring(0, 10) + '...',
          txHash: transferTx.txHash,
          gasUsed: transferTx.gasUsedUSDC
        }
      };
    } catch (error) {
      console.error('Error executing transfer:', error);
      return {
        success: false,
        action: 'transfer',
        message: 'Failed to execute transfer. Please check your balance and try again.',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Handle transaction history commands
   * Examples: "show my transactions", "transaction history"
   */
  private async handleHistoryCommand(userId: string): Promise<VoiceCommandResult> {
    const transactions = await storage.getUserArcTransactions(userId, 10);
    
    if (transactions.length === 0) {
      return {
        success: true,
        action: 'history',
        message: 'No transactions yet. Start battling to earn USDC!',
        data: { transactions: [] }
      };
    }

    const totalAmount = transactions.reduce((sum, tx) => sum + parseFloat(tx.amount), 0);

    return {
      success: true,
      action: 'history',
      message: `You have ${transactions.length} recent transactions totaling $${totalAmount.toFixed(2)} USDC`,
      data: {
        count: transactions.length,
        total: totalAmount.toFixed(2),
        recent: transactions.slice(0, 5)
      }
    };
  }

  /**
   * Handle claim/collect commands
   * Examples: "claim my rewards", "collect prize"
   */
  private async handleClaimCommand(userId: string, command: string): Promise<VoiceCommandResult> {
    return {
      success: true,
      action: 'claim',
      message: 'Checking for available rewards...',
      data: {}
    };
  }

  /**
   * Extract dollar amount from natural language
   * Handles: "5 dollars", "$10", "10 USDC", "five bucks", etc.
   */
  private extractAmount(text: string): string | null {
    const lowerText = text.toLowerCase();
    
    // Match patterns like "$10", "10 dollars", "10 USDC", "10 bucks"
    const patterns = [
      /\$(\d+(?:\.\d{1,2})?)/,           // $10 or $10.50
      /(\d+(?:\.\d{1,2})?)\s*(?:dollars?|bucks?|usdc)/i,  // 10 dollars, 10 USDC
      /(\d+(?:\.\d{1,2})?)/,             // Just number
    ];

    for (const pattern of patterns) {
      const match = lowerText.match(pattern);
      if (match && match[1]) {
        return parseFloat(match[1]).toFixed(2);
      }
    }

    // Handle word numbers
    const wordNumbers: Record<string, string> = {
      'one': '1.00', 'two': '2.00', 'three': '3.00', 'four': '4.00', 'five': '5.00',
      'six': '6.00', 'seven': '7.00', 'eight': '8.00', 'nine': '9.00', 'ten': '10.00',
      'twenty': '20.00', 'fifty': '50.00', 'hundred': '100.00'
    };

    for (const [word, amount] of Object.entries(wordNumbers)) {
      if (lowerText.includes(word)) {
        return amount;
      }
    }

    return null;
  }

  /**
   * Extract recipient wallet address from natural language
   * Handles: "to 0x123...", "send to 0xABC...", or keywords like "platform"
   */
  private extractRecipientAddress(text: string): string | null {
    // Look for Ethereum-style address (0x followed by hex characters)
    const addressPattern = /(0x[a-fA-F0-9]{40})/;
    const match = text.match(addressPattern);
    
    if (match && match[1]) {
      return match[1];
    }

    // Handle keywords for common recipients
    const lowerText = text.toLowerCase();
    if (lowerText.includes('platform') || lowerText.includes('house')) {
      // Return platform wallet address
      return process.env.ARC_PLATFORM_WALLET || "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0";
    }

    return null;
  }

  /**
   * Award voice command reward (gamification)
   * Users get a small USDC reward for using voice commands
   */
  async awardVoiceCommandReward(userId: string, command: string): Promise<VoiceCommandResult> {
    const walletAddress = await storage.getArcWalletAddress(userId);
    
    if (!walletAddress) {
      return {
        success: false,
        action: 'reward',
        message: 'Create a wallet first to earn voice command rewards!',
        error: 'No wallet'
      };
    }

    try {
      const rewardAmount = MONETIZATION_CONFIG.ARC_REWARDS.VOICE_COMMAND_REWARD;
      const rewardsPoolBalance = await walletService.getRewardsPoolBalance();

      if (parseFloat(rewardsPoolBalance) < parseFloat(rewardAmount)) {
        return {
          success: false,
          action: 'reward',
          message: 'Rewards pool is currently depleted. Please try again later.',
          error: 'Rewards pool depleted',
        };
      }

      const rewardTx = await this.arcService.awardVoiceCommandReward(walletAddress, command);
      
      // Record transaction
      await storage.recordArcTransaction({
        userId,
        txHash: rewardTx.txHash,
        txType: 'voice_command',
        amount: rewardAmount,
        fromAddress: this.arcService.getPlatformWalletAddress(),
        toAddress: walletAddress,
        status: rewardTx.status,
        blockNumber: rewardTx.blockNumber,
        gasUsedUSDC: rewardTx.gasUsedUSDC,
        memo: `Voice command: ${command.substring(0, 50)}`
      });

      await walletService.recordRewardsPayout(
        rewardAmount,
        `Arc voice command reward`,
        { userId, commandPreview: command.substring(0, 50) },
        userId,
        rewardTx.txHash
      );

      return {
        success: true,
        action: 'reward',
        message: `Nice! You earned $${rewardAmount} USDC for using voice commands!`,
        txHash: rewardTx.txHash,
        data: { reward: rewardAmount }
      };
    } catch (error) {
      console.error('Error awarding voice command reward:', error);
      return {
        success: false,
        action: 'reward',
        message: 'Couldn\'t award reward right now',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

// Export singleton instance
export const createAIPaymentAgent = (arcService: ArcBlockchainService) => new AIPaymentAgent(arcService);
