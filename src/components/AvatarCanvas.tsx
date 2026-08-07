import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { VRMLoaderPlugin, VRM } from '@pixiv/three-vrm';
import { getCustomVRMUrl } from '../utils/avatarStorage';

interface AvatarCanvasProps {
  isSpeaking: boolean;
  className?: string;
  cameraMode?: 'head' | 'upper' | 'full';
  waveTrigger?: number;
  customAvatarUrl?: string | null;
  onInvalidAvatar?: () => void;
}

const mixamoToVrmMap: Record<string, string> = {
  mixamorigHips: 'hips',
  mixamorigSpine: 'spine',
  mixamorigSpine1: 'chest',
  mixamorigSpine2: 'upperChest',
  mixamorigNeck: 'neck',
  mixamorigHead: 'head',
  mixamorigLeftShoulder: 'leftShoulder',
  mixamorigLeftArm: 'leftUpperArm',
  mixamorigLeftForeArm: 'leftLowerArm',
  mixamorigLeftHand: 'leftHand',
  mixamorigRightShoulder: 'rightShoulder',
  mixamorigRightArm: 'rightUpperArm',
  mixamorigRightForeArm: 'rightLowerArm',
  mixamorigRightHand: 'rightHand',
  mixamorigLeftUpLeg: 'leftUpperLeg',
  mixamorigLeftLeg: 'leftLowerLeg',
  mixamorigLeftFoot: 'leftFoot',
  mixamorigRightUpLeg: 'rightUpperLeg',
  mixamorigRightLeg: 'rightLowerLeg',
  mixamorigRightFoot: 'rightFoot',
};

function retargetFBXClip(clip: THREE.AnimationClip, vrm: VRM): THREE.AnimationClip {
  const tracks: THREE.KeyframeTrack[] = [];
  clip.tracks.forEach((track) => {
    const trackNameParts = track.name.split('.');
    const mixamoBoneName = trackNameParts[0];
    const property = trackNameParts[1];

    const vrmBoneName = mixamoToVrmMap[mixamoBoneName];
    if (vrmBoneName && vrm.humanoid) {
      const boneNode = vrm.humanoid.getNormalizedBoneNode(vrmBoneName as any);
      if (boneNode) {
        if (property === 'quaternion') {
          tracks.push(
            new THREE.QuaternionKeyframeTrack(
              `${boneNode.name}.quaternion`,
              track.times,
              track.values
            )
          );
        } else if (property === 'position' && vrmBoneName === 'hips') {
          tracks.push(
            new THREE.VectorKeyframeTrack(
              `${boneNode.name}.position`,
              track.times,
              track.values.map((v) => v * 0.01)
            )
          );
        }
      }
    }
  });

  return new THREE.AnimationClip(clip.name, clip.duration, tracks);
}

