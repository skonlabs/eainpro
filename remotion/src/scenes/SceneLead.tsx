import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { COLORS } from "../theme";
import { Phone, StatusBar, Logo } from "../components/Phone";
import { Backdrop, Caption } from "../components/Captions";

export const SceneLead: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // notification bell pulses, then card slides down
  const bellScale = 1 + Math.sin(frame * 0.4) * 0.08 * (frame < 40 ? 1 : 0);
  const notifIn = spring({ frame: frame - 5, fps, config: { damping: 18 } });
  const notifY = interpolate(notifIn, [0, 1], [-80, 0]);

  // lead card opens
  const cardIn = spring({ frame: frame - 45, fps, config: { damping: 18 } });
  const cardO = Math.min(1, cardIn);

  // unlock button press
  const unlock = frame > 120 ? 1 : 0;
  const unlockedO = interpolate(frame, [128, 140], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill>
      <Backdrop />
      <AbsoluteFill style={{ flexDirection: "row", alignItems: "center" }}>
        <div
          style={{
            flex: 1,
            display: "flex",
            justifyContent: "center",
          }}
        >
          <Phone>
            <StatusBar />
            <div style={{ padding: "8px 28px 0", display: "flex", alignItems: "center", gap: 12 }}>
              <Logo size={32} />
              <div style={{ fontSize: 22, fontWeight: 700, color: COLORS.ink }}>Provider · Leads</div>
              <div style={{ marginLeft: "auto", fontSize: 26, transform: `scale(${bellScale})` }}>🔔</div>
            </div>

            {/* Push notification */}
            <div
              style={{
                margin: "16px 20px 0",
                background: "#1d3a5c",
                color: "#fff",
                borderRadius: 16,
                padding: "12px 14px",
                display: "flex",
                gap: 10,
                alignItems: "center",
                transform: `translateY(${notifY}px)`,
                opacity: Math.min(1, notifIn),
                boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
              }}
            >
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: COLORS.teal,
                  display: "grid",
                  placeItems: "center",
                  fontWeight: 800,
                  color: COLORS.ink,
                }}
              >
                F
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 700 }}>New lead nearby</div>
                <div style={{ fontSize: 11, opacity: 0.85 }}>Plumbing · Yangon · 2 min ago</div>
              </div>
              <div style={{ fontSize: 11, opacity: 0.7 }}>now</div>
            </div>

            {/* Lead card */}
            <div
              style={{
                margin: "18px 20px 0",
                background: "#fff",
                borderRadius: 18,
                padding: 18,
                border: "2px solid #e6dfd0",
                transform: `translateY(${interpolate(cardIn, [0, 1], [40, 0])}px)`,
                opacity: cardO,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                <span
                  style={{
                    background: COLORS.teal + "22",
                    color: COLORS.tealDeep,
                    padding: "4px 10px",
                    borderRadius: 999,
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                >
                  PLUMBING
                </span>
                <span style={{ fontSize: 12, color: "#7a6f5c" }}>2 min ago</span>
              </div>
              <div style={{ fontSize: 17, fontWeight: 700, color: COLORS.ink, lineHeight: 1.3 }}>
                Kitchen sink leaking under cabinet
              </div>
              <div style={{ fontSize: 13, color: "#7a6f5c", marginTop: 6 }}>
                📍 Yangon · Bahan · 3.2 km away
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <Stat label="Budget" value="20–35k" />
                <Stat label="Urgency" value="Today" />
                <Stat label="Photos" value="2" />
              </div>
              <div
                style={{
                  marginTop: 16,
                  background: unlock ? COLORS.tealDeep : COLORS.teal,
                  color: "#fff",
                  borderRadius: 12,
                  padding: "12px 0",
                  textAlign: "center",
                  fontWeight: 700,
                  fontSize: 15,
                  transform: unlock ? "scale(0.97)" : "scale(1)",
                }}
              >
                Unlock for 3 credits
              </div>
              <div
                style={{
                  marginTop: 12,
                  opacity: unlockedO,
                  background: "#e9f9f4",
                  border: "1.5px solid #6ed4ad",
                  color: "#0a7548",
                  borderRadius: 10,
                  padding: "8px 12px",
                  fontSize: 13,
                  fontWeight: 600,
                  textAlign: "center",
                }}
              >
                ✓ Contact unlocked
              </div>
            </div>
          </Phone>
        </div>
        <div style={{ flex: 1, paddingRight: 120 }}>
          <Caption eyebrow="Step 2 · Provider" title="Get matched leads instantly." from={10} />
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const Stat: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div
    style={{
      flex: 1,
      background: "#f5efe4",
      borderRadius: 10,
      padding: "8px 6px",
      textAlign: "center",
    }}
  >
    <div style={{ fontSize: 10, color: "#7a6f5c", textTransform: "uppercase", letterSpacing: 1 }}>
      {label}
    </div>
    <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.ink, marginTop: 2 }}>{value}</div>
  </div>
);