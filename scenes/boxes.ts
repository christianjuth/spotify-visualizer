import * as THREE from "three";
import TWEEN from "@tweenjs/tween.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass";
import { BadTVShader } from '../shaders/badTv'
import { StaticShader } from '../shaders/Static'

const boxGeometry = new THREE.BoxGeometry(0.9, 0.9, 0);
const edges = new THREE.EdgesGeometry(boxGeometry);

const NEAR = 2;
const FAR = -8;
const NUM_BOXES = 30;

const COLORS = [
  { r: 255, g: 255, b: 255 },
  { r: 18, g: 194, b: 230 },
  { r: 242, g: 19, b: 235 },
];

export function createScene({
  scene,
  renderer,
  camera,
}: {
  scene: THREE.Scene;
  renderer: THREE.WebGL1Renderer;
  camera: THREE.Camera;
}) {
  const boxes: THREE.LineSegments<
    THREE.EdgesGeometry<THREE.BoxGeometry>,
    THREE.LineBasicMaterial
  >[] = [];

  const step = (FAR - NEAR) / NUM_BOXES;

  Array(NUM_BOXES)
    .fill(0)
    .forEach((_, i) => {
      const boxMesh = new THREE.LineSegments(
        edges,
        new THREE.LineBasicMaterial({ color: 0x12c2e6 })
      );
      scene.add(boxMesh);
      boxMesh.position.z = NEAR + (step * i);
      boxes.unshift(boxMesh);
    });

  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    1,
    0,
    0
  );

  const renderScene = new RenderPass(scene, camera);
  const badTVPass = new ShaderPass( BadTVShader );
  const staticPass = new ShaderPass(StaticShader);
  const composer = new EffectComposer(renderer);

  badTVPass.uniforms['distortion'].value = 0.5;
  badTVPass.uniforms['distortion2'].value = 0.5;
  badTVPass.uniforms['rollSpeed'].value = 0;
  staticPass.uniforms['amount'].value = 0.022;

  composer.addPass(renderScene);
  composer.addPass( badTVPass );
  composer.addPass(staticPass);
  composer.addPass(bloomPass);
  bloomPass.renderToScreen = true;

  let tickNum = 0;

  const focusPoint = new THREE.Vector3(0,0,FAR)

  new TWEEN.Tween({ z: NEAR })
    .to({ z: FAR/3 }, 10000)
    .repeat(100)
    .easing(TWEEN.Easing.Linear.None)
    .onUpdate(({ z }) => {
      camera.position.z = z
      camera.lookAt(focusPoint)
    })
    .start();

  let rotation = 0

  let colors = [
    ...COLORS
  ]

  return {
    tick(diff: number) {
      badTVPass.uniforms['time'].value += diff;
      staticPass.uniforms['time'].value += diff;
      camera.lookAt(focusPoint)
      rotation += (0.05 * diff)
      camera.rotation.z = rotation
      composer.render();
    },
    pulse({ duration, loudness }: { duration: number, loudness: number }) {

      duration *= 0.9;
      let { r, g, b } = colors[tickNum % colors.length];
      r /= 255;
      g /= 255;
      b /= 255;

      loudness = Math.max(loudness, 0.6)

      r *= loudness
      g *= loudness
      b *= loudness

      let i = 0;
      for (const box of boxes) {
        new TWEEN.Tween({ r, g, b })
          .to({ r: r / 2, g: g / 2, b: b / 2 }, duration)
          .easing(TWEEN.Easing.Linear.None)
          .onUpdate(({ r, g, b }) => {
            box.material.color.r = r;
            box.material.color.g = g;
            box.material.color.b = b;
          })
          .delay((duration / NUM_BOXES) * i)
          .start();
        i++;
      }

      tickNum++;
    },
    resize(height: number, width: number, ar: number) {
      renderScene.setSize(height, width);
      bloomPass.setSize(height, width);
      composer.setPixelRatio(ar);
    },
    setColors(newColors: { r: number, g: number, b: number, relativeLuminance: number }[]) {
      const filteredColors = newColors.filter(color => color.relativeLuminance >= 0.2)
      if (filteredColors.length > 1) {
        colors = filteredColors
      } 
    }
  };
}
