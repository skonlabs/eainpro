import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { COLORS } from "../theme";
import { Phone, StatusBar, Logo } from "../components/Phone";
import { Backdrop, Caption } from "../components/Captions";

const STEPS = [
  { label: "Accepted", t: 5 },
  { label: "On the way", t: 30 },
  { label: "In progress", t: 55 },
  { label: "Completed", t: 85 },
];

export const SceneComplete: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const phoneIn = spring({ frame, fps, config: { damping: 20 } });

  // stars tap in
  const starsFrom = 110;
  const stars = 5;

  return (
    <AbsoluteFill>
      <Backdrop />
      <AbsoluteFill style={{ flexDirection: "row", alignItems: "center" }}>
        <div
          style={{
            flex: 1,
            display: "flex",
            justifyContent: "center",
            opacity: phoneIn,
          }}
        >
          <Phone>
            <StatusBar />
            <div style={{ padding: "8px 28px 0", display: "flex", alignItems: "center", gap: 12 }}>
              <Logo size={32} />
              <div style={{ fontSize: 22, fontWeight: 700, color: COLORS.ink }}>Live booking</div>
            </div>
            <div style={{ padding: "24px 28px 0" }}>
              {/* Progress vertical timeline */}
              <div style={{ position: "relative", paddingLeft: 30 }}>
                <div
                  style={{
                    position: "absolute",
                    left: 11,
                    top: 6,
                    bottom: 6,
                    width: 3,
                    background: "#e6dfd0",
                    borderRadius: 2,
                  }}
                />
                {STEPS.map((s, i) => {
                  const active = frame >= s.t;
                  const dotScale = active
                    ? spring({ frame: frame - s.t, fps, config: { damping: 12, stiffness: 220 } })
                    : 0;
                  return (
                    <div
                      key={s.label}
                      style={{
                        position: "relative",
                        marginBottom: 22,
                        display: "flex",
                        alignItems: "center",
                        gap: 14,
                      }}
                    >
                      <div
                        style={{
                          position: "absolute",
                          left: -30,
                          width: 24,
                          height: 24,
                          borderRadius: 999,
                          background: active ? COLORS.teal : "#fff",
                          border: `3px solid ${active ? COLORS.teal : "#e6dfd0"}`,
                          transform: `scale(${0.6 + 0.4 * Math.min(1, dotScale)})`,
                          display: "grid",
                          placeItems: "center",
                          color: "#fff",
                          fontSize: 13,
                          fontWeight: 800,
                        }}
                      >
                        {active ? "✓" : ""}
                      </div>
                      <div
                        style={{
                          fontSize: 18,
                          fontWeight: active ? 700 : 500,
                          color: active ? COLORS.ink : "#a99c80",
                        }}
                      >
                        {s.label}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Rating */}
              <div
                style={{
                  marginTop: 10,
                  background: "#fff",
                  borderRadius: 16,
                  padding: 18,
                  border: "2px solid #e6dfd0",
                  opacity: interpolate(frame, [starsFrom - 10, starsFrom], [0, 1], {
                    extrapolateRight: "clamp",
                  }),
                }}
              >
                <div style={{ fontSize: 14, color: "#7a6f5c", marginBottom: 8 }}>How was it?</div>
                <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
                  {Array.from({ length: stars }).map((_, i) => {
                    const t = starsFrom + i * 8;
                    const sp = spring({
                      frame: frame - t,
                      fps,
                      config: { damping: 10, stiffness: 240 },
                    });
                    const on = frame >= t;
                    return (
                      <div
                        key={i}
                        style={{
                          fontSize: 38,
                          color: on ? COLORS.accent : "#e6dfd0",
                          transform: `scale(${0.6 + 0.6 * Math.min(1.2, sp)})`,
                        }}
                      >
                        ★
                      </div>
                    );
                  })}
                </div>
                <div
                  style={{
                    marginTop: 12,
                    background: COLORS.teal,
                    color: "#fff",
                    borderRadius: 10,
                    padding: "10px 0",
                    textAlign: "center",
                    fontWeight: 700,
                    fontSize: 14,
                  }}
                >
                  Pay & finish
                </div>
              </div>
            </div>
          </Phone>
        </div>
        <div style={{ flex: 1, paddingRight: 120 }}>
          <Caption eyebrow="Step 4 · Done" title="Job done. Rated. Paid." from={6} />
          <div
            style={{
              marginTop: 36,
              color: COLORS.muted,
              fontSize: 22,
              maxWidth: 540,
              lineHeight: 1.5,
            }}
          >
            Track every step live. Leave a review. Build trust with every job.
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};