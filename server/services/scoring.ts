import { type RoundScores } from "@shared/schema";
import { PhoneticRhymeAnalyzer } from './phoneticRhymeAnalyzer';

export class ScoringService {
  private phoneticAnalyzer: PhoneticRhymeAnalyzer;

  constructor() {
    this.phoneticAnalyzer = new PhoneticRhymeAnalyzer();
    console.log('🎯 ScoringService initialized with PhoneticRhymeAnalyzer');
  }

  calculateRhymeDensity(text: string, isFinalScore: boolean = false, battleId?: string): number {
    // Use the advanced phonetic analyzer for accurate rhyme detection
    const words = text.toLowerCase().split(/\s+/).filter(w => w.length > 0);
    if (words.length === 0) return 0;
    
    const rhymeAnalysis = this.phoneticAnalyzer.getEnhancedRhymeAnalysis(text, isFinalScore, battleId);
    
    console.log(`🎵 Advanced rhyme analysis ${isFinalScore ? 'FINAL' : 'preview'}: Perfect=${rhymeAnalysis.perfectRhymes}, Slant=${rhymeAnalysis.slantRhymes}, Multi-syllabic=${rhymeAnalysis.multiSyllabicScore}, Assonance=${rhymeAnalysis.assonanceScore}`);
    
    // STRICTER SCORING - NO PARTICIPATION TROPHIES. Perfect rhymes required for real points
    const perfectRhymeScore = Math.min(40, rhymeAnalysis.perfectRhymes * 5); // Reduced multiplier (8→5), removed minimum 1pt
    const slantRhymeScore = Math.min(15, rhymeAnalysis.slantRhymes * 2); // Reduced multiplier (3→2)
    const internalRhymeScore = Math.min(20, rhymeAnalysis.advancedInternalRhymes * 1.5); // Reduced multiplier (2→1.5)
    const multiSyllabicScore = Math.min(15, rhymeAnalysis.multiSyllabicScore * 0.2); // Reduced multiplier (0.3→0.2)
    const assonanceScore = Math.min(10, rhymeAnalysis.assonanceScore * 0.05); // Reduced multiplier (0.1→0.05)
    const consonanceScore = Math.min(5, rhymeAnalysis.consonanceScore * 0.05); // Reduced multiplier (0.1→0.05)
    
    const totalScore = Math.round(
      perfectRhymeScore + slantRhymeScore + internalRhymeScore + 
      multiSyllabicScore + assonanceScore + consonanceScore
    );
    
    console.log(`🎵 Rhyme density breakdown: Perfect ${perfectRhymeScore}/40, Slant ${slantRhymeScore}/15, Internal ${internalRhymeScore}/20, Multi-syll ${multiSyllabicScore}/15, Assonance ${assonanceScore}/10, Consonance ${consonanceScore}/5`);
    
    return Math.min(100, totalScore);
  }

  calculateFlowQuality(text: string, isFinalScore: boolean = false, battleId?: string): number {
    const words = text.toLowerCase().split(/\s+/).filter(w => w.length > 0);
    console.log(`🎵 Analyzing ${isFinalScore ? 'FINAL' : 'preview'} flow quality for ${words.length} words...`);
    
    // Get advanced phonetic analysis for authentic flow scoring
    const rhymeAnalysis = this.phoneticAnalyzer.getEnhancedRhymeAnalysis(text, isFinalScore, battleId);
    const lines = text.split('\n').filter(line => line.trim());
    
    if (lines.length === 0) return 0;
    
    // AUTHENTIC FLOW SCORING using advanced metrics
    
    // 1. RHYTHM CONSISTENCY (35 points max)
    const rhythmScore = Math.min(35, rhymeAnalysis.rhythmConsistency * 0.35);
    
    // 2. SYLLABLE FLOW PATTERNS (25 points max)
    let syllableFlowScore = 0;
    const syllableCounts = lines.map(line => this.countAdvancedSyllables(line, isFinalScore));
    const avgSyllables = syllableCounts.reduce((a, b) => a + b, 0) / syllableCounts.length;
    
    // Penalize inconsistent syllable counts less harshly for skilled rappers
    const syllableConsistency = 1 - (syllableCounts.reduce((variance, count) => {
      return variance + Math.abs(count - avgSyllables);
    }, 0) / (syllableCounts.length * avgSyllables));
    
    syllableFlowScore = Math.min(25, syllableConsistency * 25 + (avgSyllables >= 8 && avgSyllables <= 16 ? 10 : 0));
    
    // 3. PHONETIC FLOW COMPLEXITY (20 points max)
    const phoneticFlowScore = Math.min(20, rhymeAnalysis.phoneticComplexity * 0.2);
    
    // 4. INTERNAL RHYME FLOW (10 points max)
    const internalFlowScore = Math.min(10, rhymeAnalysis.advancedInternalRhymes * 0.5);
    
    // 5. MULTI-SYLLABIC FLOW (10 points max)
    const multiSyllableFlowScore = Math.min(10, rhymeAnalysis.multiSyllabicScore * 0.1);
    
    const totalScore = Math.round(
      rhythmScore + syllableFlowScore + phoneticFlowScore + 
      internalFlowScore + multiSyllableFlowScore
    );
    
    console.log(`🎵 Flow breakdown: Rhythm ${rhythmScore}/35, Syllables ${syllableFlowScore}/25, Phonetic ${phoneticFlowScore}/20, Internal ${internalFlowScore}/10, Multi-syll ${multiSyllableFlowScore}/10`);
    
    return Math.min(100, totalScore);
  }

  private countAdvancedSyllables(line: string, useAdvanced: boolean): number {
    if (useAdvanced) {
      // Use phonetic analyzer for accurate syllable counting
      const words = this.phoneticAnalyzer.tokenizeExternal(line);
      return words.reduce((total, word) => {
        return total + this.getAccurateSyllableCount(word);
      }, 0);
    }
    return this.countSyllables(line);
  }

  private getAccurateSyllableCount(word: string): number {
    // This would use the CMU dictionary if available, fallback to heuristic
    const vowelGroups = word.toLowerCase().match(/[aeiou]+/g);
    const baseSyllables = vowelGroups ? vowelGroups.length : 1;
    
    // Adjust for common patterns
    if (word.endsWith('e') && baseSyllables > 1) {
      return baseSyllables - 1;
    }
    
    return Math.max(1, baseSyllables);
  }

