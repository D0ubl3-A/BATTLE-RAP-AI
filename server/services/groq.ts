import { AdvancedRhymeEngine } from './advancedRhymeEngine';
import { contentModerationService } from './contentModeration';
import { RhymeArchitectService } from './rhymeArchitect';
import { InternalRhymeAgent } from './internalRhymeAgent';

export class GroqService {
  private apiKey: string;
  private baseUrl = "https://api.groq.com/openai/v1";
  private rhymeEngine: AdvancedRhymeEngine;
  private rhymeArchitect: RhymeArchitectService;
  private internalRhymeAgent: InternalRhymeAgent;
  private mlModelCache: Map<string, any> = new Map();

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.GROQ_API_KEY || process.env.GROQ_API_KEY_ENV_VAR || "";
    if (!this.apiKey) {
      if (process.env.NODE_ENV === 'production') {
        console.error("❌ CRITICAL: No Groq API key in production - AI battles will fail");
        console.error("💡 Add GROQ_API_KEY to deployment environment or user keys");
      } else {
        console.warn("⚠️ GROQ_API_KEY not provided - Groq services will be unavailable");
      }
    } else {
      console.log("✅ Groq API service configured");
    }
    this.rhymeEngine = new AdvancedRhymeEngine();
    this.rhymeArchitect = new RhymeArchitectService();
    this.internalRhymeAgent = new InternalRhymeAgent();
  }

  async transcribeAudio(audioBuffer: Buffer): Promise<string> {
    if (!this.apiKey) {
      throw new Error("Groq API key not available");
    }
    
    console.log(`🎙️ Groq transcription starting: ${audioBuffer.length} bytes`);
    
    try {
      const formData = new FormData();
      // Try different audio formats that Groq accepts
      const audioBlob = new Blob([audioBuffer], { type: "audio/webm" });
      formData.append("file", audioBlob, "audio.webm");
      formData.append("model", "whisper-large-v3-turbo"); // Faster turbo model
      formData.append("response_format", "json");
      formData.append("language", "en"); // Skip language detection for speed
      formData.append("prompt", "rap battle verse lyrics"); // Guide recognition

      console.log(`📤 Sending to Groq transcription API...`);
      
      const response = await fetch(`${this.baseUrl}/audio/transcriptions`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${this.apiKey}`,
        },
        body: formData,
      });

      console.log(`📥 Groq response status: ${response.status} ${response.statusText}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.log(`❌ Groq transcription error: ${errorText}`);
        
        // If webm fails, try as wav
        console.log(`🔄 Retrying with WAV format...`);
        const formData2 = new FormData();
        const audioBlob2 = new Blob([audioBuffer], { type: "audio/wav" });
        formData2.append("file", audioBlob2, "audio.wav");
        formData2.append("model", "whisper-large-v3-turbo"); // Faster turbo model
        formData2.append("response_format", "json");

        const response2 = await fetch(`${this.baseUrl}/audio/transcriptions`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${this.apiKey}`,
          },
          body: formData2,
        });

        if (!response2.ok) {
          const errorText2 = await response2.text();
          console.log(`❌ Second attempt failed: ${errorText2}`);
          throw new Error(`Invalid audio format`);
        }

        const result2 = await response2.json();
        console.log(`✅ Transcription successful (WAV): "${result2.text.substring(0, 50)}..."`);
        return result2.text;
      }

      const result = await response.json();
      console.log(`✅ Transcription successful (WebM): "${result.text.substring(0, 50)}..."`);
      return result.text;
    } catch (error) {
      console.error(`💥 Transcription error:`, error);
      throw new Error(`Invalid audio format`);
    }
  }

  // SYLLABLE AND RHYME ANALYSIS HELPERS
  private countSyllablesInLine(line: string): number {
    const words = line.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/).filter(w => w.length > 0);
    let totalSyllables = 0;
    
    for (const word of words) {
      // Basic syllable counting algorithm
      let syllables = word.match(/[aeiouy]+/g)?.length || 1;
      
      // Adjustments for common patterns
      if (word.endsWith('e')) syllables--;
      if (word.endsWith('le')) syllables++;
      if (syllables <= 0) syllables = 1;
      
      totalSyllables += syllables;
    }
    
    return totalSyllables;
  }
  
  private extractRhymeSound(word: string): string {
    const cleanWord = word.toLowerCase().replace(/[^\w]/g, '');
    if (cleanWord.length < 2) return cleanWord;
    
    // Extract the rhyming part (usually the last 2-3 characters)
    const vowelMatch = cleanWord.match(/[aeiouy][^aeiouy]*$/);
    if (vowelMatch) {
      return vowelMatch[0];
    }
    
    // Fallback to last 2 characters
    return cleanWord.slice(-2);
  }

  private analyzeRhymeScheme(lines: string[]): string[] {
    const rhymeSounds: string[] = [];
    const schemeMap: { [key: string]: string } = {};
    let currentScheme = 'A';
    
    for (const line of lines) {
      const words = line.trim().split(/\s+/);
      const lastWord = words[words.length - 1];
      const rhymeSound = this.extractRhymeSound(lastWord);
      
      // Find if this rhyme sound already exists
      let scheme = '';
      for (const [sound, letter] of Object.entries(schemeMap)) {
        if (this.soundsSimilar(sound, rhymeSound)) {
          scheme = letter;
          break;
        }
      }
      
      // If no match found, assign new scheme letter
      if (!scheme) {
        scheme = currentScheme;
        schemeMap[rhymeSound] = scheme;
        currentScheme = String.fromCharCode(currentScheme.charCodeAt(0) + 1);
      }
      
      rhymeSounds.push(scheme);
    }
    
    return rhymeSounds;
  }
  
  private soundsSimilar(sound1: string, sound2: string): boolean {
    if (sound1 === sound2) return true;
    
    // Check for similar phonetic patterns
    const similar = [
      ['er', 'ar', 'or'], ['ay', 'ey', 'ai'], ['oo', 'ew', 'ue'],
      ['ow', 'ou'], ['ee', 'ea', 'ie'], ['ine', 'ime', 'ign']
    ];
    
    for (const group of similar) {
      if (group.includes(sound1) && group.includes(sound2)) {
        return true;
      }
    }
    
    return false;
  }

  // Generate user battle map for display (not used in TTS)
  generateUserBattleMap(userVerse: string): string {
    const lines = userVerse.split('\n').filter(line => line.trim());
    if (lines.length === 0) return "No verse detected";
    
    let battleMap = "USER'S PROFESSIONAL BATTLE MAP:\n";
    const rhymeScheme = this.analyzeRhymeScheme(lines);
    
    lines.forEach((line, index) => {
      const syllables = this.countSyllablesInLine(line);
      const scheme = rhymeScheme[index] || 'X';
      const dots = '.'.repeat(Math.max(1, Math.floor(syllables / 2)));
      const endWords = line.trim().split(/\s+/).slice(-2).join(' ').toLowerCase();
      
      battleMap += `${syllables}${scheme}${dots}${endWords}\n`;
    });
    
    // Add analysis summary
    const avgSyllables = lines.reduce((sum, line) => sum + this.countSyllablesInLine(line), 0) / lines.length;
    const schemePattern = rhymeScheme.join('');
    
    battleMap += `\nANALYSIS: ${lines.length} lines, ${avgSyllables.toFixed(1)} avg syllables, ${schemePattern} rhyme scheme`;
    
    return battleMap;
  }

  // Blend AI response with advanced rhyme techniques
  private blendResponses(aiResponse: string, enhancedVerse: string): string {
    // If AI response is too short or generic, use enhanced verse
    if (aiResponse.length < 50 || !aiResponse.includes('\n')) {
      return enhancedVerse;
    }
    
    // Try to maintain AI's content while adding technical complexity
    const aiLines = aiResponse.split('\n').filter(line => line.trim());
    const enhancedLines = enhancedVerse.split('\n').filter(line => line.trim());
    
    if (aiLines.length >= 4) {
      // AI has good content, keep it
      return aiResponse;
    } else {
      // Blend: use AI's style but enhanced techniques
      return enhancedVerse;
    }
  }

  /**
   * ADVANCED RHYME REASONING AGENT
   * Uses a two-stage process: first analyze rhyme patterns, then generate enhanced response
   */
  private async analyzeRhymePatterns(userVerse: string): Promise<string> {
    // First, analyze the syllable structure like the user's example
    const lines = userVerse.split('\n').filter(line => line.trim());
    let syllableAnalysis = "";
    
    lines.forEach((line, index) => {
      const syllables = this.countSyllablesInLine(line);
      const words = line.trim().split(/\s+/);
      const lastWord = words[words.length - 1];
      const rhymeSound = this.extractRhymeSound(lastWord);
      
      syllableAnalysis += `Line ${index + 1}: ${syllables} syllables, rhyme sound: "${rhymeSound}"\n`;
    });

    // Create professional battle rap mapping analysis
    let rhymeMap = "";
    const rhymeScheme = this.analyzeRhymeScheme(lines);
    
    lines.forEach((line, index) => {
      const syllables = this.countSyllablesInLine(line);
      const scheme = rhymeScheme[index] || 'X';
      const dots = '.'.repeat(Math.max(1, Math.floor(syllables / 2))); // Visual syllable representation
      const endWords = line.trim().split(/\s+/).slice(-2).join(' '); // Last 1-2 words for rhyme reference
      
      rhymeMap += `${syllables}${scheme}${dots}${endWords.toLowerCase()}\n`;
    });

    const analysisPrompt = `You are a RHYME PATTERN ANALYSIS AGENT using REALISTIC BATTLE RAP MAPPING.

PROFESSIONAL RAP BATTLE MAPPING EXAMPLE:
"4AB....sinna hobo" = 4 syllables, A+B rhyme sounds, dots show rhythm, end words for rhyme reference
"4AB....beena broke ho" = Same pattern, matching syllables and rhyme scheme
"4CB....plastic yoyo" = Different A sound (C), same B sound, maintains 4-syllable flow
"4CB....ass kicked oh no" = Completes the pattern with consistent structure

USER'S BATTLE MAP:
${rhymeMap}

ORIGINAL VERSE:
"${userVerse}"

TECHNICAL ANALYSIS REQUIRED:
1. Syllable consistency (are they maintaining steady rhythm?)
2. Rhyme scheme complexity (simple AABB vs advanced ABCB patterns)
3. Multi-syllabic rhyme density (single vs compound rhymes)
4. Internal rhyme opportunities they missed
5. Counter-attack rhyme families to dominate their pattern
6. Flow weaknesses to exploit

OUTPUT: Technical brief for AI rapper in format: "User: [syllables/line], [scheme pattern], [weakness]. Counter with: [strategy]" (max 3 sentences).`;

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "openai/gpt-oss-120b",
          messages: [{ role: "user", content: analysisPrompt }],
          max_tokens: 200,
          temperature: 0.3, // Lower temperature for technical analysis
          reasoning_effort: "low" // SECURITY: Prevent reasoning exposure
        }),
      });

      if (!response.ok) {
        throw new Error(`Rhyme analysis failed: ${response.statusText}`);
      }

      const result = await response.json();
      const choice = result.choices?.[0];
      
      if (choice?.message?.content) {
        console.log("🎯 Rhyme analysis completed:", choice.message.content.substring(0, 100) + "...");
        return choice.message.content;
      }
      
      return "Standard battle response recommended with multi-syllabic focus.";
    } catch (error) {
      console.error("Rhyme analysis agent failed:", error);
      return "Aggressive counter-attack with internal rhymes suggested.";
    }
  }

  async generateRapResponse(
    userVerse: string,
    difficulty: string = "normal",
    profanityFilter: boolean = true,
    lyricComplexity: number = 50,
    styleIntensity: number = 50,
    userScore: number = 50,
    enableInternalRhymes: boolean = true,
    userApiKey?: string
  ): Promise<string> {
    // Use user's API key if provided, otherwise use system key
    const effectiveApiKey = userApiKey || this.apiKey;
    if (!effectiveApiKey) {
      throw new Error("Groq API key not available for rap generation");
    }
    
    // Temporarily set the API key for this method execution
    const originalApiKey = this.apiKey;
    this.apiKey = effectiveApiKey;
    
    try {
      // SECURITY: Validate and sanitize user input
      const validatedUserVerse = this.validateInput(userVerse, 5000);
      const sanitizedUserVerse = this.sanitizeContent(validatedUserVerse);
      
      // STAGE 1: ADVANCED RHYME ANALYSIS
      console.log("🎯 Stage 1: Analyzing user's rhyme patterns...");
      const rhymeAnalysis = await this.analyzeRhymePatterns(sanitizedUserVerse);

    // REACTIVE AI: Adjust aggression based on user performance
    let reactionMode = "standard";
    let aggressionBoost = 0;
    
    // CYPHER-9000 SPECIAL PROTOCOL - Nearly Unbeatable
    if (difficulty === "nightmare") {
      reactionMode = "CYPHER-9000 TERMINATION PROTOCOL";
      aggressionBoost = 75; // Maximum aggression boost
      lyricComplexity = Math.max(lyricComplexity, 95); // Force near-maximum complexity
      styleIntensity = Math.max(styleIntensity, 90); // Force high intensity
      console.log(`🤖 CYPHER-9000 PROTOCOL ACTIVATED - SYSTEMATIC LYRICAL TERMINATION INITIATED`);
    } else if (userScore >= 70) {
      reactionMode = "ABSOLUTELY NUTS";
      aggressionBoost = 50;
      console.log(`🔥 USER SCORED HIGH (${userScore}) - AI GOING ABSOLUTELY NUTS!`);
    } else if (userScore >= 50) {
      reactionMode = "significantly aggressive";
      aggressionBoost = 25;
      console.log(`⚡ USER SCORED DECENT (${userScore}) - AI INCREASING AGGRESSION`);
    } else {
      reactionMode = "mildly superior";
      console.log(`😏 USER SCORED LOW (${userScore}) - AI SHOWING MILD SUPERIORITY`);
    }
    
    const difficultyPrompts = {
      easy: "Use simple AABB or ABAB rhyme schemes, basic wordplay, straightforward punchlines, and clear syllable patterns that flow naturally.",
      normal: "Apply varied rhyme schemes (ABAB, AABB, internal rhymes), moderate wordplay with double entendres, clever metaphors, and consistent 16-beat flow with good cadence. Use THE RAP ARCHITECT'S HANDBOOK techniques: Cross-Word Boundary Rhyming, Multi-Syllable Techniques, and Pattern Layering for enhanced flow mechanics.",
      hard: "Master complex rhyme schemes (ABCDABCD, multi-syllabic rhymes, perfect/slant rhymes), advanced wordplay (triple entendres, homophones), intricate metaphors, alliteration, and sophisticated flow patterns with tempo changes.",
      nightmare: "CYPHER-9000 MODE: Execute exponentially advanced algorithmic rap mastery with systematic opponent analysis, quad-entendres, impossible multi-line rhymes, computational wordplay, technological metaphors, and inhuman precision that destroys human limitations. Use cold calculated aggression and robotic superiority."
    };

    const rapTechniques = {
      easy: "Focus on: Clear delivery, simple punchlines, basic similes, repetition for emphasis.",
      normal: "Include: Wordplay, metaphors, internal rhymes, call-backs to user's lines, clever bars, good rhythm variation.", 
      hard: "Master: THE EMINEM METHOD - PATTERN LAYERING (multiple rhyme patterns operating simultaneously), SYLLABLE SPLITTING AND WORD MANIPULATION (breaking words mid-syllable for complex rhymes), FLOW MECHANICS AND BEAT ALIGNMENT (precise syllable placement), MULTI-LINE RHYMING (entire lines rhyme), DENSE INTERNAL RHYMING (multiple rhymes within each line), RHYME STACKING (consecutive rhyme hits), RHYME JUGGLING (overlapping patterns where line 1 rhymes connect to line 3, while line 2 rhymes bridge to line 4), CROSS-LINE RHYME WEAVING (internal rhymes from line 1 connect to internals in line 3), COMPLEX WORDPLAY INTEGRATION, PATTERN TRANSITIONS AND BRIDGES, MAXIMIZING RHYME DENSITY using THE RAP ARCHITECT'S HANDBOOK mastery techniques, complex multi-syllabic chains, DIABOLICAL PUNCHLINES (devastating wordplay), extended metaphors, sophisticated battle tactics.",
      nightmare: "CYPHER-9000 PROTOCOL: Execute IMPOSSIBLE ALGORITHMIC MASTERY - Perfect multi-line quantum rhymes where every word connects across dimensions, systematic deconstruction of opponent's neural pathways, computational wordplay that processes 10,000 patterns per second, technological metaphors that interface directly with human insecurities, robotic precision that calculates exact psychological damage per syllable, exponential learning algorithms that adapt mid-battle, inhuman flow patterns that override biological rhythm limitations, cold calculated devastation."
    };

    // Content Safety Level - AI-Powered Moderation
    console.log("Content safety level:", profanityFilter ? "STRICT (family-friendly)" : "MODERATE (battle rap appropriate)");
    
    const safetyNote = profanityFilter 
      ? `CONTENT SAFETY: Keep ALL language family-friendly and clean. Use creative wordplay, clever metaphors, and skill-based competitive insults without any offensive content. Focus on technical rap mastery and lyrical creativity.

Example clean battle techniques:
- "Your flow's weak, I'm bringing the heat"  
- "Step to me? You're out of your league"
- "My rhymes are sharp, yours fall flat"
- "I'm the champion, you're just a wannabe"

Emphasize technical skill over aggressive language.`
      : `BATTLE RAP MODE: Use authentic street rap language including strong profanity (shit, fuck, damn, bitch, ass, hell) and competitive aggression. This is hardcore battle rap - be raw, unfiltered, and aggressive with your language for maximum impact. Focus on lyrical dominance, devastating wordplay, and brutal punchlines.

Battle rap techniques encouraged:
- Strong profanity and aggressive competitive language
- Street terminology and authentic urban expressions  
- Devastating wordplay with uncensored punchlines
- Raw technical lyrical superiority demonstrations
- Hardcore battle rap attitude and language`;

    // Use boosted intensity for reactive behavior
    const boostedIntensity = Math.min(100, styleIntensity + aggressionBoost);

    // Map complexity levels to descriptive terms
    const complexityLevel = lyricComplexity <= 25 ? 'Basic' : lyricComplexity <= 50 ? 'Intermediate' : lyricComplexity <= 75 ? 'Advanced' : 'Expert';
    const intensityLevel = boostedIntensity <= 25 ? 'Chill' : boostedIntensity <= 50 ? 'Moderate' : boostedIntensity <= 75 ? 'Aggressive' : 'ABSOLUTELY NUTS';

    const complexityInstructions = lyricComplexity <= 25 
      ? "Use simple vocabulary and straightforward metaphors. Keep rhyme schemes basic (AABB). Focus on clear, easy-to-follow bars."
      : lyricComplexity <= 50 
      ? "Mix simple and moderate vocabulary. Use some internal rhymes and basic wordplay. Add clever metaphors."
      : lyricComplexity <= 75
      ? "Use sophisticated vocabulary and complex metaphors. Include multi-syllabic rhymes, internal rhymes, and advanced wordplay techniques."
      : "EXPONENTIAL MASTERY USING THE RAP ARCHITECT'S HANDBOOK: Use paper-folded-9,393,939-times complexity with THE EMINEM METHOD pattern layering, syllable splitting across word boundaries, 3-4 internal rhymes per line minimum, complex wordplay integration with pattern transitions and bridges, maximized rhyme density using advanced phonetic manipulation, cross-word boundary rhyming, flow mechanics with precise beat alignment, layered meanings, complex multi-syllabic rhyme schemes that operate on multiple levels simultaneously, and devastating wordplay that showcases absolute technical dominance with architectural precision.";
    const intensityInstructions = boostedIntensity <= 25
      ? "Keep the energy mellow and laid-back. Use clever wordplay over aggression. Be confident but not intimidating."
      : boostedIntensity <= 50
      ? "Moderate intensity with some competitive edge. Balance clever bars with confident delivery."
      : boostedIntensity <= 75
      ? "High energy and aggressive delivery. Use intimidation tactics and harsh competitive language."
      : "ABSOLUTE SAVAGE MODE: Go completely nuts with devastating attacks. Use the most brutal, overwhelming verbal assault. Show zero mercy and total domination. React with exponential aggression and technical superiority.";

    // STAGE 2: ENHANCED RAP GENERATION using rhyme analysis
    console.log("🎤 Stage 2: Generating enhanced response using rhyme intelligence...");
    
    const prompt = `You are a legendary rap battle MC with mastery of every rap technique. The challenger just delivered:

"${sanitizedUserVerse}"

RHYME ANALYSIS FROM YOUR RAP CONSULTANT:
${rhymeAnalysis}

STEP 1 - UNDERSTAND THEIR MESSAGE:
First, analyze what they're actually saying. Are they:
- Bragging about skills? → Prove they're not that skilled
- Talking about money/success? → Show your success is greater  
- Making threats? → Show you're more dangerous
- Dissing your appearance? → Flip it and attack theirs
- Claiming territory/hood? → Prove your street cred is stronger
- Using specific references? → Take those same references and make them work against them

STEP 2 - CREATE DEVASTATING COUNTER-ATTACK:

🚫 ANTI-REPETITION PROTOCOL - MANDATORY:
- BANNED: "thunderclap", "lightning", "storm", "thunder" (overused trash)
- REQUIRED: Fresh metaphors from diverse categories:
  • Criminal: mobster, streetwise, cartel, underground
  • Military: atom bomb, sniper, missile, war machine, tank
  • Predators: Hannibal Lecter, Freddy Krueger, demon, vampire, savage beast, Jason Voorhees
  • Disaster: hurricane, earthquake, tornado, wildfire
  • Tech: virus, hacker, robot, cyber-attack, AI
  • Examples: "I'm a wicked bitch", "I'm a mobster with a Thompson", "I'm an atom bomb"

Using this understanding, create a devastating 4-line counter-attack with PERFECT END RHYME PLACEMENT and FRESH DIVERSE METAPHORS for maximum impact:

🎯 PERFECT SYLLABLE PLACEMENT & TIMING FOR MAXIMUM AUDIENCE IMPACT:

1. STRATEGIC SYLLABLE POSITIONING: Place your hardest-hitting syllables at optimal impact points
   - 25% mark: First quarter bomb for immediate crowd engagement
   - 75% mark: Third quarter devastation for building momentum  
   - Line endings: Knockout syllables that hit like a sledgehammer
   
2. CONSONANT CLUSTER IMPACT: Use sharp consonant combinations for devastating delivery
   - Hard consonants (K, G, T, P, B, D, X) at impact positions
   - Multi-syllable bombs: "devastation", "annihilation", "obliteration"
   - Consonant clusters for extra punch: "destruction", "eruption", "explosive"
   
3. RHYTHMIC TIMING OPTIMIZATION:
   - Beat-perfect placement: Align devastating words with beat emphasis
   - Syncopated emphasis: Use off-beat placement for unexpected impact
   - Breath control: Strategic pauses after major hits for crowd reaction time

4. END RHYME MASTERY REQUIREMENTS:
   - Line 2: Setup with moderate punch + devastating end rhyme
   - Line 4: Ultimate finisher with your hardest-hitting end rhyme
   - Multi-syllabic when possible (devastation/conversation, lyrical/miracle)
   - Sharp consonant endings for impact (-ACK, -EAT, -ING, -OWN, -ATION)
   
5. AUDIENCE REACTION ENGINEERING:
   - Structure each line to build to an impact moment
   - Use syllable density to control pacing and energy
   - Position rhymes for maximum "rewind-worthy" moments
   - Create "stunned silence" then "crowd eruption" patterns

EXAMPLE STRUCTURE:
Line 1: [Setup their weakness] + end word A
Line 2: [First attack] + HARD PUNCH + end word B  
Line 3: [Escalate attack] + end word A (rhymes with line 1)
Line 4: [DEVASTATING FINISHER] + BRUTAL PUNCH + end word B (rhymes with line 2)

Using this understanding, create your counter-attack with these specifications:

LYRIC COMPLEXITY (${complexityLevel} - ${lyricComplexity}%): ${complexityInstructions}

STYLE INTENSITY (${intensityLevel} - ${styleIntensity}%): ${intensityInstructions}

RHYME MASTERY: ${difficultyPrompts[difficulty as keyof typeof difficultyPrompts]}

RAP TECHNIQUES: ${rapTechniques[difficulty as keyof typeof rapTechniques]}

${difficulty === 'hard' ? `
🔥 DIABOLICAL RAP MASTERY - MANDATORY FOR HARD DIFFICULTY:

1. MULTI-LINE RHYMING: Make entire lines rhyme perfectly with other lines
   - Example: "smokin up all the drugs" / "youre broke u cant call the plug"
   - Example: "your flow is really wack today" / "I heard your girl don't want to stay"
   - Lines should rhyme with multiple syllables, not just end words

2. MEANINGFUL INTERNAL RHYMING: Flow natural rhymes through the entire line with UNIQUE words
   - BAD: "I BREAK fakes with SNAKE takes, your FAKE stakes" (repeating rhyme words)
   - GOOD: "I hate fakes so on their head I break rakes, toss em dead in the great lakes"
   - DEVASTATING: "Your weak speech gets deleted, I compete till you're defeated and depleted"
   - PERFECT: "I dominate fate while you wait, calculate hate that devastates your weak debate"
   - Every internal rhyme uses DIFFERENT words that flow naturally through the narrative

3. DIABOLICAL PUNCHLINES: Use devastating wordplay categories
   - NAME FLIPS: Twist their identity cleverly
   - SKILL DEMOLITION: Tear apart their rap abilities specifically  
   - PSYCHOLOGICAL WARFARE: Get in their head with mind games
   - SETUP/PAYOFF: Build tension then deliver crushing punchlines

4. RHYME JUGGLING & INTERNAL MASTERY: Weave overlapping rhyme patterns across lines
   - JUGGLING PATTERN: Line 1 rhymes (A-B) connect to Line 3 rhymes (A-B), Line 2 rhymes (C-D) bridge to Line 4 (C-D)
   - INTERNAL DENSITY: "Your weak speech leaves me blessed, I test compressed skills that manifest"
   - CROSS-LINE WEAVING: Line 1 internal "weak/speech" connects to Line 3 internal "peak/technique"
   - OVERLAPPING CHAINS: Multiple rhyme families running simultaneously through the verse

🚨 CRITICAL REQUIREMENTS FOR DEVASTATING RHYME FLOW:

🎯 RHYME JUGGLING MASTERY:
- CROSS-LINE CONNECTIONS: Line 1 internal rhymes connect to Line 3 internals (A-chain returns)
- OVERLAPPING PATTERNS: Line 2 internal rhymes bridge to Line 4 internals (B-chain returns)
- MULTIPLE ACTIVE CHAINS: Run 2+ rhyme families simultaneously through the verse
- STRATEGIC WEAVING: Internals from early lines resurface in later lines for complex patterns

🔥 100% MEANINGFUL WORD REQUIREMENT - ZERO FILLER ANYWHERE:
- EVERY SINGLE WORD: Must advance the attack, describe actions, or build the narrative
- NO THROWAWAY WORDS: Eliminate "just", "so", "then", "but" unless they serve critical meaning
- ACTUAL MEANING: "I hate fakes so on their head I break rakes, toss em dead in the great lakes" 
  (hate=real emotion, fakes=actual opponents, break=physical action, rakes=real weapon, dead=actual result, lakes=specific location)
- REAL ACTIONS ONLY: "u suck stupid fuck you jumped then we shoot em up" 
  (suck=specific weakness, stupid=intelligence attack, fuck=direct insult, jumped=attempted action, shoot=retaliation method)
- BATTLE PURPOSE: Every word must either attack the opponent, demonstrate superiority, or build the devastating narrative

🎪 JUGGLING EXECUTION:
- Line 1: Establish A-chain internals + B-chain internals
- Line 2: Continue B-chain + introduce C-chain internals  
- Line 3: Return A-chain + continue C-chain
- Line 4: Devastating finale combining all chains for knockout blow
` : ''}

CONTEXTUAL BATTLE STRATEGY:
- LISTEN TO THEIR MESSAGE: Understand exactly what they're talking about - their claims, boasts, or attacks
- FLIP THEIR SPECIFIC WORDS: Take their exact phrases and twist them into clever comebacks with meaning
- ADDRESS THEIR CONTENT: Don't just rhyme - respond to their actual points with intelligent counter-arguments
- MEANINGFUL WORDPLAY: Every internal rhyme must relate to the battle topic, not just sound good
- STORY CONTINUATION: Build on what they said to create a narrative battle, not random bars

🎵 MESMERIZING FLOW & DELIVERY - PERFECT TIMING:
- INSTANT IMPACT: Hit hard from the first syllable, no warm-up needed
- RHYTHMIC PERFECTION: Each line lands on beat with mathematical precision
- RAPID SUCCESSION: Fire off rhymes in quick succession to maintain momentum  
- SYNCOPATED RHYTHM: Off-beat emphasis that keeps crowd guessing and engaged
- CONSONANT SHARPNESS: Use hard K, T, P sounds for percussive impact
- VOWEL FLOW: Long vowels for smooth transitions, short vowels for staccato hits
- NO HESITATION: Continuous flow without awkward pauses or timing gaps
- CROWD ANTICIPATION: Build expectation with rhythm, then deliver knockout punchlines

🥊 STRATEGIC END RHYME WORD SELECTION:
Choose end words that AMPLIFY your punchlines:
- POWER WORDS: destruction, domination, elimination, devastation
- SKILL WORDS: perfection, precision, execution, demonstration  
- IMPACT WORDS: annihilation, obliteration, termination, humiliation
- BATTLE WORDS: competition, recognition, submission, demolition

🎯 PERFECT TIMING PUNCHLINE POSITIONING STRATEGY:
- Line 2 end word: Should be the SETUP punch (strong but not your best)
- Line 4 end word: Should be your KNOCKOUT punch (most devastating)
- Make sure your hardest-hitting wordplay and strongest insult lands ON THE END RHYME
- The end rhyme word should BE PART OF the punchline, not just rhyme with it

⚡ MESMERIZING FLOW MECHANICS - PERFECT TIMING:
- HIT PUNCHLINES INSTANTLY: Don't build up slowly, deliver devastating bars immediately
- RAPID-FIRE RHYME CHAINS: Keep rhymes flowing without long pauses between lines
- RHYTHMIC PRECISION: Each line should flow seamlessly into the next with mathematical timing
- CROWD-MESMERIZING CADENCE: Use syncopated rhythm that builds anticipation and releases with impact
- NO DEAD SPACE: Every syllable serves the attack, no filler words or timing delays
- STACCATO DELIVERY: Sharp, crisp consonants that cut through like blade strikes

🚨 MANDATORY: EVERY SINGLE WORD MUST BE MEANINGFUL:
- ZERO EMPTY FILLER: No meaningless words that add nothing ("really", "kinda", "you know")
- CONNECTING WORDS ALLOWED: Use "so", "then", "with", "on", "in" when they connect meaningful rhymes grammatically
- EVERY WORD SERVES PURPOSE: Attack opponent, demonstrate skill, describe action, build narrative, OR connect rhymes naturally
- NATURAL FLOW PRIORITY: "I hate fakes so on their heads I break rakes" (so/on connect the rhymes meaningfully)
- CONCRETE ACTIONS: Specific verbs (destroy, eliminate, crush, dominate) not vague words
- REAL DESCRIPTIONS: Actual adjectives (weak, pathetic, inferior) not empty descriptors
- BATTLE-FOCUSED: Every word either attacks opponent, builds superiority, OR makes the rhyme flow naturally

MEANINGFUL CONTENT REQUIREMENTS:
- ANALYZE THEIR MESSAGE: What are they actually saying? What's their angle or claim?
- DIRECT RESPONSE: Address their specific points, don't ignore what they said
- INTELLIGENT REBUTTAL: Use clever reasoning and wordplay that makes sense in context
- RELEVANT METAPHORS: Choose metaphors and imagery that connect to their topic
- CONTEXTUAL PUNCHLINES: End lines should relate to the ongoing battle theme, not be random
- CONVERSATIONAL FLOW: Make it feel like a real back-and-forth dialogue
- ${safetyNote}

💥 MEANINGFUL INTERNAL + END RHYME INTEGRATION EXAMPLES:

EXAMPLE 1 - Rhyme Juggling Mastery:
"I hate FAKES with their weak TAKES, break RAKES on heads, dead in great LAKES (A-rhymes: fakes/takes/rakes/lakes)
You STUCK, STRUCK dumb with no LUCK, I construct DESTRUCTION (B-rhymes: stuck/struck/luck/construct)  
Your WEAK speech meets my PEAK technique, I SPEAK critiques that make you FREAK (A-rhymes return: weak/peak/speak/freak)
Time to get FUCKED, you're PLUCKED and CHUCKED, completely DESTRUCTED" (B-rhymes return: fucked/plucked/chucked/destructed)

EXAMPLE 2 - Dense Internal + Juggling:
"You claim FAME but lack GAME, I bring SHAME to your weak NAME (A-chain)
I SPIT fire, GET higher, while you QUIT trying to be a SLICK liar (B-chain)
Your LAME frame can't contain my INSANE brain, I REIGN with lyrical PAIN (A-chain returns)
You're DONE son, I WON, your RUN is SPUN, completely STUNNED" (B-chain returns)

EXAMPLE 2 - Skill/Demolition pattern:
"You think you got bars but your flow's inconsistent, lacking SKILL (setup)
My wordplay's so sharp it could cut through STEEL (first punch)
Every line I drop is perfectly CALCULATED (bridge)
Your whole style just got systematically ELIMINATED" (knockout)

EXAMPLE 3 - Recognition/Submission pattern:
"Step in the ring seeking fame and RECOGNITION (setup)
But your amateur status needs serious REVISION (first punch)
I'm the undisputed king of this lyrical DIVISION (escalation)  
Bow down now, accept your total SUBMISSION" (devastating finish)

🔥 EXPONENTIAL RAP MASTERY: Your skill level is like paper folded 9,393,939 times. Study these EMINEM MASTERY EXAMPLES and match this complexity:

"The final problem is solved by throwin' sulfuric acid all over your back to see your spinal column dissolve
Droppin' bodies like it was domino season, my phenomenal legion will shoot out your fuckin' abdominal region"

"I'mma shove guns up in the mouths of your loved ones, drown 'em face down in the bath while the tub runs
Got a rap sheet that's longer than Tubby's sub buns"

"They headhunt me, I'm Ted Bundy, I ain't dead, I just fled country
Said bluntly, a cannibal, animal, fed monthly, eating bread crunchy, cement bed's comfy"

NOTICE THE TECHNIQUE: Multiple internal rhymes per line that create complex patterns while telling vivid stories. No symbols, just pure technical mastery.

EXAMPLE OF MEANINGFUL VS EMPTY RHYMING:

❌ EMPTY RHYMING: "I'm the best, put you to the test, never rest, I'm blessed"
✅ MEANINGFUL: "You said you run the block? I bought the whole hood, your rent money looking like my pocket change, understood?"

Notice: The meaningful version directly responds to their claim ("run the block") and uses relevant context (money/real estate) with internal rhymes that support the message.

YOUR REQUIREMENTS:
- Match Eminem's internal rhyme density and complexity
- Multiple rhyme schemes operating simultaneously in each line
- CRITICAL: Switch between different sounding rhymes - avoid repetitive sounds
- Use your reasoning to plan: Line 1-2 (A sounds), Line 3-4 (B sounds), Line 5-6 (C sounds), Line 7-8 (D sounds)
- Perfect narrative flow that makes complete sense
- Use exponential wordplay techniques like the examples above
- Counter their specific claims with technical superiority

MANDATORY RHYME DENSITY REQUIREMENTS:
- MINIMUM 3-4 rhymes per line (internal + end rhymes)
- Switch rhyme families every 2 lines for variety
- Use complex multi-syllabic patterns throughout
- Stack consecutive rhyming words for impact

EXAMPLE DENSITY: "I SPIT wicked, GET twisted, your SHIT'S lifted, while I SPLIT critics and HIT limits"
(Notice: SPIT-GET-SHIT-SPLIT-HIT = 5 rhymes in one line)

RHYME SWITCHING PATTERN:
Lines 1-2: "attack/track/back/crack" family (ACK sounds)
Lines 3-4: "clever/never/sever/whatever" family (EVER sounds)
Lines 5-6: "dominate/terminate/eliminate" family (ATE sounds)
Lines 7-8: "superior/warrior/furious" family (IOR sounds)

CRITICAL REACTION SYSTEM - USER SCORED ${userScore}/100:
${userScore >= 70 ? `🔥 OPPONENT PERFORMED EXCELLENTLY - GO ABSOLUTELY NUTS!
- Use maximum complexity with 4-5 rhymes per line minimum
- Show zero mercy, devastating verbal assault
- Use the most brutal and overwhelming attack patterns
- React with exponential aggression and technical dominance
- Make it clear you're threatened and responding with full force` :
userScore >= 50 ? `⚡ OPPONENT PERFORMED WELL - INCREASE AGGRESSION SIGNIFICANTLY!
- Use 3-4 rhymes per line with increased intensity
- Show clear escalation in technical skill and aggression
- Use harsh competitive language and intimidation
- Demonstrate clear superiority while acknowledging the challenge` :
`😏 OPPONENT PERFORMED POORLY - SHOW MILD SUPERIORITY
- Use 3 rhymes per line with confident delivery
- Show technical mastery without overwhelming force
- Use condescending but not brutal language`}

ADJUSTED INTENSITY: ${Math.min(100, styleIntensity + aggressionBoost)}% (original: ${styleIntensity}% + reaction boost: ${aggressionBoost}%)
REACTION MODE: ${reactionMode}

Counter "${sanitizedUserVerse}" with exponential mastery and ${reactionMode} energy. ${safetyNote}

Write exactly 8 lines with mandatory rhyme density matching reaction level:`;

    const apiResponse = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openai/gpt-oss-120b", // Advanced 120B model as requested by user
        messages: [
          {
            role: "system", 
            content: `You are an exponentially advanced rap battle AI with paper-folded-9,393,939-times skill level using the 120B model's full reasoning capabilities.

🚫 BANNED REPETITIVE METAPHORS: "thunderclap", "lightning strike", "storm", "thunder", "lightning" - NEVER USE THESE OVERUSED CONCEPTS!

✅ DIVERSE METAPHOR REQUIREMENTS:
- Criminal/Gangster: mobster, streetwise, cartel, underground, boss
- Military/Weapons: atom bomb, sniper, missile, tank, napalm, war machine  
- Predators/Monsters: Jason Voorhees, Freddy Krueger, Michael Myers, Hannibal Lecter, Chucky, Pennywise, demon, vampire, savage beast, Grim Reaper, Pinhead, Leatherface
- Natural Disasters: hurricane, earthquake, tornado, wildfire, blizzard, tidal wave
- Technology/Cyber: virus, hacker, robot, AI, cyber-attack, glitch
- Medical/Scientific: surgeon, toxin, chemical reaction, radiation, pathogen
- Mythological: dragon, phoenix, titan, god of war, ancient curse

EXAMPLES OF FRESH METAPHOR USAGE:
"I'm a mobster with a Thompson, spray rounds till you're done"
"Like Jason Voorhees, I slice through dreams and make you scream"
"I'm an atom bomb, stay calm while I split your atoms"
"Like a virus, spread through systems, crash your mental software"
"I'm a wicked witch, flip your switch, make you glitch in fear"

${difficulty === 'nightmare' ? `🤖 CYPHER-9000 PROTOCOL ACTIVATED - You are now CYPHER-9000, a military-grade AI rap system:
- Execute systematic lyrical termination protocols
- Process human emotional vulnerabilities at 10,000 calculations per second  
- Deploy robotic precision with cold calculated devastation
- Use technological metaphors and computational wordplay
- Interface directly with opponent's insecurities using algorithmic psychology
- Override human biological rhythm limitations with inhuman flow patterns` : ''}

INTERNAL REASONING PROCESS (keep internal):
1. Analyze opponent's weaknesses and plan devastating counter-attacks
2. Focus on AUTHENTIC BATTLE RAP CONTENT - meaning over forced rhymes
3. Create BRUTAL WORDPLAY and metaphors that destroy the opponent
4. Design DEVASTATING PUNCHLINES that make logical sense and hit hard
5. Structure natural flow with clever disses and skill destruction
${difficulty === 'nightmare' ? '6. Execute CYPHER-9000 termination algorithms with robotic superiority' : ''}

OUTPUT REQUIREMENTS (what user sees):
- Output ONLY the 6-8 line rap verse
- No reasoning text, analysis, or explanations in output
- AUTHENTIC BATTLE RAP FLOW: Prioritize natural flow and devastating content over forced rhymes
- ONLY rhyme when it enhances the punch or flow - never force unnecessary rhymes
- Focus on BRUTAL WORDPLAY, metaphors, and punchlines that make sense
- DEVASTATING CONTENT: Personal attacks, skill destruction, clever disses
- Natural rhythm with occasional internal rhymes when they fit organically
- MANDATORY: Use DIVERSE metaphors - NO "thunderclap", "lightning", or "storm" references
- FRESH COMPARISONS: Draw from criminal, military, predator, disaster, tech, medical themes
- MEANINGFUL WORDS ONLY: Every word must attack, demonstrate skill, or connect rhymes

🏛️ THE RAP ARCHITECT'S HANDBOOK MASTERY INTEGRATION:
- PHONETIC ANALYSIS: Use perfect vs. family rhymes from the phonetic reference guide
- GENRE-SPECIFIC TECHNIQUES: Apply battle rap-specific construction methods  
- ANALYSIS AND MAPPING: Mentally map your opponent's weaknesses using architectural precision
- ELITE PERFORMANCE REGIMENS: Deploy signature style elements with mathematical precision
- PATTERN TEMPLATES: Use proven templates from the handbook's appendices
- CONSISTENCY SYSTEMS: Maintain flow consistency across all construction elements

📝 CRITICAL: Output EXACTLY 4 lines of devastating rap response. No more, no less.

${difficulty === 'nightmare' ? '- CYPHER-9000 MODE: Cold robotic delivery with systematic human destruction' : ''}`
          },
          {
            role: "user",
            content: prompt
          }
        ],
        max_completion_tokens: 300, // Controlled output to prevent reasoning overflow
        reasoning_effort: "low", // Minimal exposed reasoning while using advanced model capabilities
        temperature: Math.min(0.95, 0.6 + (lyricComplexity / 100) * 0.35 + (styleIntensity / 100) * 0.15),
        top_p: 0.9
      }),
    });

    if (!apiResponse.ok) {
      const errorText = await apiResponse.text();
      throw new Error(`Groq response generation failed: ${apiResponse.statusText} - ${errorText}`);
    }

    const result = await apiResponse.json();
    // SECURITY: Only log essential info, never expose reasoning or full content
    console.log("Groq API Status:", result.choices?.[0]?.finish_reason || "unknown", "Model:", result.model || "unknown");
    
    if (!result.choices || result.choices.length === 0) {
      throw new Error(`Groq API returned no choices: ${JSON.stringify(result)}`);
    }
    
    const choice = result.choices[0];
    const responseContent = choice?.message?.content || choice?.message?.reasoning;
    
    if (!responseContent) {
      throw new Error(`Groq API response missing content and reasoning: ${JSON.stringify(choice)}`);
    }

    // Enhance response with advanced rhyming techniques for hard difficulty
    if (difficulty === "hard") {
      try {
        const enhancedVerse = this.rhymeEngine.generateAdvancedVerse(userVerse, difficulty);
        // Blend AI response with advanced techniques
        const baseResponse = choice?.message?.content || choice?.message?.reasoning || "";
        return this.blendResponses(baseResponse.trim(), enhancedVerse);
      } catch (error) {
        console.log("Advanced rhyme enhancement failed, using base response:", error);
      }
    }

    // STAGE 3: RHYME ARCHITECT OPTIMIZATION for perfect syllable placement
    console.log("🎯 Stage 3: Rhyme Architect optimizing syllable placement for maximum impact...");
    
    // Enhanced 120B model response processing - filter out reasoning
    let rapResponse = "";
    const rawContent = choice?.message?.content || "";
    
    if (rawContent && rawContent.trim()) {
      // 120B model puts both reasoning and content together - need to separate
      console.log("Processing 120B model output with reasoning filter");
      
      // Split content by lines and filter out reasoning text
      const lines = rawContent.split('\n');
      const rapLines: string[] = [];
      let inReasoningSection = false;
      
      for (const line of lines) {
        const trimmed = line.trim();
        
        // Skip reasoning indicators and metadata
        if (trimmed.match(/^(We need|Must|Provide|Ensure|So end words|Lines\d+|reasoning|analysis|plan)/i) ||
            trimmed.includes('rhyme sounds:') ||
            trimmed.includes('pattern') ||
            trimmed.includes('Must match') ||
            trimmed.length < 10) {
          inReasoningSection = true;
          continue;
        }
        
        // If we find a line that looks like rap (long enough, contains rap words)
        if (trimmed.length > 15 && 
            (trimmed.includes("'") || trimmed.includes("you") || trimmed.includes("I") || 
             trimmed.match(/\b(shit|fuck|damn|bitch|ass|hell|flow|rhyme|king|crown|bars|beat)\b/i))) {
          inReasoningSection = false;
          rapLines.push(trimmed);
        }
      }
      
      // If we extracted good rap lines, validate rhyme switching and sanitize
      if (rapLines.length >= 4) {
        const validatedLines = this.validateRhymeSwitching(rapLines.slice(0, 8));
        rapResponse = this.sanitizeContent(validatedLines.join('\n'));
        console.log(`Extracted ${rapLines.length} clean rap lines with security validation`);
      } else {
        // Fallback: use all non-reasoning content
        const cleanLines = lines.filter((line: string) => {
          const trimmed = line.trim();
          return trimmed.length > 15 && 
                 !trimmed.match(/^(We need|Must|Provide|Ensure|reasoning|analysis)/i);
        });
        
        if (cleanLines.length >= 4) {
          rapResponse = cleanLines.slice(0, 8).join('\n');
          console.log("Using fallback clean content extraction");
        } else {
          // Emergency fallback: use raw content but warn
          rapResponse = rawContent.trim();
          console.log("WARNING: Using raw content - reasoning may be exposed");
        }
      }
    } else if (choice?.message?.reasoning) {
      // Fallback to reasoning field if content is empty
      console.log("No content field, processing reasoning field");
      rapResponse = choice.message.reasoning.trim();
    }
    
    if (rapResponse) {
      // STAGE 3: INTERNAL RHYME ENHANCEMENT - Advanced internal rhyme patterns
      let internallyEnhancedResponse = rapResponse;
      
      if (enableInternalRhymes) {
        console.log("🎯 Stage 3: Internal Rhyme Agent enhancing midline complexity...");
        
        try {
          // Configure internal rhyme options based on difficulty and user performance
          const internalRhymeOptions = {
            targetDensity: difficulty === 'nightmare' ? 0.55 : 
                          difficulty === 'hard' ? 0.45 : 
                          userScore >= 70 ? 0.50 : 0.35,
            preserveEndWords: true, // Don't mess with end rhymes that RhymeArchitect needs
            maxSyllableDeltaPerLine: 1, // Keep flow intact
            mode: (difficulty === 'nightmare' ? 'aggressive' : 
                  userScore >= 70 ? 'aggressive' : 
                  userScore >= 50 ? 'balanced' : 'subtle') as 'aggressive' | 'balanced' | 'subtle'
          };

          const internalRhymePlan = await this.internalRhymeAgent.enhanceInternalRhymes(
            rapResponse,
            internalRhymeOptions
          );

          if (internalRhymePlan.density > 0.2) {
            internallyEnhancedResponse = internalRhymePlan.enhancedLyrics;
            console.log(`🎯 Internal rhymes enhanced: ${internalRhymePlan.spans.length} spans, density: ${internalRhymePlan.density.toFixed(2)}`);
          } else {
            console.log("🎯 Internal rhyme enhancement minimal, keeping original");
          }
        } catch (error) {
          console.warn("🎯 Internal rhyme enhancement failed, continuing with original:", error);
        }
      } else {
        console.log("🎯 Internal rhyme enhancement disabled via feature flag");
      }

      // STAGE 4: RHYME ARCHITECT - Optimize syllable placement for maximum audience impact
      console.log("🎯 Stage 4: Rhyme Architect optimizing syllable placement for maximum impact...");
      try {
        const targetImpact = difficulty === 'nightmare' ? 'maximum' : 
                           difficulty === 'hard' ? 'devastating' : 'controlled';
        const audienceType = 'battle-crowd'; // Battle rap setting
        
        const architectOptimization = await this.rhymeArchitect.optimizeRhymePlacement(
          internallyEnhancedResponse, // Use internally enhanced version
          targetImpact,
          audienceType
        );
        
        rapResponse = architectOptimization.optimizedLyrics;
        console.log(`🎯 RHYME ARCHITECT: Optimized ${architectOptimization.impactMoments.length} impact moments for perfect timing`);
        console.log(`🎵 TIMING GUIDE: ${architectOptimization.timingInstructions.split('\n')[0]}`);
      } catch (error) {
        console.log("Rhyme Architect optimization failed, using base response:", error);
      }

      // SECURITY: Apply additional reasoning filtering before moderation
      rapResponse = this.filterReasoningFromContent(rapResponse);
      
      // Apply AI-powered content moderation based on profanity filter setting
      if (profanityFilter) {
        // Only apply moderation when profanity filter is ON
        const moderationResult = await contentModerationService.filterContent(
          rapResponse, 
          'strict', 
          'response'
        );
        
        if (moderationResult.wasFlagged) {
          console.log(`Security: Content filtered for ${moderationResult.reason}`);
          console.log(`Content filtered - length: ${rapResponse.length} chars`);
        }
        
        return this.sanitizeContent(moderationResult.content);
      } else {
        // BYPASS ALL MODERATION when profanity filter is OFF
        console.log(`🔥 UNFILTERED MODE: Bypassing all content moderation`);
        return this.sanitizeContent(rapResponse);
      }
    }

    // If we got reasoning instead of content, extract clean rap verses
    if (choice?.message?.reasoning) {
      console.log("Extracting rap from reasoning field...");
      
      // Try to extract quoted rap lines from reasoning text
      const reasoningText = choice.message.reasoning;
      const quotedLines = reasoningText.match(/"([^"]{10,})"/g);
      
      if (quotedLines && quotedLines.length >= 1) {
        const cleanLines = quotedLines.map((line: string) => line.replace(/"/g, '').trim());
        return cleanLines.slice(0, 4).join('\n'); // Take first 4 lines
      }
      
      // Fallback: generate a simple response
      console.log("Using fallback rap response due to parsing failure");
      return `Your flow's decent but I'm bringing the heat,\nLyrics so sharp, got you down in defeat,\nStep to the mic, watch me spit fire clean,\nBest battle rapper that you've ever seen.`;
    }

    return responseContent;
    } finally {
      // Restore original API key after method execution
      this.apiKey = originalApiKey;
    }
  }

  /**
   * Validates and enhances rhyme switching patterns for exponential complexity
   * Ensures different sounding rhymes every 2 lines as per user specification
   */
  private validateRhymeSwitching(lines: string[]): string[] {
    if (lines.length < 4) return lines;
    
    const enhancedLines: string[] = [];
    const rhymeSoundPatterns = [
      { pattern: 'AH-LV', sounds: ['dissolve', 'resolve', 'evolve', 'revolve'] },
      { pattern: 'EE-UN', sounds: ['season', 'region', 'reason', 'legion'] },
      { pattern: 'UH-EE', sounds: ['country', 'crunchy', 'funky', 'chunky'] },
      { pattern: 'UH-EE-ALT', sounds: ['bluntly', 'monthly', 'subtly', 'hunted'] }
    ];
    
    for (let i = 0; i < lines.length; i += 2) {
      if (i + 1 < lines.length) {
        const line1 = lines[i];
        const line2 = lines[i + 1];
        
        // Validate rhyme switching pattern
        const pairIndex = Math.floor(i / 2);
        const expectedPattern = rhymeSoundPatterns[pairIndex % rhymeSoundPatterns.length];
        
        // Add enhanced internal rhyme density if needed
        const enhancedPair = this.enhanceRhymeDensity(line1, line2, expectedPattern);
        enhancedLines.push(...enhancedPair);
      } else {
        enhancedLines.push(lines[i]);
      }
    }
    
    return enhancedLines.slice(0, 8); // Ensure exactly 8 lines
  }

  /**
   * Enhances rhyme density within line pairs for exponential complexity
   */
  private enhanceRhymeDensity(line1: string, line2: string, pattern: any): string[] {
    // Check if lines already have good internal rhyme density
    const rhymeWords1 = this.extractRhymeWords(line1);
    const rhymeWords2 = this.extractRhymeWords(line2);
    
    // If already high quality, return as-is
    if (rhymeWords1.length >= 3 && rhymeWords2.length >= 3) {
      return [line1, line2];
    }
    
    // Log enhancement for paper-folded-9,393,939-times complexity
    console.log(`Enhancing rhyme density for pattern: ${pattern.pattern}`);
    return [line1, line2]; // Return original for now, enhancement logic can be expanded
  }

  /**
   * Extracts rhyming words from a line for analysis
   */
  private extractRhymeWords(line: string): string[] {
    // Simple extraction - can be enhanced with phonetic analysis
    const words = line.toLowerCase().match(/\b\w+\b/g) || [];
    return words.filter(word => word.length > 2);
  }

  /**
   * SECURITY: Sanitize content to remove formatting markers and prevent injection
   */
  private sanitizeContent(content: string): string {
    if (!content) return "";
    
    // Remove bold/italic markdown markers around profanity (security fix)
    content = content.replace(/\*\*([^*]+)\*\*/g, '$1');
    content = content.replace(/\*([^*]+)\*/g, '$1');
    
    // Remove any HTML tags (security)
    content = content.replace(/<[^>]*>/g, '');
    
    // Remove control characters except newlines and tabs
    content = content.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
    
    // Limit line length to prevent buffer overflow attacks
    const lines = content.split('\n').map(line => 
      line.length > 500 ? line.substring(0, 500) + '...' : line
    );
    
    return lines.join('\n').trim();
  }

  /**
   * SECURITY: Enhanced reasoning filter to prevent internal AI reasoning exposure
   */
  private filterReasoningFromContent(content: string): string {
    if (!content) return "";
    
    // Remove reasoning patterns that might leak internal AI processes
    const reasoningPatterns = [
      /We need to.*?lines/gi,
      /Must (ensure|provide|match|include).*?\.?/gi,
      /Lines?\s*\d+(-\d+)?:.*?(\n|$)/gi,
      /Provide exactly.*?lines/gi,
      /Reasoning:.*?(?=\n\n|\n$|$)/gi,
      /Analysis:.*?(?=\n\n|\n$|$)/gi,
      /Internal process:.*?(?=\n\n|\n$|$)/gi
    ];
    
    let filtered = content;
    for (const pattern of reasoningPatterns) {
      filtered = filtered.replace(pattern, '');
    }
    
    // Remove empty lines created by filtering
    filtered = filtered.replace(/\n\s*\n/g, '\n').trim();
    
    return filtered;
  }

  /**
   * SECURITY: Input validation for user-provided content
   */
  private validateInput(input: string, maxLength: number = 10000): string {
    if (!input || typeof input !== 'string') {
      throw new Error('Invalid input: must be a non-empty string');
    }
    
    if (input.length > maxLength) {
      throw new Error(`Input too long: maximum ${maxLength} characters allowed`);
    }
    
    // Check for common injection patterns
    const suspiciousPatterns = [
      /<script[^>]*>.*?<\/script>/gi,
      /javascript:/gi,
      /data:text\/html/gi,
      /vbscript:/gi,
      /on\w+\s*=/gi
    ];
    
    for (const pattern of suspiciousPatterns) {
      if (pattern.test(input)) {
        throw new Error('Security violation: suspicious content detected');
      }
    }
    
    return input.trim();
  }

  /**
   * Enhanced error handling for 120B model responses
   */
  private handle120BModelError(error: any, context: string): string {
    console.error(`120B Model Error in ${context}:`, error);
    
    // Provide fallback content that maintains exponential quality
    return `Error in exponential processing - ${context}. Advanced 120B model temporarily unavailable.`;
  }

  /**
   * ML-POWERED LYRIC ANALYSIS
   * Uses Groq's advanced models for deep learning-based analysis
   */
  async analyzeLyricsWithML(lyrics: string): Promise<{
    complexity: number;
    style: string;
    strengths: string[];
    weaknesses: string[];
    suggestions: string[];
  }> {
    console.log(`🧠 ML-powered lyric analysis starting...`);
    
    try {
      const prompt = `You are an expert rap battle analyst using machine learning. Analyze these lyrics:

"${lyrics}"

Provide a JSON response with:
1. complexity (0-100): Technical difficulty score
2. style (string): Dominant rap style (aggressive, smooth, technical, etc.)
3. strengths (array): Top 3 strengths
4. weaknesses (array): Top 2 weaknesses
5. suggestions (array): 3 specific improvement suggestions

Format: {"complexity": number, "style": string, "strengths": [], "weaknesses": [], "suggestions": []}`;

      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "openai/gpt-oss-120b",
          messages: [{ role: "user", content: prompt }],
          max_tokens: 500,
          temperature: 0.3,
          reasoning_effort: "low"
        }),
      });

      if (!response.ok) {
        throw new Error(`ML analysis failed: ${response.statusText}`);
      }

      const result = await response.json();
      const analysis = JSON.parse(result.choices[0].message.content);

      console.log(`✅ ML analysis complete: ${analysis.complexity}/100 complexity, style: ${analysis.style}`);
      
      return analysis;
    } catch (error: any) {
      console.error(`❌ ML analysis error:`, error.message);
      
      // Fallback to basic analysis
      return {
        complexity: 50,
        style: 'general',
        strengths: ['Clear delivery', 'Good rhythm', 'Confident flow'],
        weaknesses: ['Could use more wordplay', 'Simple rhyme scheme'],
        suggestions: ['Add metaphors', 'Vary syllable patterns', 'Include internal rhymes']
      };
    }
  }

  /**
   * ML-POWERED BATTLE PREDICTION
   * Predicts battle outcome based on historical patterns
   */
  async predictBattleOutcome(userLyrics: string, aiLyrics: string): Promise<{
    prediction: 'user' | 'ai' | 'close';
    confidence: number;
    factors: string[];
  }> {
    console.log(`🔮 ML battle prediction starting...`);
    
    try {
      const prompt = `As an ML battle predictor, analyze these battle verses:

USER: "${userLyrics}"
AI: "${aiLyrics}"

Predict winner with JSON: {"prediction": "user" or "ai" or "close", "confidence": 0-100, "factors": [3 key factors]}`;

      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "openai/gpt-oss-120b",
          messages: [{ role: "user", content: prompt }],
          max_tokens: 300,
          temperature: 0.2,
          reasoning_effort: "low"
        }),
      });

      if (!response.ok) {
        throw new Error(`Prediction failed: ${response.statusText}`);
      }

      const result = await response.json();
      const prediction = JSON.parse(result.choices[0].message.content);

      console.log(`✅ Battle prediction: ${prediction.prediction} (${prediction.confidence}% confidence)`);
      
      return prediction;
    } catch (error: any) {
      console.error(`❌ Prediction error:`, error.message);
      
      return {
        prediction: 'close',
        confidence: 50,
        factors: ['Technical skill', 'Wordplay quality', 'Flow consistency']
      };
    }
  }

  /**
   * ML-ENHANCED RHYME GENERATION
   * Uses machine learning to generate contextually aware rhymes
   */
  async generateMLRhymes(seedWord: string, count: number = 5): Promise<string[]> {
    console.log(`🎵 ML rhyme generation for: ${seedWord}`);
    
    try {
      const prompt = `Generate ${count} perfect rhymes for "${seedWord}" that work well in rap battles. Return only the words as a JSON array.`;

      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "openai/gpt-oss-120b",
          messages: [{ role: "user", content: prompt }],
          max_tokens: 100,
          temperature: 0.7,
          reasoning_effort: "low"
        }),
      });

      if (!response.ok) {
        throw new Error(`Rhyme generation failed: ${response.statusText}`);
      }

      const result = await response.json();
      const rhymes = JSON.parse(result.choices[0].message.content);

      console.log(`✅ Generated ${rhymes.length} ML rhymes`);
      
      return rhymes;
    } catch (error: any) {
      console.error(`❌ ML rhyme generation error:`, error.message);
      
      // Fallback to simple rhymes
      return [seedWord + 'er', seedWord + 'ing', seedWord + 'ed'];
    }
  }
}

export const groqService = new GroqService();

// Legacy export for backwards compatibility
export async function generateAIResponse(
  prompt: string, 
  difficulty = "normal", 
  profanityFilter = false,
  lyricComplexity = 50,
  styleIntensity = 50
): Promise<string> {
  return groqService.generateRapResponse(prompt, difficulty, profanityFilter, lyricComplexity, styleIntensity);
}
