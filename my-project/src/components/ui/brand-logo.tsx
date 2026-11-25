import React from "react";

interface BrandLogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  showText?: boolean;
  subtitle?: string;
  className?: string;
  theme?: "dark" | "light";
}

export function BrandLogo({
  size = "md",
  showText = true,
  subtitle,
  className = "",
  theme = "dark",
}: BrandLogoProps) {
  // Dimensions
  const iconDimensions = {
    sm: "h-8 w-8",
    md: "h-10 w-10",
    lg: "h-12 w-12",
    xl: "h-14 w-14",
  }[size];

  const textSizes = {
    sm: "text-base",
    md: "text-lg",
    lg: "text-xl",
    xl: "text-2xl",
  }[size];

  const isDark = theme === "dark";

  return (
    <div className={`inline-flex items-center gap-3 select-none ${className}`}>
      {/* Precision Geometric SVG Icon Mark */}
      <div
        className={`relative flex shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-lime-300 via-emerald-400 to-teal-500 p-0.5 shadow-lg shadow-lime-300/20 transition-transform duration-200 hover:scale-105 ${iconDimensions}`}
      >
        <div className="flex h-full w-full items-center justify-center rounded-[14px] bg-[#0E271F]">
          <svg
            viewBox="0 0 32 32"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
          >
            <defs>
              <linearGradient id="ff-glow" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
                <stop stopColor="#BEF264" />
                <stop offset="0.5" stopColor="#34D399" />
                <stop offset="1" stopColor="#10B981" />
              </linearGradient>
              <linearGradient id="ff-accent" x1="32" y1="0" x2="0" y2="32" gradientUnits="userSpaceOnUse">
                <stop stopColor="#A3E635" />
                <stop offset="1" stopColor="#059669" />
              </linearGradient>
            </defs>
            {/* Primary Flow Stem */}
            <path
              d="M7 6C7 4.89543 7.89543 4 9 4H22C23.1046 4 24 4.89543 24 6V8C24 9.10457 23.1046 10 22 10H13V13H20C21.1046 13 22 13.8954 22 15V17C22 18.1046 21.1046 19 20 19H13V26C13 27.1046 12.1046 28 11 28H9C7.89543 28 7 27.1046 7 26V6Z"
              fill="url(#ff-glow)"
            />
            {/* Interlocking Dynamic Flow Accent */}
            <path
              d="M17 19C17 17.8954 17.8954 17 19 17H24C25.1046 17 26 17.8954 26 19V21C26 22.1046 25.1046 23 24 23H19C17.8954 23 17 22.1046 17 21V19Z"
              fill="url(#ff-accent)"
              opacity="0.85"
            />
            <circle cx="23" cy="8" r="2" fill="#0E271F" />
          </svg>
        </div>
      </div>

      {/* Typography Wordmark */}
      {showText && (
        <div className="flex flex-col">
          <span
            className={`font-extrabold tracking-tight ${textSizes} ${
              isDark ? "text-white" : "text-[#102B22]"
            }`}
          >
            FreelanceFlow
          </span>
          {subtitle && (
            <span
              className={`text-[10px] font-bold uppercase tracking-[0.2em] ${
                isDark ? "text-lime-300" : "text-emerald-700"
              }`}
            >
              {subtitle}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
