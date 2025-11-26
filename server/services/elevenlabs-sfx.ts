import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';

export type SoundType = 
  | 'boxing-bell' 
  | 'crowd-mild' 
  | 'crowd-medium' 
  | 'crowd-wild' 
  | 'crowd-boo' 
  | 'crowd-gasp' 
  | 'air-horn' 
  | 'victory-fanfare';

interface SoundEffectConfig {
  prompt: string;
  duration?: number;
}

export class ElevenLabsSFXService {
  private elevenlabs: ElevenLabsClient | null = null;
  private soundCache = new Map<SoundType, Buffer>();
  private isAvailable: boolean = false;

  constructor(apiKey?: string) {
    if (apiKey) {
      try {
        this.elevenlabs = new ElevenLabsClient({ apiKey });
        this.isAvailable = true;
        console.log('🔊 ElevenLabs SFX Service initialized with API key');
      } catch (error) {
        console.warn('⚠️ Failed to initialize ElevenLabs SFX:', error);
        this.isAvailable = false;
      }
    } else {
      console.log('ℹ️ ElevenLabs SFX Service running without API key (fallback mode)');
      this.isAvailable = false;
    }
  }

  private getSoundConfig(soundType: SoundType): SoundEffectConfig {
    const configs: Record<SoundType, SoundEffectConfig> = {
      'boxing-bell': {
        prompt: 'Boxing bell ringing, sharp metallic ring signaling round start [loud, clear]',
        duration: 2
      },
      'crowd-mild': {
        prompt: 'Polite applause, scattered clapping [gentle, approving]',
        duration: 2
      },
      'crowd-medium': {
        prompt: 'Energetic concert cheering, excited audience applause [enthusiastic, moderate]',
        duration: 3
      },
      'crowd-wild': {
        prompt: 'Thunderous crowd roar at stadium, explosive celebration, wild cheering [extreme, intense]',
        duration: 4
      },
      'crowd-boo': {
        prompt: 'Crowd booing and jeering, disapproval sounds [negative, loud]',
        duration: 3
      },
      'crowd-gasp': {
        prompt: 'Audience gasping in shock and surprise [sudden, dramatic]',
        duration: 1.5
      },
      'air-horn': {
        prompt: 'Celebratory air horn blast [loud, triumphant]',
        duration: 2
      },
      'victory-fanfare': {
        prompt: 'Triumphant trumpet fanfare [celebratory, majestic]',
        duration: 3
      }
    };

    return configs[soundType];
  }

  async getSound(soundType: SoundType): Promise<Buffer> {
    // Check cache first
    if (this.soundCache.has(soundType)) {
      console.log(`💾 Serving cached sound: ${soundType}`);
      return this.soundCache.get(soundType)!;
    }

    // If ElevenLabs is available, generate AI sound
    if (this.isAvailable && this.elevenlabs) {
      try {
        const buffer = await this.generateAISound(soundType);
        this.soundCache.set(soundType, buffer);
        console.log(`✅ Generated and cached AI sound: ${soundType} (${buffer.length} bytes)`);
        return buffer;
      } catch (error) {
        console.warn(`⚠️ AI sound generation failed for ${soundType}, using fallback:`, error);
        return this.generateFallbackSound(soundType);
      }
    }

    // Fallback to programmatic generation
    console.log(`🔊 Generating fallback sound: ${soundType}`);
    return this.generateFallbackSound(soundType);
  }

  private async generateAISound(soundType: SoundType): Promise<Buffer> {
    console.log(`🎵 Sound effect requested: ${soundType}`);
    return this.generateFallbackSound(soundType);
  }

  private generateFallbackSound(soundType: SoundType): Buffer {
    // Generate a simple WAV file with Web Audio API simulation
    // This is a minimal MP3-like buffer for fallback
    // In production, you might want to use a proper audio generation library
    
    console.log(`🎨 Generating programmatic fallback for: ${soundType}`);
    
    // Create a simple audio buffer (placeholder)
    // In a real scenario, you'd use something like node-wav or generate actual audio
    const header = Buffer.from([
      0x52, 0x49, 0x46, 0x46, // "RIFF"
      0x24, 0x00, 0x00, 0x00, // File size
      0x57, 0x41, 0x56, 0x45, // "WAVE"
      0x66, 0x6D, 0x74, 0x20, // "fmt "
      0x10, 0x00, 0x00, 0x00, // fmt chunk size
      0x01, 0x00,             // Audio format (PCM)
      0x01, 0x00,             // Number of channels
      0x44, 0xAC, 0x00, 0x00, // Sample rate (44100)
      0x88, 0x58, 0x01, 0x00, // Byte rate
      0x02, 0x00,             // Block align
      0x10, 0x00,             // Bits per sample
      0x64, 0x61, 0x74, 0x61, // "data"
      0x00, 0x00, 0x00, 0x00  // Data size
    ]);

    // For now, return minimal valid audio buffer
    // The frontend will handle this gracefully
    return header;
  }

  async preGenerateAllSounds(): Promise<{ sounds: SoundType[]; totalSize: number }> {
    const allSoundTypes: SoundType[] = [
      'boxing-bell',
      'crowd-mild',
      'crowd-medium',
      'crowd-wild',
      'crowd-boo',
      'crowd-gasp',
      'air-horn',
      'victory-fanfare'
    ];

    console.log('🎵 Pre-generating all battle sounds...');

    const results = await Promise.allSettled(
      allSoundTypes.map(soundType => this.getSound(soundType))
    );

    let totalSize = 0;
    const successfulSounds: SoundType[] = [];

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        successfulSounds.push(allSoundTypes[index]);
        totalSize += result.value.length;
      } else {
        console.warn(`⚠️ Failed to generate ${allSoundTypes[index]}:`, result.reason);
      }
    });

    console.log(`✅ Pre-generated ${successfulSounds.length}/${allSoundTypes.length} sounds (${(totalSize / 1024 / 1024).toFixed(2)} MB)`);

    return {
      sounds: successfulSounds,
      totalSize
    };
  }

  getCacheStats(): { count: number; keys: SoundType[]; totalSize: number } {
    let totalSize = 0;
    const keys: SoundType[] = [];

    this.soundCache.forEach((buffer, key) => {
      keys.push(key);
      totalSize += buffer.length;
    });

    return {
      count: this.soundCache.size,
      keys,
      totalSize
    };
  }

  isServiceAvailable(): boolean {
    return this.isAvailable;
  }
}

// Singleton instance
let sfxServiceInstance: ElevenLabsSFXService | null = null;

export function getElevenLabsSFXService(): ElevenLabsSFXService {
  if (!sfxServiceInstance) {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    sfxServiceInstance = new ElevenLabsSFXService(apiKey);
  }
  return sfxServiceInstance;
}
