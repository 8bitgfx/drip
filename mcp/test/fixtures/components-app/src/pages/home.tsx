import { PricingCard } from "../components/pricing-card";
import { PlanCard } from "../components/plan-card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Badge } from "../components/badge";

export function Home() {
  return (
    <main>
      <Badge>New</Badge>
      <PricingCard title="Pro" price={19} features={["Unlimited", "Support"]} onSelect={() => {}} />
      <PlanCard name="Team" cost={49} perks={["Seats", "SSO"]} onPick={() => {}} />
      <Input label="Email" />
      <Button>Start</Button>
    </main>
  );
}
