import { useRef, useEffect, useState } from 'react'
import styled from 'styled-components'
import TWEEN from '@tweenjs/tween.js';

const GLSL_HSL_TO_RGB = `
float hue2rgb(float f1, float f2, float hue) {
  if (hue < 0.0)
      hue += 1.0;
  else if (hue > 1.0)
      hue -= 1.0;
  float res;
  if ((6.0 * hue) < 1.0)
      res = f1 + (f2 - f1) * 6.0 * hue;
  else if ((2.0 * hue) < 1.0)
      res = f2;
  else if ((3.0 * hue) < 2.0)
      res = f1 + (f2 - f1) * ((2.0 / 3.0) - hue) * 6.0;
  else
      res = f1;
  return res;
}

vec3 hsl2rgb(vec3 hsl) {
  vec3 rgb;
  
  if (hsl.y == 0.0) {
      rgb = vec3(hsl.z); // Luminance
  } else {
      float f2;
      
      if (hsl.z < 0.5)
          f2 = hsl.z * (1.0 + hsl.y);
      else
          f2 = hsl.z + hsl.y - hsl.y * hsl.z;
          
      float f1 = 2.0 * hsl.z - f2;
      
      rgb.r = hue2rgb(f1, f2, hsl.x + (1.0/3.0));
      rgb.g = hue2rgb(f1, f2, hsl.x);
      rgb.b = hue2rgb(f1, f2, hsl.x - (1.0/3.0));
  }   
  return rgb;
}

vec3 hsl2rgb(float h, float s, float l) {
  return hsl2rgb(vec3(h, s, l));
}

float hue2rgb(vec3 c) {
  float f1 = c.x;
  float f2 = c.y;
  float hue = c.z;

  if (hue < 0.0)
      hue += 1.0;
  else if (hue > 1.0)
      hue -= 1.0;
  float res;
  if ((6.0 * hue) < 1.0)
      res = f1 + (f2 - f1) * 6.0 * hue;
  else if ((2.0 * hue) < 1.0)
      res = f2;
  else if ((3.0 * hue) < 2.0)
      res = f1 + (f2 - f1) * ((2.0 / 3.0) - hue) * 6.0;
  else
      res = f1;
  return res;
}
`

const KALEIDOSCOPE =  `
vec2 rotate(vec2 coords, float rotation) {
  float rotationY = sin(rotation);
  float rotationX = cos(rotation);
  coords -= 0.5;
  vec2 rotatedCoords = vec2(
    coords.x * rotationY + coords.y * rotationX,
    coords.y * rotationY - coords.x * rotationX
  );
  rotatedCoords += 0.5;
  return rotatedCoords;
}

vec2 kaleidoscope(vec2 coord, float segments) {
  vec2 remapped = (coord - 0.5) * 2.0;
  
  float PI = 3.1415;
  float repeateAngle = PI * 2.0 / segments;
  float offset = mod(atan(remapped.x, remapped.y), repeateAngle);

  float odd = mod(atan(remapped.x, remapped.y), repeateAngle * 2.0);

  if (odd >= repeateAngle) {
    offset = repeateAngle - offset; 
  }

  float angle = atan(remapped.x, remapped.y) + offset;
  vec2 rotCoord = rotate(coord, angle);
  
  return rotCoord;
}
`

const REMAP = `
float remap(float value, float min1, float max1, float min2, float max2) {
  return min2 + (value - min1) * (max2 - min2) / (max1 - min1);
}
`

const SCALE = `
vec2 scale(vec2 coords, float x, float y) {
  float arX = 1.0 / x;
  coords.x = remap(coords.x, 0.0, 1.0, 0.0, arX);
  coords.x -= (arX - 1.0) / 2.0;
  float arY = 1.0 / y;
  coords.y = remap(coords.y, 0.0, 1.0, 0.0, arY);
  coords.y -= (arY - 1.0) / 2.0;
  return coords;
}
`

const Canvas = styled.canvas`
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  height: 100%;
  width: 100%;
`

