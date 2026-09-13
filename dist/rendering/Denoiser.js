import { model } from "../assets/data.js";
import { denoiseFragment } from "../tsl/denoise.js";
export class BilateralDenoiser {
    name = "bilateral";
    create({ uniforms, textures, geometry, options, }) {
        return denoiseFragment(uniforms, textures, geometry, options);
    }
}
export class NeuralDenoiser {
    data;
    name = "neural";
    constructor(data = model) {
        this.data = data;
    }
    create({ uniforms, textures, geometry, options, }) {
        return denoiseFragment(uniforms, textures, geometry, options, this.data);
    }
}
//# sourceMappingURL=Denoiser.js.map