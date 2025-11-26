import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useLocation } from 'wouter';
import { Navigation } from '@/components/navigation';
import { Calendar, ChevronRight } from 'lucide-react';

interface BlogPost {
  id: string;
  title: string;
  excerpt: string;
  date: string;
  category: string;
  image: string;
  readTime: string;
}

const blogPosts: BlogPost[] = [
  {
    id: 'red-bull-batalla-2025',
    title: 'Red Bull Batalla 2025-26: The World\'s Biggest Battle Rap Championship',
    excerpt: 'Discover the epic 20th season of the world\'s largest Spanish-language freestyle competition with $25,000+ prizes and battles across 3 continents.',
    date: 'November 26, 2024',
    category: 'Championship',
    image: 'battle_rapper_perfor_8cf2e8b8.jpg',
    readTime: '8 min read'
  },
  {
    id: 'url-summer-madness',
    title: 'Ultimate Rap League\'s Summer Madness 15: Loaded Lux vs Twork',
    excerpt: 'The legendary URL announced their biggest summer event featuring elite battle rappers competing for $25,000 and championship glory.',
    date: 'November 24, 2024',
    category: 'Events',
    image: 'battle_rapper_perfor_1670e00b.jpg',
    readTime: '6 min read'
  },
  {
    id: 'battle-rap-rising-stars',
    title: 'Rising Stars & Female Rappers: The New Wave of Battle Rap 2025',
    excerpt: 'Meet the next generation of battle rappers breaking records and redefining the culture with technical skill and authenticity.',
    date: 'November 22, 2024',
    category: 'Trends',
    image: 'battle_rapper_perfor_8d70bbd1.jpg',
    readTime: '7 min read'
  }
];

export default function BlogIndex() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-dark via-secondary-dark to-primary-dark">
      <Navigation />
      <div className="container mx-auto p-6 max-w-6xl pt-24">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-12"
        >
          <h1 className="text-5xl md:text-6xl font-orbitron font-bold text-neon-magenta mb-4">
            BATTLE RAP BLOG
          </h1>
          <p className="text-prism-cyan text-xl">
            Stay updated with the latest battle rap news, championships, and cultural moments
          </p>
        </motion.div>

        {/* Blog Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {blogPosts.map((post, index) => (
            <motion.div
              key={post.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <Card 
                className="glass-card neon-border-cyan h-full overflow-hidden cursor-pointer hover:shadow-lg hover:shadow-prism-cyan/50 transition-all hover-lift"
                onClick={() => setLocation(`/blog/${post.id}`)}
              >
                {/* Featured Image */}
                <div className="h-48 bg-gradient-to-br from-neon-magenta/20 to-prism-cyan/20 overflow-hidden relative">
                  <img 
                    src={`/attached_assets/stock_images/${post.image}`}
                    alt={post.title}
                    className="w-full h-full object-cover opacity-90 hover:opacity-100 transition-opacity"
                  />
                  <div className="absolute top-3 right-3">
                    <span className="bg-neon-magenta text-white px-3 py-1 rounded-full text-xs font-orbitron">
                      {post.category}
                    </span>
                  </div>
                </div>

                <CardHeader>
                  <CardTitle className="text-neon-magenta font-orbitron line-clamp-2">
                    {post.title}
                  </CardTitle>
                  <CardDescription className="text-gray-400 flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4" />
                    {post.date} • {post.readTime}
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">
                  <p className="text-gray-300 line-clamp-3">{post.excerpt}</p>
                  <Button 
                    variant="outline" 
                    className="w-full glass-panel border-prism-cyan hover:bg-prism-cyan/10 text-prism-cyan font-orbitron"
                  >
                    Read More <ChevronRight className="h-4 w-4 ml-2" />
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
