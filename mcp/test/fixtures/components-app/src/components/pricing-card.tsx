import { Button } from "./ui/button";

interface PricingCardProps {
  title: string;
  price: number;
  features: string[];
  highlighted?: boolean;
  onSelect: () => void;
}

export function PricingCard({ title, price, features, highlighted, onSelect }: PricingCardProps) {
  const items = features.filter((f) => f.trim().length > 0).map((f, i) => (
    <li key={i} className="flex items-center gap-2 text-sm text-gray-700">
      <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
      {f}
    </li>
  ));
  return (
    <div className={highlighted ? "rounded-2xl border-2 border-blue-500 p-6 shadow-lg" : "rounded-2xl border p-6 shadow-sm"}>
      <h3 className="text-xl font-semibold">{title}</h3>
      <p className="mt-2 text-4xl font-bold">${price}<span className="text-base font-normal">/mo</span></p>
      <ul className="mt-4 flex flex-col gap-2">{items}</ul>
      <Button variant={highlighted ? "primary" : "secondary"} size="lg" onClick={onSelect}>
        Choose {title}
      </Button>
    </div>
  );
}
