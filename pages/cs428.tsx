import { Scene, useScene2 } from "../components/Shader";
import { usePulse, useSpotify, Player } from "../components/Player";

import * as THREE from "three";
import TWEEN from "@tweenjs/tween.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass";
import * as SceneUtils from "three/examples/jsm/utils/SceneUtils";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass";
import { BadTVShader } from "../shaders/badTv";
import { StaticShader } from "../shaders/Static";
import { GlitchPass } from "three/examples/jsm/postprocessing/GlitchPass.js";

import SimplexNoise from "simplex-noise";
const simplex = new SimplexNoise();

const XY_SCALE = 2;

function createBox(x: number, y: number, size: number) {
  function zScale(x: number) {
    const base = 0.1;
    const horizontal = (Math.abs(x * size - 1) * 2) ** 2 + 0.05;
    return base * horizontal;
  }

  const SHIFT_X = -0.5 * XY_SCALE;
  const SHIFT_Y = -0.5 * XY_SCALE;

  const row = y;
  const col = x;
  const NOISE_REDUCTION = 1 / 7;

  size *= XY_SCALE;
  x *= size;
  y *= size;

  const TOP_LEFT = [
    x + SHIFT_X,
    y + SHIFT_Y,
    simplex.noise2D(row * NOISE_REDUCTION, col * NOISE_REDUCTION) * zScale(col),
  ];
  const TOP_RIGHT = [
    x + size + SHIFT_X,
    y + SHIFT_Y,
    simplex.noise2D(row * NOISE_REDUCTION, (col + 1) * NOISE_REDUCTION) *
      zScale(col + 1),
  ];
  const BOTTOM_LEFT = [
    x + SHIFT_X,
    y + size + SHIFT_Y,
    simplex.noise2D((row + 1) * NOISE_REDUCTION, col * NOISE_REDUCTION) *
      zScale(col),
  ];
  const BOTTOM_RIGHT = [
    x + size + SHIFT_X,
    y + size + SHIFT_Y,
    simplex.noise2D((row + 1) * NOISE_REDUCTION, (col + 1) * NOISE_REDUCTION) *
      zScale(col + 1),
  ];

  return [
    TOP_LEFT,
    TOP_RIGHT,
    BOTTOM_LEFT,
    TOP_RIGHT,
    BOTTOM_RIGHT,
    BOTTOM_LEFT,
  ].flat();
}

function createGrid(size: number) {
  const data: number[] = [];

  const boxSize = 1 / size;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      data.push(...createBox(x, y, boxSize));
    }
  }

  return data;
}

const COLORS = [
  { r: 255, g: 255, b: 255 },
  { r: 18, g: 194, b: 230 },
  { r: 242, g: 19, b: 235 },
];

