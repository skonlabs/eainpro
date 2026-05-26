import { AbsoluteFill, Audio, staticFile } from "remotion";
import { TransitionSeries, springTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { COLORS } from "./theme";
import { SceneTitle } from "./scenes/SceneTitle";
import { SceneRequest } from "./scenes/SceneRequest";
import { SceneLead } from "./scenes/SceneLead";
import { SceneSchedule } from "./scenes/SceneSchedule";
import { SceneComplete } from "./scenes/SceneComplete";
import { SceneOutro } from "./scenes/SceneOutro";

export const FPS = 30;

// Scene durations
const D_TITLE = 90;
const D_REQUEST = 180;
const D_LEAD = 165;
const D_SCHEDULE = 180;
const D_COMPLETE = 165;
const D_OUTRO = 105;
const T = 22; // transition overlap

export const TOTAL_FRAMES =
  D_TITLE + D_REQUEST + D_LEAD + D_SCHEDULE + D_COMPLETE + D_OUTRO - T * 5;

export const MainVideo: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.bg }}>
      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={D_TITLE}>
          <SceneTitle />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={fade()}
          timing={springTiming({ config: { damping: 200 }, durationInFrames: T })}
        />
        <TransitionSeries.Sequence durationInFrames={D_REQUEST}>
          <SceneRequest />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={slide({ direction: "from-right" })}
          timing={springTiming({ config: { damping: 200 }, durationInFrames: T })}
        />
        <TransitionSeries.Sequence durationInFrames={D_LEAD}>
          <SceneLead />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={fade()}
          timing={springTiming({ config: { damping: 200 }, durationInFrames: T })}
        />
        <TransitionSeries.Sequence durationInFrames={D_SCHEDULE}>
          <SceneSchedule />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={slide({ direction: "from-right" })}
          timing={springTiming({ config: { damping: 200 }, durationInFrames: T })}
        />
        <TransitionSeries.Sequence durationInFrames={D_COMPLETE}>
          <SceneComplete />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={fade()}
          timing={springTiming({ config: { damping: 200 }, durationInFrames: T })}
        />
        <TransitionSeries.Sequence durationInFrames={D_OUTRO}>
          <SceneOutro />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};