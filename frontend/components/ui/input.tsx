import * as React from "react";
import { cn } from "@/lib/cn";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "w-full h-10 rounded-xl border border-neutral-200 px-3 outline-none focus:ring-2 focus:ring-black/10",
        className
      )}
      {...props}
    />
  )
);
Input.displayName = "Input";
