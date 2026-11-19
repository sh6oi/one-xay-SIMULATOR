import React, {useEffect, useRef, useState} from 'react';
import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {
  Camera,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Crosshair,
  ShieldCheck,
  Sparkles,
  User,
  Wind,
} from 'lucide-react';
import type {
  BodyRegion,
  ExamProtocol,
  PatientCase,
  PatientPosture,
  UpgradeId,
} from '../types/radiology';
import {
  CLINIC_ROOM_IMAGE,
  FILM_CARTON_IMAGE,
  POSTURE_LABELS_AR,
  REGION_LABELS_AR,
  UPGRADES,
} from '../data/radiologyData';

export type CameraPreset = 'BOOTH' | 'ERECT' | 'SIDE' | 'OVERHEAD' | 'FREE';

interface RadiologyRoom3DProps {
  patient: PatientCase | null;
  requestedExam: ExamProtocol;
  selectedRegion: BodyRegion;
  selectedPosture: PatientPosture;
  onSelectRegion: (region: BodyRegion) => void;
  onSelectPosture: (posture: PatientPosture) => void;
  shieldUsed: boolean;
  patientPrepped: boolean;
  onPrepPatient: () => void;
  isExposing: boolean;
  filmsRemaining: number;
  ownedUpgrades: UpgradeId[];
  kvp: number;
  mas: number;
}

interface HotspotLocalMeta {
  id: BodyRegion;
  label: string;
  // Offset along patient spine from pelvis center (head is +Y in local patient rig, feet -Y)
  spineY: number;
  lateralX: number;
  radius: number;
  // Vertical height of region when standing upright (world Y in meters)
  erectWorldY: number;
  // Horizontal position along table when lying (world X)
  tableWorldX: number;
  tableWorldZ: number;
}

// Unified anatomical offsets so hotspots & tube targeting match BOTH lying and standing poses
const ANATOMY_SPOTS: HotspotLocalMeta[] = [
  {
    id: 'head',
    label: 'الرأس',
    spineY: 0.78,
    lateralX: 0,
    radius: 0.22,
    erectWorldY: 1.72,
    tableWorldX: -0.78,
    tableWorldZ: 0,
  },
  {
    id: 'cervical',
    label: 'الرقبة',
    spineY: 0.56,
    lateralX: 0,
    radius: 0.17,
    erectWorldY: 1.52,
    tableWorldX: -0.56,
    tableWorldZ: 0,
  },
  {
    id: 'chest',
    label: 'الصدر',
    spineY: 0.3,
    lateralX: 0,
    radius: 0.28,
    erectWorldY: 1.28,
    tableWorldX: -0.3,
    tableWorldZ: 0,
  },
  {
    id: 'lumbar',
    label: 'القطنية',
    spineY: 0.04,
    lateralX: 0,
    radius: 0.23,
    erectWorldY: 1.02,
    tableWorldX: -0.04,
    tableWorldZ: 0,
  },
  {
    id: 'pelvis',
    label: 'الحوض',
    spineY: -0.18,
    lateralX: 0,
    radius: 0.26,
    erectWorldY: 0.84,
    tableWorldX: 0.18,
    tableWorldZ: 0,
  },
  {
    id: 'hand',
    label: 'اليد',
    spineY: -0.16,
    lateralX: 0.34,
    radius: 0.19,
    erectWorldY: 0.92,
    tableWorldX: 0.16,
    tableWorldZ: 0.34,
  },
  {
    id: 'knee',
    label: 'الركبة',
    spineY: -0.58,
    lateralX: 0.12,
    radius: 0.22,
    erectWorldY: 0.5,
    tableWorldX: 0.58,
    tableWorldZ: 0.12,
  },
];

const CAMERA_PRESETS: Record<
  Exclude<CameraPreset, 'FREE'>,
  {pos: [number, number, number]; target: [number, number, number]; label: string}
> = {
  BOOTH: {
    pos: [-2.85, 2.25, 4.15],
    target: [0.55, 1.05, -0.15],
    label: 'منظور غرفة التحكم',
  },
  ERECT: {
    pos: [0.25, 1.55, 2.45],
    target: [1.85, 1.15, -0.35],
    label: 'منظور الحامل الواقف',
  },
  SIDE: {
    pos: [0.15, 1.68, 3.05],
    target: [0.05, 1.02, 0],
    label: 'منظور جانبي للطاولة',
  },
  OVERHEAD: {
    pos: [0.35, 4.35, 0.85],
    target: [0.35, 0.95, -0.1],
    label: 'منظور علوي',
  },
};

const ERECT_STAND_X = 2.65;
const ERECT_PATIENT_X = 2.18;
const ERECT_Z = -0.35;

// Reusable math helpers outside animation loop (zero GC)
const _camGoalPos = new THREE.Vector3();
const _camGoalTarget = new THREE.Vector3();
const _pointerNdc = new THREE.Vector2();

function isErectPosture(posture: PatientPosture): boolean {
  return posture.startsWith('ERECT_');
}

function getTargetBodyYaw(posture: PatientPosture): number {
  switch (posture) {
    case 'SUPINE':
    case 'ERECT_PA':
      return Math.PI / 2;
    case 'PRONE':
    case 'ERECT_AP':
      return -Math.PI / 2;
    case 'TABLE_RIGHT_LAT':
    case 'ERECT_LEFT_LAT':
      return 0;
    case 'TABLE_LEFT_LAT':
    case 'ERECT_RIGHT_LAT':
      return Math.PI;
  }
}

function dampAngle(
  current: number,
  target: number,
  lambda: number,
  delta: number
): number {
  let diff = ((target - current + Math.PI) % (Math.PI * 2)) - Math.PI;
  if (diff < -Math.PI) diff += Math.PI * 2;
  return current + diff * (1 - Math.exp(-lambda * delta));
}

function createTileFloorTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#121C2B';
  ctx.fillRect(0, 0, 512, 512);

  // Clean medical terrazzo grid
  ctx.strokeStyle = '#1E2D42';
  ctx.lineWidth = 3;
  const step = 128;
  for (let i = 0; i <= 512; i += step) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, 512);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(512, i);
    ctx.stroke();
  }

  // Subtle terrazzo mineral flecks
  for (let i = 0; i < 420; i++) {
    const x = (i * 73) % 512;
    const y = (i * 137) % 512;
    ctx.fillStyle =
      i % 3 === 0 ? 'rgba(56, 189, 248, 0.08)' : 'rgba(148, 163, 184, 0.07)';
    ctx.fillRect(x, y, 2, 2);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(6, 6);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createContactShadowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(128, 128, 12, 128, 128, 120);
  grad.addColorStop(0, 'rgba(3, 7, 14, 0.7)');
  grad.addColorStop(0.58, 'rgba(3, 7, 14, 0.28)');
  grad.addColorStop(1, 'rgba(3, 7, 14, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 256);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createLightboxTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#071422';
  ctx.fillRect(0, 0, 512, 256);

  const frames = [28, 184, 340];
  frames.forEach((fx, idx) => {
    const grad = ctx.createRadialGradient(
      fx + 72,
      128,
      10,
      fx + 72,
      128,
      82
    );
    grad.addColorStop(0, 'rgba(186, 230, 253, 0.92)');
    grad.addColorStop(1, 'rgba(14, 116, 144, 0.32)');
    ctx.fillStyle = grad;
    ctx.fillRect(fx, 28, 144, 200);

    ctx.strokeStyle = '#38BDF8';
    ctx.lineWidth = 2;
    ctx.strokeRect(fx, 28, 144, 200);

    ctx.strokeStyle = 'rgba(241, 245, 249, 0.88)';
    ctx.lineWidth = 3;
    if (idx === 0) {
      ctx.beginPath();
      ctx.moveTo(fx + 72, 52);
      ctx.lineTo(fx + 72, 195);
      ctx.stroke();
      for (let r = 0; r < 5; r++) {
        const ry = 72 + r * 20;
        ctx.beginPath();
        ctx.ellipse(fx + 72, ry, 42 - r * 2, 10, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
    } else if (idx === 1) {
      for (let v = 0; v < 7; v++) {
        ctx.strokeRect(fx + 60, 55 + v * 21, 24, 14);
      }
    } else {
      for (let f = -2; f <= 2; f++) {
        ctx.beginPath();
        ctx.moveTo(fx + 72 + f * 6, 165);
        ctx.lineTo(fx + 72 + f * 12, 70 + Math.abs(f) * 10);
        ctx.stroke();
      }
    }
  });

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createDetectorPanelTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#0F1A2A';
  ctx.fillRect(0, 0, 256, 256);

  ctx.strokeStyle = '#38BDF8';
  ctx.lineWidth = 4;
  ctx.strokeRect(14, 14, 228, 228);

  // Radiography alignment grid + AEC 3-chamber sensor icons
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.55)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(128, 20);
  ctx.lineTo(128, 236);
  ctx.moveTo(20, 128);
  ctx.lineTo(236, 128);
  ctx.stroke();

  // AEC sensing fields
  ctx.strokeStyle = 'rgba(103, 232, 249, 0.85)';
  ctx.strokeRect(64, 58, 42, 52);
  ctx.strokeRect(150, 58, 42, 52);
  ctx.strokeRect(107, 136, 42, 52);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createBoothMonitorTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 160;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#08121E';
  ctx.fillRect(0, 0, 256, 160);

  ctx.strokeStyle = '#0EA5E9';
  ctx.lineWidth = 2;
  ctx.strokeRect(6, 6, 244, 148);

  ctx.fillStyle = '#38BDF8';
  ctx.font = 'bold 16px monospace';
  ctx.fillText('RAD-CONSOLE', 16, 30);

  ctx.fillStyle = '#22C55E';
  ctx.fillRect(16, 46, 95, 14);
  ctx.fillStyle = '#0EA5E9';
  ctx.fillRect(16, 70, 145, 10);
  ctx.fillRect(16, 88, 120, 10);

  // Waveform curve
  ctx.strokeStyle = '#67E8F9';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  for (let x = 16; x < 238; x += 6) {
    const y = 124 + Math.sin(x * 0.12) * 10;
    if (x === 16) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export const RadiologyRoom3D: React.FC<RadiologyRoom3DProps> = ({
  patient,
  requestedExam,
  selectedRegion,
  selectedPosture,
  onSelectRegion,
  onSelectPosture,
  shieldUsed,
  patientPrepped,
  onPrepPatient,
  isExposing,
  filmsRemaining,
  ownedUpgrades,
  kvp,
  mas,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [cameraPreset, setCameraPreset] = useState<CameraPreset>('BOOTH');
  const [hoveredRegion, setHoveredRegion] = useState<BodyRegion | null>(null);
  const [webglUnavailable, setWebglUnavailable] = useState<boolean>(false);
  const [dockCollapsed, setDockCollapsed] = useState<boolean>(false);

  // Refs for latest React props inside Three.js animation loop
  const selectedRegionRef = useRef<BodyRegion>(selectedRegion);
  const selectedPostureRef = useRef<PatientPosture>(selectedPosture);
  const onSelectRegionRef = useRef(onSelectRegion);
  const shieldUsedRef = useRef<boolean>(shieldUsed);
  const patientPreppedRef = useRef<boolean>(patientPrepped);
  const isExposingRef = useRef<boolean>(isExposing);
  const modalityRef = useRef(requestedExam.modality);
  const ownedUpgradesRef = useRef<UpgradeId[]>(ownedUpgrades);
  const cameraPresetRef = useRef<CameraPreset>(cameraPreset);
  const transitionActiveRef = useRef<boolean>(true);
  const patientSwapAnimRef = useRef<number>(0);

  useEffect(() => {
    selectedRegionRef.current = selectedRegion;
  }, [selectedRegion]);

  useEffect(() => {
    const prevErect = isErectPosture(selectedPostureRef.current);
    const nextErect = isErectPosture(selectedPosture);
    selectedPostureRef.current = selectedPosture;

    // Smoothly frame Erect Stand when toggling into/out of Erect if user hasn't dragged into FREE
    if (prevErect !== nextErect && cameraPresetRef.current !== 'FREE') {
      const nextCam: CameraPreset = nextErect ? 'ERECT' : 'BOOTH';
      setCameraPreset(nextCam);
      cameraPresetRef.current = nextCam;
      transitionActiveRef.current = true;
    }
  }, [selectedPosture]);

  useEffect(() => {
    onSelectRegionRef.current = onSelectRegion;
  }, [onSelectRegion]);
  useEffect(() => {
    shieldUsedRef.current = shieldUsed;
  }, [shieldUsed]);
  useEffect(() => {
    patientPreppedRef.current = patientPrepped;
  }, [patientPrepped]);
  useEffect(() => {
    isExposingRef.current = isExposing;
  }, [isExposing]);
  useEffect(() => {
    modalityRef.current = requestedExam.modality;
  }, [requestedExam.modality]);
  useEffect(() => {
    ownedUpgradesRef.current = ownedUpgrades;
  }, [ownedUpgrades]);

  useEffect(() => {
    patientSwapAnimRef.current = 1.0;
  }, [patient?.id]);

  const handleSelectPreset = (preset: CameraPreset) => {
    setCameraPreset(preset);
    cameraPresetRef.current = preset;
    if (preset !== 'FREE') {
      transitionActiveRef.current = true;
    }
  };

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const isSoftwareGl = (() => {
      try {
        const probe = document.createElement('canvas');
        const gl = probe.getContext('webgl2');
        if (!gl) return true;
        const ext = gl.getExtension('WEBGL_debug_renderer_info');
        const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
        const gpu = String(gl.getParameter(param));
        gl.getExtension('WEBGL_lose_context')?.loseContext();
        return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
      } catch {
        return true;
      }
    })();

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: !isSoftwareGl,
        powerPreference: 'high-performance',
      });
    } catch {
      setWebglUnavailable(true);
      return;
    }

    const initWidth = container.clientWidth || 840;
    const initHeight = container.clientHeight || 540;

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.18;
    renderer.setPixelRatio(
      isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2)
    );
    renderer.setSize(initWidth, initHeight);
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    const handleContextLost = (e: Event) => {
      e.preventDefault();
    };
    renderer.domElement.addEventListener('webglcontextlost', handleContextLost);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x09111c);
    scene.fog = new THREE.FogExp2(0x09111c, 0.042);

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(
      new RoomEnvironment(),
      0.04
    ).texture;
    pmremGenerator.dispose();

    const camera = new THREE.PerspectiveCamera(
      45,
      initWidth / initHeight,
      0.1,
      60
    );
    camera.position.set(...CAMERA_PRESETS.BOOTH.pos);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.065;
    controls.minDistance = 1.7;
    controls.maxDistance = 8.0;
    controls.maxPolarAngle = Math.PI / 2 - 0.04;
    controls.target.set(...CAMERA_PRESETS.BOOTH.target);
    controls.update();

    controls.addEventListener('start', () => {
      transitionActiveRef.current = false;
      if (cameraPresetRef.current !== 'FREE') {
        cameraPresetRef.current = 'FREE';
        setCameraPreset('FREE');
      }
    });

    // =========================================================================
    // STUDIO 3-POINT MEDICAL LIGHTING RIG
    // =========================================================================
    const hemiLight = new THREE.HemisphereLight(0xd8efff, 0x1a2538, 0.9);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfff4e6, 1.55);
    keyLight.position.set(2.4, 5.4, 3.4);
    if (!isSoftwareGl) {
      keyLight.castShadow = true;
      keyLight.shadow.mapSize.width = 1024;
      keyLight.shadow.mapSize.height = 1024;
      keyLight.shadow.camera.left = -4.5;
      keyLight.shadow.camera.right = 4.5;
      keyLight.shadow.camera.top = 4.5;
      keyLight.shadow.camera.bottom = -4.5;
      keyLight.shadow.bias = -0.0005;
      keyLight.shadow.normalBias = 0.02;
    }
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x38bdf8, 0.85);
    rimLight.position.set(-3.6, 3.2, -3.4);
    scene.add(rimLight);

    const lightboxGlowLight = new THREE.PointLight(0x67e8f9, 1.15, 5.5);
    lightboxGlowLight.position.set(-0.2, 1.9, -2.1);
    scene.add(lightboxGlowLight);

    const exposureFlashLight = new THREE.PointLight(0x22d3ee, 0, 4.5);
    scene.add(exposureFlashLight);

    // =========================================================================
    // PROCEDURAL MATERIALS & TEXTURES
    // =========================================================================
    const disposables: {dispose: () => void}[] = [];
    const track = <T extends {dispose: () => void}>(item: T): T => {
      disposables.push(item);
      return item;
    };

    const floorTex = track(createTileFloorTexture());
    floorTex.anisotropy = renderer.capabilities.getMaxAnisotropy();
    const shadowTex = track(createContactShadowTexture());
    const lightboxTex = track(createLightboxTexture());
    lightboxTex.anisotropy = renderer.capabilities.getMaxAnisotropy();
    const detectorTex = track(createDetectorPanelTexture());
    detectorTex.anisotropy = renderer.capabilities.getMaxAnisotropy();
    const monitorTex = track(createBoothMonitorTexture());
    monitorTex.anisotropy = renderer.capabilities.getMaxAnisotropy();

    const matFloor = track(
      new THREE.MeshStandardMaterial({
        map: floorTex,
        roughness: 0.45,
        metalness: 0.15,
      })
    );
    const matWall = track(
      new THREE.MeshStandardMaterial({
        color: 0x162232,
        roughness: 0.78,
        metalness: 0.06,
      })
    );
    const matWallLower = track(
      new THREE.MeshStandardMaterial({
        color: 0x1e2e44,
        roughness: 0.62,
        metalness: 0.12,
      })
    );
    const matTrim = track(
      new THREE.MeshStandardMaterial({
        color: 0x33475e,
        roughness: 0.36,
        metalness: 0.6,
      })
    );
    const matClinicalWhite = track(
      new THREE.MeshStandardMaterial({
        color: 0xe6edf5,
        roughness: 0.25,
        metalness: 0.16,
      })
    );
    const matChrome = track(
      new THREE.MeshPhysicalMaterial({
        color: 0xdbe4ee,
        roughness: 0.14,
        metalness: 0.94,
        clearcoat: 0.4,
      })
    );
    const matDarkPad = track(
      new THREE.MeshStandardMaterial({
        color: 0x141e2c,
        roughness: 0.74,
        metalness: 0.08,
      })
    );
    const matSkin = track(
      new THREE.MeshStandardMaterial({
        color: 0xdba88a,
        roughness: 0.62,
        metalness: 0.02,
      })
    );
    const matHair = track(
      new THREE.MeshStandardMaterial({
        color: 0x1e2530,
        roughness: 0.85,
        metalness: 0.04,
      })
    );
    const matScrubs = track(
      new THREE.MeshStandardMaterial({
        color: 0x2563eb,
        roughness: 0.72,
        metalness: 0.05,
      })
    );
    const matPants = track(
      new THREE.MeshStandardMaterial({
        color: 0x2b3b52,
        roughness: 0.78,
        metalness: 0.04,
      })
    );
    const matLeadApron = track(
      new THREE.MeshStandardMaterial({
        color: 0x0284c7,
        roughness: 0.42,
        metalness: 0.28,
      })
    );
    const matLeadGlass = track(
      new THREE.MeshPhysicalMaterial({
        color: 0x67e8f9,
        transparent: true,
        opacity: 0.2,
        roughness: 0.06,
        metalness: 0.1,
        depthWrite: false,
      })
    );
    const matLedStrip = track(
      new THREE.MeshStandardMaterial({
        color: 0x67e8f9,
        emissive: 0x06b6d4,
        emissiveIntensity: 1.15,
        roughness: 0.2,
      })
    );
    const matWarningBeacon = track(
      new THREE.MeshStandardMaterial({
        color: 0x451a03,
        emissive: 0xf59e0b,
        emissiveIntensity: 0.1,
        roughness: 0.25,
      })
    );

    // =========================================================================
    // 1. ARCHITECTURAL RADIOLOGY SUITE (Floor, Walls, Safety Zone, Lightbox, Booth)
    // =========================================================================
    const floorMesh = new THREE.Mesh(
      track(new THREE.PlaneGeometry(12, 10)),
      matFloor
    );
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.receiveShadow = true;
    scene.add(floorMesh);

    // Subtle safety perimeter ring on floor around table & erect area (polygonOffset)
    const floorZoneMat = track(
      new THREE.MeshBasicMaterial({
        color: 0x0ea5e9,
        transparent: true,
        opacity: 0.26,
        side: THREE.DoubleSide,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -1,
      })
    );
    const tableFloorZone = new THREE.Mesh(
      track(new THREE.RingGeometry(1.48, 1.54, 64)),
      floorZoneMat
    );
    tableFloorZone.rotation.x = -Math.PI / 2;
    tableFloorZone.position.set(0, 0.008, 0);
    scene.add(tableFloorZone);

    // Back wall + Lower protective wainscot panel
    const backWall = new THREE.Mesh(
      track(new THREE.BoxGeometry(11.5, 3.8, 0.18)),
      matWall
    );
    backWall.position.set(0.3, 1.9, -2.85);
    backWall.receiveShadow = true;
    scene.add(backWall);

    const backWainscot = new THREE.Mesh(
      track(new THREE.BoxGeometry(11.4, 1.05, 0.04)),
      matWallLower
    );
    backWainscot.position.set(0.3, 0.525, -2.74);
    scene.add(backWainscot);

    // Right wall
    const rightWall = new THREE.Mesh(
      track(new THREE.BoxGeometry(0.18, 3.8, 10)),
      matWall
    );
    rightWall.position.set(4.5, 1.9, 0.4);
    rightWall.receiveShadow = true;
    scene.add(rightWall);

    // Architectural cyan light strip on back wall + ceiling LED coves
    const backLed = new THREE.Mesh(
      track(new THREE.BoxGeometry(10.8, 0.055, 0.04)),
      matLedStrip
    );
    backLed.position.set(0.3, 3.05, -2.73);
    scene.add(backLed);

    [-1.45, 1.45].forEach((cz) => {
      const ceilingLight = new THREE.Mesh(
        track(new THREE.BoxGeometry(4.2, 0.04, 0.22)),
        matLedStrip
      );
      ceilingLight.position.set(0.4, 3.6, cz);
      scene.add(ceilingLight);
    });

    // Wall-Mounted Medical Lightbox on Back Wall
    const lightboxGroup = new THREE.Group();
    const lightboxFrame = new THREE.Mesh(
      track(new THREE.BoxGeometry(2.35, 1.22, 0.08)),
      matChrome
    );
    lightboxGroup.add(lightboxFrame);

    const lightboxScreen = new THREE.Mesh(
      track(new THREE.PlaneGeometry(2.18, 1.06)),
      track(
        new THREE.MeshStandardMaterial({
          map: lightboxTex,
          emissiveMap: lightboxTex,
          emissive: new THREE.Color(0xffffff),
          emissiveIntensity: 0.92,
          roughness: 0.2,
        })
      )
    );
    lightboxScreen.position.z = 0.045;
    lightboxGroup.add(lightboxScreen);
    lightboxGroup.position.set(-0.2, 1.92, -2.71);
    scene.add(lightboxGroup);

    // Control Booth Lead-Glass Partition + Dual Monitor Desk + Exposure Warning Beacon
    const boothGroup = new THREE.Group();
    const boothBase = new THREE.Mesh(
      track(new THREE.BoxGeometry(2.3, 0.96, 0.14)),
      matTrim
    );
    boothBase.position.set(-2.45, 0.48, 2.35);
    boothGroup.add(boothBase);

    const boothGlass = new THREE.Mesh(
      track(new THREE.BoxGeometry(2.14, 1.26, 0.04)),
      matLeadGlass
    );
    boothGlass.position.set(-2.45, 1.56, 2.35);
    boothGroup.add(boothGlass);

    const boothTop = new THREE.Mesh(
      track(new THREE.BoxGeometry(2.3, 0.1, 0.14)),
      matTrim
    );
    boothTop.position.set(-2.45, 2.24, 2.35);
    boothGroup.add(boothTop);

    // Radiation Exposure Amber Warning Beacon on top of Booth Frame
    const beaconMesh = new THREE.Mesh(
      track(new THREE.CylinderGeometry(0.06, 0.075, 0.12, 16)),
      matWarningBeacon
    );
    beaconMesh.position.set(-2.45, 2.35, 2.35);
    boothGroup.add(beaconMesh);

    const deskTop = new THREE.Mesh(
      track(new THREE.BoxGeometry(1.5, 0.08, 0.56)),
      matClinicalWhite
    );
    deskTop.position.set(-2.45, 0.88, 2.82);
    boothGroup.add(deskTop);

    [-2.78, -2.12].forEach((mx) => {
      const monitorHousing = new THREE.Mesh(
        track(new THREE.BoxGeometry(0.56, 0.36, 0.04)),
        matTrim
      );
      monitorHousing.position.set(mx, 1.13, 2.72);
      boothGroup.add(monitorHousing);

      const monitorScreen = new THREE.Mesh(
        track(new THREE.PlaneGeometry(0.5, 0.3)),
        track(
          new THREE.MeshStandardMaterial({
            map: monitorTex,
            emissiveMap: monitorTex,
            emissive: new THREE.Color(0xffffff),
            emissiveIntensity: 0.8,
          })
        )
      );
      monitorScreen.position.set(mx, 1.13, 2.745);
      boothGroup.add(monitorScreen);
    });
    scene.add(boothGroup);

    // =========================================================================
    // 2. MOTORIZED EXAMINATION TABLE (Left/Center Zone)
    // =========================================================================
    const tableContactShadow = new THREE.Mesh(
      track(new THREE.PlaneGeometry(3.4, 1.8)),
      track(
        new THREE.MeshBasicMaterial({
          map: shadowTex,
          transparent: true,
          depthWrite: false,
        })
      )
    );
    tableContactShadow.rotation.x = -Math.PI / 2;
    tableContactShadow.position.y = 0.012;
    scene.add(tableContactShadow);

    const tableBaseGroup = new THREE.Group();
    const tableFoot = new THREE.Mesh(
      track(new THREE.BoxGeometry(1.42, 0.1, 0.88)),
      matTrim
    );
    tableFoot.position.y = 0.05;
    tableFoot.castShadow = true;
    tableFoot.receiveShadow = true;
    tableBaseGroup.add(tableFoot);

    const hydraulicPedestal = new THREE.Mesh(
      track(new THREE.BoxGeometry(0.64, 0.68, 0.58)),
      matClinicalWhite
    );
    hydraulicPedestal.position.y = 0.42;
    hydraulicPedestal.castShadow = true;
    tableBaseGroup.add(hydraulicPedestal);

    const pedestalAccent = new THREE.Mesh(
      track(new THREE.BoxGeometry(0.66, 0.04, 0.6)),
      matLedStrip
    );
    pedestalAccent.position.y = 0.72;
    tableBaseGroup.add(pedestalAccent);

    const buckyTray = new THREE.Mesh(
      track(new THREE.BoxGeometry(2.55, 0.09, 0.94)),
      matTrim
    );
    buckyTray.position.y = 0.8;
    buckyTray.castShadow = true;
    tableBaseGroup.add(buckyTray);
    scene.add(tableBaseGroup);

    const slidingTableGroup = new THREE.Group();
    const tabletop = new THREE.Mesh(
      track(new THREE.BoxGeometry(2.75, 0.07, 0.88)),
      matClinicalWhite
    );
    tabletop.position.y = 0.885;
    tabletop.castShadow = true;
    tabletop.receiveShadow = true;
    slidingTableGroup.add(tabletop);

    const cushionPad = new THREE.Mesh(
      track(new THREE.BoxGeometry(2.64, 0.045, 0.78)),
      matDarkPad
    );
    cushionPad.position.y = 0.94;
    cushionPad.receiveShadow = true;
    slidingTableGroup.add(cushionPad);

    const pillow = new THREE.Mesh(
      track(new THREE.BoxGeometry(0.32, 0.075, 0.44)),
      matClinicalWhite
    );
    pillow.position.set(-1.02, 0.985, 0);
    slidingTableGroup.add(pillow);
    scene.add(slidingTableGroup);

    // =========================================================================
    // 3. UPRIGHT WALL BUCKY STAND (ERECT STAND AT RIGHT ZONE)
    // =========================================================================
    const wallBuckyGroup = new THREE.Group();
    wallBuckyGroup.position.set(ERECT_STAND_X, 0, ERECT_Z);

    const standShadow = new THREE.Mesh(
      track(new THREE.PlaneGeometry(1.6, 1.5)),
      track(
        new THREE.MeshBasicMaterial({
          map: shadowTex,
          transparent: true,
          depthWrite: false,
        })
      )
    );
    standShadow.rotation.x = -Math.PI / 2;
    standShadow.position.set(-0.35, 0.012, 0);
    wallBuckyGroup.add(standShadow);

    // Patient Standing Footplate
    const footPlatform = new THREE.Mesh(
      track(new THREE.BoxGeometry(0.76, 0.04, 0.78)),
      matTrim
    );
    footPlatform.position.set(-0.46, 0.02, 0);
    footPlatform.receiveShadow = true;
    wallBuckyGroup.add(footPlatform);

    const standColumnBase = new THREE.Mesh(
      track(new THREE.BoxGeometry(0.34, 0.08, 0.44)),
      matTrim
    );
    standColumnBase.position.set(0.08, 0.04, 0);
    wallBuckyGroup.add(standColumnBase);

    const standColumn = new THREE.Mesh(
      track(new THREE.BoxGeometry(0.16, 2.25, 0.22)),
      matClinicalWhite
    );
    standColumn.position.set(0.12, 1.15, 0);
    standColumn.castShadow = true;
    wallBuckyGroup.add(standColumn);

    const standChromeRail = new THREE.Mesh(
      track(new THREE.BoxGeometry(0.05, 2.15, 0.08)),
      matChrome
    );
    standChromeRail.position.set(0.03, 1.15, 0);
    wallBuckyGroup.add(standChromeRail);

    // Sliding Wall Detector Carriage
    const erectBuckyCarriage = new THREE.Group();
    erectBuckyCarriage.position.set(-0.08, 1.28, 0);

    const detectorHousing = new THREE.Mesh(
      track(new THREE.BoxGeometry(0.1, 0.56, 0.54)),
      matClinicalWhite
    );
    detectorHousing.castShadow = true;
    erectBuckyCarriage.add(detectorHousing);

    const detectorFace = new THREE.Mesh(
      track(new THREE.PlaneGeometry(0.48, 0.5)),
      track(
        new THREE.MeshStandardMaterial({
          map: detectorTex,
          emissiveMap: detectorTex,
          emissive: new THREE.Color(0x38bdf8),
          emissiveIntensity: 0.35,
          roughness: 0.35,
        })
      )
    );
    detectorFace.rotation.y = -Math.PI / 2;
    detectorFace.position.x = -0.053;
    erectBuckyCarriage.add(detectorFace);

    // Dual Side Hand-Grips on Wall Bucky
    [-0.31, 0.31].forEach((hz) => {
      const grip = new THREE.Mesh(
        track(new THREE.CylinderGeometry(0.018, 0.018, 0.36, 12)),
        matChrome
      );
      grip.position.set(-0.07, 0.05, hz);
      erectBuckyCarriage.add(grip);
    });

    wallBuckyGroup.add(erectBuckyCarriage);
    scene.add(wallBuckyGroup);

    // =========================================================================
    // 4. SCULPTED ARTICULATED 3D PATIENT RIG (Supports Lying & Standing Poses)
    // =========================================================================
    // Hierarchy: patientWorldAnchor (pos + lying/standing tilt) -> patientLocalBody (roll/facing Y)
    // Local upright convention: Head +Y, Feet -Y, Face/Chest +Z, Left +X, Right -X
    const patientWorldAnchor = new THREE.Group();
    const patientLocalBody = new THREE.Group();
    patientWorldAnchor.add(patientLocalBody);
    scene.add(patientWorldAnchor);

    // Pelvis / Hips (center at local y = 0)
    const pPelvis = new THREE.Mesh(
      track(new THREE.CapsuleGeometry(0.145, 0.14, 12, 20)),
      matPants
    );
    pPelvis.rotation.z = Math.PI / 2;
    pPelvis.scale.set(1, 1.05, 0.78);
    pPelvis.position.set(0, -0.04, 0);
    pPelvis.castShadow = true;
    patientLocalBody.add(pPelvis);

    // Abdomen
    const pAbdomen = new THREE.Mesh(
      track(new THREE.CapsuleGeometry(0.145, 0.18, 12, 20)),
      matScrubs
    );
    pAbdomen.scale.set(1.12, 1, 0.78);
    pAbdomen.position.set(0, 0.12, 0);
    pAbdomen.castShadow = true;
    patientLocalBody.add(pAbdomen);

    // Sculpted Chest (animates gently forward/back with breathing)
    const pChest = new THREE.Mesh(
      track(new THREE.CapsuleGeometry(0.17, 0.22, 14, 22)),
      matScrubs
    );
    pChest.scale.set(1.18, 1, 0.78);
    pChest.position.set(0, 0.34, 0.01);
    pChest.castShadow = true;
    patientLocalBody.add(pChest);

    // Neck + Head Group (allows turning cheek in Prone pose)
    const pHeadGroup = new THREE.Group();
    pHeadGroup.position.set(0, 0.56, 0);

    const pNeck = new THREE.Mesh(
      track(new THREE.CylinderGeometry(0.058, 0.068, 0.14, 16)),
      matSkin
    );
    pNeck.position.set(0, 0.05, 0);
    pHeadGroup.add(pNeck);

    const pHead = new THREE.Mesh(
      track(new THREE.SphereGeometry(0.128, 24, 20)),
      matSkin
    );
    pHead.scale.set(0.92, 1.08, 0.98);
    pHead.position.set(0, 0.22, 0.01);
    pHead.castShadow = true;
    pHeadGroup.add(pHead);

    // Nose & Brow subtle cue so Anterior (+Z) face direction is unmistakable!
    const pNose = new THREE.Mesh(
      track(new THREE.ConeGeometry(0.025, 0.055, 12)),
      matSkin
    );
    pNose.rotation.x = Math.PI / 2;
    pNose.position.set(0, 0.21, 0.135);
    pHeadGroup.add(pNose);

    // Hair cap on back/top of head
    const pHair = new THREE.Mesh(
      track(
        new THREE.SphereGeometry(
          0.132,
          20,
          16,
          0,
          Math.PI * 2,
          0,
          Math.PI * 0.58
        )
      ),
      matHair
    );
    pHair.rotation.x = -0.35;
    pHair.position.set(0, 0.23, -0.005);
    pHeadGroup.add(pHair);

    patientLocalBody.add(pHeadGroup);

    // Articulated Left (+X) & Right (-X) Arms
    const armGroups: THREE.Group[] = [];
    [1, -1].forEach((side) => {
      const shoulderPivot = new THREE.Group();
      shoulderPivot.position.set(side * 0.25, 0.44, 0);

      const shoulder = new THREE.Mesh(
        track(new THREE.SphereGeometry(0.064, 14, 12)),
        matScrubs
      );
      shoulderPivot.add(shoulder);

      const upperArm = new THREE.Mesh(
        track(new THREE.CapsuleGeometry(0.048, 0.24, 10, 14)),
        matScrubs
      );
      upperArm.position.set(0, -0.16, 0);
      upperArm.castShadow = true;
      shoulderPivot.add(upperArm);

      const forearm = new THREE.Mesh(
        track(new THREE.CapsuleGeometry(0.04, 0.22, 10, 14)),
        matSkin
      );
      forearm.position.set(0, -0.42, 0.04);
      forearm.rotation.x = -0.15;
      forearm.castShadow = true;
      shoulderPivot.add(forearm);

      const hand = new THREE.Mesh(
        track(new THREE.BoxGeometry(0.05, 0.11, 0.085)),
        matSkin
      );
      hand.position.set(0, -0.57, 0.06);
      shoulderPivot.add(hand);

      patientLocalBody.add(shoulderPivot);
      armGroups.push(shoulderPivot);
    });

    // Articulated Left (+X) & Right (-X) Legs with Knee Pivots
    const thighPivots: THREE.Group[] = [];
    const kneePivots: THREE.Group[] = [];
    [1, -1].forEach((side) => {
      const hipPivot = new THREE.Group();
      hipPivot.position.set(side * 0.11, -0.12, 0);

      const thigh = new THREE.Mesh(
        track(new THREE.CapsuleGeometry(0.068, 0.34, 10, 16)),
        matPants
      );
      thigh.position.set(0, -0.22, 0);
      thigh.castShadow = true;
      hipPivot.add(thigh);

      const kneeJoint = new THREE.Group();
      kneeJoint.position.set(0, -0.44, 0);

      const kneeCap = new THREE.Mesh(
        track(new THREE.SphereGeometry(0.064, 14, 12)),
        matPants
      );
      kneeJoint.add(kneeCap);

      const shin = new THREE.Mesh(
        track(new THREE.CapsuleGeometry(0.054, 0.34, 10, 16)),
        matPants
      );
      shin.position.set(0, -0.22, 0);
      shin.castShadow = true;
      kneeJoint.add(shin);

      const foot = new THREE.Mesh(
        track(new THREE.BoxGeometry(0.085, 0.065, 0.17)),
        matClinicalWhite
      );
      foot.position.set(0, -0.43, 0.055);
      foot.castShadow = true;
      kneeJoint.add(foot);

      hipPivot.add(kneeJoint);
      patientLocalBody.add(hipPivot);
      thighPivots.push(hipPivot);
      kneePivots.push(kneeJoint);
    });

    // 3D Lead Apron Shield (covers anterior pelvis/abdomen)
    const leadApronMesh = new THREE.Mesh(
      track(new THREE.BoxGeometry(0.36, 0.32, 0.045)),
      matLeadApron
    );
    leadApronMesh.position.set(0, -0.02, 0.145);
    leadApronMesh.visible = false;
    patientLocalBody.add(leadApronMesh);

    // Clickable Anatomical Hotspots attached inside patientWorldAnchor (rotate naturally!)
    const hotspotMeshes: THREE.Mesh[] = [];
    const hotspotRings: {region: BodyRegion; mesh: THREE.Mesh}[] = [];
    const hotspotRingMatBase = track(
      new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.45,
        side: THREE.DoubleSide,
      })
    );

    ANATOMY_SPOTS.forEach((spot) => {
      const hitMesh = new THREE.Mesh(
        track(new THREE.SphereGeometry(spot.radius, 14, 12)),
        track(new THREE.MeshBasicMaterial({visible: false}))
      );
      hitMesh.position.set(spot.lateralX, spot.spineY, 0.02);
      hitMesh.layers.set(1);
      hitMesh.userData.regionId = spot.id;
      patientLocalBody.add(hitMesh);
      hotspotMeshes.push(hitMesh);

      const ring = new THREE.Mesh(
        track(
          new THREE.RingGeometry(spot.radius * 0.68, spot.radius * 0.9, 28)
        ),
        track(hotspotRingMatBase.clone())
      );
      ring.position.set(spot.lateralX, spot.spineY, 0.17);
      patientLocalBody.add(ring);
      hotspotRings.push({region: spot.id, mesh: ring});
    });

    // =========================================================================
    // 5. ARTICULATED OVERHEAD CEILING X-RAY TUBE CRANE (Rotates for Erect!)
    // =========================================================================
    const railGroup = new THREE.Group();
    [-0.7, 0.7].forEach((rz) => {
      const rail = new THREE.Mesh(
        track(new THREE.BoxGeometry(4.6, 0.08, 0.08)),
        matChrome
      );
      rail.position.set(0.2, 3.38, rz);
      railGroup.add(rail);
    });
    scene.add(railGroup);

    const gantryCarriage = new THREE.Group();
    const bridgeBar = new THREE.Mesh(
      track(new THREE.BoxGeometry(0.3, 0.1, 1.54)),
      matTrim
    );
    bridgeBar.position.set(0, 3.33, 0);
    gantryCarriage.add(bridgeBar);

    const tubeAssembly = new THREE.Group();
    const teleColumn = new THREE.Mesh(
      track(new THREE.CylinderGeometry(0.075, 0.088, 2.2, 18)),
      matChrome
    );
    teleColumn.position.set(0, 1.15, 0);
    tubeAssembly.add(teleColumn);

    const tubeYoke = new THREE.Mesh(
      track(new THREE.BoxGeometry(0.32, 0.18, 0.24)),
      matClinicalWhite
    );
    tubeYoke.position.set(0, 0.12, 0);
    tubeAssembly.add(tubeYoke);

    // Pivoting Tube + Collimator Head (rotates +90 deg Z in Erect Mode!)
    const tubePivot = new THREE.Group();
    tubePivot.position.set(0, 0, 0);

    const tubeCylinder = new THREE.Mesh(
      track(new THREE.CylinderGeometry(0.145, 0.145, 0.48, 24)),
      matClinicalWhite
    );
    tubeCylinder.rotation.z = Math.PI / 2;
    tubeCylinder.castShadow = true;
    tubePivot.add(tubeCylinder);

    [-0.25, 0.25].forEach((ex) => {
      const cap = new THREE.Mesh(
        track(new THREE.CylinderGeometry(0.14, 0.14, 0.045, 24)),
        matChrome
      );
      cap.rotation.z = Math.PI / 2;
      cap.position.set(ex, 0, 0);
      tubePivot.add(cap);
    });

    // Tube top status band
    const tubeRing = new THREE.Mesh(
      track(new THREE.TorusGeometry(0.15, 0.015, 10, 24)),
      matLedStrip
    );
    tubeRing.rotation.y = Math.PI / 2;
    tubePivot.add(tubeRing);

    const collimatorBox = new THREE.Mesh(
      track(new THREE.BoxGeometry(0.22, 0.17, 0.22)),
      matTrim
    );
    collimatorBox.position.set(0, -0.19, 0);
    tubePivot.add(collimatorBox);

    const beamMat = track(
      new THREE.MeshBasicMaterial({
        color: 0x22d3ee,
        transparent: true,
        opacity: 0.15,
        side: THREE.DoubleSide,
        depthWrite: false,
      })
    );
    const beamCone = new THREE.Mesh(
      track(new THREE.ConeGeometry(0.34, 0.92, 24, 1, true)),
      beamMat
    );
    beamCone.position.set(0, -0.72, 0);
    tubePivot.add(beamCone);

    tubeAssembly.add(tubePivot);
    tubeAssembly.position.set(0, 1.92, 0);
    gantryCarriage.add(tubeAssembly);
    scene.add(gantryCarriage);

    // =========================================================================
    // 6. OPTIONAL UPGRADE PROPS (CT / MRI Gantry Ring + Auto Processor)
    // =========================================================================
    const ctMriGantryGroup = new THREE.Group();
    const outerRing = new THREE.Mesh(
      track(new THREE.TorusGeometry(0.88, 0.22, 20, 48)),
      matClinicalWhite
    );
    outerRing.rotation.y = Math.PI / 2;
    outerRing.position.set(-0.35, 1.25, 0);
    outerRing.castShadow = true;
    ctMriGantryGroup.add(outerRing);

    const innerGlowRing = new THREE.Mesh(
      track(new THREE.TorusGeometry(0.69, 0.025, 12, 48)),
      matLedStrip
    );
    innerGlowRing.rotation.y = Math.PI / 2;
    innerGlowRing.position.set(-0.35, 1.25, 0);
    ctMriGantryGroup.add(innerGlowRing);
    ctMriGantryGroup.visible = false;
    scene.add(ctMriGantryGroup);

    const processorGroup = new THREE.Group();
    const sideDesk = new THREE.Mesh(
      track(new THREE.BoxGeometry(0.85, 0.78, 0.55)),
      matTrim
    );
    sideDesk.position.set(2.8, 0.39, -2.15);
    processorGroup.add(sideDesk);

    const procUnit = new THREE.Mesh(
      track(new THREE.BoxGeometry(0.54, 0.32, 0.42)),
      matClinicalWhite
    );
    procUnit.position.set(2.8, 0.94, -2.15);
    processorGroup.add(procUnit);
    processorGroup.visible = false;
    scene.add(processorGroup);

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    // =========================================================================
    // 7. RAYCASTING (CLICK & HOVER ON 3D PATIENT ANATOMY)
    // =========================================================================
    const raycaster = new THREE.Raycaster();
    raycaster.layers.set(1);
    let pointerDownPos = {x: 0, y: 0};
    let lastHoverTime = 0;

    const getCanvasIntersects = (clientX: number, clientY: number) => {
      const rect = renderer.domElement.getBoundingClientRect();
      _pointerNdc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      _pointerNdc.y = -((clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(_pointerNdc, camera);
      return raycaster.intersectObjects(hotspotMeshes, false);
    };

    const onPointerDown = (e: PointerEvent) => {
      pointerDownPos = {x: e.clientX, y: e.clientY};
    };

    const onPointerUp = (e: PointerEvent) => {
      const dx = e.clientX - pointerDownPos.x;
      const dy = e.clientY - pointerDownPos.y;
      if (Math.hypot(dx, dy) > 8) return;

      const hits = getCanvasIntersects(e.clientX, e.clientY);
      if (hits.length > 0) {
        const regionId = hits[0].object.userData.regionId as
          | BodyRegion
          | undefined;
        if (regionId) {
          onSelectRegionRef.current(regionId);
        }
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      const now = performance.now();
      if (now - lastHoverTime < 45) return;
      lastHoverTime = now;

      const hits = getCanvasIntersects(e.clientX, e.clientY);
      if (hits.length > 0) {
        const regionId = hits[0].object.userData.regionId as
          | BodyRegion
          | undefined;
        if (regionId) {
          renderer.domElement.style.cursor = 'pointer';
          setHoveredRegion(regionId);
          return;
        }
      }
      renderer.domElement.style.cursor = 'grab';
      setHoveredRegion(null);
    };

    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    renderer.domElement.addEventListener('pointerup', onPointerUp);
    renderer.domElement.addEventListener('pointermove', onPointerMove);

    // =========================================================================
    // 8. RESIZE HANDLER
    // =========================================================================
    const resizeObserver = new ResizeObserver(() => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (w <= 0 || h <= 0) return;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    });
    resizeObserver.observe(container);

    // =========================================================================
    // 9. ANIMATION LOOP (Smooth Kinematics for All 8 Postures + Crane + Exposure)
    // =========================================================================
    const clock = new THREE.Clock();
    let frameId = 0;
    let disposed = false;
    let erectBlend = isErectPosture(selectedPostureRef.current) ? 1 : 0;

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (disposed) return;
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    function tick() {
      if (disposed) return;
      const delta = Math.min(clock.getDelta(), 0.05);
      const elapsed = clock.getElapsedTime();

      // 1. Camera Preset Smooth Glide
      const activePreset = cameraPresetRef.current;
      if (transitionActiveRef.current && activePreset !== 'FREE') {
        const cfg = CAMERA_PRESETS[activePreset];
        _camGoalPos.set(cfg.pos[0], cfg.pos[1], cfg.pos[2]);
        _camGoalTarget.set(cfg.target[0], cfg.target[1], cfg.target[2]);

        const alpha = 1 - Math.exp(-5.5 * delta);
        camera.position.lerp(_camGoalPos, alpha);
        controls.target.lerp(_camGoalTarget, alpha);

        if (
          camera.position.distanceTo(_camGoalPos) < 0.02 &&
          controls.target.distanceTo(_camGoalTarget) < 0.02
        ) {
          transitionActiveRef.current = false;
        }
      }
      controls.update();

      // 2. Patient Posture Kinematics (Table vs Erect + Spine Roll + Joints)
      const posture = selectedPostureRef.current;
      const isBoreScan =
        modalityRef.current === 'CT' || modalityRef.current === 'MRI';
      const targetErect = isErectPosture(posture) && !isBoreScan ? 1 : 0;
      erectBlend = THREE.MathUtils.damp(erectBlend, targetErect, 6.5, delta);

      if (patientSwapAnimRef.current > 0) {
        patientSwapAnimRef.current = Math.max(
          0,
          patientSwapAnimRef.current - delta * 2.2
        );
      }

      const tableGoalX = isBoreScan
        ? -0.25
        : patientSwapAnimRef.current * 0.45;
      slidingTableGroup.position.x = THREE.MathUtils.damp(
        slidingTableGroup.position.x,
        tableGoalX,
        6,
        delta
      );

      // Arc slightly upward mid-transition so patient never clips tabletop while standing up
      const arcLift = Math.sin(erectBlend * Math.PI) * 0.36;
      const lyingY =
        posture === 'TABLE_LEFT_LAT' || posture === 'TABLE_RIGHT_LAT'
          ? 1.14
          : 1.09;
      const standingY = 0.96;

      const anchorGoalX = THREE.MathUtils.lerp(
        slidingTableGroup.position.x,
        ERECT_PATIENT_X,
        erectBlend
      );
      const anchorGoalY =
        THREE.MathUtils.lerp(lyingY, standingY, erectBlend) + arcLift;
      const anchorGoalZ = THREE.MathUtils.lerp(0, ERECT_Z, erectBlend);

      patientWorldAnchor.position.set(anchorGoalX, anchorGoalY, anchorGoalZ);
      patientWorldAnchor.rotation.z = THREE.MathUtils.lerp(
        Math.PI / 2,
        0,
        erectBlend
      );

      // Smooth spine-axis roll / facing angle
      const targetYaw = getTargetBodyYaw(isBoreScan ? 'SUPINE' : posture);
      patientLocalBody.rotation.y = dampAngle(
        patientLocalBody.rotation.y,
        targetYaw,
        7.5,
        delta
      );

      // Pose-specific natural limb & head articulation
      const isErectLat =
        posture === 'ERECT_LEFT_LAT' || posture === 'ERECT_RIGHT_LAT';
      const isTableLat =
        posture === 'TABLE_LEFT_LAT' || posture === 'TABLE_RIGHT_LAT';
      const isProne = posture === 'PRONE';

      // Head gently turns sideways when lying Prone so cheek rests on pillow
      pHeadGroup.rotation.y = THREE.MathUtils.damp(
        pHeadGroup.rotation.y,
        isProne ? 0.5 : 0,
        7,
        delta
      );

      // Arms raise forward/up in Erect Lateral (clinical chest lateral!) or grip slightly in Erect PA
      const armGoalX = isErectLat ? -2.05 : posture === 'ERECT_PA' ? -0.45 : 0;
      const armGoalZ = posture === 'ERECT_PA' ? 0.16 : 0.06;
      armGroups.forEach((arm, idx) => {
        const sideSign = idx === 0 ? 1 : -1;
        arm.rotation.x = THREE.MathUtils.damp(
          arm.rotation.x,
          armGoalX,
          7,
          delta
        );
        arm.rotation.z = THREE.MathUtils.damp(
          arm.rotation.z,
          sideSign * armGoalZ,
          7,
          delta
        );
      });

      // Slight knee bend when lying on left/right side on table
      const hipFlex = isTableLat ? -0.34 : 0;
      const kneeFlex = isTableLat ? 0.56 : 0;
      thighPivots.forEach((hip) => {
        hip.rotation.x = THREE.MathUtils.damp(hip.rotation.x, hipFlex, 7, delta);
      });
      kneePivots.forEach((knee) => {
        knee.rotation.x = THREE.MathUtils.damp(
          knee.rotation.x,
          kneeFlex,
          7,
          delta
        );
      });

      // Breathing animation (pauses when patient holds breath!)
      const breathAmp = patientPreppedRef.current ? 0.002 : 0.013;
      pChest.position.z = 0.01 + Math.sin(elapsed * 2.4) * breathAmp;

      // 3. Ceiling X-Ray Crane & Wall Bucky Receptor Tracking
      const targetSpot =
        ANATOMY_SPOTS.find((s) => s.id === selectedRegionRef.current) ||
        ANATOMY_SPOTS[2];

      const tableBeamX = targetSpot.tableWorldX + slidingTableGroup.position.x;
      const erectTubeX = isExposingRef.current ? 1.05 : 0.96;

      const goalGantryX = THREE.MathUtils.lerp(
        tableBeamX,
        erectTubeX,
        erectBlend
      );
      const goalTubeZ = THREE.MathUtils.lerp(
        targetSpot.tableWorldZ,
        ERECT_Z,
        erectBlend
      );
      const tableTubeY = isExposingRef.current ? 1.8 : 1.92;
      const goalTubeY = THREE.MathUtils.lerp(
        tableTubeY,
        targetSpot.erectWorldY,
        erectBlend
      );
      const goalPivotZ = THREE.MathUtils.lerp(0, Math.PI / 2, erectBlend);

      gantryCarriage.position.x = THREE.MathUtils.damp(
        gantryCarriage.position.x,
        goalGantryX,
        7.5,
        delta
      );
      tubeAssembly.position.z = THREE.MathUtils.damp(
        tubeAssembly.position.z,
        goalTubeZ,
        7.5,
        delta
      );
      tubeAssembly.position.y = THREE.MathUtils.damp(
        tubeAssembly.position.y,
        goalTubeY,
        7.5,
        delta
      );
      tubePivot.rotation.z = THREE.MathUtils.damp(
        tubePivot.rotation.z,
        goalPivotZ,
        7.5,
        delta
      );

      // Wall Bucky Detector smoothly tracks standing region height
      erectBuckyCarriage.position.y = THREE.MathUtils.damp(
        erectBuckyCarriage.position.y,
        targetSpot.erectWorldY,
        7.5,
        delta
      );

      // 4. Exposure Beam Flash + Warning Beacon
      const targetOpacity = isExposingRef.current ? 0.65 : 0.14;
      beamMat.opacity = THREE.MathUtils.damp(
        beamMat.opacity,
        targetOpacity,
        15,
        delta
      );
      exposureFlashLight.intensity = THREE.MathUtils.damp(
        exposureFlashLight.intensity,
        isExposingRef.current ? 2.6 : 0,
        14,
        delta
      );
      exposureFlashLight.position.set(
        gantryCarriage.position.x + (erectBlend > 0.5 ? 0.55 : 0),
        tubeAssembly.position.y - (erectBlend > 0.5 ? 0 : 0.45),
        tubeAssembly.position.z
      );
      matWarningBeacon.emissiveIntensity = THREE.MathUtils.damp(
        matWarningBeacon.emissiveIntensity,
        isExposingRef.current ? 2.4 : 0.12,
        14,
        delta
      );

      // 5. Upgrade Props & Lead Shield Visibility
      ctMriGantryGroup.visible = isBoreScan;
      processorGroup.visible =
        ownedUpgradesRef.current.includes('auto_processor');
      leadApronMesh.visible =
        shieldUsedRef.current && selectedRegionRef.current !== 'pelvis';

      // 6. Highlight Active Anatomical Target Ring
      hotspotRings.forEach(({region, mesh}) => {
        const mat = mesh.material as THREE.MeshBasicMaterial;
        const isSel = region === selectedRegionRef.current;
        mat.color.setHex(isSel ? 0x22d3ee : 0x64748b);
        mat.opacity = isSel ? 0.9 : 0.25;
        const s = isSel ? 1.06 + Math.sin(elapsed * 4) * 0.05 : 1;
        mesh.scale.set(s, s, 1);
      });

      renderer.render(scene, camera);
      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    }

    tick();

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      resizeObserver.disconnect();
      renderer.domElement.removeEventListener(
        'webglcontextlost',
        handleContextLost
      );
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.domElement.removeEventListener('pointerup', onPointerUp);
      renderer.domElement.removeEventListener('pointermove', onPointerMove);
      controls.dispose();
      disposables.forEach((d) => d.dispose());
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  const hasDR = ownedUpgrades.includes('digital_dr');
  const installedGear = UPGRADES.filter((u) => ownedUpgrades.includes(u.id));
  const isErect = isErectPosture(selectedPosture);

  return (
    <div className="flex flex-col rounded-2xl border border-slate-800/90 bg-[#0D1522] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] overflow-hidden select-none">
      {/* 3D Viewport Stage */}
      <div className="relative w-full h-[480px] sm:h-[550px] bg-[#09111C]">
        {!webglUnavailable ? (
          <div ref={mountRef} className="w-full h-full" />
        ) : (
          <div className="w-full h-full flex items-center justify-center p-6">
            <img
              src={CLINIC_ROOM_IMAGE}
              alt="غرفة الأشعة"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover rounded-lg opacity-80"
            />
          </div>
        )}

        {/* Top Consultation HUD (No backdrop-blur over WebGL) */}
        {patient && (
          <div className="absolute top-3.5 right-3.5 left-3.5 z-10 flex flex-wrap items-start justify-between gap-3 pointer-events-none">
            <div className="pointer-events-auto flex items-center gap-3 rounded-xl bg-[#0A111C]/92 border border-slate-700/80 px-3.5 py-2.5 max-w-md">
              <img
                src={patient.avatarPath}
                alt={patient.nameAr}
                referrerPolicy="no-referrer"
                className="w-11 h-11 rounded-lg object-cover border border-cyan-400/50 shrink-0"
              />
              <div className="min-w-0 text-xs">
                <div className="font-bold text-cyan-300 truncate">
                  {patient.nameAr} · {POSTURE_LABELS_AR[selectedPosture]}
                </div>
                <p className="mt-0.5 text-slate-200 leading-snug line-clamp-2">
                  {patientPrepped
                    ? requestedExam.region === 'chest'
                      ? 'حاضر، كتمت نفسي وأنا جاهز للتصوير!'
                      : 'تم تثبيت وضعيتي بالكامل، تفضل بالتصوير.'
                    : `"${patient.complaintAr}"`}
                </p>
              </div>
            </div>

            <div className="pointer-events-auto flex items-center gap-2">
              <div className="hidden sm:flex items-center gap-2 rounded-lg bg-[#0A111C]/92 border border-slate-700/80 px-3 py-2 text-xs font-mono-num text-cyan-200">
                <span>{kvp} kVp</span>
                <span className="text-slate-600">|</span>
                <span>{mas} mAs</span>
              </div>

              <button
                type="button"
                onClick={onPrepPatient}
                disabled={patientPrepped}
                className={`px-3.5 py-2 rounded-lg text-xs font-bold whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer transition-colors ${
                  patientPrepped
                    ? 'bg-emerald-950/95 text-emerald-300 border border-emerald-500/60 cursor-default'
                    : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950'
                }`}
              >
                {patientPrepped ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    <span>المريض جاهز (+$2)</span>
                  </>
                ) : requestedExam.region === 'chest' ? (
                  <>
                    <Wind className="w-3.5 h-3.5 shrink-0" />
                    <span>اطلب كتم النفس (+$2)</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5 shrink-0" />
                    <span>تحضير وتثبيت المريض (+$2)</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Hovered 3D Region Tooltip */}
        {hoveredRegion && (
          <div className="absolute top-20 left-1/2 -translate-x-1/2 z-10 pointer-events-none rounded-lg bg-[#0A111C]/95 border border-cyan-500/60 px-3 py-1.5 text-xs font-semibold text-cyan-200">
            انقر لتوجيه أنبوب الأشعة نحو: {REGION_LABELS_AR[hoveredRegion]}
          </div>
        )}

        {/* Collapsible Bottom Camera Perspective Dock */}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center max-w-[96%]">
          <button
            type="button"
            onClick={() => setDockCollapsed((v) => !v)}
            className="px-3 py-1 rounded-t-lg bg-[#0A111C]/92 border border-b-0 border-slate-700/80 text-[11px] text-slate-300 hover:text-white flex items-center gap-1 cursor-pointer"
          >
            {dockCollapsed ? (
              <>
                <ChevronUp className="w-3.5 h-3.5 text-cyan-400" />
                <span>إظهار الكاميرا</span>
              </>
            ) : (
              <>
                <ChevronDown className="w-3.5 h-3.5 text-cyan-400" />
                <span>إخفاء الكاميرا</span>
              </>
            )}
          </button>

          {!dockCollapsed && (
            <div className="flex flex-wrap items-center justify-center gap-1 rounded-xl bg-[#0A111C]/94 border border-slate-700/80 p-1.5">
              <div className="hidden sm:flex items-center gap-1.5 px-2 text-xs text-slate-400 shrink-0">
                <Camera className="w-3.5 h-3.5 text-cyan-400" />
              </div>
              {(['BOOTH', 'ERECT', 'SIDE', 'OVERHEAD'] as const).map(
                (presetKey) => {
                  const active = cameraPreset === presetKey;
                  return (
                    <button
                      key={presetKey}
                      type="button"
                      onClick={() => handleSelectPreset(presetKey)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                        active
                          ? 'bg-cyan-500 text-slate-950 font-bold'
                          : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      {CAMERA_PRESETS[presetKey].label}
                    </button>
                  );
                }
              )}
              {cameraPreset === 'FREE' && (
                <span className="px-2.5 py-1 text-xs font-semibold text-cyan-300 whitespace-nowrap shrink-0">
                  تدوير حر 360°
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Interactive Posture & Anatomical Quick Deck below Canvas */}
      <div className="px-5 py-3.5 border-t border-slate-800/90 bg-[#101A29] space-y-3">
        {/* Live 3D Posture Switcher */}
        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-1.5 text-slate-200 font-semibold">
              <User className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <span>وضعية المريض في المشهد ثلاثي الأبعاد:</span>
            </div>
            <span className="text-cyan-300 font-medium">
              {isErect
                ? 'الحامل الجداري القائم (Erect)'
                : 'طاولة الفحص الأفقية (Table)'}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {(
              [
                {
                  id: 'SUPINE',
                  label: 'على الظهر (Supine)',
                },
                {
                  id: 'PRONE',
                  label: 'على البطن (Prone)',
                },
                {
                  id: 'TABLE_LEFT_LAT',
                  label: 'طاولة جانبي يسار',
                },
                {
                  id: 'TABLE_RIGHT_LAT',
                  label: 'طاولة جانبي يمين',
                },
                {
                  id: 'ERECT_PA',
                  label: 'واقف (Erect PA)',
                },
                {
                  id: 'ERECT_AP',
                  label: 'واقف (Erect AP)',
                },
                {
                  id: 'ERECT_LEFT_LAT',
                  label: 'واقف جانبي يسار',
                },
                {
                  id: 'ERECT_RIGHT_LAT',
                  label: 'واقف جانبي يمين',
                },
              ] as {id: PatientPosture; label: string}[]
            ).map((item) => {
              const active = selectedPosture === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectPosture(item.id)}
                  className={`px-2.5 py-2 rounded-lg text-xs font-medium whitespace-nowrap truncate transition-colors cursor-pointer ${
                    active
                      ? 'bg-cyan-500 text-slate-950 font-bold'
                      : 'bg-[#0B131F] text-slate-300 border border-slate-800 hover:border-slate-600 hover:text-white'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Anatomical Targeting Strip */}
        <div className="pt-2.5 border-t border-slate-800/80">
          <div className="flex items-center justify-between gap-3 mb-2 text-xs">
            <div className="flex items-center gap-1.5 text-slate-300 font-medium">
              <Crosshair className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <span>توجيه الأنبوب نحو المنطقة التشريحية:</span>
            </div>
            {shieldUsed && (
              <div className="flex items-center gap-1 text-sky-300">
                <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                <span>درع الرصاص مفعّل</span>
              </div>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {ANATOMY_SPOTS.map((spot) => {
              const active = spot.id === selectedRegion;
              return (
                <button
                  key={spot.id}
                  type="button"
                  onClick={() => onSelectRegion(spot.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                    active
                      ? 'bg-cyan-500/20 text-cyan-200 border border-cyan-400/60'
                      : 'bg-[#0B131F] text-slate-300 border border-slate-800 hover:border-slate-600 hover:text-white'
                  }`}
                >
                  {spot.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Active Clinic Equipment & Film Inventory Strip */}
      <div className="px-5 py-3 border-t border-slate-800 bg-[#0A1019]">
        <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
          <span>تجهيزات ومخزون الغرفة</span>
          <span>
            {hasDR ? 'التصوير الرقمي نشط' : `${filmsRemaining} فيلم متاح`}
          </span>
        </div>
        <div className="flex items-center gap-3 overflow-x-auto pb-1">
          <div className="flex items-center gap-2.5 rounded-lg border border-slate-800 bg-[#111B2A] p-2 shrink-0">
            <img
              src={FILM_CARTON_IMAGE}
              alt="أفلام الأشعة"
              referrerPolicy="no-referrer"
              className="w-9 h-9 rounded-md object-cover shrink-0"
            />
            <div className="text-xs">
              <div className="font-semibold text-white">أفلام الأشعة</div>
              <div className="font-mono-num text-cyan-300">
                {hasDR ? 'رقمي DR' : `${filmsRemaining} فيلم`}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 rounded-lg border border-slate-800 bg-[#111B2A] p-2 shrink-0">
            <img
              src={CLINIC_ROOM_IMAGE}
              alt="جهاز الأشعة الأساسي"
              referrerPolicy="no-referrer"
              className="w-9 h-9 rounded-md object-cover shrink-0"
            />
            <div className="text-xs">
              <div className="font-semibold text-white">جهاز الأشعة</div>
              <div className="text-emerald-400">نشط</div>
            </div>
          </div>

          {installedGear.map((gear) => (
            <div
              key={gear.id}
              className="flex items-center gap-2.5 rounded-lg border border-emerald-800/60 bg-emerald-950/20 p-2 shrink-0"
            >
              <img
                src={gear.imagePath}
                alt={gear.titleAr}
                referrerPolicy="no-referrer"
                className="w-9 h-9 rounded-md object-cover shrink-0"
              />
              <div className="text-xs">
                <div className="font-semibold text-white truncate max-w-[120px]">
                  {gear.titleAr}
                </div>
                <div className="text-emerald-400">مُركّب</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
