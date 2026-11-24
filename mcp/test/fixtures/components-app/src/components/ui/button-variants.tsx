import { Button } from "./button";

export function PrimaryButton(props: { children: string }) {
  return <Button variant="primary">{props.children}</Button>;
}

export function GhostButton(props: { children: string }) {
  return <Button variant="ghost">{props.children}</Button>;
}
