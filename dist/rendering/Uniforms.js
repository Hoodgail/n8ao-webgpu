import { uniform, uniformArray } from "three/tsl";
import { Color, Matrix4, Vector2, Vector3 } from "three/webgpu";
const uniformBool = (value) => uniform(value, "bool");
export function createUniforms(camera) {
    return {
        projection: uniform(new Matrix4()),
        inverseProjection: uniform(new Matrix4()),
        cameraPosition: uniform(new Vector3()),
        fullResolution: uniform(new Vector2()),
        resolution: uniform(new Vector2()),
        targetResolution: uniform(new Vector2()),
        near: uniform(camera.near),
        far: uniform(camera.far),
        hemisphere: uniformArray([new Vector3()], "vec3"),
        poisson: uniformArray([new Vector2()], "vec2"),
        frame: uniform(0),
        iteration: uniform(0),
        radius: uniform(5),
        denoiseRadius: uniform(12),
        distanceFalloff: uniform(1),
        biasOffset: uniform(0),
        biasMultiplier: uniform(0),
        intensity: uniform(5),
        aoTones: uniform(0),
        renderMode: uniform(0),
        color: uniform(new Color()),
        screenSpaceRadius: uniformBool(false),
        colorMultiply: uniformBool(true),
        gammaCorrection: uniformBool(false),
        transparencyAware: uniformBool(false),
        fog: uniformBool(false),
        fogExp: uniformBool(false),
        fogDensity: uniform(0),
        fogNear: uniform(0),
        fogFar: uniform(1),
    };
}
//# sourceMappingURL=Uniforms.js.map