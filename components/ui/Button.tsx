import React from "react";
import { Loader2 } from "lucide-react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "accent" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg" | "xl";
  loading?: boolean;
  asChild?: boolean;
}

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  className = "",
  children,
  disabled,
  ...props
}: ButtonProps) {
  const variantClass = {
    primary: "at-btn-primary",
    secondary: "at-btn-secondary",
    accent: "at-btn-accent",
    outline: "at-btn-outline",
    ghost: "at-btn-ghost",
    danger: "at-btn-danger",
  }[variant];

  const sizeClass = {
    sm: "at-btn-sm",
    md: "",
    lg: "at-btn-lg",
    xl: "at-btn-xl",
  }[size];

  return (
    <button
      className={`at-btn ${variantClass} ${sizeClass} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Loader2 size={16} className="at-spinner" />}
      {children}
    </button>
  );
}
