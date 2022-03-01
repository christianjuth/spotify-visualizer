import TWEEN from "@tweenjs/tween.js";
import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass";
import { CopyShader } from "three/examples/jsm/shaders/CopyShader";
import { BadTVShader } from "../shaders/badTv";
import { StaticShader } from "../shaders/Static";

const X_BOUND = 2.7;
const Y_BOUND = 1.4;
const Z_BOUND = 2.7;
const directions = ["x", "y", "z"];

const LINE_MAX_POINTS = 500

function randomInt(min: number, max: number) {
  return Math.round(min + Math.random() * (max - min));
}

const COLORS = [
  { r: 255, g: 255, b: 255 },
  { r: 18, g: 194, b: 230 },
  { r: 242, g: 19, b: 235 },
];

class SelfDrawingLine {
  splineObject: any;
  points: Float32Array;
  tickCount = 0;
  mul = Math.random() > 0.5 ? 1 : -1;
  direction = directions[randomInt(0, directions.length - 1)];
  distance = 0;
  length = 0
  geometry: any

  constructor() {
    const p1 = [0,0,0];
    const p2 = [0,0,0];

     // geometry
     const geometry = new THREE.BufferGeometry();
     this.geometry = geometry

     // attributes
     this.points = new Float32Array( LINE_MAX_POINTS * 3 ); // 3 vertices per point
     this.points.set([...p1, ...p2])
     this.length = 2

     geometry.setAttribute( 'position', new THREE.BufferAttribute( this.points, 3 ) );

     const drawCount = 2; // draw the first 2 points, only
     geometry.setDrawRange( 0, drawCount );

    const material = new THREE.LineBasicMaterial({ color: 0xff0000 });

    // Create the final object to add to the scene
    this.splineObject = new THREE.Line(geometry, material);
  }

  tick(timeDiff: number) {
    let startIndex = (this.length - 1) * 3
    const x = this.points[startIndex]
    const y = this.points[startIndex+1]
    const z = this.points[startIndex+2]

    let outOfBounds =
      x >= X_BOUND ||
      x <= -X_BOUND ||
      y >= Y_BOUND ||
      y <= -Y_BOUND ||
      z >= Z_BOUND ||
      z <= -Z_BOUND;

    if (outOfBounds) {
      this.length++
      startIndex = (this.length - 1) * 3
      this.geometry.setDrawRange( 0, this.length );

      this.points[startIndex] = x
      this.points[startIndex+1] = y
      this.points[startIndex+2] = z
      this.length++
      this.mul *= -1;
    } else if (this.distance > Math.random() * 50) {
      this.length++
      startIndex = (this.length - 1) * 3
      this.geometry.setDrawRange( 0, this.length );

      this.points[startIndex] = x
      this.points[startIndex+1] = y
      this.points[startIndex+2] = z
      this.mul = Math.random() > 0.5 ? 1 : -1;
      this.direction = directions[randomInt(0, directions.length - 1)];
    }


    const delta = 0.05 * timeDiff;

    let updateIndex = ['x', 'y', 'z'].indexOf(this.direction)
    this.points[startIndex + updateIndex] += delta * this.mul

    this.distance += delta;

    this.geometry.attributes.position.needsUpdate = true;

    this.tickCount++;
  }

  setColor(r: number, g: number, b: number) {
    this.splineObject.material.color.r = r / 255;
    this.splineObject.material.color.g = g / 255;
    this.splineObject.material.color.b = b / 255;
  }
}

function createSelfDrawingLines() {
  const lines = Array(20)
    .fill(0)
    .map(() => new SelfDrawingLine());

  lines.forEach((line, i) => {
    const color = COLORS[i % COLORS.length];
    line.setColor(color.r, color.g, color.b);
  });

  return {
    lines,
    tick: (timeDiff: number) => {
      for (const line of lines) {
        line.tick(timeDiff)
      }
    },
  };
}

export function createScene({
  scene,
  renderer,
  camera,
}: {
  scene: THREE.Scene;
  renderer: THREE.WebGL1Renderer;
  camera: THREE.Camera;
}) {
  const lines = createSelfDrawingLines();
  lines.lines.forEach((l) => {
    scene.add(l.splineObject);
  });

  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    1,
    0,
    0
  );

  const light = new THREE.AmbientLight(0x404040); // soft white light
  scene.add(light);

  const renderScene = new RenderPass(scene, camera);
  const badTVPass = new ShaderPass(BadTVShader);
  const staticPass = new ShaderPass(StaticShader);
  const composer = new EffectComposer(renderer);
  const copyPass = new ShaderPass(CopyShader);

  badTVPass.uniforms["distortion"].value = 0.5;
  badTVPass.uniforms["distortion2"].value = 0.5;
  badTVPass.uniforms["rollSpeed"].value = 0;
  staticPass.uniforms["amount"].value = 0.065;

  composer.addPass(renderScene);
  composer.addPass(badTVPass);
  composer.addPass(bloomPass);
  composer.addPass(staticPass);
  composer.addPass(copyPass);
  copyPass.renderToScreen = true;

  function rotateCamera(timeDiff: number) {
    const rotSpeed = 0.0000001 * timeDiff;
    var x = camera.position.x,
      y = camera.position.y,
      z = camera.position.z;

    camera.position.x = x * Math.cos(rotSpeed) + z * Math.sin(rotSpeed);
    camera.position.z = z * Math.cos(rotSpeed) - x * Math.sin(rotSpeed);

    camera.lookAt(scene.position);
  }

  return {
    tick(timeDiff: number) {
      lines.tick(timeDiff)
      badTVPass.uniforms["time"].value += timeDiff;
      staticPass.uniforms["time"].value += timeDiff;
      rotateCamera(timeDiff);
      composer.render();
    },
    pulse({ duration, loudness }: { duration: number; loudness: number }) {
      const start = 1.3 * Math.max(loudness, 0.75)

      bloomPass.strength = start;

      new TWEEN.Tween({ bloom: start })
        .to({ bloom: 0.5 }, duration)
        .easing(TWEEN.Easing.Linear.None)
        .onUpdate(({ bloom }) => {
          bloomPass.strength = bloom;
        })
        .start();
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
    ) {
      const filteredColors = newColors.filter(
        (color) => color.relativeLuminance >= 0.1
      );
      if (filteredColors.length > 1) {
        lines.lines.forEach((line, i) => {
          const color = filteredColors[i % filteredColors.length];
          line.setColor(color.r, color.g, color.b);
        });
      }
    },
  };
}
