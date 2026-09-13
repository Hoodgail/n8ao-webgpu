import { validateModel } from "../core/neural.js";
import blueNoise from "./BlueNoise.js";
import neuralModel from "./NeuralDenoiseModel.json" with { type: "json" };
export { blueNoise };
export const model = validateModel(neuralModel);
//# sourceMappingURL=data.js.map