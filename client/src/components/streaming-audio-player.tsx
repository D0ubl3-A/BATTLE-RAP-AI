import { useState, useRef, useEffect } from "react";
import { Play, Pause, Volume2, VolumeX, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

interface StreamingAudioChunk {
  phrase: string;
  audioUrl: string;
  index: number;
}

interface StreamingAudioPlayerProps {
  chunks: StreamingAudioChunk[];
  characterName?: string;
  onChunkPlay?: (chunkIndex: number) => void;
  onAllChunksComplete?: () => void;
  className?: string;
}

/**
 * Streaming Audio Player
 * Plays audio chunks sequentially and highlights words as they play
 */
export function StreamingAudioPlayer({
  chunks,
  characterName = "AI",
  onChunkPlay,
  onAllChunksComplete,
  className = "",
}: StreamingAudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentChunkIndex, setCurrentChunkIndex] = useState(0);
  const [volume, setVolume] = useState([85]);
  const [isMuted, setIsMuted] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const chunkQueueRef = useRef<number[]>([]);

  // Initialize audio element
  useEffect(() => {
    const audio = new Audio();
    audio.preload = "auto";
    audio.crossOrigin = "anonymous";
    audio.volume = volume[0] / 100;

    const handleEnded = () => {
      // Move to next chunk
      const nextIndex = currentChunkIndex + 1;

      if (nextIndex < chunks.length) {
        setCurrentChunkIndex(nextIndex);
        playChunk(nextIndex);
      } else {
        // All chunks completed
        setIsPlaying(false);
        setCurrentChunkIndex(0);
        onAllChunksComplete?.();
      }
    };

    const handleError = (e: any) => {
      console.error("❌ Streaming audio error:", e);
      setAudioError(`Failed to load audio chunk ${currentChunkIndex}`);
      setIsPlaying(false);
    };

    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("error", handleError);

    audioRef.current = audio;

    return () => {
      audio.pause();
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("error", handleError);
    };
  }, [chunks, currentChunkIndex, onAllChunksComplete]);

  // Play a specific chunk
  const playChunk = (index: number) => {
    if (!audioRef.current || !chunks[index]) return;

    const chunk = chunks[index];
    console.log(
      `🎵 Playing streaming chunk ${index + 1}/${chunks.length}: "${chunk.phrase}"`
    );

    audioRef.current.src = chunk.audioUrl;
    audioRef.current.play().catch((error) => {
      console.warn("⚠️ Streaming playback prevented:", error);
    });

    onChunkPlay?.(index);
  };

  // Handle play/pause
  const handlePlayPause = () => {
    if (!audioRef.current || chunks.length === 0) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      playChunk(currentChunkIndex);
      setIsPlaying(true);
    }
  };

  // Handle volume change
  const handleVolumeChange = (newVolume: number[]) => {
    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume[0] / 100;
    }
  };

  // Handle mute
  const handleMute = () => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? volume[0] / 100 : 0;
      setIsMuted(!isMuted);
    }
  };

  if (chunks.length === 0) {
    return (
      <div className={`text-center text-gray-400 py-4 ${className}`}>
        No audio chunks available
      </div>
    );
  }

  return (
    <motion.div
      className={`glass-panel neon-border-cyan rounded-lg p-4 space-y-4 ${className}`}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-prism-cyan animate-pulse" />
          <span className="text-sm font-semibold text-prism-cyan">
            Streaming Audio {currentChunkIndex + 1}/{chunks.length}
          </span>
        </div>
        <span className="text-xs text-gray-400">{characterName}</span>
      </div>

      {/* Current Phrase Display */}
      <div className="bg-slate-800/50 rounded p-3 min-h-12 flex items-center">
        <motion.p
          className="text-sm text-white font-medium"
          key={currentChunkIndex}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
        >
          {chunks[currentChunkIndex]?.phrase}
        </motion.p>
      </div>

      {/* Error Message */}
      {audioError && (
        <div className="text-xs text-red-400 bg-red-900/20 rounded p-2">
          {audioError}
        </div>
      )}

      {/* Controls */}
      <div className="flex items-center gap-3">
        {/* Play/Pause */}
        <Button
          size="sm"
          onClick={handlePlayPause}
          className={`${
            isPlaying
              ? "bg-red-600 hover:bg-red-700"
              : "bg-prism-cyan hover:bg-prism-cyan/90"
          } text-white transition-colors`}
        >
          {isPlaying ? (
            <Pause className="w-4 h-4" />
          ) : (
            <Play className="w-4 h-4" />
          )}
        </Button>

        {/* Volume Control */}
        <div className="flex items-center gap-2 flex-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={handleMute}
            className="text-prism-cyan hover:bg-slate-700"
          >
            {isMuted ? (
              <VolumeX className="w-4 h-4" />
            ) : (
              <Volume2 className="w-4 h-4" />
            )}
          </Button>
          <input
            type="range"
            min="0"
            max="100"
            value={volume[0]}
            onChange={(e) => handleVolumeChange([parseInt(e.target.value)])}
            className="flex-1 h-2 bg-slate-700 rounded cursor-pointer"
          />
          <span className="text-xs text-gray-400 w-6 text-right">
            {volume[0]}%
          </span>
        </div>
      </div>

      {/* Progress Chunks */}
      <div className="flex gap-1">
        {chunks.map((_, index) => (
          <motion.div
            key={index}
            className={`flex-1 h-1 rounded ${
              index <= currentChunkIndex
                ? "bg-prism-cyan"
                : index === currentChunkIndex
                ? "bg-prism-magenta"
                : "bg-slate-700"
            }`}
            animate={index === currentChunkIndex ? { opacity: [0.5, 1] } : {}}
            transition={{ duration: 0.5, repeat: Infinity }}
          />
        ))}
      </div>
    </motion.div>
  );
}
