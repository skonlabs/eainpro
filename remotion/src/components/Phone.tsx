import React from "react";
import { COLORS } from "../theme";

export const Phone: React.FC<{
  children: React.ReactNode;
  width?: number;
  height?: number;
  style?: React.CSSProperties;
}> = ({ children, width = 460, height = 920, style }) => {
  return (
    <div
      style={{
        width,
        height,
        borderRadius: 56,
        background: "#0a0a0a",
        padding: 14,
        boxShadow:
          "0 50px 120px rgba(0,0,0,0.55), 0 0 0 2px rgba(255,255,255,0.06) inset",
        ...style,
      }}
    >
      <div
        style={{
          width: "100%",
          height: "100%",
          borderRadius: 44,
          background: COLORS.cream,
          overflow: "hidden",
          position: "relative",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Notch */}
        <div
          style={{
            position: "absolute",
            top: 14,
            left: "50%",
            transform: "translateX(-50%)",
            width: 120,
            height: 28,
            borderRadius: 20,
            background: "#0a0a0a",
            zIndex: 5,
          }}
        />
        {children}
      </div>
    </div>
  );
};

export const StatusBar: React.FC = () => (
  <div
    style={{
      height: 56,
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "0 36px",
      fontSize: 16,
      fontWeight: 600,
      color: COLORS.ink,
    }}
  >
    <span>9:41</span>
    <span style={{ display: "flex", gap: 6 }}>
      <span>5G</span>
      <span>●</span>
    </span>
  </div>
);

export const Logo: React.FC<{ size?: number }> = ({ size = 40 }) => (
  <svg width={size} height={size} viewBox="0 0 96 96">
    <rect x="8" y="8" width="24" height="80" fill={COLORS.ink} />
    <rect x="32" y="8" width="30" height="22" fill={COLORS.ink} />
    <rect x="32" y="44" width="26" height="18" fill={COLORS.ink} />
    <polygon points="62,8 82,8 82,30" fill={COLORS.teal} />
    <rect x="64" y="48" width="18" height="16" fill={COLORS.teal} />
  </svg>
);