class Shaders {
  programs = {}

  constructor(gl) {
    this.gl = gl

    const vertShaderCode = `
      uniform float ar;
      attribute vec3 coordinates;
    
      ${REMAP}
      ${SCALE}

      varying lowp vec2 vTextureCoord;  
      varying lowp vec2 vTextureContainCoord; 
      varying lowp vec2 vTextureCoverCoord; 

      void main(void)
      {
        gl_Position = vec4(coordinates, 1.0); 
        vec3 shifed = (coordinates / 2.0) + 0.5;
        shifed.x = 1.0 - shifed.x;
        vTextureCoord = vec2(shifed.x, shifed.y);
        float s = 1.0 / ar;
        if (ar >= 1.0) {
          vTextureContainCoord = scale(vec2(shifed.x, shifed.y), s, 1.0);
          vTextureCoverCoord = scale(vec2(shifed.x, shifed.y), 1.0, ar);
        } else {
          vTextureContainCoord = scale(vec2(shifed.x, shifed.y), 1.0, ar);
          vTextureCoverCoord = scale(vec2(shifed.x, shifed.y), s, 1.0); 
        }
      }
    `

    const vertShader = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vertShader, vertShaderCode);
    gl.compileShader(vertShader);
    this.vertShader = vertShader;
  }

  load(fragmentShaderCode) {
    fragmentShaderCode = `
      precision mediump float;
      ${REMAP}
      ${GLSL_HSL_TO_RGB}
      ${KALEIDOSCOPE}
      ${SCALE}
      ${fragmentShaderCode}
    `

    const { gl, programs } = this
    if (programs[fragmentShaderCode]) {
      gl.useProgram(programs[fragmentShaderCode])
      return programs[fragmentShaderCode]
    }

    const program = gl.createProgram()

    // everything uses the same vertex shader
    gl.attachShader(program, this.vertShader)

    // load unique fragment shader
    const fragShader = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fragShader, fragmentShaderCode);
    gl.compileShader(fragShader)
    gl.attachShader(program, fragShader);

    gl.linkProgram(program);
    gl.useProgram(program);

    programs[fragmentShaderCode] = program
    return program
  }
}

class Clock {
  beat = 0;

  now() {
    return window.performance.now()
  }
}

class Scene {
  gl = null
  canvas = null
  shaderProgram = null
  vertices = []
  resetShaders = () => { }
  onResize = () => { }
  colors = []
  ar = 1

  beatCount = 0

  // Array of functions that get run when we .destroy() the maze
  teardownFns = []

  constructor(canvas, fragmentShader) {
    this.canvas = canvas
    this.fragmentShader = fragmentShader
    this.gl = canvas.getContext('webgl2', { antialias: false, premultipliedAlpha: false });
    this.calculateCanvasSize()

    this.shaders = new Shaders(this.gl)

    let id = null

    // To prevent issues with anti-aliasing
    // we need to recalculate canvas size whenever
    // the canvas offsetHeight/offsetWidth changes.
    const resizeObserver = new ResizeObserver(() => {
      // Debounce so it doesn't fire multiple times while resizing
      window.clearTimeout(id)
      id = window.setTimeout(() => {
        this.calculateCanvasSize()
        this.onResize()
      }, 100)
    });
    resizeObserver.observe(canvas);

    this.teardownFns.push(() => resizeObserver.unobserve(canvas))

    this.clock = new Clock()

    const tick = () => {
      TWEEN.update();
      this.render()
      window.requestAnimationFrame(tick)
    }
    window.requestAnimationFrame(tick)
  }

  // I ran into a bunch of issues with anti-aliasing.
  // I got the best results when I turned off anti-aliasing,
  // and resized the canvas to match its render size (offsetHeight/offsetWidth).
  calculateCanvasSize() {
    const { canvas, gl } = this
    canvas.height = canvas.offsetHeight
    canvas.width = canvas.offsetWidth
    this.ar = canvas.offsetWidth / canvas.offsetHeight;
    gl.viewport(0, 0, canvas.offsetWidth, canvas.offsetHeight);
  }

