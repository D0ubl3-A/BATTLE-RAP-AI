# Streaming Audio Feature Guide

You now have a complete **streaming audio system** that plays words as they come out instead of waiting for full audio generation!

## Quick Start

### 1. Use the Hook in Your Component

```tsx
import { useStreamingAudio } from '@/hooks/use-streaming-audio';
import { StreamingAudioPlayer } from '@/components/streaming-audio-player';

export function MyComponent() {
  const { chunks, isGenerating, generateStreamingAudio } = useStreamingAudio();
  
  const handleGenerateAudio = async () => {
    await generateStreamingAudio(
      "Your rap text here", 
      "razor",  // character ID
      battleId
    );
  };
  
  return (
    <div>
      <button onClick={handleGenerateAudio}>Generate Streaming Audio</button>
      {chunks.length > 0 && (
        <StreamingAudioPlayer 
          chunks={chunks}
          characterName="MC Razor"
          onAllChunksComplete={() => console.log("Done!")}
        />
      )}
    </div>
  );
}
```

## How It Works

### Backend Flow
1. **Streaming TTS Service** (`server/services/streaming-tts.ts`)
   - Splits text into natural phrases (3-5 word chunks)
   - Generates audio for each phrase using Groq TTS
   - Returns chunks progressively

2. **API Endpoint** (`POST /api/battles/:battleId/stream-audio`)
   - Accepts: `{ text, characterId, battleId }`
   - Returns: Array of audio chunks with URLs
   - Has intelligent fallback to single audio file

### Frontend Flow
1. **Hook** (`client/src/hooks/use-streaming-audio.ts`)
   - Calls streaming endpoint
   - Manages chunks state
   - Provides `generateStreamingAudio()` function

2. **Player Component** (`client/src/components/streaming-audio-player.tsx`)
   - Displays current phrase
   - Plays audio chunks sequentially
   - Shows progress with visual indicators
   - Includes volume and play/pause controls

## Example: Integrating into Battle Arena

In `client/src/pages/battle-arena.tsx`, you could add:

```tsx
import { useStreamingAudio } from '@/hooks/use-streaming-audio';
import { StreamingAudioPlayer } from '@/components/streaming-audio-player';

// Inside your component:
const { chunks, generateStreamingAudio } = useStreamingAudio();

// After AI response is generated:
if (result.aiResponse) {
  await generateStreamingAudio(
    result.aiResponse,
    characterId,
    battleId
  );
}

// Render the player:
{chunks.length > 0 && (
  <StreamingAudioPlayer 
    chunks={chunks}
    characterName={aiCharacterName}
    onChunkPlay={(index) => console.log(`Playing chunk ${index}`)}
    onAllChunksComplete={() => handleRoundComplete()}
  />
)}
```

## API Endpoint Details

### POST `/api/battles/:battleId/stream-audio`

**Request:**
```json
{
  "text": "Your rap lyrics here...",
  "characterId": "razor",
  "battleId": "uuid-here"
}
```

**Response (Streaming Mode):**
```json
{
  "chunks": [
    {
      "phrase": "First phrase here",
      "audioUrl": "/api/audio/groq_tts_stream_razor_1234_0.wav",
      "index": 0
    },
    {
      "phrase": "Second phrase here",
      "audioUrl": "/api/audio/groq_tts_stream_razor_1234_1.wav",
      "index": 1
    }
  ],
  "mode": "streaming",
  "totalChunks": 2
}
```

**Response (Fallback Mode):**
```json
{
  "chunks": [
    {
      "phrase": "Full text here",
      "audioUrl": "/api/audio/groq_tts_razor_1234.wav",
      "index": 0
    }
  ],
  "mode": "fallback_single_file"
}
```

## Features

✅ **Progressive Playback** - Audio plays as it's generated
✅ **Phrase-based Chunking** - Naturally splits on punctuation
✅ **Intelligent Fallback** - Falls back to single file if needed
✅ **Visual Progress** - Shows which chunks are playing
✅ **Volume Control** - Full volume and mute controls
✅ **Play/Pause** - Standard media controls
✅ **Status Indicators** - Loading, playing, complete states

## Character Support

Works with all characters:
- `razor` - Female, playful and sharp
- `venom` - Male, intense and powerful
- `silk` - Male, smooth and controlled
- `cypher` - Robot voice with deep, authoritative tone

## Files Created

1. `server/services/streaming-tts.ts` - Backend streaming TTS service
2. `client/src/components/streaming-audio-player.tsx` - Audio player UI
3. `client/src/hooks/use-streaming-audio.ts` - React hook for streaming
4. API endpoint in `server/routes.ts`

## Notes

- Streaming is automatic - just call `generateStreamingAudio()` with your text
- The system intelligently chunks text on natural boundaries
- Each phrase generates its own audio file
- Perfect for real-time AI rap battles where users want immediate audio feedback

Enjoy the streaming audio! 🎵
