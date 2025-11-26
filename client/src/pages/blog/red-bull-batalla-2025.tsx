import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useLocation } from 'wouter';
import { Navigation } from '@/components/navigation';
import { Calendar, Clock, MapPin, Trophy, Users, ChevronLeft } from 'lucide-react';

export default function RedBullBatalla() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-dark via-secondary-dark to-primary-dark">
      <Navigation />
      <div className="container mx-auto p-6 max-w-4xl pt-24">
        {/* Back Button */}
        <Button
          variant="outline"
          className="mb-8 glass-panel border-prism-cyan hover:bg-prism-cyan/10"
          onClick={() => setLocation('/blog')}
        >
          <ChevronLeft className="h-4 w-4 mr-2" />
          Back to Blog
        </Button>

        {/* Hero Image */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-8 rounded-lg overflow-hidden h-96 bg-gradient-to-br from-neon-magenta/20 to-prism-cyan/20"
        >
          <img 
            src="/attached_assets/stock_images/battle_rapper_perfor_8cf2e8b8.jpg"
            alt="Red Bull Batalla 2025"
            className="w-full h-full object-cover"
          />
        </motion.div>

        {/* Article Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mb-8"
        >
          <div className="flex gap-2 mb-4">
            <Badge className="bg-neon-magenta text-white">Championship</Badge>
            <Badge className="bg-prism-cyan text-black">Featured</Badge>
          </div>

          <h1 className="text-5xl md:text-6xl font-orbitron font-bold text-neon-magenta mb-4">
            Red Bull Batalla 2025-26: The World's Biggest Battle Rap Championship
          </h1>

          <div className="flex flex-wrap gap-6 text-gray-400 mb-8">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-prism-cyan" />
              <span>November 26, 2024</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-prism-cyan" />
              <span>8 min read</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-prism-cyan" />
              <span>20th Season</span>
            </div>
          </div>
        </motion.div>

        {/* Content */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="space-y-8"
        >
          {/* Overview */}
          <Card className="glass-card neon-border-magenta">
            <CardHeader>
              <CardTitle className="text-neon-magenta font-orbitron">The Biggest Freestyle Battle Ever</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-gray-300">
              <p>
                Red Bull Batalla is back for its historic 20th season and 7th U.S. season, cementing its position as the world's largest freestyle rap competition. With participants from over 20 countries competing for global recognition and prizes, Batalla represents the pinnacle of competitive hip-hop culture.
              </p>
              <p>
                This season promises unprecedented scale: 8,500+ global applicants competing across multiple continents, with 32 elite U.S. competitors advancing to nationals. The competition has evolved beyond just battle rap—it's a cultural phenomenon that shapes the global freestyle landscape.
              </p>
            </CardContent>
          </Card>

          {/* Key Schedule */}
          <Card className="glass-card neon-border-cyan">
            <CardHeader>
              <CardTitle className="text-prism-cyan font-orbitron flex items-center gap-2">
                <Trophy className="h-6 w-6" />
                2025 Competition Schedule
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="p-4 bg-neon-magenta/10 rounded-lg border border-neon-magenta/30">
                  <h4 className="font-orbitron text-neon-magenta mb-2">🏆 U.S. Qualifier #1</h4>
                  <p className="text-gray-300"><MapPin className="h-4 w-4 inline mr-2" />Chicago, IL - June 14, 2025</p>
                  <p className="text-sm text-gray-400">Veriport Airplane Hangar</p>
                </div>

                <div className="p-4 bg-prism-cyan/10 rounded-lg border border-prism-cyan/30">
                  <h4 className="font-orbitron text-prism-cyan mb-2">🏆 U.S. Qualifier #2</h4>
                  <p className="text-gray-300"><MapPin className="h-4 w-4 inline mr-2" />Miami, FL - July 19, 2025</p>
                  <p className="text-sm text-gray-400">M2 Nightclub</p>
                </div>

                <div className="p-4 bg-yellow-500/10 rounded-lg border border-yellow-500/30">
                  <h4 className="font-orbitron text-yellow-400 mb-2">🏆 U.S. National Final</h4>
                  <p className="text-gray-300"><MapPin className="h-4 w-4 inline mr-2" />New York City - September 26, 2025</p>
                  <p className="text-sm text-gray-400">First Batalla National Final ever held in NYC!</p>
                </div>

                <div className="p-4 bg-orange-500/10 rounded-lg border border-orange-500/30">
                  <h4 className="font-orbitron text-orange-400 mb-2">🌎 International Final</h4>
                  <p className="text-gray-300"><MapPin className="h-4 w-4 inline mr-2" />Chile (Date TBA)</p>
                  <p className="text-sm text-gray-400">Top 32 Global Competitors</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Returning Champions */}
          <Card className="glass-card neon-border-magenta">
            <CardHeader>
              <CardTitle className="text-neon-magenta font-orbitron">Elite Competitors to Watch</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-gradient-to-br from-neon-magenta/10 to-transparent rounded-lg border border-neon-magenta/20">
                  <h4 className="font-orbitron text-neon-magenta mb-2">🔥 AdonysX</h4>
                  <p className="text-sm text-gray-300">Reigning 2024 U.S. Champion - Defending his title with intense pressure on rivals</p>
                </div>

                <div className="p-4 bg-gradient-to-br from-prism-cyan/10 to-transparent rounded-lg border border-prism-cyan/20">
                  <h4 className="font-orbitron text-prism-cyan mb-2">⚡ Reverse</h4>
                  <p className="text-sm text-gray-300">Two-time National Champion (2021, 2023) - Returning from hiatus to reclaim glory</p>
                </div>

                <div className="p-4 bg-gradient-to-br from-yellow-500/10 to-transparent rounded-lg border border-yellow-500/20">
                  <h4 className="font-orbitron text-yellow-400 mb-2">📈 Freites</h4>
                  <p className="text-sm text-gray-300">2024 U.S. Runner-up - Hungry to reach the championship after falling short last year</p>
                </div>

                <div className="p-4 bg-gradient-to-br from-orange-500/10 to-transparent rounded-lg border border-orange-500/20">
                  <h4 className="font-orbitron text-orange-400 mb-2">👑 Oner</h4>
                  <p className="text-sm text-gray-300">2024 3rd Place & Former Champion (2023) - Multiple championship experience</p>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-600">
                <h4 className="font-orbitron text-prism-cyan mb-3">🎤 New Wave Female Competitors</h4>
                <p className="text-gray-300">First time with multiple female MCs competing at the highest level:</p>
                <ul className="list-disc list-inside text-gray-400 mt-2 space-y-1">
                  <li><strong>Desnivela</strong> - Breaking gender barriers in freestyle</li>
                  <li><strong>Dajamii ALIEN</strong> - Innovative wordplay specialist</li>
                  <li><strong>21 Gramos MC</strong> - Rising star from the underground</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Format & Prizes */}
          <Card className="glass-card neon-border-cyan">
            <CardHeader>
              <CardTitle className="text-prism-cyan font-orbitron">Competition Format & Prizes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-gray-300">
              <div>
                <h4 className="font-orbitron text-prism-cyan mb-2">🎯 Battle Format</h4>
                <p>Bracket-style 1v1 battles where 32 top U.S. competitors fight for supremacy. Each battle showcases freestyle prowess with judges evaluating flow, rhyme complexity, wordplay, crowd control, and battle performance.</p>
              </div>

              <div>
                <h4 className="font-orbitron text-neon-magenta mb-2">💰 Prize Pool</h4>
                <p>Winners receive not just cash prizes but international recognition, sponsorship opportunities, and a spot at the prestigious International Final in Chile. The U.S. Champion earns the right to represent Team Americas on the global stage.</p>
              </div>

              <div>
                <h4 className="font-orbitron text-yellow-400 mb-2">🌍 Global Reach</h4>
                <p>Batalla draws from 20+ countries, creating a truly international competition where different freestyle traditions and styles clash. Colombian, Mexican, Spanish, and other international competitors bring unique cultural perspectives to the battles.</p>
              </div>
            </CardContent>
          </Card>

          {/* Cultural Impact */}
          <Card className="glass-card neon-border-magenta">
            <CardHeader>
              <CardTitle className="text-neon-magenta font-orbitron">Why Batalla Matters to Hip-Hop Culture</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-gray-300">
              <p>
                Red Bull Batalla isn't just a competition—it's a cultural institution that has shaped freestyle rap globally. For 20 years, it has provided a platform for the world's best freestylers, elevated regional talents to international stardom, and pushed the boundaries of what's possible in freestyle battle rap.
              </p>

              <p>
                The 2025-26 season marks a historic moment with the National Final coming to New York City for the first time ever. This signals Batalla's evolution and growing significance in American hip-hop culture.
              </p>

              <p>
                With unprecedented female participation, diverse international competitors, and returning champions, this season promises innovation and tradition colliding at the highest level of competitive freestyle.
              </p>
            </CardContent>
          </Card>

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.8 }}
            className="p-6 bg-gradient-to-r from-neon-magenta/20 to-prism-cyan/20 rounded-lg border border-neon-magenta/50 text-center"
          >
            <h3 className="text-2xl font-orbitron text-neon-magenta mb-3">Ready to Master Your Skills?</h3>
            <p className="text-gray-300 mb-4">
              Train like the Batalla competitors. Use our advanced matchmaking and AI coaching to elevate your game.
            </p>
            <Button className="gradient-primary-bg hover-lift text-white font-orbitron">
              Start Training Now
            </Button>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
