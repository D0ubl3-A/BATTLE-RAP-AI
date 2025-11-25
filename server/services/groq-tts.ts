import Groq from 'groq-sdk';
import fs from 'fs';
import path from 'path';

export interface GroqTTSOptions {
  apiKey: string;
  voiceStyle?: 'aggressive' | 'confident' | 'smooth' | 'intense' | 'playful';
  characterGender?: 'male' | 'female';
}

export class GroqTTSService {
  private groq: Groq;
  private outputDir: string;

  constructor(options: GroqTTSOptions) {
    this.groq = new Groq({
      apiKey: options.apiKey,
    });
    
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
    console.log(`🎤 Groq TTS generating for ${characterId}: "${text.substring(0, 50)}..."`);
    
    try {
      const voice = this.getVoiceForCharacter(characterId, options.gender);
      const voiceStyle = options.voiceStyle || 'confident';
      
      console.log(`🚀 Using Groq voice: ${voice} with style: ${voiceStyle}`);
      
      // Apply robot voice effects for CYPHER-9000
      const processedText = this.applyRobotVoiceEffects(text, characterId);
      
      // Clean text for better TTS - keep robot FX markers for CYPHER-9000
      const cleanText = characterId === 'cypher' 
        ? processedText // Keep robot effects for CYPHER-9000
            .replace(/\(.*?\)/g, '') // Remove parentheses and content
            .replace(/\*.*?\*/g, '') // Remove emphasis markers only
            .replace(/\s+/g, ' ')    // Normalize whitespace
            .trim()
        : processedText
            .replace(/\[.*?\]/g, '') // Remove all style tags for other characters
            .replace(/\(.*?\)/g, '') // Remove parentheses and content
            .replace(/\*.*?\*/g, '') // Remove emphasis markers
            .replace(/\s+/g, ' ')    // Normalize whitespace
            .trim();

      // Use Groq's PlayAI TTS model (10x faster than real-time)
      const ttsOptions: any = {
        model: "playai-tts", // Fast PlayAI model from Groq
        voice: voice,
        input: cleanText,
        response_format: 'wav',
        speed: this.calculateDynamicSpeed(characterId, options.voiceStyle, options.speedMultiplier)  // Dynamic speed based on character and style
      };

      // Log dynamic voice settings
      console.log(`🎤 Voice Settings for ${characterId}:`);
      console.log(`   - Voice: ${voice}`);
      console.log(`   - Speed: ${ttsOptions.speed}x (${this.getSpeedDescription(ttsOptions.speed)})`);
      console.log(`   - Style: ${voiceStyle}`);
      if (characterId === 'cypher') {
        console.log(`   - 🤖 CYPHER-9000: RAPID-FIRE TERMINATION PROTOCOL ACTIVE`);
        console.log(`   - 🔊 Enhanced robotic modulation: 1.4x speed with digital effects`);
      }

      const response = await this.groq.audio.speech.create(ttsOptions);

      const timestamp = Date.now();
      const filename = `groq_tts_${characterId}_${timestamp}.wav`;
      const outputPath = path.join(this.outputDir, filename);

      const buffer = Buffer.from(await response.arrayBuffer());
      fs.writeFileSync(outputPath, buffer);

      console.log(`✅ Groq TTS success: ${buffer.length} bytes, saved to ${filename}`);

      // Return file URL instead of base64 (base64 is too large for browser)
      const audioUrl = `/api/audio/${filename}`;

      // Estimate duration based on text length (average speaking rate ~150 wpm)
      const words = cleanText.split(/\s+/).length;
      const duration = Math.max(2, Math.ceil((words / 150) * 60));

      console.log(`🎵 Audio URL: ${audioUrl}, estimated duration: ${duration}s`);

      return {
        audioUrl,
        duration
      };

    } catch (error: any) {
      // Handle terms acceptance error gracefully - this means the API key is valid but admin needs to accept terms
      if (error?.error?.error?.code === 'model_terms_required' || error?.status === 400) {
        console.warn(`⚠️ Groq playai-tts requires terms acceptance. Key is valid but admin must accept at https://console.groq.com/playground?model=playai-tts`);
        console.warn(`✅ API key works - using fallback TTS instead`);
        // Return empty to trigger fallback to other TTS services
        throw new Error(`Groq playai-tts terms not accepted`);
      }
      
      console.error(`❌ Groq TTS failed for ${characterId}:`, error.message);
      throw new Error(`Groq TTS generation failed: ${error.message}`);
    }
  }

  // Test if the API key works
  async testConnection(): Promise<boolean> {
    try {
      // Try PlayAI TTS first (our preferred model)
      try {
        const response = await this.groq.audio.speech.create({
          model: "playai-tts",
          voice: "Fritz-PlayAI",
          input: "Test connection",
          response_format: 'wav'
        });
        
        const buffer = Buffer.from(await response.arrayBuffer());
        return buffer.length > 0;
      } catch (playAiError: any) {
        // If playai-tts requires terms acceptance but API key is valid, still return true
        if (playAiError?.error?.error?.code === 'model_terms_required') {
          console.log('✅ Groq API key valid (playai-tts requires terms acceptance - can use other Groq services)');
          return true;
        }
        // If it's a 401, the API key is invalid
        if (playAiError?.status === 401) {
          console.error('❌ Groq API key invalid (401 Unauthorized)');
          return false;
        }
        // For other errors, re-throw to be caught by outer catch
        throw playAiError;
      }
    } catch (error: any) {
      console.error('Groq TTS test failed:', error?.message || error);
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