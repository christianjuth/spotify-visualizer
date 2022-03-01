import type { NextPage } from "next";
import { useEffect, useState } from "react";
import { usePulse, useSpotify } from "../components/Player";
import { Scene, useScene2 } from "../components/Shader";
import * as boxes from "../scenes/boxes";
import * as lines from "../scenes/lines";

const scenes = [
  boxes.createScene, 
  lines.createScene
];

const Home: NextPage = () => {
  const { trackId } = useSpotify();
  const [trackCount, setTrackCount] = useState(
    Math.round(Math.random() * scenes.length)
  );

  const createScene = scenes[trackCount % scenes.length];

  useEffect(() => {
    setTrackCount((c) => c + 1);
  }, [trackId]);

  const scene = useScene2(createScene);

  usePulse((beat) => scene.pulse(beat));

  return <Scene {...scene} />;
};

export default Home;
  