export interface CrowdReactionAnalysis {
  reactionType: 'silence' | 'mild_approval' | 'hype' | 'wild_cheering' | 'booing' | 'shocked_gasps';
  intensity: number; // 0-100
  reasoning: string;
  timing: 'immediate' | 'delayed' | 'buildup';
}

import { GroqService } from './groq.js';

export class CrowdReactionService {
  private groqService: GroqService;

  constructor() {
    this.groqService = new GroqService();
  }
  
  /**
   * Analyzes rap lyrics using Groq AI to determine appropriate crowd reaction
   */
  async analyzeForCrowdReaction(lyrics: string, context?: {
    previousLyrics?: string;
    battlePhase?: 'opening' | 'middle' | 'closing';
    userPerformanceScore?: number;
  }): Promise<CrowdReactionAnalysis> {
    
    const cleanLyrics = lyrics.toLowerCase().trim();
    
    // Quick analysis for very short inputs
    if (cleanLyrics.length < 5) {
      return {
        reactionType: 'silence',
        intensity: 10,
        reasoning: 'Too brief for crowd reaction',
        timing: 'immediate'
      };
    }

    // Use Groq AI reasoning model for intelligent contextual analysis (NOT trigger words)
    try {
      const prompt = `You are an expert battle rap crowd analyst. Analyze these lyrics contextually to decide if a crowd reaction should occur, based on ACTUAL QUALITY, IMPACT, and APPROPRIATENESS - NOT trigger words.

LYRICS: "${lyrics}"

EVALUATION CRITERIA (reason through each):
1. Lyrical Quality: Does it have clever wordplay, multi-syllabic rhymes, or unexpected punchlines?
2. Delivery Potential: Would a crowd be impressed by the EXECUTION and TIMING of this line?
3. Contextual Impact: Does this line actually "hit" in a battle context, or is it generic/hollow?
4. Emotional Weight: Does it build momentum, create tension, or deliver a genuine punch?

REACTION TYPES:
- silence: Generic, weak, or forgettable (even with "fire" keyword) 
- mild_approval: Decent attempt, shows some skill but nothing special
- hype: Good wordplay, clever delivery, builds energy
- wild_cheering: Genuinely devastating, clever double meanings, jaw-dropping execution potential
- shocked_gasps: Unexpected twist, risky but effective, bold move
- booing: Poor execution, cringe, or incomprehensible

IMPORTANT: A line with the word "fire" but weak lyrics = silence or mild_approval
IMPORTANT: A simple two-word line with great potential = hype
IMPORTANT: Reasoning > Keywords. Analyze the ACTUAL content quality.

Respond ONLY as JSON: {"reactionType":"","intensity":0-100,"reasoning":"why this reaction","timing":"immediate/delayed/buildup"}`;

      const response = await this.groqService.generateRapResponse(prompt);

      // Enhanced JSON extraction - handle cases where AI returns extra text
      let cleanResponse = response.trim();
      
      // Look for JSON pattern in the response
      const jsonMatch = cleanResponse.match(/\{[^{}]*"reactionType"[^{}]*\}/g);
      if (jsonMatch) {
        cleanResponse = jsonMatch[jsonMatch.length - 1]; // Get the last/best match
      } else {
        // If no JSON found, try to extract content between first { and last }
        const start = cleanResponse.indexOf('{');
        const end = cleanResponse.lastIndexOf('}');
        if (start !== -1 && end !== -1 && end > start) {
          cleanResponse = cleanResponse.substring(start, end + 1);
        }
      }
      
      // Parse JSON response
      const analysis = JSON.parse(cleanResponse);
      
      // Validate response structure
      if (analysis.reactionType && typeof analysis.intensity === 'number' && analysis.reasoning) {
        return {
          reactionType: analysis.reactionType,
          intensity: Math.max(0, Math.min(100, analysis.intensity)),
          reasoning: analysis.reasoning,
          timing: analysis.timing || 'immediate'
        };
      }
      
      // Fallback if JSON parsing fails
      throw new Error('Invalid AI response format');
      
    } catch (error) {
      console.error('🤖 Groq crowd analysis failed - retrying with enhanced prompt:', (error as Error).message);
      
      // RETRY WITH SIMPLIFIED REASONING PROMPT
      try {
        const retryPrompt = `Battle rap crowd analyzer. Evaluate this lyric for CONTEXTUAL QUALITY (not keywords):

"${lyrics}"

Decide reaction based on:
- Wordplay quality and cleverness
- Delivery/execution potential  
- Actual impact in battle context
- Whether it "hits" or falls flat

Pick ONE reaction type with 0-100 intensity:
- silence: Forgettable, weak, no real impact
- mild_approval: Basic attempt, some skill shown  
- hype: Good wordplay, clever, builds energy
- wild_cheering: Devastating, jaw-dropping, genuinely impressive
- booing: Poor execution, cringe, incomprehensible
- shocked_gasps: Unexpected twist, risky but effective

JSON ONLY: {"reactionType":"","intensity":0,"reasoning":"","timing":"immediate"}

Consider battle rap crowd psychology: they want skill, cleverness, aggression, and entertainment worthy of legendary battle rap personas.

JSON only: {"reactionType":"wild_cheering","intensity":85,"reasoning":"devastating punchline","timing":"immediate"}`;

        const retryResponse = await this.groqService.generateRapResponse(retryPrompt);
        
        // Enhanced JSON extraction for retry response
        let cleanRetryResponse = retryResponse.trim();
        
        // Extract JSON from the response if it contains extra text
        const retryJsonMatch = cleanRetryResponse.match(/\{[^{}]*"reactionType"[^{}]*\}/g);
        if (retryJsonMatch) {
          cleanRetryResponse = retryJsonMatch[retryJsonMatch.length - 1]; // Get the last match
        } else {
          // If no JSON found, try to extract content between first { and last }
          const start = cleanRetryResponse.indexOf('{');
          const end = cleanRetryResponse.lastIndexOf('}');
          if (start !== -1 && end !== -1 && end > start) {
            cleanRetryResponse = cleanRetryResponse.substring(start, end + 1);
          }
        }
        
        const retryAnalysis = JSON.parse(cleanRetryResponse);
        
        if (retryAnalysis.reactionType && typeof retryAnalysis.intensity === 'number') {
          return {
            reactionType: retryAnalysis.reactionType,
            intensity: Math.max(0, Math.min(100, retryAnalysis.intensity)),
            reasoning: retryAnalysis.reasoning || 'AI analysis completed',
            timing: retryAnalysis.timing || 'immediate'
          };
        }
      } catch (retryError) {
        console.error('🤖 AI retry also failed:', (retryError as Error).message);
      }
      
      // ONLY IF BOTH AI ATTEMPTS FAIL: Return minimal response
      return {
        reactionType: 'silence',
        intensity: 15,
        reasoning: 'AI analysis unavailable - no reaction',
        timing: 'immediate'
      };
    }
  }

