"use client";

import clsx from "clsx";
import { forwardRef, type ButtonHTMLAttributes } from "react";

type Variant = "primary" | "approve" | "outline" | "ghost" | "danger";
type Size = "sm" | "md";

const variants: Record<Variant, string> = {
  primary: "bg-ink text-paper border border-ink hover:bg-[#2A3A59] active:bg-ink",
  approve: "bg-greenink text-white border border-greenink hover:bg-[#175439] active:bg-greenink",
  outline: "bg-sheet text-ink border border-line-strong hover:border-ink active:border-ink",
  ghost: "text-ink-soft border border-transparent hover:text-ink hover:bg-ink/5",
  danger: "text-redpen border border-transparent hover:bg-redpen-wash",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-[13px]",
  md: "h-10 px-4 text-sm",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button({ variant = "primary", size = "md", className, type, ...props }, ref) {
    return (
      <button
        ref={ref}
        type={type ?? "button"}
        className={clsx(
          "inline-flex items-center justify-center gap-1.5 rounded-md font-medium",
          "transition-colors disabled:cursor-not-allowed disabled:opacity-40",
          variants[variant],
          sizes[size],
          className,
        )}
        {...props}
      />
    );
  },
);
