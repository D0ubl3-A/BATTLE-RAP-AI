import Groq from 'groq-sdk';
import fs from 'fs';
import path from 'path';

/**
 * Streaming TTS Service - Generates and streams audio chunks word by word
 * Allows playback to start before full text-to-speech completes
 */
export class StreamingTTSService {
  private groq: Groq;
  private outputDir: string;

  constructor(apiKey: string) {
    this.groq = new Groq({ apiKey });
    this.outputDir = path.join(process.cwd(), 'temp_audio');
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }

  /**
   * Split text into phrases optimized for streaming
   * Breaks on natural boundaries (commas, periods, spaces after punctuation)
   */
  private splitTextIntoPhrasesForStreaming(text: string): string[] {
    // Split by punctuation with lookahead, keeping 2-4 word chunks
    const phrases: string[] = [];
    const words = text.split(/\s+/);
    
    let currentPhrase = '';
    for (let i = 0; i < words.length; i++) {
      currentPhrase += (currentPhrase ? ' ' : '') + words[i];
      
      // Create phrase chunks of 3-5 words or on punctuation
      const isEndOfSentence = words[i].endsWith('.') || words[i].endsWith('!') || words[i].endsWith('?');
      const isEndOfClause = words[i].endsWith(',') || words[i].endsWith(';') || words[i].endsWith(':');
      const chunkReady = currentPhrase.split(/\s+/).length >= 3;
      
      if (isEndOfSentence || (isEndOfClause && chunkReady) || (chunkReady && i % 4 === 3)) {
        if (currentPhrase.trim()) {
          phrases.push(currentPhrase.trim());
        }
        currentPhrase = '';
      }
    }
    
    if (currentPhrase.trim()) {
      phrases.push(currentPhrase.trim());
    }
    
    console.log(`🎵 Streaming TTS: Split ${words.length} words into ${phrases.length} phrases`);
    return phrases;
  }

  /**
   * Generate audio chunks progressively and stream them
   * Returns a promise that resolves to an array of audio URLs in order
   */
  async *generateStreamingAudio(
    text: string,
    characterId: string,
    options: {
      voice?: string;
      gender?: string;
    } = {}
  ): AsyncGenerator<{ phrase: string; audioUrl: string; index: number }> {
    const phrases = this.splitTextIntoPhrasesForStreaming(text);
    console.log(`🎤 Starting streaming TTS for ${characterId} with ${phrases.length} phrases`);

    for (let i = 0; i < phrases.length; i++) {
      const phrase = phrases[i];
      
      try {
        // Generate audio for this phrase
        const audioFileName = `groq_tts_stream_${characterId}_${Date.now()}_${i}.wav`;
        const audioPath = path.join(this.outputDir, audioFileName);

        console.log(`📢 Generating streaming chunk ${i + 1}/${phrases.length}: "${phrase.substring(0, 40)}..."`);

        const audio = await this.groq.audio.speech.create({
          model: 'gpt-4-turbo',
          voice: options.voice || 'alloy',
          input: phrase,
          response_format: 'wav',
        });

        // Save audio chunk to file
        const buffer = Buffer.from(await audio.arrayBuffer());
        fs.writeFileSync(audioPath, buffer);

        const audioUrl = `/api/audio/${audioFileName}`;
        console.log(`✅ Streaming chunk ${i + 1} ready: ${audioUrl}`);

        yield {
          phrase,
          audioUrl,
          index: i,
        };
      } catch (error) {
        console.error(`❌ Error generating streaming chunk ${i}:`, error);
        throw error;
      }
    }

    console.log(`🎉 Streaming TTS complete: Generated ${phrases.length} audio chunks`);
  }

  /**
   * Generate full audio with streaming metadata
   * Returns info about audio chunks and their timings
   */
  async generateStreamingMetadata(
    text: string,
    characterId: string,
    audioChunkUrls: string[]
  ): Promise<{
    fullText: string;
    phrases: string[];
    audioChunkUrls: string[];
    characterId: string;
    totalChunks: number;
  }> {
    const phrases = this.splitTextIntoPhrasesForStreaming(text);

    return {
      fullText: text,
      phrases,
      audioChunkUrls,
      characterId,
      totalChunks: phrases.length,
    };
  }
}

export default StreamingTTSService;
