import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]",
  {
    variants: {
      variant: {
        default:
          "bg-cyan-500 text-slate-950 font-semibold shadow-md shadow-cyan-500/20 hover:bg-cyan-400",
        destructive:
          "bg-rose-600 text-white shadow-md shadow-rose-600/30 hover:bg-rose-500 active:bg-rose-700",
        outline:
          "border border-slate-200 bg-transparent hover:bg-slate-100 hover:text-slate-900 dark:border-white/10 dark:hover:bg-white/5 dark:text-slate-200",
        secondary:
          "bg-slate-100 text-slate-900 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700",
        ghost:
          "hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-white/5 dark:hover:text-slate-100",
        link: "text-cyan-500 underline-offset-4 hover:underline",
        estop:
          "bg-gradient-to-b from-rose-500 to-rose-700 text-white font-bold tracking-wider shadow-lg shadow-rose-600/40 hover:from-rose-400 hover:to-rose-600 border border-rose-400/40 active:scale-95",
        emerald:
          "bg-emerald-500 text-slate-950 font-semibold shadow-md shadow-emerald-500/25 hover:bg-emerald-400",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-8 rounded-lg px-3 text-xs",
        lg: "h-12 rounded-xl px-8 text-base",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
