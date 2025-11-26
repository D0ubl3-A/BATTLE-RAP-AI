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
- Character selection with unique voices (Fritz-PlayAI, Deedee-PlayAI voices)
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
  storage.ts      - Database operations (optimized battle history queries)
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

## Matchmaking System
- **Random AI Battles**: Auto-matches with skill-scaled AI opponents (easy→nightmare)
- **PvP Queue**: Real player matchmaking with AI fallback when queue empty
- **AI Opponents**: 6 characters (Razor, Venom, Silk, CYPHER-9000, Inferno, Phoenix)
- **Skill-Based**: AI difficulty auto-adjusts based on user win rate + average score
- **No Wait Time**: Instant matches available 24/7 via AI fallback

## Environment
- `GROQ_API_KEY` - Required for transcription and TTS
- `ELEVENLABS_API_KEY` - Required for sound effects
- `DATABASE_URL` - PostgreSQL connection

## Audio System
- TTS: Groq PlayAI generates audio files, played via system default player button
- SFX: Programmatic WAV fallback generation (ElevenLabs SDK lacks sound generation API)
- Audio playback uses window.open() for cross-browser compatibility

## Recent Fixes & Features (Nov 2025)
- **Scoring System Overhaul**: Strict grading system that recognizes idioms, double/triple entendres, homonyms, and heavy rhyme juggling
- **Ads Monetization**: Battle credits fund ad reward pool (100 credits/battle → users earn 25-75 credits per ad watched)
- **Random Matchmaking**: Skill-based AI opponents instantly available when no players queue (6 difficulty levels)
- Battle history query optimized (excludes heavy JSONB rounds data to prevent 507 errors)
- BattleAvatar simplified (removed unused lip sync states)
- Removed unused StreamingAudioPlayer from battle-arena.tsx
- ElevenLabs SFX uses programmatic fallback (SDK doesn't support sound generation)
