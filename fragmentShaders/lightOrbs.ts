export const fragmentShader = `
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

float oscillate(float val) {
  return abs(0.5 - mod(val, 1.0));
}

float rand(float n){return fract(sin(n) * 43758.5453123);}

float noise(float p){
	float fl = floor(p);
  float fc = fract(p);
	return mix(rand(fl), rand(fl + 1.0), fc);
}

vec4 orb(vec2 coord, vec2 center, vec3 color, float size, int i) {
  coord = coord - center;
  float slowedTime = timeMs / 1000.0;
  float PI = 3.141592;
  vec3 col = cos(vec3(0,1,-1)*PI*2./3. + PI*(slowedTime/2.+float(i)/5.)) * 0.5 + 0.5;
  
  float thing = 0.05/length(coord/size);
  color.z = thing;
  vec4 fragColor = vec4(hsl2rgb(color),1.0);
  fragColor.xyz = pow(fragColor.xyz,vec3(3.));
  fragColor.w = 1.0;
  return fragColor;
}

void main() {
  vec4 fragColor = vec4(0);
  float slowedTime = timeMs / 2000.0 + beatCount / 5.0;
  vec2 coord = kaleidoscope(vTextureContainCoord, 10.0);
  
  vec3 colors[4];
  colors[0] = color1;
  colors[1] = color2;
  colors[2] = color3;
  colors[3] = color4;
  
  for (int i = 0; i < 10; i++) {
    float x = sin(slowedTime + float(i)) / 2.0 + noise(slowedTime + float(i));
    float y = cos(slowedTime + float(i)) / 2.0 + noise(slowedTime + float(i));
    float orbSize = 0.5 + oscillate(slowedTime + float(i)) * 3.0 + (1.0 - mod(beatCount, 1.0)) / 4.0;
    fragColor += orb(coord, vec2(x, y), colors[int(mod(float(i), 4.0))], orbSize, i);  
  }
  
  gl_FragColor = fragColor;
}
`;
