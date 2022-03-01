import { Shader2d, useShader2d } from "../components/Shader2d";
import { usePulse, useSpotify, AlbumArtColors } from "../components/Player";
import { Editor } from "../components/Editor";
import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/router";

function minifyShader(shaderCode: string) {
  return shaderCode.replace(/\n{3,}/g, "\n\n").trim();
}

const DEFAULT_FRAGMENT_SHADER = `
// like object-fit: fill
varying vec2 vTextureCoord;
// like object-fit: contain
varying vec2 vTextureContainCoord;
// like object-fit: cover
varying vec2 vTextureCoverCoord;

// time in milliseconds since the shader was loaded
uniform float timeMs;
// number of beats encountered with easing (hence the float)
uniform float beatCount;

// hsl colors pulled from album art
// convert to rgb using hsl2rgb
// gl_FragColor = vec4(hsl2rgb(color1), 1.0);
uniform vec3 color1;
uniform vec3 color2;
uniform vec3 color3;
uniform vec3 color4;

uniform vec3 backgroundColor;
uniform vec3 primaryColor;
uniform vec3 accent1Color;
uniform vec3 accent2Color;

// You also have the following functions:
// kaleidoscope(vTextureCoord, numOfSegments);
// hsl2rgb(h,s,l) with h, s, l in range [0-1];
// rotate(vTextureCoord, radians);
// remap(value, inputMin, inputMax, outputMin, outputMax);
// scale(vTextureCoord, scaleX, scaleY);

float circle(vec2 coord, vec2 center, float radius) {
  vec2 pos = vec2(coord.x - center.x, coord.y - center.y);
  float diff = sqrt(pos.x * pos.x + pos.y * pos.y);
  if (diff <= radius) {
    return 1.0;
  }
  return 0.0;
}

void main() {
  // try swapping vTextureContainCoord out for vTextureCoverCoord
  vec2 coords = vTextureContainCoord;
  
  // create rotating kaleidoscope effect
  vec2 modifiedCoords = rotate(coords, beatCount / 4.0 + timeMs / 2000.0);
  modifiedCoords = kaleidoscope(modifiedCoords, 10.0);
  
  vec3 color = primaryColor;
  
  // setup center of flower design
  if (circle(coords, vec2(0.5, 0.5), 0.05) >= 1.0) {
    color = accent1Color;
    color.z = 1.0 - modifiedCoords.y;
  } 
  // setup middle part of flower design
  else if (modifiedCoords.x < 0.8) {
    color.z = modifiedCoords.x / 1.2;
  } 
  // setup outter part of flower design
  else {
    color = backgroundColor;
    color.z = 1.0 - modifiedCoords.x;
  }
  
  gl_FragColor = vec4(hsl2rgb(color), 1.0);
}
`;

function Page() {
  const router = useRouter();
  const urlFragShader = String(
    router.query.fragShader || DEFAULT_FRAGMENT_SHADER
  );

  const [fragmentShader, setFragmentShader] = useState("");
  const { imageColors, playerConnected } = useSpotify();
  const scene = useShader2d(fragmentShader);

  useEffect(() => {
    scene.setColors(imageColors);
  }, [scene, imageColors]);

  useEffect(() => {
    setFragmentShader(urlFragShader);
  }, [router.isReady]);

  const minifiedShader = useMemo(
    () => minifyShader(fragmentShader),
    [fragmentShader]
  );

  useEffect(() => {
    router.replace({
      query: {
        fragShader: minifyShader(minifiedShader),
      },
    });
  }, [minifiedShader]);

  usePulse((beat) => scene.pulse(beat), 0.5);

  return (
    <>
      <Shader2d {...scene} />
      {playerConnected && (
        <Editor
          value={fragmentShader}
          onChange={(val) => setFragmentShader(val)}
        />
      )}
      <AlbumArtColors/>
    </>
  );
}

export default Page;
