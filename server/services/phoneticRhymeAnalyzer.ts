import * as fs from 'fs';
import * as path from 'path';

// Phonetic Rhyme Scheme Annotation Algorithm
// Based on CMU Pronouncing Dictionary and advanced phonetic analysis

interface PhoneticSyllable {
  phonemes: string[];
  text: string;
  stress: number; // 0=unstressed, 1=primary, 2=secondary
  rhymePattern: string[];
  families: Set<string>;
}

export interface RhymeFamily {
  letter: string;
  pattern: string[];
  occurrences: number;
  lines: number[];
}

interface LineAnalysis {
  syllableCount: number;
  syllables: PhoneticSyllable[];
  endRhymeFamily: string;
  familyCounts: Map<string, number>;
  scheme: string;
  breakdown: string;
}

export interface RhymeSchemeResult {
  lines: LineAnalysis[];
  families: Map<string, RhymeFamily>;
  overallScheme: string[];
  rhymeDensity: number;
  perfectRhymes: number;
  slantRhymes: number;
}

export class PhoneticRhymeAnalyzer {
  private cmuDict: Map<string, string[][]> = new Map();
  private families: Map<string, RhymeFamily> = new Map();
  private nextFamilyLetter = 'A';
  private readonly SLANT_THRESHOLD = 0.7; // Threshold for slant rhyme similarity

  // Advanced caching system for battle performance
  private battleCache = new Map<string, RhymeSchemeResult>();
  private enhancedCache = new Map<string, any>();
  private cacheExpiry = 5 * 60 * 1000; // 5 minutes
  
  // COMPREHENSIVE RHYME FAMILY TRACKING across entire battles
  private battleRhymeFamilies = new Map<string, Map<string, RhymeFamily>>();
  private battleProgression = new Map<string, { rounds: number; familyEvolution: string[] }>();

  private static analysisDepth = 0;
  private static readonly MAX_ANALYSIS_DEPTH = 10; // Increased for battle complexity
  private static analysisInProgress = false;
  private static lastAnalysisTime = 0;
  private static readonly MIN_ANALYSIS_INTERVAL = 25; // Reduced for better battle responsiveness

  constructor() {
    this.loadCMUDictionary();
    console.log('🎯 PhoneticRhymeAnalyzer initialized with CMU dictionary');
  }

  /**
   * Load CMU Pronouncing Dictionary for phonetic analysis
   */
  private loadCMUDictionary(): void {
    try {
      // Try to load from node_modules first
      const cmuPath = path.join(process.cwd(), 'node_modules', 'cmu-pronouncing-dictionary', 'cmudict.txt');

      if (fs.existsSync(cmuPath)) {
        const dictData = fs.readFileSync(cmuPath, 'utf8');
        this.parseCMUDict(dictData);
      } else {
        // Fallback to essential phonetic mappings
        this.loadEssentialPhonetics();
      }
    } catch (error) {
      console.warn('⚠️ CMU dictionary loading failed, using essential phonetics:', error);
      this.loadEssentialPhonetics();
    }
  }

  private parseCMUDict(dictData: string): void {
    const lines = dictData.split('\n');
    let wordCount = 0;

    for (const line of lines) {
      if (line.startsWith(';;;') || line.trim() === '') continue;

      const parts = line.split('  ');
      if (parts.length >= 2) {
        let word = parts[0].toLowerCase();

        // Handle alternative pronunciations like WORD(1)
        const parenIndex = word.indexOf('(');
        if (parenIndex > 0) {
          word = word.substring(0, parenIndex);
        }

        const phonemes = parts[1].trim().split(' ');

        if (!this.cmuDict.has(word)) {
          this.cmuDict.set(word, []);
        }
        this.cmuDict.get(word)!.push(phonemes);
        wordCount++;
      }
    }
    console.log(`✅ Loaded ${this.cmuDict.size} words with ${wordCount} pronunciations from CMU dictionary`);
  }

  private loadEssentialPhonetics(): void {
    // Essential rap vocabulary with phonetic transcriptions
    const essentialWords = new Map([
      // Common rap words
      ['fire', [['F', 'AY1', 'R']]],
      ['flow', [['F', 'L', 'OW1']]],
      ['beat', [['B', 'IY1', 'T']]],
      ['rap', [['R', 'AE1', 'P']]],
      ['real', [['R', 'IY1', 'L']]],
      ['game', [['G', 'EY1', 'M']]],
      ['fight', [['F', 'AY1', 'T']]],
      ['track', [['T', 'R', 'AE1', 'K']]],
      ['attack', [['AH0', 'T', 'AE1', 'K']]],
      ['back', [['B', 'AE1', 'K']]],
      ['pack', [['P', 'AE1', 'K']]],
      ['stack', [['S', 'T', 'AE1', 'K']]],
      ['crack', [['K', 'R', 'AE1', 'K']]],
      ['black', [['B', 'L', 'AE1', 'K']]],

      // Rhyme endings
      ['nation', [['N', 'EY1', 'SH', 'AH0', 'N']]],
      ['creation', [['K', 'R', 'IY0', 'EY1', 'SH', 'AH0', 'N']]],
      ['devastation', [['D', 'EH2', 'V', 'AH0', 'S', 'T', 'EY1', 'SH', 'AH0', 'N']]],
      ['domination', [['D', 'AA2', 'M', 'AH0', 'N', 'EY1', 'SH', 'AH0', 'N']]],

      // Common endings
      ['time', [['T', 'AY1', 'M']]],
      ['rhyme', [['R', 'AY1', 'M']]],
      ['crime', [['K', 'R', 'AY1', 'M']]],
      ['prime', [['P', 'R', 'AY1', 'M']]],
      ['mind', [['M', 'AY1', 'N', 'D']]],
      ['find', [['F', 'AY1', 'N', 'D']]],
      ['grind', [['G', 'R', 'AY1', 'N', 'D']]],
      ['blind', [['B', 'L', 'AY1', 'N', 'D']]]
    ]);

    this.cmuDict = essentialWords;
    console.log(`✅ Loaded ${this.cmuDict.size} essential rap phonetics`);
  }