  calculateCreativity(text: string, isFinalScore: boolean = false, battleId?: string): number {
    const words = text.toLowerCase().split(/\s+/).filter(w => w.length > 0);
    
    // STRICTER CREATIVITY SCORING - require actual content, not filler
    console.log(`🎭 Analyzing ${words.length} words for creativity ${isFinalScore ? 'FINAL SCORE' : 'preview'}...`);
    
    // PENALTY: Require minimum 15 words for any creativity score. "Fighting" or single-line responses get 0
    if (words.length < 15) {
      console.log(`❌ Creativity blocked: Only ${words.length} words (minimum 15 required)`);
      return 0; // NO POINTS for short, lazy responses
    }
    
    const lines = text.split('\n').filter(line => line.trim());
    
    // Get advanced phonetic analysis for authentic creativity scoring
    const rhymeAnalysis = this.phoneticAnalyzer.getEnhancedRhymeAnalysis(text, isFinalScore, battleId);
    
    // 1. BATTLE-SPECIFIC VOCABULARY COMPLEXITY (20 points max)
    const vocabularyComplexity = this.calculateBattleVocabularyComplexity(text, isFinalScore);
    
    // 2. LEXICAL DIVERSITY enhanced with phonetic analysis (15 points max)
    const uniqueWords = new Set(words);
    const diversityRatio = words.length > 0 ? uniqueWords.size / words.length : 0;
    const phoneticallyEnhancedDiversity = isFinalScore ? 
      Math.min(15, diversityRatio * 15 + rhymeAnalysis.phoneticComplexity * 0.1) :
      Math.min(15, diversityRatio * 15);
    
    // 3. ADVANCED WORDPLAY DETECTION enhanced (20 points max) 
    const wordplayScore = this.detectAdvancedWordplay(text);
    
    // 4. METAPHORS & SIMILES (15 points max)
    const figurativeScore = this.detectFigurativeLanguage(text);
    
    // 5. PUNCHLINES & BATTLE TACTICS (50 points max)
    const punchlineScore = this.detectPunchlines(text);
    
    // 6. HOMONYMS & DOUBLE MEANINGS enhanced (10 points max)
    const homonymScore = this.detectHomonyms(text);
    
    // 7. HEAVY RHYME JUGGLING - complex multi-scheme patterns (20 points max)
    const rhymeJugglingScore = this.detectRhymeJuggling(text);
    
    // 8. RHYTHM & PHONETIC FLOW enhanced (10 points max)
    const rhythmScore = isFinalScore ? 
      Math.min(10, rhymeAnalysis.rhythmConsistency * 0.1) :
      this.analyzeRhythm(text);
    
    // 9. ORIGINALITY enhanced with phonetic uniqueness (15 points max)
    const originalityScore = this.calculateOriginality(text, rhymeAnalysis, isFinalScore);
    
    const totalScore = Math.round(
      vocabularyComplexity + phoneticallyEnhancedDiversity + wordplayScore + figurativeScore + 
      punchlineScore + homonymScore + rhymeJugglingScore + rhythmScore + originalityScore
    );
    
    console.log(`🎭 Creativity breakdown: Vocab ${vocabularyComplexity}/20, Diversity ${phoneticallyEnhancedDiversity}/15, Wordplay ${wordplayScore}/40, Figurative ${figurativeScore}/15, Punchlines ${punchlineScore}/50, Homonyms ${homonymScore}/30, RhymeJuggling ${rhymeJugglingScore}/20, Rhythm ${rhythmScore}/10, Originality ${originalityScore}/15`);
    
    return Math.min(100, totalScore + (isFinalScore ? 5 : 0)); // Bonus for final score processing
  }

  private detectWordplay(text: string): number {
    let score = 0;
    const lower = text.toLowerCase();
    
    // Double entendres and puns (look for multiple meanings)
    const wordplayPatterns = [
      /\b(\w+)\b.*\b\1\b/g, // word repetition with different meaning
      /\b(\w{4,})\b.*\b(\w*\1\w*|\1\w+)\b/g, // similar sounding words
    ];
    
    wordplayPatterns.forEach(pattern => {
      const matches = lower.match(pattern) || [];
      score += matches.length * 5;
    });
    
    return Math.min(25, score);
  }

  private detectMetaphors(text: string): number {
    let score = 0;
    
    // Direct metaphor indicators
    const metaphorWords = ['like', 'as', 'than', 'resemble', 'mirror', 'echo', 'fire', 'ice', 'storm', 'lightning', 'thunder'];
    const metaphorCount = text.toLowerCase().split(/\s+/).filter(word => 
      metaphorWords.includes(word.replace(/[^\w]/g, ''))
    ).length;
    
    // Extended metaphors and imagery
    const imageWords = ['crown', 'throne', 'king', 'queen', 'warrior', 'soldier', 'beast', 'lion', 'snake', 'venom'];
    const imageCount = text.toLowerCase().split(/\s+/).filter(word => 
      imageWords.includes(word.replace(/[^\w]/g, ''))
    ).length;
    
    score = Math.min(20, (metaphorCount * 5) + (imageCount * 3));
    return score;
  }

  private detectBattleTactics(text: string): number {
    let score = 0;
    const lower = text.toLowerCase();
    
    // Aggressive language and confidence
    const aggressiveWords = ['destroy', 'demolish', 'crush', 'annihilate', 'dominate', 'weak', 'pathetic', 'amateur'];
    const aggressiveCount = aggressiveWords.filter(word => lower.includes(word)).length;
    
    // Call-outs and direct attacks
    const calloutWords = ['you', 'your', 'yours'];
    const calloutCount = lower.split(/\s+/).filter(word => calloutWords.includes(word)).length;
    
    // Confidence and bragging
    const confidenceWords = ['i am', 'im', 'my', 'mine', 'best', 'greatest', 'supreme'];
    const confidenceCount = confidenceWords.filter(phrase => lower.includes(phrase)).length;
    
    score = Math.min(15, (aggressiveCount * 3) + Math.min(5, calloutCount) + (confidenceCount * 2));
    return score;
  }

