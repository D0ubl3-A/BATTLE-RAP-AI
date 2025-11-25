import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Shield, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface AgeGateProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  requiredAge?: number;
}

export function AgeGate({ 
  open, 
  onOpenChange, 
  onSuccess,
  requiredAge = 18 
}: AgeGateProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [month, setMonth] = useState("");
  const [day, setDay] = useState("");
  const [year, setYear] = useState("");
  const [confirmAge, setConfirmAge] = useState(false);
  const [acceptToS, setAcceptToS] = useState(false);
  const [understandMoney, setUnderstandMoney] = useState(false);

  const verifyAgeMutation = useMutation({
    mutationFn: async (birthDate: string) => {
      const response = await apiRequest("POST", "/api/user/verify-age", { birthDate });
      return response.json();
    },
    onSuccess: (data) => {
      if (data.verified) {
        toast({
          title: "Age Verified",
          description: "You can now participate in competitive stake battles",
        });
        queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
        queryClient.invalidateQueries({ queryKey: ["/api/user/safety-settings"] });
        onSuccess?.();
        onOpenChange(false);
        resetForm();
      } else {
        toast({
          title: "Verification Failed",
          description: data.message || "You must be of legal age to participate",
          variant: "destructive",
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Verification Error",
        description: error.message || "Failed to verify age",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setMonth("");
    setDay("");
    setYear("");
    setConfirmAge(false);
    setAcceptToS(false);
    setUnderstandMoney(false);
  };

  const handleVerify = () => {
    // Validate inputs
    const monthNum = parseInt(month);
    const dayNum = parseInt(day);
    const yearNum = parseInt(year);

    if (!month || !day || !year) {
      toast({
        title: "Incomplete Date",
        description: "Please enter your complete birth date",
        variant: "destructive",
      });
      return;
    }

    if (monthNum < 1 || monthNum > 12) {
      toast({
        title: "Invalid Month",
        description: "Please enter a valid month (1-12)",
        variant: "destructive",
      });
      return;
    }

    if (dayNum < 1 || dayNum > 31) {
      toast({
        title: "Invalid Day",
        description: "Please enter a valid day (1-31)",
        variant: "destructive",
      });
      return;
    }

    if (yearNum < 1900 || yearNum > new Date().getFullYear()) {
      toast({
        title: "Invalid Year",
        description: "Please enter a valid year",
        variant: "destructive",
      });
      return;
    }

    if (!confirmAge || !acceptToS || !understandMoney) {
      toast({
        title: "Acknowledgment Required",
        description: "Please check all required boxes",
        variant: "destructive",
      });
      return;
    }

    // Format date as ISO string
    const birthDate = new Date(yearNum, monthNum - 1, dayNum).toISOString();
    verifyAgeMutation.mutate(birthDate);
  };

  const handleCancel = () => {
    resetForm();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(newOpen) => {
      if (!newOpen) handleCancel();
    }}>
      <DialogContent className="max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 bg-primary/10 rounded-full">
              <Shield className="w-6 h-6 text-primary" data-testid="icon-shield" />
            </div>
            <DialogTitle className="text-xl">🔞 Age Verification Required</DialogTitle>
          </div>
          <DialogDescription className="text-base">
            To participate in competitive stake battles, you must be <strong>{requiredAge}+</strong> years old
            {requiredAge > 18 && " (21+ in some regions)"}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Birth Date Input */}
          <div>
            <Label className="text-sm font-medium mb-2 block">Birth Date</Label>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <Input
                  type="number"
                  placeholder="MM"
                  value={month}
                  onChange={(e) => setMonth(e.target.value)}
                  min="1"
                  max="12"
                  maxLength={2}
                  data-testid="input-month"
                />
                <Label className="text-xs text-muted-foreground mt-1">Month</Label>
              </div>
              <div>
                <Input
                  type="number"
                  placeholder="DD"
                  value={day}
                  onChange={(e) => setDay(e.target.value)}
                  min="1"
                  max="31"
                  maxLength={2}
                  data-testid="input-day"
                />
                <Label className="text-xs text-muted-foreground mt-1">Day</Label>
              </div>
              <div>
                <Input
                  type="number"
                  placeholder="YYYY"
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  min="1900"
                  max={new Date().getFullYear()}
                  maxLength={4}
                  data-testid="input-year"
                />
                <Label className="text-xs text-muted-foreground mt-1">Year</Label>
              </div>
            </div>
          </div>

          {/* Checkboxes */}
          <div className="space-y-3 border rounded-lg p-4 bg-muted/30">
            <div className="flex items-start gap-3">
              <Checkbox
                id="confirm-age"
                checked={confirmAge}
                onCheckedChange={(checked) => setConfirmAge(checked as boolean)}
                data-testid="checkbox-confirm-age"
              />
              <Label htmlFor="confirm-age" className="text-sm cursor-pointer leading-tight">
                I confirm I am of legal age to participate in this activity
              </Label>
            </div>

            <div className="flex items-start gap-3">
              <Checkbox
                id="accept-tos"
                checked={acceptToS}
                onCheckedChange={(checked) => setAcceptToS(checked as boolean)}
                data-testid="checkbox-accept-tos"
              />
              <Label htmlFor="accept-tos" className="text-sm cursor-pointer leading-tight">
                I have read and accept the Terms of Service
              </Label>
            </div>

            <div className="flex items-start gap-3">
              <Checkbox
                id="understand-money"
                checked={understandMoney}
                onCheckedChange={(checked) => setUnderstandMoney(checked as boolean)}
                data-testid="checkbox-understand-money"
              />
              <Label htmlFor="understand-money" className="text-sm cursor-pointer leading-tight">
                I understand competitive stake battles involve <strong>real money</strong>
              </Label>
            </div>
          </div>

          {/* Warning */}
          <div className="flex items-start gap-2 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
            <AlertCircle className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
            <p className="text-sm text-muted-foreground">
              Age verification is required by law. Your information is stored securely and 
              you will not be asked to verify again.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button 
            variant="outline" 
            onClick={handleCancel}
            disabled={verifyAgeMutation.isPending}
            data-testid="button-cancel"
          >
            Cancel
          </Button>
          <Button
            onClick={handleVerify}
            disabled={verifyAgeMutation.isPending}
            data-testid="button-verify"
          >
            {verifyAgeMutation.isPending ? "Verifying..." : "Verify Age"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
