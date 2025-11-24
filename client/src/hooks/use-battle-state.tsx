import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { type BattleState, type Battle, type BattleRound } from "@shared/schema";

export function useBattleState(battleId?: string) {
  const [currentBattleId, setCurrentBattleId] = useState<string | undefined>(battleId);

  // Fetch battle state
  const { data: battleState, isLoading: stateLoading } = useQuery({
    queryKey: ["/api/battles", currentBattleId, "state"],
    enabled: !!currentBattleId,
  });

  // Fetch battle details
  const { data: battle, isLoading: battleLoading } = useQuery({
    queryKey: ["/api/battles", currentBattleId],
    enabled: !!currentBattleId,
  });

  // Fetch battle rounds
  const { data: rounds, isLoading: roundsLoading } = useQuery({
    queryKey: ["/api/battles", currentBattleId, "rounds"],
    enabled: !!currentBattleId,
  });

  // Create new battle mutation
  const createBattleMutation = useMutation({
    mutationFn: async (battleData: { 
      difficulty: string; 
      profanityFilter: boolean; 
      aiCharacterId?: string;
      lyricComplexity?: number;
      styleIntensity?: number;
      voiceSpeed?: number;
    }) => {
      console.log('🎯 Creating battle with data:', battleData);
      const res = await apiRequest("POST", "/api/battles", battleData);
      const data = await res.json();
      console.log('✅ Battle created:', data);
      return data;
    },
    onSuccess: (data: Battle) => {
      console.log('🎉 Battle mutation success, setting battle ID:', data.id);
      setCurrentBattleId(data.id);
      queryClient.invalidateQueries({ queryKey: ["/api/battles"] });
    },
    onError: (error: Error) => {
      console.error('❌ Battle creation failed:', error.message);
    },
  });

  // Update battle state mutation
  const updateStateMutation = useMutation({
    mutationFn: async (updates: Partial<BattleState>) => {
      if (!currentBattleId) throw new Error("No active battle");
      const res = await apiRequest("PATCH", `/api/battles/${currentBattleId}/state`, updates);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ["/api/battles", currentBattleId, "state"] 
      });
    },
  });

  // Process battle round mutation
  const processBattleRoundMutation = useMutation({
    mutationFn: async (data: { audio?: Blob; userVerse?: string }) => {
      if (!currentBattleId) throw new Error("No active battle");
      
      const formData = new FormData();
      if (data.audio) {
        formData.append("audio", data.audio, "recording.wav");
        console.log("Added audio to FormData:", data.audio.size, "bytes");
      }
      if (data.userVerse) {
        formData.append("userVerse", data.userVerse);
        console.log("Added userVerse to FormData:", data.userVerse);
      }
      
      // Debug FormData contents
      console.log("FormData entries:");
      Array.from(formData.entries()).forEach(([key, value]) => {
        console.log(key, value);
      });

      try {
        const res = await fetch(`/api/battles/${currentBattleId}/rounds`, {
          method: "POST",
          body: formData,
          credentials: "include",
        });

        if (!res.ok) {
          const errorText = await res.text();
          console.error("❌ Battle round failed:", res.status, errorText);
          throw new Error(`Battle round failed: ${res.statusText}`);
        }

        const result = await res.json();
        console.log("🎉 Battle round response received:", {
          hasUserText: !!result.userText,
          hasAiResponse: !!result.aiResponse,
          hasAudioUrl: !!result.audioUrl,
          userScore: result.userScore,
          aiScore: result.aiScore,
          keys: Object.keys(result)
        });
        
        return result;
      } catch (error) {
        console.error("Battle round processing error:", error);
        if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
          throw new Error('Connection lost. Please check your internet and try again.');
        }
        throw error;
      }
    },
    onSuccess: (result) => {
      // Show persistent score notification
      if (result && typeof result.userScore !== 'undefined' && typeof result.aiScore !== 'undefined') {
        // Use global toast function to ensure it works
        if (typeof window !== 'undefined' && (window as any).showPersistentScore) {
          (window as any).showPersistentScore(result.userScore, result.aiScore);
        }
      }
      
      queryClient.invalidateQueries({ 
        queryKey: ["/api/battles", currentBattleId] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ["/api/battles", currentBattleId, "state"] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ["/api/battles", currentBattleId, "rounds"] 
      });
    },
    onError: (error) => {
      console.error("Battle round mutation error:", error);
    },
  });

  const startNewBattle = (
    difficulty: "easy" | "normal" | "hard", 
    profanityFilter: boolean = true,
    aiCharacterId?: string,
    lyricComplexity?: number,
    styleIntensity?: number,
    voiceSpeed?: number
  ) => {
    createBattleMutation.mutate({ difficulty, profanityFilter, aiCharacterId, lyricComplexity, styleIntensity, voiceSpeed });
  };

  const updateBattleState = (updates: Partial<BattleState>) => {
    updateStateMutation.mutate(updates);
  };

  const submitRound = async (data: { audio?: Blob; userVerse?: string }) => {
    return processBattleRoundMutation.mutateAsync(data);
  };

  const isLoading = stateLoading || battleLoading || roundsLoading;
  const isProcessing = createBattleMutation.isPending || 
                      updateStateMutation.isPending || 
                      processBattleRoundMutation.isPending;

  return {
    // Data
    battleState: battleState as BattleState | undefined,
    battle: battle as Battle | undefined,
    rounds: rounds as BattleRound[] | undefined,
    currentBattleId,
    
    // Loading states
    isLoading,
    isProcessing,
    
    // Actions
    startNewBattle,
    updateBattleState,
    submitRound,
    
    // Mutation states and errors
    createBattle: createBattleMutation,
    createBattleError: createBattleMutation.error,
    updateState: updateStateMutation,
    processBattleRound: processBattleRoundMutation,
  };
}
