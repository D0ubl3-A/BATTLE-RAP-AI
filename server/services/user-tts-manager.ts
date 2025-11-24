import { createOpenAITTS, OpenAITTSService } from './openai-tts';
import { createGroqTTS, GroqTTSService } from './groq-tts';
import { createElevenLabsTTS, ElevenLabsTTSService } from './elevenlabs-tts';
import { createMyShellTTS, MyShellTTSService } from './myshell-tts';
import { storage } from '../storage';

export interface TTSGenerationOptions {
  characterId: string;
  characterName?: string;
  gender?: string;
  voiceStyle?: 'aggressive' | 'confident' | 'smooth' | 'intense' | 'playful';
  speedMultiplier?: number;
}

export class UserTTSManager {
  private openaiInstances = new Map<string, OpenAITTSService>();
  private groqInstances = new Map<string, GroqTTSService>();
  private elevenlabsInstances = new Map<string, ElevenLabsTTSService>();
  private myshellInstances = new Map<string, MyShellTTSService>();

  private getOpenAIInstance(apiKey: string): OpenAITTSService {
    if (!this.openaiInstances.has(apiKey)) {
      this.openaiInstances.set(apiKey, createOpenAITTS(apiKey));
    }
    return this.openaiInstances.get(apiKey)!;
  }

  private getGroqInstance(apiKey: string): GroqTTSService {
    if (!this.groqInstances.has(apiKey)) {
      this.groqInstances.set(apiKey, createGroqTTS(apiKey));
    }
    return this.groqInstances.get(apiKey)!;
  }

  private getElevenLabsInstance(apiKey: string): ElevenLabsTTSService {
    if (!this.elevenlabsInstances.has(apiKey)) {
      this.elevenlabsInstances.set(apiKey, createElevenLabsTTS(apiKey));
    }
    return this.elevenlabsInstances.get(apiKey)!;
  }

  private getMyShellInstance(apiKey: string, voiceCloning: boolean = false): MyShellTTSService {
    const key = `${apiKey}_${voiceCloning}`;
    if (!this.myshellInstances.has(key)) {
      this.myshellInstances.set(key, createMyShellTTS(apiKey, voiceCloning));
    }
    return this.myshellInstances.get(key)!;
  }

  async generateTTS(
    text: string,
    userId: string,
    options: TTSGenerationOptions
  ): Promise<{ audioUrl: string; duration: number }> {
    console.log(`🎤 UserTTSManager: Generating TTS for user ${userId}, character ${options.characterId}`);
    
    // Get user's TTS preferences and API keys
    const user = await storage.getUser(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // GROQ ONLY - No fallbacks
    console.log(`🚀 GROQ TTS ONLY MODE - No fallbacks`);
    const apiKey = user.groqApiKey || process.env.GROQ_API_KEY;
    
    if (!apiKey) {
      throw new Error(`❌ No Groq API key available for user ${userId}`);
    }

    console.log(`🚀 Using ${user.groqApiKey ? "user's" : "system"} Groq TTS service`);
    const groqInstance = this.getGroqInstance(apiKey);
    return await groqInstance.generateTTS(text, options.characterId, {
      voiceStyle: options.voiceStyle,
      characterName: options.characterName,
      gender: options.gender,
      speedMultiplier: options.speedMultiplier
    });
  }


  // Test a user's API key
  async testUserAPIKey(userId: string, service: 'openai' | 'groq' | 'elevenlabs' | 'myshell'): Promise<boolean> {
    const user = await storage.getUser(userId);
    if (!user) return false;

    try {
      if (service === 'openai' && user.openaiApiKey) {
        const instance = this.getOpenAIInstance(user.openaiApiKey);
        const result = await instance.generateTTS("Test", "test", {});
        return result.audioUrl.length > 0;
      }

      if (service === 'groq' && user.groqApiKey) {
        const instance = this.getGroqInstance(user.groqApiKey);
        return await instance.testConnection();
      }

      if (service === 'elevenlabs' && user.elevenlabsApiKey) {
        const instance = this.getElevenLabsInstance(user.elevenlabsApiKey);
        return await instance.testConnection();
      }

      if (service === 'myshell' && process.env.MYSHELL_API_KEY) {
        const instance = this.getMyShellInstance(process.env.MYSHELL_API_KEY, true);
        return await instance.testConnection();
      }

      return false;
    } catch (error) {
      console.error(`API key test failed for ${service}:`, error);
      return false;
    }
  }

  // Clear cached instances when keys change
  clearUserInstances(userId: string) {
    // In a production system, you'd track which instances belong to which users
    // For now, we'll clear all instances when any key changes
    this.openaiInstances.clear();
    this.groqInstances.clear();
    this.elevenlabsInstances.clear();
    this.myshellInstances.clear();
    console.log(`🧹 Cleared all TTS instances cache (OpenAI, Groq, ElevenLabs, MyShell)`);
  }
}

export const userTTSManager = new UserTTSManager();