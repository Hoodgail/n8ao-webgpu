import {
  Scene,
  PerspectiveCamera,
  Color,
  HemisphereLight,
  DirectionalLight,
  Mesh,
  MeshStandardMaterial,
  BoxGeometry,
  CylinderGeometry,
  SphereGeometry,
  TorusKnotGeometry,
  TorusGeometry,
  BufferGeometry,
  Material,
  Shape,
  ExtrudeGeometry,
  Fog,
  Vector3,
} from "three";
import type { N8AOOptions } from "../src/index.js";

/** Shared scene lifecycle used by the interactive examples and screenshot runner. */
export abstract class ExampleScene {
  readonly scene = new Scene();
  readonly camera = new PerspectiveCamera(42, 1, 0.1, 120);
  readonly target = new Vector3(0, 1, 0);
  readonly options: N8AOOptions = {
    aoRadius: 1.5,
    intensity: 3,
    accumulate: true,
  };
  private readonly geometries = new Set<BufferGeometry>();
  private readonly materials = new Set<Material>();

  constructor() {
    this.scene.background = new Color("#d7d8d1");
    this.scene.add(new HemisphereLight("#ffffff", "#9fa79c", 2));
    const key = new DirectionalLight("#fff4df", 2.5);
    key.position.set(-4, 9, 6);
    this.scene.add(key);
    this.camera.position.set(7, 5, 8);
    this.mesh(
      new BoxGeometry(28, 0.4, 28),
      this.material("#aaaFA7"),
      [0, -0.22, 0],
    );
  }

  protected material(
    color: string,
    extra: Partial<ConstructorParameters<typeof MeshStandardMaterial>[0]> = {},
  ) {
    const material = new MeshStandardMaterial({
      color,
      roughness: 0.86,
      metalness: 0,
      ...extra,
    });
    this.materials.add(material);
    return material;
  }

  protected mesh(
    geometry: BufferGeometry,
    material: Material,
    at: [number, number, number],
  ): Mesh {
    this.geometries.add(geometry);
    const mesh = new Mesh(geometry, material);
    mesh.position.set(...at);
    this.scene.add(mesh);
    return mesh;
  }

  protected arch(
    x: number,
    z: number,
    material: Material,
    radius = 1.25,
    spring = 1.8,
  ) {
    const thickness = 0.32;
    for (const side of [-1, 1])
      this.mesh(new BoxGeometry(thickness, spring, 0.55), material, [
        x + side * (radius - thickness / 2),
        spring / 2,
        z,
      ]);
    const shape = new Shape();
    shape.absarc(0, 0, radius, Math.PI, 0, true);
    shape.lineTo(radius - thickness, 0);
    shape.absarc(0, 0, radius - thickness, 0, Math.PI, false);
    shape.closePath();
    this.mesh(
      new ExtrudeGeometry(shape, {
        depth: 0.55,
        bevelEnabled: false,
        curveSegments: 40,
      }),
      material,
      [x, spring, z - 0.275],
    );
  }

  resize(width: number, height: number): void {
    this.camera.aspect = width / Math.max(height, 1);
    this.camera.updateProjectionMatrix();
  }
  dispose(): void {
    for (const geometry of this.geometries) geometry.dispose();
    for (const material of this.materials) material.dispose();
    this.scene.clear();
  }
}

export class ContactStudy extends ExampleScene {
  constructor() {
    super();
    const stone = this.material("#d9d4c6"),
      orange = this.material("#b95532"),
      dark = this.material("#485951");
    this.mesh(new BoxGeometry(2.25, 0.35, 2.25), stone, [-1.5, 0.175, 0.3]);
    this.mesh(
      new BoxGeometry(1.8, 1.65, 1.8),
      orange,
      [-1.5, 1.17, 0.3],
    ).rotation.y = 0.22;
    this.mesh(
      new CylinderGeometry(0.94, 1.04, 0.44, 64),
      stone,
      [1.1, 0.22, 1],
    );
    this.mesh(new SphereGeometry(0.82, 64, 40), stone, [1.1, 1.26, 1]);
    this.mesh(
      new CylinderGeometry(0.92, 0.92, 1.05, 64),
      dark,
      [0.65, 0.525, -1.4],
    );
    this.mesh(
      new TorusKnotGeometry(0.56, 0.17, 128, 24),
      orange,
      [0.65, 1.75, -1.4],
    );
    this.arch(-2.4, -2.1, stone);
    this.mesh(new BoxGeometry(1.5, 2.9, 0.55), stone, [0.7, 1.45, -3]);
    for (let i = 0; i < 5; i++)
      this.mesh(new BoxGeometry(0.18, 0.4 + i * 0.17, 1), stone, [
        -3 + i * 0.32,
        0.2 + i * 0.085,
        2.5,
      ]);
    this.camera.position.set(7, 5.2, 9);
    this.target.set(-0.1, 1.2, 0);
  }
}

export class Courtyard extends ExampleScene {
  constructor() {
    super();
    const stone = this.material("#c8bea8"),
      white = this.material("#e5dfd0"),
      orange = this.material("#a85736");
    for (let i = -1; i <= 1; i++) this.arch(i * 2.7, -2.5, stone);
    this.mesh(new BoxGeometry(8.3, 0.35, 0.9), white, [0, 3.35, -2.5]);
    this.mesh(new BoxGeometry(0.55, 3.5, 6), stone, [-4.3, 1.75, 0]);
    for (let i = 0; i < 4; i++)
      this.mesh(new BoxGeometry(3, 0.18, 1), white, [
        2.2,
        0.09 + i * 0.18,
        1.8 - i * 0.55,
      ]);
    this.mesh(
      new CylinderGeometry(0.8, 0.65, 0.8, 48),
      orange,
      [-1.4, 0.4, 0.7],
    );
    this.mesh(new SphereGeometry(0.73, 48, 32), white, [-1.4, 1.14, 0.7]);
    this.options.halfRes = true;
    this.options.aoRadius = 2;
    this.camera.position.set(7, 4.7, 9);
    this.target.set(-0.2, 1.3, -0.4);
  }
}

