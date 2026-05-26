import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig, Sequence } from "remotion";
import { COLORS } from "../theme";
import { Phone, StatusBar, Logo } from "../components/Phone";
import { Backdrop, Caption } from "../components/Captions";

const CATS = [
  { label: "Plumbing", icon: "🔧" },
  { label: "Electrical", icon: "💡" },
  { label: "Cleaning", icon: "🧹" },
  { label: "AC Repair", icon: "❄️" },
  { label: "Painting", icon: "🎨" },
  { label: "Carpentry", icon: "🪚" },
];

export const SceneRequest: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const phoneIn = spring({ frame, fps, config: { damping: 20, stiffness: 90 } });
  const phoneX = interpolate(phoneIn, [0, 1], [200, 0]);

  // category selection: highlight plumbing at frame ~50
  const tap = frame > 55 ? 1 : 0;
  // form fills in
  const showForm = frame > 75;
  const formSlide = spring({ frame: frame - 75, fps, config: { damping: 18 } });
  const formY = interpolate(formSlide, [0, 1], [60, 0]);

  // typed text
  const desc = "Kitchen sink leaking under cabinet";
  const typedLen = Math.max(0, Math.min(desc.length, Math.floor((frame - 95) / 1.5)));
  const typed = desc.slice(0, typedLen);

  // submit button press
  const submit = frame > 155 ? 1 : 0;
  const successO = interpolate(frame, [165, 175], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill>
      <Backdrop />
      <AbsoluteFill style={{ flexDirection: "row", alignItems: "center" }}>
        {/* Left caption */}
        <div style={{ flex: 1, paddingLeft: 120 }}>
          <Caption eyebrow="Step 1 · Homeowner" title="Tell us what needs fixing." from={6} />
          <Sequence from={40}>
            <BulletList
              items={[
                "Pick a service",
                "Add details & photos",
                "Submit in 30 seconds",
              ]}
            />
          </Sequence>
        </div>
        {/* Phone */}
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
              <div style={{ fontSize: 22, fontWeight: 700, color: COLORS.ink }}>New request</div>
            </div>
            <div style={{ padding: "20px 28px 0", color: COLORS.ink }}>
              <div style={{ fontSize: 18, opacity: 0.6, marginBottom: 12 }}>Choose a service</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                {CATS.map((c, i) => {
                  const selected = i === 0 && tap;
                  return (
                    <div
                      key={c.label}
                      style={{
                        background: selected ? COLORS.teal : "#fff",
                        border: `2px solid ${selected ? COLORS.teal : "#e6dfd0"}`,
                        borderRadius: 16,
                        padding: "14px 6px",
                        textAlign: "center",
                        color: selected ? COLORS.white : COLORS.ink,
                        fontWeight: 600,
                        fontSize: 13,
                        transform: selected ? "scale(1.04)" : "scale(1)",
                      }}
                    >
                      <div style={{ fontSize: 26 }}>{c.icon}</div>
                      <div style={{ marginTop: 4 }}>{c.label}</div>
                    </div>
                  );
                })}
              </div>
              {showForm && (
                <div style={{ marginTop: 18, transform: `translateY(${formY}px)`, opacity: Math.min(1, formSlide) }}>
                  <div style={{ fontSize: 18, opacity: 0.6, marginBottom: 8 }}>Describe the issue</div>
                  <div
                    style={{
                      background: "#fff",
                      border: "2px solid #e6dfd0",
                      borderRadius: 14,
                      padding: 14,
                      minHeight: 90,
                      fontSize: 16,
                      color: COLORS.ink,
                    }}
                  >
                    {typed}
                    <span style={{ opacity: frame % 30 < 15 ? 1 : 0 }}>|</span>
                  </div>
                  <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                    <Chip label="📍 Yangon" />
                    <Chip label="⏰ Today" />
                    <Chip label="📷 2" />
                  </div>
                  <div
                    style={{
                      marginTop: 22,
                      background: submit ? COLORS.tealDeep : COLORS.teal,
                      color: "#fff",
                      textAlign: "center",
                      padding: "16px 0",
                      borderRadius: 14,
                      fontWeight: 700,
                      fontSize: 18,
                      transform: submit ? "scale(0.97)" : "scale(1)",
                    }}
                  >
                    Submit request
                  </div>
                  <div
                    style={{
                      marginTop: 18,
                      opacity: successO,
                      background: "#e9f9f4",
                      border: "1.5px solid #6ed4ad",
                      color: "#0a7548",
                      borderRadius: 12,
                      padding: "10px 14px",
                      fontSize: 14,
                      fontWeight: 600,
                      textAlign: "center",
                    }}
                  >
                    ✓ Sent to nearby providers
                  </div>
                </div>
              )}
            </div>
          </Phone>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const Chip: React.FC<{ label: string }> = ({ label }) => (
  <div
    style={{
      background: "#fff",
      border: "1.5px solid #e6dfd0",
      borderRadius: 999,
      padding: "6px 12px",
      fontSize: 13,
      color: COLORS.ink,
      fontWeight: 600,
    }}
  >
    {label}
  </div>
);

const BulletList: React.FC<{ items: string[] }> = ({ items }) => {
  const frame = useCurrentFrame();
  return (
    <div style={{ marginTop: 48, display: "flex", flexDirection: "column", gap: 18, maxWidth: 560 }}>
      {items.map((t, i) => {
        const o = interpolate(frame, [i * 14, i * 14 + 16], [0, 1], { extrapolateRight: "clamp" });
        const x = interpolate(frame, [i * 14, i * 14 + 18], [-20, 0], { extrapolateRight: "clamp" });
        return (
          <div
            key={t}
            style={{
              opacity: o,
              transform: `translateX(${x}px)`,
              display: "flex",
              alignItems: "center",
              gap: 16,
              color: COLORS.white,
              fontSize: 26,
              fontWeight: 500,
            }}
          >
            <span
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: COLORS.teal + "33",
                color: COLORS.teal,
                display: "grid",
                placeItems: "center",
                fontWeight: 700,
              }}
            >
              {i + 1}
            </span>
            {t}
          </div>
        );
      })}
    </div>
  );
};