  /**
   * Main entry point: Analyze rap lyrics with comprehensive phonetic rhyme scheme
   * @param lyrics The lyrics to analyze
   * @param isFinalScore If true, bypasses all rate limiting for battle scoring
   * @param battleId Optional battle ID for caching
   */
  analyzeRhymeScheme(lyrics: string, isFinalScore: boolean = false, battleId?: string): RhymeSchemeResult {
    const now = Date.now();
    
    // Check cache first for better performance
    const cacheKey = `${lyrics.substring(0, 100)}_${battleId || 'default'}`;
    if (!isFinalScore && this.battleCache.has(cacheKey)) {
      const cached = this.battleCache.get(cacheKey)!;
      console.log('📋 Using cached rhyme analysis for faster response');
      return cached;
    }
    
    // Advanced phonetic analysis enabled
    console.log(`🎯 ${isFinalScore ? 'FINAL SCORE' : 'Enhanced'} rhyme analysis enabled - full phonetic processing`);
    
    // CRITICAL: Final battle scores bypass ALL rate limiting
    if (!isFinalScore) {
      // Circuit breaker: prevent multiple simultaneous analyses (but allow some concurrency for different users)
      if (PhoneticRhymeAnalyzer.analysisInProgress && (now - PhoneticRhymeAnalyzer.lastAnalysisTime) < 25) {
        console.log('🚫 PhoneticRhymeAnalyzer: Analysis blocked due to rapid concurrent requests');
        return this.createEmptyResult();
      }
      
      // Rate limiting: prevent excessively frequent analyses while allowing battle-speed requests
      if (now - PhoneticRhymeAnalyzer.lastAnalysisTime < PhoneticRhymeAnalyzer.MIN_ANALYSIS_INTERVAL) {
        console.log('🚫 PhoneticRhymeAnalyzer: Rate limited (analysis too frequent), falling back to simple analysis');
        // Fallback to simple analysis instead of completely skipping
        return {
          lines: [],
          families: new Map(),
          overallScheme: [],
          rhymeDensity: 0,
          perfectRhymes: Math.floor(this.countSimpleRhymes(lyrics.toLowerCase().split(/\s+/).filter(w => w.length > 0)) * 0.7),
          slantRhymes: Math.floor(this.countSimpleRhymes(lyrics.toLowerCase().split(/\s+/).filter(w => w.length > 0)) * 0.3)
        };
      }
      
      // Depth protection (relaxed for final scores)
      if (PhoneticRhymeAnalyzer.analysisDepth >= PhoneticRhymeAnalyzer.MAX_ANALYSIS_DEPTH) {
        console.log('🚫 PhoneticRhymeAnalyzer: Maximum recursion depth reached');
        PhoneticRhymeAnalyzer.analysisDepth = 0;
        return this.createEmptyResult();
      }
    }

    // Input validation
    if (!lyrics || lyrics.trim().length === 0) {
      return this.createEmptyResult();
    }

    // Limit input size to prevent memory issues (increased for battle verses)
    const truncatedLyrics = lyrics.length > 1000 ? lyrics.substring(0, 1000) : lyrics;

    // Set flags
    PhoneticRhymeAnalyzer.analysisInProgress = true;
    PhoneticRhymeAnalyzer.lastAnalysisTime = now;
    PhoneticRhymeAnalyzer.analysisDepth++;

    try {
      // Log analysis start with timing info for battle performance monitoring
      if (PhoneticRhymeAnalyzer.analysisDepth === 1) {
        console.log(`🎯 PhoneticRhymeAnalyzer: Starting analysis (depth: ${PhoneticRhymeAnalyzer.analysisDepth}, interval: ${now - PhoneticRhymeAnalyzer.lastAnalysisTime}ms)`);
      }

      // Reset state for new analysis
      this.families.clear();
      this.nextFamilyLetter = 'A';

      const lines = this.preprocessLyrics(truncatedLyrics);
      const lineAnalyses: LineAnalysis[] = [];
      let totalPerfectRhymes = 0;
      let totalSlantRhymes = 0;

      // Limit line processing to prevent memory overflow (increased for longer verses)
      const maxLines = isFinalScore ? lines.length : Math.min(lines.length, 20); // No limits for final scores

      // Process each line
      for (let lineIndex = 0; lineIndex < maxLines; lineIndex++) {
        const line = lines[lineIndex];
        if (!line.trim()) continue;

        const analysis = this.analyzeLine(line, lineIndex);
        lineAnalyses.push(analysis);

        // Count rhyme types by analyzing family patterns
        analysis.familyCounts.forEach((count, familyLetter) => {
          const family = this.families.get(familyLetter);
          if (family && count >= 1) {
            // For single occurrences, still count as a partial rhyme (0.5 points)
            // For multiple occurrences, count pairs
            let rhymeCredit = count === 1 ? 0.5 : Math.floor(count / 2);

            // Analyze pattern precision for classification
            const isExactPattern = this.isExactRhymePattern(family.pattern);

            if (isExactPattern) {
              totalPerfectRhymes += rhymeCredit;
            } else {
              totalSlantRhymes += rhymeCredit;
            }
          }
        });
      }

      // Calculate overall metrics
      const totalLines = lineAnalyses.length;
      const totalInternalRhymes = lineAnalyses.reduce((sum, analysis) => {
        return sum + Array.from(analysis.familyCounts.values()).reduce((a, b) => a + b, 0);
      }, 0);

      const rhymeDensity = totalLines > 0 ? totalInternalRhymes / totalLines : 0;
      const overallScheme = lineAnalyses.map(analysis => analysis.scheme);

      const result = {
        lines: lineAnalyses,
        families: this.families,
        overallScheme,
        rhymeDensity,
        perfectRhymes: totalPerfectRhymes,
        slantRhymes: totalSlantRhymes
      };

      // Cache result for future use (if not final score)
      if (!isFinalScore && battleId) {
        this.battleCache.set(cacheKey, result);
        // Clean old cache entries
        if (this.battleCache.size > 100) {
          const firstKey = this.battleCache.keys().next().value;
          if (firstKey) {
            this.battleCache.delete(firstKey);
          }
        }
      }

      // COMPREHENSIVE BATTLE RHYME FAMILY TRACKING
      if (battleId) {
        this.trackBattleRhymeFamilies(battleId, result, isFinalScore);
      }

      return result;
    } catch (error) {
      console.error('🚫 PhoneticRhymeAnalyzer: Analysis error:', error);
      return this.createEmptyResult();
    } finally {
      // Always reset flags to prevent deadlock
      PhoneticRhymeAnalyzer.analysisInProgress = false;
      PhoneticRhymeAnalyzer.analysisDepth = Math.max(0, PhoneticRhymeAnalyzer.analysisDepth - 1);
      
      // Clear cached data when back to root level
      if (PhoneticRhymeAnalyzer.analysisDepth === 0) {
        this.families.clear();
        // Optional garbage collection hint (less aggressive)
        if (PhoneticRhymeAnalyzer.analysisDepth === 0 && typeof global !== 'undefined' && 'gc' in global && typeof (global as any).gc === 'function') {
          // Only suggest GC if we're truly done with all analyses
          setTimeout(() => {
            if (PhoneticRhymeAnalyzer.analysisDepth === 0) {
              (global as any).gc();
            }
          }, 1000);
        }
      }
    }
  }

