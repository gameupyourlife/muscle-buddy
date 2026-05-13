'use dom';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

type CharacterViewerCanvasProps = {
  modelUri: string;
  modelLabel: string;
  appearance?: 'light' | 'dark';
  dom?: import('expo/dom').DOMProps;
};

const VIEWER_PALETTES = {
  light: {
    scene: '#f6f8fb',
    floor: '#edf2f7',
    floorDeep: '#dfe7f0',
    seam: 'rgba(100, 116, 139, 0.1)',
    shadow: 'rgba(30, 41, 59, 0.1)',
    ring: '#e7edf5',
    text: '#1b2430',
    textMuted: 'rgba(27, 36, 48, 0.72)',
    overlayBackground: 'rgba(255, 255, 255, 0.86)',
    error: '#b42318',
    hemisphereSky: '#ffffff',
    hemisphereGround: '#e4ebf3',
    keyLight: '#ffffff',
    fillLight: '#e8eefb',
    wall: '#f3f6fa',
    wallPanel: '#e8eef5',
    mat: '#e5ebf3',
    floorSpeckle: '#c7d1dd',
    floorGroove: '#d4dde8',
    metal: '#7f8b99',
    accent: '#4ecdc4',
    warmAccent: '#f2b8a6',
    plant: '#68b684',
    mirror: '#9caec3',
    neon: '#2f8cff',
    neonSoft: 'rgba(47, 140, 255, 0.46)',
    bannerBackground: '#06101c',
    bannerText: '#c8e9ff',
  },
  dark: {
    scene: '#101419',
    floor: '#151b22',
    floorDeep: '#1b222b',
    seam: 'rgba(226, 232, 240, 0.1)',
    shadow: 'rgba(0, 0, 0, 0.34)',
    ring: '#343945',
    text: '#f8fafc',
    textMuted: 'rgba(248, 250, 252, 0.76)',
    overlayBackground: 'rgba(20, 20, 20, 0.82)',
    error: '#fecaca',
    hemisphereSky: '#f8fafc',
    hemisphereGround: '#222a33',
    keyLight: '#ffffff',
    fillLight: '#536b91',
    wall: '#141a21',
    wallPanel: '#1e2630',
    mat: '#202936',
    floorSpeckle: '#303a46',
    floorGroove: '#0f141a',
    metal: '#66717f',
    accent: '#f87171',
    warmAccent: '#f4a896',
    plant: '#65a978',
    mirror: '#1e2938',
    neon: '#2f8cff',
    neonSoft: 'rgba(47, 140, 255, 0.52)',
    bannerBackground: '#050d19',
    bannerText: '#d7efff',
  },
} as const;

type ViewerPalette = (typeof VIEWER_PALETTES)[keyof typeof VIEWER_PALETTES];

function prepareModel(root: THREE.Object3D) {
  root.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) {
      return;
    }

    child.castShadow = true;
    child.receiveShadow = true;

    const materials = Array.isArray(child.material) ? child.material : [child.material];
    materials.forEach((material) => {
      if (!material) {
        return;
      }

      if ('color' in material && material.color instanceof THREE.Color) {
        material.color.multiplyScalar(1.1);
      }

      if ('emissive' in material && material.emissive instanceof THREE.Color) {
        material.emissive.addScalar(0.018);
        material.emissiveIntensity = Math.max(material.emissiveIntensity ?? 0, 0.16);
      }

      if ('roughness' in material && typeof material.roughness === 'number') {
        material.roughness = Math.max(0.18, material.roughness * 0.92);
      }

      material.needsUpdate = true;
    });
  });
}

function disposeMaterial(
  material: THREE.Material,
  disposedMaterials = new WeakSet<THREE.Material>(),
  disposedTextures = new WeakSet<THREE.Texture>()
) {
  if (disposedMaterials.has(material)) {
    return;
  }

  disposedMaterials.add(material);

  Object.values(material).forEach((value) => {
    if (value instanceof THREE.Texture && !disposedTextures.has(value)) {
      disposedTextures.add(value);
      value.dispose();
    }
  });

  material.dispose();
}

function disposeSceneMeshes(scene: THREE.Scene) {
  const disposedGeometries = new WeakSet<THREE.BufferGeometry>();
  const disposedMaterials = new WeakSet<THREE.Material>();
  const disposedTextures = new WeakSet<THREE.Texture>();

  scene.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) {
      return;
    }

    if (child.geometry && !disposedGeometries.has(child.geometry)) {
      disposedGeometries.add(child.geometry);
      child.geometry.dispose();
    }

    if (Array.isArray(child.material)) {
      child.material.forEach((material) =>
        disposeMaterial(material, disposedMaterials, disposedTextures)
      );
      return;
    }

    if (child.material) {
      disposeMaterial(child.material, disposedMaterials, disposedTextures);
    }
  });
}

