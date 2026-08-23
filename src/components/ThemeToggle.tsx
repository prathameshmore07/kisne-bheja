"use client";

import { useEffect, useState } from "react";

export default function ThemeToggle() {
  const [isDark, setIsDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem("kisne-bheja-theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const shouldBeDark = saved === "dark" || (!saved && prefersDark);
    setIsDark(shouldBeDark);
    if (shouldBeDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, []);

  function toggleTheme() {
    const next = !isDark;
    setIsDark(next);
    if (next) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("kisne-bheja-theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("kisne-bheja-theme", "light");
    }
  }

  if (!mounted) {
    return <div className="w-7 h-7" />;
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="w-7 h-7 rounded border border-line flex items-center justify-center text-xs font-mono text-muted hover:text-ink hover:border-ink transition-colors cursor-pointer bg-paper"
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      aria-label="Toggle dark mode"
    >
      {isDark ? "☼" : "☾"}
    </button>
  );
}
