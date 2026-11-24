import { Button } from "./ui/button";

type FeatureTileProps = { heading: string; body: string; cta?: string };

export const FeatureTile = ({ heading, body, cta = "Learn more" }: FeatureTileProps) => (
  <article className="rounded-xl bg-white p-5">
    <h4 className="text-lg font-semibold">{heading}</h4>
    <p className="mt-1 text-gray-600">{body}</p>
    <Button variant="ghost">{cta}</Button>
  </article>
);
