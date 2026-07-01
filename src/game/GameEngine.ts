import * as THREE from 'three';
import { AssetBuilder } from './AssetBuilder';
import { AssetLoader } from './AssetLoader';
import { YemeniArchitectureGenerator } from '../utils/yemeniAssets';
import { VehicleController } from '../systems/VehicleController';
import { 
  PlayerStats, 
  InventoryItem, 
  Landmark, 
  InteractionPrompt, 
  WeatherType, 
  WantedLevel, 
  MarketState, 
  NPCActivity, 
  NPCScheduleEntry,
  Chapter,
  Quest,
  QuestStatus,
  ObjectiveType,
  StoryProgress,
  CutsceneSegment
} from '../types';
import { STORY_DATA } from '../data/storyData';

export class Timer extends THREE.Clock {}

export interface GameEngineCallbacks {
  onPlayerCoords: (x: number, z: number, rotation: number, isDriving: boolean, speed: number) => void;
  onPlaceVisited: (placeKey: string) => void;
  onDialoguePrompt: (p: string | null) => void;
  onDialogueActive: (d: string[] | null, s: string) => void;
  onFPS?: (fps: number) => void;
}

export enum PlayerState {
  Idle,
  Walk,
  Jog,
  Run,
  Sprint,
  Jump,
  Fall,
  Landing,
  EnteringVehicle,
  ExitingVehicle,
  Driving
}

export class GameEngine {
  private canvas: HTMLCanvasElement;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private timer!: Timer;
  private animationFrameId?: number;

  // Lights
  private sunLight!: THREE.DirectionalLight;
  private ambientLight!: THREE.AmbientLight;
  private hemisphereLight!: THREE.HemisphereLight;
  private streetLights: { lightPos: THREE.Vector3; mesh: THREE.Object3D }[] = [];
  private activeLightsPool: THREE.PointLight[] = [];

  // Entities
  public playerGroup!: THREE.Group;
  public vehicleGroup!: THREE.Group;
  public npcs: {
    id: string;
    name: string;
    nameAr: string;
    job: 'Merchant' | 'Student' | 'Police' | 'Resident' | 'Child';
    group: THREE.Group;
    path: THREE.Vector3[];
    currentPathIdx: number;
    speed: number;
    dialogue: string[];
    dialogueAr: string[];
    activity: NPCActivity;
    schedule: NPCScheduleEntry[];
    homeId: string;
    targetLocationId: string | null;
  }[] = [];

  // Physics Bounds (AABBs)
  private solidBounds: { box: THREE.Box3; type: string }[] = [];

  // Game States
  public isDriving: boolean = false;
  private gameState: 'menu' | 'loading' | 'playing' = 'menu';
  private keysPressed: { [key: string]: boolean } = {};
  private mouseState = { isDragging: false, prevX: 0, prevY: 0 };
  
  // Player physical vectors
  private playerPos = new THREE.Vector3(0, 0, 10);
  private playerVelocity = new THREE.Vector3();
  private playerRotation = 0; // facing direction
  private isGrounded = true;

  // Multi-vehicle sandbox driving system
  private spawnedVehicles: {
    id: string;
    model: 'shas' | 'hilux' | 'hiace' | 'motorcycle' | 'aircraft';
    color: number;
    pos: THREE.Vector3;
    velocity: number;
    angle: number;
    steerAngle: number;
    group: THREE.Group;
    ownerId: string | null; // NPC id or 'player'
    price: number;
  }[] = [];
  private trafficVehicles: {
    group: THREE.Group;
    route: 'main' | 'hawban' | 'bab_musa' | 'qahira';
    speed: number;
    direction: number;
    progress: number;
  }[] = [];
  private parkedVehiclesGroup: THREE.Group[] = [];
  private activeVehicleIdx: number = -1; // -1 means walking on foot

  // Real-time Sound Synthesis (Web Audio)
  private audioCtx: AudioContext | null = null;
  private engineOsc: OscillatorNode | null = null;
  private engineGain: GainNode | null = null;

  // Visual ambiance - mountain dust particles
  private dustParticles!: THREE.Points;

  // Visual checkpoint system
  private activeMissionId: string | null = null;
  private missionMarkerGroup: THREE.Group | null = null;

  // Custom Vehicle Physics Controller
  private vehicleController = new VehicleController();

  // Active vehicle physical vectors (refers to the selected/driven vehicle)
  private carPos = new THREE.Vector3(8, 0, 0); // Parked near fuel station
  private carVelocity = 0;
  private carAngle = Math.PI; // facing direction
  private steerAngle = 0;

  // Camera Orbit system
  private cameraAngleH = Math.PI; // Horizontal orbital angle
  private cameraAngleV = 0.25; // Vertical orbital angle
  private targetCameraAngleH = Math.PI;
  private targetCameraAngleV = 0.25;
  private cameraRadius = 6.5;
  private wasDriving = false;

  // Time of Day (0 to 24)
  private timeOfDay: number = 8.0; // Starts at 8:00 AM
  private streetLightIntensity: number = 0.0;

  // Gameplay Transitions & Mechanics State
  private isEnteringVehicle = false;
  private isExitingVehicle = false;
  private vehicleAnimTimer = 0.0;
  private animStartPos = new THREE.Vector3();
  private animEndPos = new THREE.Vector3();
  private animTargetVehIdx = -1;
  private engineStartTimer = 0.0;
  private landingSquatTimer = 0.0;
  private footstepTimer = 0.0;

  // Custom high-quality character and camera animations (v0.5 Polish)
  private blinkTimer = 0.0;
  private breathTimer = 0.0;
  private walkCycleTime = 0.0;
  private cameraLookTarget = new THREE.Vector3();
  private currentCameraRadius = 4.5;
  private cameraSpringArm = new THREE.Vector3();
  private cameraCollisionOffset = new THREE.Vector3();
  private cameraLag = 0.15; // Smooth lag factor
  private cameraPitchMin = -Math.PI / 4;
  private cameraPitchMax = Math.PI / 3;
  private joystickInput = new THREE.Vector2(0, 0);
  private playerState: PlayerState = PlayerState.Idle;
  private lastState: PlayerState = PlayerState.Idle;
  private stateTimer: number = 0;
  private groundRaycaster = new THREE.Raycaster();
  private cameraRaycaster = new THREE.Raycaster();
  private tempVec3 = new THREE.Vector3();
  private tempBox = new THREE.Box3();
  private jumpAnticipationTimer = 0.0;

  // Pre-allocated collision items to prevent GC allocation stutter
  private playerBoxTmp = new THREE.Box3();
  private lastStepSin = 0;
  private ambientGain: GainNode | null = null;
  private language: 'ar' | 'en' = 'ar';
  private frameCount = 0;
  private handleKeyDown: ((e: KeyboardEvent) => void) | null = null;
  private handleKeyUp: ((e: KeyboardEvent) => void) | null = null;
  private playerMinTmp = new THREE.Vector3();
  private playerMaxTmp = new THREE.Vector3();

  // Audio Settings
  private soundVolume = 0.5;
  private musicVolume = 0.5;
  private isMuted = true;

  // Customizable outfit colors
  private thobeColor: number = 0xfcf9f2;
  private turbanColor: number = 0x990000;
  
  // v1.0 Core Gameplay State
  private playerStats: PlayerStats = {
    hunger: 100,
    thirst: 100,
    energy: 100,
    reputation: 0,
    money: 1500, // Starting amount in YER
  };
  private inventory: InventoryItem[] = [];
  private landmarks: Landmark[] = [];
  private currentInteraction: InteractionPrompt | null = null;
  private activeJob: { id: string; title: string; reward: number; targetPos: { x: number, z: number } } | null = null;
  private taxiDistanceAcc = 0;
  
  // v1.0 Callbacks for UI sync
  private onInteractionUpdate: ((prompt: InteractionPrompt | null) => void) | null = null;
  private onStatsUpdate: ((stats: PlayerStats) => void) | null = null;
  private onMapUpdate: ((landmarks: Landmark[]) => void) | null = null;
  private onInventoryUpdate: ((items: InventoryItem[]) => void) | null = null;
  private onDialogue: ((d: { name: string, nameAr: string, text: string, textAr: string } | null) => void) | null = null;
  private onWeatherUpdate: ((weather: WeatherType) => void) | null = null;
  private onWantedUpdate: ((level: WantedLevel) => void) | null = null;
  private onStoryUpdate: ((progress: StoryProgress) => void) | null = null;
  private onCutsceneUpdate: ((active: boolean, text?: string, textAr?: string) => void) | null = null;

  // v3.0 Story System State
  private storyProgress: StoryProgress = {
    currentChapter: 1,
    completedQuests: [],
    activeQuestId: null,
    achievements: []
  };
  private isCutsceneActive: boolean = false;
  private cutsceneTimer: number = 0;
  private currentCutscene: CutsceneSegment[] = [];
  private cutsceneSegmentIdx: number = 0;
  private cutsceneSegmentTimer: number = 0;
  private originalCameraPos = new THREE.Vector3();
  private originalCameraTarget = new THREE.Vector3();

  // v2.0 Living World Systems State
  private currentWeather: WeatherType = WeatherType.Sunny;
  private weatherTransition: number = 0; // 0-1 lerp
  private targetWeather: WeatherType = WeatherType.Sunny;
  private rainParticles: THREE.Points | null = null;
  private fogDensity: number = 0.002;
  
  private marketState: MarketState = {
    prices: {},
    lastUpdate: 0
  };
  
  private wantedLevel: WantedLevel = WantedLevel.Clear;
  private heat: number = 0; // 0-100, grows with violations
  private policePatrols: THREE.Group[] = [];
  
  private prayerActive: boolean = false;
  private currentAdhanType: 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha' | null = null;
  
  private playerHouseId: string = 'house_sabr_1';
  private ownedVehicles: string[] = []; // vehicle ids
  private currentInteriorId: string | null = null;
  private lastExteriorPos: THREE.Vector3 = new THREE.Vector3();

  // Animation system for external models
  private armsCache: THREE.Object3D[] = [];
  private playerMixer: THREE.AnimationMixer | null = null;
  private playerClips: THREE.AnimationClip[] = [];
  private activeAction: THREE.AnimationAction | null = null;
  private currentAnimState: 'idle' | 'walk' | 'sprint' | 'drive' | null = null;

  // Callbacks
  private callbacks: GameEngineCallbacks;
  private onLoadingProgress?: (progress: number, label: string) => void;

  private handleMouseMove: (e: MouseEvent) => void = () => {};
  private handleMouseUp: () => void = () => {};
  private handleMouseDown: (e: MouseEvent) => void = () => {};
  private handleWheel: (e: WheelEvent) => void = () => {};
  private handleTouchStart: (e: TouchEvent) => void = () => {};
  private handleTouchMove: (e: TouchEvent) => void = () => {};
  private handleTouchEnd: () => void = () => {};

  public getScene(): THREE.Scene {
    return this.scene;
  }

  public getPlayerPos(): THREE.Vector3 {
    return this.playerPos.clone();
  }

  public getPlayerRotation(): number {
    return this.playerRotation;
  }

  public getSpawnedVehicles() {
    return this.spawnedVehicles;
  }

  constructor(canvas: HTMLCanvasElement, callbacks: GameEngineCallbacks, options?: { thobeColor?: number; turbanColor?: number; onLoadingProgress?: (progress: number, label: string) => void }) {
    this.canvas = canvas;
    this.callbacks = callbacks;
    this.onLoadingProgress = options?.onLoadingProgress;
    
    if (options) {
      if (options.thobeColor !== undefined) this.thobeColor = options.thobeColor;
      if (options.turbanColor !== undefined) this.turbanColor = options.turbanColor;
    }
    
    this.initScene();
    this.initInput();
    
    // Build the base environment for the menu cinematic immediately
    this.buildEnvironment();
    this.buildInfrastructure();
    this.buildStreetLights();
    this.buildAtmosphere();
    this.initAtmosphericEffects();
    this.initBirds();
    this.initAnimals();
    
    this.setGameState('menu');
    this.startLoop();
  }

  public async startLoading() {
    this.setGameState('loading');
    
    // Then run asset validation with progress tracking (loads heavy models)
    const failures = await AssetLoader.getInstance().runAssetValidationReport((progress, label, error) => {
      if (this.onLoadingProgress) {
        this.onLoadingProgress(progress, label + (error ? ` (${error})` : ''));
      }
    });

    if (failures.length > 0) {
      console.warn("LUMEN ENGINE: Some assets failed to load correctly.");
      // We still proceed, but we've logged them and updated the progress label
    }

    // Once assets are ready, build the detailed world (buildings, landmarks, NPCs)
    this.buildDetailed();

    // Small delay to ensure all meshes are ready in scene
    setTimeout(() => {
      if (this.onLoadingProgress) {
        this.onLoadingProgress(100, "World Ready");
      }
    }, 500);
  }

  public setGameState(state: 'menu' | 'loading' | 'playing') {
    this.gameState = state;
    
    if (state === 'playing') {
      // Setup player for game start
      this.playerPos.set(0, 0, 10);
      this.playerGroup.position.copy(this.playerPos);
      this.isDriving = false;
      this.playerGroup.visible = true;
      
      // Focus camera on player
      this.cameraAngleH = Math.PI;
      this.targetCameraAngleH = Math.PI;
      this.cameraRadius = 6.5;
    }
  }

  public startGame() {
    this.setGameState('playing');
  }

  private initScene() {
    this.timer = new Timer();
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x0a0a0c, 0.015);

    // Camera setup
    this.camera = new THREE.PerspectiveCamera(
      45,
      this.canvas.clientWidth / this.canvas.clientHeight,
      0.1,
      1000
    );

