"use client";

import React from "react";

interface SortixLogoProps {
  collapsed?: boolean;
  className?: string;
  size?: "sm" | "md" | "lg";
}

export const SortixLogo: React.FC<SortixLogoProps> = ({
  collapsed = false,
  className = "",
  size = "md",
}) => {
  const iconSizeClass =
    size === "sm" ? "h-8 w-8" : size === "lg" ? "h-12 w-12" : "h-10 w-10";

  return (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      {/* 3D Isometric Cyber-Sorting Logo Mark */}
      <div
        className={`relative flex ${iconSizeClass} shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#121624] via-[#0d101d] to-[#070911] border border-cyan-500/30 shadow-[0_0_20px_rgba(6,182,212,0.2)] transition-all duration-300 group hover:border-cyan-400/60 hover:shadow-[0_0_25px_rgba(6,182,212,0.4)]`}
      >
        {/* Ambient Radial Glow */}
        <div className="absolute inset-0 rounded-xl bg-radial from-cyan-500/10 via-transparent to-transparent opacity-75 pointer-events-none" />

        {/* Custom High-Tech Isometric Tri-Cube SVG */}
        <svg
          viewBox="0 0 36 36"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="h-6 w-6 transform transition-transform duration-300 group-hover:scale-105"
        >
          <defs>
            <linearGradient id="topFacetGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="100%" stopColor="#06b6d4" />
            </linearGradient>
            <linearGradient id="leftFacetGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#6366f1" />
              <stop offset="100%" stopColor="#4338ca" />
            </linearGradient>
            <linearGradient id="rightFacetGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0ea5e9" />
              <stop offset="100%" stopColor="#0284c7" />
            </linearGradient>
            <filter id="coreGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="1.5" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Top Cube Isometric */}
          <g transform="translate(0, -1)">
            {/* Top Face */}
            <path
              d="M18 4L26 8.5L18 13L10 8.5L18 4Z"
              fill="url(#topFacetGrad)"
              stroke="#67e8f9"
              strokeWidth="0.75"
              strokeLinejoin="round"
            />
            {/* Left Face */}
            <path
              d="M10 8.5L18 13V21L10 16.5V8.5Z"
              fill="url(#leftFacetGrad)"
              stroke="#818cf8"
              strokeWidth="0.75"
              strokeLinejoin="round"
            />
            {/* Right Face */}
            <path
              d="M18 13L26 8.5V16.5L18 21V13Z"
              fill="url(#rightFacetGrad)"
              stroke="#38bdf8"
              strokeWidth="0.75"
              strokeLinejoin="round"
            />
          </g>

          {/* Bottom Left Satellite Node */}
          <path
            d="M6 21L11 18L16 21L11 24L6 21Z"
            fill="#06b6d4"
            fillOpacity="0.85"
            stroke="#22d3ee"
            strokeWidth="0.5"
          />
          <path
            d="M6 21L11 24V28L6 25V21Z"
            fill="#3b82f6"
            stroke="#60a5fa"
            strokeWidth="0.5"
          />
          <path
            d="M11 24L16 21V25L11 28V24Z"
            fill="#1d4ed8"
            stroke="#3b82f6"
            strokeWidth="0.5"
          />

          {/* Bottom Right Satellite Node */}
          <path
            d="M20 21L25 18L30 21L25 24L20 21Z"
            fill="#22d3ee"
            fillOpacity="0.85"
            stroke="#67e8f9"
            strokeWidth="0.5"
          />
          <path
            d="M20 21L25 24V28L20 25V21Z"
            fill="#0284c7"
            stroke="#38bdf8"
            strokeWidth="0.5"
          />
          <path
            d="M25 24L30 21V25L25 28V24Z"
            fill="#0369a1"
            stroke="#0284c7"
            strokeWidth="0.5"
          />

          {/* Center Optical Sensor Core */}
          <circle cx="18" cy="18" r="2.2" fill="#38bdf8" filter="url(#coreGlow)" />
          <circle cx="18" cy="18" r="1" fill="#ffffff" />
        </svg>

        {/* Live Active Status Ring Indicator */}
        <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-60" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-500 border border-[#0d101d]" />
        </span>
      </div>

      {/* Brand Text & Badge (Hidden when Sidebar collapsed) */}
      {!collapsed && (
        <div className="min-w-0 flex-1 overflow-hidden">
          <div className="flex items-center gap-1.5">
            <h2 className="truncate text-base font-black tracking-tight text-slate-900 dark:text-white flex items-center">
              <span>Sorti</span>
              <span className="relative inline-block text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-teal-300 to-sky-400 drop-shadow-[0_0_8px_rgba(6,182,212,0.4)]">
                X
              </span>
              <span className="text-cyan-500 font-extrabold ml-0.5">-Med</span>
            </h2>
            {/* Badge Nhóm 5 (thay thế MED AI PRO theo yêu cầu) */}
            <span
              data-tier="AI PRO"
              className="inline-flex items-center gap-1 rounded-md bg-gradient-to-r from-cyan-500/15 to-blue-500/15 border border-cyan-500/30 px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wide text-cyan-500 dark:text-cyan-300 shadow-xs"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
              NHÓM 5
            </span>
          </div>
          <p
            className="text-[8px] font-bold tracking-tight text-slate-500 dark:text-slate-400 whitespace-nowrap overflow-visible leading-tight select-none mt-0.5"
            title="BĂNG CHUYỀN PHÂN LOẠI DỤNG CỤ Y TẾ"
          >
            BĂNG CHUYỀN PHÂN LOẠI DỤNG CỤ Y TẾ
          </p>
        </div>
      )}
    </div>
  );
};
