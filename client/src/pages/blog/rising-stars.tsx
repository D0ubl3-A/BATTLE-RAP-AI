import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useLocation } from 'wouter';
import { Navigation } from '@/components/navigation';
import { Calendar, Clock, Sparkles, Users, ChevronLeft, TrendingUp } from 'lucide-react';

export default function RisingStars() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-dark via-secondary-dark to-primary-dark">
      <Navigation />
      <div className="container mx-auto p-6 max-w-4xl pt-24">
        <Button
          variant="outline"
          className="mb-8 glass-panel border-neon-magenta hover:bg-neon-magenta/10"
          onClick={() => setLocation('/blog')}
        >
          <ChevronLeft className="h-4 w-4 mr-2" />
          Back to Blog
        </Button>

        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-8 rounded-lg overflow-hidden h-96 bg-gradient-to-br from-neon-magenta/20 to-prism-cyan/20"
        >
          <img 
            src="/attached_assets/stock_images/battle_rapper_perfor_8d70bbd1.jpg"
            alt="Rising Stars of Battle Rap"
            className="w-full h-full object-cover"
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mb-8"
        >
          <div className="flex gap-2 mb-4">
            <Badge className="bg-yellow-500 text-black">Trends</Badge>
            <Badge className="bg-neon-magenta text-white">Culture</Badge>
          </div>

          <h1 className="text-5xl md:text-6xl font-orbitron font-bold text-neon-magenta mb-4">
            Rising Stars & Female Rappers: The New Wave of Battle Rap 2025
          </h1>

          <div className="flex flex-wrap gap-6 text-gray-400 mb-8">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-yellow-400" />
              <span>November 22, 2024</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-yellow-400" />
              <span>7 min read</span>
            </div>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-yellow-400" />
              <span>Emerging Talent</span>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="space-y-8"
        >
          <Card className="glass-card neon-border-magenta">
            <CardHeader>
              <CardTitle className="text-neon-magenta font-orbitron flex items-center gap-2">
                <Sparkles className="h-6 w-6" />
                A Cultural Shift in Battle Rap
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-gray-300">
              <p>
                The battle rap landscape is experiencing a seismic shift. For years, the competitive freestyle scene was dominated by male rappers, but 2025 marks a turning point where female competitors are not just participating—they're breaking records, gaining sponsorships, and commanding respect as elite battlers.
              </p>
              <p>
                This evolution represents more than demographic change; it's a cultural awakening that recognizes talent regardless of gender, bringing fresh perspectives, unique styles, and unmatched competitive fire to stages worldwide.
              </p>
            </CardContent>
          </Card>

          <Card className="glass-card neon-border-cyan">
            <CardHeader>
              <CardTitle className="text-prism-cyan font-orbitron flex items-center gap-2">
                <Users className="h-6 w-6" />
                Meet the Female Vanguard
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="p-4 bg-gradient-to-r from-neon-magenta/20 to-pink-500/20 rounded-lg border border-neon-magenta/30">
                  <h4 className="font-orbitron text-neon-magenta mb-2 text-lg">🎤 Desnivela</h4>
                  <p className="text-gray-300 mb-2">
                    Breaking gender barriers in freestyle with technical precision and confident stage presence.
                  </p>
                  <ul className="list-disc list-inside text-sm text-gray-400 space-y-1">
                    <li>Master of multi-syllabic rhyme schemes</li>
                    <li>Commands respect through pure technical skill</li>
                    <li>Red Bull Batalla 2025 competitor</li>
                    <li>Rapid rise from underground to mainstream</li>
                  </ul>
                </div>

                <div className="p-4 bg-gradient-to-r from-prism-cyan/20 to-blue-500/20 rounded-lg border border-prism-cyan/30">
                  <h4 className="font-orbitron text-prism-cyan mb-2 text-lg">⚡ Dajamii ALIEN</h4>
                  <p className="text-gray-300 mb-2">
                    Innovative wordplay specialist bringing experimental styles to competitive freestyle.
                  </p>
                  <ul className="list-disc list-inside text-sm text-gray-400 space-y-1">
                    <li>Known for creative double entendres</li>
                    <li>Experimental lyrical patterns</li>
                    <li>Growing international recognition</li>
                    <li>Red Bull Batalla 2025 competitor</li>
                  </ul>
                </div>

                <div className="p-4 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 rounded-lg border border-yellow-500/30">
                  <h4 className="font-orbitron text-yellow-400 mb-2 text-lg">🌟 21 Gramos MC</h4>
                  <p className="text-gray-300 mb-2">
                    Rising star from the underground proving that raw talent transcends traditional gatekeeping.
                  </p>
                  <ul className="list-disc list-inside text-sm text-gray-400 space-y-1">
                    <li>Authentic underground credibility</li>
                    <li>Rapid ascent to national competition</li>
                    <li>Relatable storytelling style</li>
                    <li>Red Bull Batalla 2025 competitor</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card neon-border-magenta">
            <CardHeader>
              <CardTitle className="text-neon-magenta font-orbitron">Why This Matters: Breaking Ceilings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-gray-300">
              <div>
                <h4 className="font-orbitron text-neon-magenta mb-2">📊 The Numbers Don't Lie</h4>
                <p>
                  For the first time in Red Bull Batalla's 20-year history, multiple female MCs are competing at the national level. This isn't tokenism—these competitors earned their spots through skill, defeating experienced male battlers in qualifying rounds.
                </p>
              </div>

              <div>
                <h4 className="font-orbitron text-prism-cyan mb-2">🎯 Changing Perceptions</h4>
                <p>
                  When audiences see female rappers delivering intricate bars, clever wordplay, and commanding presence on equal footing with male competitors, it challenges assumptions and expands what's possible. Young girls now have visible role models proving they belong on battle stages.
                </p>
              </div>

              <div>
                <h4 className="font-orbitron text-yellow-400 mb-2">🚀 Economic Impact</h4>
                <p>
                  Increased participation means larger fan bases, better sponsorships, and more opportunities for all competitors. The entire battle rap ecosystem benefits when more talent participates and audiences grow.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card neon-border-cyan">
            <CardHeader>
              <CardTitle className="text-prism-cyan font-orbitron">Emerging Male Rising Stars</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-gray-300">
              <p>
                The new generation isn't just about gender diversity—it's about fresh talent challenging established conventions:
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-3 bg-prism-cyan/10 rounded border border-prism-cyan/20">
                  <p className="font-orbitron text-prism-cyan mb-1">🔥 Young Challengers</p>
                  <p className="text-sm text-gray-300">Mastering modern battle rap techniques with social media amplification</p>
                </div>
                <div className="p-3 bg-neon-magenta/10 rounded border border-neon-magenta/20">
                  <p className="font-orbitron text-neon-magenta mb-1">🎤 Technical Innovation</p>
                  <p className="text-sm text-gray-300">Pushing boundaries with complex schemes and creative delivery methods</p>
                </div>
                <div className="p-3 bg-yellow-500/10 rounded border border-yellow-500/20">
                  <p className="font-orbitron text-yellow-400 mb-1">🌍 Global Talent</p>
                  <p className="text-sm text-gray-300">International competitors bringing diverse freestyle traditions</p>
                </div>
                <div className="p-3 bg-orange-500/10 rounded border border-orange-500/20">
                  <p className="font-orbitron text-orange-400 mb-1">💯 Authenticity First</p>
                  <p className="text-sm text-gray-300">Younger competitors prioritize genuine expression over gimmicks</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card neon-border-magenta">
            <CardHeader>
              <CardTitle className="text-neon-magenta font-orbitron">Training the Next Generation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-gray-300">
              <p>
                As battle rap becomes more competitive, the training required to succeed at elite levels has intensified. Aspiring competitors can't just freestyle on street corners anymore—they need structured practice, advanced techniques, and sophisticated matchmaking systems.
              </p>

              <p>
                This is where modern training platforms play a crucial role, offering:
              </p>

              <ul className="space-y-2 text-gray-300">
                <li className="flex items-start gap-2">
                  <Sparkles className="h-5 w-5 text-neon-magenta mt-1 flex-shrink-0" />
                  <span>Advanced AI matchmaking that scales difficulty as you improve</span>
                </li>
                <li className="flex items-start gap-2">
                  <Sparkles className="h-5 w-5 text-prism-cyan mt-1 flex-shrink-0" />
                  <span>Real-time scoring that recognizes technical proficiency</span>
                </li>
                <li className="flex items-start gap-2">
                  <Sparkles className="h-5 w-5 text-yellow-400 mt-1 flex-shrink-0" />
                  <span>AI coaching providing personalized feedback on performance</span>
                </li>
                <li className="flex items-start gap-2">
                  <Sparkles className="h-5 w-5 text-orange-400 mt-1 flex-shrink-0" />
                  <span>Competitive tournaments that mirror professional battle formats</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card className="glass-card neon-border-cyan">
            <CardHeader>
              <CardTitle className="text-prism-cyan font-orbitron">The Future of Battle Rap</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-gray-300">
              <p>
                2025 signals that battle rap has matured beyond a niche underground scene. With major sponsorships, international competitions, and diverse competitor pools, the genre has legitimacy.
              </p>

              <p>
                The rise of female rappers and emerging talent from diverse backgrounds represents the genre's strength and resilience. Battle rap thrives on competition, skill recognition, and authentic self-expression—values that transcend any demographic category.
              </p>

              <p>
                For aspiring competitors, this is an unprecedented opportunity. There's no gatekeeping, no predetermined winners—just raw talent and preparation meeting competitive fire. The next generation of legends is rising now.
              </p>
            </CardContent>
          </Card>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.8 }}
            className="p-6 bg-gradient-to-r from-neon-magenta/20 to-prism-cyan/20 rounded-lg border border-neon-magenta/50 text-center"
          >
            <h3 className="text-2xl font-orbitron text-neon-magenta mb-3">Join the New Wave</h3>
            <p className="text-gray-300 mb-4">
              Be part of the rising generation. Train, battle, and compete at your highest level.
            </p>
            <Button className="gradient-primary-bg hover-lift text-white font-orbitron">
              Rise Up Now
            </Button>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
