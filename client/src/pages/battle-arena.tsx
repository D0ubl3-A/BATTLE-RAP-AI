import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Mic, Trophy, Clock, Flame, Wifi, History, Share, Dumbbell, User, BarChart3, Volume2 } from "lucide-react";
import { CharacterSelector } from "@/components/character-selector";
import type { BattleCharacter } from "@shared/characters";
import { cloneToBattleCharacter } from "@shared/characters";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useBattleState } from "@/hooks/use-battle-state";
import { useSFXManager } from "@/hooks/useSFXManager";
import { RecordingPanel } from "@/components/recording-panel";
import { BattleAvatar } from "@/components/battle-avatar";
import { BattleTextDisplay } from "@/components/battle-text-display";
import { DialoguePanel } from "@/components/dialogue-panel";
import { SimpleAnalyzer } from "@/components/simple-analyzer";
import { formatDuration } from "@/lib/audio-utils";
import { preventMobileOverscroll, applyMobileScrollClasses } from "@/lib/mobile-scroll-prevention";
import { motion, AnimatePresence } from "framer-motion";
import { SEO, generateBattleArenaStructuredData } from "@/components/SEO";
import { Navigation } from "@/components/navigation";
const battleArenaImage = "/images/Epic_rap_battle_arena_5a01b4d4.png";

