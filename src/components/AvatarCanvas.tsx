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
      upper: { pos: [0, 1.10, 2.45], lookAt: [0, 1.15, 0] },
      full: { pos: [0, 0.88, 3.5], lookAt: [0, 0.95, 0] }
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

    // Procedural 3D SANA Bot Fallback Mesh Objects
    let proceduralGroup: THREE.Group | null = null;
    let proceduralMouth: THREE.Mesh | null = null;
    let proceduralRightArm: THREE.Group | null = null;

    function buildProceduralSanaBot(): THREE.Group {
      const botGroup = new THREE.Group();
      botGroup.position.set(0, 0.1, 0);

      const skinMat = new THREE.MeshStandardMaterial({
        color: 0xffe3d1,
        roughness: 0.35,
        metalness: 0.05
      });
      const hairMat = new THREE.MeshStandardMaterial({
        color: 0x1e1b18,
        roughness: 0.6,
        metalness: 0.1
      });
      const hoodieMat = new THREE.MeshStandardMaterial({
        color: 0x0f172a,
        roughness: 0.5,
        metalness: 0.2
      });
      const neonOrangeMat = new THREE.MeshStandardMaterial({
        color: 0xf97316,
        emissive: 0xea580c,
        emissiveIntensity: 0.8,
        roughness: 0.2
      });
      const eyeMat = new THREE.MeshStandardMaterial({
        color: 0x020617,
        roughness: 0.1
      });

      // Head
      const headGeo = new THREE.SphereGeometry(0.25, 32, 32);
      headGeo.scale(1, 1.15, 0.95);
      const headMesh = new THREE.Mesh(headGeo, skinMat);
      headMesh.position.set(0, 1.1, 0);
      botGroup.add(headMesh);

      // Hair
      const hairTop = new THREE.Mesh(new THREE.SphereGeometry(0.27, 24, 24), hairMat);
      hairTop.position.set(0, 1.15, -0.02);
      botGroup.add(hairTop);

      const ponytail = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.45, 16), hairMat);
      ponytail.rotation.x = -Math.PI * 0.85;
      ponytail.position.set(0, 1.25, -0.28);
      botGroup.add(ponytail);

      // Eyes
      const eyeGeo = new THREE.SphereGeometry(0.038, 16, 16);
      const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
      leftEye.position.set(-0.085, 1.14, 0.22);
      botGroup.add(leftEye);

      const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
      rightEye.position.set(0.085, 1.14, 0.22);
      botGroup.add(rightEye);

      // Mouth
      const mouthGeo = new THREE.TorusGeometry(0.03, 0.008, 12, 24, Math.PI);
      proceduralMouth = new THREE.Mesh(mouthGeo, neonOrangeMat);
      proceduralMouth.rotation.x = Math.PI;
      proceduralMouth.position.set(0, 1.04, 0.23);
      botGroup.add(proceduralMouth);

      // Headphones
      const headband = new THREE.Mesh(new THREE.TorusGeometry(0.27, 0.02, 12, 32, Math.PI), hoodieMat);
      headband.position.set(0, 1.12, 0);
      botGroup.add(headband);

      const earpadGeo = new THREE.CylinderGeometry(0.075, 0.075, 0.05, 24);
      const leftEar = new THREE.Mesh(earpadGeo, neonOrangeMat);
      leftEar.rotation.z = Math.PI / 2;
      leftEar.position.set(-0.26, 1.12, 0);
      botGroup.add(leftEar);

      const rightEar = new THREE.Mesh(earpadGeo, neonOrangeMat);
      rightEar.rotation.z = Math.PI / 2;
      rightEar.position.set(0.26, 1.12, 0);
      botGroup.add(rightEar);

      // Torso / Hoodie
      const torsoGeo = new THREE.CylinderGeometry(0.22, 0.27, 0.65, 24);
      const torso = new THREE.Mesh(torsoGeo, hoodieMat);
      torso.position.set(0, 0.55, 0);
      botGroup.add(torso);

      // Left Arm
      const armGeo = new THREE.CylinderGeometry(0.05, 0.04, 0.45, 16);
      const leftArm = new THREE.Mesh(armGeo, hoodieMat);
      leftArm.position.set(-0.28, 0.55, 0);
      leftArm.rotation.z = 0.2;
      botGroup.add(leftArm);

      // Right Arm (Animated for waving/speaking)
      proceduralRightArm = new THREE.Group();
      proceduralRightArm.position.set(0.28, 0.7, 0);
      const rightArmMesh = new THREE.Mesh(armGeo, hoodieMat);
      rightArmMesh.position.set(0, -0.2, 0);
      proceduralRightArm.add(rightArmMesh);
      botGroup.add(proceduralRightArm);

      return botGroup;
    }

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

        if (targetUrl) {
          try {
            const gltf = await gltfLoader.loadAsync(targetUrl);
            if (isDestroyed) return;

            const vrm: VRM = gltf.userData.vrm;
            if (vrm) {
              vrmRef.current = vrm;
              vrm.scene.position.set(0, 0, 0);
              scene.add(vrm.scene);

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
                  if (wavingFbx && wavingFbx.animations[0]) {
                    const clip = retargetFBXClip(wavingFbx.animations[0], vrm);
                    const action = mixer.clipAction(clip);
                    action.setLoop(THREE.LoopOnce, 1);
                    action.clampWhenFinished = true;
                    actionsRef.current.waving = action;
                    action.play();
                  }

                  if (idleFbx && idleFbx.animations[0]) {
                    const clip = retargetFBXClip(idleFbx.animations[0], vrm);
                    const action = mixer.clipAction(clip);
                    actionsRef.current.idle = action;
                    if (!actionsRef.current.waving) {
                      action.play();
                    }
                  }

                  if (talkingFbx && talkingFbx.animations[0]) {
                    const clip = retargetFBXClip(talkingFbx.animations[0], vrm);
                    const action = mixer.clipAction(clip);
                    actionsRef.current.talking = action;
                  }
                }
              } catch (animErr) {
                console.warn('FBX animation loading warning:', animErr);
              }

              setLoading(false);
              return;
            }
          } catch (customErr) {
            console.warn('Custom VRM load error:', customErr);
            onInvalidAvatar?.();
          }
        }

        // Guaranteed Procedural 3D SANA Bot Fallback
        proceduralGroup = buildProceduralSanaBot();
        scene.add(proceduralGroup);
        setLoading(false);

      } catch (err: any) {
        console.warn('Using procedural 3D avatar fallback:', err);
        if (!isDestroyed) {
          proceduralGroup = buildProceduralSanaBot();
          scene.add(proceduralGroup);
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
      } else if (proceduralGroup) {
        // Animate procedural 3D SANA bot
        proceduralGroup.position.y = 0.1 + Math.sin(elapsedTime * 2) * 0.025;
        proceduralGroup.rotation.y = Math.sin(elapsedTime * 0.8) * 0.08;

        if (proceduralMouth) {
          if (speaking) {
            const mouthOpen = 1 + Math.abs(Math.sin(elapsedTime * 12)) * 1.5;
            proceduralMouth.scale.set(1, mouthOpen, 1);
          } else {
            proceduralMouth.scale.set(1, 1, 1);
          }
        }

        if (proceduralRightArm) {
          if (isWaving) {
            proceduralRightArm.rotation.z = 1.2 + Math.sin(elapsedTime * 10) * 0.3;
          } else if (speaking) {
            proceduralRightArm.rotation.z = 0.4 + Math.sin(elapsedTime * 4) * 0.15;
          } else {
            proceduralRightArm.rotation.z = -0.2;
          }
        }
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
      camera.aspect = container.clientWidth / container.clientHeight;
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
          <span>Loading 3D Avatar...</span>
        </div>
      )}

      <div
        ref={containerRef}
        className="w-full h-full min-h-[450px] sm:min-h-[550px]"
      />
    </div>
  );
}
