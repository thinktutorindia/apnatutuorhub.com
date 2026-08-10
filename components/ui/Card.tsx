import React from "react";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "elevated" | "interactive" | "flat";
  padding?: "none" | "sm" | "md" | "lg";
}

export function Card({
  variant = "default",
  padding = "md",
  className = "",
  children,
  ...props
}: CardProps) {
  const variantClass = {
    default: "at-card",
    elevated: "at-card-elevated",
    interactive: "at-card-interactive",
    flat: "bg-white rounded-xl",
  }[variant];

  const paddingClass = {
    none: "",
    sm: "p-4",
    md: "p-5",
    lg: "p-6",
  }[padding];

  return (
    <div className={`${variantClass} ${paddingClass} ${className}`} {...props}>
      {children}
    </div>
  );
}
