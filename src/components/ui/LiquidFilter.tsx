import { memo } from "react";

export const LiquidFilter = memo(() => (
  <svg className="absolute w-0 h-0 overflow-hidden pointer-events-none visibility-hidden" aria-hidden="true">
    <defs>
      <filter id="liquid-filter">
        <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur" />
        <feColorMatrix
          in="blur"
          mode="matrix"
          values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 24 -10"
          result="liquid"
        />
        <feBlend in="SourceGraphic" in2="liquid" />
      </filter>

      <filter id="glass-inner-shadow">
        <feDropShadow
          dx="0"
          dy="4"
          stdDeviation="4"
          floodOpacity="0.1"
          floodColor="black"
        />
        <feGaussianBlur in="SourceGraphic" stdDeviation="0.04" result="blur" />
        <feDisplacementMap
          in="blur"
          in2="SourceGraphic"
          scale="0.5"
          xChannelSelector="R"
          yChannelSelector="G"
        />
      </filter>
    </defs>
  </svg>
));

LiquidFilter.displayName = "LiquidFilter";

