import type { NextApiRequest, NextApiResponse } from "next";
import getColors from "get-image-colors";
import { labelColors } from '../../brainjs/run'

/**
 * Converts an RGB color value to HSL. Conversion formula
 * adapted from http://en.wikipedia.org/wiki/HSL_color_space.
 * Assumes r, g, and b are contained in the set [0, 255] and
 * returns h, s, and l in the set [0, 1].
 */
function rgbToHsl(r: number, g: number, b: number) {
  (r /= 255), (g /= 255), (b /= 255);
  const max = Math.max(r, g, b),
    min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  let l = (max + min) / 2;

  if (max == min) {
    h = s = 0; // achromatic
  } else {
    var d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }

  return [h, s, l];
}

// # Relative luminance
//
// http://www.w3.org/TR/2008/REC-WCAG20-20081211/#relativeluminancedef
// https://en.wikipedia.org/wiki/Luminance_(relative)
// https://en.wikipedia.org/wiki/Luminosity_function
// https://en.wikipedia.org/wiki/Rec._709#Luma_coefficients

// red, green, and blue coefficients
const rc = 0.2126;
const gc = 0.7152;
const bc = 0.0722;
// low-gamma adjust coefficient
const lowc = 1 / 12.92;

function adjustGamma(x: number) {
  return Math.pow((x + 0.055) / 1.055, 2.4);
}

type RGBColor = Readonly<[number, number, number]>;

/**
 * Given a 3-element array of R, G, B varying from 0 to 255, return the luminance
 * as a number from 0 to 1.
 * @example
 * const black_lum = relativeLuminance([0, 0, 0]); // 0
 */
function relativeLuminance(rgb: RGBColor) {
  const rsrgb = rgb[0] / 255;
  const gsrgb = rgb[1] / 255;
  const bsrgb = rgb[2] / 255;

  const r = rsrgb <= 0.03928 ? rsrgb * lowc : adjustGamma(rsrgb);
  const g = gsrgb <= 0.03928 ? gsrgb * lowc : adjustGamma(gsrgb);
  const b = bsrgb <= 0.03928 ? bsrgb * lowc : adjustGamma(bsrgb);

  return r * rc + g * gc + b * bc;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const src = String(req.query.src);

  const response = await fetch(src);
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const colors = await getColors(buffer, "image/jpg");

  let formattedColors = colors.map(({ _rgb }: any) => {
    const [r,g,b] = _rgb
    const [h,s,l] = rgbToHsl(r,g,b)
    return {
      // Rgb color format
      r,
      g, 
      b,
      relativeLuminance: relativeLuminance(_rgb),
      // Hsl color format
      h,
      s,
      l,
    };
  });

  formattedColors = labelColors(formattedColors)

  // formattedColors = formattedColors.filter((a) => {
  //   return a.relativeLuminance > 0.1
  // });

  return res.status(200).json(formattedColors);
}