  /**
   * Analyze a single line for syllables, rhymes, and families
   */
  private analyzeLine(line: string, lineIndex: number): LineAnalysis {
    // 1. Syllabify the line
    const syllables = this.syllabifyLine(line);
    const syllableCount = syllables.length;

    // 2. Identify end-of-line rhyme family
    const endRhymeFamily = this.assignEndRhymeFamily(syllables, lineIndex);

    // 3. Detect internal rhymes
    const familyCounts = this.detectInternalRhymes(syllables, lineIndex);

    // 4. Build scheme annotation
    const scheme = this.buildSchemeAnnotation(syllableCount, familyCounts);
    const breakdown = this.buildSyllableBreakdown(syllables);

    return {
      syllableCount,
      syllables,
      endRhymeFamily,
      familyCounts,
      scheme,
      breakdown
    };
  }

  /**
   * Convert line to phonetic syllables using CMU dictionary
   */
  private syllabifyLine(line: string): PhoneticSyllable[] {
    const words = this.tokenize(line);
    const syllables: PhoneticSyllable[] = [];

    for (const word of words) {
      const wordSyllables = this.syllabifyWord(word);
      syllables.push(...wordSyllables);
    }

    return syllables;
  }

  private syllabifyWord(word: string): PhoneticSyllable[] {
    const cleanWord = word.toLowerCase().replace(/[^a-z]/g, '');
    if (!cleanWord) return [];

    // Get phonemes from CMU dictionary
    const pronunciations = this.cmuDict.get(cleanWord);
    if (!pronunciations || pronunciations.length === 0) {
      // Fallback to heuristic syllabification
      return this.heuristicSyllabify(word);
    }

    // Use first pronunciation
    const phonemes = pronunciations[0];
    const syllables: PhoneticSyllable[] = [];
    let currentSyllable: string[] = [];
    let currentText = '';
    let wordCharIndex = 0;

    for (const phoneme of phonemes) {
      currentSyllable.push(phoneme);

      // Check if this phoneme ends a syllable (has stress marker)
      if (phoneme.match(/[012]$/)) {
        const stress = parseInt(phoneme.slice(-1));

        // Extract corresponding text portion (approximate)
        const syllableLength = Math.max(1, Math.floor(word.length / this.countSyllablesInPhonemes(phonemes)));
        const syllableText = word.slice(wordCharIndex, wordCharIndex + syllableLength);
        wordCharIndex += syllableLength;

        // Create rhyme pattern (from stressed vowel to end)
        const rhymePattern = this.extractRhymePattern(currentSyllable);

        syllables.push({
          phonemes: [...currentSyllable],
          text: syllableText || word.slice(-2), // Fallback
          stress,
          rhymePattern,
          families: new Set()
        });

        currentSyllable = [];
      }
    }

    // Handle any remaining phonemes
    if (currentSyllable.length > 0) {
      syllables.push({
        phonemes: currentSyllable,
        text: word.slice(wordCharIndex) || word.slice(-1),
        stress: 0,
        rhymePattern: this.extractRhymePattern(currentSyllable),
        families: new Set()
      });
    }

    return syllables.length > 0 ? syllables : this.heuristicSyllabify(word);
  }

