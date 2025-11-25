import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Shield, CheckCircle, XCircle, DollarSign, MapPin, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { SEO } from "@/components/SEO";

interface SafetySettings {
  ageVerificationStatus: string;
  isMinor: boolean;
  tosAcceptedAt: string | null;
  tosVersion: string | null;
  dailySpendLimitUSDC: string;
  perTxLimitUSDC: string;
  dailySpendUsedUSDC: string;
  moderationOptIn: boolean;
  preferredJurisdiction: string | null;
  ttsProvider: string;
}

export default function SafetyCenter() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery<SafetySettings>({
    queryKey: ["/api/user/safety-settings"],
  });

  const [dailyLimit, setDailyLimit] = useState<number[]>([50]);
  const [perTxLimit, setPerTxLimit] = useState<number[]>([25]);
  const [moderationEnabled, setModerationEnabled] = useState(true);

  // Update spending limits mutation
  const updateLimitsMutation = useMutation({
    mutationFn: async (limits: { dailyLimit: string; perTxLimit: string }) => {
      const response = await apiRequest("POST", "/api/user/spending-limits", limits);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Limits Updated",
        description: "Your spending limits have been updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/user/safety-settings"] });
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update spending limits",
        variant: "destructive",
      });
    },
  });

  // Update moderation preference
  const updateModerationMutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      const response = await apiRequest("POST", "/api/user/moderation-preference", { moderationOptIn: enabled });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Preference Updated",
        description: "Content moderation preference updated",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/user/safety-settings"] });
    },
  });

  const handleSaveLimits = () => {
    updateLimitsMutation.mutate({
      dailyLimit: dailyLimit[0].toString(),
      perTxLimit: perTxLimit[0].toString(),
    });
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 max-w-4xl">
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      </div>
    );
  }

  return (
    <>
      <SEO 
        title="Safety Center" 
        description="Manage your safety and privacy settings for Battle Rap AI" 
      />
      
      <div className="container mx-auto py-8 max-w-4xl space-y-6">
        <div className="flex items-center gap-3">
          <Shield className="w-8 h-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Safety Center</h1>
            <p className="text-muted-foreground">
              Manage your safety, privacy, and spending controls
            </p>
          </div>
        </div>

        {/* Age Verification Status */}
        <Card data-testid="card-age-verification">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Age Verification</span>
              {settings?.ageVerificationStatus === "verified" ? (
                <Badge className="bg-green-500" data-testid="badge-verified">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Verified
                </Badge>
              ) : (
                <Badge variant="destructive" data-testid="badge-unverified">
                  <XCircle className="w-3 h-3 mr-1" />
                  Unverified
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              Required to participate in competitive stake battles with real money
            </CardDescription>
          </CardHeader>
          <CardContent>
            {settings?.ageVerificationStatus === "verified" ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>You are verified to participate in competitive stake battles</span>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  You must verify your age to participate in battles involving real money
                </p>
                <Button data-testid="button-verify-age">
                  Verify Age Now
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Spending Limits */}
        <Card data-testid="card-spending-limits">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              Spending Limits
            </CardTitle>
            <CardDescription>
              Control how much USDC you can spend on battles and tournaments
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {settings?.dailySpendUsedUSDC && (
              <div className="p-4 bg-muted rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Today's Spending</span>
                  <span className="text-lg font-bold" data-testid="text-daily-spent">
                    ${parseFloat(settings.dailySpendUsedUSDC).toFixed(2)} / ${parseFloat(settings.dailySpendLimitUSDC).toFixed(2)}
                  </span>
                </div>
                <div className="w-full bg-background rounded-full h-2">
                  <div
                    className="bg-primary h-2 rounded-full transition-all"
                    style={{
                      width: `${Math.min(
                        (parseFloat(settings.dailySpendUsedUSDC) /
                          parseFloat(settings.dailySpendLimitUSDC)) *
                          100,
                        100
                      )}%`,
                    }}
                  />
                </div>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium mb-3 block">
                  Daily Spending Limit: ${dailyLimit[0].toFixed(2)}
                </Label>
                <Slider
                  value={dailyLimit}
                  onValueChange={setDailyLimit}
                  min={10}
                  max={500}
                  step={5}
                  data-testid="slider-daily-limit"
                />
                <p className="text-xs text-muted-foreground mt-2">
                  Maximum amount you can spend per day (resets at midnight)
                </p>
              </div>

              <Separator />

              <div>
                <Label className="text-sm font-medium mb-3 block">
                  Per-Transaction Limit: ${perTxLimit[0].toFixed(2)}
                </Label>
                <Slider
                  value={perTxLimit}
                  onValueChange={setPerTxLimit}
                  min={1}
                  max={100}
                  step={1}
                  data-testid="slider-per-tx-limit"
                />
                <p className="text-xs text-muted-foreground mt-2">
                  Maximum amount for a single transaction
                </p>
              </div>
            </div>

            <Button 
              onClick={handleSaveLimits}
              disabled={updateLimitsMutation.isPending}
              data-testid="button-save-limits"
            >
              {updateLimitsMutation.isPending ? "Saving..." : "Save Limits"}
            </Button>
          </CardContent>
        </Card>

        {/* Content Moderation */}
        <Card data-testid="card-moderation">
          <CardHeader>
            <CardTitle>Content Moderation</CardTitle>
            <CardDescription>
              Automatically filter inappropriate content and profanity
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="moderation-toggle" className="font-medium">
                  Enable Content Filtering
                </Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Uses AI to detect and filter harmful content
                </p>
              </div>
              <Switch
                id="moderation-toggle"
                checked={moderationEnabled}
                onCheckedChange={(checked) => {
                  setModerationEnabled(checked);
                  updateModerationMutation.mutate(checked);
                }}
                data-testid="switch-moderation"
              />
            </div>
          </CardContent>
        </Card>

        {/* Jurisdiction */}
        {settings?.preferredJurisdiction && (
          <Card data-testid="card-jurisdiction">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                Jurisdiction
              </CardTitle>
              <CardDescription>
                Your location determines age requirements and availability
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Current Location:</span>
                <Badge variant="outline" data-testid="badge-jurisdiction">
                  {settings.preferredJurisdiction}
                </Badge>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Terms of Service */}
        <Card data-testid="card-tos">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Terms of Service
            </CardTitle>
            <CardDescription>
              Legal agreements and privacy policies
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {settings?.tosAcceptedAt ? (
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className="text-muted-foreground">
                  Accepted on {new Date(settings.tosAcceptedAt).toLocaleDateString()}
                  {settings.tosVersion && ` (v${settings.tosVersion})`}
                </span>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                You have not accepted the Terms of Service
              </p>
            )}
            <Button variant="outline" data-testid="button-view-tos">
              View Terms of Service
            </Button>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
