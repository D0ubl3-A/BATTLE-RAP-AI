import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';
import fs from 'fs';
import path from 'path';

export interface GroqTTSOptions {
  apiKey: string;
  voiceStyle?: 'aggressive' | 'confident' | 'smooth' | 'intense' | 'playful';
  characterGender?: 'male' | 'female';
}

export class GroqTTSService {
  private elevenLabsClient: ElevenLabsClient | null = null;
  private outputDir: string;

  constructor(options: GroqTTSOptions) {
    // Use ElevenLabs SDK with API key from environment (Groq doesn't have TTS)
    const apiKey = process.env.ELEVENLABS_API_KEY || options.apiKey;
    if (apiKey) {
      try {
        this.elevenLabsClient = new ElevenLabsClient({ apiKey });
        console.log('✅ ElevenLabs TTS Service initialized');
      } catch (e) {
        console.warn('⚠️ Failed to initialize ElevenLabs:', e);
      }
    }
    
    this.outputDir = path.join(process.cwd(), 'temp_audio');
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }

  private getVoiceForCharacter(characterId: string, gender: string = 'male'): string {
    // Groq PlayAI voices optimized for rap battle characters
    const maleVoices = [
      'Fritz-PlayAI',    // Deep, authoritative
      'Thunder-PlayAI',  // Intense, powerful
      'Basil-PlayAI',    // Smooth, controlled
      'Cillian-PlayAI',  // Sharp, aggressive
      'Calum-PlayAI'     // Confident, street-smart
    ];
    
    const femaleVoices = [
      'Celeste-PlayAI',  // Strong, commanding
      'Cheyenne-PlayAI', // Fierce, edgy
      'Gail-PlayAI',     // Confident, bold
      'Indigo-PlayAI',   // Smooth, mysterious
      'Deedee-PlayAI'    // Playful, sharp
    ];

    // Character-specific voice mapping
    const voiceMap: Record<string, string> = {
      'razor': 'Deedee-PlayAI',    // Female, playful and sharp
      'venom': 'Thunder-PlayAI',   // Male, intense and powerful
      'silk': 'Basil-PlayAI',      // Male, smooth and controlled
      'cypher': 'Fritz-PlayAI',    // Robot - Deep, authoritative voice for CYPHER-9000
    };

    if (voiceMap[characterId]) {
      return voiceMap[characterId];
    }
    
    // Fallback to gender-appropriate voices
    const voices = gender === 'female' ? femaleVoices : maleVoices;
    return voices[Math.floor(Math.random() * voices.length)];
  }

  private applyRobotVoiceEffects(text: string, characterId: string): string {
    // Special robot voice processing for CYPHER-9000
    if (characterId === 'cypher') {
      // FIXED CYPHER-9000 VOICE EFFECTS - Clean for TTS while keeping robotic personality
      let robotText = text;
      
      // Add minimal robotic speech patterns that TTS can handle
      robotText = robotText.replace(/\bi\s/gi, 'THIS UNIT ');
      robotText = robotText.replace(/\bmy\b/gi, 'MY SYSTEMS');
      robotText = robotText.replace(/\byour\b/gi, 'TARGET');
      robotText = robotText.replace(/\byou\b/gi, 'HUMAN SUBJECT');
      
      // Add robotic terminology without breaking TTS
      robotText = robotText.replace(/\bbattle\b/gi, 'COMBAT PROTOCOL');
      robotText = robotText.replace(/\brhyme\b/gi, 'LYRICAL ALGORITHM');
      robotText = robotText.replace(/\brap\b/gi, 'VERBAL EXECUTION');
      
      // Clean robotic prefixes/suffixes
      robotText = `INITIATING VERBAL COMBAT. ${robotText}. TERMINATION PROTOCOL COMPLETE.`;
      
      console.log(`🤖 CYPHER-9000 FIXED VOICE: Clean robotic speech for TTS`);
      return robotText;
    }
    return text;
  }

