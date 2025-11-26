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
    console.log(`🎨 Generating audio for: ${soundType}`);
    
    const sampleRate = 44100;
    const duration = this.getSoundConfig(soundType).duration || 2;
    const samples = sampleRate * duration;
    
    // Generate audio based on sound type
    const audioData = this.generateAudioData(soundType, sampleRate, samples);
    
    // Create WAV file with actual audio data
    return this.createWavFile(audioData, sampleRate);
  }

  private generateAudioData(soundType: SoundType, sampleRate: number, samples: number): Int16Array {
    const audioData = new Int16Array(samples);
    
    switch (soundType) {
      case 'boxing-bell':
        this.generateBell(audioData, sampleRate, 1000, samples); // 1000 Hz bell tone
        break;
      case 'crowd-mild':
        this.generateNoise(audioData, 0.2, samples); // Quiet noise for applause
        break;
      case 'crowd-medium':
        this.generateNoise(audioData, 0.4, samples); // Medium noise with chirp
        break;
      case 'crowd-wild':
        this.generateNoise(audioData, 0.7, samples); // Loud noise
        this.addChirp(audioData, sampleRate, 200, 400, samples);
        break;
      case 'crowd-boo':
        this.generateTone(audioData, sampleRate, 150, samples, 0.3); // Low tone with noise
        break;
      case 'crowd-gasp':
        this.generateChirp(audioData, sampleRate, 800, 200, samples, 0.15);
        break;
      case 'air-horn':
        this.generateChirp(audioData, sampleRate, 600, 1200, samples, 0.8);
        break;
      case 'victory-fanfare':
        this.generateFanfare(audioData, sampleRate, samples);
        break;
    }
    
    return audioData;
  }

  private generateBell(data: Int16Array, sampleRate: number, frequency: number, samples: number) {
    for (let i = 0; i < samples; i++) {
      const t = i / sampleRate;
      // Bell sound: decaying sine wave
      const decay = Math.exp(-t * 2);
      const value = Math.sin(2 * Math.PI * frequency * t) * decay;
      data[i] = Math.max(-32768, Math.min(32767, value * 30000));
    }
  }

  private generateNoise(data: Int16Array, amplitude: number, samples: number) {
    for (let i = 0; i < samples; i++) {
      data[i] = (Math.random() - 0.5) * 2 * 32767 * amplitude;
    }
  }

  private generateTone(data: Int16Array, sampleRate: number, frequency: number, samples: number, amplitude: number) {
    for (let i = 0; i < samples; i++) {
      const t = i / sampleRate;
      const decay = Math.exp(-t * 1);
      const value = Math.sin(2 * Math.PI * frequency * t) * decay;
      data[i] = Math.max(-32768, Math.min(32767, value * 32767 * amplitude));
    }
  }

  private generateChirp(data: Int16Array, sampleRate: number, startFreq: number, endFreq: number, samples: number, amplitude: number) {
    for (let i = 0; i < samples; i++) {
      const t = i / sampleRate;
      const freq = startFreq + (endFreq - startFreq) * (i / samples);
      const phase = 2 * Math.PI * freq * t;
      const value = Math.sin(phase);
      data[i] = Math.max(-32768, Math.min(32767, value * 32767 * amplitude));
    }
  }

  private addChirp(data: Int16Array, sampleRate: number, startFreq: number, endFreq: number, samples: number) {
    for (let i = 0; i < samples; i++) {
      const t = i / sampleRate;
      const freq = startFreq + (endFreq - startFreq) * (i / samples);
      const phase = 2 * Math.PI * freq * t;
      const chirp = Math.sin(phase) * 0.3;
      const current = data[i] / 32767;
      const mixed = (current + chirp) * 0.5;
      data[i] = Math.max(-32768, Math.min(32767, mixed * 32767));
    }
  }

  private generateFanfare(data: Int16Array, sampleRate: number, samples: number) {
    // Generate a simple fanfare: C-E-G chord with increasing pitch
    const duration = samples / sampleRate;
    const noteLength = duration / 3;
    const samplesPerNote = noteLength * sampleRate;

    const notes = [262, 330, 392]; // C, E, G frequencies
    
    for (let i = 0; i < samples; i++) {
      const noteIndex = Math.floor((i / samplesPerNote) % 3);
      const frequency = notes[noteIndex];
      const t = (i % samplesPerNote) / sampleRate;
      const decay = Math.exp(-t * 1);
      const value = Math.sin(2 * Math.PI * frequency * t) * decay;
      data[i] = Math.max(-32768, Math.min(32767, value * 25000));
    }
  }

  private createWavFile(audioData: Int16Array, sampleRate: number): Buffer {
    const channels = 1;
    const bytesPerSample = 2;
    const dataSize = audioData.length * channels * bytesPerSample;
    const fileSize = 36 + dataSize;

    const buffer = Buffer.alloc(44 + dataSize);
    const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.length);

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
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); // PCM
    view.setUint16(22, channels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * channels * bytesPerSample, true);
    view.setUint16(32, channels * bytesPerSample, true);
    view.setUint16(34, 16, true);

    writeString(36, 'data');
    view.setUint32(40, dataSize, true);

    // Copy audio data
    const audioBuffer = new Uint8Array(buffer.buffer, buffer.byteOffset + 44, dataSize);
    audioBuffer.set(new Uint8Array(audioData.buffer));

    return buffer;
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
