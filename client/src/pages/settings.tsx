import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { APIKeyManager } from '@/components/api-key-manager';
import { Settings2, Mic, Key, Shield, ArrowLeft } from 'lucide-react';
import { SEO, generateWebPageStructuredData } from '@/components/SEO';
import { Link } from 'wouter';
const settingsImage = "/images/Audio_settings_interface_5e678558.png";

export default function SettingsPage() {

  const structuredData = generateWebPageStructuredData(
    "Settings - Configure Your Battle Rap Experience",
    "Customize your rap battle settings, manage API keys for TTS services, and configure battle preferences.",
    "https://rapbots.online/settings"
  );

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, ease: "easeOut" }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-void-deep via-primary-dark to-steel-gray p-4 relative" data-testid="page-settings">
      <SEO
        title="Settings - Configure Your Battle Rap AI Experience"
        description="Customize your rap battle settings, manage API keys for TTS services, and configure battle preferences for optimal performance."
        keywords={['settings', 'API keys', 'TTS configuration', 'battle settings', 'account management']}
        structuredData={structuredData}
      />
      
      {/* Settings Background */}
      <div 
        className="fixed inset-0 bg-cover bg-center bg-no-repeat opacity-8 z-0 pointer-events-none"
        style={{ backgroundImage: `url(${settingsImage})` }}
      />
      
      {/* Animated background glow effects */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-neon-magenta opacity-10 rounded-full blur-3xl animate-slow-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-prism-cyan opacity-10 rounded-full blur-3xl animate-slow-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <motion.div
        className="relative z-10 max-w-6xl mx-auto space-y-8"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Header */}
        <motion.div
          variants={itemVariants}
          className="glass-card neon-border-magenta p-8"
        >
          <div className="flex items-center justify-between mb-6">
            <Link href="/">
              <a className="inline-flex items-center gap-2 px-4 py-2 rounded-md border-2 border-prism-cyan text-prism-cyan hover:bg-gradient-to-r hover:from-prism-cyan/20 hover:to-transparent transition-all duration-300 cursor-pointer hover-lift" data-testid="button-back-to-home">
                <ArrowLeft className="w-4 h-4" />
                Back to Home
              </a>
            </Link>
          </div>
          <div className="flex items-center justify-center gap-4 mb-3">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            >
              <Settings2 className="w-10 h-10 text-neon-magenta" />
            </motion.div>
            <h1 className="text-5xl font-orbitron font-bold text-neon-magenta tracking-wider">
              SETTINGS
            </h1>
            <motion.div
              animate={{ rotate: -360 }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            >
              <Settings2 className="w-10 h-10 text-prism-cyan" />
            </motion.div>
          </div>
          <p className="text-gray-300 font-code">
            Customize your rap battle experience and manage your API keys
          </p>
        </motion.div>

        {/* Settings Tabs */}
        <motion.div variants={itemVariants}>
          <Tabs defaultValue="tts" className="w-full">
            <TabsList className="grid w-full grid-cols-3 glass-panel p-2 gap-2 border-2 border-transparent">
              <TabsTrigger 
                value="tts" 
                className="data-[state=active]:gradient-primary-bg data-[state=active]:neon-border-cyan transition-all duration-300"
              >
                <Mic className="w-4 h-4 mr-2" />
                TTS Services
              </TabsTrigger>
              <TabsTrigger 
                value="battle" 
                className="data-[state=active]:gradient-primary-bg data-[state=active]:neon-border-cyan transition-all duration-300"
              >
                <Shield className="w-4 h-4 mr-2" />
                Battle Settings
              </TabsTrigger>
              <TabsTrigger 
                value="account" 
                className="data-[state=active]:gradient-primary-bg data-[state=active]:neon-border-cyan transition-all duration-300"
              >
                <Key className="w-4 h-4 mr-2" />
                Account
              </TabsTrigger>
            </TabsList>

            {/* TTS Services Tab */}
            <TabsContent value="tts" className="space-y-6 mt-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <APIKeyManager />
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
              >
                <div className="glass-panel p-8 rounded-xl">
                  <div className="neon-border-cyan rounded-lg p-4 mb-6">
                    <div className="flex items-center gap-2 mb-2">
                      <Mic className="w-5 h-5 text-prism-cyan" />
                      <h3 className="text-xl font-orbitron font-bold text-white">TTS Service Comparison</h3>
                    </div>
                    <p className="text-gray-300 text-sm">
                      Compare different text-to-speech services for your rap battles
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* System Provider */}
                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      className="glass-panel p-6 rounded-xl hover-lift border border-gray-700"
                    >
                      <div className="mb-4">
                        <h4 className="text-lg font-orbitron text-white mb-2">System (Default)</h4>
                        <span className="stat-badge text-gray-300">Always Available</span>
                      </div>
                      <div className="space-y-3">
                        <p className="text-sm text-gray-300">
                          <strong className="text-white">Bark TTS + Typecast</strong><br/>
                          Uses admin-managed keys
                        </p>
                        <div className="text-xs text-gray-400 space-y-1">
                          <p className="flex items-center gap-2">
                            <span className="text-matrix-green">✓</span> Always works
                          </p>
                          <p className="flex items-center gap-2">
                            <span className="text-cyber-red">✗</span> Slower generation
                          </p>
                          <p className="flex items-center gap-2">
                            <span className="text-cyber-red">✗</span> Limited voice options
                          </p>
                        </div>
                      </div>
                    </motion.div>

                    {/* OpenAI Provider */}
                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      className="glass-panel p-6 rounded-xl hover-lift neon-border-cyan relative overflow-hidden"
                    >
                      <div className="absolute inset-0 gradient-card-bg opacity-30" />
                      <div className="relative z-10">
                        <div className="mb-4">
                          <h4 className="text-lg font-orbitron text-prism-cyan mb-2">OpenAI TTS</h4>
                          <span className="stat-badge text-prism-cyan border-prism-cyan">Latest 2025</span>
                        </div>
                        <div className="space-y-3">
                          <p className="text-sm text-gray-300">
                            <strong className="text-white">gpt-4o-mini-tts</strong><br/>
                            With "steerability" features
                          </p>
                          <div className="text-xs text-gray-400 space-y-1">
                            <p className="flex items-center gap-2">
                              <span className="text-matrix-green">✓</span> Authentic rapper voices
                            </p>
                            <p className="flex items-center gap-2">
                              <span className="text-matrix-green">✓</span> Emotion control
                            </p>
                            <p className="flex items-center gap-2">
                              <span className="text-matrix-green">✓</span> High quality audio
                            </p>
                            <p className="flex items-center gap-2 text-toxic-yellow">
                              💰 ~$0.015 per minute
                            </p>
                          </div>
                        </div>
                      </div>
                    </motion.div>

                    {/* Groq Provider */}
                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      className="glass-panel p-6 rounded-xl hover-lift neon-border-magenta relative overflow-hidden"
                    >
                      <div className="absolute inset-0 gradient-primary-bg opacity-20" />
                      <div className="relative z-10">
                        <div className="mb-4">
                          <h4 className="text-lg font-orbitron text-neon-magenta mb-2">Groq TTS</h4>
                          <span className="stat-badge text-matrix-green border-matrix-green">Ultra Fast</span>
                        </div>
                        <div className="space-y-3">
                          <p className="text-sm text-gray-300">
                            <strong className="text-white">PlayAI Models</strong><br/>
                            10x faster than real-time
                          </p>
                          <div className="text-xs text-gray-400 space-y-1">
                            <p className="flex items-center gap-2">
                              <span className="text-matrix-green">✓</span> Lightning fast
                            </p>
                            <p className="flex items-center gap-2">
                              <span className="text-matrix-green">✓</span> Multiple voices
                            </p>
                            <p className="flex items-center gap-2">
                              <span className="text-matrix-green">✓</span> Perfect for battles
                            </p>
                            <p className="flex items-center gap-2 text-toxic-yellow">
                              💰 $50 per 1M characters
                            </p>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  </div>
                </div>
              </motion.div>
            </TabsContent>

            {/* Battle Settings Tab */}
            <TabsContent value="battle" className="space-y-6 mt-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="glass-panel p-8 rounded-xl"
              >
                <div className="neon-border-cyan rounded-lg p-4 mb-6">
                  <h3 className="text-xl font-orbitron font-bold text-white">Battle Preferences</h3>
                  <p className="text-gray-300 text-sm mt-1">
                    Customize your rap battle experience
                  </p>
                </div>
                
                <div className="space-y-6">
                  {[
                    { title: 'Profanity Filter', desc: 'Filter explicit content in battles' },
                    { title: 'Difficulty Preference', desc: 'Default difficulty for new battles' },
                    { title: 'Audio Quality', desc: 'Audio generation quality settings' }
                  ].map((setting, index) => (
                    <motion.div
                      key={setting.title}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.5, delay: index * 0.1 }}
                      className="glass-panel p-4 rounded-lg hover-lift flex items-center justify-between"
                    >
                      <div>
                        <h4 className="text-white font-medium font-orbitron">{setting.title}</h4>
                        <p className="text-sm text-gray-400">{setting.desc}</p>
                      </div>
                      <Badge variant="outline" className="stat-badge">Coming Soon</Badge>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            </TabsContent>

            {/* Account Tab */}
            <TabsContent value="account" className="space-y-6 mt-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="glass-panel p-8 rounded-xl"
              >
                <div className="neon-border-cyan rounded-lg p-4 mb-6">
                  <h3 className="text-xl font-orbitron font-bold text-white">Account Information</h3>
                  <p className="text-gray-300 text-sm mt-1">
                    Your account details and preferences
                  </p>
                </div>
                
                <div className="space-y-6">
                  {[
                    { title: 'Profile Settings', desc: 'Update your profile information' },
                    { title: 'Data Export', desc: 'Download your battle history and stats' },
                    { title: 'Privacy Settings', desc: 'Control your data and privacy preferences' }
                  ].map((setting, index) => (
                    <motion.div
                      key={setting.title}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.5, delay: index * 0.1 }}
                      className="glass-panel p-4 rounded-lg hover-lift flex items-center justify-between"
                    >
                      <div>
                        <h4 className="text-white font-medium font-orbitron">{setting.title}</h4>
                        <p className="text-sm text-gray-400">{setting.desc}</p>
                      </div>
                      <Badge variant="outline" className="stat-badge">Coming Soon</Badge>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            </TabsContent>
          </Tabs>
        </motion.div>
      </motion.div>
    </div>
  );
}