    // Renderer setup
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: false,
      powerPreference: "high-performance"
    });
    this.renderer.setSize(this.canvas.clientWidth, this.canvas.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // Standard high-quality lights
    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
    this.scene.add(this.ambientLight);

    // Initialize pooled lights for dynamic streetlight system (Max 6 active lights to save perf)
    for (let i = 0; i < 6; i++) {
      const pl = new THREE.PointLight(0xffaa44, 0, 18, 1.8);
      pl.castShadow = true;
      pl.shadow.mapSize.width = 512;
      pl.shadow.mapSize.height = 512;
      this.activeLightsPool.push(pl);
      this.scene.add(pl);
    }

    this.hemisphereLight = new THREE.HemisphereLight(0xffe0b3, 0x111115, 0.4);
    this.scene.add(this.hemisphereLight);

    this.sunLight = new THREE.DirectionalLight(0xfff5e6, 1.2);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.width = 1024;
    this.sunLight.shadow.mapSize.height = 1024;
    this.sunLight.shadow.camera.near = 0.5;
    this.sunLight.shadow.camera.far = 150;
    this.sunLight.shadow.camera.left = -50;
    this.sunLight.shadow.camera.right = 50;
    this.sunLight.shadow.camera.top = 50;
    this.sunLight.shadow.camera.bottom = -50;
    this.scene.add(this.sunLight);

    // Handle Resize
    window.addEventListener('resize', this.onResize);
  }

  private onResize = () => {
    if (!this.canvas) return;
    this.camera.aspect = this.canvas.clientWidth / this.canvas.clientHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.canvas.clientWidth, this.canvas.clientHeight);
  };

  /**
   * Refined build systems for the cinematic open world.
   * Split into Environment, Infrastructure, and Detailed modules for seamless loading.
   */
  private buildEnvironment() {
    // 1. Expanded Ground (Saber mountain slopes / valleys) - 500x500m seamless world
    const groundGeom = new THREE.PlaneGeometry(500, 500);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0xc19a6b, 
      roughness: 0.95
    });
    const ground = new THREE.Mesh(groundGeom, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    ground.name = "Ground";
    this.scene.add(ground);

    // 2. High-Quality Atmosphere - Golden Dust Particles
    const particleGeom = new THREE.BufferGeometry();
    const particleCount = 800; 
    const posArray = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount * 3; i += 3) {
      posArray[i] = (Math.random() - 0.5) * 450;     
      posArray[i + 1] = Math.random() * 25;          
      posArray[i + 2] = (Math.random() - 0.5) * 450; 
    }
    particleGeom.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
    const particleMat = new THREE.PointsMaterial({
      size: 0.15,
      color: 0xffcc44,
      transparent: true,
      opacity: 0.45,
      blending: THREE.AdditiveBlending
    });
    this.dustParticles = new THREE.Points(particleGeom, particleMat);
    this.scene.add(this.dustParticles);

    // 3. Mountains surrounding the map ( Mount Saber peaks / Al-Qahira foothills )
    const mountainColors = [0x422f1c, 0x543b23, 0x6e5238, 0x3d2816];
    for (let m = 0; m < 50; m++) {
      const mScale = 25 + Math.random() * 35;
      const mHeight = 40 + Math.random() * 65;
      const mGeom = new THREE.ConeGeometry(mScale, mHeight, 5);
      const mMat = new THREE.MeshStandardMaterial({
        color: mountainColors[m % mountainColors.length],
        roughness: 0.98
      });
      const mountain = new THREE.Mesh(mGeom, mMat);
      const angle = (m / 50) * Math.PI * 2;
      const dist = 245 + Math.random() * 25;
      mountain.position.set(Math.cos(angle) * dist, mHeight / 2 - 3, Math.sin(angle) * dist);
      mountain.castShadow = true;
      mountain.receiveShadow = true;
      this.scene.add(mountain);
    }
  }

  private buildStreetLights() {
    // Place street lights along main roads
    const streetLightPositions = [
      // Central Road
      ...Array.from({ length: 20 }, (_, i) => new THREE.Vector3(-8.2, 0, -120 + i * 15)),
      ...Array.from({ length: 20 }, (_, i) => new THREE.Vector3(8.2, 0, -120 + i * 15)),
      // Al-Mudhaffar Avenue
      ...Array.from({ length: 15 }, (_, i) => new THREE.Vector3(-100 + i * 15, 0, -22)),
      ...Array.from({ length: 15 }, (_, i) => new THREE.Vector3(-100 + i * 15, 0, -18))
    ];

    streetLightPositions.forEach((pos, idx) => {
      const lamp = AssetBuilder.createStreetLight();
      const groundY = this.vehicleController.getTerrainHeight(pos.x, pos.z);
      lamp.position.set(pos.x, groundY, pos.z);
      
      // Face the road
      if (Math.abs(pos.x) < 10) {
        lamp.rotation.y = pos.x < 0 ? Math.PI / 2 : -Math.PI / 2;
      } else {
        lamp.rotation.y = pos.z < -20 ? 0 : Math.PI;
      }
      
      this.scene.add(lamp);
      
      // Calculate exact light emission point (top of the lamp post)
      const lightPos = lamp.position.clone().add(new THREE.Vector3(0, 4.5, 0));
      this.streetLights.push({ lightPos, mesh: lamp });
    });
  }

  private buildInfrastructure() {
    const streetMat = new THREE.MeshStandardMaterial({ color: 0x1d1d1f, roughness: 0.8 });
    
    // Central Main Street (Z-axis, 12m wide, length 500)
    const mainStreetGeom = new THREE.PlaneGeometry(12, 500);
    const mainStreet = new THREE.Mesh(mainStreetGeom, streetMat);
    mainStreet.rotation.x = -Math.PI / 2;
    mainStreet.position.set(0, 0.015, 0);
    mainStreet.receiveShadow = true;
    this.scene.add(mainStreet);

    // Al-Mudhaffar Avenue
    const crossStreetGeom = new THREE.PlaneGeometry(500, 12);
    const crossStreet = new THREE.Mesh(crossStreetGeom, streetMat);
    crossStreet.rotation.x = -Math.PI / 2;
    crossStreet.position.set(0, 0.012, -20);
    crossStreet.receiveShadow = true;
    this.scene.add(crossStreet);

    // Al Hawban Highway
    const hawbanHighwayGeom = new THREE.PlaneGeometry(500, 16);
    const hawbanHighway = new THREE.Mesh(hawbanHighwayGeom, streetMat);
    hawbanHighway.rotation.x = -Math.PI / 2;
    hawbanHighway.position.set(0, 0.01, 150);
    hawbanHighway.receiveShadow = true;
    this.scene.add(hawbanHighway);

    // Bab Musa Road
    const babMusaRoadGeom = new THREE.PlaneGeometry(10, 500);
    const babMusaRoad = new THREE.Mesh(babMusaRoadGeom, streetMat);
    babMusaRoad.rotation.x = -Math.PI / 2;
    babMusaRoad.position.set(-120, 0.008, 0);
    babMusaRoad.receiveShadow = true;
    this.scene.add(babMusaRoad);

    // Souq Al Qahira Road
    const qahiraRoadGeom = new THREE.PlaneGeometry(10, 500);
    const qahiraRoad = new THREE.Mesh(qahiraRoadGeom, streetMat);
    qahiraRoad.rotation.x = -Math.PI / 2;
    qahiraRoad.position.set(120, 0.006, 0);
    qahiraRoad.receiveShadow = true;
    this.scene.add(qahiraRoad);

    // 1. Road Markings (Dashed white lines for central road)
    const markingMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 });
    const dashGeom = new THREE.PlaneGeometry(0.15, 3);
    for (let i = 0; i < 50; i++) {
        const dash = new THREE.Mesh(dashGeom, markingMat);
        dash.rotation.x = -Math.PI / 2;
        dash.position.set(0, 0.02, -250 + i * 10);
        this.scene.add(dash);
    }

    // 2. Sidewalks & Curbs
    const swMat = new THREE.MeshStandardMaterial({ color: 0x76767c, roughness: 0.95 });
    const curbMatWhite = new THREE.MeshStandardMaterial({ color: 0xffffff });
    const curbMatBlack = new THREE.MeshStandardMaterial({ color: 0x111111 });
    const curbSegmentGeom = new THREE.BoxGeometry(0.3, 0.25, 2);

    // Main Street Sidewalks
    const swLeft = new THREE.Mesh(new THREE.BoxGeometry(4, 0.2, 500), swMat);
    swLeft.position.set(-8, 0.1, 0);
    swLeft.receiveShadow = true;
    this.scene.add(swLeft);

    const swRight = swLeft.clone();
    swRight.position.x = 8;
    this.scene.add(swRight);

    // Curbs for Main Street
    for (let i = 0; i < 250; i++) {
        const curbL = new THREE.Mesh(curbSegmentGeom, i % 2 === 0 ? curbMatWhite : curbMatBlack);
        curbL.position.set(-6.15, 0.125, -250 + i * 2);
        this.scene.add(curbL);
        
        const curbR = new THREE.Mesh(curbSegmentGeom, i % 2 === 0 ? curbMatWhite : curbMatBlack);
        curbR.position.set(6.15, 0.125, -250 + i * 2);
        this.scene.add(curbR);
    }

    // 3. Traffic Signs
    const stopSign = AssetBuilder.createTrafficSign('stop');
    stopSign.position.set(-9.5, 0, -25);
    stopSign.rotation.y = Math.PI / 2;
    this.scene.add(stopSign);

    const dangerSign = AssetBuilder.createTrafficSign('danger');
    dangerSign.position.set(9.5, 0, 140);
    dangerSign.rotation.y = -Math.PI / 2;
    this.scene.add(dangerSign);

    // v2.0 Landmarks Initialization
    this.landmarks = [
      { id: 'qahira_castle', name: 'Al-Qahira Castle', nameAr: 'قلعة القاهرة', type: 'castle', position: { x: 0, z: -180 } },
      { id: 'main_mosque', name: 'Al-Mudhaffar Mosque', nameAr: 'جامع المظفر', type: 'mosque', position: { x: -45, z: -60 } },
      { id: 'ashrafiya_mosque', name: 'Al-Ashrafiya Mosque', nameAr: 'جامع الأشرفية', type: 'mosque', position: { x: 30, z: -40 } },
      { id: 'city_hospital', name: 'Al-Thawra Hospital', nameAr: 'مستشفى الثورة', type: 'hospital', position: { x: 60, z: 20 } },
      { id: 'city_school', name: 'Al-Kuwait School', nameAr: 'مدرسة الكويت', type: 'school', position: { x: -60, z: 80 } },
      { id: 'market_square', name: 'Souq Al-Mudhaffar', nameAr: 'سوق المظفر', type: 'market', position: { x: -10, z: 5 } },
      { id: 'fruit_stall', name: 'Sabr Fruits', nameAr: 'بسطة فواكه صبر', type: 'shop', position: { x: -15, z: 25 } },
      { id: 'honey_shop', name: 'Mountain Honey', nameAr: 'عسل الجبال', type: 'shop', position: { x: 12, z: -10 } },
      { id: 'clothing_shop', name: 'Heritage Clothes', nameAr: 'ملابس التراث', type: 'shop', position: { x: -20, z: -30 } },
      { id: 'tea_shop', name: 'Adeni Tea', nameAr: 'شاهي عدني', type: 'shop', position: { x: 8, z: 40 } },
      { id: 'gas_station_1', name: 'Main Station', nameAr: 'المحطة الرئيسية', type: 'fuel', position: { x: 20, z: 12 } },
      { id: 'house_player', name: 'My Home', nameAr: 'منزلي', type: 'house', position: { x: 15, z: -45 }, interiorId: 'int_player_home' },
      { id: 'house_npc_1', name: 'Saeed House', nameAr: 'بيت سعيد', type: 'house', position: { x: -30, z: -20 }, interiorId: 'int_npc_1' },
      { id: 'house_npc_2', name: 'Ahmed House', nameAr: 'بيت أحمد', type: 'house', position: { x: -35, z: -25 } },
      { id: 'house_npc_3', name: 'Ali House', nameAr: 'بيت علي', type: 'house', position: { x: -40, z: -30 } },
      { id: 'house_npc_4', name: 'Omar House', nameAr: 'بيت عمر', type: 'house', position: { x: -45, z: -35 } },
      { id: 'house_npc_5', name: 'Saleh House', nameAr: 'بيت صالح', type: 'house', position: { x: -50, z: -40 } },
      { id: 'house_npc_6', name: 'Nasser House', nameAr: 'بيت ناصر', type: 'house', position: { x: -55, z: -45 } },
      { id: 'house_npc_7', name: 'Fahd House', nameAr: 'بيت فهد', type: 'house', position: { x: -60, z: -50 } },
      { id: 'house_npc_8', name: 'Zaid House', nameAr: 'بيت زيد', type: 'house', position: { x: -65, z: -55 } },
      { id: 'house_npc_9', name: 'Mousa House', nameAr: 'بيت موسى', type: 'house', position: { x: -70, z: -60 } },
      { id: 'house_npc_10', name: 'Yahya House', nameAr: 'بيت يحيى', type: 'house', position: { x: -75, z: -65 } }
    ];
  }

  private buildAtmosphere() {
    // 1. Scatter Trash Bins
    const trashBinPositions = [
        new THREE.Vector3(-8.2, 0, -50),
        new THREE.Vector3(8.2, 0, -80),
        new THREE.Vector3(-125, 0, 20),
        new THREE.Vector3(-115, 0, -40),
        new THREE.Vector3(20, 0, -26.5),
        new THREE.Vector3(-40, 0, -13.5),
    ];

    trashBinPositions.forEach(pos => {
        const bin = AssetBuilder.createTrashBin();
        bin.position.set(pos.x, this.vehicleController.getTerrainHeight(pos.x, pos.z), pos.z);
        bin.rotation.y = Math.random() * Math.PI;
        this.scene.add(bin);
    });

    // 2. Market Stalls in busy areas
    const stallPositions = [
        new THREE.Vector3(-10, 0, -10),
        new THREE.Vector3(-10, 0, -15),
        new THREE.Vector3(-10, 0, -20),
        new THREE.Vector3(10, 0, -10),
        new THREE.Vector3(10, 0, -15),
        new THREE.Vector3(10, 0, -30),
        new THREE.Vector3(-110, 0, -15),
        new THREE.Vector3(-130, 0, -25),
    ];

    stallPositions.forEach(pos => {
        const stall = AssetBuilder.createStreetStall();
        stall.position.set(pos.x, this.vehicleController.getTerrainHeight(pos.x, pos.z), pos.z);
        if (Math.abs(pos.x) < 20) {
            stall.rotation.y = pos.x < 0 ? Math.PI/2 : -Math.PI/2;
        } else {
            stall.rotation.y = pos.z < -20 ? 0 : Math.PI;
        }
        this.scene.add(stall);
    });

    // 3. Electric Poles
    for (let i = 0; i < 15; i++) {
        const poleL = AssetBuilder.createElectricPole();
        poleL.position.set(-8.5, 0, -200 + i * 30);
        this.scene.add(poleL);

        const poleR = AssetBuilder.createElectricPole();
        poleR.position.set(8.5, 0, -200 + i * 30);
        this.scene.add(poleR);
    }

    // 4. Palm Trees
    const palmPositions = [
        new THREE.Vector3(0, 0, -40),
        new THREE.Vector3(0, 0, 40),
        new THREE.Vector3(-110, 0, 10),
        new THREE.Vector3(120, 0, -50),
        new THREE.Vector3(-45, 0, -145),
    ];

    palmPositions.forEach(pos => {
        const palm = AssetBuilder.createPalmTree();
        palm.position.set(pos.x, this.vehicleController.getTerrainHeight(pos.x, pos.z), pos.z);
        this.scene.add(palm);
    });

    // 5. Fruit Stands & Market Polish
    const fruitStandPositions = [
        new THREE.Vector3(-10, 0, -25),
        new THREE.Vector3(10, 0, -35),
        new THREE.Vector3(-120, 0, -15),
    ];
    fruitStandPositions.forEach(pos => {
        const stand = AssetBuilder.createFruitStand();
        stand.position.set(pos.x, this.vehicleController.getTerrainHeight(pos.x, pos.z), pos.z);
        stand.rotation.y = pos.x < 0 ? Math.PI/2 : -Math.PI/2;
        this.scene.add(stand);
    });

    // 6. Clothes Lines in Alleys
    const clothesPositions = [
        { pos: new THREE.Vector3(-15, 4, -40), rot: Math.PI/2, w: 6 },
        { pos: new THREE.Vector3(15, 4, -60), rot: Math.PI/2, w: 6 },
        { pos: new THREE.Vector3(-125, 4, 30), rot: 0, w: 8 },
    ];
    clothesPositions.forEach(c => {
        const line = AssetBuilder.createClothesLine(c.w);
        line.position.set(c.pos.x, c.pos.y, c.pos.z);
        line.rotation.y = c.rot;
        this.scene.add(line);
    });

    // 7. Stray Cats
    for (let i = 0; i < 10; i++) {
        const cat = AssetBuilder.createCat();
        const rx = (Math.random() - 0.5) * 100;
        const rz = (Math.random() - 0.5) * 100;
        cat.position.set(rx, this.vehicleController.getTerrainHeight(rx, rz), rz);
        cat.rotation.y = Math.random() * Math.PI * 2;
        this.scene.add(cat);
    }

    // 8. Atmospheric Particles (Dust)
    this.initAtmosphericEffects();
    this.initBirds();

    // 6. Mosque Minaret Lights (Green)
    this.scene.traverse((obj) => {
        if (obj.name === "minaret_top") {
            const greenLight = new THREE.PointLight(0x00ff00, 5, 20);
            greenLight.position.copy(obj.position).add(new THREE.Vector3(0, 5, 0));
            this.scene.add(greenLight);
        }
    });
  }

  private initAtmosphericEffects() {
    const dustCount = 1500;
    const dustGeom = new THREE.BufferGeometry();
    const dustPositions = new Float32Array(dustCount * 3);
    for (let i = 0; i < dustCount; i++) {
      dustPositions[i * 3] = (Math.random() - 0.5) * 400;
      dustPositions[i * 3 + 1] = Math.random() * 20;
      dustPositions[i * 3 + 2] = (Math.random() - 0.5) * 400;
    }
    dustGeom.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3));
    const dustMat = new THREE.PointsMaterial({
      color: 0x967b5c,
      size: 0.12,
      transparent: true,
      opacity: 0.25,
      sizeAttenuation: true
    });
    const dust = new THREE.Points(dustGeom, dustMat);
    this.scene.add(dust);
    (this as any).dustParticles = dust;
  }

  private buildDetailed() {
    this.buildBuildings();
    this.buildLandmarks();
    this.initNPCs();
    this.initVehicles();
    this.initPlayer();
  }

  private buildBuildings() {
    const streetMat = new THREE.MeshStandardMaterial({ color: 0x1d1d1f, roughness: 0.8 });
    // Mountains winding road
    for (let z = -150; z >= -240; z -= 8) {
      const x = Math.sin(z * 0.05) * 60;
      const nextZ = z - 8;
      const nextX = Math.sin(nextZ * 0.05) * 60;
      const dx = nextX - x;
      const dz = nextZ - z;
      const len = Math.sqrt(dx * dx + dz * dz);
      const angle = Math.atan2(dx, dz);
      
      const roadPiece = new THREE.Mesh(
        new THREE.BoxGeometry(10, 0.05, len + 0.3),
        streetMat
      );
      const pieceY = this.vehicleController.getTerrainHeight((x + nextX) / 2, (z + nextZ) / 2);
      roadPiece.position.set((x + nextX) / 2, pieceY + 0.02, (z + nextZ) / 2);
      roadPiece.rotation.y = angle;
      roadPiece.receiveShadow = true;
      this.scene.add(roadPiece);
    }

    const hp: { x: number; z: number; w: number; d: number; h: number; stories: number; simplified?: boolean }[] = [];

    // Districts Building Logic
    for (let x = -45; x <= 45; x += 15) {
      if (Math.abs(x) < 12) continue; 
      for (let z = -75; z <= 75; z += 20) {
        if (Math.abs(z + 20) < 15) continue; 
        hp.push({
          x: x + (Math.random() - 0.5) * 3,
          z: z + (Math.random() - 0.5) * 3,
          w: 6 + Math.floor(Math.random() * 3),
          d: 6 + Math.floor(Math.random() * 3),
          h: 11 + Math.floor(Math.random() * 7),
          stories: 3 + Math.floor(Math.random() * 3),
          simplified: Math.abs(x) > 25 || Math.abs(z) > 40
        });
      }
    }
    // District B
    for (let x = -170; x <= -90; x += 16) {
      if (Math.abs(x + 120) < 12) continue; 
      for (let z = -70; z <= 70; z += 18) {
        hp.push({ x: x + (Math.random() - 0.5) * 2, z: z + (Math.random() - 0.5) * 2, w: 5.5, d: 5.5, h: 12, stories: 4, simplified: true });
      }
    }
    // District C
    for (let x = 90; x <= 170; x += 16) {
      if (Math.abs(x - 120) < 12) continue; 
      for (let z = -70; z <= 70; z += 18) {
        hp.push({ x: x + (Math.random() - 0.5) * 2, z: z + (Math.random() - 0.5) * 2, w: 6, d: 6, h: 13, stories: 4, simplified: true });
      }
    }

    hp.forEach((b) => {
      const house = AssetBuilder.createYemeniHouse({ width: b.w, depth: b.d, height: b.h, stories: b.stories, colorSeed: Math.floor(Math.random() * 1000) });
      const groundY = this.vehicleController.getTerrainHeight(b.x, b.z);
      house.position.set(b.x, groundY, b.z);
      this.scene.add(house);
      this.solidBounds.push({ box: new THREE.Box3().setFromObject(house), type: 'house' });
    });
  }

  private buildLandmarks() {
    // Sabeel
    const sabeel = new THREE.Group();
    sabeel.position.set(0, 0.1, -20);
    const baseMesh = new THREE.Mesh(new THREE.BoxGeometry(4.2, 1.2, 4.2), new THREE.MeshStandardMaterial({ color: 0x5c4033 }));
    sabeel.add(baseMesh);
    this.scene.add(sabeel);
    this.solidBounds.push({ box: new THREE.Box3(new THREE.Vector3(-2, 0, -22), new THREE.Vector3(2, 3, -18)), type: 'sabeel' });

    // Mosque
    const mosque = AssetBuilder.createYemeniMosque();
    mosque.position.set(18, 0.15, -8);
    this.scene.add(mosque);
    this.solidBounds.push({ box: new THREE.Box3(new THREE.Vector3(10, 0, -16), new THREE.Vector3(26, 5, 0)), type: 'mosque' });

    // Castle
    const castle = YemeniArchitectureGenerator.createCairoCastle();
    castle.position.set(-85, 3.5, -45);
    this.scene.add(castle);

    // Fuel Station
    const fuelStation = AssetBuilder.createFuelStation();
    fuelStation.position.set(16, 0.15, 12);
    this.scene.add(fuelStation);
    this.solidBounds.push({
      box: new THREE.Box3(new THREE.Vector3(16 - 7.5, 0, 12 - 5), new THREE.Vector3(16 + 7.5, 4.5, 12 + 5)),
      type: 'fuel_station'
    });
  }

  private initVehicles() {
    // Spawned Drivable Vehicles
    this.spawnedVehicles = [
      { id: "veh_shas", model: "shas", color: 0xdfdfd7, pos: new THREE.Vector3(8, 0, 0), angle: Math.PI, velocity: 0, steerAngle: 0, group: null as any, ownerId: 'npc_mukhtar_1', price: 25000 },
      { id: "veh_hilux", model: "hilux", color: 0x9e1313, pos: new THREE.Vector3(14, 0, -18), angle: 0, velocity: 0, steerAngle: 0, group: null as any, ownerId: null, price: 18000 },
      { id: "veh_hiace", model: "hiace", color: 0xfbfbf9, pos: new THREE.Vector3(-15, 0, 150), angle: Math.PI / 2, velocity: 0, steerAngle: 0, group: null as any, ownerId: 'npc_amin_8', price: 15000 }
    ];

    this.spawnedVehicles.forEach(v => {
      v.group = AssetBuilder.createYemeniVehicle({ model: v.model as any, color: v.color });
      v.group.position.copy(v.pos);
      v.group.rotation.y = v.angle;
      this.scene.add(v.group);
    });

    // Parked Scenic Vehicles
    const parkCoords = [
      { x: 22, z: 12, angle: Math.PI / 2, model: 'shas' as const, color: 0x9e1313 },
      { x: 22, z: 8, angle: Math.PI / 2, model: 'hiace' as const, color: 0xffffff }
    ];

    parkCoords.forEach((pk) => {
      const pGroup = AssetBuilder.createYemeniVehicle({ model: pk.model, color: pk.color });
      const pkY = this.vehicleController.getTerrainHeight(pk.x, pk.z);
      pGroup.position.set(pk.x, pkY + 0.15, pk.z);
      pGroup.rotation.y = pk.angle;
      this.scene.add(pGroup);
      this.parkedVehiclesGroup.push(pGroup);
      this.solidBounds.push({ box: new THREE.Box3().setFromObject(pGroup), type: 'parked_vehicle' });
    });
  }

  private initPlayer() {
    this.playerGroup = AssetBuilder.createYemeniPlayer(0xd2a679, this.thobeColor, this.turbanColor, false, 'yemeni_man');
    this.playerGroup.position.copy(this.playerPos);
    this.scene.add(this.playerGroup);
  }

  private initNPCs() {
    const occupations = [
      { name: "Saleh", nameAr: "العم صالح (بائع البهارات)", job: "Spice Seller", thobe: 0xebe6dd, turban: 0x990000, startPos: new THREE.Vector3(-8.5, 0, -3), charType: 'yemeni_man' as const, dialogueAr: ["أهلاً بك في سوق تعز القديم! هل جربت بهاراتنا المميزة وبن صبر الأصيل؟", "كن حذراً عند قيادة السيارة في نقيل جبل صبر، الطريق وعر ويحتاج سيارة شاص قوية!", "إذا كنت تبحث عن عمل، العم صالح سيوفر لك مهام توصيل قريباً."] },
      { name: "Mukhtar", nameAr: "مختار (سائق تاكسي)", job: "Taxi Driver", thobe: 0xfcf9f2, turban: 0x2244aa, startPos: new THREE.Vector3(12, 0, 5), charType: 'modern_man' as const, dialogueAr: ["مرحباً يا أخي! سيارتي الشاص واقفة عند المحطة، بإمكانك قيادتها وتجربتها الآن.", "مدينتنا تعز ساحرة وخلابة، لكن شوارعها ضيقة. قد بحذر وبطء!"] },
      { name: "Imam Ghalib", nameAr: "الإمام غالب (إمام الجامع)", job: "Imam of Mosque", thobe: 0xffffff, turban: 0xffffff, startPos: new THREE.Vector3(18, 0, -2.5), charType: 'yemeni_man' as const, dialogueAr: ["السلام عليكم ورحمة الله. أهلاً بك في حي الأشرفية التاريخي العريق.", "تذكر دائماً أن مساعدة المحتاجين وتوصيل الأمانات من شيم الكرام."] },
      { name: "Bassam", nameAr: "بسام (مهندس المحطة)", job: "Station Operator", thobe: 0x4a525a, turban: 0xcc5500, startPos: new THREE.Vector3(15, 0, 11), charType: 'modern_man' as const, dialogueAr: ["الوقود جاهز في المحطة! سيارة الشاص لا تقبل إلا البنزين الممتاز.", "مشهد الغروب في تعز ساحر، خصوصاً عندما تضاء مصابيح الشوارع تدريجياً."] },
      { name: "Fares", nameAr: "فارس (شاب تعزي)", job: "Student", thobe: 0xe5e0d8, turban: 0x006622, startPos: new THREE.Vector3(-10, 0, 30), charType: 'modern_man' as const, dialogueAr: ["هل صعدت إلى جبل صبر من قبل؟ إطلالة مدينة تعز من الأعلى ليلاً لا تُنسى.", "أنا متوجه الآن لشراء بعض الفواكه الطازجة من بسطات السوق."] },
      { name: "Sadeq", nameAr: "صادق (معلم شاهي)", job: "Tea Maker", thobe: 0xfbfbf9, turban: 0x881111, startPos: new THREE.Vector3(-8.5, 0, -1), charType: 'yemeni_man' as const, dialogueAr: ["أهلاً بك! الشاهي العدني الساخن بنكهة الهيل والقرنفل جاهز الآن.", "أعمل هنا طوال النهار لتجهيز الشاي لزوار سوق المظفر القديم."] },
      { name: "Yahya", nameAr: "العم يحيى (عسال)", job: "Honey Dealer", thobe: 0xeeeeee, turban: 0xaa6600, startPos: new THREE.Vector3(-8.5, 0, 3), charType: 'yemeni_man' as const, dialogueAr: ["هذا هو العسل السدر اليمني الحر الأصلي، دواء لكل داء.", "يأتينا هذا العسل من جبال وصاب وعتمة خصيصاً لزبائننا في تعز."] },
      { name: "Hamoud", nameAr: "حمود (مزارع صبر)", job: "Mountain Farmer", thobe: 0xdcd0c0, turban: 0x445522, startPos: new THREE.Vector3(-12, 0, 50), charType: 'yemeni_man' as const, dialogueAr: ["أهلاً بك! لقد جلبنا اليوم أفضل أنواع الخضار الطازجة والنعناع الصبري العطري.", "العيش في جبال صبر هادئ وجميل، والزراعة في مدرجاتنا بركة."] },
      { name: "Amin", nameAr: "أمين (سائق دباب)", job: "Dabab Driver", thobe: 0xefefef, turban: 0x005577, startPos: new THREE.Vector3(-13, 0, 12), charType: 'modern_man' as const, dialogueAr: ["الدباب الأبيض جاهز لرحلة حول حي المظفر القديم. الركوب بـ 500 ريال فقط!", "نقوم بتوصيل الطلاب والمواطنين عبر شوارع تعز الضيقة يومياً."] },
      { name: "Faisal", nameAr: "فيصل (شاب مغترب)", job: "Visitor", thobe: 0xf2f2f2, turban: 0xaa2266, startPos: new THREE.Vector3(12, 0, -32), charType: 'modern_man' as const, dialogueAr: ["أنا سعيد جداً بالعودة لتعز وزيارة مسجد المظفر وجامع الأشرفية الأثري.", "الهواء هنا في المساء ينعش الروح."] },
      { name: "Mazen", nameAr: "مازن (دليل سياحي)", job: "Tour Guide", thobe: 0xffffff, turban: 0x55aa55, startPos: new THREE.Vector3(12, 0, -15), charType: 'modern_man' as const, dialogueAr: ["هذا المسجد بني في عهد الدولة الرسولية، ويتميز بنقوشه الإسلامية النادرة.", "أرشد السياح والزوار للتعرف على عظمة تاريخ عاصمة اليمن الثقافية تعز."] },
      { name: "Fatimah", nameAr: "فاطمة (بائعة نعناع)", job: "Herbs Vendor", thobe: 0x111111, turban: 0x111111, startPos: new THREE.Vector3(-8.5, 0, 7), charType: 'veiled_woman' as const, dialogueAr: ["اشترِ نعناع صبري فواح وريحان معطر لتزيين منزلك اليوم.", "نقطف النعناع فجراً من قمم جبل صبر الشاهق ونأتي به مباشرة للسوق."] },
      { name: "Tawfeeq", nameAr: "توفيق (ميكانيكي)", job: "Mechanic", thobe: 0x5a5a60, turban: 0x333333, startPos: new THREE.Vector3(11, 0, 13), charType: 'modern_man' as const, dialogueAr: ["نقوم بصيانة سيارات الشاص والهايلكس وتجهيزها للطرقات الجبلية الوعرة.", "تذكر فحص ضغط الإطارات والمكابح دائماً قبل صعود نقيل جبل صبر."] },
      { name: "Adel", nameAr: "عادل (صانع قمريات)", job: "Qamariyah Craftsman", thobe: 0xfbf9f5, turban: 0x770000, startPos: new THREE.Vector3(-25, 0, -25), charType: 'yemeni_man' as const, dialogueAr: ["نقوم بنحت الحجر والجبس وتطعيمه بالزجاج الملون لصناعة القمريات التقليدية.", "القمارية هي عين البيت اليمني ورمز هويته المعمارية الفريدة."] },
      { name: "Yasir", nameAr: "ياسر (بائع بخور)", job: "Incense Vendor", thobe: 0xe0d6c8, turban: 0x224422, startPos: new THREE.Vector3(-8.5, 0, -8), charType: 'yemeni_man' as const, dialogueAr: ["لدينا بخور تعزي وبخور عدني ملكي ذو رائحة زكية تدوم لأيام.", "نجهز الخلطات يدوياً وبطرق متوارثة في عائلتنا منذ عقود."] },
      { name: "Arwa", nameAr: "أروى (متسوقة)", job: "Shopper", thobe: 0x111111, turban: 0x111111, startPos: new THREE.Vector3(-5, 0, -10), charType: 'veiled_woman' as const, dialogueAr: ["السوق ممتلئ بالبضائع الجميلة والنعناع الصبري الطازج اليوم.", "الحمد لله على نعمة الأمن والأمان في مدينتنا الحبيبة تعز."] },
      { name: "Bilqis", nameAr: "بلقيس (معلمة مدرسة)", job: "Teacher", thobe: 0x111111, turban: 0x111111, startPos: new THREE.Vector3(16, 0, -18), charType: 'veiled_woman' as const, dialogueAr: ["العلم هو الضياء والنور لمدينتنا العريقة تعز العاصمة الثقافية.", "تلاميذنا في مدرسة حي الأشرفية مجتهدون وذوو طموح عالٍ جداً."] }
    ];

    // Procedurally scale up to 30 unique NPCs spread across the district
    for (let i = 0; i < 30; i++) {
      const configIdx = i % occupations.length;
      const ref = occupations[configIdx];
      
      const id = `npc_${ref.name.toLowerCase()}_${i}`;
      const name = `${ref.name} ${String.fromCharCode(65 + (i % 6))}`;
      const nameAr = `${ref.nameAr} (${i + 1})`;
      const homeId = `house_npc_${i % 5 + 1}`;
      
      // Assign schedule based on job
      let schedule: NPCScheduleEntry[] = [];
      if (ref.job === 'Student') {
          schedule = [
              { startTime: 0, endTime: 7, activity: NPCActivity.Sleeping, locationId: homeId },
              { startTime: 7, endTime: 13, activity: NPCActivity.Working, locationId: 'city_school' },
              { startTime: 13, endTime: 15, activity: NPCActivity.Eating, locationId: homeId },
              { startTime: 15, endTime: 18, activity: NPCActivity.Playing, locationId: 'market_square' },
              { startTime: 18, endTime: 24, activity: NPCActivity.Sleeping, locationId: homeId },
          ];
      } else if (ref.job.includes('Seller') || ref.job.includes('Vendor')) {
          schedule = [
              { startTime: 0, endTime: 6, activity: NPCActivity.Sleeping, locationId: homeId },
              { startTime: 6, endTime: 12, activity: NPCActivity.Working, locationId: 'market_square' },
              { startTime: 12, endTime: 13, activity: NPCActivity.Praying, locationId: 'main_mosque' },
              { startTime: 13, endTime: 19, activity: NPCActivity.Working, locationId: 'market_square' },
              { startTime: 19, endTime: 24, activity: NPCActivity.Sleeping, locationId: homeId },
          ];
      } else {
          schedule = [
              { startTime: 0, endTime: 8, activity: NPCActivity.Sleeping, locationId: homeId },
              { startTime: 8, endTime: 17, activity: NPCActivity.Walking, locationId: 'market_square' },
              { startTime: 17, endTime: 24, activity: NPCActivity.Sleeping, locationId: homeId },
          ];
      }

      // Calculate a distinct position along the district roads/hills
      let startPos: THREE.Vector3;
      if (i < 10) {
        // Main street sidewalk spots
        startPos = ref.startPos.clone().add(new THREE.Vector3(0, 0, (i - 5) * 6));
      } else if (i < 20) {
        // Al-Mudhaffar avenue cross street spots
        startPos = new THREE.Vector3((i - 15) * 10, 0, -20 + (i % 2 === 0 ? 1.5 : -1.5));
      } else {
        // Elevated terrace / hills spots
        startPos = new THREE.Vector3(-36 + (i - 25) * 2, i % 2 === 0 ? 0.2 : 1.4, -40 + (i % 3) * 3);
      }

      // Generate walking patrol path loops
      const path = [
        startPos.clone(),
        startPos.clone().add(new THREE.Vector3(i % 2 === 0 ? 3 : -3, 0, i % 2 === 0 ? 0 : 4)),
        startPos.clone()
      ];

      const npcModel = AssetBuilder.createYemeniPlayer(0xd2a679, ref.thobe, ref.turban, true, ref.charType);
      npcModel.position.copy(startPos);
      this.scene.add(npcModel);

      this.npcs.push({
        id: id,
        name: name,
        nameAr: nameAr,
        job: ref.job as any,
        group: npcModel,
        path: path,
        currentPathIdx: 0,
        speed: 1.0 + Math.random() * 0.6,
        dialogue: [
          `Hello! I am ${name}, working as a ${ref.job} here in Al-Mudhaffar, Taiz.`,
          `Welcome to Version 2.0 Living World update! Enjoy the dynamic city life.`,
          `Have a great time exploring our traditional stone houses and visiting checkpoints!`
        ],
        dialogueAr: ref.dialogueAr,
        activity: NPCActivity.Idle,
        schedule: schedule,
        homeId: homeId,
        targetLocationId: null
      });
    }

    // Add Children NPCs (playing in groups)
    for (let i = 0; i < 6; i++) {
        const startPos = new THREE.Vector3(-30 + Math.random() * 5, 0.2, -35 + Math.random() * 5);
        const childModel = AssetBuilder.createYemeniPlayer(0xd2a679, 0xffffff, 0x000000, true, 'modern_man');
        childModel.scale.set(0.65, 0.65, 0.65); // Children are smaller
        childModel.position.copy(startPos);
        this.scene.add(childModel);
        
        const path = [startPos.clone()];
        this.npcs.push({
            id: `child_${i}`,
            name: `Child ${i}`,
            nameAr: `طفل ${i+1}`,
            job: "Child",
            group: childModel,
            path: path,
            currentPathIdx: 0,
            speed: 3.5, // kids run fast
            dialogue: ["Playing is fun!", "Look at the castle!", "Taiz is beautiful!"],
            dialogueAr: ["هل تلعب معنا الغميضة؟", "انظر إلى قلعة القاهرة كيف تلمع في السماء!", "أنا أحب مدينة تعز كثيراً."],
            activity: NPCActivity.Playing,
            schedule: [
                { startTime: 7, endTime: 12, activity: NPCActivity.Working, locationId: 'city_school' },
                { startTime: 12, endTime: 18, activity: NPCActivity.Playing, locationId: 'market_square' },
                { startTime: 18, endTime: 24, activity: NPCActivity.Sleeping, locationId: 'house_npc_1' }
            ],
            homeId: 'house_npc_1',
            targetLocationId: null
        });
        (this.npcs[this.npcs.length - 1] as any).isChild = true;
        (this.npcs[this.npcs.length - 1] as any).state = 'playing';
    }
  }

  /**
   * Initializes inputs (WASD, shift, space, E interaction, and mouse drags)
   */
  private initInput() {
    this.handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      this.keysPressed[key] = true;

      // Handle custom single-trigger actions
      if (key === 'e') {
        this.handleEInteraction();
      }
    };

    this.handleKeyUp = (e: KeyboardEvent) => {
      this.keysPressed[e.key.toLowerCase()] = false;
    };

    this.handleMouseMove = (e: MouseEvent) => {
      if (!this.mouseState.isDragging) return;
      const deltaX = e.clientX - this.mouseState.prevX;
      const deltaY = e.clientY - this.mouseState.prevY;
      
      this.targetCameraAngleH -= deltaX * 0.006;
      this.targetCameraAngleV = Math.max(0.05, Math.min(Math.PI / 2.2, this.targetCameraAngleV + deltaY * 0.006));

      this.mouseState.prevX = e.clientX;
      this.mouseState.prevY = e.clientY;
    };

    this.handleMouseUp = () => {
      this.mouseState.isDragging = false;
    };

    this.handleMouseDown = (e: MouseEvent) => {
      this.mouseState.isDragging = true;
      this.mouseState.prevX = e.clientX;
      this.mouseState.prevY = e.clientY;
    };

    this.handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const zoomAmount = e.deltaY * 0.015;
      this.zoomCamera(zoomAmount);
    };

    this.handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        this.mouseState.isDragging = true;
        this.mouseState.prevX = e.touches[0].clientX;
        this.mouseState.prevY = e.touches[0].clientY;
      }
    };

    this.handleTouchMove = (e: TouchEvent) => {
      if (!this.mouseState.isDragging || e.touches.length === 0) return;
      const deltaX = e.touches[0].clientX - this.mouseState.prevX;
      const deltaY = e.touches[0].clientY - this.mouseState.prevY;

      this.targetCameraAngleH -= deltaX * 0.008;
      this.targetCameraAngleV = Math.max(0.05, Math.min(Math.PI / 2.2, this.targetCameraAngleV + deltaY * 0.008));

      this.mouseState.prevX = e.touches[0].clientX;
      this.mouseState.prevY = e.touches[0].clientY;
    };

    this.handleTouchEnd = () => {
      this.mouseState.isDragging = false;
    };

    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    window.addEventListener('mousemove', this.handleMouseMove);
    window.addEventListener('mouseup', this.handleMouseUp);
    
    this.canvas.addEventListener('mousedown', this.handleMouseDown);
    this.canvas.addEventListener('wheel', this.handleWheel, { passive: false });
    this.canvas.addEventListener('touchstart', this.handleTouchStart);
    this.canvas.addEventListener('touchmove', this.handleTouchMove);
    this.canvas.addEventListener('touchend', this.handleTouchEnd);
  }

  /**
   * Real-time Sound Synthesis (Web Audio) for engine sounds
   */
  private startEngineSound() {
    try {
      if (!this.audioCtx) {
        this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }
      
      this.engineOsc = this.audioCtx.createOscillator();
      this.engineGain = this.audioCtx.createGain();
      
      this.engineOsc.type = 'sawtooth';
      this.engineOsc.frequency.setValueAtTime(45, this.audioCtx.currentTime); // Low engine rumble
      
      this.engineGain.gain.setValueAtTime(0.06, this.audioCtx.currentTime); // Safe, non-annoying volume
      
      this.engineOsc.connect(this.engineGain);
      this.engineGain.connect(this.audioCtx.destination);
      this.engineOsc.start();
    } catch (e) {
      console.warn("Audio Context init blocked by browser user gesture policies:", e);
    }
  }

  private stopEngineSound() {
    try {
      if (this.engineOsc) {
        this.engineOsc.stop();
        this.engineOsc.disconnect();
        this.engineOsc = null;
      }
      if (this.engineGain) {
        this.engineGain.disconnect();
        this.engineGain = null;
      }
    } catch (e) {
      console.warn("Audio stop error:", e);
    }
  }

  /**
   * Displays / Hides the rotating 3D visual mission checkpoint in the scene
   */
  public setMissionId(id: string | null) {
    this.activeMissionId = id;
    if (this.missionMarkerGroup) {
      this.scene.remove(this.missionMarkerGroup);
      this.missionMarkerGroup = null;
    }

    if (!id) return;

    this.missionMarkerGroup = new THREE.Group();

    // Cylindrical visual beam
    const colGeom = new THREE.CylinderGeometry(1.5, 1.5, 9, 16, 1, true);
    const colColor = id === 'taxi' ? 0xffbb00 : (id === 'delivery' ? 0x00ff66 : 0x00ccff);
    const colMat = new THREE.MeshBasicMaterial({
      color: colColor,
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide
    });
    const col = new THREE.Mesh(colGeom, colMat);
    col.position.y = 4.5;
    this.missionMarkerGroup.add(col);

    // Glowing rotating flat ring
    const ringGeom = new THREE.RingGeometry(1.2, 1.5, 16);
    const ringMat = new THREE.MeshBasicMaterial({ color: colColor, side: THREE.DoubleSide });
    const ring = new THREE.Mesh(ringGeom, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.15;
    this.missionMarkerGroup.add(ring);

    // Position exactly at the destination coordinates
    if (id === 'taxi') {
      this.missionMarkerGroup.position.set(-10, 0, 30); // Saber Hillside Fares spot
    } else if (id === 'delivery') {
      this.missionMarkerGroup.position.set(18, 0, -8); // Al-Ashrafiya Mosque
    } else if (id === 'hiace_run') {
      this.missionMarkerGroup.position.set(16, 0, 12); // Fuel Station Depot
    }

    this.scene.add(this.missionMarkerGroup);
  }

  /**
   * Action trigger when [E] is pressed:
   * - Enter/Exit vehicle
   * - Initiate conversation with nearby NPCs
   */
  private tryBuyVehicle(idx: number) {
    const v = this.spawnedVehicles[idx];
    if (this.playerStats.money >= v.price) {
        this.playerStats.money -= v.price;
        v.ownerId = 'player';
        this.ownedVehicles.push(v.id);
        this.saveGame();
        
        if (this.onStatsUpdate) this.onStatsUpdate(this.playerStats);
        if (this.onDialogue) {
            this.onDialogue({
                name: "System",
                nameAr: "النظام",
                text: `You now own this ${v.model}!`,
                textAr: `أصبحت تمتلك هذه السيارة (${v.model}) الآن!`
            });
        }
    } else {
        if (this.onDialogue) {
            this.onDialogue({
                name: "System",
                nameAr: "النظام",
                text: `You don't have enough money.`,
                textAr: `ليس لديك رصيد كافٍ لشراء هذه السيارة.`
            });
        }
    }
  }

  private tryEnterVehicle(idx: number) {
    const v = this.spawnedVehicles[idx];
    if (v.ownerId && v.ownerId !== 'player') {
        if (this.onDialogue) {
            this.onDialogue({
                name: "System",
                nameAr: "النظام",
                text: `You don't own this vehicle.`,
                textAr: `أنت لا تملك هذه السيارة.`
            });
        }
        return;
    }

    this.isEnteringVehicle = true;
    this.vehicleAnimTimer = 0.5;
    this.animStartPos.copy(this.playerPos);
    this.animEndPos.copy(v.pos);
    this.animTargetVehIdx = idx;
    this.callbacks.onPlaceVisited('fuel_station');
  }

  private handleEInteraction() {
    if (this.currentInteraction) {
        this.currentInteraction.action();
        return;
    }

    if (this.isEnteringVehicle || this.isExitingVehicle) {
      return; // currently in transit animation
    }

    if (this.isDriving) {
      // Exit active vehicle with exit animation
      this.isDriving = false;
      this.isExitingVehicle = true;
      this.vehicleAnimTimer = 0.4;
      this.animStartPos.copy(this.carPos);
      
      // Calculate exit position: left of cabin relative to car angle
      const forwardVec = new THREE.Vector3(Math.sin(this.carAngle), 0, Math.cos(this.carAngle)).normalize();
      const rightVec = new THREE.Vector3(forwardVec.z, 0, -forwardVec.x).normalize();
      this.animEndPos.copy(this.carPos).addScaledVector(rightVec, -1.8);
      
      const veh = this.spawnedVehicles[this.activeVehicleIdx];
      if (veh) {
        veh.pos.copy(this.carPos);
        veh.angle = this.carAngle;
        veh.velocity = 0;
      }
      
      // Make player group visible and place it at the starting position (the car)
      this.playerGroup.position.copy(this.carPos);
      this.playerGroup.visible = true;
      this.activeVehicleIdx = -1;
      this.callbacks.onDialoguePrompt(null);
      this.stopEngineSound();
    } else {
      // Check if player is standing near any of the drivable vehicles
      let nearVehIdx = -1;
      this.spawnedVehicles.forEach((veh, idx) => {
        if (nearVehIdx !== -1) return;
        const dist = this.playerPos.distanceTo(veh.pos);
        if (dist < 3.2) {
          nearVehIdx = idx;
        }
      });

      if (nearVehIdx !== -1) {
        // Trigger entering animation
        this.isEnteringVehicle = true;
        this.vehicleAnimTimer = 0.5;
        this.animStartPos.copy(this.playerPos);
        this.animEndPos.copy(this.spawnedVehicles[nearVehIdx].pos);
        this.animTargetVehIdx = nearVehIdx;
        this.callbacks.onPlaceVisited('fuel_station');
        return;
      }

      // Dialogue interaction with nearby NPCs
      let talkingToNPC = false;
      for (const npc of this.npcs) {
        const dist = this.playerPos.distanceTo(npc.group.position);
        if (dist < 2.5) {
          const dialogue = this.language === 'ar' ? npc.dialogueAr : npc.dialogue;
          const speaker = this.language === 'ar' ? npc.nameAr : npc.name;
          this.callbacks.onDialogueActive(dialogue, speaker);
          this.callbacks.onPlaceVisited(npc.id);
          talkingToNPC = true;
          break;
        }
      }
      if (!talkingToNPC) {
        this.callbacks.onDialogueActive(null, "");
      }
    }
  }

  /**
   * Updates light intensity and sky color depending on custom Day/Night hours
   */
  private animals: { group: THREE.Group; type: 'cat' | 'dog'; velocity: THREE.Vector3; timer: number }[] = [];
  private smokeSystems: THREE.Points[] = [];

  private initAnimals() {
    for (let i = 0; i < 8; i++) {
        const type = Math.random() > 0.5 ? 'cat' : 'dog';
        const color = type === 'cat' ? 0xffaa44 : 0x885522;
        const group = new THREE.Group();
        const body = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.3, 0.6), new THREE.MeshPhongMaterial({ color }));
        body.position.y = 0.2;
        group.add(body);
        
        group.position.set((Math.random() - 0.5) * 100, 0, (Math.random() - 0.5) * 100);
        this.scene.add(group);
        this.animals.push({ group, type, velocity: new THREE.Vector3(), timer: Math.random() * 5 });
    }
  }

  private updateAnimals(delta: number) {
    this.animals.forEach(animal => {
        animal.timer -= delta;
        if (animal.timer <= 0) {
            animal.timer = 2 + Math.random() * 5;
            animal.velocity.set((Math.random() - 0.5) * 2, 0, (Math.random() - 0.5) * 2);
        }
        
        if (animal.velocity.length() > 0.1) {
            animal.group.position.add(animal.velocity.clone().multiplyScalar(delta));
            animal.group.lookAt(animal.group.position.clone().add(animal.velocity));
        }
    });
  }

  private initBirds() {
    (this as any).birds = [];
    for (let i = 0; i < 8; i++) {
        const bird = new THREE.Group();
        const body = new THREE.Mesh(
            new THREE.BoxGeometry(0.2, 0.1, 0.4),
            new THREE.MeshStandardMaterial({ color: 0x222222 })
        );
        bird.add(body);
        
        const wingL = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.02, 0.2), body.material);
        wingL.position.set(-0.35, 0, 0);
        wingL.name = "wingL";
        bird.add(wingL);

        const wingR = wingL.clone();
        wingR.position.x = 0.35;
        wingR.name = "wingR";
        bird.add(wingR);

        this.scene.add(bird);
        (this as any).birds.push({
            group: bird,
            angle: Math.random() * Math.PI * 2,
            radius: 30 + Math.random() * 80,
            height: 20 + Math.random() * 15,
            speed: 0.2 + Math.random() * 0.3
        });
    }
  }

  public updateDayNightCycle(hours: number) {
    this.timeOfDay = hours;

    // Convert hours (0-24) to solar angle
    const angle = (hours / 24) * Math.PI * 2 - Math.PI / 2;
    const sunY = Math.sin(angle);
    const sunX = Math.cos(angle);

    // Dynamic light vector orientation
    this.sunLight.position.set(sunX * 50, sunY * 50, 20);

    // Compute sun colors and hemisphere hues
    if (sunY > 0.1) {
      // Daytime transition
      const factor = Math.min(1.0, sunY * 3.0);
      
      // Warm Taiz Sunlight
      const dayColor = new THREE.Color(0xfff5e6).lerp(new THREE.Color(0xffaa44), 1.0 - factor);
      this.sunLight.color.copy(dayColor);
      this.sunLight.intensity = factor * 1.5;
      this.ambientLight.color.setHex(0xffffff);
      this.ambientLight.intensity = 0.35 + factor * 0.15;
      
      this.renderer.setClearColor(new THREE.Color(0x87ceeb).lerp(new THREE.Color(0xfba544), 1.0 - factor), 1.0);
      this.scene.fog!.color.set(new THREE.Color(0x87ceeb).lerp(new THREE.Color(0xfba544), 1.0 - factor));
      
      // Turn off street lamps
      this.streetLightIntensity = 0.0;
      this.streetLights.forEach(sl => {
        const bulb = sl.mesh.getObjectByName("bulb") as THREE.Mesh;
        if (bulb && bulb.material) {
          (bulb.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.0;
        }
      });
    } else {
      // Evening/Night transition
      const factor = Math.max(0.0, (sunY + 0.1) * 5.0); // 0 at pure midnight
      this.sunLight.color.setHex(0x557799); // Cool moon hue
      this.sunLight.intensity = (1.0 - factor) * 0.35;
      this.ambientLight.color.setHex(0x223344);
      this.ambientLight.intensity = 0.15;
      
      const nightSky = new THREE.Color(0x06060c).lerp(new THREE.Color(0x1a0f26), factor);
      this.renderer.setClearColor(nightSky, 1.0);
      this.scene.fog!.color.set(nightSky);

      // Turn on warm street lamps with smooth illumination
      this.streetLightIntensity = 2.0 * (1.0 - factor);
      this.streetLights.forEach(sl => {
        const bulb = sl.mesh.getObjectByName("bulb") as THREE.Mesh;
        if (bulb && bulb.material) {
          (bulb.material as THREE.MeshStandardMaterial).emissiveIntensity = 1.5 * (1.0 - factor);
        }
      });
    }

    // Toggle vehicle headlights at night for ALL active vehicles
    this.spawnedVehicles.forEach((veh) => {
      const body = veh.group.getObjectByName("body");
      if (body) {
        const headlights = body.children.filter(c => c.type === 'Mesh' && c.position.z > 2.0);
        headlights.forEach(hl => {
          const mat = (hl as THREE.Mesh).material as THREE.MeshStandardMaterial;
          if (hours < 6 || hours > 18) {
            mat.emissiveIntensity = 2.0;
          } else {
            mat.emissiveIntensity = 0.0;
          }
        });
      }
    });
  }

  /**
   * Main game physics and frame updates
   */
  private update(delta: number) {
    if (this.gameState === 'loading') return;
    this.frameCount++;

    // 1b. Move AI Traffic Vehicles dynamically along their seamless connected highways
    if (this.trafficVehicles && this.trafficVehicles.length > 0) {
      this.trafficVehicles.forEach((v) => {
        // Traffic Logic: Slow down if near player or other vehicles
        let currentSpeed = v.speed;
        const distToPlayer = v.group.position.distanceTo(this.playerPos);
        if (distToPlayer < 8.0) {
            currentSpeed *= 0.2; // Brake for player
        }

        v.progress += currentSpeed * v.direction * delta;

        if (v.route === 'main') {
          // Main street runs on Z from -250 to 250
          if (v.progress > 250 && v.direction > 0) v.progress = -250;
          if (v.progress < -250 && v.direction < 0) v.progress = 250;
          const targetX = v.direction > 0 ? 2.5 : -2.5;
          v.group.position.set(targetX, 0.15, v.progress);
        } else if (v.route === 'hawban') {
          // Hawban highway runs on X from -250 to 250 at Z = 150
          if (v.progress > 250 && v.direction > 0) v.progress = -250;
          if (v.progress < -250 && v.direction < 0) v.progress = 250;
          const targetZ = 150 + (v.direction > 0 ? 3.5 : -3.5);
          v.group.position.set(v.progress, 0.15, targetZ);
        } else if (v.route === 'bab_musa') {
          // Bab Musa road runs on Z from -250 to 250 at X = -120
          if (v.progress > 250 && v.direction > 0) v.progress = -250;
          if (v.progress < -250 && v.direction < 0) v.progress = 250;
          const targetX = -120 + (v.direction > 0 ? 2.0 : -2.0);
          v.group.position.set(targetX, 0.15, v.progress);
        } else if (v.route === 'qahira') {
          // Souq Al Qahira road runs on Z from -250 to 250 at X = 120
          if (v.progress > 250 && v.direction > 0) v.progress = -250;
          if (v.progress < -250 && v.direction < 0) v.progress = 250;
          const targetX = 120 + (v.direction > 0 ? 2.0 : -2.0);
          v.group.position.set(targetX, 0.15, v.progress);
        }
      });
    }

    // 2. Control Transitions or Player/Vehicle locomotion
    if (this.isEnteringVehicle) {
      this.vehicleAnimTimer -= delta;
      const alpha = Math.max(0, Math.min(1.0, 1.0 - (this.vehicleAnimTimer / 0.5)));
      this.playerPos.lerpVectors(this.animStartPos, this.animEndPos, alpha);
      this.playerGroup.position.copy(this.playerPos);
      
      // Animate arms walking (using cached meshes for performance)
      if (this.armsCache.length === 0) {
        this.armsCache = this.playerGroup.children.filter(c => c.name === "leftArm" || c.name === "rightArm");
      }
      const swing = Math.sin(this.timer.getElapsedTime() * 12) * 0.15;
      this.armsCache.forEach((arm, i) => { 
        if (arm && arm.rotation) {
          arm.rotation.x = i === 0 ? swing : -swing; 
        }
      });

      if (this.vehicleAnimTimer <= 0) {
        this.isEnteringVehicle = false;
        // Complete the entry
        const idx = this.animTargetVehIdx;
        const veh = this.spawnedVehicles[idx];
        if (veh) {
          this.activeVehicleIdx = idx;
          this.vehicleGroup = veh.group;
          this.carPos = veh.pos;
          this.carAngle = veh.angle;
          this.carVelocity = 0;
          this.isDriving = true;
          this.playerGroup.visible = false;
          this.playerVelocity.set(0, 0, 0);
          this.engineStartTimer = 1.0; // trigger engine vibration and starting
          this.startEngineSound();
        }
      }
    } else if (this.isExitingVehicle) {
      this.vehicleAnimTimer -= delta;
      const alpha = Math.max(0, Math.min(1.0, 1.0 - (this.vehicleAnimTimer / 0.4)));
      this.playerPos.lerpVectors(this.animStartPos, this.animEndPos, alpha);
      this.playerGroup.position.copy(this.playerPos);

      // Animate jumping/stepping out
      this.playerGroup.scale.y = 1.0 + Math.sin(alpha * Math.PI) * 0.1;

      if (this.vehicleAnimTimer <= 0) {
        this.isExitingVehicle = false;
        this.playerGroup.scale.y = 1.0;
      }
    } else if (this.isDriving) {
      this.updateVehiclePhysics(delta);
    } else {
      this.updatePlayerPhysics(delta);
    }

    // 3. Float and circulate atmospheric gold dust particles slowly
    if (this.dustParticles) {
      const positions = this.dustParticles.geometry.attributes.position.array as Float32Array;
      for (let i = 0; i < positions.length; i += 3) {
        positions[i] += Math.sin(this.timer.getElapsedTime() * 0.5 + i) * 0.005;
        positions[i+1] -= 0.15 * delta; // slow fall
        if (positions[i+1] < 0) {
          positions[i+1] = 15; // wrap height
        }
      }
      this.dustParticles.geometry.attributes.position.needsUpdate = true;
    }

    // 4. Update Birds
    this.updateBirds(delta);
    this.updateAnimals(delta);

    // 5. Rotate 3D checkpoint rings for visual game feedback
    if (this.missionMarkerGroup) {
      this.missionMarkerGroup.children.forEach(child => {
        if (!child) return;
        const mesh = child as THREE.Mesh;
        if (mesh && mesh.isMesh && mesh.geometry && mesh.geometry.type === 'RingGeometry') {
          if (mesh.rotation) {
            mesh.rotation.z += 1.5 * delta;
          }
        }
      });
    }

    // 5. Resolve Camera spring arm following
    this.updateCameraFollow(delta);

    // 6. Gameplay system updates
    this.updateStats(delta);
    this.updateWeather(delta);
    this.updatePrayerSystem();
    this.checkInteractions();
    this.checkJobCompletion();
    this.updateEconomy(delta);
    this.updateNPCs(delta);
    this.updatePolice(delta);
    this.updateQuestSystem(delta);
    this.updateCutscene(delta);

    // 7. Send dynamic callback data to visual HUD
    const activeX = this.isDriving ? this.carPos.x : this.playerPos.x;
    const activeZ = this.isDriving ? this.carPos.z : this.playerPos.z;
    const activeRot = this.isDriving ? this.carAngle : this.playerRotation;
    const activeSpeed = this.isDriving ? Math.abs(this.carVelocity) * 12 : this.playerVelocity.length() * 8;
    this.callbacks.onPlayerCoords(activeX, activeZ, activeRot, this.isDriving, activeSpeed);

    // 8. Dynamically assign pooled lights to nearest street lamps to prevent WebGL uniform limits
    if (this.frameCount % 5 === 0) {
      this.updateDynamicLights();
    }
    this.frameCount++;
  }

  /**
   * Dynamically tracks the closest 6 streetlights to the player/car focus position,
   * positioning the pooled PointLights exactly at those locations.
   * This preserves high-quality real-time shadow casting and nighttime lighting
   * while keeping total active shader uniforms well within standard WebGL vertex limits.
   */
  private updateDynamicLights() {
    if (!this.streetLights || this.streetLights.length === 0 || !this.activeLightsPool || this.activeLightsPool.length === 0) {
      return;
    }

    const focusPos = this.isDriving ? this.carPos : this.playerPos;

    if (this.streetLightIntensity <= 0.0) {
      // Turn off all pooled PointLights during the day
      this.activeLightsPool.forEach(pl => {
        pl.intensity = 0.0;
      });
      return;
    }

    // Sort the street lights list by distance squared to the current focus position (highly optimized)
    const sortedLights = [...this.streetLights].sort((a, b) => {
      const distA = a.lightPos.distanceToSquared(focusPos);
      const distB = b.lightPos.distanceToSquared(focusPos);
      return distA - distB;
    });

    // Allocate the pooled PointLights to the closest 6 street lights
    for (let i = 0; i < this.activeLightsPool.length; i++) {
      const pl = this.activeLightsPool[i];
      if (i < sortedLights.length) {
        const sl = sortedLights[i];
        pl.position.copy(sl.lightPos);
        pl.intensity = this.streetLightIntensity;
      } else {
        pl.intensity = 0.0;
      }
    }
  }

  /**
   * Standard WASD/Sprinting Third-Person movement
   */
  /**
   * AAA-Inspired Physics-Based Locomotive & Character Controller
   */
  private updatePlayerPhysics(delta: number) {
    if (!this.playerGroup || this.gameState !== 'playing') return;
    // 1. Input Processing
    const isSprinting = this.keysPressed['shift'];
    const isJumping = this.keysPressed[' '];
    
    let moveX = this.joystickInput.x;
    let moveZ = this.joystickInput.y;
    
    if (this.joystickInput.lengthSq() < 0.01) {
      if (this.keysPressed['w']) moveZ = 1;
      if (this.keysPressed['s']) moveZ = -1;
      if (this.keysPressed['a']) moveX = -1;
      if (this.keysPressed['d']) moveX = 1;
    }

    this.tempVec3.set(moveX, 0, moveZ);
    if (this.tempVec3.lengthSq() > 1) this.tempVec3.normalize();
    this.tempVec3.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.cameraAngleH);

    const hasInput = this.tempVec3.lengthSq() > 0.01;
    
    // 2. State Machine Logic
    this.lastState = this.playerState;
    
    if (this.isDriving) {
      this.playerState = PlayerState.Driving;
    } else if (this.isEnteringVehicle) {
      this.playerState = PlayerState.EnteringVehicle;
    } else if (this.isExitingVehicle) {
      this.playerState = PlayerState.ExitingVehicle;
    } else if (!this.isGrounded) {
      this.playerState = this.playerVelocity.y > 0 ? PlayerState.Jump : PlayerState.Fall;
    } else if (this.landingSquatTimer > 0) {
      this.playerState = PlayerState.Landing;
      this.landingSquatTimer -= delta;
    } else if (hasInput) {
      const speedSq = this.playerVelocity.x * this.playerVelocity.x + this.playerVelocity.z * this.playerVelocity.z;
      if (isSprinting) this.playerState = PlayerState.Sprint;
      else if (speedSq > 64) this.playerState = PlayerState.Run;
      else if (speedSq > 16) this.playerState = PlayerState.Jog;
      else this.playerState = PlayerState.Walk;
    } else {
      this.playerState = PlayerState.Idle;
      
      // Idle Animation: Breathing & Micro-movement
      const breathe = Math.sin(this.timer.getElapsedTime() * 1.5) * 0.015;
      this.playerGroup.scale.y = 1.0 + breathe;
      this.playerGroup.rotation.y += Math.sin(this.timer.getElapsedTime() * 0.3) * 0.002;
    }

    if (this.playerState !== this.lastState) {
      this.stateTimer = 0;
    }
    this.stateTimer += delta;

    // 3. Movement Physics
    let targetSpeed = 0;
    switch (this.playerState) {
      case PlayerState.Sprint: targetSpeed = 12.5; break;
      case PlayerState.Run: targetSpeed = 8.5; break;
      case PlayerState.Jog: targetSpeed = 5.5; break;
      case PlayerState.Walk: targetSpeed = 3.5; break;
    }

    const accel = this.isGrounded ? (hasInput ? 25 : 15) : 5;
    
    if (hasInput && !this.isEnteringVehicle && !this.isExitingVehicle) {
      this.playerVelocity.x = THREE.MathUtils.lerp(this.playerVelocity.x, this.tempVec3.x * targetSpeed, accel * delta);
      this.playerVelocity.z = THREE.MathUtils.lerp(this.playerVelocity.z, this.tempVec3.z * targetSpeed, accel * delta);
      
      const targetRotation = Math.atan2(this.tempVec3.x, this.tempVec3.z);
      let rotationDiff = targetRotation - this.playerRotation;
      while (rotationDiff > Math.PI) rotationDiff -= Math.PI * 2;
      while (rotationDiff < -Math.PI) rotationDiff += Math.PI * 2;
      this.playerRotation += rotationDiff * 12 * delta;
    } else {
      this.playerVelocity.x = THREE.MathUtils.lerp(this.playerVelocity.x, 0, accel * delta);
      this.playerVelocity.z = THREE.MathUtils.lerp(this.playerVelocity.z, 0, accel * delta);
    }

    // Gravity & Jump
    this.playerVelocity.y -= 28 * delta;
    if (isJumping && this.isGrounded && !this.isEnteringVehicle && !this.isExitingVehicle) {
      this.playerVelocity.y = 11;
      this.isGrounded = false;
      this.playFootstep();
    }

    this.playerPos.addScaledVector(this.playerVelocity, delta);
    
    const groundY = this.vehicleController.getTerrainHeight(this.playerPos.x, this.playerPos.z);
    if (this.playerPos.y <= groundY) {
      if (!this.isGrounded && this.playerVelocity.y < -6) this.landingSquatTimer = 0.25;
      this.playerPos.y = groundY;
      this.playerVelocity.y = Math.max(0, this.playerVelocity.y);
      this.isGrounded = true;
    } else {
      this.isGrounded = false;
    }

    // AABB Collision sliding
    this.playerBoxTmp.setFromCenterAndSize(this.playerPos, new THREE.Vector3(1, 2, 1));
    for (const solid of this.solidBounds) {
      if (this.playerBoxTmp.intersectsBox(solid.box)) {
        const center = new THREE.Vector3();
        solid.box.getCenter(center);
        const diff = new THREE.Vector3().subVectors(this.playerPos, center);
        diff.y = 0;
        this.playerPos.addScaledVector(diff.normalize(), 0.1);
        this.playerVelocity.set(0, this.playerVelocity.y, 0);
      }
    }

    this.playerGroup.position.copy(this.playerPos);
    this.playerGroup.rotation.y = this.playerRotation;

    this.animateCharacter(delta);
  }

  /**
   * Procedural Character Animation based on State
   */
  private animateCharacter(delta: number) {
    const bones = {
      leftArm: this.playerGroup.getObjectByName("leftArm"),
      rightArm: this.playerGroup.getObjectByName("rightArm"),
      leftLeg: this.playerGroup.getObjectByName("leftLeg"),
      rightLeg: this.playerGroup.getObjectByName("rightLeg"),
      thobe: this.playerGroup.getObjectByName("thobe"),
      head: this.playerGroup.getObjectByName("head")
    };
    
    if (!bones.leftArm || !bones.rightArm || !bones.leftLeg || !bones.rightLeg) return;

    // 1. Torso Squash & Stretch and Breathing
    const breathing = Math.sin(this.timer.getElapsedTime() * 2.5) * 0.02;
    const squatAmount = this.landingSquatTimer > 0 ? (this.landingSquatTimer / 0.25) * 0.2 : 0;
    
    if (bones.thobe) {
      bones.thobe.scale.y = THREE.MathUtils.lerp(bones.thobe.scale.y, 1.0 - squatAmount + breathing, 12 * delta);
      bones.thobe.position.y = 1.35 - squatAmount * 0.5;
    }

    let animSpeed = 0;
    let swingAmp = 0;

    switch (this.playerState) {
      case PlayerState.Sprint: animSpeed = 16; swingAmp = 0.55; break;
      case PlayerState.Run: animSpeed = 13; swingAmp = 0.45; break;
      case PlayerState.Jog: animSpeed = 10; swingAmp = 0.35; break;
      case PlayerState.Walk: animSpeed = 7; swingAmp = 0.25; break;
      case PlayerState.Idle: animSpeed = 3.5; swingAmp = 0.08; break;
    }

    this.walkCycleTime += delta * animSpeed;
    const swing = Math.sin(this.walkCycleTime) * swingAmp;
    const lerpSpeed = 14 * delta;
    
    // Footstep trigger logic
    if (this.isGrounded && this.playerState !== PlayerState.Idle && this.playerState !== PlayerState.Landing) {
        const stepTrigger = Math.sin(this.walkCycleTime);
        if ((this.lastStepSin > 0 && stepTrigger <= 0) || (this.lastStepSin < 0 && stepTrigger >= 0)) {
            this.playFootstep();
        }
        this.lastStepSin = stepTrigger;
    } else {
        this.lastStepSin = 0;
    }

    bones.leftArm.rotation.x = THREE.MathUtils.lerp(bones.leftArm.rotation.x, -swing, lerpSpeed);
    bones.rightArm.rotation.x = THREE.MathUtils.lerp(bones.rightArm.rotation.x, swing, lerpSpeed);
    
    // Head tracking and idle breathing
    if (bones.head) {
        if (this.playerState === PlayerState.Idle) {
            bones.head.rotation.y = THREE.MathUtils.lerp(bones.head.rotation.y, Math.sin(this.timer.getElapsedTime() * 0.8) * 0.35, lerpSpeed * 0.5);
            bones.head.rotation.x = THREE.MathUtils.lerp(bones.head.rotation.x, Math.sin(this.timer.getElapsedTime() * 1.2) * 0.1, lerpSpeed * 0.5);
        } else {
            bones.head.rotation.y = THREE.MathUtils.lerp(bones.head.rotation.y, 0, lerpSpeed);
            bones.head.rotation.x = THREE.MathUtils.lerp(bones.head.rotation.x, 0, lerpSpeed);
        }
    }
    
    if (this.playerState !== PlayerState.Idle && this.isGrounded && this.playerState !== PlayerState.Landing) {
      bones.leftLeg.rotation.x = THREE.MathUtils.lerp(bones.leftLeg.rotation.x, swing, lerpSpeed);
      bones.rightLeg.rotation.x = THREE.MathUtils.lerp(bones.rightLeg.rotation.x, -swing, lerpSpeed);
    } else {
      bones.leftLeg.rotation.x = THREE.MathUtils.lerp(bones.leftLeg.rotation.x, 0, lerpSpeed);
      bones.rightLeg.rotation.x = THREE.MathUtils.lerp(bones.rightLeg.rotation.x, 0, lerpSpeed);
    }

    // Air pose
    if (!this.isGrounded) {
      bones.leftArm.rotation.z = THREE.MathUtils.lerp(bones.leftArm.rotation.z, 0.6, lerpSpeed);
      bones.rightArm.rotation.z = THREE.MathUtils.lerp(bones.rightArm.rotation.z, -0.6, lerpSpeed);
      bones.leftLeg.rotation.x = THREE.MathUtils.lerp(bones.leftLeg.rotation.x, -0.2, lerpSpeed);
      bones.rightLeg.rotation.x = THREE.MathUtils.lerp(bones.rightLeg.rotation.x, -0.2, lerpSpeed);
    } else {
      bones.leftArm.rotation.z = THREE.MathUtils.lerp(bones.leftArm.rotation.z, 0.1, lerpSpeed);
      bones.rightArm.rotation.z = THREE.MathUtils.lerp(bones.rightArm.rotation.z, -0.1, lerpSpeed);
    }
  }

  /**
   * Refined Vehicle Physics & Controls
   */
  private updateVehiclePhysics(delta: number) {
    if (!this.vehicleGroup || !this.isDriving) return;
    
    const activeVeh = this.spawnedVehicles[this.activeVehicleIdx];
    if (!activeVeh) return;

    const newState = this.vehicleController.update({
      keysPressed: this.keysPressed,
      currentPos: this.carPos,
      currentAngle: this.carAngle,
      currentVelocity: this.carVelocity,
      steerAngle: this.steerAngle,
      delta: delta,
      solidBounds: this.solidBounds,
      modelType: activeVeh.model
    });

    this.carPos.copy(newState.position);
    this.carAngle = newState.angle;
    this.carVelocity = newState.velocity;
    this.steerAngle = newState.steerAngle;

    this.vehicleGroup.position.copy(this.carPos);
    this.vehicleGroup.rotation.y = this.carAngle;

    const body = this.vehicleGroup.getObjectByName("body");
    if (body) {
      body.rotation.z = THREE.MathUtils.lerp(body.rotation.z, newState.bodyRoll, 8 * delta);
      body.rotation.x = THREE.MathUtils.lerp(body.rotation.x, newState.bodyPitch, 8 * delta);
    }

    this.vehicleGroup.children.forEach(wh => {
      if (wh.name.startsWith("wheel_")) {
        wh.rotation.x += this.carVelocity * 2 * delta;
        if (wh.name === "wheel_fl" || wh.name === "wheel_fr") {
          wh.rotation.y = this.steerAngle;
        }
      }
    });

    if (this.audioCtx && this.engineOsc) {
      const pitch = 42 + Math.abs(this.carVelocity) * 1.8;
      this.engineOsc.frequency.setTargetAtTime(pitch, this.audioCtx.currentTime, 0.1);
    }
  }

   /**
    * Optimized NPC Logic with Pathing and Simple Avoidance
    */

  /**
   * Advanced Spring Arm Camera with Collision Avoidance
   */
  private updateCameraFollow(delta: number) {
    if (this.isCutsceneActive) return;

    if (this.gameState === 'menu') {
      const time = this.timer.getElapsedTime();
      this.cameraAngleH += 0.06 * delta;
      this.cameraAngleV = 0.25 + Math.sin(time * 0.1) * 0.05;
      this.camera.position.set(130 * Math.sin(this.cameraAngleH), 45, 130 * Math.cos(this.cameraAngleH));
      this.camera.lookAt(0, 5, 0);
      return;
    }

    const focus = this.isDriving ? this.vehicleGroup : this.playerGroup;
    if (!focus) return;

    const pivotHeight = this.isDriving ? 1.6 : 1.75;
    const shoulderOff = this.isDriving ? 0 : 0.45;
    
    const targetPivot = focus.position.clone().add(new THREE.Vector3(0, pivotHeight, 0));
    const right = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.cameraAngleH);
    targetPivot.addScaledVector(right, shoulderOff);
    
    this.cameraLookTarget.lerp(targetPivot, 12 * delta);

    this.cameraAngleH = THREE.MathUtils.lerp(this.cameraAngleH, this.targetCameraAngleH, 10 * delta);
    this.cameraAngleV = THREE.MathUtils.lerp(this.cameraAngleV, this.targetCameraAngleV, 10 * delta);

    const idealOffset = new THREE.Vector3(
      this.cameraRadius * Math.sin(this.cameraAngleH) * Math.cos(this.cameraAngleV),
      this.cameraRadius * Math.sin(this.cameraAngleV),
      this.cameraRadius * Math.cos(this.cameraAngleH) * Math.cos(this.cameraAngleV)
    );
    
    const idealPos = this.cameraLookTarget.clone().add(idealOffset);

    // Collision Detection
    let radius = this.cameraRadius;
    this.cameraRaycaster.set(this.cameraLookTarget, idealOffset.clone().normalize());
    this.cameraRaycaster.far = this.cameraRadius;
    
    const obstacles = this.cameraRaycaster.intersectObjects(this.scene.children, true).filter(h => 
      h.object.name.includes("Building") || h.object.name.includes("House") || h.object.name.includes("Ground")
    );

    if (obstacles.length > 0) {
      radius = obstacles[0].distance * 0.9;
    }

    this.currentCameraRadius = THREE.MathUtils.lerp(this.currentCameraRadius, radius, 12 * delta);
    const finalPos = this.cameraLookTarget.clone().add(idealOffset.normalize().multiplyScalar(this.currentCameraRadius));
    
    this.camera.position.lerp(finalPos, this.cameraLag * 60 * delta);
    this.camera.lookAt(this.cameraLookTarget);

    if (this.sunLight) {
      this.sunLight.position.set(this.cameraLookTarget.x + 35, this.cameraLookTarget.y + 60, this.cameraLookTarget.z + 20);
      this.sunLight.target.position.copy(this.cameraLookTarget);
      this.sunLight.target.updateMatrixWorld();
    }
  }

  /**
   * Distance proximity checks to trigger HUD context prompts
   */

  private startLoop() {
    let lastTime = performance.now();
    let frames = 0;
    let fpsTimer = 0;

    const tick = () => {
      const now = performance.now();
      const delta = Math.min(this.timer.getDelta(), 0.1); // Clamp to avoid physics explosion
      
      // FPS Tracking logic
      frames++;
      fpsTimer += (now - lastTime);
      lastTime = now;
      
      if (fpsTimer >= 1000) {
        const fps = Math.round((frames * 1000) / fpsTimer);
        if (this.callbacks.onFPS) this.callbacks.onFPS(fps);
        frames = 0;
        fpsTimer = 0;
      }

      this.update(delta);
      this.renderer.render(this.scene, this.camera);
      this.animationFrameId = requestAnimationFrame(tick);
    };
    tick();
  }

  /**
   * Generates procedurally synthesized high-quality footstep sounds on stone or asphalt.
   */
  private playFootstep() {
    if (!this.audioCtx || this.isMuted) return;
    try {
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }

      // We synthesize a short noise-based low thud
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      const filter = this.audioCtx.createBiquadFilter();

      osc.type = 'triangle';
      // Low frequency thud
      osc.frequency.setValueAtTime(58, this.audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(8, this.audioCtx.currentTime + 0.12);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(140, this.audioCtx.currentTime);

      gain.gain.setValueAtTime(this.soundVolume * 0.18, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.12);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start();
      osc.stop(this.audioCtx.currentTime + 0.14);
    } catch (e) {
      // safe fallback
    }
  }

  // --- PUBLIC API FOR FRONTEND INTEGRATION ---

  public setSoundVolume(v: number) {
    this.soundVolume = v;
  }

  public setMusicVolume(v: number) {
    this.musicVolume = v;
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (muted) {
      this.stopEngineSound();
    } else if (this.isDriving) {
      this.startEngineSound();
    }
  }

  public zoomCamera(amount: number) {
    this.cameraRadius = THREE.MathUtils.clamp(this.cameraRadius + amount, 2.0, 250.0);
  }

  public resetCamera() {
    this.cameraRadius = 6.5;
    this.cameraAngleH = Math.PI;
    this.cameraAngleV = 0.25;
    this.targetCameraAngleH = Math.PI;
    this.targetCameraAngleV = 0.25;
  }

  public handleMobileButton(btnKey: string, pressed: boolean) {
    const key = btnKey.toLowerCase();
    this.keysPressed[key] = pressed;
    if (key === 'e' && pressed) {
      this.handleEInteraction();
    }
  }

  public setJoystickInput(x: number, y: number) {
    this.joystickInput.set(x, y);
  }

  public rotateCameraMobile(deltaH: number, deltaV: number) {
    this.targetCameraAngleH += deltaH;
    this.targetCameraAngleV = THREE.MathUtils.clamp(this.targetCameraAngleV + deltaV, 0.05, Math.PI / 2.2);
  }

  public setGraphicsQuality(quality: 'low' | 'medium' | 'high') {
    if (!this.renderer) return;
    if (quality === 'low') {
      this.renderer.shadowMap.enabled = false;
      this.sunLight.castShadow = false;
    } else {
      this.renderer.shadowMap.enabled = true;
      this.sunLight.castShadow = true;
      this.sunLight.shadow.mapSize.width = quality === 'high' ? 1024 : 512;
      this.sunLight.shadow.mapSize.height = quality === 'high' ? 1024 : 512;
    }
  }

  public setLanguage(lang: 'ar' | 'en') {
    this.language = lang;
  }

  // v2.0 Living World Systems Implementation
  private updateWeather(delta: number) {
    if (Math.random() < 0.0001) { // Random weather change
      const types: WeatherType[] = [WeatherType.Sunny, WeatherType.Cloudy, WeatherType.Rain, WeatherType.Fog, WeatherType.DustStorm];
      this.targetWeather = types[Math.floor(Math.random() * types.length)];
    }

    // Transition logic
    if (this.currentWeather !== this.targetWeather) {
      this.weatherTransition += delta * 0.1;
      if (this.weatherTransition >= 1) {
        this.currentWeather = this.targetWeather;
        this.weatherTransition = 0;
        if (this.onWeatherUpdate) this.onWeatherUpdate(this.currentWeather);
      }
    }

    // Apply effects
    this.updateAtmosphericParticles(delta);
  }

  private updateAtmosphericParticles(delta: number) {
    const isRaining = this.currentWeather === WeatherType.Rain || (this.targetWeather === WeatherType.Rain && this.weatherTransition > 0.5);
    const isDusty = this.currentWeather === WeatherType.DustStorm;

    if (isRaining) {
      if (!this.rainParticles) this.initRain();
      if (this.rainParticles) this.rainParticles.visible = true;
    } else {
      if (this.rainParticles) this.rainParticles.visible = false;
    }

    // Dynamic Fog
    let targetFog = 0.002;
    if (this.currentWeather === WeatherType.Fog) targetFog = 0.02;
    if (this.currentWeather === WeatherType.DustStorm) targetFog = 0.015;
    
    this.fogDensity = THREE.MathUtils.lerp(this.fogDensity, targetFog, delta * 0.5);
    this.scene.fog = new THREE.FogExp2(isDusty ? 0xccaa88 : 0x8899aa, this.fogDensity);
    
    // NPC Behavior modification based on weather
    if (isRaining) {
        this.npcs.forEach(npc => {
            if (npc.activity === NPCActivity.Walking || npc.activity === NPCActivity.Playing) {
                npc.speed = 4.5; // Run to shelter
            }
        });
    }
  }

  private initRain() {
    const geometry = new THREE.BufferGeometry();
    const count = 5000;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
        positions[i * 3] = (Math.random() - 0.5) * 400;
        positions[i * 3 + 1] = Math.random() * 200;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 400;
    }
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const material = new THREE.PointsMaterial({ color: 0xaaaaaa, size: 0.1, transparent: true, opacity: 0.5 });
    this.rainParticles = new THREE.Points(geometry, material);
    this.scene.add(this.rainParticles);
  }

  private updatePrayerSystem() {
    // Schedule based on timeOfDay
    const times = [
      { h: 4.5, type: 'fajr' },
      { h: 12.2, type: 'dhuhr' },
      { h: 15.5, type: 'asr' },
      { h: 18.2, type: 'maghrib' },
      { h: 19.8, type: 'isha' }
    ];

    const currentMinute = (this.timeOfDay % 1) * 60;
    const isAthanTime = times.find(t => Math.abs(t.h - this.timeOfDay) < 0.1);

    if (isAthanTime && !this.prayerActive) {
      this.prayerActive = true;
      this.currentAdhanType = isAthanTime.type as any;
      this.triggerAdhanEffect();
    } else if (!isAthanTime && this.prayerActive) {
      this.prayerActive = false;
      this.currentAdhanType = null;
    }
  }

  private triggerAdhanEffect() {
    console.log(`LUMEN: Adhan ${this.currentAdhanType} starting...`);
    // NPCs move to mosques
    this.npcs.forEach(npc => {
        if (npc.job !== 'Police') {
            npc.activity = NPCActivity.Praying;
            npc.targetLocationId = 'main_mosque';
        }
    });
  }

  private updateEconomy(delta: number) {
    this.marketState.lastUpdate += delta;
    if (this.marketState.lastUpdate > 300) { // Every 5 minutes
      this.marketState.lastUpdate = 0;
      this.landmarks.forEach(lm => {
        if (lm.type === 'shop' || lm.type === 'market') {
          // Dynamic price multiplier between 0.8 and 1.5
          this.marketState.prices[lm.id] = 0.8 + Math.random() * 0.7;
        }
      });
    }
  }

  private updatePolice(delta: number) {
    const oldLevel = this.wantedLevel;
    // Basic wanted level logic
    if (this.heat > 0) {
      this.heat -= delta * 0.2; // Heat decays slowly
      if (this.heat < 20) this.wantedLevel = WantedLevel.Clear;
      else if (this.heat < 40) this.wantedLevel = WantedLevel.Citation;
      else if (this.heat < 70) this.wantedLevel = WantedLevel.Wanted;
      else this.wantedLevel = WantedLevel.HighSpeedChase;
    }

    if (this.wantedLevel !== oldLevel && this.onWantedUpdate) {
        this.onWantedUpdate(this.wantedLevel);
    }

    // Violation checks
    if (this.isDriving && Math.abs(this.carVelocity) > 60) {
        this.heat += delta * 2.0; // Speeding adds heat
    }
  }

  // v3.0 Story & Cinematic Systems
  private startCutscene(segments: CutsceneSegment[]) {
    if (this.isCutsceneActive) return;
    
    this.isCutsceneActive = true;
    this.currentCutscene = segments;
    this.cutsceneSegmentIdx = 0;
    this.cutsceneSegmentTimer = 0;
    
    this.originalCameraPos.copy(this.camera.position);
    this.originalCameraTarget.copy(this.cameraLookTarget);
    
    if (this.onCutsceneUpdate) {
        const seg = segments[0];
        this.onCutsceneUpdate(true, seg.text, seg.textAr);
    }
  }

  private updateCutscene(delta: number) {
    if (!this.isCutsceneActive) return;
    
    const segment = this.currentCutscene[this.cutsceneSegmentIdx];
    if (!segment) {
        this.endCutscene();
        return;
    }
    
    this.cutsceneSegmentTimer += delta;
    const progress = Math.min(this.cutsceneSegmentTimer / segment.duration, 1);
    
    // Interpolate camera
    this.camera.position.lerpVectors(
        new THREE.Vector3(segment.cameraStart.x, segment.cameraStart.y, segment.cameraStart.z),
        new THREE.Vector3(segment.cameraEnd.x, segment.cameraEnd.y, segment.cameraEnd.z),
        progress
    );
    
    const lookAt = new THREE.Vector3().lerpVectors(
        new THREE.Vector3(segment.lookAtStart.x, segment.lookAtStart.y, segment.lookAtStart.z),
        new THREE.Vector3(segment.lookAtEnd.x, segment.lookAtEnd.y, segment.lookAtEnd.z),
        progress
    );
    this.camera.lookAt(lookAt);
    this.cameraLookTarget.copy(lookAt);
    
    if (this.cutsceneSegmentTimer >= segment.duration) {
        this.cutsceneSegmentIdx++;
        this.cutsceneSegmentTimer = 0;
        
        if (this.cutsceneSegmentIdx >= this.currentCutscene.length) {
            this.endCutscene();
        } else {
            const nextSeg = this.currentCutscene[this.cutsceneSegmentIdx];
            if (this.onCutsceneUpdate) this.onCutsceneUpdate(true, nextSeg.text, nextSeg.textAr);
        }
    }
  }

  private endCutscene() {
    this.isCutsceneActive = false;
    this.camera.position.copy(this.originalCameraPos);
    this.cameraLookTarget.copy(this.originalCameraTarget);
    if (this.onCutsceneUpdate) this.onCutsceneUpdate(false);
  }

  private startQuest(questId: string) {
    const chapter = STORY_DATA.find(c => c.quests.some(q => q.id === questId));
    if (!chapter) return;
    
    const quest = chapter.quests.find(q => q.id === questId);
    if (!quest) return;
    
    this.storyProgress.activeQuestId = questId;
    quest.status = QuestStatus.InProgress;
    
    console.log(`Quest Started: ${quest.title}`);
    
    if (quest.startDialogue) {
        this.onDialogue?.({
            name: quest.startDialogue[0].speaker,
            nameAr: quest.startDialogue[0].speakerAr,
            text: quest.startDialogue[0].text,
            textAr: quest.startDialogue[0].textAr
        });
    }
    
    if (this.onStoryUpdate) this.onStoryUpdate(this.storyProgress);
    this.saveGame();
  }

  private updateQuestSystem(delta: number) {
    if (!this.storyProgress.activeQuestId) {
        // Auto-start first quest if nothing active
        const firstQuest = STORY_DATA[0].quests[0];
        if (!this.storyProgress.completedQuests.includes(firstQuest.id)) {
            this.startQuest(firstQuest.id);
        }
        return;
    }
    
    const activeQuest = this.getActiveQuest();
    if (!activeQuest) return;
    
    activeQuest.objectives.forEach(obj => {
        if (obj.isCompleted) return;
        
        if (obj.type === ObjectiveType.ReachLocation && obj.targetId) {
            const target = this.landmarks.find(l => l.id === obj.targetId);
            if (target) {
                const dist = this.playerPos.distanceTo(new THREE.Vector3(target.position.x, 0, target.position.z));
                if (dist < 5) {
                    obj.isCompleted = true;
                    this.triggerObjectiveComplete(activeQuest, obj);
                }
            }
        }
    });
  }

  private getActiveQuest(): Quest | null {
    if (!this.storyProgress.activeQuestId) return null;
    for (const chapter of STORY_DATA) {
        const quest = chapter.quests.find(q => q.id === this.storyProgress.activeQuestId);
        if (quest) return quest;
    }
    return null;
  }

  private triggerObjectiveComplete(quest: Quest, obj: any) {
    console.log(`Objective Complete: ${obj.description}`);
    
    const allDone = quest.objectives.every(o => o.isCompleted);
    if (allDone) {
        this.completeQuest(quest);
    }
    
    if (this.onStoryUpdate) this.onStoryUpdate(this.storyProgress);
  }

  private completeQuest(quest: Quest) {
    quest.status = QuestStatus.Completed;
    this.storyProgress.completedQuests.push(quest.id);
    this.storyProgress.activeQuestId = null;
    
    // Rewards
    this.playerStats.money += quest.rewards.money;
    this.playerStats.reputation += quest.rewards.reputation;
    if (this.onStatsUpdate) this.onStatsUpdate(this.playerStats);
    
    console.log(`Quest Completed: ${quest.title}`);
    
    // Check for next quest
    const chapter = STORY_DATA.find(c => c.quests.some(q => q.id === quest.id));
    if (chapter) {
        const idx = chapter.quests.findIndex(q => q.id === quest.id);
        if (idx < chapter.quests.length - 1) {
            this.startQuest(chapter.quests[idx + 1].id);
        } else {
            // Next chapter?
            console.log("Chapter Complete!");
        }
    }
    
    this.saveGame();
  }

  private updateNPCs(delta: number) {
    this.npcs.forEach(npc => {
        // Handle schedule transitions
        if (!npc.schedule) return;
        
        const currentHour = this.timeOfDay;
        const entry = npc.schedule.find(s => currentHour >= s.startTime && currentHour < s.endTime);
        
        if (entry && npc.activity !== entry.activity) {
            npc.activity = entry.activity;
            npc.targetLocationId = entry.locationId;
        }

        // Logic for walking towards target
        if (npc.targetLocationId) {
            const targetLm = this.landmarks.find(l => l.id === npc.targetLocationId);
            if (targetLm) {
                const targetPos = new THREE.Vector3(targetLm.position.x, 0, targetLm.position.z);
                const dist = npc.group.position.distanceTo(targetPos);
                
                if (dist > 1.5) {
                    const dir = targetPos.clone().sub(npc.group.position).normalize();
                    npc.group.position.add(dir.multiplyScalar(npc.speed * delta));
                    npc.group.lookAt(targetPos);

                    // Animation swing
                    const swing = Math.sin(this.timer.getElapsedTime() * 7) * 0.15;
                    npc.group.children.forEach(c => {
                      if (c.name === "leftArm" || c.name === "rightArm") {
                        c.rotation.x = c.name === "leftArm" ? -swing : swing;
                      }
                      if (c.name === "leftLeg" || c.name === "rightLeg") {
                        c.rotation.x = c.name === "leftLeg" ? swing : -swing;
                      }
                    });
                } else {
                    // Arrived, switch to idle/working
                    npc.targetLocationId = null;
                }
            }
        }
    });
  }
  private updateStats(delta: number) {
    // Hunger/Thirst decay: -1 every 2 minutes (approx)
    const decayRate = delta * (100 / (120)); // 2 mins to zero
    this.playerStats.hunger = Math.max(0, this.playerStats.hunger - decayRate * 0.1);
    this.playerStats.thirst = Math.max(0, this.playerStats.thirst - decayRate * 0.2);
    
    // Energy: slowly decreases when moving, recovers when sitting/resting
    if (this.playerVelocity.length() > 0.1) {
      this.playerStats.energy = Math.max(0, this.playerStats.energy - delta * 0.5);
    } else {
      this.playerStats.energy = Math.min(100, this.playerStats.energy + delta * 2.0);
    }

    // Taxi income logic
    if (this.isDriving && Math.abs(this.carVelocity) > 2) {
        this.taxiDistanceAcc += delta * Math.abs(this.carVelocity);
        if (this.taxiDistanceAcc > 500) { // Every 500 units of distance
            const fare = 500 + Math.floor(Math.random() * 200);
            this.playerStats.money += fare;
            this.taxiDistanceAcc = 0;
            if (this.onStatsUpdate) this.onStatsUpdate(this.playerStats);
        }
    }

    if (this.frameCount % 60 === 0 && this.onStatsUpdate) {
      this.onStatsUpdate(this.playerStats);
    }
  }

  private checkInteractions() {
    // Spatial check for nearby interactable objects
    const interactRadius = 3.5;
    const focusPos = this.isDriving ? this.carPos : this.playerPos;
    let nearest: InteractionPrompt | null = null;
    let minDist = Infinity;

    // 0. If in interior, show EXIT interaction
    if (this.currentInteriorId) {
        let interactions: InteractionPrompt[] = [
            {
                id: "exit_interior",
                label: "Exit House",
                labelAr: "الخروج من المنزل",
                action: () => this.exitInterior()
            }
        ];

        if (this.currentInteriorId === 'int_player_home') {
            interactions.push({
                id: "sleep",
                label: "Sleep (Save Progress)",
                labelAr: "النوم (حفظ التقدم)",
                action: () => {
                    this.playerStats.energy = 100;
                    this.saveGame();
                    if (this.onStatsUpdate) this.onStatsUpdate(this.playerStats);
                    if (this.onDialogue) {
                        this.onDialogue({
                            name: "Home",
                            nameAr: "المنزل",
                            text: "You feel refreshed! Game saved.",
                            textAr: "استعدت نشاطك! تم حفظ اللعبة."
                        });
                    }
                }
            });
        }

        // For simplicity, just pick the nearest interior interaction or show all?
        // Let's just show the first for now or a multi-choice if I had it.
        // Actually, checkInteractions usually returns one nearest.
        nearest = interactions[0];
        this.currentInteraction = nearest;
        if (this.onInteractionUpdate) this.onInteractionUpdate(nearest);
        return;
    }

    // 0. If driving, only option is EXIT
    if (this.isDriving) {
        nearest = {
            id: "exit_veh",
            label: "Exit Vehicle",
            labelAr: "النزول من السيارة",
            action: () => this.handleEInteraction() 
        };
    } else {
        // 1. Check NPCs
        this.npcs.forEach(npc => {
            const dist = npc.group.position.distanceTo(focusPos);
            if (dist < interactRadius && dist < minDist) {
                minDist = dist;
                nearest = {
                    id: npc.id,
                    label: `Talk to ${npc.name}`,
                    labelAr: `تحدث مع ${npc.nameAr}`,
                    action: () => this.startDialogue(npc)
                };
            }
        });

        // 2. Check Vehicles (if not driving)
        this.spawnedVehicles.forEach((v, idx) => {
            const dist = v.group.position.distanceTo(focusPos);
            if (dist < 4.5 && dist < minDist) {
                minDist = dist;
                
                if (v.ownerId && v.ownerId !== 'player') {
                    nearest = {
                        id: `buy_veh_${idx}`,
                        label: `Buy ${v.model.toUpperCase()} (﷼${v.price})`,
                        labelAr: `شراء ${v.model} (﷼${v.price})`,
                        action: () => this.tryBuyVehicle(idx)
                    };
                } else {
                    nearest = {
                        id: `veh_${idx}`,
                        label: "Drive Vehicle",
                        labelAr: "قيادة السيارة",
                        action: () => this.tryEnterVehicle(idx)
                    };
                }
            }
        });

        // 3. Check specific landmarks (Shops, Benches, etc.)
        this.landmarks.forEach(lm => {
            const lmPos = new THREE.Vector3(lm.position.x, 0, lm.position.z);
            const dist = lmPos.distanceTo(focusPos);
            if (dist < 4.5 && dist < minDist) {
                minDist = dist;
                let label = "Interact";
                let labelAr = "تفاعل";
                let action = () => {};

                if (lm.type === 'shop') {
                    label = `Enter ${lm.name}`;
                    labelAr = `دخول ${lm.nameAr}`;
                    action = () => this.openShop(lm.id);
                } else if (lm.type === 'fuel') {
                    label = "Refuel";
                    labelAr = "تعبئة وقود";
                    action = () => this.refuel();
                } else if (lm.type === 'mosque') {
                    label = "Pray";
                    labelAr = "الصلاة";
                    action = () => {
                        this.playerStats.energy = 100;
                        this.playerStats.reputation += 5;
                        this.saveGame();
                        if (this.onStatsUpdate) this.onStatsUpdate(this.playerStats);
                    };
                } else if (lm.type === 'house' && lm.interiorId) {
                    label = `Enter House`;
                    labelAr = `دخول المنزل`;
                    action = () => this.enterInterior(lm);
                } else if (lm.type === 'hospital') {
                    label = "Heal";
                    labelAr = "تداوي";
                    action = () => {
                        this.playerStats.energy = 100;
                        if (this.onStatsUpdate) this.onStatsUpdate(this.playerStats);
                    };
                }

                nearest = { id: lm.id, label, labelAr, action };
            }
        });
    }

    if (nearest?.id !== this.currentInteraction?.id) {
      this.currentInteraction = nearest;
      if (this.onInteractionUpdate) this.onInteractionUpdate(nearest);
    }
  }

  private startDialogue(npc: any) {
    if (this.onDialogue) {
        const lineIdx = Math.floor(Math.random() * npc.dialogue.length);
        
        // Randomly offer a job if no active job exists
        if (!this.activeJob && Math.random() > 0.7 && npc.job !== 'Child') {
            const jobReward = 2000 + Math.floor(Math.random() * 3000);
            const target = this.landmarks[Math.floor(Math.random() * this.landmarks.length)];
            
            this.onDialogue({
                name: npc.name,
                nameAr: npc.nameAr,
                text: `I have a delivery for you! Take this package to ${target.name} for ${jobReward} YER.`,
                textAr: `لدي مهمة توصيل لك! خذ هذا الطرد إلى ${target.nameAr} مقابل ${jobReward} ريال يمني.`
            });

            this.activeJob = {
                id: `job_${Date.now()}`,
                title: `Delivery to ${target.name}`,
                reward: jobReward,
                targetPos: target.position
            };
            return;
        }

        this.onDialogue({
            name: npc.name,
            nameAr: npc.nameAr,
            text: npc.dialogue[lineIdx],
            textAr: npc.dialogueAr[lineIdx]
        });
    }
  }

  private checkJobCompletion() {
    if (!this.activeJob) return;

    const dist = this.playerPos.distanceTo(new THREE.Vector3(this.activeJob.targetPos.x, 0, this.activeJob.targetPos.z));
    if (dist < 5.0) {
        const reward = this.activeJob.reward;
        this.playerStats.money += reward;
        this.playerStats.reputation += 10;
        
        if (this.onDialogue) {
            this.onDialogue({
                name: "System",
                nameAr: "النظام",
                text: `Job Completed! You earned ${reward} YER and +10 Reputation.`,
                textAr: `تمت المهمة! حصلت على ${reward} ريال و+10 سمعة.`
            });
        }
        
        this.activeJob = null;
        this.saveGame();
        if (this.onStatsUpdate) this.onStatsUpdate(this.playerStats);
    }
  }

  private openShop(shopId: string) {
    // Determine shop inventory based on ID
    const shop = this.landmarks.find(l => l.id === shopId);
    if (!shop) return;

    // Define items per shop type
    const inventoryMap: Record<string, InventoryItem[]> = {
        'market_square': [
            { id: 'fruit_basket', name: 'Fruit Basket', nameAr: 'سلة فواكه', value: 1200, type: 'food' },
            { id: 'yemeni_honey', name: 'Yemeni Honey', nameAr: 'عسل يمني', value: 3500, type: 'food' }
        ],
        'honey_shop': [
            { id: 'sidr_honey', name: 'Sidr Honey', nameAr: 'عسل سدر أصلي', value: 5000, type: 'food' },
            { id: 'wax_honey', name: 'Honeycomb', nameAr: 'شمع عسل', value: 2500, type: 'food' }
        ],
        'fruit_stall': [
            { id: 'bananas', name: 'Bananas', nameAr: 'موز صبر', value: 500, type: 'food' },
            { id: 'grapes', name: 'Yemeni Grapes', nameAr: 'عنب يمني', value: 800, type: 'food' }
        ],
        'clothing_shop': [
            { id: 'white_thobe', name: 'White Thobe', nameAr: 'ثوب أبيض', value: 7000, type: 'clothing' },
            { id: 'red_shemagh', name: 'Red Shemagh', nameAr: 'شماغ أحمر', value: 3000, type: 'clothing' }
        ]
    };

    const items = inventoryMap[shopId] || [
        { id: 'tea', name: 'Adeni Tea', nameAr: 'شاهي عدني', value: 200, type: 'food' },
        { id: 'bread', name: 'Roti Bread', nameAr: 'روتي', value: 100, type: 'food' }
    ];

    // For simplicity in this engine, we'll auto-buy the first item if enough money
    const item = items[0];
    if (this.playerStats.money >= item.value) {
        this.playerStats.money -= item.value;
        this.inventory.push(item);
        this.playerStats.reputation += 1;
        
        this.saveGame();
        if (this.onStatsUpdate) this.onStatsUpdate(this.playerStats);
        if (this.onInventoryUpdate) this.onInventoryUpdate(this.inventory);
        
        // Temporary feedback via dialogue
        if (this.onDialogue) {
            this.onDialogue({
                name: shop.name,
                nameAr: shop.nameAr,
                text: `Thank you for buying ${item.name}! It costs ${item.value} YER.`,
                textAr: `شكراً لشرائك ${item.nameAr}! السعر هو ${item.value} ريال يمني.`
            });
        }
    } else {
        if (this.onDialogue) {
            this.onDialogue({
                name: shop.name,
                nameAr: shop.nameAr,
                text: `I'm sorry, you don't have enough money for ${item.name}.`,
                textAr: `عذراً، ليس لديك رصيد كافٍ لشراء ${item.nameAr}.`
            });
        }
    }
  }

  private enterInterior(landmark: Landmark) {
    if (!landmark.interiorId) return;
    
    this.lastExteriorPos.copy(this.playerPos);
    this.currentInteriorId = landmark.interiorId;
    
    // Teleport to interior zone (e.g., very high up or far away)
    this.playerPos.set(0, 50, 0); // Interior offset
    this.playerGroup.position.copy(this.playerPos);
    
    // Notify UI or handle visual fade
    console.log(`Entering interior: ${landmark.interiorId}`);
    
    if (this.onDialogue) {
        this.onDialogue({
            name: landmark.name,
            nameAr: landmark.nameAr,
            text: `Welcome inside ${landmark.name}.`,
            textAr: `مرحباً بك داخل ${landmark.nameAr}.`
        });
    }
  }

  private exitInterior() {
    if (!this.currentInteriorId) return;
    
    this.playerPos.copy(this.lastExteriorPos);
    this.playerGroup.position.copy(this.playerPos);
    this.currentInteriorId = null;
    
    console.log("Exited interior.");
  }

  private refuel() {
    const cost = 1500;
    if (this.playerStats.money >= cost) {
        this.playerStats.money -= cost;
        this.playerStats.reputation += 1;
        
        this.saveGame();
        if (this.onStatsUpdate) this.onStatsUpdate(this.playerStats);
        
        if (this.onDialogue) {
            this.onDialogue({
                name: "Station",
                nameAr: "المحطة",
                text: "Refueling complete! That will be 1500 YER.",
                textAr: "تمت تعبئة الوقود! التكلفة هي 1500 ريال يمني."
            });
        }
    } else {
        if (this.onDialogue) {
            this.onDialogue({
                name: "Station",
                nameAr: "المحطة",
                text: "You don't have enough money for fuel.",
                textAr: "ليس لديك رصيد كافٍ لتعبئة الوقود."
            });
        }
    }
  }

  public addMoney(amount: number) {
    this.playerStats.money += amount;
    this.saveGame();
    if (this.onStatsUpdate) this.onStatsUpdate(this.playerStats);
  }

  public addReputation(amount: number) {
    this.playerStats.reputation += amount;
    this.saveGame();
    if (this.onStatsUpdate) this.onStatsUpdate(this.playerStats);
  }

  public registerCallbacks(cb: {
    onInteraction?: (p: InteractionPrompt | null) => void;
    onStats?: (s: PlayerStats) => void;
    onMap?: (l: Landmark[]) => void;
    onInventory?: (i: InventoryItem[]) => void;
    onDialogue?: (d: { name: string, nameAr: string, text: string, textAr: string } | null) => void;
    onWeather?: (w: WeatherType) => void;
    onWanted?: (l: WantedLevel) => void;
    onStory?: (p: StoryProgress) => void;
    onCutscene?: (active: boolean, text?: string, textAr?: string) => void;
  }) {
    if (cb.onInteraction) this.onInteractionUpdate = cb.onInteraction;
    if (cb.onStats) this.onStatsUpdate = cb.onStats;
    if (cb.onMap) this.onMapUpdate = cb.onMap;
    if (cb.onInventory) this.onInventoryUpdate = cb.onInventory;
    if (cb.onDialogue) this.onDialogue = cb.onDialogue;
    if (cb.onWeather) this.onWeatherUpdate = cb.onWeather;
    if (cb.onWanted) this.onWantedUpdate = cb.onWanted;
    if (cb.onStory) this.onStoryUpdate = cb.onStory;
    if (cb.onCutscene) this.onCutsceneUpdate = cb.onCutscene;
    
    // Initial sync
    if (this.onStatsUpdate) this.onStatsUpdate(this.playerStats);
    if (this.onMapUpdate) this.onMapUpdate(this.landmarks);
    if (this.onInventoryUpdate) this.onInventoryUpdate(this.inventory);
    if (this.onWeatherUpdate) this.onWeatherUpdate(this.currentWeather);
    if (this.onWantedUpdate) this.onWantedUpdate(this.wantedLevel);
    if (this.onStoryUpdate) this.onStoryUpdate(this.storyProgress);

    // Start intro cutscene for Chapter 1 if not started
    if (this.storyProgress.currentChapter === 1 && this.storyProgress.completedQuests.length === 0 && !this.isCutsceneActive) {
        this.startCutscene(STORY_DATA[0].introCutscene || []);
    }
  }

  public setOutfit(thobe: number, turban: number) {
    this.thobeColor = thobe;
    this.turbanColor = turban;
    
    // Rebuild player model with new colors
    if (this.playerGroup) {
        this.scene.remove(this.playerGroup);
        this.initPlayer();
    }
  }

  public saveGame() {
    const data = {
        playerPos: { x: this.playerPos.x, y: this.playerPos.y, z: this.playerPos.z },
        stats: this.playerStats,
        inventory: this.inventory,
        time: this.timer.getElapsedTime(),
        money: this.playerStats.money
    };
    localStorage.setItem('taiz_v1_save', JSON.stringify(data));
    console.log("Game Saved");
  }

  public loadGame() {
    const dataStr = localStorage.getItem('taiz_v1_save');
    if (dataStr) {
        const data = JSON.parse(dataStr);
        this.playerPos.set(data.playerPos.x, data.playerPos.y, data.playerPos.z);
        this.playerStats = data.stats;
        this.inventory = data.inventory;
        if (this.onStatsUpdate) this.onStatsUpdate(this.playerStats);
        console.log("Game Loaded");
    }
  }

  private updateBirds(delta: number) {
    if (!(this as any).birds) return;
    const time = this.timer.getElapsedTime();
    (this as any).birds.forEach((bird: any) => {
      bird.angle += bird.speed * delta;
      bird.group.position.set(
        Math.cos(bird.angle) * bird.radius,
        bird.height + Math.sin(time * 2) * 2,
        Math.sin(bird.angle) * bird.radius
      );
      bird.group.rotation.y = -bird.angle + Math.PI / 2;
      
      // Flap wings
      const flap = Math.sin(time * 15) * 0.6;
      const wingL = bird.group.getObjectByName("wingL");
      const wingR = bird.group.getObjectByName("wingR");
      if (wingL) wingL.rotation.z = flap;
      if (wingR) wingR.rotation.z = -flap;
    });
  }

  public shutdown() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    window.removeEventListener('resize', this.onResize);
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('mousemove', this.handleMouseMove);
    window.removeEventListener('mouseup', this.handleMouseUp);
    
    this.canvas.removeEventListener('mousedown', this.handleMouseDown);
    this.canvas.removeEventListener('wheel', this.handleWheel);
    this.canvas.removeEventListener('touchstart', this.handleTouchStart);
    this.canvas.removeEventListener('touchmove', this.handleTouchMove);
    this.canvas.removeEventListener('touchend', this.handleTouchEnd);

    if (this.renderer) {
      this.renderer.dispose();
      this.renderer.forceContextLoss();
    }
    
    if (this.audioCtx) {
      this.audioCtx.close();
    }

    // Deep disposal of scene resources to prevent memory leaks
    this.scene.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        if (object.geometry) {
          object.geometry.dispose();
        }

        if (object.material) {
          if (Array.isArray(object.material)) {
            object.material.forEach((material) => this.disposeMaterial(material));
          } else {
            this.disposeMaterial(object.material);
          }
        }
      }
    });

    this.scene.clear();
  }

  private disposeMaterial(material: THREE.Material) {
    material.dispose();
    
    // Dispose textures within the material
    for (const key of Object.keys(material)) {
      const value = (material as any)[key];
      if (value instanceof THREE.Texture) {
        value.dispose();
      }
    }
  }
}