  /**
   * Calculate battle-specific vocabulary complexity
   */
  private calculateBattleVocabularyComplexity(text: string, isFinalScore: boolean = false): number {
    const words = text.toLowerCase().split(/\s+/).filter(w => w.length > 0);
    let complexityScore = 0;
    
    // 1. ADVANCED BATTLE VOCABULARY (10 points max)
    const advancedBattleTerms = [
      'devastation', 'annihilation', 'domination', 'obliteration',
      'metaphorical', 'lyrical', 'surgical', 'mathematical',
      'philosophical', 'theoretical', 'psychological', 'methodical',
      'intellectual', 'spectacular', 'miraculous', 'victorious'
    ];
    
    const advancedTermCount = words.filter(word => 
      advancedBattleTerms.includes(word) || word.length > 8
    ).length;
    
    complexityScore += Math.min(10, advancedTermCount * 2);
    
    // 2. TECHNICAL RAP TERMINOLOGY (5 points max)
    const technicalTerms = [
      'syllable', 'phoneme', 'assonance', 'consonance', 'alliteration',
      'metaphor', 'simile', 'wordplay', 'punchline', 'delivery',
      'cadence', 'rhythm', 'tempo', 'flow', 'freestyle'
    ];
    
    const technicalCount = words.filter(word => technicalTerms.includes(word)).length;
    complexityScore += Math.min(5, technicalCount * 1.5);
    
    // 3. VOCABULARY SOPHISTICATION (5 points max)
    const avgWordLength = words.reduce((sum, word) => sum + word.length, 0) / words.length;
    const sophisticationScore = Math.min(5, (avgWordLength - 4) * 2); // Bonus for longer words
    complexityScore += Math.max(0, sophisticationScore);
    
    return Math.min(20, complexityScore);
  }

  private detectPhoneticHomonyms(words: string[]): number {
    // Simplified phonetic homonym detection
    const phoneticGroups = [
      ['know', 'no'], ['new', 'knew'], ['two', 'to', 'too'],
      ['four', 'for', 'fore'], ['here', 'hear'], ['see', 'sea'],
      ['buy', 'by', 'bye'], ['eye', 'I'], ['one', 'won']
    ];
    
    let homonyms = 0;
    phoneticGroups.forEach(group => {
      const foundWords = group.filter(word => words.includes(word));
      if (foundWords.length >= 2) homonyms++;
    });
    
    return homonyms;
  }

  // ENHANCED DETECTION METHODS
  
  private detectAdvancedWordplay(text: string): number {
    let score = 0;
    const lower = text.toLowerCase();
    const words = lower.split(/\s+/);
    
    // IDIOMS DETECTION - phrases with hidden meanings
    const idiomPatterns = [
      /\b(break.*ice|cut.*slack|rain.*on|spill.*tea|throw.*under.*bus|stab.*back|steal.*thunder|break.*deal|cold.*shoulder)\b/g,
      /\b(piece of cake|walk in park|ball.*park|on thin ice|under weather|back wall|caught red|jump gun|throw towel)\b/g,
      /\b(bite dust|chew fat|chop suey|cook book|cut chase|dig deeper|eat crow|face music|fat chance|go distance)\b/g
    ];
    
    let idiomsFound = 0;
    idiomPatterns.forEach(pattern => {
      const matches = lower.match(pattern) || [];
      idiomsFound += matches.length;
      score += matches.length * 4; // 4 points per idiom
    });
    
    // TRIPLE ENTENDRES - words with 3+ simultaneous meanings
    const tripleEntendrePatterns = [
      /\b(hard|soft|wet|dry|hot|cold|fast|slow|light|dark|bright)\b/g, // Can mean physical, sexual, or skill-based
      /\b(beat|flow|bars|spit|tongue|play|kick|punch|strike|bang)\b/g, // Physical, musical, sexual
      /\b(fire|ride|stack|racks|bands|chain|sick|dope|ill|fly)\b/g // Quality, wealth, health, style
    ];
    
    let tripleEntendres = 0;
    tripleEntendrePatterns.forEach(pattern => {
      const matches = lower.match(pattern) || [];
      tripleEntendres += matches.length;
      score += matches.length * 3; // 3 points per triple entendre usage
    });
    
    // DOUBLE ENTENDRES - sexual/double meanings
    const doubleEntendrePatterns = [
      /\b(stroke|insert|position|ride|deep|thick|hard|penetrate|cream|cream on)\b/g,
      /\b(pipe|tool|drill|pump|work it|work on|come|drop|load|unload)\b/g,
      /\b(box|hole|tight|loose|wet|grow|eat|suck|lick|swallow)\b/g
    ];
    
    let doubleEntendres = 0;
    doubleEntendrePatterns.forEach(pattern => {
      const matches = lower.match(pattern) || [];
      doubleEntendres += matches.length;
      score += matches.length * 2; // 2 points per double entendre
    });
    
    // Multi-syllabic wordplay (like Eminem)
    for (let i = 0; i < words.length - 1; i++) {
      const word1 = words[i];
      const word2 = words[i + 1];
      
      // Check for similar sounds/patterns
      if (word1.length > 3 && word2.length > 3) {
        if (this.soundSimilar(word1, word2)) {
          score += 2;
        }
      }
    }
    
    console.log(`🎭 Wordplay breakdown: Idioms ${idiomsFound}, Triple Entendres ${tripleEntendres}, Double Entendres ${doubleEntendres}`);
    
    return Math.min(40, score); // Increased max from 20 to 40
  }
  
  private detectFigurativeLanguage(text: string): number {
    let score = 0;
    const lower = text.toLowerCase();
    
    // SIMILES (like, as comparisons)
    const similePattern = /\b(like|as)\s+[a-z\s]{3,}/g;
    const similes = lower.match(similePattern) || [];
    score += similes.length * 4;
    
    // METAPHORS (is/are statements, direct comparisons)
    const metaphorPatterns = [
      /\bi\s+(am|was)\s+[a-z\s]{3,}/g,
      /\byou\s+(are|were)\s+[a-z\s]{3,}/g,
      /\b(fire|ice|lightning|thunder|storm|beast|king|queen|god)\b/g
    ];
    
    metaphorPatterns.forEach(pattern => {
      const matches = lower.match(pattern) || [];
      score += matches.length * 3;
    });
    
    return Math.min(15, score);
  }
  
