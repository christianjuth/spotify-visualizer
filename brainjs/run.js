import { anonymous } from './model'

function processColors(colors) {
  const input = []
  const output = []

  colors.forEach(({ r, g, b, h, s, l, relativeLuminance, background, primary, accent1, accent2, }) => {
    let type = 0
    if (background) {
      type = 1
    } else if (primary) {
      type = 2
    } else if (accent1) {
      type = 3
    } else if (accent2) {
      type = 3
    }

    // input.push(h, s, l, relativeLuminance)
    input.push(r / 255, g / 255, b / 255, h, s, l, relativeLuminance)
    output.push(type)
  })

  return {
    input,
    output
  }
}

export function labelColors(colors) {
  const { input } = processColors(colors)
  const labels = anonymous(input)

  colors = [...colors]

  const eatColor = (val) => {

    let index = -1
    let diff = Infinity
    for (let i = 0; i < labels.length; i++) {
      const newDiff = Math.abs(val - labels[i])
      if (newDiff < diff) {
        diff = newDiff
        index = i
      }
    }

    labels[index] = Infinity

    return index
  }

  colors[eatColor(1)].background = true
  colors[eatColor(2)].primary = true
  colors[eatColor(3)].accent1 = true
  colors[eatColor(3)].accent2 = true

  return colors
}