export function AvatarCanvas({ 
  isSpeaking, 
  className = '', 
  cameraMode = 'full', 
  waveTrigger = 0, 
  customAvatarUrl, 
  onInvalidAvatar 
}: AvatarCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [hasAvatarModel, setHasAvatarModel] = useState(false);

  const vrmRef = useRef<VRM | null>(null);
  const mixerRef = useRef<THREE.AnimationMixer | null>(null);
  const actionsRef = useRef<{
    idle?: THREE.AnimationAction;
    waving?: THREE.AnimationAction;
    talking?: THREE.AnimationAction;
  }>({});

  const isSpeakingRef = useRef(isSpeaking);
  isSpeakingRef.current = isSpeaking;

  const wavingTimeRef = useRef<number>(2.5);

  useEffect(() => {
    if (waveTrigger > 0) {
      wavingTimeRef.current = 2.5;
      if (actionsRef.current.waving) {
        actionsRef.current.waving.reset().play();
      }
    }
  }, [waveTrigger]);

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    let animationFrameId: number;
    let isDestroyed = false;

    // 1. Scene setup
    const scene = new THREE.Scene();

    const cameraTargets: Record<string, { pos: [number, number, number]; lookAt: [number, number, number] }> = {
      head: { pos: [0, 1.35, 1.45], lookAt: [0, 1.38, 0] },
      upper: { pos: [0, 1.10, 2.2], lookAt: [0, 1.15, 0] },
      full: { pos: [0, 0.95, 3.1], lookAt: [0, 0.98, 0] }
    };

    const cameraModeRef = { current: cameraMode };
    cameraModeRef.current = cameraMode;

    const aspect = container.clientWidth / container.clientHeight;
    // Adjust vertical FOV if aspect ratio is narrow to prevent top head clipping
    const baseFov = 32;
    const computedFov = aspect < 1 ? Math.min(48, baseFov / aspect) : baseFov;

    const camera = new THREE.PerspectiveCamera(
      computedFov,
      aspect,
      0.1,
      20
    );
    const initialTarget = cameraTargets[cameraMode] || cameraTargets.full;
    camera.position.set(...initialTarget.pos);
    camera.lookAt(...initialTarget.lookAt);

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance'
    });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.LinearToneMapping;

    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }
    container.appendChild(renderer.domElement);

    // Studio Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xffffff, 1.5);
    dirLight1.position.set(1.2, 2.5, 1.8);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0xffecd6, 0.8);
    dirLight2.position.set(-1.2, 1.2, -1.0);
    scene.add(dirLight2);

    const clock = new THREE.Clock();

    const gltfLoader = new GLTFLoader();
    gltfLoader.register((parser) => new VRMLoaderPlugin(parser));
    const fbxLoader = new FBXLoader();

    async function loadAvatar() {
      try {
        setLoading(true);

        let targetUrl = customAvatarUrl;
        if (!targetUrl) {
          targetUrl = await getCustomVRMUrl();
        }
        if (!targetUrl) {
          targetUrl = '/avatar/SANA.vrm';
        }

        let loadedGltf = null;
        try {
          loadedGltf = await gltfLoader.loadAsync(targetUrl);
        } catch (loadErr) {
          if (targetUrl !== '/avatar/SANA.vrm') {
            console.warn('Custom VRM model failed to load, falling back to /avatar/SANA.vrm:', loadErr);
            onInvalidAvatar?.();
            targetUrl = '/avatar/SANA.vrm';
            try {
              loadedGltf = await gltfLoader.loadAsync(targetUrl);
            } catch {
              loadedGltf = null;
            }
          } else {
            loadedGltf = null;
          }
        }

        if (isDestroyed) return;

        if (loadedGltf) {
          const vrm: VRM = loadedGltf.userData.vrm;
          if (vrm) {
            vrmRef.current = vrm;
            vrm.scene.position.set(0, 0, 0);
            vrm.scene.rotation.set(0, 0, 0);
            scene.add(vrm.scene);
            setHasAvatarModel(true);

            if (vrm.expressionManager) {
              vrm.expressionManager.setValue('relaxed', 0.2);
              vrm.expressionManager.setValue('happy', 0.15);
            }

            const mixer = new THREE.AnimationMixer(vrm.scene);
            mixerRef.current = mixer;

            try {
              const [wavingFbx, idleFbx, talkingFbx] = await Promise.all([
                fbxLoader.loadAsync('/avatar/Waving.fbx').catch(() => null),
                fbxLoader.loadAsync('/avatar/Idle.fbx').catch(() => null),
                fbxLoader.loadAsync('/avatar/Talking On Phone.fbx').catch(() => null)
              ]);

              if (!isDestroyed) {
                if (idleFbx && idleFbx.animations[0]) {
                  const clip = retargetFBXClip(idleFbx.animations[0], vrm);
                  const action = mixer.clipAction(clip);
                  actionsRef.current.idle = action;
                }

                if (talkingFbx && talkingFbx.animations[0]) {
                  const clip = retargetFBXClip(talkingFbx.animations[0], vrm);
                  const action = mixer.clipAction(clip);
                  actionsRef.current.talking = action;
                }

                if (wavingFbx && wavingFbx.animations[0]) {
                  const clip = retargetFBXClip(wavingFbx.animations[0], vrm);
                  const action = mixer.clipAction(clip);
                  action.setLoop(THREE.LoopOnce, 1);
                  action.clampWhenFinished = true;
                  actionsRef.current.waving = action;
                  action.play();
                } else if (actionsRef.current.idle) {
                  actionsRef.current.idle.play();
                }
              }
            } catch (animErr) {
              console.warn('FBX animation loading warning:', animErr);
            }

            setLoading(false);
            return;
          }
        }

        // No VRM loaded
        setHasAvatarModel(false);
        setLoading(false);

      } catch (err: any) {
        console.warn('No 3D avatar VRM model available:', err);
        if (!isDestroyed) {
          setHasAvatarModel(false);
          setLoading(false);
        }
      }
    }

    loadAvatar();

    let activeState: 'waving' | 'idle' | 'talking' = 'waving';

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const delta = Math.min(clock.getDelta(), 0.1);
      const elapsedTime = clock.getElapsedTime();

      const vrm = vrmRef.current;
      const mixer = mixerRef.current;
      const speaking = isSpeakingRef.current;

      if (wavingTimeRef.current > 0) {
        wavingTimeRef.current -= delta;
      }
      const isWaving = wavingTimeRef.current > 0;

      if (vrm) {
        // Handle VRM Animation Transitions
        if (mixer && actionsRef.current) {
          const { idle, waving, talking } = actionsRef.current;

          let newState: 'waving' | 'idle' | 'talking' = 'idle';
          if (isWaving && waving) {
            newState = 'waving';
          } else if (speaking && talking) {
            newState = 'talking';
          } else {
            newState = 'idle';
          }

          if (newState !== activeState) {
            const currentAction = actionsRef.current[activeState];
            const newAction = actionsRef.current[newState];

            if (currentAction && newAction) {
              currentAction.fadeOut(0.3);
              newAction.reset().fadeIn(0.3).play();
            } else if (newAction) {
              newAction.reset().play();
            }
            activeState = newState;
          }

          mixer.update(delta);
        }

        // Lip sync & mouth morphs when Gemini speaks
        if (vrm.expressionManager) {
          if (speaking) {
            const mouthVol = Math.abs(Math.sin(elapsedTime * 12)) * 0.85;
            vrm.expressionManager.setValue('aa', mouthVol);
          } else {
            vrm.expressionManager.setValue('aa', 0);
          }
        }

        vrm.update(delta);
      }

      // Smooth Camera lerp
      const targetCam = cameraTargets[cameraModeRef.current] || cameraTargets.full;
      camera.position.x += (targetCam.pos[0] - camera.position.x) * 0.05;
      camera.position.y += (targetCam.pos[1] - camera.position.y) * 0.05;
      camera.position.z += (targetCam.pos[2] - camera.position.z) * 0.05;
      camera.lookAt(targetCam.lookAt[0], targetCam.lookAt[1], targetCam.lookAt[2]);

      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      if (!container) return;
      const currentAspect = container.clientWidth / container.clientHeight;
      camera.aspect = currentAspect;
      camera.fov = currentAspect < 1 ? Math.min(48, baseFov / currentAspect) : baseFov;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

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
  }, [customAvatarUrl]);

  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      {loading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/20 backdrop-blur-sm rounded-2xl z-10 text-white/70 text-xs gap-2">
          <div className="w-8 h-8 border-2 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" />
          <span>3D অবতার লোড হচ্ছে...</span>
        </div>
      )}

      {!loading && !hasAvatarModel && (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-slate-950/40 backdrop-blur-md rounded-3xl border border-white/10 z-10 text-white/80 gap-3">
          <div className="w-14 h-14 rounded-2xl bg-orange-500/20 border border-orange-500/40 flex items-center justify-center text-orange-400 shadow-lg">
            <span className="text-2xl">✨</span>
          </div>
          <div>
            <h3 className="text-base font-bold text-white">সব অবতার ডিলিট করা হয়েছে</h3>
            <p className="text-xs text-white/60 max-w-xs mt-1">
              আপনার দেওয়া নতুন ফাইল (.VRM ও .FBX) বা লিংক অপশন থেকে আপলোড করার সাথে সাথে এখানে দেখা যাবে।
            </p>
          </div>
        </div>
      )}

      <div
        ref={containerRef}
        className="w-full h-full min-h-[220px] xs:min-h-[260px] sm:min-h-[380px] lg:min-h-[480px]"
      />
    </div>
  );
}