export default function BattleArena() {
  const [difficulty, setDifficulty] = useState<"easy" | "normal" | "hard">("normal");
  const [profanityFilter, setProfanityFilter] = useState(false);
  const [lyricComplexity, setLyricComplexity] = useState(75);
  const [styleIntensity, setStyleIntensity] = useState(85);
  const [advancedSettings, setAdvancedSettings] = useState({
    aiAggressiveness: 90,
    responseTime: 2000,
    analysisDepth: "enhanced" as const,
    voiceSpeed: 1.0,
    battleLength: 5
  });

  const structuredData = generateBattleArenaStructuredData();

  // Mobile scroll prevention refs
  const mainRef = useRef<HTMLElement>(null);
  const headerRef = useRef<HTMLElement>(null);

  const handleAdvancedSettingsChange = (newSettings: typeof advancedSettings) => {
    setAdvancedSettings(newSettings);
  };
  const [battleTimer, setBattleTimer] = useState(105);
  const [liveTranscription, setLiveTranscription] = useState("");
  const [aiResponse, setAiResponse] = useState("");
  const [currentAiAudio, setCurrentAiAudio] = useState<string>();
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isUserRecording, setIsUserRecording] = useState(false);
  const [selectedCharacter, setSelectedCharacter] = useState<BattleCharacter | null>(null);
  const [showCharacterSelector, setShowCharacterSelector] = useState(false);
  const [showLyricBreakdown, setShowLyricBreakdown] = useState(false);
  const [currentAnalysisText, setCurrentAnalysisText] = useState("");

  // Audio race condition prevention
  const [currentRequestId, setCurrentRequestId] = useState<string | null>(null);
  const typingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const lastChunkSFXRef = useRef(0);

  // Generate unique request ID
  const generateRequestId = useCallback(() => {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  // Clear typing timer utility
  const clearTypingTimer = useCallback(() => {
    if (typingTimerRef.current) {
      console.log('🧹 Clearing typing delay timer');
      clearTimeout(typingTimerRef.current);
      typingTimerRef.current = null;
    }
  }, []);

  // Cancel active request utility
  const cancelActiveRequest = useCallback(() => {
    if (abortControllerRef.current) {
      console.log('🚫 Aborting active network request');
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  const { toast } = useToast();
  
  // Set up global function for persistent score notifications
  useEffect(() => {
    (window as any).showPersistentScore = (userScore: number, aiScore: number) => {
      const isWinning = userScore > aiScore;
      const scoreDiff = Math.abs(userScore - aiScore);
      
      toast({
        title: isWinning ? "🎉 Round Score" : "💪 Round Score",
        description: `You: ${userScore} • AI: ${aiScore} ${isWinning ? '(+' + scoreDiff + ')' : '(-' + scoreDiff + ')'}`,
        duration: Infinity, // Stay on screen indefinitely
      });
    };
    
    return () => {
      delete (window as any).showPersistentScore;
    };
  }, [toast]);
  
  const {
    battleState,
    battle,
    rounds,
    currentBattleId,
    isLoading,
    isProcessing,
    startNewBattle,
    updateBattleState,
    submitRound,
    createBattleError,
  } = useBattleState();

  // Show error when battle creation fails
  useEffect(() => {
    if (createBattleError) {
      console.error('🔴 Battle creation error:', createBattleError);
      toast({
        title: "Battle Creation Failed",
        description: createBattleError.message,
        variant: "destructive",
      });
      setShowCharacterSelector(true);
    }
  }, [createBattleError, toast]);

  // Get latest round scores for authentic user stats (zero mock data)
  const getLatestUserScores = () => {
    if (!rounds || rounds.length === 0) {
      return { rhymeDensity: 0, flowQuality: 0, creativity: 0 };
    }
    
    // Get the most recent round with user input
    const latestRound = rounds[rounds.length - 1];
    if (!latestRound?.scores) {
      return { rhymeDensity: 0, flowQuality: 0, creativity: 0 };
    }
    
    return {
      rhymeDensity: Math.round(latestRound.scores.rhymeDensity || 0),
      flowQuality: Math.round(latestRound.scores.flowQuality || 0), 
      creativity: Math.round(latestRound.scores.creativity || 0)
    };
  };
  
  const userScores = getLatestUserScores();

  // SFX Manager for crowd reactions, bells, and air horns
  const {
    playRoundStartBell,
    playCrowdReaction,
    playIntelligentCrowdReaction,
    playEndingEffect,
    playDialogueSFX,
    stopAllSFX,
    config,
    enableRealtimeCrowdReactions,
    triggerCrowdOnSpeech,
    analyzeWordsForTriggers,
    isPlaying: isSFXPlaying,
    currentlyPlaying: currentSFX
  } = useSFXManager();

  // Fetch battle history
  const { data: battleHistory = [] } = useQuery({
    queryKey: ["/api/battles"],
  });

  // Battle timer countdown
  useEffect(() => {
    if (battleState?.timeRemaining && battleState.timeRemaining > 0) {
      const timer = setInterval(async () => {
        const newTime = battleState.timeRemaining - 1;
        setBattleTimer(newTime);
        if (newTime <= 0) {
          // 🏁 BATTLE ENDING - Play ending air horn effects
          console.log('🏁 Battle ended - playing ending effects');
          const userWon = (battleState?.userScore || 0) > (battleState?.aiScore || 0);
          playEndingEffect(userWon ? 'victory' : 'defeat');
          
          // Disable real-time crowd reactions
          enableRealtimeCrowdReactions(false);
          
          // End battle
          updateBattleState({ timeRemaining: 0 });
        }
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [battleState?.timeRemaining, updateBattleState]);

  // Initialize mobile scroll prevention
  useEffect(() => {
    const cleanupFunctions: (() => void)[] = [];

    // Apply mobile scroll prevention to main container
    if (mainRef.current) {
      applyMobileScrollClasses(mainRef.current, 'prevent-overscroll');
      cleanupFunctions.push(preventMobileOverscroll(mainRef.current, {
        preventPullToRefresh: true,
        preventVerticalOverscroll: true,
        preventHorizontalOverscroll: true,
        allowVerticalScroll: true,
        allowHorizontalScroll: false,
      }));
    }

    // Apply mobile scroll prevention to header
    if (headerRef.current) {
      applyMobileScrollClasses(headerRef.current, 'prevent-pull-to-refresh');
    }

    // Global document-level prevention
    document.body.classList.add('prevent-overscroll');
    document.documentElement.classList.add('prevent-overscroll');

    return () => {
      // Cleanup all mobile scroll prevention
      cleanupFunctions.forEach(cleanup => cleanup());
    };
  }, []);

  // Check for URL parameter to pre-select clone opponent
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const opponent = urlParams.get('opponent');
    
    if (opponent && opponent.startsWith('clone_')) {
      // Fetch clone data and auto-select it
      fetch(`/api/clone/${opponent.replace('clone_', '')}`, {
        credentials: 'include',
      })
        .then(res => res.json())
        .then(clone => {
          const cloneCharacter = cloneToBattleCharacter(clone);
          setSelectedCharacter(cloneCharacter);
          setShowCharacterSelector(false);
          // Auto-start battle
          startNewBattle(difficulty, profanityFilter, cloneCharacter.id, lyricComplexity, styleIntensity, advancedSettings.voiceSpeed);
        })
        .catch(err => {
          console.error('Failed to load clone:', err);
          setShowCharacterSelector(true);
        });
    }
  }, []);

  // Initialize new battle on component mount
  useEffect(() => {
    if (!currentBattleId && !showCharacterSelector && !selectedCharacter) {
      setShowCharacterSelector(true);
    }
  }, [currentBattleId, showCharacterSelector, selectedCharacter]);

  // Track currentAiAudio state changes for debugging
  useEffect(() => {
    console.log('🎵 AUDIO DEBUG: currentAiAudio state changed to:', currentAiAudio);
    console.log('🎵 AUDIO DEBUG: currentAiAudio length:', currentAiAudio?.length || 0);
    console.log('🎵 AUDIO DEBUG: currentAiAudio is valid URL:', currentAiAudio && currentAiAudio.startsWith('/') && currentAiAudio.length > 10);
  }, [currentAiAudio]);

  // Cleanup on component unmount - prevent memory leaks and race conditions
  useEffect(() => {
    return () => {
      console.log('🧹 Component unmounting - cleaning up timers and requests');
      clearTypingTimer();
      cancelActiveRequest();
    };
  }, [clearTypingTimer, cancelActiveRequest]);

  const handleRecordingComplete = async (recording: { blob: Blob; duration: number; url: string }) => {
    setIsUserRecording(false);
    try {
      // 🎯 RACE CONDITION PREVENTION - Generate unique request ID and setup AbortController
      const requestId = generateRequestId();
      setCurrentRequestId(requestId);
      console.log('🎯 Starting new round with request ID:', requestId);
      
      // Cancel any previous requests and clear timers
      clearTypingTimer();
      cancelActiveRequest();
      
      // Setup new AbortController for this request
      const abortController = new AbortController();
      abortControllerRef.current = abortController;
      
      // 🎵 OLD AUDIO ALREADY CLEARED - Audio was cleared when recording started in handleRecordingStart
      // No need to clear again here as it interferes with new audio timing
      
      setIsTranscribing(true);
      
      // 🤫 NO AUTO-CROWD REACTIONS - Only intelligent analysis will trigger reactions
      
      // INSTANT TRANSCRIPTION: Get transcription immediately when recording stops
      console.log('🔥 Starting instant transcription...');
      
      if (currentBattleId) {
        try {
          const formData = new FormData();
          formData.append('audio', recording.blob);
          
          const transcriptionResponse = await fetch(`/api/battles/${currentBattleId}/transcribe`, {
            method: 'POST',
            body: formData,
            signal: abortController.signal,
          });
          
          if (transcriptionResponse.ok) {
            const transcriptionData = await transcriptionResponse.json();
            console.log(`✅ Instant transcription received (${transcriptionData.processingTime}ms): "${transcriptionData.userText}"`);
            
            // Show transcription immediately
            setLiveTranscription(transcriptionData.userText || "Voice input processed");
            
            // 🎯 REAL-TIME WORD-TRIGGERED CROWD REACTIONS - Instant response to trigger words
            if (transcriptionData.userText && transcriptionData.userText.length > 2) {
              console.log('🎯 Analyzing words for instant crowd triggers:', transcriptionData.userText);
              analyzeWordsForTriggers(transcriptionData.userText);
            }
            
            // 🧠 INTELLIGENT CROWD REACTION - Only for substantial user performances
            if (transcriptionData.userText && transcriptionData.userText.length > 50 && transcriptionData.userText.split(' ').length > 8) {
              console.log('🧠 Triggering intelligent crowd reaction for substantial performance:', transcriptionData.userText.substring(0, 50) + '...');
              playIntelligentCrowdReaction(transcriptionData.userText, {
                battlePhase: battleState?.currentRound === 1 ? 'opening' : 
                           battleState?.currentRound === battleState?.maxRounds ? 'closing' : 'middle',
                userPerformanceScore: battleState?.userScore
              });
            } else {
              console.log('🧠 Skipping user crowd reaction - performance too brief:', transcriptionData.userText?.length || 0, 'chars');
            }
            
            toast({
              title: "Transcription Complete!",
              description: "Processing AI response...",
            });
          }
        } catch (transcriptionError) {
          console.log('⚠️ Instant transcription failed, falling back to full processing');
        }
      }
      
      // Now start full battle processing (AI response, scoring, etc.)
      setIsTranscribing(false);
      updateBattleState({ isAIResponding: true });

      const result = await submitRound({ audio: recording.blob });
      
      if (result) {
        console.log('🎉 Full battle result received:', {
          userText: result.userText?.substring(0, 50) + '...',
          aiResponse: result.aiResponse?.substring(0, 50) + '...',
          audioUrl: result.audioUrl?.substring(0, 50) + '...',
          userScore: result.userScore,
          aiScore: result.aiScore
        });
        
        // Update transcription if we got a better one from full processing
        if (result.userText && result.userText !== liveTranscription) {
          console.log('🔄 Updating transcription:', result.userText);
          setLiveTranscription(result.userText);
        }
        
        if (result.aiResponse) {
          console.log('🤖 Setting AI response:', result.aiResponse.substring(0, 100) + '...');
          console.log('🤖 AI response length:', result.aiResponse.length);
          console.log('🤖 Current aiResponse state before setting:', aiResponse?.substring(0, 50) + '...');
          
          // Clear AI responding state FIRST
          updateBattleState({ isAIResponding: false });
          
          // Then set the AI response
          setAiResponse(result.aiResponse);
          
          console.log('🤖 AI response state should be updated now');
          
          // 🎆 Only trigger crowd reactions for truly impressive AI responses (score > 70)
          if (result.aiResponse && result.aiResponse.length > 20 && (result.aiScore || 0) > 70) {
            console.log('🤖 Triggering AI crowd reaction for high-scoring response:', result.aiResponse.substring(0, 50) + '...');
            playIntelligentCrowdReaction(result.aiResponse, {
              battlePhase: (battleState?.currentRound || 1) === (battleState?.maxRounds || 3) ? 'closing' : 'middle',
              userPerformanceScore: result.aiScore || 0
            });
          } else {
            console.log('🤖 Skipping crowd reaction - AI score too low:', result.aiScore || 0);
          }
        } else {
          console.log('⚠️ No AI response in result');
          updateBattleState({ isAIResponding: false });
        }
        
        // Set audio URL for playback via system player button
        if (result.audioUrl) {
          console.log('🎵 AI audio received, setting for playback');
          console.log('🎵 Audio URL length:', result.audioUrl.length);
          setCurrentAiAudio(result.audioUrl);
        }
        
        toast({
          title: "Round Complete!",
          description: `Score: You ${result.userScore || 0} - AI ${result.aiScore || 0}`,
        });
      }
    } catch (error) {
      toast({
        title: "Battle Error",
        description: error instanceof Error ? error.message : "Failed to process battle round",
        variant: "destructive",
      });
    } finally {
      setIsTranscribing(false);
      updateBattleState({ isAIResponding: false });
    }
  };

  const handleRecordingStart = () => {
    // 🎵 PREVENT RACE CONDITIONS - Clear all pending timers and requests
    console.log('🧹 User started recording - preventing race conditions');
    clearTypingTimer();
    cancelActiveRequest();
    setCurrentRequestId(null);
    
    // 🎵 CLEAR OLD AUDIO - Immediately clear previous AI audio when user starts new round
    console.log('🧹 User started recording - clearing previous AI audio');
    setCurrentAiAudio(undefined);
    setAiResponse("");  // Also clear previous AI text
    setLiveTranscription("");  // Clear previous transcription
    
    // 🎤 TRIGGER CROWD REACTIONS - Original crowd reaction functionality
    console.log('🎤 User started recording - triggering crowd on speech');
    triggerCrowdOnSpeech();
    setIsUserRecording(true);
  };

  useEffect(() => {
    window.audioChunkCallback = (chunk: Blob) => {
      if (!isUserRecording || !config.crowdReactions.enabled) return;

      const now = Date.now();
      if (now - lastChunkSFXRef.current < 1200) {
        return;
      }

      const size = chunk.size;
      const intensity = size > 18000 ? 'wild' : size > 9000 ? 'medium' : 'mild';
      playCrowdReaction(intensity);
      lastChunkSFXRef.current = now;
    };

    return () => {
      window.audioChunkCallback = undefined;
    };
  }, [isUserRecording, config.crowdReactions.enabled, playCrowdReaction]);

  const handleNewBattle = () => {
    setLiveTranscription("");
    setAiResponse("");
    setCurrentAiAudio(undefined);
    setBattleTimer(105);
    setSelectedCharacter(null);
    setShowCharacterSelector(true);
  };

  const handleCharacterSelect = (character: BattleCharacter) => {
    console.log('🎯 Character selected:', character.displayName);
    setSelectedCharacter(character);
    setShowCharacterSelector(false);
    
    // 🔔 ROUND START BELL - Play boxing bell when battle begins
    console.log('🔔 Playing round start bell for new battle');
    playRoundStartBell();
    
    // Enable real-time crowd reactions for this battle
    enableRealtimeCrowdReactions(true);
    
    // Start battle with selected character and complexity settings
    startNewBattle(difficulty, profanityFilter, character.id, lyricComplexity, styleIntensity, advancedSettings.voiceSpeed);
  };

  const handleDifficultyChange = (value: string) => {
    setDifficulty(value as "easy" | "normal" | "hard");
    if (currentBattleId) {
      updateBattleState({ difficulty: value as "easy" | "normal" | "hard" });
    }
  };

  const getProgressPercentage = () => {
    if (!battleState) return 50;
    const total = battleState.userScore + battleState.aiScore;
    return total > 0 ? (battleState.userScore / total) * 100 : 50;
  };

  const getConnectionStatus = () => {
    return "Connected";
  };

  const handleAnalyzeLyrics = (text: string, source: string) => {
    console.log(`🎯 Analyzing lyrics from ${source}: ${text.substring(0, 50)}...`);
    setCurrentAnalysisText(text);
    setShowLyricBreakdown(true);
  };

  const handleCloseLyricBreakdown = () => {
    setShowLyricBreakdown(false);
    setCurrentAnalysisText("");
  };

  const handleViewAllBattles = () => {
    console.log("📊 Navigating to battle history");
    // Navigate to full battle history page
  };

  const handlePracticeMode = () => {
    console.log("🎯 Starting practice mode");
    handleNewBattle(); // Reuse battle start logic
  };

  const handleShareResults = () => {
    console.log("📤 Sharing battle results");
    if (navigator.share && battleState) {
      navigator.share({
        title: "Epic Rap Battle",
        text: `I just battled AI and scored ${battleState.userScore}! Can you beat my score?`,
        url: window.location.href
      }).catch(err => console.log('Share cancelled or failed:', err));
    } else {
      toast({ title: "Share Results", description: "Copy the link to share your battle!" });
    }
  };

  const handleEmergencyStop = () => {
    console.log("🛑 Emergency stop triggered");
    updateBattleState({ currentRound: 0, isAIResponding: false });
    cancelActiveRequest();
    stopAllSFX();
    setLiveTranscription("");
    setAiResponse("");
    setCurrentAiAudio(undefined);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl font-orbitron font-bold text-accent-gold mb-4">
            Initializing Battle Arena...
          </div>
          <div className="animate-spin w-8 h-8 border-4 border-accent-blue border-t-transparent rounded-full mx-auto"></div>
        </div>
      </div>
    );
  }

  return (
    <>
      <SEO
        title="Battle Arena - Epic AI Rap Battles | Battle Rap AI"
        description="Face off against AI opponents in voice-powered rap battles with real-time scoring. Choose your opponent, select difficulty, and prove your skills."
        keywords={['rap battle arena', 'voice rap game', 'AI battle', 'freestyle competition', 'real-time scoring', 'voice recognition']}
        structuredData={structuredData}
      />
      <Navigation />
      {/* Header */}
      <header ref={headerRef} className="bg-secondary-dark border-b border-battle-gray px-4 py-3 prevent-pull-to-refresh">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Mic className="text-accent-gold text-2xl" />
            <h1 className="font-orbitron font-bold text-2xl bg-gradient-to-r from-accent-gold to-accent-red bg-clip-text text-transparent">
              RapBots
            </h1>
            <Badge variant="secondary" className="bg-accent-blue text-white">
              ARENA
            </Badge>
          </div>
          <div className="flex items-center space-x-4">
            {/* Streak display removed - no mock data */}
            <div className="text-sm text-gray-400">
              <span>Score: </span>
              <span className="text-accent-blue font-semibold">
                {battleState?.userScore || 0}
              </span>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => window.location.href = '/fine-tuning'}
              className="bg-battle-gray hover:bg-gray-600 border-gray-600 mr-2"
              data-testid="button-fine-tuning"
              title="Fine-tune Custom Models"
            >
              🧠
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              className="bg-battle-gray hover:bg-gray-600 border-gray-600"
              data-testid="button-settings"
            >
              ⚙️
            </Button>
          </div>
        </div>
      </header>

      <main ref={mainRef} className="min-h-screen relative prevent-overscroll mobile-scroll-safe">
        {/* Battle Arena Background */}
        <div 
          className="fixed inset-0 bg-cover bg-center bg-no-repeat opacity-50 z-0 pointer-events-none"
          style={{ backgroundImage: `url(${battleArenaImage})` }}
        />
        <div className="relative z-10 max-w-7xl mx-auto px-4 py-6">
          {/* Character Selection Modal - Neon Apex Design */}
          <AnimatePresence>
            {showCharacterSelector && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4"
              >
                <motion.div
                  initial={{ scale: 0.8, opacity: 0, y: 50 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  exit={{ scale: 0.8, opacity: 0, y: 50 }}
                  transition={{ type: "spring", damping: 25, stiffness: 300 }}
                  className="glass-card neon-border-magenta p-6 max-w-4xl w-full max-h-[80vh] overflow-y-auto"
                >
                  <div className="mb-6">
                    <motion.h2 
                      className="text-2xl font-orbitron font-bold text-center text-neon-magenta mb-2"
                      animate={{ textShadow: ["0 0 10px #ff0090", "0 0 20px #ff0090", "0 0 10px #ff0090"] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      Select Your Opponent
                    </motion.h2>
                    <p className="text-prism-cyan text-center">
                      Each character has unique voice, style, and difficulty level
                    </p>
                  </div>
                  
                  <CharacterSelector
                    onCharacterSelect={handleCharacterSelect}
                    selectedCharacter={selectedCharacter || undefined}
                  />
                  
                  <div className="flex justify-center mt-6">
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      <Button
                        variant="outline"
                        onClick={() => setShowCharacterSelector(false)}
                        className="glass-panel border-gray-600 text-gray-400 hover:bg-gradient-card-bg hover-lift"
                        data-testid="button-cancel-character-select"
                      >
                        Cancel
                      </Button>
                    </motion.div>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
          {/* Battle Status Bar - Neon Apex Design */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Card className="mb-6 glass-card">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-4">
                    <Badge className="stat-badge bg-gradient-primary-bg text-white px-3 py-1">
                      <Flame className="mr-1" size={16} />
                      BATTLE MODE
                    </Badge>
                    <div className="text-neon-magenta font-semibold glow-pulse-magenta" data-testid="text-current-round">
                      Round {battleState?.currentRound || 1}/{battleState?.maxRounds || 3}
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    {/* Battle Timer */}
                    <div className="flex items-center space-x-2 glass-panel px-4 py-2 rounded-lg">
                      <Clock className="text-prism-cyan" size={16} />
                      <span className="font-orbitron font-bold text-lg text-prism-cyan" data-testid="text-battle-timer">
                        {formatDuration(battleTimer)}
                      </span>
                    </div>
                    {/* Difficulty */}
                    <Select value={difficulty} onValueChange={handleDifficultyChange}>
                      <SelectTrigger className="w-32 glass-panel border-gray-600 hover-lift" data-testid="select-difficulty">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="glass-card border-gray-600">
                        <SelectItem value="easy">Easy</SelectItem>
                        <SelectItem value="normal">Normal</SelectItem>
                        <SelectItem value="hard">Hard</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                {/* Enhanced Battle Score Display */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <motion.div 
                      className="text-center glass-panel rounded-lg px-6 py-4 neon-border-magenta glow-pulse-magenta"
                      whileHover={{ scale: 1.05 }}
                      transition={{ type: "spring", stiffness: 300 }}
                    >
                      <div className="text-neon-magenta font-semibold text-sm">YOU</div>
                      <div className="text-3xl font-orbitron font-bold text-white" data-testid="text-user-score">
                        {battleState?.userScore || 0}
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        Round {battleState?.currentRound || 1} Score
                      </div>
                    </motion.div>
                    
                    <div className="flex-1 mx-8 text-center">
                      <Progress 
                        value={getProgressPercentage()} 
                        className="h-3 bg-battle-gray"
                        data-testid="progress-battle-score"
                      />
                      <div className="text-center text-sm font-bold mt-2 text-neon-magenta">
                        BATTLE SCORE
                      </div>
                      <div className="text-xs text-prism-cyan">
                        {(battleState?.userScore || 0) > (battleState?.aiScore || 0) ? "YOU LEAD" : 
                         (battleState?.aiScore || 0) > (battleState?.userScore || 0) ? "AI LEADS" : "TIED"}
                      </div>
                    </div>
                    
                    <motion.div 
                      className="text-center glass-panel rounded-lg px-6 py-4 neon-border-cyan"
                      whileHover={{ scale: 1.05 }}
                      transition={{ type: "spring", stiffness: 300 }}
                    >
                      <div className="text-prism-cyan font-semibold text-sm">AI BOT</div>
                      <div className="text-3xl font-orbitron font-bold text-white" data-testid="text-ai-score">
                        {battleState?.aiScore || 0}
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        Round {battleState?.currentRound || 1} Score
                      </div>
                    </motion.div>
                  </div>
                  
                  {/* Round History */}
                  {rounds && rounds.length > 0 && (
                    <motion.div 
                      className="flex justify-center space-x-2 glass-panel rounded-lg p-2"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.3 }}
                    >
                      <div className="text-xs text-gray-400">Round History:</div>
                      {rounds.map((round, index) => (
                        <div key={round.id} className="flex items-center space-x-1 text-xs">
                          <span className="text-neon-magenta font-semibold">{round.scores?.userScore || 0}</span>
                          <span className="text-gray-500">vs</span>
                          <span className="text-prism-cyan font-semibold">{round.scores?.aiScore || 0}</span>
                          {index < rounds.length - 1 && <span className="text-gray-600">•</span>}
                        </div>
                      ))}
                    </motion.div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* User Controls Panel */}
            <div className="space-y-6">
              {/* Recording Panel */}
              <RecordingPanel
                onRecordingComplete={handleRecordingComplete}
                onRecordingStart={handleRecordingStart}
                onTextSubmit={async (text) => {
                  console.log('📝 User submitted text verse:', text.substring(0, 50) + '...');
                  triggerCrowdOnSpeech();
                  
                  // 🎯 RACE CONDITION PREVENTION - Generate unique request ID and setup AbortController
                  const requestId = generateRequestId();
                  setCurrentRequestId(requestId);
                  console.log('🎯 Starting text submission with request ID:', requestId);
                  
                  // Cancel any previous requests and clear timers
                  clearTypingTimer();
                  cancelActiveRequest();
                  
                  // Setup new AbortController for this request
                  const abortController = new AbortController();
                  abortControllerRef.current = abortController;
                  
                  // Start AI responding state
                  updateBattleState({ isAIResponding: true });
                  
                  try {
                    const result = await submitRound({ userVerse: text });
                    
                    if (result) {
                      console.log('🎉 Battle round response received:', {
                        hasUserText: !!result.userText,
                        hasAiResponse: !!result.aiResponse,
                        hasAudioUrl: !!result.audioUrl,
                        userScore: result.userScore,
                        aiScore: result.aiScore,
                        keys: Object.keys(result)
                      });
                      
                      // Update transcription
                      if (result.userText) {
                        setLiveTranscription(result.userText);
                      }
                      
                      if (result.aiResponse) {
                        console.log('🤖 Setting AI response:', result.aiResponse.substring(0, 100) + '...');
                        console.log('🤖 AI response length:', result.aiResponse.length);
                        console.log('🤖 Current aiResponse state before setting:', aiResponse?.substring(0, 50) + '...');
                        
                        // Clear AI responding state FIRST
                        updateBattleState({ isAIResponding: false });
                        
                        // Then set the AI response
                        setAiResponse(result.aiResponse);
                        
                        console.log('🤖 AI response state should be updated now');
                        
                        // Trigger crowd reactions for high-scoring AI responses
                        if (result.aiResponse && result.aiResponse.length > 20 && (result.aiScore || 0) > 70) {
                          console.log('🤖 Triggering AI crowd reaction for high-scoring response:', result.aiResponse.substring(0, 50) + '...');
                          playIntelligentCrowdReaction(result.aiResponse, {
                            battlePhase: (battleState?.currentRound || 1) === (battleState?.maxRounds || 3) ? 'closing' : 'middle',
                            userPerformanceScore: result.aiScore || 0
                          });
                        }
                      }
                      
                      // Wait for AI text to finish typing before starting audio - with race condition protection
                      const textLength = result.aiResponse?.length || 0;
                      const typingDelay = Math.min(textLength * 50, 3000); // 50ms per character, max 3 seconds
                      
                      console.log('🎵 Waiting', typingDelay, 'ms for text to finish displaying...');
                      
                      // Clear any existing timer before setting new one
                      clearTypingTimer();
                      
                      // Set new timer with request ID verification
                      typingTimerRef.current = setTimeout(() => {
                        // ✅ RACE CONDITION PROTECTION - Only set audio if this is still the current request
                        if (currentRequestId === requestId) {
                          console.log('🎵 Text display complete - setting audio for request:', requestId);
                          console.log('🎵 AUDIO DEBUG (delayed): result.audioUrl:', result.audioUrl);
                          console.log('🎵 AUDIO DEBUG (delayed): audioUrl length:', result.audioUrl?.length || 0);
                          console.log('🎵 AUDIO DEBUG (delayed): audioUrl type:', typeof result.audioUrl);
                          console.log('🎵 AUDIO DEBUG (delayed): audioUrl valid:', result.audioUrl && result.audioUrl.length > 10);
                          setCurrentAiAudio(result.audioUrl);
                          console.log('🎵 AUDIO DEBUG (delayed): currentAiAudio state should now be set to:', result.audioUrl?.substring(0, 100));
                        } else {
                          console.log('🚫 Ignoring stale audio for old request:', requestId, '(current:', currentRequestId, ')');
                        }
                        typingTimerRef.current = null;
                      }, typingDelay);
                      
                      console.log('🎵 Audio will be set after typing delay for request:', requestId);
                      console.log('🎵 Audio URL length:', result.audioUrl?.length || 0);
                      console.log('🎵 Audio available:', !!result.audioUrl);
                      console.log('🎵 AUDIO DEBUG (immediate): result.audioUrl:', result.audioUrl);
                      console.log('🎵 AUDIO DEBUG (immediate): audioUrl type:', typeof result.audioUrl);
                      console.log('🎵 AUDIO DEBUG (immediate): audioUrl valid:', result.audioUrl && result.audioUrl.length > 10);
                      setCurrentAiAudio(result.audioUrl);
                      console.log('🎵 AUDIO DEBUG (immediate): currentAiAudio state should now be set to:', result.audioUrl?.substring(0, 100));
                      
                      // FORCE AUTO-PLAY TTS - All AI responses must play automatically
                      if (result.audioUrl && result.audioUrl.length > 100) {
                        console.log('🔥 FORCING AUTOPLAY - AI must speak now!');
                        console.log('🔥 Audio URL ready for FORCED playback:', result.audioUrl.substring(0, 100) + '...');
                        
                        // Immediately trigger FORCED audio playback state
                        updateBattleState({ isPlayingAudio: true });
                        
                        // Enhanced audio playback trigger with multiple attempts
                        setTimeout(() => {
                          console.log('🔥 Enhanced autoplay trigger - attempt 1');
                          updateBattleState({ isPlayingAudio: true });
                          
                          // Additional trigger after ensuring audio component is ready
                          setTimeout(() => {
                            console.log('🔥 Enhanced autoplay trigger - attempt 2');
                            updateBattleState({ isPlayingAudio: true });
                          }, 200);
                        }, 50);
                      }
                      
                      toast({
                        title: "Round Complete!",
                        description: `Score: You ${result.userScore || 0} - AI ${result.aiScore || 0}`,
                      });
                    }
                  } catch (error) {
                    toast({
                      title: "Battle Error",
                      description: error instanceof Error ? error.message : "Failed to process battle round",
                      variant: "destructive",
                    });
                  } finally {
                    updateBattleState({ isAIResponding: false });
                  }
                }}
                profanityFilter={profanityFilter}
                onProfanityFilterChange={setProfanityFilter}
                lyricComplexity={lyricComplexity}
                onLyricComplexityChange={setLyricComplexity}
                styleIntensity={styleIntensity}
                onStyleIntensityChange={setStyleIntensity}
                disabled={isProcessing || battleState?.isAIResponding}
              />

              {/* User Score Panel - Neon Apex Design */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                <Card className="glass-card neon-border-magenta">
                  <CardContent className="p-6">
                    <h3 className="font-orbitron font-bold text-lg mb-4 text-neon-magenta">
                      <Trophy className="inline mr-2" size={20} />
                      Your Stats
                    </h3>
                    
                    <div className="space-y-4">
                      <motion.div 
                        className="flex justify-between items-center"
                        whileHover={{ x: 5 }}
                      >
                        <span className="text-gray-400">Rhyme Density</span>
                        <div className="flex items-center space-x-2">
                          <Progress value={userScores.rhymeDensity} className="w-16 h-2" />
                          <span className={`stat-badge ${userScores.rhymeDensity > 70 ? 'text-neon-magenta' : 'text-prism-cyan'}`} data-testid="text-rhyme-density">
                            {userScores.rhymeDensity}%
                          </span>
                        </div>
                      </motion.div>
                      
                      <motion.div 
                        className="flex justify-between items-center"
                        whileHover={{ x: 5 }}
                      >
                        <span className="text-gray-400">Flow Quality</span>
                        <div className="flex items-center space-x-2">
                          <Progress value={userScores.flowQuality} className="w-16 h-2" />
                          <span className={`stat-badge ${userScores.flowQuality > 70 ? 'text-neon-magenta' : 'text-prism-cyan'}`} data-testid="text-flow-quality">
                            {userScores.flowQuality}%
                          </span>
                        </div>
                      </motion.div>
                      
                      <motion.div 
                        className="flex justify-between items-center"
                        whileHover={{ x: 5 }}
                      >
                        <span className="text-gray-400">Creativity</span>
                        <div className="flex items-center space-x-2">
                          <Progress value={userScores.creativity} className="w-16 h-2" />
                          <span className={`stat-badge ${userScores.creativity > 70 ? 'text-neon-magenta' : 'text-prism-cyan'}`} data-testid="text-creativity">
                            {userScores.creativity}%
                          </span>
                        </div>
                      </motion.div>

                      <div className="pt-4 border-t border-gray-600">
                        <div className="text-center gradient-card-bg rounded-lg p-3">
                          <motion.div 
                            className="text-2xl font-orbitron font-bold text-neon-magenta" 
                            data-testid="text-total-score"
                            animate={{ scale: [1, 1.1, 1] }}
                            transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
                          >
                            {battleState?.userScore || 0}
                          </motion.div>
                          <div className="text-sm text-gray-400">Total Score</div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </div>

            {/* Central Battle Arena */}
            <div className="space-y-6">
              {/* Avatar Section - Neon Apex Design */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
                className={`glass-panel rounded-lg p-4 ${battleState?.isAIResponding ? 'neon-border-cyan glow-pulse-cyan' : ''}`}
              >
                <BattleAvatar
                  isAISpeaking={battleState?.isPlayingAudio || false}
                  battleState={battleState?.isAIResponding ? "battle" : "idle"}
                  character={selectedCharacter || undefined}
                />
              </motion.div>

              {/* Audio Playback - System Default Player */}
              {currentAiAudio && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  <Button
                    onClick={() => {
                      console.log('🔊 Opening audio in system player: ' + currentAiAudio);
                      updateBattleState({ isPlayingAudio: true });
                      window.open(currentAiAudio, '_blank');
                      setTimeout(() => updateBattleState({ isPlayingAudio: false }), 500);
                    }}
                    className="w-full gradient-primary-bg hover-lift flex items-center justify-center gap-2"
                    size="lg"
                  >
                    <Volume2 className="w-5 h-5" />
                    Play AI Verse in System Player
                  </Button>
                </motion.div>
              )}

              {/* Battle Text Display - Neon Apex Design */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                <BattleTextDisplay
                  liveTranscription={liveTranscription}
                  aiResponse={aiResponse}
                  isTranscribing={isTranscribing}
                  isAIGenerating={battleState?.isAIResponding}
                  onClear={() => {
                    setLiveTranscription("");
                    setAiResponse("");
                  }}
                />
              </motion.div>

              {/* Dialogue Panel - Visual Dialogue with SFX */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <DialoguePanel
                  userDialogue={liveTranscription}
                  aiDialogue={aiResponse}
                  isUserSpeaking={isTranscribing}
                  isAISpeaking={battleState?.isAIResponding}
                  onDialogueSFX={playDialogueSFX}
                />
              </motion.div>

              {/* Lyric Analysis Buttons - Neon Apex Design */}
              <AnimatePresence>
                {(liveTranscription || aiResponse) && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3 }}
                  >
                    <Card className="glass-card">
                      <CardContent className="p-4">
                        <h3 className="font-orbitron font-bold text-sm mb-3 text-neon-magenta">
                          Interactive Lyric Analysis
                        </h3>
                        <div className="flex gap-2">
                          {liveTranscription && (
                            <Button
                              onClick={() => handleAnalyzeLyrics(liveTranscription, "user")}
                              variant="outline"
                              size="sm"
                              className="flex-1 neon-border-magenta text-neon-magenta hover:bg-gradient-card-bg hover-lift"
                              data-testid="button-analyze-user-lyrics"
                            >
                              <BarChart3 className="w-4 h-4 mr-1" />
                              Analyze Your Verse
                            </Button>
                          )}
                          {aiResponse && (
                            <Button
                              onClick={() => handleAnalyzeLyrics(aiResponse, "ai")}
                              variant="outline"
                              size="sm"
                              className="flex-1 neon-border-cyan text-prism-cyan hover:bg-gradient-card-bg hover-lift"
                              data-testid="button-analyze-ai-lyrics"
                            >
                              <BarChart3 className="w-4 h-4 mr-1" />
                              Analyze AI Response
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* AI & Audio Controls Panel */}
            <div className="space-y-6">

              {/* Battle History - Neon Apex Design */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
              >
                <Card className="glass-card">
                  <CardContent className="p-6">
                    <h3 className="font-orbitron font-bold text-lg mb-4 text-prism-cyan">
                      <History className="inline mr-2" size={20} />
                      Battle History
                    </h3>

                    <div className="space-y-3 max-h-64 overflow-y-auto">
                      <AnimatePresence>
                        {Array.isArray(battleHistory) && battleHistory.slice(0, 3).map((historyBattle: any, index: number) => (
                          <motion.div
                            key={historyBattle.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ delay: index * 0.1 }}
                            className="glass-panel rounded-lg p-3 border border-gray-600 hover-lift"
                            whileHover={{ scale: 1.02 }}
                            data-testid={`card-battle-history-${index}`}
                          >
                            <div className="flex justify-between items-center">
                              <div>
                                <div className="font-semibold text-sm text-white">Battle #{index + 47}</div>
                                <div className="text-xs text-gray-400">
                                  {new Date(historyBattle.createdAt).toLocaleDateString()}
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-neon-magenta font-bold">
                                  {historyBattle.userScore} - {historyBattle.aiScore}
                                </div>
                                <div className={`text-xs stat-badge ${
                                  historyBattle.userScore > historyBattle.aiScore 
                                    ? "text-neon-magenta" 
                                    : "text-prism-cyan"
                                }`}>
                                  {historyBattle.userScore > historyBattle.aiScore ? "VICTORY" : "DEFEAT"}
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </div>

                    <Button 
                      onClick={handleViewAllBattles}
                      className="w-full mt-4 gradient-primary-bg hover-lift" 
                      variant="default"
                      data-testid="button-view-all-battles"
                    >
                      View All Battles
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Quick Actions - Neon Apex Design */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.4 }}
              >
                <Card className="glass-card">
                  <CardContent className="p-6">
                    <h3 className="font-orbitron font-bold text-lg mb-4 text-neon-magenta">Quick Actions</h3>
                    
                    <div className="space-y-3">
                      <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                        <Button
                          onClick={handleNewBattle}
                          disabled={isProcessing}
                          className="w-full gradient-primary-bg hover-lift"
                          data-testid="button-new-battle"
                        >
                          <Flame className="mr-2" size={16} />
                          New Battle
                        </Button>
                      </motion.div>
                      
                      <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                        <Button
                          onClick={handlePracticeMode}
                          variant="outline"
                          className="w-full neon-border-cyan text-prism-cyan hover:bg-gradient-card-bg hover-lift"
                          data-testid="button-practice-mode"
                        >
                          <Dumbbell className="mr-2" size={16} />
                          Practice Mode
                        </Button>
                      </motion.div>
                      
                      <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                        <Button
                          onClick={handleShareResults}
                          variant="outline"
                          className="w-full glass-panel border-gray-600 hover-lift"
                          data-testid="button-share-results"
                        >
                          <Share className="mr-2" size={16} />
                          Share Results
                        </Button>
                      </motion.div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </div>
        </div>
      </main>

      {/* Bottom Audio Bar - Neon Apex Design */}
      <motion.div 
        className="fixed bottom-0 left-0 right-0 glass-panel border-t border-gray-700 px-4 py-3"
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5, delay: 0.5 }}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
              <Button
                onClick={handleEmergencyStop}
                variant="destructive"
                size="sm"
                className="gradient-primary-bg w-12 h-12 rounded-full hover-lift"
                data-testid="button-emergency-stop"
              >
                ⏹️
              </Button>
            </motion.div>
            <div className="text-sm">
              <div className="font-semibold text-neon-magenta">Battle in Progress</div>
              <div className="text-prism-cyan" data-testid="text-battle-status">
                Round {battleState?.currentRound || 1} of {battleState?.maxRounds || 3}
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-2 stat-badge">
              <Wifi className="text-prism-cyan glow-pulse-cyan" size={16} />
              <span className="text-sm text-prism-cyan" data-testid="text-connection-status">
                {getConnectionStatus()}
              </span>
            </div>
            <div className="text-sm text-gray-400">
              API Status: <span className="text-neon-magenta stat-badge" data-testid="text-api-status">Online</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Lyric Analysis Modal */}
      {showLyricBreakdown && currentAnalysisText && (
        <SimpleAnalyzer
          text={currentAnalysisText}
          onClose={handleCloseLyricBreakdown}
          isVisible={true}
        />
      )}

    </>
  );
}
