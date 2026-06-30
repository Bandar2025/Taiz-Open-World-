export interface CppFile {
  id: string;
  name: string;
  path: string;
  type: 'header' | 'source' | 'config' | 'asset';
  category: 'Core' | 'Characters' | 'Systems' | 'UI' | 'Input';
  purpose: string;
  code: string;
}

export interface CityElement {
  id: string;
  name: string;
  nameAr: string;
  type: 'house' | 'mosque' | 'market_stall' | 'gas_station' | 'tree' | 'street_light' | 'parking_spot' | 'car';
  x: number; // grid position
  y: number;
  width: number;
  height: number;
  color: string;
  heightLevel: number; // height for visual depth
  interactive: boolean;
  dialogue?: string[];
  ambientSoundId?: string;
}

export interface PlayerState {
  x: number;
  y: number;
  direction: 'N' | 'S' | 'E' | 'W' | 'NE' | 'NW' | 'SE' | 'SW';
  movementState: 'Idle' | 'Walking' | 'Running' | 'Sprinting' | 'Crouching';
  currentSpeed: number;
  interactingWith?: string;
  activeCameraMode: 'ThirdPerson' | 'FirstPerson' | 'Isometric';
}

export interface AudioLayer {
  id: string;
  name: string;
  nameAr: string;
  volume: number;
  isPlaying: boolean;
  type: 'wind' | 'adhan' | 'market' | 'traffic' | 'interactive';
}

export interface BlueprintNode {
  id: string;
  title: string;
  type: 'Event' | 'Function' | 'Branch' | 'Setter' | 'Getter' | 'Input';
  inputs: string[];
  outputs: string[];
  x: number;
  y: number;
  description: string;
}

export interface BlueprintLink {
  fromNode: string;
  fromPin: string;
  toNode: string;
  toPin: string;
}

export interface PlayerStats {
  hunger: number; // 0-100
  thirst: number; // 0-100
  energy: number; // 0-100
  reputation: number; // -100 to 100
  money: number; // Yemeni Riyals (YER)
}

export interface InventoryItem {
  id: string;
  name: string;
  nameAr: string;
  type: 'food' | 'drink' | 'clothing' | 'utility';
  value: number;
  effect?: Partial<PlayerStats>;
}

export interface InteractionPrompt {
  id: string;
  label: string;
  labelAr: string;
  action: () => void;
  icon?: string;
}

export interface Landmark {
  id: string;
  name: string;
  nameAr: string;
  type: 'mosque' | 'market' | 'castle' | 'shop' | 'fuel' | 'hospital' | 'school' | 'house';
  position: { x: number; z: number };
  interiorId?: string;
}

export enum WeatherType {
  Sunny = 'sunny',
  Cloudy = 'cloudy',
  Rain = 'rain',
  Fog = 'fog',
  DustStorm = 'dust_storm'
}

export interface MarketState {
  prices: Record<string, number>; // itemId -> multiplier
  lastUpdate: number;
}

export interface NPCScheduleEntry {
  startTime: number; // 0-24
  endTime: number;
  activity: NPCActivity;
  locationId: string; // landmarkId or houseId
}

export interface VehicleData {
  id: string;
  model: string;
  ownerId: string; // NPC id or 'player'
  pos: { x: number; z: number };
  rot: number;
  isParked: boolean;
}

export enum WantedLevel {
  Clear = 0,
  Citation = 1,
  Wanted = 2,
  HighSpeedChase = 3,
  LockedDown = 4
}

export enum NPCActivity {
  Idle = 'idle',
  Walking = 'walking',
  Working = 'working',
  Praying = 'praying',
  Sleeping = 'sleeping',
  Playing = 'playing',
  Driving = 'driving',
  Eating = 'eating'
}

export enum QuestStatus {
  Locked = 'Locked',
  Available = 'Available',
  InProgress = 'InProgress',
  Completed = 'Completed',
  Failed = 'Failed'
}

export enum ObjectiveType {
  ReachLocation = 'ReachLocation',
  InteractWithNPC = 'InteractWithNPC',
  DeliverItem = 'DeliverItem',
  WaitUntilTime = 'WaitUntilTime',
  BuyItem = 'BuyItem'
}

export interface StoryObjective {
  id: string;
  type: ObjectiveType;
  description: string;
  descriptionAr: string;
  targetId?: string; // Landmark or NPC ID
  targetPos?: { x: number; y: number; z: number };
  isCompleted: boolean;
}

export interface StoryDialogueEntry {
  speaker: string;
  speakerAr: string;
  text: string;
  textAr: string;
  cameraPos?: { x: number; y: number; z: number };
  cameraLookAt?: { x: number; y: number; z: number };
}

export interface CutsceneSegment {
  duration: number;
  cameraStart: { x: number; y: number; z: number };
  cameraEnd: { x: number; y: number; z: number };
  lookAtStart: { x: number; y: number; z: number };
  lookAtEnd: { x: number; y: number; z: number };
  text?: string;
  textAr?: string;
  audioPlaceholder?: string;
}

export interface Quest {
  id: string;
  title: string;
  titleAr: string;
  chapter: number;
  description: string;
  descriptionAr: string;
  objectives: StoryObjective[];
  rewards: {
    money: number;
    reputation: number;
    items?: string[];
  };
  startDialogue?: StoryDialogueEntry[];
  endDialogue?: StoryDialogueEntry[];
  status: QuestStatus;
}

export interface Chapter {
  id: number;
  title: string;
  titleAr: string;
  introCutscene?: CutsceneSegment[];
  outroCutscene?: CutsceneSegment[];
  quests: Quest[];
}

export interface StoryProgress {
  currentChapter: number;
  completedQuests: string[];
  activeQuestId: string | null;
  achievements: string[];
}