  async generateTTS(
    text: string,
    characterId: string,
    options: {
      voiceStyle?: 'aggressive' | 'confident' | 'smooth' | 'intense' | 'playful';
      characterName?: string;
      gender?: string;
      speedMultiplier?: number;
    } = {}
  ): Promise<{ audioUrl: string; duration: number }> {
    console.log(`🎤 ElevenLabs TTS generating for ${characterId}: "${text.substring(0, 50)}..."`);
    
    try {
      if (!this.elevenLabsClient) {
        throw new Error('ElevenLabs client not initialized');
      }

      const voiceId = this.mapVoiceToCharacterId(characterId);
      
      // Apply robot voice effects for CYPHER-9000
      const processedText = this.applyRobotVoiceEffects(text, characterId);
      
      // Clean text for better TTS
      const cleanText = characterId === 'cypher' 
        ? processedText
            .replace(/\(.*?\)/g, '')
            .replace(/\*.*?\*/g, '')
            .replace(/\s+/g, ' ')
            .trim()
        : processedText
            .replace(/\[.*?\]/g, '')
            .replace(/\(.*?\)/g, '')
            .replace(/\*.*?\*/g, '')
            .replace(/\s+/g, ' ')
            .trim();

      console.log(`🎤 TTS for ${characterId} using voice ${voiceId}`);

      // Use ElevenLabs SDK (handles auth properly)
      const audioData = await this.elevenLabsClient.textToSpeech.convert(
        voiceId,
        {
          text: cleanText,
          modelId: 'eleven_turbo_v2_5',
          voiceSettings: {
            stability: 0.5,
            similarityBoost: 0.75,
          },
        }
      );

      // Handle response from SDK - could be Uint8Array or ReadableStream
      let buffer: Buffer;
      
      if (Buffer.isBuffer(audioData)) {
        buffer = audioData;
      } else if (audioData instanceof Uint8Array) {
        buffer = Buffer.from(audioData);
      } else if (typeof audioData === 'object' && Symbol.asyncIterator in audioData) {
        // Handle streaming response
        const chunks: Uint8Array[] = [];
        for await (const chunk of audioData as AsyncIterable<Uint8Array>) {
          chunks.push(chunk);
        }
        buffer = Buffer.concat(chunks.map(c => Buffer.from(c)));
      } else {
        // Try to convert directly
        buffer = Buffer.from(audioData as unknown as ArrayBufferLike);
      }
      
      if (buffer.length === 0) {
        throw new Error('No audio data received from ElevenLabs');
      }
      const timestamp = Date.now();
      const filename = `elevenlabs_tts_${characterId}_${timestamp}.mp3`;
      const outputPath = path.join(this.outputDir, filename);

      fs.writeFileSync(outputPath, buffer);
      console.log(`✅ ElevenLabs TTS success: ${buffer.length} bytes, saved to ${filename}`);

      const audioUrl = `/api/audio/${filename}`;
      const words = cleanText.split(/\s+/).length;
      const duration = Math.max(2, Math.ceil((words / 150) * 60));

      console.log(`🎵 Audio URL: ${audioUrl}, estimated duration: ${duration}s`);

      return { audioUrl, duration };

    } catch (error: any) {
      console.error(`❌ ElevenLabs TTS failed for ${characterId}:`, error.message);
      console.warn('🔄 Generating fallback silent audio...');
      
      // Generate fallback silent MP3 so audio URL is always available
      const fallbackBuffer = this.generateSilentAudio(Math.max(3, Math.ceil((text.split(/\s+/).length / 150) * 60)));
      const timestamp = Date.now();
      const filename = `elevenlabs_tts_${characterId}_fallback_${timestamp}.mp3`;
      const outputPath = path.join(this.outputDir, filename);
      
      fs.writeFileSync(outputPath, fallbackBuffer);
      console.log(`⚠️ Fallback audio generated: ${fallbackBuffer.length} bytes, saved to ${filename}`);
      
      const audioUrl = `/api/audio/${filename}`;
      const words = text.split(/\s+/).length;
      const duration = Math.max(2, Math.ceil((words / 150) * 60));
      
      return { audioUrl, duration };
    }
  }