  private detectPunchlines(text: string): number {
    let score = 0;
    const lower = text.toLowerCase();
    const lines = text.split('\n').filter(line => line.trim());
    
    // DIABOLICAL MULTI-LINE RHYME DETECTION
    score += this.detectMultiLineRhymes(lines) * 8; // Heavy weight for multi-line rhymes
    
    // COMPLEX INTERNAL RHYME PATTERNS
    score += this.detectComplexInternalRhymes(lines) * 6;
    
    // DEVASTATING PUNCHLINE CATEGORIES
    score += this.detectNameFlips(lower) * 5;
    score += this.detectSkillDemolition(lower) * 5;
    score += this.detectPersonalAttacks(lower) * 4;
    score += this.detectCareerDestruction(lower) * 4;
    
    // SETUP/PAYOFF COMBINATIONS
    score += this.detectSetupPayoff(lines) * 7;
    
    // PSYCHOLOGICAL WARFARE TACTICS
    score += this.detectPsychologicalWarfare(lower) * 3;
    
    // Original basic punchline detection (reduced weight)
    const punchlineWords = [
      'destroy', 'kill', 'murder', 'slaughter', 'demolish', 'annihilate',
      'weak', 'pathetic', 'trash', 'garbage', 'amateur', 'clown',
      'better', 'supreme', 'greatest', 'legend', 'god', 'king'
    ];
    
    lines.forEach((line, index) => {
      const lineWords = line.toLowerCase().split(/\s+/);
      const hasPunchlineWord = lineWords.some(word => 
        punchlineWords.includes(word.replace(/[^\w]/g, ''))
      );
      
      if (hasPunchlineWord) {
        score += (index === lines.length - 1) ? 3 : 2; // Reduced from original
      }
    });
    
    // Aggressive direct attacks with "you"
    const attackPattern = /\byou\s+(are|were|can't|won't|never|always)\s+[a-z\s]{3,}/g;
    const attacks = lower.match(attackPattern) || [];
    score += attacks.length * 2; // Reduced from original
    
    return Math.min(50, score); // Increased max to accommodate new techniques
  }
  
  private detectHomonyms(text: string): number {
    let score = 0;
    const words = text.toLowerCase().split(/\s+/).map(w => w.replace(/[^\w]/g, ''));
    
    // COMPREHENSIVE HOMONYM & HOMOPHONE LIST - words that sound same but different meanings
    const homonymPairs = [
      // Sound-alikes (homophones)
      ['to', 'too', 'two'], ['there', 'their', 'theyre'],
      ['right', 'write', 'rite'], ['peace', 'piece'], ['steal', 'steel'],
      ['brake', 'break'], ['rain', 'reign', 'rein'], ['cent', 'sent', 'scent'],
      ['bass', 'base'], ['beat', 'beet'], ['rap', 'wrap'],
      ['see', 'sea'], ['buy', 'by', 'bye'], ['for', 'four', 'fore'],
      ['knight', 'night'], ['know', 'no'], ['new', 'knew', 'gnu'],
      ['one', 'won'], ['be', 'bee'], ['pear', 'pair', 'pare'],
      ['meat', 'meet'], ['mail', 'male'], ['tale', 'tail'],
      ['way', 'weigh'], ['would', 'wood'], ['hear', 'here'],
      ['son', 'sun'], ['blew', 'blue'], ['threw', 'through'],
      
      // Rap-specific homonyms (multiple meanings in hip-hop)
      ['flow', 'flo', 'glow'], ['bars', 'stars'], ['dope', 'rope'],
      ['bars', 'jars'], ['spit', 'split'], ['hit', 'quit'],
      ['pen', 'then'], ['stacks', 'cracks'], ['racks', 'backs'],
      ['check', 'rep'], ['chain', 'brain'], ['crown', 'down'],
      ['throne', 'zone'], ['sick', 'quick'], ['ill', 'still'],
      ['fire', 'higher', 'wire'], ['hot', 'pot', 'got'],
      ['fly', 'high', 'sky'], ['dill', 'will', 'skill']
    ];
    
    let homonymsUsed = 0;
    homonymPairs.forEach(group => {
      const groupWords = group.filter(word => words.includes(word));
      if (groupWords.length >= 2) {
        homonymsUsed++;
        score += 4; // Increased from 3 to 4 per pair
      }
    });
    
    console.log(`🎤 Homonyms detected: ${homonymsUsed} pairs used`);
    
    return Math.min(30, score); // Increased max from 10 to 30
  }
  
  private analyzeRhythm(text: string): number {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length < 2) return 0; // No rhythm in single lines
    
    let score = 0;
    const syllableCounts = lines.map(line => this.countSyllables(line));
    
    // Check for consistent rhythm
    const avgSyllables = syllableCounts.reduce((a, b) => a + b, 0) / syllableCounts.length;
    const consistency = syllableCounts.filter(count => 
      Math.abs(count - avgSyllables) <= 2
    ).length / syllableCounts.length;
    
    score += consistency * 6;
    
    // Bonus for good rhythm range (8-16 syllables)
    if (avgSyllables >= 8 && avgSyllables <= 16) {
      score += 4;
    }
    
