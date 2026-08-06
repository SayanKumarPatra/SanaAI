import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { VRMLoaderPlugin, VRM } from '@pixiv/three-vrm';

interface AvatarCanvasProps {
  isSpeaking: boolean;
  className?: string;
  cameraMode?: 'head' | 'upper' | 'full';
  waveTrigger?: number;
}

export function AvatarCanvas({ isSpeaking, className = '', cameraMode = 'full', waveTrigger = 0 }: AvatarCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const vrmRef = useRef<VRM | null>(null);
  const isSpeakingRef = useRef(isSpeaking);
  isSpeakingRef.current = isSpeaking;

  // Waving trigger on mount / connect
  const wavingTimeRef = useRef<number>(2.5); // 2.5s waving on load

  // Trigger waving animation when waveTrigger increments
  useEffect(() => {
    if (waveTrigger > 0) {
      wavingTimeRef.current = 2.5;
    }
  }, [waveTrigger]);

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    let animationFrameId: number;
    let isDestroyed = false;

    // 1. Scene setup
    const scene = new THREE.Scene();

    // Camera positions for modes (framed to never cut off head)
    const cameraTargets: Record<string, { pos: [number, number, number]; lookAt: [number, number, number] }> = {
      head: { pos: [0, 1.32, 1.45], lookAt: [0, 1.38, 0] },
      upper: { pos: [0, 1.08, 2.45], lookAt: [0, 1.15, 0] },
      full: { pos: [0, 0.85, 3.5], lookAt: [0, 0.95, 0] }
    };

    const cameraModeRef = { current: cameraMode };
    cameraModeRef.current = cameraMode;

    const camera = new THREE.PerspectiveCamera(
      32,
      container.clientWidth / container.clientHeight,
      0.1,
      20
    );
    const initialTarget = cameraTargets[cameraMode] || cameraTargets.full;
    camera.position.set(...initialTarget.pos);
    camera.lookAt(...initialTarget.lookAt);

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance'
    });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.LinearToneMapping;

    // Clear previous children
    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }
    container.appendChild(renderer.domElement);

    // Soft natural studio lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xffffff, 1.4);
    dirLight1.position.set(1.2, 2.5, 1.8);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0xffecd6, 0.8);
    dirLight2.position.set(-1.2, 1.2, -1.0);
    scene.add(dirLight2);

    const clock = new THREE.Clock();

    // 2. VRM Model Loader
    const gltfLoader = new GLTFLoader();
    gltfLoader.register((parser) => new VRMLoaderPlugin(parser));

    async function loadAvatar() {
      try {
        const gltf = await gltfLoader.loadAsync('/avatar/SANA.vrm');
        if (isDestroyed) return;

        const vrm: VRM = gltf.userData.vrm;
        if (!vrm) {
          throw new Error('VRM metadata not found in model');
        }

        vrmRef.current = vrm;
        vrm.scene.position.set(0, 0, 0);
        scene.add(vrm.scene);

        // Initial friendly facial expression
        if (vrm.expressionManager) {
          vrm.expressionManager.setValue('relaxed', 0.2);
          vrm.expressionManager.setValue('happy', 0.15);
        }

        setLoading(false);
      } catch (err: any) {
        console.error('Failed to load VRM 3D avatar:', err);
        if (!isDestroyed) {
          setLoadError(err.message || 'Error loading 3D avatar');
          setLoading(false);
        }
      }
    }

    loadAvatar();

    // Eye blinking timer state
    let nextBlinkTime = 2.0;
    let blinkDuration = 0.18;
    let blinkTimer = 0;

    // Mouth vowel lip sync state
    const vowels = ['aa', 'ih', 'ou', 'ee', 'oh'];
    let vowelIdx = 0;

    // 3. Render and Animation loop
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const delta = Math.min(clock.getDelta(), 0.1);
      const elapsedTime = clock.getElapsedTime();

      const vrm = vrmRef.current;
      if (vrm) {
        const h = vrm.humanoid;
        const speaking = isSpeakingRef.current;

        // Waving countdown
        if (wavingTimeRef.current > 0) {
          wavingTimeRef.current -= delta;
        }
        const isWaving = wavingTimeRef.current > 0;

        // Normalized bone nodes for natural posture
        const leftUpperArm = h.getNormalizedBoneNode('leftUpperArm');
        const rightUpperArm = h.getNormalizedBoneNode('rightUpperArm');
        const leftLowerArm = h.getNormalizedBoneNode('leftLowerArm');
        const rightLowerArm = h.getNormalizedBoneNode('rightLowerArm');
        const leftHand = h.getNormalizedBoneNode('leftHand');
        const rightHand = h.getNormalizedBoneNode('rightHand');
        const spine = h.getNormalizedBoneNode('spine');
        const chest = h.getNormalizedBoneNode('chest');
        const neck = h.getNormalizedBoneNode('neck');
        const head = h.getNormalizedBoneNode('head');
        const hips = h.getNormalizedBoneNode('hips');

        // Organic micro-motions
        const breath = Math.sin(elapsedTime * 2.2) * 0.025;
        const sway = Math.sin(elapsedTime * 0.8) * 0.015;
        const headSwayX = Math.sin(elapsedTime * 1.1) * 0.025;
        const headSwayY = Math.cos(elapsedTime * 0.75) * 0.03;

        // Apply chest & spine breathing
        if (chest) chest.rotation.x = breath;
        if (spine) spine.rotation.x = breath * 0.5;
        if (hips) {
          hips.rotation.z = sway;
          hips.rotation.y = Math.sin(elapsedTime * 0.5) * 0.01;
        }

        // Apply head & neck looking dynamics
        if (head) {
          head.rotation.x = headSwayX + (speaking ? Math.sin(elapsedTime * 6.5) * 0.035 : 0);
          head.rotation.y = headSwayY;
        }
        if (neck) {
          neck.rotation.x = headSwayX * 0.5;
          neck.rotation.y = headSwayY * 0.5;
        }

        // Left arm natural resting posture along side of body
        if (leftUpperArm) {
          leftUpperArm.rotation.set(
            Math.sin(elapsedTime * 1.5) * 0.02,
            0.1,
            -1.28 + Math.sin(elapsedTime * 0.8) * 0.02
          );
        }
        if (leftLowerArm) {
          leftLowerArm.rotation.set(0.12, 0.2, 0);
        }
        if (leftHand) {
          leftHand.rotation.set(0, 0, -0.1);
        }

        // Right arm logic: Waving vs Speaking gesture vs Resting
        if (rightUpperArm && rightLowerArm && rightHand) {
          if (isWaving) {
            // Friendly greeting wave gesture
            rightUpperArm.rotation.set(0.1, 0.2, 1.8);
            rightLowerArm.rotation.set(0.4, -0.4, 0.5);
            rightHand.rotation.z = Math.sin(elapsedTime * 9) * 0.35;
          } else if (speaking) {
            // Elegant speech explanation gesture
            const gWave = Math.sin(elapsedTime * 3) * 0.08;
            rightUpperArm.rotation.set(0.35 + gWave, 0.3, 0.85 + gWave);
            rightLowerArm.rotation.set(0.55, -0.3, 0.2);
            rightHand.rotation.set(0, 0, 0.15 + Math.sin(elapsedTime * 4) * 0.1);
          } else {
            // Natural resting posture at side
            rightUpperArm.rotation.set(
              Math.sin(elapsedTime * 1.5) * 0.02,
              -0.1,
              1.28 - Math.sin(elapsedTime * 0.8) * 0.02
            );
            rightLowerArm.rotation.set(0.12, -0.2, 0);
            rightHand.rotation.set(0, 0, 0.1);
          }
        }

        // Eye Blinking logic
        blinkTimer += delta;
        if (blinkTimer >= nextBlinkTime) {
          const blinkProgress = (blinkTimer - nextBlinkTime) / blinkDuration;
          if (blinkProgress <= 1.0) {
            const blinkVal = Math.sin(blinkProgress * Math.PI);
            vrm.expressionManager?.setValue('blink', blinkVal);
          } else {
            vrm.expressionManager?.setValue('blink', 0);
            blinkTimer = 0;
            nextBlinkTime = 2.5 + Math.random() * 3.0; // Random interval 2.5s-5.5s
          }
        }

        // Speech Lip Sync / Mouth Vowels
        if (vrm.expressionManager) {
          if (speaking) {
            const mouthVolume = Math.abs(Math.sin(elapsedTime * 11)) * 0.85;
            vowelIdx = Math.floor(elapsedTime * 5) % vowels.length;
            
            vowels.forEach((v, idx) => {
              vrm.expressionManager?.setValue(v, idx === vowelIdx ? mouthVolume : 0);
            });
            vrm.expressionManager.setValue('happy', 0.25);
          } else {
            vowels.forEach((v) => {
              vrm.expressionManager?.setValue(v, 0);
            });
            vrm.expressionManager.setValue('happy', 0.15);
          }
        }

        // Update VRM spring bones (hair and skirt sway) and internal transforms
        vrm.update(delta);
      }

      // Smooth camera position lerp
      const targetCam = cameraTargets[cameraModeRef.current] || cameraTargets.full;
      camera.position.x += (targetCam.pos[0] - camera.position.x) * 0.05;
      camera.position.y += (targetCam.pos[1] - camera.position.y) * 0.05;
      camera.position.z += (targetCam.pos[2] - camera.position.z) * 0.05;
      camera.lookAt(targetCam.lookAt[0], targetCam.lookAt[1], targetCam.lookAt[2]);

      renderer.render(scene, camera);
    };

    animate();

    // 4. Responsive canvas resizing
    const handleResize = () => {
      if (!container) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    // Cleanup
    return () => {
      isDestroyed = true;
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();

      if (vrmRef.current) {
        vrmRef.current.scene.traverse((obj) => {
          if ((obj as THREE.Mesh).isMesh) {
            const mesh = obj as THREE.Mesh;
            mesh.geometry?.dispose();
            if (Array.isArray(mesh.material)) {
              mesh.material.forEach((m) => m.dispose());
            } else if (mesh.material) {
              mesh.material.dispose();
            }
          }
        });
      }

      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      {loading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/20 backdrop-blur-sm rounded-2xl z-10 text-white/70 text-xs gap-2">
          <div className="w-8 h-8 border-2 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" />
          <span>Loading 3D Avatar SANA...</span>
        </div>
      )}

      {loadError && (
        <div className="absolute inset-0 flex items-center justify-center text-red-400 text-xs p-4 text-center z-10">
          {loadError}
        </div>
      )}

      <div
        ref={containerRef}
        className="w-full h-full min-h-[450px] sm:min-h-[550px]"
      />
    </div>
  );
}

