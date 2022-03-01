import { Shader2d, useShader2d } from "../components/Shader2d";
import { usePulse, useSpotify } from "../components/Player";
import { useEffect } from 'react'

import { fragmentShader } from '../fragmentShaders/lightOrbs'

function Page() {
  const { imageColors } = useSpotify()
  const scene = useShader2d(fragmentShader);

  useEffect(() => {
    scene.setColors(imageColors)
  }, [scene, imageColors])

  usePulse((beat) => scene.pulse(beat), 0.5);

  return <Shader2d {...scene} />;
}

export default Page;