  /**
   * Determines if a rhyme pattern represents a perfect rhyme
   */
  private isExactRhymePattern(pattern: string[]): boolean {
    // Perfect rhymes have exact phoneme matches
    // This is a simplified check - can be expanded
    return pattern.length >= 2 && pattern.some(p => p.match(/[12]$/));
  }

  private extractRhymePattern(phonemes: string[]): string[] {
    // Find the last stressed vowel and extract from there to end
    let stressedIndex = -1;
    for (let i = phonemes.length - 1; i >= 0; i--) {
      if (phonemes[i].match(/[12]$/)) {
        stressedIndex = i;
        break;
      }
    }

    if (stressedIndex >= 0) {
      return phonemes.slice(stressedIndex);
    }

    // Fallback: use last few phonemes
    return phonemes.slice(-2);
  }

  private countSyllablesInPhonemes(phonemes: string[]): number {
    return phonemes.filter(p => p.match(/[012]$/)).length;
  }

  private heuristicSyllabify(word: string): PhoneticSyllable[] {
    // Simple heuristic: count vowel groups
    const vowelPattern = /[aeiouAEIOU]+/g;
    const matches = word.match(vowelPattern) || [];
    const syllableCount = Math.max(1, matches.length);

    // Create approximate syllables
    const syllables: PhoneticSyllable[] = [];
    const syllableLength = Math.ceil(word.length / syllableCount);

    for (let i = 0; i < syllableCount; i++) {
      const start = i * syllableLength;
      const end = Math.min(start + syllableLength, word.length);
      const text = word.slice(start, end);

      syllables.push({
        phonemes: [text.toUpperCase()], // Approximate
        text,
        stress: i === syllableCount - 1 ? 1 : 0, // Last syllable stressed
        rhymePattern: [text.slice(-2).toUpperCase()],
        families: new Set()
      });
    }

    return syllables;
  }

  /**
   * Assign rhyme family for line-ending syllable
   */
  private assignEndRhymeFamily(syllables: PhoneticSyllable[], lineIndex: number): string {
    if (syllables.length === 0) return '';

    const lastSyllable = syllables[syllables.length - 1];
    const rhymePattern = lastSyllable.rhymePattern;

    // Check if this pattern matches existing families
    const familiesArray = Array.from(this.families.entries());
    for (const [letter, family] of familiesArray) {
      if (this.phonemeMatch(rhymePattern, family.pattern)) {
        family.occurrences++;
        family.lines.push(lineIndex);
        lastSyllable.families.add(letter);
        return letter;
      }
    }

    // Create new family
    const newLetter = this.nextFamilyLetter;
    this.families.set(newLetter, {
      letter: newLetter,
      pattern: rhymePattern,
      occurrences: 1,
      lines: [lineIndex]
    });

    lastSyllable.families.add(newLetter);
    this.nextFamilyLetter = String.fromCharCode(this.nextFamilyLetter.charCodeAt(0) + 1);

    return newLetter;
  }

  /**
   * Detect internal rhymes within the line
   */
  private detectInternalRhymes(syllables: PhoneticSyllable[], lineIndex: number): Map<string, number> {
    const familyCounts = new Map<string, number>();

    for (const syllable of syllables) {
      // Check against all existing families
      const familiesArray = Array.from(this.families.entries());
      for (const [letter, family] of familiesArray) {
        if (this.phonemeMatch(syllable.rhymePattern, family.pattern)) {
          syllable.families.add(letter);
          familyCounts.set(letter, (familyCounts.get(letter) || 0) + 1);
        }
      }
    }

    return familyCounts;
  }

  /**
   * Advanced phoneme matching for perfect and slant rhymes
   */
  private phonemeMatch(pattern1: string[], pattern2: string[]): boolean {
    if (pattern1.length === 0 || pattern2.length === 0) return false;

    // Perfect match
    if (this.arraysEqual(pattern1, pattern2)) return true;

    // Extract vowel cores for comparison
    const vowel1 = this.extractVowelCore(pattern1);
    const vowel2 = this.extractVowelCore(pattern2);

    // Require same vowel sound for slant rhyme
    if (vowel1 !== vowel2) return false;

    // Calculate consonant similarity for slant rhyme
    const consonantSim = this.consonantSimilarity(pattern1, pattern2);
    return consonantSim >= this.SLANT_THRESHOLD;
  }

  private extractVowelCore(phonemes: string[]): string {
    // Find the main vowel phoneme (with stress marker)
    for (const phoneme of phonemes) {
      if (phoneme.match(/[012]$/)) {
        return phoneme.replace(/[012]$/, ''); // Remove stress marker
      }
    }

    // Fallback: first phoneme
    return phonemes[0]?.replace(/[012]$/, '') || '';
  }

  private consonantSimilarity(pattern1: string[], pattern2: string[]): number {
    // Simple consonant similarity based on shared endings
    const consonants1 = pattern1.filter(p => !p.match(/[AEIOU]/));
    const consonants2 = pattern2.filter(p => !p.match(/[AEIOU]/));

    if (consonants1.length === 0 && consonants2.length === 0) return 1.0;
    if (consonants1.length === 0 || consonants2.length === 0) return 0.5;

    // Count matching consonants
    const matches = consonants1.filter(c1 => 
      consonants2.some(c2 => this.consonantsMatch(c1, c2))
    ).length;

    return matches / Math.max(consonants1.length, consonants2.length);
  }

