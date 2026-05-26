import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { COLORS } from "../theme";
import { Logo } from "../components/Phone";
import { Backdrop } from "../components/Captions";

export const SceneOutro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const logoIn = spring({ frame, fps, config: { damping: 14 } });
  const tagY = interpolate(spring({ frame: frame - 14, fps, config: { damping: 18 } }), [0, 1], [30, 0]);
  const tagO = interpolate(frame, [14, 32], [0, 1], { extrapolateRight: "clamp" });
  const urlO = interpolate(frame, [38, 56], [0, 1], { extrapolateRight: "clamp" });
  return (
    <AbsoluteFill>
      <Backdrop />
      <AbsoluteFill
        style={{
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          gap: 28,
        }}
      >
        <div style={{ transform: `scale(${logoIn})`, display: "flex", alignItems: "center", gap: 24 }}>
          <Logo size={110} />
          <div style={{ fontSize: 110, fontWeight: 800, color: COLORS.white, letterSpacing: -2 }}>
            Fixido
          </div>
        </div>
        <div
          style={{
            fontSize: 36,
            color: COLORS.muted,
            opacity: tagO,
            transform: `translateY(${tagY}px)`,
            textAlign: "center",
          }}
        >
          Trusted home services, on demand.
        </div>
        <div
          style={{
            marginTop: 12,
            fontSize: 26,
            color: COLORS.teal,
            letterSpacing: 4,
            opacity: urlO,
            fontWeight: 600,
          }}
        >
          getfixido.com
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};