export class ProductDisplay extends ExampleScene {
  constructor() {
    super();
    const dark = this.material("#354b46"),
      white = this.material("#d6d2c4"),
      orange = this.material("#ca673f");
    for (const [x, h] of [
      [-2, 0.6],
      [0, 1.1],
      [2, 0.4],
    ])
      this.mesh(new CylinderGeometry(0.95, 0.95, h, 64), white, [x, h / 2, 0]);
    this.mesh(
      new TorusKnotGeometry(0.55, 0.19, 160, 32),
      orange,
      [-2, 1.45, 0],
    );
    const ring = this.mesh(
      new TorusGeometry(0.57, 0.2, 32, 96),
      dark,
      [0, 1.92, 0],
    );
    ring.rotation.y = 0.4;
    this.mesh(new BoxGeometry(1.1, 1.1, 1.1), orange, [2, 1.04, 0]).rotation.y =
      0.45;
    this.options.neuralDenoise = true;
    this.options.denoiseSamples = 16;
    this.options.aoRadius = 1.1;
    this.camera.position.set(5, 3.2, 9);
    this.target.set(0, 1, 0);
  }
}

export class GlassLayers extends ExampleScene {
  constructor() {
    super();
    const stone = this.material("#d9d4c6"),
      orange = this.material("#b95532");
    this.mesh(new BoxGeometry(2, 2, 2), stone, [-0.9, 1, -0.5]);
    this.mesh(new SphereGeometry(0.8, 48, 32), orange, [1.1, 0.8, 0.8]);
    for (const [x, depthWrite] of [
      [-0.6, false],
      [1.2, true],
    ] as const) {
      const glass = this.material("#659a96", {
        transparent: true,
        opacity: 0.32,
        depthWrite,
      });
      this.mesh(new BoxGeometry(1.7, 2.8, 0.08), glass, [x, 1.4, 1.8]);
    }
    this.options.transparencyAware = true;
    this.camera.position.set(5, 3.8, 8);
  }
}

export class DetailStudy extends ExampleScene {
  constructor() {
    super();
    const stone = this.material("#d9d4c6"),
      dark = this.material("#485951");
    for (let i = 0; i < 16; i++) {
      const x = (i % 8) * 0.42 - 1.5,
        z = Math.floor(i / 8) * 1.8 - 0.7,
        h = 0.45 + (i % 8) * 0.18;
      this.mesh(new BoxGeometry(0.19, h, 1.1), i < 8 ? stone : dark, [
        x,
        h / 2,
        z,
      ]);
    }
    this.options.screenSpaceRadius = true;
    this.options.aoRadius = 28;
    this.options.intensity = 2.5;
    this.camera.position.set(4, 3.4, 6);
    this.target.set(0, 0.6, 0);
  }
}

export class DepthRange extends ExampleScene {
  constructor() {
    super();
    const stone = this.material("#c9c6b7"),
      orange = this.material("#b95532");
    for (let i = 0; i < 7; i++) {
      this.arch(0, -i * 3, stone, 1.55, 2.3);
      this.mesh(new BoxGeometry(0.7, 0.7, 0.7), orange, [
        i % 2 ? 1 : -1,
        0.35,
        -i * 3 + 1,
      ]);
    }
    this.scene.fog = new Fog("#d7d8d1", 12, 42);
    this.camera.far = 1000;
    this.camera.updateProjectionMatrix();
    this.camera.position.set(3.2, 2.8, 7);
    this.target.set(0, 1.4, -6);
    this.options.aoRadius = 1.3;
  }
}

export interface ExampleDefinition {
  id: string;
  title: string;
  category: string;
  description: string;
  create: () => ExampleScene;
  depth?: "log" | "reverse";
}
export const examples: ExampleDefinition[] = [
  {
    id: "contact",
    title: "Contact study",
    category: "THE FUNDAMENTALS",
    description:
      "Ground objects with subtle contact shadows and stable, soft occlusion.",
    create: () => new ContactStudy(),
  },
  {
    id: "courtyard",
    title: "Quiet courtyard",
    category: "HALF RESOLUTION",
    description:
      "Layered architecture with depth-aware upsampling at half the resolution.",
    create: () => new Courtyard(),
  },
  {
    id: "product",
    title: "Objects in light",
    category: "NEURAL DENOISING",
    description:
      "Smooth surfaces and sculptural forms using the neural filtering preset.",
    create: () => new ProductDisplay(),
  },
  {
    id: "glass",
    title: "Through the glass",
    category: "TRANSPARENCY",
    description:
      "Transparent depth-write layers with selective ambient occlusion.",
    create: () => new GlassLayers(),
  },
  {
    id: "detail",
    title: "Small details",
    category: "SCREEN-SPACE RADIUS",
    description:
      "Fine geometry with a radius measured in pixels rather than world units.",
    create: () => new DetailStudy(),
  },
  {
    id: "depth",
    title: "A longer view",
    category: "LOGARITHMIC DEPTH",
    description:
      "Repeated arcades with logarithmic depth, distance falloff and fog.",
    create: () => new DepthRange(),
    depth: "log",
  },
];