  private mapVoiceToCharacterId(characterId: string): string {
    // Map to ElevenLabs voice IDs directly by character
    const voiceMap: Record<string, string> = {
      'razor': 'EXAVITQu4vr4xnSDxMaL',       // Chris - energetic female
      'venom': 'g5CIjZEefAph4nQFvHAz',      // Gigi - confident
      'silk': 'jBpfuIE2acCqe6DYd0OnJ',      // Bella - warm
      'cypher': '21m00Tcm4TlvDq8ikWAM',     // Zen - calm/robotic
    };
    return voiceMap[characterId] || 'EXAVITQu4vr4xnSDxMaL'; // Default to Chris
  }

  // Test if the API key works
  async testConnection(): Promise<boolean> {
    try {
      if (!this.elevenLabsClient) {
        console.error('❌ ElevenLabs client not initialized');
        return false;
      }

      const audioData = await this.elevenLabsClient.textToSpeech.convert(
        '21m00Tcm4TlvDq8ikWAM',
        {
          text: 'Test',
          modelId: 'eleven_turbo_v2_5',
          voiceSettings: { stability: 0.5, similarityBoost: 0.75 },
        }
      );

      if (audioData) {
        console.log('✅ ElevenLabs TTS API connection successful');
        return true;
      } else {
        console.error('❌ ElevenLabs API returned invalid response');
        return false;
      }
    } catch (error: any) {
      console.error('ElevenLabs TTS test failed:', error?.message || error);
      return false;
    }
  }
  
  private calculateDynamicSpeed(characterId: string, voiceStyle?: string, speedMultiplier: number = 1.0): number {
    // Base speeds for different characters - normalized to reasonable speeds
    const characterSpeeds: Record<string, number> = {
      'cypher': 1.0,     // Normal robotic delivery
      'venom': 0.95,     // Slightly slower, menacing
      'razor': 1.0,      // Normal sharp delivery
      'silk': 1.0        // Smooth, natural pace
    };
    
    // Style modifiers - normalized to reasonable speeds
    const styleModifiers: Record<string, number> = {
      'aggressive': 1.05, // Slightly faster for aggressive style
      'confident': 1.0,   // Normal speed
      'smooth': 0.95,     // Slightly slower for smooth
      'intense': 1.05,    // Slightly faster for intensity
      'playful': 1.0      // Normal tempo
    };
    
    const baseSpeed = characterSpeeds[characterId] || 1.0;
    const styleModifier = styleModifiers[voiceStyle || 'confident'] || 1.0;
    
    // Apply user speed multiplier (from frontend slider)
    const finalSpeed = baseSpeed * styleModifier * speedMultiplier;
    
    // Clamp between reasonable limits
    return Math.max(0.5, Math.min(2.0, finalSpeed));
  }
  
  private getSpeedDescription(speed: number): string {
    if (speed <= 0.7) return 'very slow/robotic';
    if (speed <= 0.9) return 'slow/deliberate';
    if (speed <= 1.1) return 'normal pace';
    if (speed <= 1.3) return 'fast/energetic';
    return 'very fast/rapid-fire';
  }

  private generateSilentAudio(durationSeconds: number): Buffer {
    // Generate a minimal MP3 file with silence
    // MP3 frame header for MPEG-1 Layer III, 128kbps, 44.1kHz
    const frameHeader = Buffer.from([0xff, 0xfb, 0x90, 0x44]);
    const frameData = Buffer.alloc(417, 0);
    
    // Calculate number of frames needed
    const framesNeeded = Math.ceil(durationSeconds * 41.41); // ~41.41 frames per second at 128kbps
    const frames: Buffer[] = [frameHeader, frameData];
    
    for (let i = 1; i < framesNeeded; i++) {
      frames.push(frameHeader);
      frames.push(frameData);
    }
    
    return Buffer.concat(frames);
  }
}

// Factory function for creating Groq TTS instances
export function createGroqTTS(apiKey: string): GroqTTSService {
  return new GroqTTSService({ apiKey });
}