  private consonantsMatch(c1: string, c2: string): boolean {
    // Exact match
    if (c1 === c2) return true;

    // Voice/voiceless pairs (common in rap slant rhymes)
    const voicePairs = [
      ['P', 'B'], ['T', 'D'], ['K', 'G'], 
      ['F', 'V'], ['TH', 'DH'], ['S', 'Z'],
      ['SH', 'ZH'], ['CH', 'JH']
    ];

    for (const [voiceless, voiced] of voicePairs) {
      if ((c1 === voiceless && c2 === voiced) || (c1 === voiced && c2 === voiceless)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Build scheme annotation in format: X–A²B¹
   */
  private buildSchemeAnnotation(syllableCount: number, familyCounts: Map<string, number>): string {
    let scheme = `${syllableCount}–`;

    // Sort families by letter for consistent output
    const sortedFamilies = Array.from(familyCounts.entries()).sort((a, b) => a[0].localeCompare(b[0]));

    for (const [letter, count] of sortedFamilies) {
      if (count > 0) {
        scheme += `${letter}${this.toSuperscript(count)}`;
      }
    }

    return scheme;
  }

  private buildSyllableBreakdown(syllables: PhoneticSyllable[]): string {
    return syllables.map(syl => {
      const familyLabels = Array.from(syl.families).sort().join('');
      const superscripts = familyLabels ? this.toSuperscriptLetters(familyLabels) : '';
      return `${syl.text}${superscripts}`;
    }).join(' ');
  }

  private toSuperscript(num: number): string {
    const superscriptMap: Record<string, string> = {
      '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴',
      '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹'
    };
    return num.toString().split('').map(d => superscriptMap[d] || d).join('');
  }

  private toSuperscriptLetters(letters: string): string {
    const superscriptMap: Record<string, string> = {
      'A': 'ᴬ', 'B': 'ᴮ', 'C': 'ᶜ', 'D': 'ᴰ', 'E': 'ᴱ', 'F': 'ᶠ', 'G': 'ᴳ', 'H': 'ᴴ',
      'I': 'ᴵ', 'J': 'ᴶ', 'K': 'ᴷ', 'L': 'ᴸ', 'M': 'ᴹ', 'N': 'ᴺ', 'O': 'ᴼ', 'P': 'ᴾ',
      'Q': 'Q', 'R': 'ᴿ', 'S': 'ˢ', 'T': 'ᵀ', 'U': 'ᵁ', 'V': 'ⱽ', 'W': 'ᵂ', 'X': 'ˣ',
      'Y': 'ʸ', 'Z': 'ᶻ'
    };
    return letters.split('').map(l => superscriptMap[l] || l).join('');
  }

  // Helper methods
  private preprocessLyrics(lyrics: string): string[] {
    return lyrics
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);
  }

  private tokenize(line: string): string[] {
    return line
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 0);
  }

  /**
   * Public tokenize method for external use - renamed to avoid recursion
   */
  public tokenizeExternal(line: string): string[] {
    return this.tokenize(line);
  }

  private arraysEqual(a: string[], b: string[]): boolean {
    return a.length === b.length && a.every((val, index) => val === b[index]);
  }

  /**
   * Creates an empty result object for error cases.
   */
  private createEmptyResult(): RhymeSchemeResult {
    return {
      lines: [],
      families: new Map(),
      overallScheme: [],
      rhymeDensity: 0,
      perfectRhymes: 0,
      slantRhymes: 0
    };
  }

  /**
   * Track rhyme families across battle rounds for comprehensive analysis
   * @param battleId The battle ID to track families for
   * @param result The rhyme scheme analysis result
   * @param isFinalScore Whether this is for final battle scoring
   */
  private trackBattleRhymeFamilies(battleId: string, result: RhymeSchemeResult, isFinalScore: boolean): void {
    try {
      // Initialize battle tracking if it doesn't exist
      if (!this.battleRhymeFamilies.has(battleId)) {
        this.battleRhymeFamilies.set(battleId, new Map());
        this.battleProgression.set(battleId, { rounds: 0, familyEvolution: [] });
      }

      const battleFamilies = this.battleRhymeFamilies.get(battleId)!;
      const battleProgress = this.battleProgression.get(battleId)!;

      // Merge current families with battle-wide tracking
      result.families.forEach((family, letter) => {
        if (battleFamilies.has(letter)) {
          // Update existing family data
          const existingFamily = battleFamilies.get(letter)!;
          existingFamily.occurrences += family.occurrences;
          existingFamily.lines.push(...family.lines);
        } else {
          // Add new family to battle tracking
          battleFamilies.set(letter, {
            ...family,
            lines: [...family.lines] // Clone the array
          });
        }
      });

      // Update battle progression
      battleProgress.rounds++;
      
      // Track family evolution for this round
      const familySnapshot = Array.from(battleFamilies.keys()).sort().join('');
      battleProgress.familyEvolution.push(familySnapshot);

      // Log tracking for battle analysis (only for final scores to avoid spam)
      if (isFinalScore) {
        console.log(`🎯 Battle ${battleId}: Tracked ${battleFamilies.size} rhyme families across ${battleProgress.rounds} rounds`);
        console.log(`🎯 Family evolution: ${battleProgress.familyEvolution.join(' → ')}`);
      }

      // Clean up old battle data to prevent memory leaks (keep last 10 battles)
      if (this.battleRhymeFamilies.size > 10) {
        const oldestBattle = this.battleRhymeFamilies.keys().next().value;
        if (oldestBattle) {
          this.battleRhymeFamilies.delete(oldestBattle);
          this.battleProgression.delete(oldestBattle);
        }
      }

    } catch (error) {
      console.warn(`⚠️ Battle rhyme family tracking failed for battle ${battleId}:`, error);
      // Don't throw - this is supplementary tracking
    }
  }


  /**
   * Get enhanced rhyme analysis for scoring with advanced metrics
   * @param lyrics The lyrics to analyze
   * @param isFinalScore Whether this is for final battle scoring (bypasses rate limiting)
   * @param battleId Optional battle ID for caching
   */
  getEnhancedRhymeAnalysis(lyrics: string, isFinalScore: boolean = false, battleId?: string): {
    totalRhymes: number;
    internalRhymes: number;
    perfectRhymes: number;
    slantRhymes: number;
    rhymeDensity: number;
    complexityScore: number;
    assonanceScore: number;
    consonanceScore: number;
    multiSyllabicScore: number;
    rhythmConsistency: number;
    advancedInternalRhymes: number;
    phoneticComplexity: number;
  } {
    // Check enhanced cache first
    const enhancedCacheKey = `enhanced_${lyrics.substring(0, 50)}_${battleId || 'default'}_${isFinalScore}`;
    if (!isFinalScore && this.enhancedCache.has(enhancedCacheKey)) {
      const cached = this.enhancedCache.get(enhancedCacheKey);
      console.log('📋 Using cached enhanced analysis for faster response');
      return cached;
    }

    // Enhanced analysis re-enabled for better scoring accuracy
    console.log(`🎯 Enhanced rhyme analysis ${isFinalScore ? 'FINAL SCORE' : 'enabled'} - full phonetic processing`);
    
    try {
      // Use advanced rhyme scheme analysis for enhanced scoring
      const rhymeScheme = this.analyzeRhymeScheme(lyrics, isFinalScore, battleId);
      const words = lyrics.toLowerCase().split(/\s+/).filter(w => w.length > 0);
      
      // ADVANCED METRIC CALCULATIONS
      const assonanceScore = this.calculateAssonance(lyrics);
      const consonanceScore = this.calculateConsonance(lyrics);
      const multiSyllabicScore = this.calculateMultiSyllabicComplexity(lyrics);
      const rhythmConsistency = this.calculateRhythmConsistency(lyrics);
      const advancedInternalRhymes = this.calculateAdvancedInternalRhymes(rhymeScheme);
      const phoneticComplexity = this.calculatePhoneticComplexity(lyrics);
      
      const result = {
        totalRhymes: rhymeScheme.perfectRhymes + rhymeScheme.slantRhymes,
        internalRhymes: Math.floor((rhymeScheme.perfectRhymes + rhymeScheme.slantRhymes) * 0.6),
        perfectRhymes: rhymeScheme.perfectRhymes,
        slantRhymes: rhymeScheme.slantRhymes,
        rhymeDensity: rhymeScheme.rhymeDensity,
        complexityScore: Math.min(100, words.length * 2 + rhymeScheme.perfectRhymes * 8 + rhymeScheme.slantRhymes * 5),
        assonanceScore,
        consonanceScore,
        multiSyllabicScore,
        rhythmConsistency,
        advancedInternalRhymes,
        phoneticComplexity
      };

      // Cache result (if not final score)
      if (!isFinalScore) {
        this.enhancedCache.set(enhancedCacheKey, result);
        // Clean old cache entries
        if (this.enhancedCache.size > 50) {
          const firstKey = this.enhancedCache.keys().next().value;
          if (firstKey) {
            this.enhancedCache.delete(firstKey);
          }
        }
      }
      
      return result;
    } catch (error) {
      console.warn('Enhanced analysis failed, falling back to simple analysis:', error);
      return this.getAdvancedSimpleRhymeAnalysis(lyrics);
    }
  }
  
  // ADVANCED PHONETIC ANALYSIS METHODS

  /**
   * Calculate assonance (vowel sound repetition) score
   */
  private calculateAssonance(lyrics: string): number {
    const words = this.tokenize(lyrics);
    const vowelPatterns = new Map<string, number>();
    let totalVowelSounds = 0;
    
    for (const word of words) {
      const pronunciations = this.cmuDict.get(word);
      if (pronunciations && pronunciations.length > 0) {
        const phonemes = pronunciations[0];
        const vowels = phonemes.filter(p => p.match(/[AEIOU]/));
        
        for (const vowel of vowels) {
          const baseVowel = vowel.replace(/[0-9]/g, ''); // Remove stress markers
          vowelPatterns.set(baseVowel, (vowelPatterns.get(baseVowel) || 0) + 1);
          totalVowelSounds++;
        }
      }
    }
    
    // Calculate assonance score based on repeated vowel patterns
    let assonanceScore = 0;
    vowelPatterns.forEach((count) => {
      if (count >= 2) {
        assonanceScore += Math.min(10, count * 2); // Max 10 points per vowel pattern
      }
    });
    
    return Math.min(100, assonanceScore);
  }

  /**
   * Calculate consonance (consonant sound repetition) score
   */
  private calculateConsonance(lyrics: string): number {
    const words = this.tokenize(lyrics);
    const consonantPatterns = new Map<string, number>();
    let totalConsonantSounds = 0;
    
    for (const word of words) {
      const pronunciations = this.cmuDict.get(word);
      if (pronunciations && pronunciations.length > 0) {
        const phonemes = pronunciations[0];
        const consonants = phonemes.filter(p => !p.match(/[AEIOU]/));
        
        for (const consonant of consonants) {
          consonantPatterns.set(consonant, (consonantPatterns.get(consonant) || 0) + 1);
          totalConsonantSounds++;
        }
      }
    }
    
    // Calculate consonance score based on repeated consonant patterns
    let consonanceScore = 0;
    consonantPatterns.forEach((count) => {
      if (count >= 2) {
        consonanceScore += Math.min(8, count * 1.5); // Max 8 points per consonant pattern
      }
    });
    
    return Math.min(100, consonanceScore);
  }

  /**
   * Calculate multi-syllabic rhyme complexity
   */
  private calculateMultiSyllabicComplexity(lyrics: string): number {
    const words = this.tokenize(lyrics);
    let complexityScore = 0;
    
    // Analyze word pairs for multi-syllabic rhyming
    for (let i = 0; i < words.length - 1; i++) {
      const word1 = words[i];
      const word2 = words[i + 1];
      
      const syllables1 = this.getWordSyllableCount(word1);
      const syllables2 = this.getWordSyllableCount(word2);
      
      // Multi-syllabic rhyme detection
      if (syllables1 >= 2 && syllables2 >= 2) {
        const rhymeStrength = this.calculateWordRhymeStrength(word1, word2);
        if (rhymeStrength > 0.6) {
          complexityScore += Math.min(15, syllables1 + syllables2) * rhymeStrength;
        }
      }
    }
    
    return Math.min(100, complexityScore);
  }

  /**
   * Calculate rhythm consistency using stress patterns
   */
  private calculateRhythmConsistency(lyrics: string): number {
    const lines = lyrics.split('\n').filter(line => line.trim());
    if (lines.length < 2) return 0;
    
    const stressPatterns: number[][] = [];
    
    for (const line of lines) {
      const words = this.tokenize(line);
      const lineStresses: number[] = [];
      
      for (const word of words) {
        const stresses = this.getWordStressPattern(word);
        lineStresses.push(...stresses);
      }
      
      stressPatterns.push(lineStresses);
    }
    
    // Calculate rhythm consistency
    let consistencyScore = 0;
    const avgLength = stressPatterns.reduce((sum, pattern) => sum + pattern.length, 0) / stressPatterns.length;
    
    for (let i = 0; i < stressPatterns.length - 1; i++) {
      const pattern1 = stressPatterns[i];
      const pattern2 = stressPatterns[i + 1];
      
      // Compare stress patterns
      const similarity = this.compareStressPatterns(pattern1, pattern2);
      consistencyScore += similarity * 10; // Max 10 points per line pair
    }
    
    // Bonus for consistent line lengths
    const lengthConsistency = 1 - (stressPatterns.reduce((variance, pattern) => {
      return variance + Math.abs(pattern.length - avgLength);
    }, 0) / (stressPatterns.length * avgLength));
    
    consistencyScore += lengthConsistency * 20;
    
    return Math.min(100, consistencyScore);
  }

  /**
   * Calculate advanced internal rhymes with positioning analysis
   */
  private calculateAdvancedInternalRhymes(rhymeScheme: RhymeSchemeResult): number {
    let internalRhymeScore = 0;
    
    // Analyze internal rhyme positioning and frequency
    rhymeScheme.lines.forEach(line => {
      const syllables = line.syllables;
      const internalFamilies = new Set<string>();
      
      // Check for internal rhymes within the line
      syllables.forEach((syllable, index) => {
        syllable.families.forEach(family => {
          if (internalFamilies.has(family)) {
            // Found internal rhyme - score based on position and complexity
            const positionBonus = this.calculateRhymePositionBonus(index, syllables.length);
            const complexityBonus = syllable.rhymePattern.length * 2;
            internalRhymeScore += 5 + positionBonus + complexityBonus;
          }
          internalFamilies.add(family);
        });
      });
    });
    
    return Math.min(100, internalRhymeScore);
  }

  /**
   * Calculate overall phonetic complexity score
   */
  private calculatePhoneticComplexity(lyrics: string): number {
    const words = this.tokenize(lyrics);
    let complexityScore = 0;
    
    for (const word of words) {
      const pronunciations = this.cmuDict.get(word);
      if (pronunciations && pronunciations.length > 0) {
        const phonemes = pronunciations[0];
        
        // Score based on phoneme diversity and rarity
        const uniquePhonemes = new Set(phonemes.map(p => p.replace(/[0-9]/g, '')));
        complexityScore += uniquePhonemes.size; // Unique phoneme count
        
        // Bonus for complex phoneme clusters
        const consonantClusters = this.countConsonantClusters(phonemes);
        complexityScore += consonantClusters * 3;
        
        // Bonus for stress variation
        const stressVariation = this.calculateStressVariation(phonemes);
        complexityScore += stressVariation * 2;
      }
    }
    
    return Math.min(100, complexityScore / Math.max(1, words.length / 2));
  }

  // HELPER METHODS FOR ADVANCED ANALYSIS

  private getWordSyllableCount(word: string): number {
    const pronunciations = this.cmuDict.get(word);
    if (pronunciations && pronunciations.length > 0) {
      return pronunciations[0].filter(p => p.match(/[0-9]$/)).length;
    }
    // Fallback heuristic
    return Math.max(1, (word.match(/[aeiouAEIOU]/g) || []).length);
  }

  private calculateWordRhymeStrength(word1: string, word2: string): number {
    const pron1 = this.cmuDict.get(word1);
    const pron2 = this.cmuDict.get(word2);
    
    if (!pron1 || !pron2) return 0;
    
    const phonemes1 = pron1[0];
    const phonemes2 = pron2[0];
    
    // Extract rhyming portions (from last stressed vowel to end)
    const rhyme1 = this.extractRhymePattern(phonemes1);
    const rhyme2 = this.extractRhymePattern(phonemes2);
    
    return this.phonemeMatch(rhyme1, rhyme2) ? 1.0 : 0.0;
  }

  private getWordStressPattern(word: string): number[] {
    const pronunciations = this.cmuDict.get(word);
    if (pronunciations && pronunciations.length > 0) {
      const phonemes = pronunciations[0];
      return phonemes
        .filter(p => p.match(/[0-9]$/))
        .map(p => parseInt(p.slice(-1)));
    }
    return [1]; // Default stress
  }

  private compareStressPatterns(pattern1: number[], pattern2: number[]): number {
    const minLength = Math.min(pattern1.length, pattern2.length);
    if (minLength === 0) return 0;
    
    let matches = 0;
    for (let i = 0; i < minLength; i++) {
      if (pattern1[i] === pattern2[i]) {
        matches++;
      }
    }
    
    return matches / minLength;
  }

  private calculateRhymePositionBonus(index: number, totalSyllables: number): number {
    const position = index / totalSyllables;
    // Bonus for mid-line rhymes (more impressive than end rhymes)
    if (position >= 0.3 && position <= 0.7) {
      return 5;
    }
    return 2;
  }

  private countConsonantClusters(phonemes: string[]): number {
    let clusters = 0;
    let consecutiveConsonants = 0;
    
    for (const phoneme of phonemes) {
      if (!phoneme.match(/[AEIOU]/)) {
        consecutiveConsonants++;
      } else {
        if (consecutiveConsonants >= 2) {
          clusters++;
        }
        consecutiveConsonants = 0;
      }
    }
    
    if (consecutiveConsonants >= 2) clusters++;
    return clusters;
  }

  private calculateStressVariation(phonemes: string[]): number {
    const stressValues = phonemes
      .filter(p => p.match(/[0-9]$/))
      .map(p => parseInt(p.slice(-1)));
    
    const uniqueStresses = new Set(stressValues);
    return uniqueStresses.size;
  }

  private getAdvancedSimpleRhymeAnalysis(lyrics: string): {
    totalRhymes: number;
    internalRhymes: number;
    perfectRhymes: number;
    slantRhymes: number;
    rhymeDensity: number;
    complexityScore: number;
    assonanceScore: number;
    consonanceScore: number;
    multiSyllabicScore: number;
    rhythmConsistency: number;
    advancedInternalRhymes: number;
    phoneticComplexity: number;
  } {
    if (!lyrics || lyrics.trim().length === 0) {
      return {
        totalRhymes: 0, internalRhymes: 0, perfectRhymes: 0, slantRhymes: 0,
        rhymeDensity: 0, complexityScore: 0, assonanceScore: 0, consonanceScore: 0,
        multiSyllabicScore: 0, rhythmConsistency: 0, advancedInternalRhymes: 0,
        phoneticComplexity: 0
      };
    }

    const words = lyrics.toLowerCase().split(/\s+/).filter(w => w.length > 0);
    const simpleRhymeCount = this.countSimpleRhymes(words);
    const estimatedComplexity = Math.min(100, words.length * 2 + simpleRhymeCount * 5);

    return {
      totalRhymes: simpleRhymeCount,
      internalRhymes: Math.floor(simpleRhymeCount * 0.6),
      perfectRhymes: Math.floor(simpleRhymeCount * 0.7),
      slantRhymes: Math.floor(simpleRhymeCount * 0.3),
      rhymeDensity: words.length > 0 ? simpleRhymeCount / words.length : 0,
      complexityScore: estimatedComplexity,
      assonanceScore: Math.min(50, words.length * 2), // Estimated
      consonanceScore: Math.min(40, words.length * 1.5), // Estimated  
      multiSyllabicScore: Math.min(30, simpleRhymeCount * 3), // Estimated
      rhythmConsistency: Math.min(60, words.length), // Estimated
      advancedInternalRhymes: Math.floor(simpleRhymeCount * 0.4), // Estimated
      phoneticComplexity: Math.min(70, words.length * 1.8) // Estimated
    };
  }

  private getSimpleRhymeAnalysis(lyrics: string): {
    totalRhymes: number;
    internalRhymes: number;
    perfectRhymes: number;
    slantRhymes: number;
    rhymeDensity: number;
    complexityScore: number;
  } {
    if (!lyrics || lyrics.trim().length === 0) {
      return {
        totalRhymes: 0,
        internalRhymes: 0,
        perfectRhymes: 0,
        slantRhymes: 0,
        rhymeDensity: 0,
        complexityScore: 0
      };
    }

    const words = lyrics.toLowerCase().split(/\s+/).filter(w => w.length > 0);
    const simpleRhymeCount = this.countSimpleRhymes(words);
    const estimatedComplexity = Math.min(100, words.length * 2 + simpleRhymeCount * 5);

    return {
      totalRhymes: simpleRhymeCount,
      internalRhymes: Math.floor(simpleRhymeCount * 0.6),
      perfectRhymes: Math.floor(simpleRhymeCount * 0.7),
      slantRhymes: Math.floor(simpleRhymeCount * 0.3),
      rhymeDensity: words.length > 0 ? simpleRhymeCount / words.length : 0,
      complexityScore: estimatedComplexity
    };
  }

  /**
   * FIXED: Simple rhyme counting without recursion
   */
  private countSimpleRhymes(words: string[]): number {
    const endings = new Map<string, number>();
    
    for (const word of words) {
      if (word.length < 2) continue;
      
      const ending = word.slice(-2); // Last 2 characters
      endings.set(ending, (endings.get(ending) || 0) + 1);
    }
    
    let rhymeCount = 0;
    for (const count of Array.from(endings.values())) {
      if (count > 1) {
        rhymeCount += count;
      }
    }
    
    return rhymeCount;
  }
}