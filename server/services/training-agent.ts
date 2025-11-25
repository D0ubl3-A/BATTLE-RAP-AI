import { Groq } from 'groq-sdk';

export interface CoachingFeedback {
  score: number; // 0-100
  strengths: string[];
  improvements: string[];
  specificTips: string[];
  encouragement: string;
  nextSteps: string;
}

export class TrainingAgent {
  private groq: Groq;

  constructor() {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      console.warn('⚠️ GROQ_API_KEY not set - Training Agent will be limited');
    }
    this.groq = new Groq({ apiKey });
  }

  async generateCoaching(
    lesson: {
      title: string;
      category: string;
      content: string;
      practicePrompt: string;
    },
    userResponse: string,
    attemptNumber: number = 1
  ): Promise<CoachingFeedback> {
    try {
      console.log(`🎓 Training Agent: Generating coaching for "${lesson.title}" (attempt ${attemptNumber})`);

      const prompt = `You are an expert rap coach providing real-time feedback to a student learning ${lesson.category.replace('_', ' ')}.

LESSON: ${lesson.title}
LESSON CONTENT: ${lesson.content}
PRACTICE PROMPT: ${lesson.practicePrompt}

STUDENT'S ATTEMPT #${attemptNumber}:
"${userResponse}"

Evaluate the student's attempt and provide constructive feedback. Be encouraging but honest. Format your response as a JSON object with this exact structure:
{
  "score": <number 0-100>,
  "strengths": [<list of 2-3 things they did well>],
  "improvements": [<list of 2-3 specific areas to improve>],
  "specificTips": [<list of 2-3 actionable tips to apply immediately>],
  "encouragement": "<a motivating message>",
  "nextSteps": "<what to practice next>"
}

Scoring guide:
- 0-30: Needs significant work on fundamentals
- 31-60: Shows promise but needs improvement
- 61-75: Good effort, close to proficiency
- 76-90: Very good, minor refinements needed
- 91-100: Excellent execution

Respond ONLY with valid JSON, no markdown formatting.`;

      const message = await this.groq.chat.completions.create({
        model: 'mixtral-8x7b-32768',
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      });

      const responseText = message.choices[0]?.message?.content || '';
      
      // Parse JSON response
      let feedback: CoachingFeedback;
      try {
        feedback = JSON.parse(responseText);
      } catch (e) {
        console.error('❌ Failed to parse coaching response:', responseText);
        // Return fallback feedback
        feedback = this.generateFallbackCoaching(userResponse, lesson.category);
      }

      console.log(`✅ Coaching generated - Score: ${feedback.score}/100`);
      return feedback;

    } catch (error: any) {
      console.error('❌ Training Agent error:', error.message);
      return this.generateFallbackCoaching(userResponse, lesson.category);
    }
  }

  private generateFallbackCoaching(userResponse: string, category: string): CoachingFeedback {
    const responseLength = userResponse.split(' ').length;
    const hasRhymes = /\b(\w+)[\s\S]*\b\1\b/.test(userResponse);
    
    let baseScore = 50;
    if (responseLength > 20) baseScore += 15;
    if (hasRhymes) baseScore += 15;
    if (responseLength > 40) baseScore += 10;

    return {
      score: Math.min(baseScore, 85),
      strengths: [
        'You provided a response',
        responseLength > 20 ? 'Good length and effort' : 'Short but focused',
        hasRhymes ? 'Used rhyming patterns' : 'Clear rhythm'
      ],
      improvements: [
        `Explore more ${category.replace('_', ' ')} techniques`,
        'Add more variety to your delivery',
        'Practice consistency'
      ],
      specificTips: [
        'Try using internal rhymes',
        'Focus on syllable counting',
        'Record yourself and listen back'
      ],
      encouragement: 'Great effort! Keep practicing and you\'ll see improvements. Every attempt gets you closer to mastery!',
      nextSteps: 'Try the practice exercise again, or move on to the next lesson if you\'re ready.'
    };
  }

  async analyzeProgress(
    attempts: Array<{ response: string; score: number }>,
    category: string
  ): Promise<{ improvement: number; trend: 'improving' | 'stable' | 'declining'; insight: string }> {
    try {
      if (attempts.length < 2) {
        return {
          improvement: 0,
          trend: 'stable',
          insight: 'Keep practicing to see your improvement!'
        };
      }

      const firstScore = attempts[0].score;
      const latestScore = attempts[attempts.length - 1].score;
      const improvement = latestScore - firstScore;
      const trend = improvement > 5 ? 'improving' : improvement < -5 ? 'declining' : 'stable';

      let insight = '';
      if (trend === 'improving') {
        insight = `Excellent progress! You've improved by ${Math.round(improvement)} points. Keep this momentum!`;
      } else if (trend === 'declining') {
        insight = `Your last attempt declined slightly. Review the feedback and try a different approach.`;
      } else {
        insight = `Your scores are consistent. Try implementing the coaching tips to break through!`;
      }

      return { improvement: Math.round(improvement), trend, insight };
    } catch (error: any) {
      console.error('❌ Progress analysis error:', error.message);
      return {
        improvement: 0,
        trend: 'stable',
        insight: 'Keep practicing!'
      };
    }
  }
}

export const trainingAgent = new TrainingAgent();