  /**
   * FIXED: Lightweight pattern analysis without phonetic analyzer to prevent memory leaks and infinite loops
   */
  private fallbackPatternAnalysis(lyrics: string, context?: any): CrowdReactionAnalysis {
    const cleanLyrics = lyrics.toLowerCase().trim();

    // ENHANCED PUNCHLINE DETECTION - Triggers wild reactions
    const punchlineIndicators = [
      // Destruction words
      /killed|murder|destroy|demolish|wreck|finish|annihilate|obliterate|devastate/i,
      /slay|slaughter|massacre|eliminate|erase|vanish|delete/i,
      
      // Battle victory words  
      /mic drop|game over|checkmate|done deal|case closed|lights out/i,
      /victory|winner|champion|conquered|dominated|owned/i,
      
      // Intensity words
      /savage|brutal|ruthless|vicious|deadly|lethal|killer|beast/i,
      /monster|demon|devil|nightmare|terror|horror/i,
      
      // Heat/Fire words
      /\b(fire|flames|burning|heat|blazing|inferno|torch|roast)\b/i,
      /hot|heated|steaming|smoking|sizzling|scorching/i,
      
      // Personal attacks
      /your mama|your girl|your crew|your family|your squad/i,
      /your style|your flow|your bars|your rhymes/i,
      
      // Weakness calls
      /weak|trash|garbage|amateur|pathetic|terrible|awful|wack/i,
      /basic|lame|boring|tired|played out|expired/i,
      
      // Superiority claims
      /king|crown|throne|legend|god|boss|chief|master/i,
      /elite|supreme|ultimate|best|greatest|unmatched/i
    ];
    
    const hasPunchline = punchlineIndicators.some(pattern => pattern.test(lyrics));
    
    // WORDPLAY DETECTION - Triggers appreciation
    const wordplayIndicators = [
      /\b(\w+).*\b\1\b/g, // Word repetition with different context
      /(\w+ing)\b.*\b(\w+ing)\b/g, // Rhyming -ing words
      /(\w+tion)\b.*\b(\w+tion)\b/g, // Rhyming -tion words
      /\b(\w+).*\b(\w+\1|\1\w+)\b/g // Sound-alike words
    ];
    
    let wordplayCount = 0;
    wordplayIndicators.forEach(pattern => {
      const matches = lyrics.match(pattern);
      if (matches) wordplayCount += matches.length;
    });

    // ENHANCED BATTLE TACTICS DETECTION - Triggers hype
    const battleTactics = [
      // Direct challenges
      /\b(step to me|come at me|try me|test me|bring it|face me)\b/i,
      /\b(challenge|dare|bet|wanna go|let's go|square up)\b/i,
      
      // Skill comparisons
      /\b(next level|different league|out your league|not your level)\b/i,
      /\b(can't compete|can't match|can't touch|can't reach)\b/i,
      
      // Teaching/dominance
      /\b(schooling|teaching|lesson|homework|class|school)\b/i,
      /\b(professor|teacher|master class|education|learn)\b/i,
      
      // Experience taunts
      /\b(amateur|rookie|beginner|newbie|novice|freshman)\b/i,
      /\b(veteran|experienced|been here|done that|seen it all)\b/i,
      
      // Battle positioning
      /\b(top spot|number one|first place|throne|crown)\b/i,
      /\b(undefeated|champion|winner|victor|conqueror)\b/i
    ];
    
    const hasBattleTactics = battleTactics.some(pattern => pattern.test(lyrics));

    // CROWD ENERGY WORDS - Direct crowd triggers
    const energyWords = [
      /everybody|crowd|people|y'all|listen up/i,
      /hands up|jump|bounce|move|dance/i,
      /louder|scream|shout|noise/i,
      /energy|vibe|feeling|atmosphere/i
    ];
    
    const hasCrowdEnergy = energyWords.some(pattern => pattern.test(lyrics));

    // CONTROVERSIAL/SHOCKING CONTENT - Triggers gasps or boos
    const controversialContent = [
      /damn|hell|shit|fuck/i,
      /controversial|shocking|offensive|wild/i,
      /can't believe|no way|what the|holy/i
    ];
    
    const isControversial = controversialContent.some(pattern => pattern.test(lyrics));

    // FLOW AND RHYTHM ANALYSIS
    const wordCount = cleanLyrics.split(/\s+/).length;
    const syllableEstimate = this.estimateSyllables(cleanLyrics);
    const flowQuality = this.analyzeFlowQuality(cleanLyrics);
    
    // DECISION LOGIC
    let reactionType: CrowdReactionAnalysis['reactionType'] = 'mild_approval';
    let intensity = 30;
    let reasoning = 'Standard verse delivery';
    let timing: CrowdReactionAnalysis['timing'] = 'immediate';

    // STRICT FILTERING: Only react to truly impressive content
    // Filter out basic/simple phrases
    const basicPhrases = ['you suck', 'that sucks', 'you bad', 'you weak', 'musik', 'fighting', 
                         'po fighting', 'yo yo', 'yeah yeah', 'uh huh', 'come on', 'let me'];
    const isBasicPhrase = basicPhrases.some(phrase => cleanLyrics.includes(phrase.toLowerCase()));
    
    if (isBasicPhrase && wordCount < 6) {
      reactionType = 'silence';
      intensity = 5;
      reasoning = 'Basic phrase - no crowd reaction needed';
      timing = 'immediate';
    }
    // High-impact punchlines get wild reactions (requires both punchline AND wordplay)
    else if (hasPunchline && wordplayCount > 1) {
      reactionType = 'wild_cheering';
      intensity = 85 + Math.min(15, wordplayCount * 3);
      reasoning = 'Devastating punchline with complex wordplay detected';
      timing = 'delayed'; // Let the punchline land first
    }
    
    // Complex wordplay gets appreciation (increased threshold)
    else if (wordplayCount >= 3) {
      reactionType = 'hype';
      intensity = 60 + Math.min(30, wordplayCount * 5);
      reasoning = `Complex wordplay detected (${wordplayCount} instances)`;
      timing = 'buildup';
    }
    
    // Battle tactics get crowd hype
    else if (hasBattleTactics) {
      reactionType = 'hype';
      intensity = 70;
      reasoning = 'Battle tactics and aggression detected';
      timing = 'immediate';
    }
    
    // Direct crowd engagement
    else if (hasCrowdEnergy) {
      reactionType = 'wild_cheering';
      intensity = 75;
      reasoning = 'Direct crowd engagement detected';
      timing = 'immediate';
    }
    
    // Controversial content gets shocked gasps (no randomness)
    else if (isControversial) {
      reactionType = 'shocked_gasps';
      intensity = 65;
      reasoning = 'Controversial content detected';
      timing = 'immediate';
    }
    
    // Very good flow gets appreciation (RAISED THRESHOLD)
    else if (flowQuality > 85 && wordCount > 8) {
      reactionType = 'hype';
      intensity = Math.min(80, flowQuality);
      reasoning = 'Exceptional flow and rhythm detected';
      timing = 'buildup';
    }
    
    // Default: Most content gets silence/no reaction
    else {
      reactionType = 'silence';
      intensity = 10;
      reasoning = 'Standard content - no crowd reaction needed';
      timing = 'immediate';
    }
    
    // Poor performance gets silence (no randomness)
    if (wordCount < 3 || flowQuality < 20) {
      reactionType = 'silence';
      intensity = Math.max(10, 30 - wordCount * 5);
      reasoning = 'Weak performance detected - no trigger words found';
      timing = 'immediate';
    }

    // Apply context adjustments
    if (context) {
      if (context.userPerformanceScore && context.userPerformanceScore > 70) {
        intensity = Math.min(100, intensity + 15);
        reasoning += ' (boosted for high performance)';
      }
      
      if (context.battlePhase === 'closing' && reactionType === 'wild_cheering') {
        intensity = Math.min(100, intensity + 10);
        reasoning += ' (finale boost)';
      }
    }

    return {
      reactionType,
      intensity,
      reasoning,
      timing
    };
  }

  private estimateSyllables(text: string): number {
    const words = text.split(/\s+/);
    let totalSyllables = 0;
    
    for (const word of words) {
      totalSyllables += this.countSyllablesSimple(word);
    }
    
    return totalSyllables;
  }

  private analyzeFlowQuality(text: string): number {
    const words = text.split(/\s+/).filter(w => w.length > 0);
    const syllables = this.estimateSyllables(text);
    
    if (words.length === 0) return 0;
    
    // Ideal syllable-to-word ratio for rap flow
    const syllableWordRatio = syllables / words.length;
    const idealRatio = 1.5; // Sweet spot for rap flow
    
    // Penalize if too far from ideal
    const ratioScore = Math.max(0, 100 - Math.abs(syllableWordRatio - idealRatio) * 30);
    
    // Bonus for good word count (4-12 words is good for a quick verse)
    const wordCountScore = words.length >= 4 && words.length <= 12 ? 20 : 0;
    
    // Bonus for varied word lengths
    const avgWordLength = words.reduce((sum, word) => sum + word.length, 0) / words.length;
    const varietyScore = avgWordLength >= 4 && avgWordLength <= 6 ? 15 : 0;
    
    return Math.min(100, ratioScore + wordCountScore + varietyScore);
  }

  /**
   * Simple syllable counting without phonetic analyzer
   */
  private countSyllablesSimple(word: string): number {
    const vowelGroups = word.toLowerCase().match(/[aeiouy]+/g);
    return vowelGroups ? vowelGroups.length : 1;
  }

  /**
   * Maps reaction type to SFX intensity levels
   */
  mapToSFXIntensity(reaction: CrowdReactionAnalysis): 'mild' | 'medium' | 'wild' {
    switch (reaction.reactionType) {
      case 'silence':
        return 'mild';
      case 'mild_approval':
        return 'mild';
      case 'hype':
        return 'medium';
      case 'wild_cheering':
        return 'wild';
      case 'booing':
        return 'medium';
      case 'shocked_gasps':
        return 'medium';
      default:
        return 'mild';
    }
  }

  /**
   * Determines delay timing for reaction
   */
  getReactionDelay(reaction: CrowdReactionAnalysis): number {
    switch (reaction.timing) {
      case 'immediate':
        return 100; // Almost instant
      case 'delayed':
        return 800; // Let the line finish
      case 'buildup':
        return 400; // Quick buildup
      default:
        return 300;
    }
  }
}

export const crowdReactionService = new CrowdReactionService();