import { useState, useEffect } from "react";
import { Flame } from "lucide-react";
import { motion } from "framer-motion";
import { BattleCharacter } from "@shared/characters";

interface BattleAvatarProps {
  isAISpeaking: boolean;
  battleState?: "idle" | "battle" | "mad" | "victory" | "defeat";
  className?: string;
  character?: BattleCharacter;
}

interface LipSyncData {
  mouthOpenness: number;
  jawRotation: number;
  lipCornerPull: number;
  tongueTip: number;
  intensity: number;
}

export function BattleAvatar({ 
  isAISpeaking, 
  battleState = "idle",
  className = "",
  character
}: BattleAvatarProps) {
  const [currentEmotion, setCurrentEmotion] = useState<"neutral" | "angry" | "happy">("neutral");
  const [lipSyncLevel, setLipSyncLevel] = useState(0);
  const [mouthShape, setMouthShape] = useState<"closed" | "small" | "medium" | "large">("closed");
  const [lipSyncData, setLipSyncData] = useState<LipSyncData>({
    mouthOpenness: 0,
    jawRotation: 0,
    lipCornerPull: 0,
    tongueTip: 0,
    intensity: 0
  });

  useEffect(() => {
    // Update avatar emotion based on battle state
    switch (battleState) {
      case "mad":
        setCurrentEmotion("angry");
        break;
      case "victory":
        setCurrentEmotion("happy");
        break;
      case "defeat":
        setCurrentEmotion("angry");
        break;
      default:
        setCurrentEmotion("neutral");
    }
  }, [battleState]);

  // Remove duplicate audio system - let AdvancedLipSync handle everything
  useEffect(() => {
    if (!isAISpeaking) {
      setMouthShape("closed");
      setLipSyncLevel(0);
      setCurrentEmotion("neutral");
    }
  }, [isAISpeaking]);

  const getAvatarStateColor = () => {
    switch (battleState) {
      case "battle":
        return "bg-accent-red";
      case "mad":
        return "bg-red-600";
      case "victory":
        return "bg-accent-gold";
      case "defeat":
        return "bg-gray-600";
      default:
        return "bg-accent-blue";
    }
  };

  const getAvatarStateIcon = () => {
    switch (battleState) {
      case "battle":
      case "mad":
        return <Flame className="text-white text-sm" size={12} />;
      case "victory":
        return "🏆";
      case "defeat":
        return "😤";
      default:
        return "🤖";
    }
  };

  return (
    <div className={`bg-battle-gray rounded-xl p-6 border border-gray-700 text-center ${className}`}>
      <div className="mb-4">
        <div className="text-lg font-orbitron font-bold text-accent-red" data-testid="text-ai-title">
          {character?.displayName || "AI CHALLENGER"}
        </div>
        <div className="text-sm text-gray-400" data-testid="text-ai-level">
          {character?.difficulty ? `${character.difficulty.toUpperCase()} MODE` : "HARDCORE MODE"} • {character?.style || "AI Voice"}
        </div>
      </div>

      {/* Avatar Container */}
      <div className="relative mx-auto w-48 h-48 mb-6">
        {/* Avatar Image/Representation */}
        <motion.div
          className="w-full h-full rounded-full border-4 border-accent-gold overflow-hidden relative bg-gradient-to-br from-accent-blue to-accent-red"
          animate={isAISpeaking ? {
            scale: [1, 1.05, 1],
            borderColor: ["var(--accent-gold)", "var(--accent-red)", "var(--accent-gold)"]
          } : {}}
          transition={{
            duration: 0.8,
            repeat: isAISpeaking ? Infinity : 0,
            ease: "easeInOut"
          }}
          data-testid="avatar-ai-character"
        >
          {/* Character Avatar Image with Real Lip Sync Animation */}
          {character?.avatar ? (
            <motion.img
              src={`/attached_assets/generated_images/${character.avatar}`}
              alt={character.displayName}
              className="w-full h-full object-cover"
              animate={{
                // More pronounced avatar animation based on lip sync data
                scaleY: isAISpeaking ? (1 + (lipSyncData.mouthOpenness * 0.02)) : 1,
                scaleX: isAISpeaking ? (1 + (lipSyncData.lipCornerPull * 0.008)) : 1,
                transformOrigin: "center 70%", // Focus on mouth area
                filter: isAISpeaking ? 
                  `brightness(${1 + lipSyncData.intensity * 0.02}) contrast(${1 + lipSyncData.intensity * 0.015}) saturate(${1 + lipSyncData.intensity * 0.01})` : 
                  'brightness(1) contrast(1) saturate(1)'
              }}
              transition={{ duration: 0.08, ease: "easeOut" }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-6xl text-white">
              🤖
            </div>
          )}

          {/* Visual feedback - audio playback handled by system player in battle-arena.tsx */}
          
          {/* Subtle visual feedback when speaking */}
          {isAISpeaking && (
            <motion.div 
              className="absolute inset-0 rounded-full"
              animate={{
                boxShadow: [
                  `0 0 0px rgba(${character?.id === 'razor' ? '239, 68, 68' : 
                                  character?.id === 'venom' ? '34, 197, 94' : '59, 130, 246'}, 0)`,
                  `0 0 30px rgba(${character?.id === 'razor' ? '239, 68, 68' : 
                                   character?.id === 'venom' ? '34, 197, 94' : '59, 130, 246'}, 0.2)`,
                  `0 0 0px rgba(${character?.id === 'razor' ? '239, 68, 68' : 
                                  character?.id === 'venom' ? '34, 197, 94' : '59, 130, 246'}, 0)`
                ]
              }}
              transition={{ duration: 0.6, repeat: Infinity }}
            />
          )}

          {/* Fallback AI Character Face for non-character avatars */}
          {!character?.avatar && (
            <div className="text-white relative flex items-center justify-center h-full">
              {/* Eyes */}
              <div className="absolute top-12 left-1/2 transform -translate-x-1/2 flex space-x-3">
                <div className={`w-4 h-4 rounded-full ${
                  currentEmotion === "angry" ? "bg-red-500" : 
                  currentEmotion === "happy" ? "bg-green-500" : "bg-blue-400"
                }`} />
                <div className={`w-4 h-4 rounded-full ${
                  currentEmotion === "angry" ? "bg-red-500" : 
                  currentEmotion === "happy" ? "bg-green-500" : "bg-blue-400"
                }`} />
              </div>
              
              {/* Animated Mouth for Lip Sync */}
              <motion.div 
                className="absolute bottom-16 left-1/2 transform -translate-x-1/2"
                animate={{
                  scaleY: mouthShape === "large" ? 1.8 : 
                          mouthShape === "medium" ? 1.4 : 
                          mouthShape === "small" ? 1.1 : 1,
                  scaleX: mouthShape === "large" ? 1.3 : 
                          mouthShape === "medium" ? 1.2 : 
                          mouthShape === "small" ? 1.1 : 1,
                }}
                transition={{ duration: 0.1, ease: "easeOut" }}
              >
                <div className={`rounded-full ${
                  mouthShape === "closed" ? "w-3 h-1 bg-gray-700" :
                  mouthShape === "small" ? "w-4 h-2 bg-gray-800" :
                  mouthShape === "medium" ? "w-5 h-3 bg-gray-900" :
                  "w-6 h-4 bg-black"
                } transition-all duration-100`} />
              </motion.div>
            </div>
          )}
        </motion.div>
      </div>

      {/* Battle Status Indicator */}
      <div className="flex justify-center mb-4">
        <div className={`rounded-full px-3 py-1 text-xs font-bold flex items-center space-x-1 ${getAvatarStateColor()}`}>
          <span>{getAvatarStateIcon()}</span>
          <span className="text-white">
            {battleState === "idle" ? "READY" : 
             battleState === "battle" ? "BATTLING" :
             battleState === "mad" ? "ANGRY" :
             battleState === "victory" ? "VICTORY" : "DEFEATED"}
          </span>
        </div>
      </div>

    </div>
  );
}