import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useLocation } from 'wouter';
import { Navigation } from '@/components/navigation';
import { Calendar, Clock, Trophy, Users, ChevronLeft, Zap } from 'lucide-react';

export default function URLSummerMadness() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-dark via-secondary-dark to-primary-dark">
      <Navigation />
      <div className="container mx-auto p-6 max-w-4xl pt-24">
        <Button
          variant="outline"
          className="mb-8 glass-panel border-prism-cyan hover:bg-prism-cyan/10"
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
            src="/attached_assets/stock_images/battle_rapper_perfor_1670e00b.jpg"
            alt="URL Summer Madness 15"
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
            <Badge className="bg-prism-cyan text-black">Events</Badge>
            <Badge className="bg-neon-magenta text-white">Battle Rap</Badge>
          </div>

          <h1 className="text-5xl md:text-6xl font-orbitron font-bold text-prism-cyan mb-4">
            Ultimate Rap League's Summer Madness 15: Loaded Lux vs Twork
          </h1>

          <div className="flex flex-wrap gap-6 text-gray-400 mb-8">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-neon-magenta" />
              <span>November 24, 2024</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-neon-magenta" />
              <span>6 min read</span>
            </div>
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-neon-magenta" />
              <span>Live Event</span>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="space-y-8"
        >
          <Card className="glass-card neon-border-cyan">
            <CardHeader>
              <CardTitle className="text-prism-cyan font-orbitron">The Ultimate Rap League's Most Anticipated Event</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-gray-300">
              <p>
                The Ultimate Rap League (URL) has officially announced Summer Madness 15, bringing together the most elite battle rappers for what promises to be an unforgettable clash of styles, wordplay, and raw competitive energy.
              </p>
              <p>
                The headline matchup features two legends: <strong>Loaded Lux vs. Twork</strong>, a battle that has fans buzzing with anticipation. These two titans of battle rap represent different eras and styles, making this collision a must-watch event for anyone serious about competitive hip-hop.
              </p>
            </CardContent>
          </Card>

          <Card className="glass-card neon-border-magenta">
            <CardHeader>
              <CardTitle className="text-neon-magenta font-orbitron flex items-center gap-2">
                <Trophy className="h-6 w-6" />
                The Main Event: A Clash of Legends
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-gradient-to-br from-prism-cyan/20 to-transparent rounded-lg border-2 border-prism-cyan">
                  <h4 className="font-orbitron text-prism-cyan mb-3 text-lg">Loaded Lux</h4>
                  <ul className="space-y-2 text-sm text-gray-300">
                    <li>🎤 URL Veteran with Legendary Status</li>
                    <li>📚 Master of Complex Storytelling</li>
                    <li>🔥 Known for Intricate Metaphors</li>
                    <li>👑 Multiple Championship Victories</li>
                  </ul>
                </div>

                <div className="p-4 bg-gradient-to-br from-neon-magenta/20 to-transparent rounded-lg border-2 border-neon-magenta">
                  <h4 className="font-orbitron text-neon-magenta mb-3 text-lg">Twork</h4>
                  <ul className="space-y-2 text-sm text-gray-300">
                    <li>💨 Speed & Technical Precision Master</li>
                    <li>🎯 High-Pressure Performer</li>
                    <li>⚡ Rising Star Energy</li>
                    <li>🏆 Multiple Championship Contender</li>
                  </ul>
                </div>
              </div>

              <p className="text-gray-400 mt-4 italic">
                This matchup represents the perfect clash: experience and storytelling vs. speed and technical mastery. Both rappers bring completely different skillsets, making predictions nearly impossible and excitement inevitable.
              </p>
            </CardContent>
          </Card>

          <Card className="glass-card neon-border-cyan">
            <CardHeader>
              <CardTitle className="text-prism-cyan font-orbitron">About the Ultimate Rap League</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-gray-300">
              <div>
                <h4 className="font-orbitron text-prism-cyan mb-2">🏆 The Premier Battle Rap Organization</h4>
                <p>
                  The Ultimate Rap League (URL) has established itself as the premier battle rap platform, hosting events featuring the world's most talented MCs. With professional production, live streaming, and professional commentary, URL has brought battle rap into the mainstream consciousness.
                </p>
              </div>

              <div>
                <h4 className="font-orbitron text-neon-magenta mb-2">📊 Summer Madness Tradition</h4>
                <p>
                  Summer Madness has become URL's flagship event, occurring annually and featuring legendary battles that get replayed and discussed for years. Summer Madness 15 continues this proud tradition of excellence and intensity.
                </p>
              </div>

              <div>
                <h4 className="font-orbitron text-yellow-400 mb-2">📺 How to Watch</h4>
                <ul className="list-disc list-inside space-y-1 text-gray-400">
                  <li><strong>Caffeine.tv</strong> - Primary streaming platform for live URL events</li>
                  <li><strong>URLTV App</strong> - $7.99/month subscription with PPV discounts</li>
                  <li><strong>YouTube</strong> - Delayed streams and highlights</li>
                  <li><strong>Ticketmaster</strong> - Live event tickets available</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card neon-border-magenta">
            <CardHeader>
              <CardTitle className="text-neon-magenta font-orbitron">Ultimate Madness Tournament Series</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-gray-300">
              <p>
                Beyond Summer Madness, URL hosts the Ultimate Madness Tournament Series—a bracket-style, single-elimination competition designed to crown new champions and give rising talent a chance to shine.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-4">
                <div className="p-3 bg-neon-magenta/10 rounded border border-neon-magenta/30">
                  <p className="font-orbitron text-neon-magenta mb-1">💰 Prize Pool</p>
                  <p className="text-2xl font-bold text-neon-magenta">$25,000</p>
                </div>
                <div className="p-3 bg-prism-cyan/10 rounded border border-prism-cyan/30">
                  <p className="font-orbitron text-prism-cyan mb-1">🎯 Format</p>
                  <p className="text-lg text-prism-cyan">Single Elimination</p>
                </div>
              </div>

              <p className="text-gray-400">
                These tournaments serve as proving grounds for the next generation of battle rap legends, often launching careers and creating viral moments that define the culture.
              </p>
            </CardContent>
          </Card>

          <Card className="glass-card neon-border-cyan">
            <CardHeader>
              <CardTitle className="text-prism-cyan font-orbitron">Why This Battle Matters</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-gray-300">
              <p>
                Battle rap has evolved from underground phenomenon to recognized competitive art form. Summer Madness 15 exemplifies this evolution—with professional production, sponsorships, and a passionate global fanbase tuning in to watch elite competitors clash.
              </p>

              <p>
                The Loaded Lux vs. Twork matchup specifically represents a generational moment where different eras of battle rap collide. It's a chance to see how experience and innovation battle for supremacy.
              </p>

              <p>
                For fans and competitors alike, Summer Madness events set the standard for what professional battle rap can be, influencing training regimens, battle strategies, and the entire competitive landscape.
              </p>
            </CardContent>
          </Card>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.8 }}
            className="p-6 bg-gradient-to-r from-prism-cyan/20 to-neon-magenta/20 rounded-lg border border-prism-cyan/50 text-center"
          >
            <h3 className="text-2xl font-orbitron text-prism-cyan mb-3">Inspired by the Pros?</h3>
            <p className="text-gray-300 mb-4">
              Prepare for YOUR battles with AI-powered matchmaking and real-time analysis like the pros use.
            </p>
            <Button className="gradient-primary-bg hover-lift text-white font-orbitron">
              Battle Like a Legend
            </Button>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
