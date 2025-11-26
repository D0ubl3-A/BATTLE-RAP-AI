# API Reference Guide

## ElevenLabs Text-to-Speech API

**Last Updated:** November 26, 2025

### Endpoint
```
POST https://api.elevenlabs.io/v1/text-to-speech/{voice_id}
```

### Authentication
Include API key in header:
```
xi-api-key: YOUR_API_KEY
```

### SDK Usage (Node.js)
```typescript
import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';

const client = new ElevenLabsClient({ apiKey: process.env.ELEVENLABS_API_KEY });

const audio = await client.textToSpeech.convert(
  'voice_id',  // First parameter: voice ID
  {            // Second parameter: options
    text: 'Your text here',
    model_id: 'eleven_turbo_v2_5',  // Latest fast model
    voice_settings: {
      stability: 0.5,
      similarity_boost: 0.75,
    },
  }
);

// Returns: Uint8Array (buffer)
```

### Models (2025)
- **eleven_turbo_v2_5** - Recommended, fast with quality (~250ms latency)
- **eleven_flash_v2_5** - Ultra-fast (~75ms latency)
- **eleven_multilingual_v2** - Multi-language support

### Voice IDs (ElevenLabs Standard Voices)
```
21m00Tcm4TlvDq8ikWAM - Zen (calm, neutral)
EXAVITQu4vr4xnSDxMaL - Chris (energetic, youthful)
g5CIjZEefAph4nQFvHAz - Gigi (confident, strong)
jBpfuIE2acCqe6DYd0OnJ - Bella (warm, friendly)
tAZz3TKpW9KVe1ijCHXw - Josh (serious, intense)
TxGEqnHWrfWFTfGW9XjX - Adam (neutral, professional)
```

### Voice Settings
```typescript
voice_settings: {
  stability: 0.5,           // 0.0 - 1.0 (consistency of voice)
  similarity_boost: 0.75,   // 0.0 - 1.0 (similarity to original voice)
}
```

### Output Format
- Default: `mp3_44100_128` (MP3, 128 kbps)
- Other options: `mp3_22050_32`, `pcm_16000`, `pcm_22050`, etc.

### Response
- Returns **Uint8Array** containing audio data
- Convert to Buffer: `Buffer.from(audio)`
- Save to file as MP3 or WAV

### Error Codes
- **401** - Invalid API key
- **400** - Bad request (invalid voice ID, missing text)
- **429** - Rate limit exceeded
- **500** - Server error

### Pricing
- Free: Basic TTS with attribution required
- Creator: 192kbps MP3 support
- Pro: 44.1kHz PCM support
- Enterprise: Custom models, privacy mode

### Rate Limiting
Check response headers:
```
current-concurrent-requests: X
maximum-concurrent-requests: Y
```

---

## Groq API Reference

**Used for:** Whisper transcription and AI rap generation

### Whisper Transcription
```typescript
const transcription = await groq.audio.transcriptions.create({
  file: audioFile,
  model: 'whisper-large-v3-turbo',
});
```

### Models
- `whisper-large-v3-turbo` - Fast transcription
- `whisper-large-v3` - High accuracy

### Supported Formats
- FLAC, MP3, MP4, MPEG, MPGA, M4A, OGG, WAV, WebM
- Max file: 25MB (free), 100MB (dev tier)

### AI Models for Rap Generation
```typescript
const completion = await groq.chat.completions.create({
  model: 'openai/gpt-oss-120b',  // Advanced reasoning model
  messages: [{ role: 'user', content: prompt }],
});
```

---

## Battle System Audio Flow

1. **User Voice Recording** → WebM audio file
2. **Transcription** → Groq Whisper API
3. **AI Rap Generation** → Groq LLM (gpt-oss-120b)
4. **TTS Conversion** → ElevenLabs SDK
5. **Audio Playback** → Browser player

---

## Common Issues & Fixes

### 401 Unauthorized (ElevenLabs)
- Check API key is set in env
- Verify key has TTS access
- Ensure API key hasn't expired

### Slow TTS Generation
- Use `eleven_turbo_v2_5` or `eleven_flash_v2_5`
- Reduce `similarity_boost` for faster generation
- Reduce text length

### Audio File Too Large
- Use compressed format: `mp3_44100_128`
- Shorter text = smaller file
- Cache generated audio files

### Rate Limiting
- Implement request queuing
- Stagger concurrent requests
- Monitor current-concurrent-requests header

---

## Testing API Keys

```typescript
// Test ElevenLabs
const valid = await elevenLabsClient.textToSpeech.convert(
  '21m00Tcm4TlvDq8ikWAM',
  { text: 'Test', model_id: 'eleven_turbo_v2_5' }
);

// Test Groq
const transcribed = await groq.audio.transcriptions.create({
  file: testAudioBuffer,
  model: 'whisper-large-v3-turbo',
});
```

---

## Performance Targets

- **Transcription:** < 2 seconds
- **AI Generation:** < 5 seconds
- **TTS Generation:** < 1 second (with eleven_flash_v2_5)
- **Total Round:** < 10 seconds

---

## Cache Management

Cached files stored in: `temp_audio/`
```bash
# Clear cache
rm -rf temp_audio/
mkdir -p temp_audio/

# Monitor size
du -sh temp_audio/
```

---

## Links

- ElevenLabs Docs: https://elevenlabs.io/docs
- Groq Docs: https://console.groq.com/docs
- ElevenLabs Models: https://elevenlabs.io/docs/models
- Groq Models: https://console.groq.com/docs/models
