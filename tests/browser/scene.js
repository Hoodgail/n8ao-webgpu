/** Shared deterministic scene factory for both renderers. No random seeds or time dependencies. */
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
export async function createScene(spec = {}) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0.78, 0.81, 0.84);
  const width = spec.width ?? 320,
    height = spec.height ?? 240;
  const camera = spec.orthographic
    ? new THREE.OrthographicCamera(
        (-4 * width) / height,
        (4 * width) / height,
        4,
        -4,
        0.1,
        100,
      )
    : new THREE.PerspectiveCamera(48, width / height, 0.1, 100);
  camera.position.set(6, 4.5, 7);
  camera.lookAt(0, 0.7, 0);
  camera.updateMatrixWorld();
  scene.add(new THREE.HemisphereLight(0xffffff, 0x8793a3, 2));
  const light = new THREE.DirectionalLight(0xffffff, 2.2);
  light.position.set(-3, 7, 4);
  scene.add(light);
  const materials = [];
  const material = (rgb) => {
    const m = new THREE.MeshStandardMaterial({
      color: new THREE.Color(...rgb),
      roughness: 0.9,
      metalness: 0,
    });
    materials.push(m);
    return m;
  };
  const grey = material([0.56, 0.6, 0.64]);
  const warm = material([0.56, 0.38, 0.22]);
  const add = (geometry, m, position) => {
    const mesh = new THREE.Mesh(geometry, m);
    mesh.position.set(...position);
    scene.add(mesh);
    return mesh;
  };
  add(new THREE.BoxGeometry(12, 0.4, 12), grey, [0, -0.2, 0]);
  if (spec.scene !== "plane" && spec.scene !== "empty") {
    add(new THREE.BoxGeometry(6, 3, 0.3), grey, [0, 1.5, -2.2]);
    add(new THREE.BoxGeometry(0.3, 3, 4.6), grey, [-3, 1.5, 0]);
    const block = add(
      new THREE.BoxGeometry(1.6, 1.6, 1.6),
      warm,
      [-0.8, 0.8, 0],
    );
    block.rotation.y = 0.25;
    add(new THREE.SphereGeometry(0.85, 32, 24), grey, [1.4, 0.85, 0.2]);
    add(
      new THREE.TorusKnotGeometry(0.55, 0.19, 80, 12),
      warm,
      [0.2, 2.1, -1.1],
    );
    for (let i = 0; i < 5; i++)
      add(new THREE.BoxGeometry(0.25, 0.3 + i * 0.24, 1), grey, [
        -2 + i * 0.4,
        0.15 + i * 0.12,
        2,
      ]);
  }
  if (spec.scene === "empty") {
    for (const object of [...scene.children])
      if (object.isMesh) scene.remove(object);
  }
  if (spec.transparency) {
    for (const [x, depthWrite] of [
      [-0.7, false],
      [1.2, true],
    ]) {
      const m = new THREE.MeshStandardMaterial({
        color: 0x82b5d1,
        transparent: true,
        opacity: 0.35,
        depthWrite,
        roughness: 0.35,
      });
      materials.push(m);
      const mesh = add(new THREE.BoxGeometry(1.3, 2.1, 0.1), m, [x, 1.1, 1.6]);
      if (spec.transparency === "flags") {
        mesh.userData.treatAsOpaque = depthWrite;
        mesh.userData.cannotReceiveAO = !depthWrite;
      }
    }
  }
  if (spec.fog === "linear") scene.fog = new THREE.Fog(0xaab5c0, 6, 16);
  if (spec.fog === "exp") scene.fog = new THREE.FogExp2(0xaab5c0, 0.075);
  if (spec.scene === "upstream-sponza") {
    for (const object of [...scene.children])
      if (object.isMesh) scene.remove(object);
    const draco = new DRACOLoader();
    draco.setDecoderPath("/tests/assets/draco/");
    const loader = new GLTFLoader().setDRACOLoader(draco);
    try {
      const gltf = await loader.loadAsync("/tests/assets/sponza.glb");
      const bounds = new THREE.Box3().setFromObject(gltf.scene);
      const size = bounds.getSize(new THREE.Vector3());
      const center = bounds.getCenter(new THREE.Vector3());
      const scale = 10 / Math.max(size.x, size.z);
      gltf.scene.scale.multiplyScalar(scale);
      gltf.scene.position.sub(center.multiplyScalar(scale));
      scene.add(gltf.scene);
      camera.position.set(3.5, 0.5, 0.5);
      camera.lookAt(-2, 0, 0);
    } finally {
      draco.dispose();
    }
  }
  scene.updateMatrixWorld(true);
  camera.updateMatrixWorld(true);
  return {
    scene,
    camera,
    resize(w, h) {
      if (camera.isPerspectiveCamera) camera.aspect = w / h;
      else {
        camera.left = (-4 * w) / h;
        camera.right = (4 * w) / h;
      }
      camera.updateProjectionMatrix();
    },
    dispose() {
      const geometries = new Set(),
        meshesMaterials = new Set(materials),
        textures = new Set();
      scene.traverse((o) => {
        if (o.geometry) geometries.add(o.geometry);
        for (const m of o.material
          ? Array.isArray(o.material)
            ? o.material
            : [o.material]
          : [])
          meshesMaterials.add(m);
      });
      for (const m of meshesMaterials) {
        for (const v of Object.values(m)) if (v?.isTexture) textures.add(v);
        m.dispose();
      }
      for (const g of geometries) g.dispose();
      for (const t of textures) t.dispose();
    },
  };
}
