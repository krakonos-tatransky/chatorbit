import * as React from "react";
import { Slot } from "@/components/ui/slot";
import { cn } from "@/lib/cn";
const baseButtonClasses =
  "inline-flex items-center justify-center rounded-2xl text-sm font-medium transition active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none px-4 h-10";

const variantClasses = {
  default: "bg-black text-white hover:opacity-90",
  outline: "border border-neutral-200 hover:bg-neutral-50",
  ghost: "hover:bg-neutral-100",
};

const sizeClasses = {
  sm: "h-9 px-3",
  md: "h-10 px-4",
  lg: "h-11 px-5",
};

type ButtonVariant = keyof typeof variantClasses;
type ButtonSize = keyof typeof sizeClasses;

const buttonVariants = (options: {
  variant?: ButtonVariant;
  size?: ButtonSize;
}) => {
  const { variant = "default", size = "md" } = options;
  return cn(baseButtonClasses, variantClasses[variant], sizeClasses[size]);
};

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size }), className)}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";
