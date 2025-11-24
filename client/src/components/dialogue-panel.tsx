import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DialoguePanelProps {
  userDialogue?: string;
  aiDialogue?: string;
  isUserSpeaking?: boolean;
  isAISpeaking?: boolean;
  onDialogueSFX?: () => void;
  className?: string;
}

export function DialoguePanel({
  userDialogue = "",
  aiDialogue = "",
  isUserSpeaking = false,
  isAISpeaking = false,
  onDialogueSFX,
  className = ""
}: DialoguePanelProps) {
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [displayedUserDialogue, setDisplayedUserDialogue] = useState("");
  const [displayedAIDialogue, setDisplayedAIDialogue] = useState("");
  const [userCharIndex, setUserCharIndex] = useState(0);
  const [aiCharIndex, setAICharIndex] = useState(0);

  // Typewriter effect for user dialogue
  useEffect(() => {
    if (userDialogue && userDialogue.trim() && isUserSpeaking) {
      setUserCharIndex(0);
      setDisplayedUserDialogue("");
      
      const interval = setInterval(() => {
        setUserCharIndex((prev) => {
          if (prev >= userDialogue.length) {
            clearInterval(interval);
            return prev;
          }
          setDisplayedUserDialogue(userDialogue.substring(0, prev + 1));
          return prev + 1;
        });
      }, 20);

      // Play sound effect on start
      if (soundEnabled && onDialogueSFX) {
        onDialogueSFX();
      }

      return () => clearInterval(interval);
    }
  }, [userDialogue, isUserSpeaking, soundEnabled, onDialogueSFX]);

  // Typewriter effect for AI dialogue
  useEffect(() => {
    if (aiDialogue && aiDialogue.trim() && isAISpeaking) {
      setAICharIndex(0);
      setDisplayedAIDialogue("");
      
      const interval = setInterval(() => {
        setAICharIndex((prev) => {
          if (prev >= aiDialogue.length) {
            clearInterval(interval);
            return prev;
          }
          setDisplayedAIDialogue(aiDialogue.substring(0, prev + 1));
          return prev + 1;
        });
      }, 20);

      // Play sound effect on start
      if (soundEnabled && onDialogueSFX) {
        onDialogueSFX();
      }

      return () => clearInterval(interval);
    }
  }, [aiDialogue, isAISpeaking, soundEnabled, onDialogueSFX]);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-gradient-to-r from-accent-red to-accent-gold rounded-lg">
        <div className="flex items-center gap-2">
          <MessageCircle size={20} className="text-white" />
          <h3 className="font-orbitron font-bold text-lg text-white">Dialogue</h3>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setSoundEnabled(!soundEnabled)}
          className="text-white hover:bg-white/20"
        >
          {soundEnabled ? (
            <Volume2 size={18} />
          ) : (
            <VolumeX size={18} />
          )}
        </Button>
      </div>

      {/* Dialogue Container */}
      <div className="space-y-3 min-h-[120px]">
        {/* User Dialogue */}
        <AnimatePresence>
          {displayedUserDialogue && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex justify-end"
            >
              <div className="bg-gradient-to-l from-cyber-red to-accent-red rounded-lg rounded-tr-none p-4 max-w-[70%] border border-cyber-red/50 shadow-lg shadow-red-500/20">
                <p className="text-white font-medium text-sm leading-relaxed">
                  {displayedUserDialogue}
                  <span className="animate-pulse">▌</span>
                </p>
                <span className="text-xs text-gray-300 mt-1 block">You</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* AI Dialogue */}
        <AnimatePresence>
          {displayedAIDialogue && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex justify-start"
            >
              <div className="bg-gradient-to-r from-accent-blue to-cyber-blue rounded-lg rounded-tl-none p-4 max-w-[70%] border border-accent-blue/50 shadow-lg shadow-blue-500/20">
                <p className="text-white font-medium text-sm leading-relaxed">
                  {displayedAIDialogue}
                  <span className="animate-pulse">▌</span>
                </p>
                <span className="text-xs text-gray-300 mt-1 block">AI Opponent</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Empty State */}
        {!displayedUserDialogue && !displayedAIDialogue && (
          <div className="flex items-center justify-center h-20 bg-battle-gray rounded-lg border border-gray-700/50">
            <p className="text-gray-400 text-sm">Waiting for dialogue...</p>
          </div>
        )}
      </div>

      {/* SFX Indicator */}
      {soundEnabled && (isUserSpeaking || isAISpeaking) && (
        <motion.div
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 0.6, repeat: Infinity }}
          className="flex items-center justify-center gap-2 text-accent-gold text-xs font-orbitron"
        >
          <div className="w-2 h-2 bg-accent-gold rounded-full animate-pulse" />
          <span>Sound Effects Active</span>
          <div className="w-2 h-2 bg-accent-gold rounded-full animate-pulse" />
        </motion.div>
      )}
    </div>
  );
}
