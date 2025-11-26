import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { BookOpen, Lock, CheckCircle2, Trophy, Star, Target, Zap, Brain, Lightbulb } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Navigation } from "@/components/navigation";
import { StreamingAudioPlayer } from "@/components/streaming-audio-player";
import { useStreamingAudio } from "@/hooks/use-streaming-audio";

interface TrainingLesson {
  id: string;
  title: string;
  description: string;
  category: string;
  difficulty: string;
  order: number;
  content: string;
  practicePrompt: string;
  xpReward: number;
  currencyReward: number;
  unlockLevel: number;
  isPremium: boolean;
  isLocked: boolean;
  progress: {
    isCompleted: boolean;
    practiceScore: number | null;
    attempts: number;
  } | null;
}

interface TrainingProgress {
  completedLessons: number;
  totalLessons: number;
  completionPercentage: number;
  progressByCategory: Array<{
    category: string;
    completed: number;
    total: number;
  }>;
}

interface CoachingFeedback {
  score: number;
  strengths: string[];
  improvements: string[];
  specificTips: string[];
  encouragement: string;
  nextSteps: string;
}

const categoryInfo: Record<string, { title: string; description: string; icon: string }> = {
  basics: {
    title: "Basics",
    description: "Foundation of rap - flow, rhythm, and basic rhyming",
    icon: "🎤",
  },
  rhyme_schemes: {
    title: "Rhyme Schemes",
    description: "Master perfect, slant, internal, and multi-syllabic rhymes",
    icon: "🎵",
  },
  flow: {
    title: "Flow",
    description: "Cadence, breath control, and switching patterns",
    icon: "🌊",
  },
  wordplay: {
    title: "Wordplay",
    description: "Metaphors, double entendres, and clever linguistics",
    icon: "🎭",
  },
  battle_tactics: {
    title: "Battle Tactics",
    description: "Attacks, rebuttals, crowd control, and strategy",
    icon: "⚔️",
  },
  advanced: {
    title: "Advanced",
    description: "Literary devices, concepts, and professional techniques",
    icon: "🏆",
  },
};

