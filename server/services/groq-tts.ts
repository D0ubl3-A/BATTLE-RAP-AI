import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';

export interface GroqTTSOptions {
  apiKey: string;
  voiceStyle?: 'aggressive' | 'confident' | 'smooth' | 'intense' | 'playful';
  characterGender?: 'male' | 'female';
}

export class GroqTTSService {
  private elevenLabsApiKey: string;
  private outputDir: string;

  constructor(options: GroqTTSOptions) {
    // Use ElevenLabs API key from environment (Groq doesn't have TTS)
    this.elevenLabsApiKey = process.env.ELEVENLABS_API_KEY || options.apiKey;
    
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
      if (!this.elevenLabsApiKey) {
        throw new Error('No ElevenLabs API key available');
      }

      const voice = this.getVoiceForCharacter(characterId, options.gender);
      
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

      console.log(`🎤 Voice Settings for ${characterId}: ${voice}`);

      // Use ElevenLabs TTS API (actual working endpoint)
      const response = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${this.mapVoiceToElevenLabsId(voice)}`,
        {
          method: 'POST',
          headers: {
            'xi-api-key': this.elevenLabsApiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            text: cleanText,
            model_id: 'eleven_monolingual_v1',
            voice_settings: {
              stability: 0.5,
              similarity_boost: 0.75,
            },
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`ElevenLabs API error: ${response.status} ${response.statusText}`);
      }

      const buffer = await response.buffer();
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
      throw new Error(`TTS generation failed: ${error.message}`);
    }
  }

  private mapVoiceToElevenLabsId(voice: string): string {
    // Map character voices to ElevenLabs voice IDs
    const voiceMap: Record<string, string> = {
      'Fritz-PlayAI': '21m00Tcm4TlvDq8ikWAM',      // Zen (calm)
      'Deedee-PlayAI': 'EXAVITQu4vr4xnSDxMaL',    // Chris (energetic)
      'Thunder-PlayAI': 'g5CIjZEefAph4nQFvHAz',   // Gigi (confident)
      'Basil-PlayAI': 'jBpfuIE2acCqe6DYd0OnJ',    // Bella (warm)
      'Cillian-PlayAI': 'tAZz3TKpW9KVe1ijCHXw',   // Josh (serious)
      'Calum-PlayAI': 'TxGEqnHWrfWFTfGW9XjX',     // Adam (neutral)
    };
    return voiceMap[voice] || '21m00Tcm4TlvDq8ikWAM'; // Default to Zen
  }

  // Test if the API key works
  async testConnection(): Promise<boolean> {
    try {
      if (!this.elevenLabsApiKey) {
        console.error('❌ No ElevenLabs API key available');
        return false;
      }

      const response = await fetch(
        'https://api.elevenlabs.io/v1/text-to-speech/21m00Tcm4TlvDq8ikWAM',
        {
          method: 'POST',
          headers: {
            'xi-api-key': this.elevenLabsApiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            text: 'Test',
            model_id: 'eleven_monolingual_v1',
            voice_settings: { stability: 0.5, similarity_boost: 0.75 },
          }),
        }
      );

      if (response.ok) {
        console.log('✅ ElevenLabs TTS API connection successful');
        return true;
      } else {
        console.error(`❌ ElevenLabs API error: ${response.status}`);
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
}

// Factory function for creating Groq TTS instances
export function createGroqTTS(apiKey: string): GroqTTSService {
  return new GroqTTSService({ apiKey });
}