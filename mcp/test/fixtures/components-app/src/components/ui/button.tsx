import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

export const buttonVariants = cva("inline-flex items-center justify-center rounded-[var(--radius-md)] font-medium transition-colors focus-visible:outline-2", {
  variants: {
    variant: {
      primary: "bg-[var(--color-primary)] text-white",
      secondary: "bg-white text-[var(--color-ink)] border",
      ghost: "bg-transparent text-[var(--color-ink)]",
    },
    size: { sm: "h-8 px-3 text-sm", md: "h-10 px-4", lg: "h-12 px-6 text-lg" },
  },
  defaultVariants: { variant: "primary", size: "md" },
});

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  loading?: boolean;
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button({ variant, size, loading, className, children, ...rest }, ref) {
  return (
    <button ref={ref} className={buttonVariants({ variant, size, className })} aria-busy={loading || undefined} {...rest}>
      {children}
    </button>
  );
});
