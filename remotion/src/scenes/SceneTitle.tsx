import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { COLORS } from "../theme";
import { Logo } from "../components/Phone";
import { Backdrop } from "../components/Captions";

export const SceneTitle: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const logoIn = spring({ frame, fps, config: { damping: 14, stiffness: 120 } });
  const titleY = interpolate(spring({ frame: frame - 10, fps, config: { damping: 18 } }), [0, 1], [40, 0]);
  const titleO = interpolate(frame, [10, 28], [0, 1], { extrapolateRight: "clamp" });
  const subY = interpolate(spring({ frame: frame - 22, fps, config: { damping: 20 } }), [0, 1], [20, 0]);
  const subO = interpolate(frame, [22, 40], [0, 1], { extrapolateRight: "clamp" });
  return (
    <AbsoluteFill>
      <Backdrop />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 32 }}>
        <div style={{ transform: `scale(${logoIn})` }}>
          <Logo size={140} />
        </div>
        <div
          style={{
            fontSize: 120,
            fontWeight: 800,
            color: COLORS.white,
            letterSpacing: -3,
            opacity: titleO,
            transform: `translateY(${titleY}px)`,
          }}
        >
          Fixido
        </div>
        <div
          style={{
            fontSize: 32,
            color: COLORS.muted,
            letterSpacing: 4,
            textTransform: "uppercase",
            opacity: subO,
            transform: `translateY(${subY}px)`,
          }}
        >
          From request to done.
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};