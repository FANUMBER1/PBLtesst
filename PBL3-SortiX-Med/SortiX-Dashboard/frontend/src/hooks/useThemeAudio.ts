"use client";

import { useState, useEffect, useCallback } from "react";
import { ThemeMode } from "@/lib/types";
import { industrialAudio } from "@/lib/audioService";

export function useThemeAudio() {
  const [themeMode, setThemeMode] = useState<ThemeMode>("light");
  const [isMuted, setIsMuted] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    const savedTheme = localStorage.getItem("pbl3_theme_mode") as ThemeMode | null;
    setThemeMode(savedTheme === "dark" ? "dark" : "light");

    const savedMuted = localStorage.getItem("pbl3_sound_muted") === "true";
    setIsMuted(savedMuted);
    industrialAudio.setMuted(savedMuted);
  }, []);

  useEffect(() => {
    if (!isClient) return;
    const root = document.documentElement;
    if (themeMode === "light") {
      root.classList.remove("dark");
      root.classList.add("light");
    } else {
      root.classList.remove("light");
      root.classList.add("dark");
    }
    localStorage.setItem("pbl3_theme_mode", themeMode);
  }, [themeMode, isClient]);

  const toggleTheme = useCallback(() => {
    industrialAudio.playClick();
    setThemeMode((prev) => (prev === "dark" ? "light" : "dark"));
  }, []);

  const handleToggleSound = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      industrialAudio.setMuted(next);
      localStorage.setItem("pbl3_sound_muted", String(next));
      if (!next) industrialAudio.playClick();
      return next;
    });
  }, []);

  return {
    themeMode,
    toggleTheme,
    isMuted,
    handleToggleSound,
  };
}
