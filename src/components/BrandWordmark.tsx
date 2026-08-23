"use client";

import React from "react";

interface BrandWordmarkProps {
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

export default function BrandWordmark({ size = "md", className = "" }: BrandWordmarkProps) {
  // Size variations in real CSS text
  const sizeClasses = {
    sm: "text-base",
    md: "text-xl sm:text-2xl",
    lg: "text-3xl sm:text-4xl",
    xl: "text-5xl sm:text-6xl",
  };

  return (
    <span
      className={`inline-flex items-baseline font-display font-bold tracking-tight text-ink lowercase select-text ${sizeClasses[size]} ${className}`}
      aria-label="kisne bheja"
    >
      <span>kisne</span>
      <span className="ml-[0.24em]">bhe</span>
      <span className="relative inline-block">
        <span
          className="absolute -top-[0.32em] left-1/2 -translate-x-1/2 text-[0.62em] font-extrabold leading-none text-ink select-none"
          aria-hidden="true"
        >
          ?
        </span>
        <span>ȷ</span>
      </span>
      <span>a</span>
    </span>
  );
}
