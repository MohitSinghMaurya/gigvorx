import { Crown, Lock } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";

export function LockedFeature({
  feature = "This feature",
  requiredPlan = "Premium",
  locked = false,
  children,
}) {
  const navigate = useNavigate();

  if (!locked) return children;

  return (
    <div className="rounded-xl border-2 border-dashed border-amber-300 bg-amber-50 p-8 text-center">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
        <Lock className="h-6 w-6 text-amber-600" />
      </div>

      <h3 className="mb-2 text-lg font-bold text-foreground">{feature}</h3>

      <p className="mx-auto mb-5 max-w-xs text-sm text-muted-foreground">
        This feature is available on the <strong>{requiredPlan}</strong> plan.
        Upgrade to unlock it and continue using GigVorx after your trial.
      </p>

      <Button
        type="button"
        onClick={() => navigate("/pricing-app")}
        className="bg-amber-500 text-white hover:bg-amber-600"
      >
        <Crown className="mr-2 h-4 w-4" />
        Upgrade to {requiredPlan}
      </Button>

      <p className="mt-3 text-xs text-muted-foreground">
        All new users get a 7-day trial. Cancel anytime.
      </p>
    </div>
  );
}

export default LockedFeature;