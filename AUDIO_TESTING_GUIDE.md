# 🎵 Streaming Audio Testing Guide

## ✅ Component Status
- **StreamingTTSService**: ✓ 4.2 KB, generates audio chunks  
- **StreamingAudioPlayer**: ✓ 6.8 KB, displays + controls playback
- **useStreamingAudio Hook**: ✓ 2.8 KB, API integration
- **Battle Arena**: ✓ Integrated, auto-generates audio on AI response
- **Training Program**: ✓ Integrated, coach feedback has audio
- **Backend Endpoint**: ✓ POST /api/battles/:battleId/stream-audio

---

## 🎯 Test in Battle Arena

### What to Look For:
1. **Before**: AI responds with rap text
2. **After**: StreamingAudioPlayer appears below AI response
3. **On Play**: Audio chunks play phrase-by-phrase
   - "Chunk 1/5: Yo, test the..."
   - "Chunk 2/5: audio streaming..."
   - etc.

### Test Steps:
```
1. Log in to app
2. Click "Battle Arena"
3. Select a character
4. Record your verse (3-5 seconds)
5. Wait for AI response
6. 🎵 StreamingAudioPlayer should appear with:
   - Current phrase display
   - Play/Pause button
   - Volume slider
   - Progress indicator (Chunk X/Y)
7. Click PLAY to hear audio chunks streaming
```

---

## 🎓 Test in Training Program

### What to Look For:
1. Coach gives feedback with encouragement
2. StreamingAudioPlayer appears in dialog
3. Audio automatically generated from coach message
4. Can play/pause coach feedback while reading

### Test Steps:
```
1. Go to Training Program
2. Select any lesson (e.g., "Basics")
3. Click the lesson card to open details
4. Scroll to "AI Coach" section
5. Enter practice response (e.g., "Yo I'm testing this feature out")
6. Click "Get AI Coaching"
7. 🎵 Wait for feedback dialog
8. Look for StreamingAudioPlayer above the encouragement
9. Click PLAY to hear coach feedback streaming
```

---

## 🔊 What You'll Hear

**Battle Arena**: AI opponent's rap text → audio chunks play progressively
- "Yo, I'm stepping to the mic with flow" (Chunk 1)
- "Breaking down the rhythm, stealing the show" (Chunk 2)
- "Your rhymes are weak, I'm about to drop" (Chunk 3)

**Training**: Coach feedback → audio chunks for coaching
- "You've got great rhyme density!" (Chunk 1)
- "Work on your flow consistency next." (Chunk 2)
- "Practice more internal rhymes!" (Chunk 3)

---

## 🎛️ Player Controls

When audio is playing, you'll see:

```
┌─────────────────────────────────────┐
│ Now playing: "Chunk 1 of 5"         │
│ Current phrase: "Yo test the..."    │
├─────────────────────────────────────┤
│ [⏮] [Play] [⏭] Volume: [=========]  │
├─────────────────────────────────────┤
│ Progress: ▓▓▓░░░░░░░ (Chunk 2 of 5) │
└─────────────────────────────────────┘
```

- **Play/Pause**: Start/stop audio
- **Skip**: Jump to next/previous chunk
- **Volume**: Adjust playback volume
- **Progress**: Shows which chunk is playing

---

## ✨ Features

✅ **Progressive Playback**: Audio plays as it's generated (no waiting)
✅ **Phrase Display**: See what's being spoken
✅ **Full Controls**: Play, pause, volume, skip
✅ **Visual Feedback**: Current chunk indicator
✅ **Smart Fallback**: Uses single audio if streaming unavailable
✅ **Both Locations**: Battle Arena + Training Program

---

## 🐛 Troubleshooting

**No audio player appears?**
- Verify AI response generated (check if text appears)
- Check browser console for errors
- Ensure GROQ_API_KEY is set

**Audio doesn't play?**
- Check if Groq API key is valid
- Look at server logs for streaming audio messages
- Try clicking PLAY button

**Chunks not splitting correctly?**
- Check server logs for chunk count
- Verify text is being sent to endpoint
- Fallback to single file should work

---

## 📊 Expected Behavior

### Battle Arena:
```
User records verse
           ↓
AI generates response (appears as text)
           ↓
After text finishes displaying (50ms per char)
           ↓
StreamingAudioPlayer appears ✅
           ↓
Audio chunks generate in background
           ↓
User can click PLAY
           ↓
Audio streams phrase by phrase 🎵
```

### Training:
```
Student enters response
           ↓
Click "Get AI Coaching"
           ↓
Coaching feedback generated
           ↓
Dialog opens with audio player ✅
           ↓
Audio playing encouragement + next steps
           ↓
Student can pause/play while reading
```

---

## 🎉 Success Indicators

- [ ] StreamingAudioPlayer component visible in Battle Arena
- [ ] StreamingAudioPlayer component visible in Training
- [ ] Play button works without errors
- [ ] Audio chunks display in sequence
- [ ] Volume control functional
- [ ] Pause/resume works smoothly
- [ ] Both locations have working audio

---

Enjoy testing the streaming audio! 🎵