function createScene({
  scene,
  renderer,
  camera,
}: {
  scene: THREE.Scene;
  renderer: THREE.WebGL1Renderer;
  camera: THREE.Camera;
}) {
  // CREATE SUN

  {
    const geometry = new THREE.CircleGeometry(0.25, 32);

    const texture = new THREE.TextureLoader().load("/sun-texture.png");
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(1, 1);

    const material = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
    });

    const circle = new THREE.Mesh(geometry, material);
    scene.add(circle);

    geometry.translate(0, 0.5, 0);
  }

  function createGround(initTranslate = 0, color = "blue") {
    const geometry = new THREE.BufferGeometry();

    const vertices = new Float32Array(createGrid(40));
    geometry.setAttribute("position", new THREE.BufferAttribute(vertices, 3));
    geometry.rotateX(Math.PI * 0.5);

    const solidMaterial = new THREE.MeshBasicMaterial({
      color: 0x000000,
      // color,
      side: THREE.DoubleSide,
    });

    const wireframeMaterial = new THREE.MeshBasicMaterial({
      wireframe: true,
      color: 0x2bcaff,
    });

    const mesh = SceneUtils.createMultiMaterialObject(geometry, [
      solidMaterial,
      wireframeMaterial,
    ]);
    scene.add(mesh);

    let translate = initTranslate;
    let prevTranslation = translate;

    geometry.translate(0, 0, translate);

    return (diff: number) => {
      translate += diff;

      const newTranslation =
        ((translate + XY_SCALE) % (XY_SCALE * 2)) - XY_SCALE;

      geometry.translate(0, 0, newTranslation - prevTranslation);

      prevTranslation = newTranslation;
    };
  }

  const ground1Update = createGround(0, "red");
  const ground2Update = createGround(-XY_SCALE, "blue");

  const groundUpdate = (diff: number) => {
    ground1Update(diff);
    ground2Update(diff);
  };

  {
    const color = new THREE.Color(0x040105);
    scene.background = color;
    const near = 0.8;
    const far = 2;
    scene.fog = new THREE.Fog(color, near, far);
  }

  const texture = new THREE.TextureLoader().load("/background-texture.png?2");
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.repeat.set(1, 1);

  scene.background = texture;

  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    0.75,
    0,
    0
  );

  const bloomAnimation1 = new TWEEN.Tween({ z: 0.5 })
    .to({ z: 1 }, 10000)
    .delay(1000)
    .easing(TWEEN.Easing.Linear.None)
    .onUpdate(({ z }) => {
      bloomPass.strength = z;
    });

  const bloomAnimation2 = new TWEEN.Tween({ z: 1 })
    .to({ z: 0.5 }, 10000)
    .delay(1000)
    .easing(TWEEN.Easing.Linear.None)
    .onUpdate(({ z }) => {
      bloomPass.strength = z;
    });

  bloomAnimation1.chain(bloomAnimation2);
  bloomAnimation2.chain(bloomAnimation1);
  bloomAnimation1.start();

  const renderScene = new RenderPass(scene, camera);
  const badTVPass = new ShaderPass(BadTVShader);
  const staticPass = new ShaderPass(StaticShader);
  const composer = new EffectComposer(renderer);

  badTVPass.uniforms["distortion"].value = 0.9;
  badTVPass.uniforms["distortion2"].value = 1.2;
  badTVPass.uniforms["rollSpeed"].value = 0; // 0.02;
  staticPass.uniforms["amount"].value = 0.01;

  const glitchPass = new GlitchPass();
  glitchPass.randX = 0;

  composer.addPass(renderScene);
  composer.addPass(badTVPass);
  composer.addPass(staticPass);
  composer.addPass(bloomPass);
  composer.addPass(glitchPass);
  glitchPass.renderToScreen = true;

  camera.position.x = 0;
  camera.position.y = 0.15;
  camera.position.z = 1;

  let prev = -0.2;
  camera.rotateZ(-0.2);

  const cameraAnimation1 = new TWEEN.Tween({ z: -0.05 })
    .to({ z: 0.05 }, 10000)
    .delay(1000)
    .easing(TWEEN.Easing.Linear.None)
    .onUpdate(({ z }) => {
      camera.rotateZ(z - prev);
      prev = z;
    });

  const cameraAnimation2 = new TWEEN.Tween({ z: 0.05 })
    .to({ z: -0.05 }, 10000)
    .delay(1000)
    .easing(TWEEN.Easing.Linear.None)
    .onUpdate(({ z }) => {
      camera.rotateZ(z - prev);
      prev = z;
    });

  cameraAnimation1.chain(cameraAnimation2);
  cameraAnimation2.chain(cameraAnimation1);
  cameraAnimation1.start();

  let i = 0;

  return {
    tick(diff: number) {
      groundUpdate(diff * 0.3);

      badTVPass.uniforms["time"].value += diff;
      staticPass.uniforms["time"].value += diff;
      composer.render();
    },
    pulse({ duration, loudness }: { duration: number; loudness: number }) {
      let prev = 0;

      new TWEEN.Tween({ z: 0 })
        .to({ z: 0.6 }, duration)
        .easing(TWEEN.Easing.Quadratic.InOut)
        .onUpdate(({ z }) => {
          groundUpdate(z - prev);
          prev = z;
        })
        .start();

      if (i % 10 === 0) {
        new TWEEN.Tween({ z: 1.5 })
          .to({ z: 0 }, duration)
          .easing(TWEEN.Easing.Quadratic.InOut)
          .onUpdate(({ z }) => {
            glitchPass.randX = z;
          })
          .start();
      }
      i++;
    },
    resize(height: number, width: number, ar: number) {
      renderScene.setSize(height, width);
      bloomPass.setSize(height, width);
      composer.setPixelRatio(ar);
    },
    setColors(
      newColors: {
        r: number;
        g: number;
        b: number;
        relativeLuminance: number;
      }[]
    ) {},
  };
}

function Sketch() {
  usePulse((beat) => scene.pulse(beat), 0.3);

  const scene = useScene2(createScene);

  return <Scene containerRef={scene.containerRef} />;
}

function Page() {
  return (
    <Player>
      <Sketch />
    </Player>
  );
}

export default Page;
