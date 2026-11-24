import { Button } from "./ui/button";

interface PlanCardProps {
  name: string;
  cost: number;
  perks: string[];
  featured?: boolean;
  onPick: () => void;
}

export function PlanCard({ name, cost, perks, featured, onPick }: PlanCardProps) {
  const rows = perks.filter((p) => p.trim().length > 0).map((p, n) => (
    <li key={n} className="flex items-center gap-2 text-sm text-gray-700">
      <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
      {p}
    </li>
  ));
  return (
    <div className={featured ? "rounded-2xl border-2 border-blue-500 p-6 shadow-lg" : "rounded-2xl border p-6 shadow-sm"}>
      <h3 className="text-xl font-semibold">{name}</h3>
      <p className="mt-2 text-4xl font-bold">${cost}<span className="text-base font-normal">/mo</span></p>
      <ul className="mt-4 flex flex-col gap-2">{rows}</ul>
      <Button variant={featured ? "primary" : "secondary"} size="lg" onClick={onPick}>
        Choose {name}
      </Button>
    </div>
  );
}
