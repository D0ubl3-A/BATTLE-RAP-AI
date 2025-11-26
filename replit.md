# Voice-Enabled Rap Battle Game

## Overview
Real-time voice-powered rap battle application where users compete against AI opponents. Features speech recognition, AI rap generation, text-to-speech audio, and real-time scoring.

## Tech Stack
- **Frontend**: React + Vite, Tailwind CSS, TanStack Query, Wouter, Framer Motion
- **Backend**: Express.js with TypeScript, PostgreSQL (Neon)
- **AI Services**: Groq (Whisper transcription, Llama rap generation, PlayAI TTS)
- **Audio**: ElevenLabs for sound effects, system audio player for TTS playback

## Key Features
- Voice recording with instant Groq Whisper transcription
- AI rap generation with difficulty levels
- Scoring system (rhyme density, flow, creativity)
- Character selection with unique voices
- Battle Pass, Shop, Daily Challenges, PvP Matchmaking
- USDC competitive stakes via Arc blockchain (demo mode)

## Project Structure
```
client/src/
  pages/          - React pages (battle-arena, profile, wallet, etc.)
  components/     - Reusable UI components
  hooks/          - Custom React hooks
  lib/            - Utilities and API client

server/
  routes.ts       - API endpoints
  storage.ts      - Database operations
  services/       - Business logic (groq-tts, elevenlabs-sfx, scoring)

shared/           - Shared types and schemas
```

## Routes
- `/` - Home (authenticated) or Landing (guest)
- `/battle` - Battle Arena
- `/battle/:id` - Active battle
- `/profile` - User profile
- `/wallet` - USDC wallet
- `/training` - Rap training lessons
- `/tournaments` - Tournament listings
- `/battle-pass` - Seasonal progression
- `/shop` - Cosmetic items
- `/challenges` - Daily challenges
- `/matchmaking` - PvP queue

## Environment
- `GROQ_API_KEY` - Required for transcription and TTS
- `ELEVENLABS_API_KEY` - Required for sound effects
- `DATABASE_URL` - PostgreSQL connection

## Audio System
- TTS: Groq PlayAI generates audio files, played via system default player
- SFX: ElevenLabs handles crowd reactions, bells, victory sounds
- Fallback: Web Audio API generates programmatic sounds if APIs unavailable
