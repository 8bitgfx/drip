import * as React from "react";

type InputProps = {
  label: string;
  invalid?: boolean;
  density?: "compact" | "comfortable";
} & React.InputHTMLAttributes<HTMLInputElement>;

export function Input({ label, invalid, density = "comfortable", ...rest }: InputProps) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span>{label}</span>
      <input aria-invalid={invalid} className={density === "compact" ? "h-8 px-2" : "h-10 px-3"} {...rest} />
    </label>
  );
}
