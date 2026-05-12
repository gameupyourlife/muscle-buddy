'use dom';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

type CharacterViewerCanvasProps = {
  modelUri: string;
  modelLabel: string;
  level: number;
  appearance?: 'light' | 'dark';
  dom?: import('expo/dom').DOMProps;
};

const VIEWER_PALETTES = {
  light: {
    scene: '#ffffff',
    floor: '#eef2f7',
    floorDeep: '#e3e8f0',
    seam: 'rgba(137, 148, 166, 0.22)',
    shadow: 'rgba(30, 41, 59, 0.16)',
    ring: '#d6deeb',
    text: '#1b2430',
    textMuted: 'rgba(27, 36, 48, 0.72)',
    overlayBackground: 'rgba(255, 255, 255, 0.86)',
    error: '#b42318',
    hemisphereSky: '#ffffff',
    hemisphereGround: '#cfd7e3',
    keyLight: '#ffffff',
    fillLight: '#d7def6',
  },
  dark: {
    scene: '#141414',
    floor: '#202020',
    floorDeep: '#292929',
    seam: 'rgba(255, 255, 255, 0.12)',
    shadow: 'rgba(0, 0, 0, 0.34)',
    ring: '#343945',
    text: '#f8fafc',
    textMuted: 'rgba(248, 250, 252, 0.76)',
    overlayBackground: 'rgba(20, 20, 20, 0.82)',
    error: '#fecaca',
    hemisphereSky: '#f8fafc',
    hemisphereGround: '#242424',
    keyLight: '#ffffff',
    fillLight: '#667399',
  },
} as const;

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
        material.color.multiplyScalar(1.12);
      }

      if ('emissive' in material && material.emissive instanceof THREE.Color) {
        material.emissive.addScalar(0.02);
        material.emissiveIntensity = Math.max(material.emissiveIntensity ?? 0, 0.18);
      }

      if ('roughness' in material && typeof material.roughness === 'number') {
        material.roughness = Math.max(0.18, material.roughness * 0.92);
      }

      material.needsUpdate = true;
    });
  });
}

function disposeSceneMeshes(scene: THREE.Scene) {
  scene.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) {
      return;
    }

    child.geometry?.dispose();

    if (Array.isArray(child.material)) {
      child.material.forEach((material) => material.dispose());
      return;
    }

    child.material?.dispose();
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
  controls.minDistance = Math.max(1.8, maxDimension * 0.85);
  controls.maxDistance = Math.max(8, maxDimension * 4);

  camera.position.set(maxDimension * 0.3, size.y * 0.5, maxDimension * 1.56);
  camera.near = 0.1;
  camera.far = 100;
  camera.updateProjectionMatrix();
  controls.update();
}

export default function CharacterViewerCanvas({
  modelUri,
  modelLabel,
  level,
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
    scene.fog = new THREE.Fog(palette.scene, 12, 32);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.3;
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

    const hemiLight = new THREE.HemisphereLight(palette.hemisphereSky, palette.hemisphereGround, 3);
    scene.add(hemiLight);

    const keyLight = new THREE.SpotLight(palette.keyLight, 118, 40, 0.42, 0.55);
    keyLight.position.set(7, 11, 8);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(2048, 2048);
    scene.add(keyLight);

    const fillLight = new THREE.PointLight(palette.fillLight, 34, 26, 2);
    fillLight.position.set(-6, 4, -5);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight('#ffffff', 1.35);
    rimLight.position.set(-4, 6, 7);
    scene.add(rimLight);

    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(8.5, 96),
      new THREE.MeshStandardMaterial({
        color: palette.floor,
        transparent: true,
        opacity: 0.6,
        roughness: 0.95,
        metalness: 0.02,
      })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -1.2;
    floor.receiveShadow = true;
    scene.add(floor);

    const halo = new THREE.Mesh(
      new THREE.RingGeometry(2.8, 5.6, 96),
      new THREE.MeshBasicMaterial({
        color: palette.ring,
        transparent: true,
        opacity: 0.22,
        side: THREE.DoubleSide,
      })
    );
    halo.rotation.x = -Math.PI / 2;
    halo.position.y = floor.position.y + 0.04;
    scene.add(halo);

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
  }, [appearance, level, modelUri, palette]);

  return (
    <div className="viewer-root" aria-label={`Rotatable 3D model for ${modelLabel} on level ${level}`}>
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
          background: ${palette.scene};
        }

        .canvas-shell {
          position: relative;
          width: 100%;
          height: 100%;
          min-height: 300px;
          overflow: hidden;
          background: ${palette.scene};
          isolation: isolate;
        }

        .canvas-shell::before {
          content: "";
          position: absolute;
          z-index: 0;
          left: -16%;
          right: -16%;
          bottom: 0;
          height: 40%;
          border-top: 1px solid ${palette.seam};
          background: linear-gradient(180deg, ${palette.floor} 0%, ${palette.floorDeep} 100%);
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
            className={`viewer-overlay${status === 'error' ? ' is-error' : ''}`}
            role={status === 'error' ? 'alert' : 'status'}
            aria-live="polite"
          >
            {status === 'loading' ? 'Loading 3D model...' : errorMessage}
          </div>
        ) : null}
      </div>
    </div>
  );
}
