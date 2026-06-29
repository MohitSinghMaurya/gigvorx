// frontend/src/components/LockedFeature.jsx
// Use this anywhere you want to block a feature behind a plan
// Example usage:
//   <LockedFeature feature="AI Brief" requiredPlan="Premium" locked={!isPro}>
//     <YourComponent />
//   </LockedFeature>

import { Lock, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export function LockedFeature({ feature, requiredPlan = "Premium", locked = false, children }) {
  const navigate = useNavigate();

  // If not locked, just show the children normally
  if (!locked) return children;

  // If locked, show upgrade prompt instead
  return (
    <div className="rounded-xl border-2 border-dashed border-amber-300 bg-amber-50 p-8 text-center">
      <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
        <Lock className="w-6 h-6 text-amber-600" />
      </div>
      <h3 className="font-bold text-lg text-foreground mb-2">
        {feature}
      </h3>
      <p className="text-sm text-muted-foreground mb-5 max-w-xs mx-auto">
        This feature is available on the <strong>{requiredPlan}</strong> plan.
        Upgrade to unlock it and continue using GigVorx without limits.
      </p>
      <Button
        onClick={() => navigate("/pricing-app")}
        className="bg-amber-500 hover:bg-amber-600 text-white"
      >
        <Crown className="w-4 h-4 mr-2" />
        Upgrade to {requiredPlan}
      </Button>
      <p className="text-xs text-muted-foreground mt-3">
        Cancel anytime. No hidden fees.
      </p>
    </div>
  );
}

export default LockedFeature;