export default function Training() {
  const [selectedCategory, setSelectedCategory] = useState<string>("basics");
  const [selectedLesson, setSelectedLesson] = useState<TrainingLesson | null>(null);
  const [showLessonDialog, setShowLessonDialog] = useState(false);
  const [showCoachingDialog, setShowCoachingDialog] = useState(false);
  const [userResponse, setUserResponse] = useState("");
  const [coachingFeedback, setCoachingFeedback] = useState<CoachingFeedback | null>(null);
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  
  // Streaming audio for coach feedback
  const { chunks, generateStreamingAudio } = useStreamingAudio();

  const coachingMutation = useMutation({
    mutationFn: async (response: string) => {
      if (!selectedLesson) throw new Error('No lesson selected');
      const res = await fetch('/api/training/coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lessonId: selectedLesson.id,
          userResponse: response
        })
      });
      if (!res.ok) throw new Error('Failed to get coaching');
      return res.json() as Promise<CoachingFeedback>;
    },
    onSuccess: async (data) => {
      setCoachingFeedback(data);
      setShowCoachingDialog(true);
      
      // Generate streaming audio for coach feedback
      const feedbackText = `${data.encouragement} ${data.nextSteps}`;
      if (feedbackText && feedbackText.length > 10) {
        try {
          // Create a dummy battle ID for the training coach audio
          const trainingSessionId = `training_${Date.now()}`;
          await generateStreamingAudio(feedbackText, 'coach', trainingSessionId);
          console.log('🎵 Coach streaming audio generated');
        } catch (error) {
          console.warn('⚠️ Coach audio generation failed:', error);
          // Continue without audio
        }
      }
    },
    onError: () => {
      toast({
        title: "Coaching Error",
        description: "Failed to get AI coaching. Please try again.",
        variant: "destructive"
      });
    }
  });

  const { data: lessons = [], isLoading: lessonsLoading } = useQuery<TrainingLesson[]>({
    queryKey: [`/api/training/lessons?category=${selectedCategory}`],
  });

  const { data: progress } = useQuery<TrainingProgress>({
    queryKey: ['/api/training/progress'],
  });

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "beginner":
        return "bg-green-500";
      case "intermediate":
        return "bg-yellow-500";
      case "advanced":
        return "bg-orange-500";
      case "expert":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  const handleLessonClick = (lesson: TrainingLesson) => {
    if (lesson.isLocked) {
      toast({
        title: "Lesson Locked",
        description: `Reach level ${lesson.unlockLevel} to unlock this lesson`,
        variant: "destructive",
      });
      return;
    }

    setSelectedLesson(lesson);
    setShowLessonDialog(true);
  };

  const handleGetCoaching = async () => {
    if (!userResponse.trim()) {
      toast({
        title: "Empty Response",
        description: "Please enter your rap response first.",
        variant: "destructive"
      });
      return;
    }
    coachingMutation.mutate(userResponse);
  };

  const handleStartPractice = () => {
    if (!selectedLesson) return;

    setShowLessonDialog(false);
    
    setLocation(`/battle-arena?practicePrompt=${encodeURIComponent(selectedLesson.practicePrompt)}&lessonId=${selectedLesson.id}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-dark via-secondary-dark to-primary-dark">
      <Navigation />
      <div className="container mx-auto p-6 max-w-7xl pt-24">
        {/* Page Header with Neon Apex Design */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-8 glass-card neon-border-magenta glow-pulse-magenta p-8"
        >
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <BookOpen className="h-12 w-12 text-neon-magenta" />
              <div>
                <h1 className="text-4xl md:text-5xl font-orbitron font-bold text-neon-magenta">
                  TRAINING PROGRAM
                </h1>
                <p className="text-prism-cyan text-lg mt-1">
                  Master the art of rap with structured lessons
                </p>
              </div>
            </div>
            {progress && (
              <div className="stat-badge">
                <Trophy className="h-4 w-4 text-yellow-500 inline mr-2" />
                {progress.completedLessons}/{progress.totalLessons} Completed
              </div>
            )}
          </div>
        </motion.div>

      {/* Progress Tracker with Glassmorphism */}
      {progress && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mb-8"
        >
          <Card className="glass-card neon-border-cyan">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-orbitron text-prism-cyan">
                <Trophy className="h-6 w-6 text-yellow-500" />
                Your Progress
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <div className="flex justify-between mb-3">
                    <span className="font-medium text-lg">
                      {progress.completedLessons} / {progress.totalLessons} Lessons Completed
                    </span>
                    <span className="stat-badge text-neon-magenta">
                      {Math.round(progress.completionPercentage)}%
                    </span>
                  </div>
                  <div className="relative h-4 bg-steel-gray rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${progress.completionPercentage}%` }}
                      transition={{ duration: 1, delay: 0.5, ease: "easeOut" }}
                      className="gradient-primary-bg h-full rounded-full glow-pulse-magenta"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {progress.progressByCategory.map((cat, index) => (
                    <motion.div
                      key={cat.category}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: 0.6 + index * 0.1 }}
                      className="glass-panel p-4 rounded-lg hover-lift"
                    >
                      <div className="text-sm font-semibold text-neon-magenta">
                        {categoryInfo[cat.category]?.icon} {categoryInfo[cat.category]?.title}
                      </div>
                      <div className="stat-badge mt-2 inline-block">
                        {cat.completed}/{cat.total}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Category Tabs with Neon Apex Design */}
      <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <TabsList className="grid grid-cols-2 md:grid-cols-6 w-full h-auto gap-2 bg-transparent p-2">
            {Object.entries(categoryInfo).map(([key, info], index) => (
              <motion.div
                key={key}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, delay: 0.4 + index * 0.05 }}
              >
                <TabsTrigger
                  value={key}
                  className={`
                    flex flex-col items-center py-4 px-2 w-full
                    glass-panel hover-lift rounded-lg
                    transition-all duration-300
                    ${selectedCategory === key 
                      ? 'neon-border-magenta gradient-card-bg' 
                      : 'border border-steel-gray'
                    }
                  `}
                >
                  <span className="text-3xl mb-2">{info.icon}</span>
                  <span className={`text-xs font-semibold ${
                    selectedCategory === key ? 'text-neon-magenta' : 'text-gray-400'
                  }`}>
                    {info.title}
                  </span>
                </TabsTrigger>
              </motion.div>
            ))}
          </TabsList>
        </motion.div>

        {Object.keys(categoryInfo).map((category) => (
          <TabsContent key={category} value={category} className="mt-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="mb-6 glass-panel p-6 rounded-lg"
            >
              <h2 className="text-3xl font-orbitron font-bold text-neon-magenta flex items-center gap-3">
                <span className="text-4xl">{categoryInfo[category].icon}</span>
                {categoryInfo[category].title}
              </h2>
              <p className="text-prism-cyan mt-2 text-lg">{categoryInfo[category].description}</p>
            </motion.div>

            {lessonsLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="glass-panel p-6 rounded-lg animate-pulse"
                  >
                    <div className="h-6 bg-steel-gray rounded w-3/4 mb-3" />
                    <div className="h-4 bg-steel-gray rounded w-1/2 mb-4" />
                    <div className="h-20 bg-steel-gray rounded" />
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <AnimatePresence mode="wait">
                  {lessons.map((lesson, index) => (
                    <motion.div
                      key={lesson.id}
                      initial={{ opacity: 0, y: 30 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ 
                        duration: 0.4, 
                        delay: index * 0.05,
                        ease: "easeOut"
                      }}
                      whileHover={{ scale: lesson.isLocked ? 1 : 1.02 }}
                      className={`
                        cursor-pointer
                        ${lesson.isLocked ? "opacity-60" : ""}
                      `}
                      onClick={() => handleLessonClick(lesson)}
                    >
                      <Card
                        className={`
                          glass-panel h-full
                          ${lesson.progress?.isCompleted 
                            ? "gradient-card-bg neon-border-cyan" 
                            : lesson.isLocked 
                            ? "border-2 border-steel-gray" 
                            : "neon-border-cyan hover-lift"
                          }
                        `}
                      >
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <CardTitle className="text-lg flex items-center gap-2 font-orbitron">
                                {lesson.isLocked && (
                                  <Lock className="h-5 w-5 text-gray-500" />
                                )}
                                {lesson.progress?.isCompleted && (
                                  <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1, rotate: 360 }}
                                    transition={{ duration: 0.5 }}
                                  >
                                    <CheckCircle2 className="h-5 w-5 text-prism-cyan" />
                                  </motion.div>
                                )}
                                <span className={
                                  lesson.progress?.isCompleted 
                                    ? "text-prism-cyan" 
                                    : lesson.isLocked 
                                    ? "text-gray-500" 
                                    : "text-neon-magenta"
                                }>
                                  {lesson.title}
                                </span>
                              </CardTitle>
                              <CardDescription className="mt-2 text-sm">
                                {lesson.description}
                              </CardDescription>
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-2 mt-4">
                            <Badge 
                              variant="outline" 
                              className={`${getDifficultyColor(lesson.difficulty)} text-white border-none`}
                            >
                              {lesson.difficulty}
                            </Badge>
                            {lesson.isPremium && (
                              <Badge className="bg-gradient-to-r from-yellow-500 to-amber-500 text-black border-none">
                                <Star className="h-3 w-3 mr-1" />
                                Premium
                              </Badge>
                            )}
                            {lesson.isLocked && (
                              <Badge variant="outline" className="border-steel-gray">
                                <Lock className="h-3 w-3 mr-1" />
                                Lv {lesson.unlockLevel}
                              </Badge>
                            )}
                          </div>
                        </CardHeader>

                        <CardContent>
                          <div className="space-y-3">
                            <div className="stat-badge flex items-center gap-2">
                              <Zap className="h-4 w-4 text-yellow-500" />
                              <span>{lesson.xpReward} XP</span>
                              <span className="text-gray-500">•</span>
                              <Trophy className="h-4 w-4 text-prism-cyan" />
                              <span>{lesson.currencyReward} Currency</span>
                            </div>

                            {lesson.progress && (
                              <div className="text-sm">
                                {lesson.progress.isCompleted ? (
                                  <div className="flex items-center gap-2 text-prism-cyan font-semibold">
                                    <CheckCircle2 className="h-4 w-4" />
                                    <span>Completed ({lesson.progress.practiceScore}%)</span>
                                  </div>
                                ) : lesson.progress.attempts > 0 ? (
                                  <span className="text-gray-400">
                                    Attempted {lesson.progress.attempts} time(s)
                                  </span>
                                ) : null}
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>

      {/* Lesson Details Modal with Neon Apex Design */}
      <Dialog open={showLessonDialog} onOpenChange={setShowLessonDialog}>
        <AnimatePresence>
          {showLessonDialog && (
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto glass-card neon-border-magenta">
              {selectedLesson && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.3 }}
                >
                  <DialogHeader>
                    <DialogTitle className="text-3xl flex items-center gap-3 font-orbitron text-neon-magenta">
                      {selectedLesson.progress?.isCompleted && (
                        <motion.div
                          initial={{ scale: 0, rotate: -180 }}
                          animate={{ scale: 1, rotate: 0 }}
                          transition={{ duration: 0.5 }}
                        >
                          <CheckCircle2 className="h-8 w-8 text-prism-cyan" />
                        </motion.div>
                      )}
                      {selectedLesson.title}
                    </DialogTitle>
                    <DialogDescription className="flex flex-wrap gap-2 mt-4">
                      <div className="stat-badge">
                        <span className={getDifficultyColor(selectedLesson.difficulty) + " px-2 py-1 rounded"}>
                          {selectedLesson.difficulty}
                        </span>
                      </div>
                      {selectedLesson.isPremium && (
                        <div className="stat-badge bg-gradient-to-r from-yellow-500 to-amber-500 text-black">
                          <Star className="h-4 w-4 mr-1 inline" />
                          Premium
                        </div>
                      )}
                      <div className="stat-badge">
                        <Zap className="h-4 w-4 text-yellow-500 inline mr-1" />
                        {selectedLesson.xpReward} XP
                      </div>
                      <div className="stat-badge">
                        <Trophy className="h-4 w-4 text-prism-cyan inline mr-1" />
                        {selectedLesson.currencyReward} Currency
                      </div>
                    </DialogDescription>
                  </DialogHeader>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="prose prose-sm dark:prose-invert max-w-none mt-6 whitespace-pre-wrap text-gray-300"
                  >
                    {selectedLesson.content}
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="mt-6 glass-panel p-5 rounded-lg neon-border-cyan"
                  >
                    <div className="flex items-start gap-3">
                      <Target className="h-6 w-6 text-prism-cyan mt-1 flex-shrink-0" />
                      <div>
                        <h4 className="font-orbitron font-semibold text-lg text-neon-magenta">
                          Practice Challenge
                        </h4>
                        <p className="text-sm text-gray-300 mt-2">
                          {selectedLesson.practicePrompt}
                        </p>
                      </div>
                    </div>
                  </motion.div>

                  {/* AI Coaching Section */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="mt-6 glass-panel p-5 rounded-lg neon-border-cyan"
                  >
                    <div className="flex items-start gap-3 mb-4">
                      <Brain className="h-6 w-6 text-prism-cyan mt-1 flex-shrink-0" />
                      <div className="flex-1">
                        <h4 className="font-orbitron font-semibold text-lg text-neon-magenta">
                          AI Coach
                        </h4>
                        <p className="text-sm text-gray-400 mt-1">
                          Type your rap response and get instant AI coaching feedback
                        </p>
                      </div>
                    </div>
                    
                    <textarea
                      value={userResponse}
                      onChange={(e) => setUserResponse(e.target.value)}
                      placeholder="Enter your rap response here and get AI coaching..."
                      className="w-full h-24 bg-steel-gray border border-steel-gray rounded-lg p-3 text-white placeholder-gray-500 focus:outline-none focus:border-prism-cyan"
                    />
                    
                    <Button
                      onClick={handleGetCoaching}
                      disabled={coachingMutation.isPending || !userResponse.trim()}
                      className="w-full mt-3 bg-gradient-to-r from-prism-cyan to-blue-600 hover:from-blue-500 hover:to-blue-700 text-white font-orbitron"
                      size="sm"
                    >
                      <Brain className="h-4 w-4 mr-2" />
                      {coachingMutation.isPending ? 'Getting Coaching...' : 'Get AI Coaching'}
                    </Button>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="flex gap-4 mt-8"
                  >
                    <Button
                      onClick={handleStartPractice}
                      className="flex-1 gradient-primary-bg hover-lift text-white font-orbitron font-bold text-lg py-6"
                      size="lg"
                    >
                      <Target className="h-5 w-5 mr-2" />
                      Start Practice Battle
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setShowLessonDialog(false)}
                      className="glass-panel border-steel-gray hover-lift"
                      size="lg"
                    >
                      Close
                    </Button>
                  </motion.div>
                </motion.div>
              )}
            </DialogContent>
          )}
        </AnimatePresence>
      </Dialog>

      {/* Coaching Feedback Dialog */}
      <Dialog open={showCoachingDialog} onOpenChange={setShowCoachingDialog}>
        <AnimatePresence>
          {showCoachingDialog && coachingFeedback && (
            <DialogContent className="max-w-2xl glass-card neon-border-cyan">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
              >
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-3 text-2xl font-orbitron text-prism-cyan">
                    <Brain className="h-6 w-6" />
                    AI Coach Feedback
                  </DialogTitle>
                </DialogHeader>

                <div className="space-y-4 mt-6">
                  {/* Score */}
                  <div className="glass-panel p-4 rounded-lg neon-border-magenta">
                    <div className="flex items-center justify-between">
                      <span className="font-orbitron text-neon-magenta">Your Score</span>
                      <div className="text-3xl font-bold text-gradient-text">
                        {coachingFeedback.score}/100
                      </div>
                    </div>
                    <div className="w-full h-2 bg-steel-gray rounded-full mt-3 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${coachingFeedback.score}%` }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                        className="h-full bg-gradient-to-r from-neon-magenta to-accent-red"
                      />
                    </div>
                  </div>

                  {/* Strengths */}
                  <div className="space-y-2">
                    <h4 className="font-orbitron text-prism-cyan flex items-center gap-2">
                      <Lightbulb className="h-4 w-4" />
                      Strengths
                    </h4>
                    <ul className="space-y-1">
                      {coachingFeedback.strengths.map((strength, i) => (
                        <li key={i} className="text-sm text-gray-300 flex items-start gap-2">
                          <span className="text-green-400 mt-0.5">✓</span>
                          {strength}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Improvements */}
                  <div className="space-y-2">
                    <h4 className="font-orbitron text-neon-magenta flex items-center gap-2">
                      <Target className="h-4 w-4" />
                      Areas to Improve
                    </h4>
                    <ul className="space-y-1">
                      {coachingFeedback.improvements.map((improvement, i) => (
                        <li key={i} className="text-sm text-gray-300 flex items-start gap-2">
                          <span className="text-yellow-400 mt-0.5">→</span>
                          {improvement}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Tips */}
                  <div className="space-y-2">
                    <h4 className="font-orbitron text-accent-blue flex items-center gap-2">
                      <Zap className="h-4 w-4" />
                      Pro Tips
                    </h4>
                    <ul className="space-y-1">
                      {coachingFeedback.specificTips.map((tip, i) => (
                        <li key={i} className="text-sm text-gray-300 flex items-start gap-2">
                          <span className="text-accent-blue mt-0.5">⚡</span>
                          {tip}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Streaming Audio Player - Coach Feedback with autoplay */}
                  {chunks.length > 0 && (
                    <div className="glass-panel p-4 rounded-lg neon-border-magenta">
                      <StreamingAudioPlayer
                        chunks={chunks}
                        characterName="Coach"
                        autoplay={true}
                        onChunkPlay={(index) => {
                          console.log(`🎵 Playing coach feedback chunk ${index}/${chunks.length}`);
                        }}
                        onAllChunksComplete={() => {
                          console.log('✅ Coach feedback audio complete');
                        }}
                      />
                    </div>
                  )}

                  {/* Encouragement */}
                  <div className="glass-panel p-4 rounded-lg bg-gradient-to-r from-prism-cyan/10 to-neon-magenta/10 border border-prism-cyan/30">
                    <p className="text-sm text-gray-300 italic">
                      💬 {coachingFeedback.encouragement}
                    </p>
                  </div>

                  {/* Next Steps */}
                  <div className="glass-panel p-4 rounded-lg neon-border-cyan">
                    <p className="font-orbitron text-prism-cyan text-sm mb-2">Next Steps:</p>
                    <p className="text-sm text-gray-300">{coachingFeedback.nextSteps}</p>
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <Button
                    onClick={() => setShowCoachingDialog(false)}
                    className="flex-1 gradient-primary-bg hover-lift text-white font-orbitron"
                  >
                    Got It!
                  </Button>
                  <Button
                    onClick={handleGetCoaching}
                    disabled={coachingMutation.isPending || !userResponse.trim()}
                    variant="outline"
                    className="glass-panel border-steel-gray hover-lift font-orbitron"
                  >
                    Try Again
                  </Button>
                </div>
              </motion.div>
            </DialogContent>
          )}
        </AnimatePresence>
      </Dialog>
      </div>
    </div>
  );
}
