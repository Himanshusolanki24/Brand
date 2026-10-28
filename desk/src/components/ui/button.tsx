"use client";

import clsx from "clsx";
import { forwardRef, type ButtonHTMLAttributes } from "react";

type Variant = "primary" | "approve" | "outline" | "ghost" | "danger";
type Size = "sm" | "md";

const variants: Record<Variant, string> = {
  primary: "bg-ink text-paper border border-ink hover:bg-ink/85 active:bg-ink",
  approve: "bg-keep text-white border border-keep hover:bg-keep/85 active:bg-keep",
  outline: "bg-sheet text-ink border border-line-strong hover:border-ink active:border-ink",
  ghost: "text-ink-soft border border-transparent hover:text-ink hover:bg-ink/5",
  danger: "text-flag border border-transparent hover:bg-flag-wash",
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
          "transition-[background-color,border-color,color,box-shadow,transform] duration-200",
          "[transition-timing-function:var(--ease-settle)] active:scale-[0.98]",
          "disabled:cursor-not-allowed disabled:opacity-40",
          variants[variant],
          sizes[size],
          className,
        )}
        {...props}
      />
    );
  },
);
