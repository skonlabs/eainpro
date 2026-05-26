import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { COLORS } from "../theme";
import { Phone, StatusBar, Logo } from "../components/Phone";
import { Backdrop, Caption } from "../components/Captions";

const DAYS = ["M", "T", "W", "T", "F", "S", "S"];
const SLOTS = ["9:00", "10:30", "13:00", "15:00", "17:30"];

export const SceneSchedule: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const phoneIn = spring({ frame, fps, config: { damping: 20 } });
  const phoneX = interpolate(phoneIn, [0, 1], [-200, 0]);

  // pick day index 2, then slot index 2
  const pickedDay = frame > 50 ? 2 : -1;
  const pickedSlot = frame > 90 ? 2 : -1;
  const confirm = frame > 130 ? 1 : 0;
  const confirmedO = interpolate(frame, [140, 152], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill>
      <Backdrop />
      <AbsoluteFill style={{ flexDirection: "row", alignItems: "center" }}>
        <div style={{ flex: 1, paddingLeft: 120 }}>
          <Caption eyebrow="Step 3 · Both" title="Pick a time that works." from={6} />
          <div style={{ marginTop: 36, color: COLORS.muted, fontSize: 22, maxWidth: 540, lineHeight: 1.5 }}>
            Provider proposes a visit. Homeowner confirms in one tap. Calendars stay in sync.
          </div>
        </div>
        <div
          style={{
            flex: 1,
            display: "flex",
            justifyContent: "center",
            transform: `translateX(${phoneX}px)`,
            opacity: phoneIn,
          }}
        >
          <Phone>
            <StatusBar />
            <div style={{ padding: "8px 28px 0", display: "flex", alignItems: "center", gap: 12 }}>
              <Logo size={32} />
              <div style={{ fontSize: 22, fontWeight: 700, color: COLORS.ink }}>Schedule visit</div>
            </div>
            <div style={{ padding: "20px 28px 0" }}>
              <div style={{ fontSize: 16, color: "#7a6f5c", marginBottom: 10 }}>This week</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6 }}>
                {DAYS.map((d, i) => {
                  const selected = i === pickedDay;
                  return (
                    <div
                      key={i}
                      style={{
                        background: selected ? COLORS.ink : "#fff",
                        color: selected ? "#fff" : COLORS.ink,
                        border: `2px solid ${selected ? COLORS.ink : "#e6dfd0"}`,
                        borderRadius: 12,
                        padding: "8px 0",
                        textAlign: "center",
                      }}
                    >
                      <div style={{ fontSize: 11, opacity: 0.7 }}>{d}</div>
                      <div style={{ fontSize: 16, fontWeight: 700 }}>{18 + i}</div>
                    </div>
                  );
                })}
              </div>

              <div style={{ fontSize: 16, color: "#7a6f5c", margin: "20px 0 10px" }}>
                Available slots
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {SLOTS.map((s, i) => {
                  const selected = i === pickedSlot;
                  return (
                    <div
                      key={s}
                      style={{
                        background: selected ? COLORS.teal : "#fff",
                        color: selected ? "#fff" : COLORS.ink,
                        border: `2px solid ${selected ? COLORS.teal : "#e6dfd0"}`,
                        borderRadius: 12,
                        padding: "12px 0",
                        textAlign: "center",
                        fontWeight: 600,
                        fontSize: 15,
                      }}
                    >
                      {s}
                    </div>
                  );
                })}
              </div>

              <div
                style={{
                  marginTop: 22,
                  background: confirm ? COLORS.tealDeep : COLORS.teal,
                  color: "#fff",
                  borderRadius: 14,
                  padding: "14px 0",
                  textAlign: "center",
                  fontWeight: 700,
                  fontSize: 17,
                  transform: confirm ? "scale(0.97)" : "scale(1)",
                  opacity: pickedSlot >= 0 ? 1 : 0.4,
                }}
              >
                Confirm Wed · 13:00
              </div>
              <div
                style={{
                  marginTop: 14,
                  opacity: confirmedO,
                  background: "#e9f9f4",
                  border: "1.5px solid #6ed4ad",
                  color: "#0a7548",
                  borderRadius: 10,
                  padding: "10px 14px",
                  fontSize: 14,
                  fontWeight: 600,
                  textAlign: "center",
                }}
              >
                ✓ Visit booked · added to calendar
              </div>
            </div>
          </Phone>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};