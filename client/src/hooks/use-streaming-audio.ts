import { useState, useCallback } from 'react';

interface StreamingAudioChunk {
  phrase: string;
  audioUrl: string;
  index: number;
}

/**
 * Hook for generating and managing streaming audio chunks
 * Allows progressive playback of AI responses
 */
export function useStreamingAudio() {
  const [chunks, setChunks] = useState<StreamingAudioChunk[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Generate streaming audio chunks from text
   */
  const generateStreamingAudio = useCallback(
    async (
      text: string,
      characterId: string,
      battleId: string
    ): Promise<StreamingAudioChunk[]> => {
      setIsGenerating(true);
      setError(null);
      const generatedChunks: StreamingAudioChunk[] = [];

      try {
        console.log(
          `🎵 Requesting streaming audio for "${text.substring(0, 40)}..." character: ${characterId}`
        );

        const response = await fetch(
          `/api/battles/${battleId}/stream-audio`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              text,
              characterId,
              battleId,
            }),
            credentials: 'include',
          }
        );

        if (!response.ok) {
          throw new Error(
            `Failed to generate streaming audio: ${response.statusText}`
          );
        }

        const data = await response.json();

        if (Array.isArray(data.chunks)) {
          data.chunks.forEach((chunk: any, index: number) => {
            generatedChunks.push({
              phrase: chunk.phrase,
              audioUrl: chunk.audioUrl,
              index,
            });
          });

          setChunks(generatedChunks);
          console.log(
            `✅ Generated ${generatedChunks.length} streaming audio chunks`
          );
        } else if (data.audioUrl) {
          // Fallback to single audio file as one chunk
          generatedChunks.push({
            phrase: text,
            audioUrl: data.audioUrl,
            index: 0,
          });
          setChunks(generatedChunks);
          console.log('✅ Generated single audio chunk (fallback mode)');
        }

        return generatedChunks;
      } catch (err: any) {
        const errorMsg =
          err.message || 'Failed to generate streaming audio';
        console.error('❌ Streaming audio error:', errorMsg);
        setError(errorMsg);
        return [];
      } finally {
        setIsGenerating(false);
      }
    },
    []
  );

  /**
   * Clear current chunks
   */
  const clearChunks = useCallback(() => {
    setChunks([]);
    setError(null);
  }, []);

  return {
    chunks,
    isGenerating,
    error,
    generateStreamingAudio,
    clearChunks,
  };
}
