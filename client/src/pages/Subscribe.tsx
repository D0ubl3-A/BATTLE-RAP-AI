import { useEffect, useState } from 'react';
import { useStripe, useElements, PaymentElement, Elements } from '@stripe/react-stripe-js';
import { loadStripe, Stripe } from '@stripe/stripe-js';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { Loader2, Zap, Crown, Check } from 'lucide-react';
import { motion } from 'framer-motion';

const subscribeImage = "/images/Premium_subscription_interface_c2661c50.png";

const stripePromise: Promise<Stripe | null> | null = import.meta.env.VITE_STRIPE_PUBLIC_KEY
  ? loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY)
  : null;

const CREDIT_PACKAGES = {
  1000: { price: 1.0, label: '1,000 Credits' },
  150000: { price: 100.0, label: '150,000 Credits' },
} as const;

const getCreditPackage = (creditAmount?: number) =>
  creditAmount ? CREDIT_PACKAGES[creditAmount as keyof typeof CREDIT_PACKAGES] : undefined;

interface PaymentFormProps {
  tier?: 'premium' | 'pro';
  paymentMethod: 'stripe' | 'cashapp';
  purchaseType: 'subscription' | 'battles' | 'credits';
  battleCount?: number;
  creditAmount?: number;
}

function PaymentForm({ tier, paymentMethod, purchaseType, battleCount, creditAmount }: PaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentSent, setPaymentSent] = useState(false);
  const creditPackage = getCreditPackage(creditAmount);

  if (paymentMethod === 'cashapp') {
    const amount = purchaseType === 'battles'
      ? (battleCount === 1500 ? '$100.00' : '$1.00')
      : purchaseType === 'credits'
      ? `$${(creditPackage?.price || 0).toFixed(2)}`
      : `$${tier === 'premium' ? '9.99' : '19.99'}`;
    const description = purchaseType === 'battles'
      ? (battleCount === 1500 ? '1,500 Battle Pack' : '10 Battle Pack')
      : purchaseType === 'credits'
      ? `${creditPackage?.label || 'Credit Pack'}`
      : `${tier === 'premium' ? 'Premium' : 'Pro'} Subscription`;
    
    const handleCashAppPayment = () => {
      setPaymentSent(true);
      toast({
        title: "✅ Payment Confirmed",
        description: "Your account will be activated automatically once we receive your CashApp payment.",
      });
    };

    return (
      <motion.div 
        className="space-y-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="glass-panel neon-border-cyan rounded-lg p-6 text-center">
          <h3 className="text-prism-cyan font-orbitron font-semibold text-lg mb-4">💰 CASHAPP PAYMENT</h3>
          <div className="space-y-3">
            <p className="text-white text-xl font-bold">Send {amount} to:</p>
            <div className="glass-card neon-border-magenta p-4 glow-pulse-magenta">
              <p className="text-neon-magenta text-2xl font-mono font-bold">$ILLAITHEGPTSTORE</p>
            </div>
            <p className="text-gray-300 text-sm">Note: {description}</p>
          </div>
        </div>
        
        <div className="glass-panel rounded-lg p-4">
          <p className="text-prism-cyan text-sm">
            ✅ Your subscription will be activated automatically within 5-10 minutes after payment.
          </p>
        </div>

        <Button 
          onClick={handleCashAppPayment}
          disabled={paymentSent}
          className="w-full gradient-primary-bg hover-lift text-white font-bold"
          data-testid="button-cashapp-confirm"
        >
          {paymentSent ? (
            <>
              ✅ Payment Confirmed - Activating Soon
            </>
          ) : (
            `✉️ I've Sent ${amount} via CashApp`
          )}
        </Button>
      </motion.div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);

    try {
      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/?payment=success`,
        },
      });

      if (error) {
        toast({
          title: "Payment Failed",
          description: error.message,
          variant: "destructive",
        });
      } else {
        const successMessage = purchaseType === 'battles' 
          ? "Battle pack purchased! 10 battles added to your account."
          : purchaseType === 'credits'
          ? `Credit pack purchased! ${creditAmount?.toLocaleString()} credits added to your account.`
          : `Welcome to ${tier === 'premium' ? 'Premium' : 'Pro'}! Enjoy unlimited battles.`;
        
        toast({
          title: "Payment Successful",
          description: successMessage,
        });
      }
    } catch (err) {
      toast({
        title: "Payment Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <motion.form 
      onSubmit={handleSubmit} 
      className="space-y-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <PaymentElement 
        options={{
          defaultValues: {
            billingDetails: {
              name: '',
              email: ''
            }
          }
        }}
      />
      <Button 
        type="submit" 
        disabled={!stripe || isProcessing}
        className="w-full gradient-primary-bg neon-border-cyan hover-lift font-bold text-lg"
        data-testid="button-submit-payment"
      >
        {isProcessing ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Processing...
          </>
        ) : (
          purchaseType === 'battles' ? 
            `Buy 10 Battles for $1.00` :
            purchaseType === 'credits'
            ? `Buy ${creditAmount?.toLocaleString()} Credits for $${(creditPackage?.price || 0).toFixed(2)}`
            : `Subscribe to ${tier === 'premium' ? 'Premium' : 'Pro'} - $${tier === 'premium' ? '9.99' : '19.99'}/month`
        )}
      </Button>
    </motion.form>
  );
}

export default function Subscribe() {
  const [tier, setTier] = useState<'premium' | 'pro'>('premium');
  const [paymentMethod, setPaymentMethod] = useState<'stripe' | 'cashapp'>('stripe');
  const [purchaseType, setPurchaseType] = useState<'subscription' | 'battles' | 'credits'>('subscription');
  const [clientSecret, setClientSecret] = useState<string>('');
  const [creditAmount, setCreditAmount] = useState<number>(1000);
  const { toast } = useToast();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const purchase = params.get('purchase');

    if (purchase === 'credits' || purchase === 'battles' || purchase === 'subscription') {
      setPurchaseType(purchase);
    }
  }, []);

  const createSubscription = useMutation({
    mutationFn: async (data: { tier: 'premium' | 'pro'; paymentMethod: 'stripe' | 'cashapp' }) => {
      const response = await apiRequest('POST', '/api/create-subscription', { 
        tier: data.tier,
        paymentMethod: data.paymentMethod 
      });
      if (!response.ok) {
        throw new Error('Failed to create subscription');
      }
      return response.json();
    },
    onSuccess: (data) => {
      console.log('🎉 Subscription API response:', data);
      console.log('🔑 Client secret received:', !!data.clientSecret);
      setClientSecret(data.clientSecret);
      toast({
        title: "Payment Ready",
        description: "Please complete your payment below.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Subscription Error",
        description: error.message || "Failed to initiate subscription. Please try again.",
        variant: "destructive",
      });
    },
  });

  const createBattlePack = useMutation({
    mutationFn: async (params: { battleCount: number }) => {
      const response = await apiRequest('POST', '/api/purchase-battles', {
        battleCount: params.battleCount,
        paymentMethod: paymentMethod
      });
      return response.json();
    },
    onSuccess: (data) => {
      console.log('🎉 One-time payment intent created:', data);
      console.log('🔑 Client secret received:', !!data.clientSecret);
      setClientSecret(data.clientSecret);
      toast({
        title: "Payment Ready",
        description: "Please complete your battle pack purchase below.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Purchase Error",
        description: error.message || "Failed to initiate battle pack purchase. Please try again.",
        variant: "destructive",
      });
    },
  });

  const createCreditPack = useMutation({
    mutationFn: async (params: { creditAmount: number }) => {
      const response = await apiRequest('POST', '/api/purchase-credits', {
        creditAmount: params.creditAmount,
        paymentMethod: paymentMethod,
      });
      return response.json();
    },
    onSuccess: (data) => {
      console.log('🎉 Credit payment intent created:', data);
      console.log('🔑 Client secret received:', !!data.clientSecret);
      setClientSecret(data.clientSecret);
      toast({
        title: "Payment Ready",
        description: "Please complete your credit pack purchase below.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Purchase Error",
        description: error.message || "Failed to initiate credit purchase. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleTierSelect = (selectedTier: 'premium' | 'pro') => {
    setTier(selectedTier);
    setClientSecret('');
    if (purchaseType === 'subscription') {
      createSubscription.mutate({ tier: selectedTier, paymentMethod });
    }
  };

  const handlePurchaseTypeChange = (type: 'subscription' | 'battles' | 'credits') => {
    setPurchaseType(type);
    setClientSecret('');
    if (type === 'battles') {
      createBattlePack.mutate({ battleCount: 10 });
    } else if (type === 'credits') {
      createCreditPack.mutate({ creditAmount });
    } else {
      createSubscription.mutate({ tier, paymentMethod });
    }
  };

  const handlePaymentMethodChange = (method: 'stripe' | 'cashapp') => {
    setPaymentMethod(method);
    setClientSecret('');
    if (purchaseType === 'battles') {
      createBattlePack.mutate({ battleCount: 10 });
    } else if (purchaseType === 'credits') {
      createCreditPack.mutate({ creditAmount });
    } else {
      createSubscription.mutate({ tier, paymentMethod: method });
    }
  };

  if (!clientSecret) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
        {/* Animated Neon Apex Background */}
        <div className="fixed inset-0 pointer-events-none opacity-20">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#8b5cf640_1px,transparent_1px),linear-gradient(to_bottom,#8b5cf640_1px,transparent_1px)] bg-[size:64px_64px] animate-slow-pulse"></div>
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-prism-cyan rounded-full blur-3xl opacity-10 animate-slow-pulse"></div>
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-neon-magenta rounded-full blur-3xl opacity-10 animate-slow-pulse" style={{ animationDelay: '1s' }}></div>
        </div>

        <div 
          className="fixed inset-0 bg-cover bg-center bg-no-repeat opacity-5 z-0 pointer-events-none"
          style={{ backgroundImage: `url(${subscribeImage})` }}
        />
        
        <div className="relative z-10 max-w-6xl mx-auto w-full">
          <motion.div 
            className="text-center mb-12"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-5xl font-orbitron font-bold text-white mb-4">
              Choose Your <span className="text-neon-magenta">Battle Plan</span>
            </h1>
            <p className="text-gray-300 text-xl">
              Upgrade to unlock unlimited rap battles and premium features
            </p>
          </motion.div>

          {/* Purchase Type Selection */}
          <motion.div 
            className="mb-10"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <h2 className="text-2xl font-orbitron font-semibold text-white mb-6 text-center">Choose Purchase Type</h2>
            <div className="flex justify-center gap-4 flex-wrap">
              <Button
                variant={purchaseType === 'subscription' ? 'default' : 'outline'}
                onClick={() => handlePurchaseTypeChange('subscription')}
                className={`px-8 py-6 text-lg font-bold ${
                  purchaseType === 'subscription'
                    ? 'gradient-primary-bg neon-border-magenta hover-lift'
                    : 'glass-panel border-2 border-neon-magenta/50 text-neon-magenta hover:border-neon-magenta hover-lift'
                }`}
                data-testid="button-select-subscription"
              >
                📅 Monthly Subscription
              </Button>
              <Button
                variant={purchaseType === 'battles' ? 'default' : 'outline'}
                onClick={() => handlePurchaseTypeChange('battles')}
                className={`px-8 py-6 text-lg font-bold ${
                  purchaseType === 'battles'
                    ? 'gradient-primary-bg neon-border-cyan hover-lift'
                    : 'glass-panel border-2 border-prism-cyan/50 text-prism-cyan hover:border-prism-cyan hover-lift'
                }`}
                data-testid="button-select-battles"
              >
                <Zap className="mr-2 h-5 w-5" />
                10 Battles for $1
              </Button>
              <Button
                variant={purchaseType === 'credits' ? 'default' : 'outline'}
                onClick={() => handlePurchaseTypeChange('credits')}
                className={`px-8 py-6 text-lg font-bold ${
                  purchaseType === 'credits'
                    ? 'gradient-primary-bg neon-border-magenta hover-lift'
                    : 'glass-panel border-2 border-neon-magenta/50 text-neon-magenta hover:border-neon-magenta hover-lift'
                }`}
                data-testid="button-select-credits"
              >
                💰 Credit Packs
              </Button>
            </div>
          </motion.div>

          {/* Payment Method Selection */}
          <motion.div 
            className="mb-12"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <h2 className="text-2xl font-orbitron font-semibold text-white mb-6 text-center">Choose Payment Method</h2>
            <div className="flex justify-center gap-4 flex-wrap">
              <Button
                variant={paymentMethod === 'stripe' ? 'default' : 'outline'}
                onClick={() => handlePaymentMethodChange('stripe')}
                className={`px-8 py-6 text-lg font-bold ${
                  paymentMethod === 'stripe'
                    ? 'gradient-primary-bg neon-border-magenta hover-lift'
                    : 'glass-panel border-2 border-neon-magenta/50 text-neon-magenta hover:border-neon-magenta hover-lift'
                }`}
                data-testid="button-select-stripe"
              >
                💳 Credit Card
              </Button>
              <Button
                variant={paymentMethod === 'cashapp' ? 'default' : 'outline'}
                onClick={() => handlePaymentMethodChange('cashapp')}
                className={`px-8 py-6 text-lg font-bold ${
                  paymentMethod === 'cashapp'
                    ? 'bg-green-600 hover:bg-green-700 border-2 border-green-400 hover-lift'
                    : 'glass-panel border-2 border-green-500/50 text-green-400 hover:border-green-500 hover-lift'
                }`}
                data-testid="button-select-cashapp"
              >
                💰 Cash App ($ILLAITHEGPTSTORE)
              </Button>
            </div>
          </motion.div>

          {purchaseType === 'battles' ? (
            <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              {/* Starter Pack */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
              >
                <Card className="glass-panel neon-border-cyan text-white h-full hover-lift">
                  <CardHeader className="text-center pb-6">
                    <CardTitle className="text-prism-cyan text-3xl font-orbitron flex items-center justify-center gap-2">
                      <Zap className="h-7 w-7" />
                      Starter Pack
                    </CardTitle>
                    <CardDescription className="text-gray-300 text-base">
                      Perfect for trying out the game
                    </CardDescription>
                    <div className="text-4xl font-orbitron font-bold text-white mt-4">
                      $1.00<span className="text-lg text-gray-400"> for 10 battles</span>
                    </div>
                    <p className="text-sm text-gray-400">$0.10 per battle</p>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <ul className="space-y-3 text-gray-200">
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-neon-magenta" />
                        <span className="stat-badge">⚡ 10 instant battles</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-neon-magenta" />
                        <span>🤖 All AI characters</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-neon-magenta" />
                        <span>💳 One-time payment</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-neon-magenta" />
                        <span>🚀 No subscription needed</span>
                      </li>
                    </ul>
                    <Button
                      onClick={() => createBattlePack.mutate({ battleCount: 10 })}
                      disabled={createBattlePack.isPending}
                      className="w-full gradient-primary-bg neon-border-cyan hover-lift font-bold text-lg py-6"
                      data-testid="button-purchase-battles-10"
                    >
                      {createBattlePack.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                          Setting up...
                        </>
                      ) : (
                        'Buy 10 Battles for $1'
                      )}
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Mega Bundle */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
              >
                <Card className="glass-card gradient-card-bg neon-border-magenta text-white h-full transform scale-105 glow-pulse-magenta relative">
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 z-10">
                    <span className="stat-badge bg-gradient-primary-bg text-white px-4 py-1.5 text-sm font-bold">
                      MEGA VALUE
                    </span>
                  </div>
                  <CardHeader className="text-center pb-6">
                    <CardTitle className="text-neon-magenta text-3xl font-orbitron flex items-center justify-center gap-2">
                      <Crown className="h-7 w-7" />
                      Mega Bundle
                    </CardTitle>
                    <CardDescription className="text-gray-200 text-base font-semibold">
                      Massive savings for serious battlers
                    </CardDescription>
                    <div className="text-4xl font-orbitron font-bold text-white mt-4">
                      $100.00<span className="text-lg text-gray-300"> for 1,500 battles</span>
                    </div>
                    <p className="text-sm text-green-400 font-semibold">Only $0.067 per battle!</p>
                    <p className="text-xs text-gray-400">Save $50 vs individual packs</p>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <ul className="space-y-3 text-gray-100">
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-neon-magenta" />
                        <span className="stat-badge">🔥 1,500 epic battles</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-neon-magenta" />
                        <span>🤖 All AI characters</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-neon-magenta" />
                        <span>💰 15 battles per dollar</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-neon-magenta" />
                        <span>💳 One-time payment</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-neon-magenta" />
                        <span>🎯 Best value option</span>
                      </li>
                    </ul>
                    <Button
                      onClick={() => createBattlePack.mutate({ battleCount: 1500 })}
                      disabled={createBattlePack.isPending}
                      className="w-full gradient-primary-bg neon-border-cyan hover-lift font-bold text-lg py-6"
                      data-testid="button-purchase-battles-1500"
                    >
                      {createBattlePack.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                          Setting up...
                        </>
                      ) : (
                        'Buy 1,500 Battles for $100'
                      )}
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          ) : purchaseType === 'credits' ? (
            <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
              >
                <Card className="glass-panel neon-border-magenta text-white h-full hover-lift">
                  <CardHeader className="text-center pb-6">
                    <CardTitle className="text-neon-magenta text-3xl font-orbitron flex items-center justify-center gap-2">
                      💰 Starter Credits
                    </CardTitle>
                    <CardDescription className="text-gray-300 text-base">
                      Great for quick boosts
                    </CardDescription>
                    <div className="text-4xl font-orbitron font-bold text-white mt-4">
                      $1.00<span className="text-lg text-gray-400"> for 1,000 credits</span>
                    </div>
                    <p className="text-sm text-gray-400">100 credits per battle</p>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <ul className="space-y-3 text-gray-200">
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-neon-magenta" />
                        <span className="stat-badge">⚡ 1,000 credits instantly</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-neon-magenta" />
                        <span>🎤 Use on battles or training</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-neon-magenta" />
                        <span>💳 One-time payment</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-neon-magenta" />
                        <span>🚀 No subscription needed</span>
                      </li>
                    </ul>
                    <Button
                      onClick={() => {
                        setCreditAmount(1000);
                        createCreditPack.mutate({ creditAmount: 1000 });
                      }}
                      disabled={createCreditPack.isPending}
                      className="w-full gradient-primary-bg neon-border-magenta hover-lift font-bold text-lg py-6"
                      data-testid="button-purchase-credits-1000"
                    >
                      {createCreditPack.isPending && creditAmount === 1000 ? (
                        <>
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                          Setting up...
                        </>
                      ) : (
                        'Buy 1,000 Credits for $1'
                      )}
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
              >
                <Card className="glass-card gradient-card-bg neon-border-cyan text-white h-full transform scale-105 glow-pulse-cyan relative">
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 z-10">
                    <span className="stat-badge bg-gradient-primary-bg text-white px-4 py-1.5 text-sm font-bold">
                      BEST VALUE
                    </span>
                  </div>
                  <CardHeader className="text-center pb-6">
                    <CardTitle className="text-prism-cyan text-3xl font-orbitron flex items-center justify-center gap-2">
                      🔥 Mega Credits
                    </CardTitle>
                    <CardDescription className="text-gray-200 text-base font-semibold">
                      Stock up for marathon sessions
                    </CardDescription>
                    <div className="text-4xl font-orbitron font-bold text-white mt-4">
                      $100.00<span className="text-lg text-gray-300"> for 150,000 credits</span>
                    </div>
                    <p className="text-sm text-green-400 font-semibold">Unlock 1,500 battles worth of credits</p>
                    <p className="text-xs text-gray-400">Save big vs single packs</p>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <ul className="space-y-3 text-gray-100">
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-prism-cyan" />
                        <span className="stat-badge">🚀 150,000 credits</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-prism-cyan" />
                        <span>🎤 Use on battles or training</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-prism-cyan" />
                        <span>💳 One-time payment</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-prism-cyan" />
                        <span>🎯 Best value option</span>
                      </li>
                    </ul>
                    <Button
                      onClick={() => {
                        setCreditAmount(150000);
                        createCreditPack.mutate({ creditAmount: 150000 });
                      }}
                      disabled={createCreditPack.isPending}
                      className="w-full gradient-primary-bg neon-border-cyan hover-lift font-bold text-lg py-6"
                      data-testid="button-purchase-credits-150000"
                    >
                      {createCreditPack.isPending && creditAmount === 150000 ? (
                        <>
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                          Setting up...
                        </>
                      ) : (
                        'Buy 150,000 Credits for $100'
                      )}
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              {/* Premium Plan */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
              >
                <Card className="glass-card gradient-card-bg neon-border-magenta text-white h-full transform scale-105 glow-pulse-magenta">
                  <CardHeader className="pb-6">
                    <CardTitle className="text-neon-magenta text-3xl font-orbitron flex items-center gap-2">
                      <Zap className="h-7 w-7" />
                      Premium
                    </CardTitle>
                    <CardDescription className="text-gray-200 text-base font-semibold">
                      Perfect for regular battlers
                    </CardDescription>
                    <div className="text-4xl font-orbitron font-bold text-white mt-4">
                      $9.99<span className="text-lg text-gray-300">/month</span>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <ul className="space-y-3 text-gray-100">
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-neon-magenta" />
                        <span className="stat-badge">25 battles per day</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-neon-magenta" />
                        <span>All AI characters</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-neon-magenta" />
                        <span>Tournament mode</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-neon-magenta" />
                        <span>Advanced scoring</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-neon-magenta" />
                        <span>Lyric analysis</span>
                      </li>
                    </ul>
                    <Button
                      onClick={() => handleTierSelect('premium')}
                      disabled={createSubscription.isPending}
                      className="w-full gradient-primary-bg neon-border-cyan hover-lift font-bold text-lg py-6"
                      data-testid="button-select-premium"
                    >
                      {createSubscription.isPending && tier === 'premium' ? (
                        <>
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                          Setting up...
                        </>
                      ) : (
                        'Choose Premium'
                      )}
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Pro Plan */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
              >
                <Card className="glass-panel neon-border-cyan text-white h-full hover-lift glow-pulse-cyan relative">
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 z-10">
                    <span className="stat-badge bg-gradient-primary-bg text-white px-4 py-1.5 text-sm font-bold">
                      BEST VALUE
                    </span>
                  </div>
                  <CardHeader className="pb-6">
                    <CardTitle className="text-prism-cyan text-3xl font-orbitron flex items-center gap-2">
                      <Crown className="h-7 w-7" />
                      Pro
                    </CardTitle>
                    <CardDescription className="text-gray-200 text-base font-semibold">
                      For serious rap battle champions
                    </CardDescription>
                    <div className="text-4xl font-orbitron font-bold text-white mt-4">
                      $19.99<span className="text-lg text-gray-300">/month</span>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <ul className="space-y-3 text-gray-100">
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-prism-cyan" />
                        <span className="stat-badge">Unlimited battles</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-prism-cyan" />
                        <span>All AI characters</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-prism-cyan" />
                        <span>Tournament mode</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-prism-cyan" />
                        <span>Advanced scoring</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-prism-cyan" />
                        <span>Lyric analysis</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-prism-cyan" />
                        <span>Priority support</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-prism-cyan" />
                        <span>Early access features</span>
                      </li>
                    </ul>
                    <Button
                      onClick={() => handleTierSelect('pro')}
                      disabled={createSubscription.isPending}
                      className="w-full gradient-primary-bg neon-border-magenta hover-lift font-bold text-lg py-6"
                      data-testid="button-select-pro"
                    >
                      {createSubscription.isPending && tier === 'pro' ? (
                        <>
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                          Setting up...
                        </>
                      ) : (
                        'Choose Pro'
                      )}
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          )}
        </div>
      </div>
    );
  }

  const stripeOptions = {
    clientSecret,
    appearance: {
      theme: 'night' as const,
      variables: {
        colorPrimary: '#ff00ff',
        colorBackground: '#0a0a0a',
        colorText: '#ffffff',
        colorDanger: '#ef4444',
        fontFamily: 'Inter, system-ui, sans-serif',
        spacingUnit: '4px',
        borderRadius: '8px',
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated Neon Apex Background */}
      <div className="fixed inset-0 pointer-events-none opacity-20">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#8b5cf640_1px,transparent_1px),linear-gradient(to_bottom,#8b5cf640_1px,transparent_1px)] bg-[size:64px_64px] animate-slow-pulse"></div>
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-prism-cyan rounded-full blur-3xl opacity-10 animate-slow-pulse"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-neon-magenta rounded-full blur-3xl opacity-10 animate-slow-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      <motion.div
        className="w-full max-w-md relative z-10"
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <Card className="glass-card neon-border-magenta glow-pulse-magenta">
          <CardHeader className="text-center pb-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <CardTitle className="text-white text-3xl font-orbitron font-bold mb-2">
                COMPLETE YOUR {purchaseType === 'subscription' ? 'SUBSCRIPTION' : 'PURCHASE'}
              </CardTitle>
              <CardDescription className="text-gray-200 text-base font-semibold">
                {purchaseType === 'battles' 
                  ? '10 Battle Pack - $1.00'
                  : purchaseType === 'credits'
                  ? `${creditAmount.toLocaleString()} Credits - $${(getCreditPackage(creditAmount)?.price || 0).toFixed(2)}`
                  : (tier === 'premium' ? 'Premium Plan - $9.99/month' : 'Pro Plan - $19.99/month')}
              </CardDescription>
              <div className="mt-3">
                <span className="stat-badge">
                  {paymentMethod === 'cashapp' ? '💰 Cash App → $ILLAITHEGPTSTORE' : '💳 Credit Card Payment'}
                </span>
              </div>
            </motion.div>
          </CardHeader>
          <CardContent>
            {stripePromise ? (
              <Elements stripe={stripePromise} options={stripeOptions}>
                <PaymentForm
                  tier={tier}
                  paymentMethod={paymentMethod}
                  purchaseType={purchaseType}
                  battleCount={purchaseType === 'battles' ? 10 : undefined}
                  creditAmount={purchaseType === 'credits' ? creditAmount : undefined}
                />
              </Elements>
            ) : (
              <motion.div 
                className="text-center py-8 glass-panel rounded-lg"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5 }}
              >
                <p className="text-yellow-400 mb-4 font-semibold">Payment processing is currently unavailable.</p>
                <p className="text-gray-300 text-sm">Please contact support or try CashApp payment option.</p>
              </motion.div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
