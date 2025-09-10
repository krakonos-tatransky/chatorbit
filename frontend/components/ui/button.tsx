import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-2xl text-sm font-medium transition active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none px-4 h-10",
  {
    variants: {
      variant: {
        default: "bg-black text-white hover:opacity-90",
        outline: "border border-neutral-200 hover:bg-neutral-50",
        ghost: "hover:bg-neutral-100",
      },
      size: { sm: "h-9 px-3", md: "h-10 px-4", lg: "h-11 px-5" },
    },
    defaultVariants: { variant: "default", size: "md" },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
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
