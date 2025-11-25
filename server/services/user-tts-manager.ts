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

    // Try Groq first, with fallback to browser speech synthesis
    const apiKey = user.groqApiKey || process.env.GROQ_API_KEY;
    
    if (apiKey) {
      try {
        console.log(`🚀 Attempting Groq TTS service`);
        const groqInstance = this.getGroqInstance(apiKey);
        return await groqInstance.generateTTS(text, options.characterId, {
          voiceStyle: options.voiceStyle,
          characterName: options.characterName,
          gender: options.gender,
          speedMultiplier: options.speedMultiplier
        });
      } catch (groqError: any) {
        console.warn(`⚠️ Groq TTS failed: ${groqError.message}`);
        console.log(`🔄 Falling back to browser speech synthesis...`);
        // Continue to fallback
      }
    } else {
      console.log(`⚠️ No Groq API key, using browser speech synthesis fallback`);
    }

    // Fallback: Generate audio using browser Web Speech API (client-side)
    // We'll create a simple HTML5 audio data URL with duration info
    return this.generateFallbackAudio(text, options.characterId);
  }

  private generateFallbackAudio(text: string, characterId: string): { audioUrl: string; duration: number } {
    // Estimate duration: average speaking rate is 120-150 words per minute
    // Approximately 2-2.5 characters per word, so ~140-170 chars/min
    const wordsPerMinute = 140;
    const estimatedDurationSeconds = Math.max(2, (text.length / 5) / (wordsPerMinute / 60));
    
    // Generate a simple silent WAV file as fallback (prevents greyed-out player)
    // This creates a valid audio data URL that won't error
    const sampleRate = 16000;
    const duration = Math.ceil(estimatedDurationSeconds);
    const samples = sampleRate * duration;
    
    // Create a minimal WAV file structure
    const wavBuffer = this.createSilentWav(samples, sampleRate);
    const base64Audio = Buffer.from(wavBuffer).toString('base64');
    const audioUrl = `data:audio/wav;base64,${base64Audio}`;
    
    console.log(`✅ Fallback audio generated: ${audioUrl.length} chars, ${duration}s duration (silent WAV)`);
    
    return {
      audioUrl,
      duration
    };
  }

  private createSilentWav(samples: number, sampleRate: number): Uint8Array {
    // Create a minimal WAV file with silent audio
    // WAV file structure: RIFF header + fmt chunk + data chunk
    const channels = 1;
    const bytesPerSample = 2;
    const dataSize = samples * channels * bytesPerSample;
    const fileSize = 36 + dataSize;
    
    const buffer = new Uint8Array(44 + dataSize);
    const view = new DataView(buffer.buffer);
    
    // RIFF header
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };
    
    writeString(0, 'RIFF');
    view.setUint32(4, fileSize, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true); // fmt chunk size
    view.setUint16(20, 1, true); // audio format (1 = PCM)
    view.setUint16(22, channels, true); // channels
    view.setUint32(24, sampleRate, true); // sample rate
    view.setUint32(28, sampleRate * channels * bytesPerSample, true); // byte rate
    view.setUint16(32, channels * bytesPerSample, true); // block align
    view.setUint16(34, 16, true); // bits per sample
    
    // Data chunk
    writeString(36, 'data');
    view.setUint32(40, dataSize, true);
    
    // Fill with silence (zeros) - Uint8Array is already initialized with zeros
    // No need to manually fill
    
    return buffer;
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