function createRubberFloorTexture(palette: ViewerPalette) {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;

  const context = canvas.getContext('2d');
  if (!context) {
    return null;
  }

  context.fillStyle = palette.floor;
  context.fillRect(0, 0, size, size);

  let seed = 8;
  const random = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };

  for (let i = 0; i < 1100; i += 1) {
    const radius = 0.45 + random() * 1.45;
    context.beginPath();
    context.arc(random() * size, random() * size, radius, 0, Math.PI * 2);
    context.fillStyle = random() > 0.46 ? palette.floorSpeckle : palette.floorDeep;
    context.globalAlpha = 0.18 + random() * 0.22;
    context.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1, 1);
  texture.anisotropy = 4;

  return texture;
}

function createBannerTexture(palette: ViewerPalette) {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 256;

  const context = canvas.getContext('2d');
  if (!context) {
    return null;
  }

  context.clearRect(0, 0, canvas.width, canvas.height);

  const gradient = context.createLinearGradient(0, 0, canvas.width, canvas.height);
  gradient.addColorStop(0, palette.bannerBackground);
  gradient.addColorStop(0.58, '#07152a');
  gradient.addColorStop(1, '#0b2344');
  context.fillStyle = gradient;
  context.fillRect(0, 0, canvas.width, canvas.height);

  context.strokeStyle = palette.neon;
  context.lineWidth = 8;
  context.shadowColor = palette.neon;
  context.shadowBlur = 34;
  context.strokeRect(20, 20, canvas.width - 40, canvas.height - 40);

  context.strokeStyle = 'rgba(125, 197, 255, 0.56)';
  context.lineWidth = 3;
  context.shadowBlur = 18;
  context.strokeRect(34, 34, canvas.width - 68, canvas.height - 68);

  context.font =
    '900 58px ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.shadowColor = palette.neon;
  context.shadowBlur = 44;
  context.fillStyle = palette.bannerText;
  context.fillText('THE MORE YOU GIVE', canvas.width / 2, canvas.height / 2 - 34);
  context.fillText('THE MORE YOU GET', canvas.width / 2, canvas.height / 2 + 38);

  context.shadowBlur = 14;
  context.strokeStyle = '#5ab0ff';
  context.lineWidth = 3;
  context.strokeText('THE MORE YOU GIVE', canvas.width / 2, canvas.height / 2 - 34);
  context.strokeText('THE MORE YOU GET', canvas.width / 2, canvas.height / 2 + 38);

  context.shadowBlur = 0;
  context.fillStyle = palette.neonSoft;
  context.fillRect(72, canvas.height - 42, canvas.width - 144, 5);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;

  return texture;
}

function addBox(
  parent: THREE.Object3D,
  size: [number, number, number],
  position: [number, number, number],
  material: THREE.Material,
  castShadow = true,
  receiveShadow = true
) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
  mesh.position.set(...position);
  mesh.castShadow = castShadow;
  mesh.receiveShadow = receiveShadow;
  parent.add(mesh);
  return mesh;
}

function addRubberFloorTiles(
  parent: THREE.Object3D,
  palette: ViewerPalette,
  baseTexture: THREE.Texture | null
) {
  const tileMaterials = [
    new THREE.MeshStandardMaterial({
      color: palette.floor,
      map: baseTexture?.clone() ?? undefined,
      roughness: 0.94,
      metalness: 0.01,
    }),
    new THREE.MeshStandardMaterial({
      color: palette.floorDeep,
      map: baseTexture?.clone() ?? undefined,
      roughness: 0.95,
      metalness: 0.01,
    }),
    new THREE.MeshStandardMaterial({
      color: palette.mat,
      map: baseTexture?.clone() ?? undefined,
      roughness: 0.92,
      metalness: 0.01,
    }),
  ];

  tileMaterials.forEach((material) => {
    if (material.map) {
      material.map.repeat.set(1.15, 1.15);
      material.map.needsUpdate = true;
    }
  });

  const tileWidth = 1.46;
  const tileDepth = 1.36;
  const gap = 0.045;
  const columns = 8;
  const rows = 8;
  const startX = -((columns - 1) * (tileWidth + gap)) / 2;
  const startZ = -((rows - 1) * (tileDepth + gap)) / 2;

  for (let column = 0; column < columns; column += 1) {
    for (let row = 0; row < rows; row += 1) {
      const material = tileMaterials[(column + row) % tileMaterials.length];
      const tile = addBox(
        parent,
        [tileWidth, 0.045, tileDepth],
        [startX + column * (tileWidth + gap), -0.035, startZ + row * (tileDepth + gap)],
        material,
        false,
        true
      );

      tile.name = 'RubberFloorTile';
    }
  }
}