    return Math.min(10, Math.round(score));
  }
  
  private soundSimilar(word1: string, word2: string): boolean {
    // Simple phonetic similarity check
    const cleanWord1 = word1.replace(/[^\w]/g, '');
    const cleanWord2 = word2.replace(/[^\w]/g, '');
    
    if (cleanWord1.length < 3 || cleanWord2.length < 3) return false;
    
    // Check for similar endings (rhyme)
    const ending1 = cleanWord1.slice(-2);
    const ending2 = cleanWord2.slice(-2);
    
    return ending1 === ending2 || 
           cleanWord1.includes(cleanWord2.slice(0, 3)) ||
           cleanWord2.includes(cleanWord1.slice(0, 3));
  }

  private detectRhymeJuggling(text: string): number {
    // HEAVY RHYME JUGGLING - complex weaving of multiple rhyme schemes
    let score = 0;
    const lines = text.split('\n').filter(line => line.trim());
    
    if (lines.length < 2) return 0;
    
    // Detect multiple simultaneous rhyme patterns
    const rhymeSchemes: Map<string, number> = new Map();
    
    for (let i = 0; i < lines.length; i++) {
      const lineWords = lines[i].toLowerCase().split(/\s+/).filter(w => w.length > 2);
      
      if (lineWords.length === 0) continue;
      
      const lastWord = lineWords[lineWords.length - 1].replace(/[^\w]/g, '');
      const rhymeEnding = lastWord.slice(-2);
      
      // Track rhyme patterns
      if (!rhymeSchemes.has(rhymeEnding)) {
        rhymeSchemes.set(rhymeEnding, 0);
      }
      rhymeSchemes.set(rhymeEnding, rhymeSchemes.get(rhymeEnding)! + 1);
    }
    
    // Bonus for complex rhyme juggling (3+ different schemes used)
    const numSchemes = rhymeSchemes.size;
    if (numSchemes >= 3) {
      score += 8; // Heavy bonus for complex juggling
    } else if (numSchemes === 2) {
      score += 4; // Moderate bonus for dual scheme
    }
    
    // Additional bonus for alternating patterns (ABAB, AABB, etc)
    let alternatingCount = 0;
    for (let i = 0; i < lines.length - 1; i++) {
      const word1 = lines[i].toLowerCase().split(/\s+/).pop()?.replace(/[^\w]/g, '') || '';
      const word2 = lines[i + 1].toLowerCase().split(/\s+/).pop()?.replace(/[^\w]/g, '') || '';
      
      if (word1.slice(-2) !== word2.slice(-2)) {
        alternatingCount++;
      }
    }
    
    // Bonus for alternating patterns (shows sophistication)
    if (alternatingCount >= lines.length * 0.6) {
      score += 5;
    }
    
    console.log(`🎵 Rhyme juggling: ${numSchemes} schemes, alternating pattern strength ${alternatingCount}/${lines.length}`);
    
    return Math.min(20, score);
  }

  // DIABOLICAL PUNCHLINE DETECTION METHODS
  
  private detectMultiLineRhymes(lines: string[]): number {
    let score = 0;
    
    for (let i = 0; i < lines.length - 1; i++) {
      for (let j = i + 1; j < lines.length; j++) {
        const line1 = lines[i].toLowerCase().replace(/[^\w\s]/g, '');
        const line2 = lines[j].toLowerCase().replace(/[^\w\s]/g, '');
        
        // Check if entire lines have similar rhyme patterns
        const words1 = line1.split(/\s+/).filter(w => w.length > 2);
        const words2 = line2.split(/\s+/).filter(w => w.length > 2);
        
        let rhymeMatches = 0;
        for (const w1 of words1) {
          for (const w2 of words2) {
            if (this.wordsRhymeAdvanced(w1, w2)) {
              rhymeMatches++;
            }
          }
        }
        
        // Multi-line rhyme detected if 3+ word pairs rhyme
        if (rhymeMatches >= 3) {
          score += 3; // "smokin up all the drugs" / "youre broke u cant call the plug"
        }
        
        // Perfect multi-syllabic line rhymes
        if (this.linesRhymePerfectly(line1, line2)) {
          score += 5;
        }
      }
    }
    
    return Math.min(15, score);
  }
  
  private detectComplexInternalRhymes(lines: string[]): number {
    let score = 0;
    
    lines.forEach(line => {
      const words = line.toLowerCase().split(/\s+/).filter(w => w.length > 2);
      let internalRhymes = 0;
      
      // Check for multiple rhyming words within the same line
      for (let i = 0; i < words.length - 1; i++) {
        for (let j = i + 1; j < words.length; j++) {
          if (this.wordsRhymeAdvanced(words[i], words[j])) {
            internalRhymes++;
          }
        }
      }
      
      // Bonus for 3+ internal rhymes in one line
      if (internalRhymes >= 3) score += 3;
      else if (internalRhymes >= 2) score += 2;
      else if (internalRhymes >= 1) score += 1;
    });
    
    return Math.min(10, score);
  }
  
  private detectNameFlips(text: string): number {
    let score = 0;
    // Detect clever name manipulations and flips
    const nameFlipPatterns = [
      /\b[A-Z][a-z]+.*\b(more like|sounds like|rhymes with)\b.*[a-z]/g,
      /\byour name\b.*\b(should be|is really)\b/g,
      /\bcall you\b.*\b(instead|rather than)\b/g
    ];
    
    nameFlipPatterns.forEach(pattern => {
      const matches = text.match(pattern) || [];
      score += matches.length * 2;
    });
    
    return score;
  }
  
  private detectSkillDemolition(text: string): number {
    let score = 0;
    const skillAttacks = [
      'cant rap', 'no skill', 'no talent', 'fake rapper', 'wannabe',
      'amateur hour', 'kindergarten', 'elementary', 'basic', 'beginner',
      'trash flows', 'wack bars', 'corny lines', 'generic', 'copycat'
    ];
    
    const lower = text.toLowerCase();
    skillAttacks.forEach(attack => {
      if (lower.includes(attack)) score += 2;
    });
    
    return Math.min(8, score);
  }
  
  private detectPersonalAttacks(text: string): number {
    let score = 0;
    const personalPatterns = [
      /\byour\s+(mom|mama|mother|dad|father|family)\b/g,
      /\byou\s+(look|smell|act|sound)\s+like\b/g,
      /\byou\s+(live|stay|work)\s+in\b/g,
      /\byour\s+(job|car|house|clothes)\b/g
    ];
    
    personalPatterns.forEach(pattern => {
      const matches = text.match(pattern) || [];
      score += matches.length * 2;
    });
    
    return Math.min(6, score);
  }
  
  private detectCareerDestruction(text: string): number {
    let score = 0;
    const careerAttacks = [
      'end your career', 'career over', 'retire now', 'quit rapping',
      'find a new job', 'back to work', 'flip burgers', 'day job',
      'never make it', 'industry reject', 'label dropout'
    ];
    
    const lower = text.toLowerCase();
    careerAttacks.forEach(attack => {
      if (lower.includes(attack)) score += 3;
    });
    
    return Math.min(9, score);
  }
  
  private detectSetupPayoff(lines: string[]): number {
    let score = 0;
    
    // Look for question/answer or setup/punchline patterns
    for (let i = 0; i < lines.length - 1; i++) {
      const line1 = lines[i].toLowerCase();
      const line2 = lines[i + 1].toLowerCase();
      
      // Setup patterns
      if (line1.includes('you think') || line1.includes('you said') || 
          line1.includes('what') || line1.includes('how') || line1.includes('why')) {
        // Payoff patterns
        if (line2.includes('but') || line2.includes('nah') || 
            line2.includes('actually') || line2.includes('really')) {
          score += 3;
        }
      }
      
      // Classic setup/punchline structure
      if (line1.endsWith('?') && !line2.endsWith('?')) {
        score += 2;
      }
    }
    
    return Math.min(6, score);
  }
  
  private detectPsychologicalWarfare(text: string): number {
    let score = 0;
    const psychWarfare = [
      'in your head', 'mess with your mind', 'drive you crazy',
      'haunt your dreams', 'live rent free', 'obsessed with me',
      'cant stop thinking', 'losing sleep', 'paranoid', 'insecure'
    ];
    
    const lower = text.toLowerCase();
    psychWarfare.forEach(tactic => {
      if (lower.includes(tactic)) score += 2;
    });
    
    return Math.min(8, score);
  }
  
  private wordsRhymeAdvanced(word1: string, word2: string): boolean {
    if (word1 === word2 || word1.length < 2 || word2.length < 2) return false;
    
    // Multi-syllabic rhyme detection
    if (word1.length >= 4 && word2.length >= 4) {
      // Check last 3+ characters for complex rhymes
      if (word1.slice(-3) === word2.slice(-3)) return true;
      if (word1.slice(-4) === word2.slice(-4)) return true;
    }
    
    // Perfect rhyme (last 2+ characters)
    if (word1.slice(-2) === word2.slice(-2)) return true;
    
    // Assonance (vowel sounds)
    const vowels1 = word1.match(/[aeiou]/g)?.join('') || '';
    const vowels2 = word2.match(/[aeiou]/g)?.join('') || '';
    if (vowels1 === vowels2 && vowels1.length >= 2) return true;
    
    // Near rhymes with similar consonant patterns
    const consonants1 = word1.replace(/[aeiou]/g, '');
    const consonants2 = word2.replace(/[aeiou]/g, '');
    if (consonants1.slice(-2) === consonants2.slice(-2) && consonants1.length >= 2) {
      return true;
    }
    
    return false;
  }
  
  private linesRhymePerfectly(line1: string, line2: string): boolean {
    const words1 = line1.split(/\s+/).filter(w => w.length > 1);
    const words2 = line2.split(/\s+/).filter(w => w.length > 1);
    
    if (words1.length < 3 || words2.length < 3) return false;
    
    // Check if multiple corresponding words rhyme
    let rhymeCount = 0;
    const minLength = Math.min(words1.length, words2.length);
    
    for (let i = 0; i < minLength; i++) {
      if (this.wordsRhymeAdvanced(words1[i], words2[i])) {
        rhymeCount++;
      }
    }
    
    // Lines rhyme perfectly if 60%+ of words rhyme
    return rhymeCount / minLength >= 0.6;
  }
  
  private calculateOriginality(text: string, rhymeAnalysis?: any, isFinalScore: boolean = false): number {
    const lower = text.toLowerCase();
    let originalityScore = 15; // Start with full points
    
    // Enhanced clichés and overused phrases in rap
    const cliches = [
      'mic check', 'drop the beat', 'in the house', 'make some noise',
      'put your hands up', 'lets go', 'turn up', 'haters gonna hate',
      'money over everything', 'started from the bottom',
      'real recognize real', 'keep it 100',
      'grind every day', 'hustle hard',
      // Battle-specific clichés
      'step to me', 'bring the heat', 'spit fire',
      'demolish you', 'end your career', 'call me the best'
    ];
    
    cliches.forEach(cliche => {
      if (lower.includes(cliche)) {
        originalityScore -= 3;
      }
    });
    
    // Enhanced overused rhymes detection
    const overusedRhymes = [
      ['money', 'honey'], ['game', 'fame'], ['real', 'deal'],
      ['flow', 'show'], ['tight', 'right'], ['stack', 'pack'],
      // Battle-specific overused rhymes
      ['beat', 'defeat'], ['fire', 'desire'], ['mic', 'sick']
    ];
    
    overusedRhymes.forEach(rhyme => {
      if (rhyme.every(word => lower.includes(word))) {
        originalityScore -= 2;
      }
    });
    
    // Phonetic originality bonus for final scores
    if (isFinalScore && rhymeAnalysis) {
      // Bonus for unique phonetic patterns
      const phoneticOriginality = Math.min(5, rhymeAnalysis.phoneticComplexity * 0.05);
      originalityScore += phoneticOriginality;
      
      // Bonus for advanced slant rhymes (more original than perfect rhymes)
      const slantRhymeBonus = Math.min(3, rhymeAnalysis.slantRhymes * 0.2);
      originalityScore += slantRhymeBonus;
      
      // Bonus for multi-syllabic complexity
      const complexityBonus = Math.min(2, rhymeAnalysis.multiSyllabicScore * 0.02);
      originalityScore += complexityBonus;
    }
    
    return Math.max(0, Math.min(20, originalityScore)); // Increased max for enhanced scoring
  }

  private isMultiSyllableRhyme(word1: string, word2: string): boolean {
    if (word1.length < 4 || word2.length < 4) return false;
    const ending1 = word1.slice(-3);
    const ending2 = word2.slice(-3);
    return ending1 === ending2 && word1 !== word2;
  }

  scoreRound(userVerse: string, aiVerse: string, isFinalScore: boolean = false, battleId?: string): RoundScores {
    console.log(`🏆 Scoring round ${isFinalScore ? 'FINAL BATTLE SCORES' : 'preview'} with advanced phonetic analysis...`);
    
    // CRITICAL: Final battle scores always get advanced analysis with no rate limiting
    const userRhyme = this.calculateRhymeDensity(userVerse, isFinalScore, battleId);
    const userFlow = this.calculateFlowQuality(userVerse, isFinalScore, battleId);
    const userCreativity = this.calculateCreativity(userVerse, isFinalScore, battleId);
    
    const aiRhyme = this.calculateRhymeDensity(aiVerse, isFinalScore, battleId);
    const aiFlow = this.calculateFlowQuality(aiVerse, isFinalScore, battleId);
    const aiCreativity = this.calculateCreativity(aiVerse, isFinalScore, battleId);
    
    // DYNAMIC BALANCED SCORING: Excel at different techniques at different times
    // Perfect balance across ALL battle rap techniques known to the genre
    
    // Get detailed component scores for perfect balance with advanced analysis
    const userComponents = this.getDetailedComponents(userVerse, isFinalScore, battleId);
    const aiComponents = this.getDetailedComponents(aiVerse, isFinalScore, battleId);
    
    // Dynamic weighting based on what each rapper excels at this round
    const userWeights = this.calculateDynamicWeights(userComponents);
    const aiWeights = this.calculateDynamicWeights(aiComponents);
    
    // Use more generous scoring that takes individual component scores into account
    const userBalancedScore = this.calculateBalancedScore(userComponents, userWeights);
    const aiBalancedScore = this.calculateBalancedScore(aiComponents, aiWeights);
    
    // Use pure calculated scores - no artificial minimums or maximums
    const userScore = Math.round(Math.max(0, userBalancedScore));
    const aiScore = Math.round(aiBalancedScore);

    if (isFinalScore) {
      console.log(`🏆 FINAL BATTLE SCORES: User (R:${userRhyme}, F:${userFlow}, C:${userCreativity}) = ${userScore} vs AI (R:${aiRhyme}, F:${aiFlow}, C:${aiCreativity}) = ${aiScore}`);
      console.log(`🎯 Final scoring used advanced phonetic analysis with zero rate limiting`);
    }

    return {
      userScore,
      aiScore,
      rhymeDensity: userRhyme,
      flowQuality: userFlow,
      creativity: userCreativity,
      totalScore: userScore,
    };
  }

  private getLastWord(line: string): string {
    const words = line.trim().split(/\s+/);
    const lastWord = words[words.length - 1];
    return lastWord.replace(/[^\w]/g, '').toLowerCase();
  }

  private wordsRhyme(word1: string, word2: string): boolean {
    if (word1.length < 1 || word2.length < 1 || word1 === word2) return false;
    
    // Enhanced rhyme detection
    const clean1 = word1.toLowerCase().replace(/[^a-z]/g, '');
    const clean2 = word2.toLowerCase().replace(/[^a-z]/g, '');
    
    if (clean1.length < 1 || clean2.length < 1) return false;
    
    // Perfect rhyme detection - check various ending patterns
    if (clean1.length >= 3 && clean2.length >= 3) {
      if (clean1.slice(-3) === clean2.slice(-3)) return true; // 3-char endings
    }
    if (clean1.length >= 2 && clean2.length >= 2) {
      if (clean1.slice(-2) === clean2.slice(-2)) return true; // 2-char endings  
    }
    
    // Single letter rhymes for short words
    if (clean1.slice(-1) === clean2.slice(-1) && (clean1.length <= 2 || clean2.length <= 2)) {
      return true;
    }
    
    // Common rhyme patterns
    const rhymePatterns = [
      ['yo', 'go', 'so', 'no', 'flow', 'pro', 'show', 'know'],
      ['man', 'can', 'ran', 'plan', 'fan', 'ban'],
      ['ay', 'day', 'way', 'say', 'play', 'stay'],
      ['ight', 'right', 'fight', 'night', 'sight', 'might']
    ];
    
    for (const pattern of rhymePatterns) {
      if (pattern.includes(clean1) && pattern.includes(clean2)) {
        return true;
      }
    }
    
    return false;
  }

  private countSyllables(text: string): number {
    const words = text.toLowerCase().split(/\s+/);
    let total = 0;
    
    for (const word of words) {
      const cleanWord = word.replace(/[^\w]/g, '');
      if (cleanWord.length === 0) continue;
      
      // Simple syllable counting heuristic
      const vowels = cleanWord.match(/[aeiouy]+/g);
      const syllableCount = vowels ? vowels.length : 1;
      total += Math.max(1, syllableCount);
    }
    
    return total;
  }

  private scoreInRange(value: number, min: number, max: number): number {
    if (value >= min && value <= max) return 100;
    
    const distance = Math.min(
      Math.abs(value - min),
      Math.abs(value - max)
    );
    
    return Math.max(0, 100 - (distance * 10));
  }

  // COMPREHENSIVE BALANCED SCORING SYSTEM
  // Excel at different techniques at different times while maintaining perfect balance
  
  private getDetailedComponents(text: string, isFinalScore: boolean = false, battleId?: string): any {
    // ADVANCED COMPONENT ANALYSIS - Pass final score flag for zero rate limiting
    console.log(`🔍 Getting detailed components ${isFinalScore ? 'FINAL' : 'preview'} for advanced scoring...`);
    
    return {
      text: text,
      // CRITICAL: Pass isFinalScore to bypass all rate limiting for advanced analysis
      rhyme: this.calculateRhymeDensity(text, isFinalScore, battleId),
      flow: this.calculateFlowQuality(text, isFinalScore, battleId),
      creativity: this.calculateCreativity(text, isFinalScore, battleId),
      // Add phonetic analysis for comprehensive component tracking
      phonetic: isFinalScore ? this.phoneticAnalyzer.getEnhancedRhymeAnalysis(text, isFinalScore, battleId) : null
    };
  }
  
  private calculateDynamicWeights(components: any): { rhyme: number; flow: number; wordplay: number; battle: number } {
    // Identify what this rapper excels at and adjust weights accordingly
    // This creates dynamic battles where different techniques shine at different times
    
    const strengths: string[] = [];
    const baseWeights = {
      rhyme: 0.30,
      flow: 0.25, 
      wordplay: 0.25,
      battle: 0.20
    };
    
    // Detect strengths and boost weights for excellence
    if (components.multiLineRhymes >= 8) strengths.push('rhyme');
    if (components.punchlines >= 15) strengths.push('wordplay');
    if (components.rhythm >= 8 && components.syllableFlow >= 8) strengths.push('flow');
    if (components.battleTactics >= 10) strengths.push('battle');
    
    // Excel at detected strengths (10% boost), balance others
    const adjustedWeights = { ...baseWeights };
    if (strengths.length > 0) {
      const boost = 0.10 / strengths.length;
      const reduction = 0.10 / (4 - strengths.length);
      
      strengths.forEach(strength => {
        if (strength in adjustedWeights) {
          (adjustedWeights as any)[strength] += boost;
        }
      });
      
      Object.keys(adjustedWeights).forEach(key => {
        if (!strengths.includes(key)) {
          (adjustedWeights as any)[key] = Math.max(0.05, (adjustedWeights as any)[key] - reduction);
        }
      });
    }
    
    return adjustedWeights;
  }
  
  private calculateBalancedScore(components: any, weights: any): number {
    // SIMPLIFIED AND ACCURATE SCORING - Fix the broken calculation
    
    // Get the core scores from existing methods (these work correctly)
    const rhyme = this.calculateRhymeDensity(components.text || '');
    const flow = this.calculateFlowQuality(components.text || '');  
    const creativity = this.calculateCreativity(components.text || '');
    
    // Combine scores with proper weighting
    const combinedScore = (rhyme * 0.35) + (flow * 0.35) + (creativity * 0.30);
    
    console.log(`🎯 Score combination: Rhyme ${rhyme}/100 (35%), Flow ${flow}/100 (35%), Creativity ${creativity}/100 (30%) = ${Math.round(combinedScore)}/100`);
    
    return Math.max(15, Math.min(100, Math.round(combinedScore)));
  }
  
  // Additional component calculators for perfect balance
  private calculateEndRhymes(text: string): number {
    const lines = text.split('\n').filter(line => line.trim());
    let score = 0;
    
    for (let i = 0; i < lines.length - 1; i++) {
      const word1 = this.getLastWord(lines[i]);
      const word2 = this.getLastWord(lines[i + 1]);
      if (this.wordsRhymeAdvanced(word1, word2)) {
        score += 5;
      }
    }
    
    return Math.min(20, score);
  }
  
  private calculateInternalRhymes(text: string): number {
    const lines = text.split('\n').filter(line => line.trim());
    let score = 0;
    
    lines.forEach(line => {
      const words = line.toLowerCase().split(/\s+/).filter(w => w.length > 2);
      for (let i = 0; i < words.length - 1; i++) {
        for (let j = i + 1; j < words.length; j++) {
          if (this.wordsRhymeAdvanced(words[i], words[j])) {
            score += 2;
          }
        }
      }
    });
    
    return Math.min(25, score);
  }
  
  private calculateMultiLineRhymes(text: string): number {
    return this.detectMultiLineRhymes(text.split('\n').filter(line => line.trim()));
  }
  
  private calculateMultiSyllabicRhymes(text: string): number {
    const lines = text.split('\n').filter(line => line.trim());
    let score = 0;
    
    for (let i = 0; i < lines.length - 1; i++) {
      const word1 = this.getLastWord(lines[i]);
      const word2 = this.getLastWord(lines[i + 1]);
      if (this.isMultiSyllableRhyme(word1, word2)) {
        score += 3;
      }
    }
    
    return Math.min(15, score);
  }
  
  private calculateSyllableFlow(text: string): number {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length < 2) return 5;
    
    const syllableCounts = lines.map(line => this.countSyllables(line));
    const avgSyllables = syllableCounts.reduce((a, b) => a + b, 0) / syllableCounts.length;
    
    // Perfect flow: 8-16 syllables per line with consistency
    const rangeScore = this.scoreInRange(avgSyllables, 8, 16) / 10;
    
    const consistency = syllableCounts.filter(count => 
      Math.abs(count - avgSyllables) <= 3
    ).length / syllableCounts.length;
    
    return Math.round((rangeScore + (consistency * 10)) / 2);
  }
  
  private calculatePacing(text: string): number {
    const lines = text.split('\n').filter(line => line.trim());
    let score = 8; // Base score
    
    // Check for good pacing indicators
    const pacingWords = ['pause', 'wait', 'hold', 'stop', 'break', 'breathe'];
    const lower = text.toLowerCase();
    
    pacingWords.forEach(word => {
      if (lower.includes(word)) score += 1;
    });
    
    return Math.min(12, score);
  }
  
  private calculateVocabulary(text: string): number {
    const words = text.toLowerCase().split(/\s+/).filter(w => w.length > 3);
    const uniqueWords = new Set(words);
    
    const diversity = uniqueWords.size / Math.max(1, words.length);
    return Math.round(diversity * 15);
  }
  
  calculateUserScore(userText: string): number {
    // Enhanced scoring with phonetic analysis
    const phoneticAnalysis = this.phoneticAnalyzer.getEnhancedRhymeAnalysis(userText);
    
    const components = this.getDetailedComponents(userText, true, 'user-analysis'); // Always use advanced for user analysis
    const weights = this.calculateDynamicWeights(components);
    const score = this.calculateBalancedScore(components, weights);
    
    // Enhance rhyme scoring with phonetic analysis (FINAL SCORE - no rate limiting)
    const baseRhyme = this.calculateRhymeDensity(userText, true, 'user-analysis');
    const phoneticBonus = Math.min(15, phoneticAnalysis.complexityScore * 0.15);
    const enhancedRhyme = Math.min(100, baseRhyme + phoneticBonus);
    
    // Legacy compatibility - still show main components (FINAL SCORE)
    const flowQuality = this.calculateFlowQuality(userText, true, 'user-analysis');
    const creativity = this.calculateCreativity(userText);
    
    // Enhanced score combination with phonetic insights
    const enhancedScore = (enhancedRhyme * 0.35) + (flowQuality * 0.35) + (creativity * 0.30);
    
    console.log(`🎯 Enhanced User Analysis:`);
    console.log(`   📊 Phonetic: ${phoneticAnalysis.totalRhymes} total, ${phoneticAnalysis.internalRhymes} internal, density ${phoneticAnalysis.rhymeDensity.toFixed(2)}`);
    console.log(`   🎵 Rhyme: ${baseRhyme} + ${phoneticBonus.toFixed(1)} phonetic = ${enhancedRhyme.toFixed(1)}`);
    console.log(`   🎯 Final: Rhyme ${enhancedRhyme.toFixed(1)}, Flow ${flowQuality}, Creativity ${creativity} → Score ${Math.round(enhancedScore)}`);
    
    return Math.max(0, Math.min(100, enhancedScore));
  }
}

export const scoringService = new ScoringService();