  render() {
    const { gl, clock } = this
    const now = clock.now()

    // reset
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    // end reset

    this.shaderProgram = this.shaders.load(this.fragmentShader)

    const createPoint = (x, y) => [x, y, 0]

    const points = [
      // top left triangle
      ...createPoint(-1, -1),
      ...createPoint(-1, 1),
      ...createPoint(1, 1),
      // bottom right triangle
      ...createPoint(1, 1),
      ...createPoint(1, -1),
      ...createPoint(-1, -1),
    ];
    
    const coord = gl.getAttribLocation(this.shaderProgram, "coordinates");
    const vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(points), gl.STATIC_DRAW);
    gl.vertexAttribPointer(coord, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(coord);

    const timeLoc = gl.getUniformLocation(this.shaderProgram, "timeMs");
    gl.uniform1f(timeLoc, now);

    const beatLoc = gl.getUniformLocation(this.shaderProgram, "beatCount");
    gl.uniform1f(beatLoc, this.beatCount);

    const arLoc = gl.getUniformLocation(this.shaderProgram, "ar");
    gl.uniform1f(arLoc, this.ar);


    for (let i = 0; i < 5; i++) {
      const color = this.colors[i]
      const colorLoc = gl.getUniformLocation(this.shaderProgram, `color${i+1}`);
      gl.uniform3fv(colorLoc, [color?.h ?? 0, color?.s ?? 0, color?.l ?? 0]);
    }

    const colorTypes = ['accent1', 'accent2', 'background', 'primary']
    for (const colorType of colorTypes) {
      const color = this.colors.find(c => c[colorType])
      if (color) {
        const colorLoc = gl.getUniformLocation(this.shaderProgram, `${colorType}Color`);
        gl.uniform3fv(colorLoc, [color?.h ?? 0, color?.s ?? 0, color?.l ?? 0]);
      }
    }

    gl.drawArrays(gl.TRIANGLES, 0, points.length / 3);
  }

  destroy() {
    for (const fn of this.teardownFns) {
      fn()
    }
  }

  tickers = []
  addTicker(fn) {
    this.tickers.push(fn)
  }
  removeTicker(fn) {
    this.tickers = this.tickers.filter(ticker => ticker !== fn)
  }

  pulse(beat) {
    const duration = beat.duration
    new TWEEN.Tween({ shift: this.beatCount })
      .to({ shift: this.beatCount + 1 }, duration)
      .easing(TWEEN.Easing.Quartic.InOut)
      .onUpdate(({ shift }) => {
        this.beatCount = shift
      })
      .start();
  }

  setColors(colors) {
    this.colors = colors
  }
}

export function useShader2d(fragmentShader) {
  const ref = useRef(null)
  const [pulse, setPulse] = useState({ pulse: (beat) => {} })
  const [colors, setColors] = useState({ colors: (colors) => {} })
  const [updateFragmentShader, setUpdateFragmentShader] = useState({ updateFragmentShader: (colors) => {} })

  useEffect(() => {
    const canvas = ref.current
    if (canvas) {
      const scene = new Scene(canvas, fragmentShader)
      scene.render()

      setPulse({
        pulse: (beat) => scene.pulse(beat)
      })

      setColors({
        colors: (colors) => scene.setColors(colors)
      })

      setUpdateFragmentShader({
        updateFragmentShader: (shader) => scene.fragmentShader = shader
      })

      return () => {
        scene.destroy()
      }
    }
  }, [])

  const updateShader = updateFragmentShader.updateFragmentShader
  useEffect(() => {
    updateShader(fragmentShader)
  }, [updateShader, fragmentShader])

  return {
    canvasRef: ref,
    pulse: pulse.pulse,
    setColors: colors.colors
  }
}

export function Shader2d({ canvasRef }) {
  return (
    <Canvas ref={canvasRef} />
  )
}