function addGymEnvironment(scene: THREE.Scene, palette: ViewerPalette) {
  const environment = new THREE.Group();
  environment.name = 'GymEnvironment';
  scene.add(environment);

  const rubberFloorTexture = createRubberFloorTexture(palette);
  const bannerTexture = createBannerTexture(palette);
  const floorGrooveMaterial = new THREE.MeshStandardMaterial({
    color: palette.floorGroove,
    roughness: 0.9,
    metalness: 0.01,
  });
  const metalMaterial = new THREE.MeshStandardMaterial({
    color: palette.metal,
    roughness: 0.42,
    metalness: 0.48,
  });
  const rubberMaterial = new THREE.MeshStandardMaterial({
    color: appearanceIndependentColor(palette, '#1f2937', '#111111'),
    roughness: 0.78,
    metalness: 0.04,
  });
  const floor = addBox(
    environment,
    [12.4, 0.12, 11.2],
    [0, -0.12, 0],
    floorGrooveMaterial,
    false,
    true
  );
  addRubberFloorTiles(environment, palette, rubberFloorTexture);
  rubberFloorTexture?.dispose();

  const bench = new THREE.Group();
  bench.position.set(2.28, 0.05, -0.42);
  bench.rotation.y = -0.22;
  bench.scale.setScalar(1.24);
  environment.add(bench);
  addBox(bench, [1.65, 0.18, 0.46], [0, 0.42, 0], rubberMaterial, true, true);
  addBox(bench, [0.12, 0.52, 0.12], [-0.62, 0.16, -0.12], metalMaterial, true, true);
  addBox(bench, [0.12, 0.52, 0.12], [0.62, 0.16, 0.12], metalMaterial, true, true);
  addBox(bench, [1.95, 0.08, 0.12], [0, 0.08, 0], metalMaterial, true, true);

  const rack = new THREE.Group();
  rack.position.set(-2.42, 0.04, -0.48);
  rack.rotation.y = 0.18;
  rack.scale.setScalar(1.18);
  environment.add(rack);
  addBox(rack, [0.12, 1.62, 0.12], [-0.72, 0.76, 0], metalMaterial, true, true);
  addBox(rack, [0.12, 1.62, 0.12], [0.72, 0.76, 0], metalMaterial, true, true);
  addBox(rack, [1.72, 0.1, 0.1], [0, 1.52, 0], metalMaterial, true, true);
  addBox(rack, [1.72, 0.1, 0.1], [0, 0.84, 0], metalMaterial, true, true);

  for (let i = 0; i < 3; i += 1) {
    const y = 0.3 + i * 0.34;
    addDumbbell(rack, [-0.42, y, 0.18], rubberMaterial, metalMaterial, 0.2 + i * 0.025);
    addDumbbell(rack, [0.42, y, 0.18], rubberMaterial, metalMaterial, 0.2 + i * 0.025);
  }

  if (bannerTexture) {
    const signGlow = new THREE.Mesh(
      new THREE.PlaneGeometry(4.8, 1.36),
      new THREE.MeshBasicMaterial({
        color: palette.neon,
        transparent: true,
        opacity: 0.16,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    signGlow.position.set(2.86, 2.16, -2.72);
    signGlow.rotation.y = -0.28;
    environment.add(signGlow);

    const sign = new THREE.Mesh(
      new THREE.PlaneGeometry(4.28, 1.06),
      new THREE.MeshBasicMaterial({
        map: bannerTexture,
        transparent: true,
        opacity: 1,
        toneMapped: false,
      })
    );
    sign.position.set(2.86, 2.16, -2.7);
    sign.rotation.y = -0.28;
    sign.castShadow = false;
    sign.receiveShadow = false;
    environment.add(sign);

    const signLight = new THREE.PointLight(palette.neon, 3.4, 4.8, 1.8);
    signLight.position.set(2.66, 2.18, -2.22);
    environment.add(signLight);
  }

  const halo = new THREE.Mesh(
    new THREE.RingGeometry(2.4, 4.8, 96),
    new THREE.MeshBasicMaterial({
      color: palette.ring,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
    })
  );
  halo.rotation.x = -Math.PI / 2;
  halo.position.y = floor.position.y + 0.08;
  scene.add(halo);

  return { floor, halo };
}

function appearanceIndependentColor(palette: ViewerPalette, light: string, dark: string) {
  return palette.scene === VIEWER_PALETTES.dark.scene ? dark : light;
}

function addDumbbell(
  parent: THREE.Object3D,
  position: [number, number, number],
  rubberMaterial: THREE.Material,
  metalMaterial: THREE.Material,
  plateRadius: number
) {
  const dumbbell = new THREE.Group();
  dumbbell.position.set(...position);
  dumbbell.rotation.z = Math.PI / 2;
  parent.add(dumbbell);

  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.48, 16), metalMaterial);
  handle.castShadow = true;
  handle.receiveShadow = true;
  dumbbell.add(handle);

  [-0.28, 0.28].forEach((y) => {
    const plate = new THREE.Mesh(
      new THREE.CylinderGeometry(plateRadius, plateRadius, 0.12, 24),
      rubberMaterial
    );
    plate.position.y = y;
    plate.castShadow = true;
    plate.receiveShadow = true;
    dumbbell.add(plate);
  });
}

function frameModelInScene(
  model: THREE.Object3D,
  floor: THREE.Mesh,
  halo: THREE.Mesh,
  camera: THREE.PerspectiveCamera,
  controls: OrbitControls
) {
  model.position.set(0, 0, 0);
  model.rotation.set(0, 0, 0);
  model.scale.set(1, 1, 1);

  let box = new THREE.Box3().setFromObject(model);
  let size = box.getSize(new THREE.Vector3());
  const rawHeight = size.y || 1;
  const targetHeight = 3.42;
  const uniformScale = targetHeight / rawHeight;

  model.scale.setScalar(uniformScale);

  box = new THREE.Box3().setFromObject(model);
  size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const maxDimension = Math.max(size.x, size.y, size.z, 1);

  model.position.x -= center.x;
  model.position.y -= box.min.y;
  model.position.z -= center.z;

  floor.position.y = -0.12;
  halo.position.y = floor.position.y + 0.04;
  halo.scale.setScalar(Math.max(1.2, maxDimension * 0.7));

  controls.target.set(0, size.y * 0.47, 0);
  controls.minDistance = Math.max(2.5, maxDimension * 1.2);
  controls.maxDistance = Math.max(10, maxDimension * 4.8);

  camera.position.set(maxDimension * 0.42, size.y * 0.54, maxDimension * 2.12);
  camera.near = 0.1;
  camera.far = 100;
  camera.updateProjectionMatrix();
  controls.update();
}

export default function CharacterViewerCanvas({
  modelUri,
  modelLabel,
  appearance = 'light',
}: CharacterViewerCanvasProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const palette = VIEWER_PALETTES[appearance];

  useEffect(() => {
    const mount = mountRef.current;

    if (!mount || !modelUri) {
      return undefined;
    }

    let frameId = 0;
    let disposed = false;

    const scene = new THREE.Scene();
    scene.background = null;
    scene.fog = new THREE.Fog(palette.scene, 14, 38);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mount.appendChild(renderer.domElement);

    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
    camera.position.set(0, 1.5, 6);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.enablePan = false;
    controls.rotateSpeed = 0.9;
    controls.zoomSpeed = 0.95;
    controls.minPolarAngle = 0;
    controls.maxPolarAngle = Math.PI;
    controls.target.set(0, 1, 0);

    const hemiLight = new THREE.HemisphereLight(
      palette.hemisphereSky,
      palette.hemisphereGround,
      1.65
    );
    scene.add(hemiLight);

    const keyLight = new THREE.SpotLight(palette.keyLight, 58, 40, 0.42, 0.55);
    keyLight.position.set(7, 11, 8);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(2048, 2048);
    scene.add(keyLight);

    const fillLight = new THREE.PointLight(palette.fillLight, 11, 26, 2);
    fillLight.position.set(-6, 4, -5);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight('#ffffff', 0.62);
    rimLight.position.set(-4, 6, 7);
    scene.add(rimLight);

    const rightCornerLight = new THREE.PointLight(palette.keyLight, 18, 8, 2.1);
    rightCornerLight.position.set(5.2, 3.95, -4.7);
    scene.add(rightCornerLight);

    const buddySpotTarget = new THREE.Object3D();
    buddySpotTarget.position.set(0, 1.55, 0);
    scene.add(buddySpotTarget);

    const buddySpotLight = new THREE.SpotLight('#ffffff', 72, 16, 0.32, 0.82, 1.2);
    buddySpotLight.position.set(0, 4.2, 2.15);
    buddySpotLight.target = buddySpotTarget;
    buddySpotLight.castShadow = true;
    buddySpotLight.shadow.mapSize.set(1024, 1024);
    scene.add(buddySpotLight);

    const { floor, halo } = addGymEnvironment(scene, palette);

    const resize = () => {
      const width = Math.max(1, mount.clientWidth || 1);
      const height = Math.max(1, mount.clientHeight || 1);

      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };

    resize();
    window.addEventListener('resize', resize);
    setStatus('loading');
    setErrorMessage('');

    const loader = new GLTFLoader();
    loader.load(
      modelUri,
      (gltf) => {
        if (disposed) {
          return;
        }

        const loadedModel = gltf.scene;
        prepareModel(loadedModel);
        frameModelInScene(loadedModel, floor, halo, camera, controls);
        scene.add(loadedModel);
        setStatus('ready');
      },
      undefined,
      (error) => {
        if (disposed) {
          return;
        }

        console.error('Could not load GLB model:', modelUri, error);
        setErrorMessage('The 3D model could not be loaded.');
        setStatus('error');
      }
    );

    const animate = () => {
      controls.update();
      renderer.render(scene, camera);
      frameId = window.requestAnimationFrame(animate);
    };

    frameId = window.requestAnimationFrame(animate);

    return () => {
      disposed = true;
      window.cancelAnimationFrame(frameId);
      window.removeEventListener('resize', resize);
      controls.dispose();
      disposeSceneMeshes(scene);
      renderer.dispose();

      if (renderer.domElement.parentNode === mount) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, [appearance, modelUri, palette]);

  return (
    <div
      className="viewer-root"
      aria-label={`Rotatable 3D model for ${modelLabel}`}>
      <style>{`
        * {
          box-sizing: border-box;
        }

        html,
        body,
        #root {
          width: 100%;
          height: 100%;
          margin: 0;
          overflow: hidden;
          background: transparent;
          color: ${palette.text};
          font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        }

        .viewer-root {
          width: 100%;
          height: 100%;
          min-height: 300px;
          background:
            radial-gradient(circle at 50% 22%, rgba(255, 255, 255, 0.92) 0%, transparent 36%),
            linear-gradient(180deg, #f9fbfd 0%, ${palette.scene} 42%, ${palette.floor} 100%);
        }

        .canvas-shell {
          position: relative;
          width: 100%;
          height: 100%;
          min-height: 300px;
          overflow: hidden;
          background:
            radial-gradient(circle at 50% 20%, rgba(255, 255, 255, 0.9) 0%, transparent 34%),
            linear-gradient(180deg, #f9fbfd 0%, ${palette.scene} 48%, ${palette.floor} 100%);
          isolation: isolate;
        }

        .canvas-shell::before {
          content: "";
          position: absolute;
          z-index: 0;
          left: -16%;
          right: -16%;
          bottom: 0;
          height: 46%;
          border-top: 1px solid rgba(255, 255, 255, 0.52);
          background:
            linear-gradient(180deg, rgba(246, 248, 251, 0) 0%, ${palette.floor} 28%, ${palette.floorDeep} 100%);
          mask-image: linear-gradient(180deg, transparent 0%, #000 24%);
        }

        .canvas-shell::after {
          content: "";
          position: absolute;
          z-index: 0;
          left: 22%;
          right: 22%;
          bottom: 18%;
          height: 13%;
          border-radius: 999px;
          background: radial-gradient(ellipse at center, ${palette.shadow} 0%, transparent 72%);
          filter: blur(2px);
        }

        canvas {
          position: relative;
          z-index: 1;
          display: block;
          width: 100% !important;
          height: 100% !important;
          touch-action: none;
        }

        .viewer-overlay {
          position: absolute;
          inset: 0;
          z-index: 3;
          display: grid;
          place-items: center;
          padding: 24px;
          background: ${palette.overlayBackground};
          color: ${palette.textMuted};
          font-size: 14px;
          text-align: center;
        }

        .viewer-overlay.is-error {
          color: ${palette.error};
        }

      `}</style>
      <div className="canvas-shell" ref={mountRef}>
        {status !== 'ready' ? (
          <div
            className={`viewer-overlay${status === 'error' ? 'is-error' : ''}`}
            role={status === 'error' ? 'alert' : 'status'}
            aria-live="polite">
            {status === 'loading' ? 'Loading 3D model...' : errorMessage}
          </div>
        ) : null}
      </div>
    </div>
  );
}
