import React from "react";
import { useCurrentFrame, interpolate } from "remotion";
import { COLORS } from "../theme";

export const Caption: React.FC<{
  eyebrow: string;
  title: string;
  from?: number;
}> = ({ eyebrow, title, from = 0 }) => {
  const frame = useCurrentFrame();
  const o = interpolate(frame, [from, from + 14], [0, 1], { extrapolateRight: "clamp" });
  const y = interpolate(frame, [from, from + 18], [16, 0], { extrapolateRight: "clamp" });
  return (
    <div style={{ opacity: o, transform: `translateY(${y}px)` }}>
      <div
        style={{
          fontSize: 22,
          letterSpacing: 6,
          textTransform: "uppercase",
          color: COLORS.teal,
          fontWeight: 600,
          marginBottom: 14,
        }}
      >
        {eyebrow}
      </div>
      <div
        style={{
          fontSize: 76,
          fontWeight: 700,
          color: COLORS.white,
          lineHeight: 1.05,
          maxWidth: 720,
          letterSpacing: -1.5,
        }}
      >
        {title}
      </div>
    </div>
  );
};

export const Backdrop: React.FC = () => (
  <>
    <div
      style={{
        position: "absolute",
        inset: 0,
        background:
          `radial-gradient(circle at 20% 30%, ${COLORS.navy} 0%, transparent 55%),` +
          `radial-gradient(circle at 85% 80%, ${COLORS.tealDeep}55 0%, transparent 55%),` +
          `linear-gradient(135deg, ${COLORS.bg} 0%, ${COLORS.bgSoft} 100%)`,
      }}
    />
    <div
      style={{
        position: "absolute",
        inset: 0,
        backgroundImage:
          "linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)",
        backgroundSize: "80px 80px",
      }}
    />
  </>
);