const brain = require('brain.js')
const data = require('./data.json')
const fs = require('fs')

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

    if (Math.random() > 0.5) {
      input.push(r / 255, g / 255, b / 255, h, s, l, relativeLuminance)
      output.push(type)
    } else {
      input.unshift(r / 255, g / 255, b / 255, h, s, l, relativeLuminance)
      output.unshift(type)
    }
  })

  return {
    input,
    output
  }
}

const processedData = [
  ...data.map(colors => processColors(colors)),
  ...data.map(colors => processColors(colors)),
  ...data.map(colors => processColors(colors)),
  ...data.map(colors => processColors(colors))
]

const net = new brain.NeuralNetwork({
  log: true, // true to use console.log, when a function is supplied it is used --> Either true or a function
  logPeriod: 50, // iterations between logging out --> number greater than 0
  // binaryThresh: 0.5,
  hiddenLayers: [25, 25], // array of ints for the sizes of the hidden layers in the network
  activation: 'leaky-relu', // supported activation types: ['sigmoid', 'relu', 'leaky-relu', 'tanh'],
  leakyReluAlpha: 0.03, // 
  iterations: 1000000,
  learningRate: 0.03, // scales with delta to effect training rate --> number between 0 and 1
  // momentum: 0.3, // scales with next layer's change value --> number between 0 and 1,
  // errorThresh,
  // errorThresh: 0.25
  errorThresh: 0.03,
});

net.train(processedData);

const run = net.toFunction();

fs.writeFileSync('./brainjs/model.js', "export " + run.toString(), "utf8")

for (const colors of processedData) {
  console.log("======COLOR======")
  const output = net.run(colors.input);
  const output2 = run(colors.input);
  console.log(colors, [...output], [...output2], colors.output)
}