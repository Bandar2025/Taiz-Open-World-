import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { GameEngine } from '../game/GameEngine';
import { Compass, Moon, Sun, Navigation, Volume2, VolumeX, Shield, Award, Shirt, MapPin, Sparkles, Car, Book } from 'lucide-react';
import { GameUI } from './GameUI';
import { Journal, CutsceneOverlay } from './StoryUI';
import { PlayerStats, InteractionPrompt, Landmark, InventoryItem, WeatherType, WantedLevel, StoryProgress } from '../types';

interface CitySandboxProps {
  timeOfDay: number;
  setTimeOfDay: (time: number) => void;
  isMuted: boolean;
  setIsMuted: (muted: boolean) => void;
  activeDistrict: string;
  setActiveDistrict: (dist: string) => void;
  onLoadingProgress?: (progress: number, label: string) => void;
  appState: 'menu' | 'loading' | 'game';
}

export const CitySandbox: React.FC<CitySandboxProps> = ({
  timeOfDay,
  setTimeOfDay,
  isMuted,
  setIsMuted,
  activeDistrict,
  setActiveDistrict,
  onLoadingProgress,
  appState
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<GameEngine | null>(null);

  // HUD and Player stats
  const [playerCoords, setPlayerCoords] = useState({ x: 0, z: 10, rot: 0, isDriving: false, speed: 0 });
  const [dialoguePrompt, setDialoguePrompt] = useState<string | null>(null);
  const [activeDialogue, setActiveDialogue] = useState<string[] | null>(null);
  const [dialogueIndex, setDialogueIndex] = useState(0);
  const [dialogueSpeaker, setDialogueSpeaker] = useState("");
  
  // v1.0 Gameplay State
  const [stats, setStats] = useState<PlayerStats>({
    hunger: 100,
    thirst: 100,
    energy: 100,
    reputation: 0,
    money: 1500,
  });
  const [interaction, setInteraction] = useState<InteractionPrompt | null>(null);
  const [landmarks, setLandmarks] = useState<Landmark[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  
  // Customization & Progression
  const [activeOutfit, setActiveOutfit] = useState({ thobe: 0xfcf9f2, turban: 0x990000 });
  const [currentWeather, setCurrentWeather] = useState<WeatherType>(WeatherType.Sunny);
  const [wantedLevel, setWantedLevel] = useState<WantedLevel>(WantedLevel.Clear);
  const [fuel, setFuel] = useState(100);
  const [storyProgress, setStoryProgress] = useState<StoryProgress>({
    currentChapter: 1,
    completedQuests: [],
    activeQuestId: null,
    achievements: []
  });
  const [cutscene, setCutscene] = useState<{ active: boolean, text?: string, textAr?: string }>({ active: false });
  const [showJournal, setShowJournal] = useState(false);
  const [dialogue, setDialogue] = useState<{ name: string, nameAr: string, text: string, textAr: string } | null>(null);
  const [visitedPlaces, setVisitedPlaces] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Gameplay Settings & Menus State
  const [isPaused, setIsPaused] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showSaveToast, setShowSaveToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [graphicsQuality, setGraphicsQuality] = useState<'low' | 'medium' | 'high'>('medium');
  const [soundVolume, setSoundVolume] = useState(0.5);
  const [musicVolume, setMusicVolume] = useState(0.4);
  const [language, setLanguage] = useState<'ar' | 'en'>('ar');
  const [controlType, setControlType] = useState<'keyboard' | 'touch'>('touch');
  const [sensitivity, setSensitivity] = useState(1.0);
  const [fps, setFps] = useState(60);

  // Mobile Virtual Joystick State
  const joystickContainerRef = useRef<HTMLDivElement | null>(null);
  const [joystickActive, setJoystickActive] = useState(false);
  const [joystickPos, setJoystickPos] = useState({ x: 0, y: 0 });
  const touchStartRef = useRef<{ x: number, y: number } | null>(null);

  // Active missions state
  const [activeMission, setActiveMission] = useState<{
    id: string;
    title: string;
    titleAr: string;
    desc: string;
    reward: number;
    completed: boolean;
  } | null>(null);

  // Remove initial loading simulator in favor of real asset sync
  useEffect(() => {
    setIsLoading(false);
  }, []);

  // Save/Load persistence in localStorage
  // Mount 3D GameEngine
  useEffect(() => {
    if (isLoading) return;
    if (!canvasRef.current) return;

    // Initialize the real high-performance 3D game
    const engine = new GameEngine(canvasRef.current, {
      onPlayerCoords: (x, z, rot, isDriving, speed) => {
        setPlayerCoords({ x, z, rot, isDriving, speed });
        
        // Dynamically compute active district based on Z coordinates along the main street
        if (z < -25) {
          if (activeDistrict !== 'AlGanadCorridor') setActiveDistrict('AlGanadCorridor');
        } else if (z > 25) {
          if (activeDistrict !== 'SaberMountain') setActiveDistrict('SaberMountain');
        } else {
          if (activeDistrict !== 'SouqAlQahira') setActiveDistrict('SouqAlQahira');
        }
      },
      onPlaceVisited: (placeKey) => {
        setVisitedPlaces(prev => {
          if (prev.includes(placeKey)) return prev;
          const next = [...prev, placeKey];
          // Reward exploration
          engine.addMoney(1500);
          engine.addReputation(2);
          return next;
        });
      },
      onDialoguePrompt: setDialoguePrompt,
      onDialogueActive: (dialogue, speaker) => {
        if (!dialogue) {
          setActiveDialogue(null);
          return;
        }
        setDialogueSpeaker(speaker);
        setActiveDialogue(dialogue);
        setDialogueIndex(0);
      }
    }, {
      thobeColor: activeOutfit.thobe,
      turbanColor: activeOutfit.turban,
      onLoadingProgress
    });

    // Register v1.0 & v2.0 gameplay system callbacks
    engine.registerCallbacks({
      onInteraction: setInteraction,
      onStats: setStats,
      onMap: setLandmarks,
      onInventory: setInventory,
      onDialogue: (d) => {
        if (!d) {
          setActiveDialogue(null);
          return;
        }
        setDialogueSpeaker(language === 'ar' ? d.nameAr : d.name);
        setActiveDialogue([language === 'ar' ? d.textAr : d.text]);
        setDialogueIndex(0);
      },
      onWeather: setCurrentWeather,
      onWanted: setWantedLevel,
      onStory: setStoryProgress,
      onCutscene: (active, text, textAr) => setCutscene({ active, text, textAr })
    });

    engineRef.current = engine;

    // Trigger initial lighting sync
    engine.updateDayNightCycle(timeOfDay);

    return () => {
      engine.shutdown();
      engineRef.current = null;
    };
  }, [isLoading]);

  // Control Engine state based on App state
  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.setLanguage(language);
    }
  }, [language]);

  useEffect(() => {
    if (!engineRef.current) return;
    
    if (appState === 'loading') {
      engineRef.current.startLoading();
    } else if (appState === 'game') {
      engineRef.current.startGame();
    }
  }, [appState]);

  // Synchronize dynamic light cycles
  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.updateDayNightCycle(timeOfDay);
    }
  }, [timeOfDay]);

  // Synchronize Audio Volume & Mute to the engine
  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.setMuted(isMuted);
    }
  }, [isMuted, isLoading]);

  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.setSoundVolume(soundVolume);
    }
  }, [soundVolume, isLoading]);

  // Sync Graphics Quality
  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.setGraphicsQuality(graphicsQuality);
    }
  }, [graphicsQuality, isLoading]);

  // Toast notifier helper
  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setShowSaveToast(true);
    setTimeout(() => setShowSaveToast(false), 3000);
  };

  // Real-time FPS Tracker (purely functional and exact)
  useEffect(() => {
    let lastTime = performance.now();
    let frames = 0;
    let animId: number;
    const interval = setInterval(() => {
      const now = performance.now();
      const currentFps = Math.round((frames * 1000) / (now - lastTime));
      setFps(currentFps);
      frames = 0;
      lastTime = now;
    }, 1000);

    const countFrame = () => {
      frames++;
      animId = requestAnimationFrame(countFrame);
    };
    animId = requestAnimationFrame(countFrame);

    return () => {
      clearInterval(interval);
      cancelAnimationFrame(animId);
    };
  }, []);

  // Fuel Consumption Simulation
  useEffect(() => {
    if (!playerCoords.isDriving) return;
    const interval = setInterval(() => {
      setFuel(f => {
        const consumed = playerCoords.speed * 0.0022;
        const nextFuel = Math.max(0, f - consumed);
        if (nextFuel <= 0) {
          // halt car
          engineRef.current?.handleMobileButton('w', false);
        }
        return nextFuel;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [playerCoords.isDriving, playerCoords.speed]);

  // Refueling helper
  const handleRefuel = () => {
    // Check if near the Fuel Station (X range [10, 24], Z range [6, 20])
    if (playerCoords.x >= 5 && playerCoords.x <= 25 && playerCoords.z >= 2 && playerCoords.z <= 22) {
      setFuel(100);
      triggerToast(language === 'ar' ? "تم تعبئة خزان الوقود بالكامل! ⛽" : "Fully refueled the vehicle! ⛽");
    } else {
      triggerToast(language === 'ar' ? "يجب التواجد بجوار محطة الوقود! ⚠️" : "Must park near the fuel station! ⚠️");
    }
  };

  const handleManualSave = () => {
    // Local persistence helper
    const saveProgression = (rep: number, mon: number, places: string[]) => {
      localStorage.setItem('lumen_yemen_reputation', rep.toString());
      localStorage.setItem('lumen_yemen_money', mon.toString());
      localStorage.setItem('lumen_yemen_visited', JSON.stringify(places));
    };

    saveProgression(stats.reputation, stats.money, visitedPlaces);
    triggerToast(language === 'ar' ? "تم حفظ تقدم اللعبة بنجاح! 💾" : "Game progress saved successfully! 💾");
  };

  // Global Keyboard zoom listeners for "+" and "-" keys
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!engineRef.current) return;
      
      // Ignore if user is inside form inputs
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
        return;
      }

      // Check key codes for '+' or '='
      if (e.key === '=' || e.key === '+' || e.code === 'Equal' || e.code === 'NumpadAdd') {
        engineRef.current.zoomCamera(-1.5);
      }
      // Check key codes for '-' or '_'
      else if (e.key === '-' || e.key === '_' || e.code === 'Minus' || e.code === 'NumpadSubtract') {
        engineRef.current.zoomCamera(1.5);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleResetProgress = () => {
    localStorage.removeItem('lumen_yemen_rep');
    localStorage.removeItem('lumen_yemen_money');
    localStorage.removeItem('lumen_yemen_places');
    triggerToast(language === 'ar' ? "تم إعادة ضبط التقدم! جارٍ إعادة التحميل..." : "Progression reset! Reloading...");
    setTimeout(() => {
      window.location.reload();
    }, 1500);
  };

  // Update outfit colors on the 3D meshes dynamically
  const changeOutfit = (thobe: number, turban: number) => {
    setActiveOutfit({ thobe, turban });
    // Update active player materials in engine
    if (engineRef.current) {
      engineRef.current.shutdown();
      // Re-instantiate to apply new character meshes or simply reload scene
      setIsLoading(true);
      setTimeout(() => setIsLoading(false), 200);
    }
  };

  const startMission = (missionId: string) => {
    let title = "";
    let titleAr = "";
    let desc = "";
    let reward = 0;

    if (missionId === 'taxi') {
      title = "Saber Mountain Taxi Climb";
      titleAr = "تحدي عقبة جبل صبر (تاكسي)";
      desc = "Drive passengers up the steep hill road of Saber Mountain. Reward: 5,000 YER";
      reward = 5000;
    } else if (missionId === 'delivery') {
      title = "Spice Delivery to Mosque";
      titleAr = "توصيل بهارات المسجد الأثري";
      desc = "Pick up traditional spices from Saleh and transport them safely to Al-Ashrafiya Mosque. Reward: 3,500 YER";
      reward = 3500;
    } else if (missionId === 'hiace_run') {
      title = "HiAce Commuter Service";
      titleAr = "خط باص الهائل الشهير (الهايس)";
      desc = "Drive the commuter HiAce bus from market place to the Station Fuel Depot. Reward: 8,000 YER";
      reward = 8000;
    } else if (missionId === 'honey_run') {
      title = "Royal Sidr Honey Courier";
      titleAr = "توصيل عسل السدر الصبري الفاخر";
      desc = "Collect premium therapeutic honey from Yahya and deliver to Mukhtar. Reward: 12,000 YER";
      reward = 12000;
    } else if (missionId === 'bab_musa_shuttle') {
      title = "Bab Musa Ancient Gate Shuttle";
      titleAr = "مكوك فرزة باب موسى التاريخي";
      desc = "Drive tourists from Al-Mudhaffar central avenue to the historic Bab Musa stone gate. Reward: 4,000 YER";
      reward = 4000;
    } else if (missionId === 'qahira_coffee') {
      title = "Al-Qahira Castle Coffee Delivery";
      titleAr = "توصيل قهوة قلعة القاهرة";
      desc = "Transport fresh premium coffee beans from the market up to Al-Qahira Castle rest stop. Reward: 6,500 YER";
      reward = 6500;
    } else if (missionId === 'hawban_cargo') {
      title = "Al-Hawban Industrial Express";
      titleAr = "توصيل بضائع خط الحوبان السريع";
      desc = "Drive heavy cargo crates from central fuel station up to Al-Hawban industrial highway. Reward: 10,000 YER";
      reward = 10000;
    } else if (missionId === 'saber_water') {
      title = "Mount Saber Sabeel Water Run";
      titleAr = "سقيا سبيل ماء جبل صبر";
      desc = "Take pure therapeutic spring water from Al-Ashrafiya dome up to high altitude rustic villas. Reward: 15,000 YER";
      reward = 15000;
    } else if (missionId === 'clinic_supplies') {
      title = "Hawban Clinic Medical Emergency";
      titleAr = "مستلزمات عيادة الحوبان الإسعافية";
      desc = "Transport urgent medicine boxes in the HiAce bus to Al-Hawban modern clinic. Reward: 11,500 YER";
      reward = 11500;
    } else if (missionId === 'tourist_guide') {
      title = "Historical Taiz Sightseeing Tour";
      titleAr = "جولة المعالم السياحية التاريخية";
      desc = "Drive visitor groups on a comprehensive tour covering Bab Musa and Al-Qahira viewpoint. Reward: 14,000 YER";
      reward = 14000;
    } else if (missionId === 'hidden_chest') {
      title = "Search for Hidden Sabat Treasure";
      titleAr = "البحث عن كنز الساباط المفقود";
      desc = "Explore the narrow alleys behind Al-Mudhaffar ancient houses to find the hidden chest! Reward: 20,000 YER";
      reward = 20000;
    } else if (missionId === 'gas_refuel') {
      title = "Station Backup Fuel Transfer";
      titleAr = "نقل وقود المحطة الاحتياطي";
      desc = "Drive backup fuel containers from Al-Hawban secondary depot back to central gas station. Reward: 9,000 YER";
      reward = 9000;
    }

    const mission = { id: missionId, title, titleAr, desc, reward, completed: false };
    setActiveMission(mission);
    engineRef.current?.setMissionId(missionId);
  };

  const completeActiveMission = () => {
    if (!activeMission) return;
    const bonus = activeMission.reward;
    engineRef.current?.addMoney(bonus);
    engineRef.current?.addReputation(25);
    setActiveMission(prev => prev ? { ...prev, completed: true } : null);
    engineRef.current?.setMissionId(null);
    setTimeout(() => setActiveMission(null), 4000);
  };

  // Check mission milestones based on coordinates
  useEffect(() => {
    if (!activeMission || activeMission.completed) return;

    if (activeMission.id === 'taxi') {
      // Must be driving and reach high Saber terrain (Z < -150)
      if (playerCoords.isDriving && playerCoords.z < -150) {
        completeActiveMission();
      }
    } else if (activeMission.id === 'delivery') {
      // Deliver to Al-Ashrafiya Mosque (X > 12, Z < -5)
      if (playerCoords.x > 12 && playerCoords.z < -5) {
        completeActiveMission();
      }
    } else if (activeMission.id === 'hiace_run') {
      // HiAce run to Fuel Station Depot (X > 10, Z > 6)
      if (playerCoords.isDriving && playerCoords.x > 10 && playerCoords.z > 6) {
        completeActiveMission();
      }
    } else if (activeMission.id === 'honey_run') {
      // Honey run to Mukhtar (X > 8, Z > 2)
      if (playerCoords.x > 8 && playerCoords.z > 2) {
        completeActiveMission();
      }
    } else if (activeMission.id === 'bab_musa_shuttle') {
      // Reach Bab Musa gate (X < -100, Math.abs(Z + 20) < 15)
      if (playerCoords.x < -100 && Math.abs(playerCoords.z + 20) < 15) {
        completeActiveMission();
      }
    } else if (activeMission.id === 'qahira_coffee') {
      // Reach Al-Qahira view point (X > 100, Z < -130)
      if (playerCoords.x > 100 && playerCoords.z < -130) {
        completeActiveMission();
      }
    } else if (activeMission.id === 'hawban_cargo') {
      // Reach Al-Hawban Highway (Z > 135)
      if (playerCoords.isDriving && playerCoords.z > 135) {
        completeActiveMission();
      }
    } else if (activeMission.id === 'saber_water') {
      // Reach high altitude farm villas (Z < -180 and Math.abs(X) > 40)
      if (playerCoords.z < -180 && Math.abs(playerCoords.x) > 40) {
        completeActiveMission();
      }
    } else if (activeMission.id === 'clinic_supplies') {
      // Reach Hawban modern clinic (Z > 140 && X > 100)
      if (playerCoords.z > 140 && playerCoords.x > 100) {
        completeActiveMission();
      }
    } else if (activeMission.id === 'tourist_guide') {
      // Reach scenic platform (X > 100 && Z < -130)
      if (playerCoords.x > 100 && playerCoords.z < -130) {
        completeActiveMission();
      }
    } else if (activeMission.id === 'hidden_chest') {
      // Find hidden alleys of Al-Mudhaffar (X in [30, 40], Z in [45, 55])
      if (playerCoords.x >= 30 && playerCoords.x <= 40 && playerCoords.z >= 45 && playerCoords.z <= 55) {
        completeActiveMission();
      }
    } else if (activeMission.id === 'gas_refuel') {
      // Return to central gas station (X in [10, 22], Z in [8, 16])
      if (playerCoords.x >= 10 && playerCoords.x <= 22 && playerCoords.z >= 8 && playerCoords.z <= 16) {
        completeActiveMission();
      }
    }
  }, [playerCoords, activeMission, visitedPlaces]);

  const handleJoystickTouchStart = (e: React.TouchEvent) => {
    setJoystickActive(true);
    updateJoystick(e);
  };

  const handleJoystickTouchMove = (e: React.TouchEvent) => {
    updateJoystick(e);
  };

  const handleJoystickTouchEnd = () => {
    setJoystickActive(false);
    setJoystickPos({ x: 0, y: 0 });
    // Reset analog joystick input
    engineRef.current?.setJoystickInput(0, 0);
    // Release all fallback movement keys in engine
    engineRef.current?.handleMobileButton('w', false);
    engineRef.current?.handleMobileButton('s', false);
    engineRef.current?.handleMobileButton('a', false);
    engineRef.current?.handleMobileButton('d', false);
  };

  const updateJoystick = (e: React.TouchEvent) => {
    if (!joystickContainerRef.current) return;
    const rect = joystickContainerRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const touch = e.touches[0];
    const dx = touch.clientX - centerX;
    const dy = touch.clientY - centerY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const maxRadius = rect.width / 2;
    
    // Normalize and cap
    const angle = Math.atan2(dy, dx);
    const clampDist = Math.min(dist, maxRadius);
    const x = Math.cos(angle) * clampDist;
    const y = Math.sin(angle) * clampDist;
    
    setJoystickPos({ x, y });

    const normX = x / maxRadius;
    const normY = y / maxRadius;

    // Send high-fidelity raw analog values directly to the cinematic game engine
    engineRef.current?.setJoystickInput(normX, -normY);

    // Maintain keyboard emulation as background fallback
    const threshold = 0.3;
    engineRef.current?.handleMobileButton('w', normY < -threshold);
    engineRef.current?.handleMobileButton('s', normY > threshold);
    engineRef.current?.handleMobileButton('a', normX < -threshold);
    engineRef.current?.handleMobileButton('d', normX > threshold);
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 bg-[#0A0A0C]">
      
      {/* Interactive Playable WebGL Stage */}
      <div className="xl:col-span-3 bg-[#121214] border border-[#232329] rounded-xl flex flex-col overflow-hidden shadow-2xl relative">
        
        {/* Cinematic Header Overlay */}
        <div className="px-5 py-4 border-b border-[#232329] bg-[#0E0E10] flex flex-wrap items-center justify-between gap-4 z-10">
          <div className="flex items-center gap-3">
            <Compass className="w-5 h-5 text-amber-500 animate-spin-slow" />
            <div>
              <span className="text-[10px] text-amber-500 font-mono tracking-wider font-semibold uppercase block">Lumen Yemen Engine v0.4</span>
              <h2 className="text-sm font-bold text-gray-100 flex items-center gap-2">
                {language === 'ar' ? 'حي الأشرفية الأثري (تعز القديمة)' : 'Al-Ashrafiya District (Old Taiz)'}
                <span className="text-[10px] bg-[#1C1C22] border border-[#2D2D38] px-2 py-0.5 rounded text-amber-400 font-mono">
                  {activeDistrict === 'SouqAlQahira' ? (language === 'ar' ? 'السوق القديم' : 'Old Souq') : activeDistrict === 'SaberMountain' ? (language === 'ar' ? 'سفوح صبر' : 'Saber Foothills') : (language === 'ar' ? 'ممر الجند' : 'Al-Ganad Pass')}
                </span>
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* FPS and Performance display */}
            <span className="text-[10px] font-mono bg-black/60 px-2 py-1 rounded border border-white/5 text-emerald-400">
              FPS: {fps}
            </span>

            {/* Realtime dynamic Day/Night selector */}
            <div className="flex items-center gap-2.5 bg-[#17171A] px-3.5 py-1.5 rounded-lg border border-[#232329]">
              {timeOfDay > 6 && timeOfDay < 18 ? (
                <Sun className="w-4 h-4 text-amber-500 animate-pulse" />
              ) : (
                <Moon className="w-4 h-4 text-indigo-400" />
              )}
              <span className="text-xs font-mono text-gray-300 font-bold">
                {Math.floor(timeOfDay).toString().padStart(2, '0')}:
                {Math.floor((timeOfDay % 1) * 60).toString().padStart(2, '0')}
              </span>
              <input
                type="range"
                min="0"
                max="24"
                step="0.1"
                value={timeOfDay}
                onChange={(e) => setTimeOfDay(parseFloat(e.target.value))}
                className="w-20 h-1 bg-[#232329] rounded-lg accent-amber-500 cursor-pointer"
              />
            </div>

            {/* Pause and Settings Quick Triggers */}
            <button 
              onClick={() => setIsPaused(true)}
              className="p-1.5 bg-[#1c1c22] rounded border border-[#232329] hover:bg-[#25252d] text-gray-300 cursor-pointer text-xs"
              title="Pause Game"
            >
              ⏸
            </button>
            <button 
              onClick={() => setShowSettings(true)}
              className="p-1.5 bg-[#1c1c22] rounded border border-[#232329] hover:bg-[#25252d] text-gray-300 cursor-pointer text-xs"
              title="Settings"
            >
              ⚙
            </button>
          </div>
        </div>

        {/* The viewport stage container */}
        <div 
          className="flex-1 relative bg-[#070709] min-h-[520px] select-none overflow-hidden"
          onTouchStart={(e) => {
            if (e.touches.length > 0) {
              touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
            }
          }}
          onTouchMove={(e) => {
            if (!touchStartRef.current || e.touches.length === 0) return;
            const dx = e.touches[0].clientX - touchStartRef.current.x;
            const dy = e.touches[0].clientY - touchStartRef.current.y;
            engineRef.current?.rotateCameraMobile(-dx * 0.005 * sensitivity, -dy * 0.005 * sensitivity);
            touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
          }}
          onTouchEnd={() => {
            touchStartRef.current = null;
          }}
        >
          {isLoading ? (
            <div className="absolute inset-0 bg-[#08080a] flex flex-col items-center justify-center gap-4 z-40">
              <div className="w-16 h-16 rounded-full border-2 border-amber-500/20 border-t-amber-500 animate-spin" />
              <p className="text-xs text-amber-500 font-mono tracking-widest uppercase">{language === 'ar' ? 'جاري تهيئة خادم تعز ثلاثي الأبعاد...' : 'Initializing 3D World Partition...'}</p>
              <p className="text-[10px] text-gray-500 text-center max-w-sm">
                {language === 'ar' ? 'تجهيز المباني التراثية، بيئة سيارات الشاص الصبري، ومزامنة الصوت التفاعلي...' : 'Compiling Yemen Architecture, Shas physics, and Souq sound layers.'}
              </p>
            </div>
          ) : (
            <canvas ref={canvasRef} className="block w-full h-full cursor-grab active:cursor-grabbing" />
          )}

          {/* v1.0 Gameplay UI Layer */}
          {!isLoading && (
            <>
              <GameUI 
                stats={stats}
                interaction={interaction}
                language={language}
                landmarks={landmarks}
                playerPos={{ x: playerCoords.x, z: playerCoords.z, rotation: playerCoords.rot }}
                weather={currentWeather}
                wantedLevel={wantedLevel}
              />

              {/* Story Systems (v3.0) */}
              <CutsceneOverlay 
                active={cutscene.active}
                text={cutscene.text}
                textAr={cutscene.textAr}
                language={language}
              />
              
              <AnimatePresence>
                {showJournal && (
                  <Journal 
                    progress={storyProgress}
                    language={language}
                    onClose={() => setShowJournal(false)}
                  />
                )}
              </AnimatePresence>

              <button 
                onClick={() => setShowJournal(true)}
                className="fixed top-24 right-6 z-40 bg-white/10 hover:bg-white/20 backdrop-blur-md p-3 rounded-full border border-white/20 text-white transition-all shadow-xl"
                title={language === 'ar' ? 'سجل المهام' : 'Journal'}
              >
                <Book size={20} className="text-yellow-500" />
              </button>

              {/* Mobile Virtual Joystick & Touch buttons */}
              {controlType === 'touch' && (
                <div className="absolute inset-x-0 bottom-4 px-6 flex justify-between items-end pointer-events-none z-[60] select-none">
                  
                  {/* Left Side: Virtual Joystick */}
                  <div className="pointer-events-auto">
                    <div 
                      ref={joystickContainerRef}
                      className="w-32 h-32 rounded-full bg-black/40 border border-white/10 relative flex items-center justify-center touch-none select-none backdrop-blur-md"
                      onTouchStart={handleJoystickTouchStart}
                      onTouchMove={handleJoystickTouchMove}
                      onTouchEnd={handleJoystickTouchEnd}
                    >
                      <div 
                        className="w-12 h-12 rounded-full bg-white/20 border border-white/30 absolute pointer-events-none"
                        style={{ transform: `translate(${joystickPos.x}px, ${joystickPos.y}px)` }}
                      />
                    </div>
                  </div>

                  {/* Right Side Action Buttons */}
                  <div className="flex flex-col gap-3 pointer-events-auto items-end">
                    {!playerCoords.isDriving ? (
                      <div className="flex gap-3">
                        <button
                          onTouchStart={() => engineRef.current?.handleMobileButton(' ', true)}
                          onTouchEnd={() => engineRef.current?.handleMobileButton(' ', false)}
                          className="w-14 h-14 rounded-full bg-white/10 border border-white/20 text-white text-[10px] font-bold"
                        >
                          JUMP
                        </button>
                        <button
                          onTouchStart={() => engineRef.current?.handleMobileButton('e', true)}
                          onTouchEnd={() => engineRef.current?.handleMobileButton('e', false)}
                          className="w-16 h-16 rounded-full bg-amber-500 text-black font-bold text-sm shadow-lg shadow-amber-500/20"
                        >
                          {interaction ? 'ACTION' : 'ENTER'}
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-3 items-end">
                        <button
                          onTouchStart={() => engineRef.current?.handleMobileButton('s', true)}
                          onTouchEnd={() => engineRef.current?.handleMobileButton('s', false)}
                          className="w-14 h-20 rounded-xl bg-red-500/20 border border-red-500/40 text-red-400 font-bold"
                        >
                          BRAKE
                        </button>
                        <button
                          onTouchStart={() => engineRef.current?.handleMobileButton('w', true)}
                          onTouchEnd={() => engineRef.current?.handleMobileButton('w', false)}
                          className="w-16 h-24 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 font-bold"
                        >
                          GAS
                        </button>
                        <button
                          onTouchStart={() => engineRef.current?.handleMobileButton('e', true)}
                          onTouchEnd={() => engineRef.current?.handleMobileButton('e', false)}
                          className="w-14 h-14 rounded-xl bg-white/10 border border-white/20 text-white font-bold"
                        >
                          EXIT
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Speedometer for driving mode */}
              {playerCoords.isDriving && (
                <div className="absolute bottom-6 right-6 bg-black/60 backdrop-blur-md px-6 py-3 rounded-2xl border border-white/10 z-[60] flex flex-col items-center">
                    <span className="text-white text-3xl font-black font-mono tracking-tighter">
                        {Math.round(playerCoords.speed)}
                    </span>
                    <span className="text-[10px] text-white/40 uppercase font-bold">KM/H</span>
                </div>
              )}
            </>
          )}
        </div>

        {/* Dynamic Arabesque Dialogue & Conversation Box */}
        {activeDialogue && (
          <div className="bg-[#0E0E10] border-t border-[#232329] p-5 flex gap-4 items-start relative z-10 animate-fade-in">
            <div className="w-11 h-11 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 text-sm font-bold font-mono shadow-md">
              {dialogueSpeaker.slice(0, 2)}
            </div>
            <div className="flex-1 space-y-1 text-right">
              <span className="text-[10px] text-amber-500 font-mono tracking-wider font-bold uppercase block">
                {dialogueSpeaker}
              </span>
              <p className="text-xs text-gray-200 leading-relaxed font-semibold">
                {activeDialogue[dialogueIndex]}
              </p>
              
              {/* Dialogue Navigation keys */}
              <div className="flex items-center gap-2 mt-2 pt-1 justify-end">
                {dialogueIndex < activeDialogue.length - 1 ? (
                  <button
                    onClick={() => setDialogueIndex(prev => prev + 1)}
                    className="px-4 py-1.5 bg-amber-500 text-black text-xs font-bold rounded-lg hover:bg-amber-400 cursor-pointer"
                  >
                    التالي | Next
                  </button>
                ) : (
                  <button
                    onClick={() => setActiveDialogue(null)}
                    className="px-4 py-1.5 bg-[#232329] text-gray-300 text-xs font-bold rounded-lg hover:bg-[#2f2f37] cursor-pointer"
                  >
                    إنهاء | Close
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Side Game Control Panel */}
      <div className="bg-[#121214] border border-[#232329] rounded-xl p-5 flex flex-col gap-6 shadow-2xl h-full">
        
        {/* Language Selection Quick Switcher */}
        <div className="pb-4 border-b border-[#232329] flex justify-between items-center">
          <span className="text-xs font-bold text-gray-300">🗣️ {language === 'ar' ? 'اللغة الحالية' : 'Current Language'}</span>
          <button
            onClick={() => setLanguage(lang => lang === 'ar' ? 'en' : 'ar')}
            className="px-3 py-1 text-[10px] bg-amber-500 text-black font-extrabold rounded-lg hover:bg-amber-400 cursor-pointer"
          >
            {language === 'ar' ? 'English' : 'العربية'}
          </button>
        </div>

        {/* Yemeni Customizer Shop */}
        <div className="space-y-3 pb-4 border-b border-[#232329]">
          <h3 className="text-xs font-bold text-gray-200 flex items-center gap-2">
            <Shirt className="w-4 h-4 text-amber-500" />
            {language === 'ar' ? 'خياط تعز التراثي' : 'Yemeni Apparel Customizer'}
          </h3>
          <p className="text-[11px] text-gray-400">
            {language === 'ar' ? 'اختر الألوان التقليدية للثوب والمشدة اليمنية:' : 'Select traditional colors for Thobe & Shmagh scarf:'}
          </p>
          
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => changeOutfit(0xffffff, 0x990000)}
              className={`p-2.5 rounded-lg border text-left text-xs font-semibold cursor-pointer transition-all ${
                activeOutfit.thobe === 0xffffff ? 'bg-amber-500/15 border-amber-500 text-amber-400' : 'bg-[#1c1c22] border-[#2A2A32] text-gray-400'
              }`}
            >
              <div className="w-4 h-4 rounded-full bg-white border border-gray-600 mb-1" />
              {language === 'ar' ? 'الثوب الأبيض' : 'White Thobe'}
            </button>
            <button
              onClick={() => changeOutfit(0xebe6dd, 0x005511)}
              className={`p-2.5 rounded-lg border text-left text-xs font-semibold cursor-pointer transition-all ${
                activeOutfit.thobe === 0xebe6dd ? 'bg-amber-500/15 border-amber-500 text-amber-400' : 'bg-[#1c1c22] border-[#2A2A32] text-gray-400'
              }`}
            >
              <div className="w-4 h-4 rounded-full bg-[#ebe6dd] mb-1" />
              {language === 'ar' ? 'العاجي والأخضر' : 'Ivory & Green'}
            </button>
          </div>
        </div>

        {/* Live Active Mission Dashboard */}
        <div className="space-y-3 pb-4 border-b border-[#232329]">
          <h3 className="text-xs font-bold text-gray-200 flex items-center gap-2">
            <Award className="w-4 h-4 text-emerald-500" />
            {language === 'ar' ? 'فرزات تعز للعمل والمهن' : 'Taiz Career & Jobs Hub'}
          </h3>
          <p className="text-[11px] text-gray-400">
            {language === 'ar' ? 'اقبل المهام لكسب الريالات وزيادة رصيد سمعتك الأثرية:' : 'Accept jobs to earn Yemeni Rials and build legacy reputation:'}
          </p>
          
          <div className="flex flex-col gap-2 max-h-[340px] overflow-y-auto pr-1 custom-scrollbar text-right">
            <button
              onClick={() => startMission('taxi')}
              disabled={!!activeMission}
              className="p-2.5 bg-[#1c1c22] border border-[#2a2a32] rounded-lg text-right text-xs font-medium hover:border-amber-500/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <span className="text-[9px] text-amber-500 font-mono font-bold block uppercase">TAXI CHALLENGE</span>
              <span className="font-bold text-gray-100">{language === 'ar' ? 'تحدي عقبة جبل صبر' : 'Saber Mountain Challenge'}</span>
              <p className="text-[10px] text-gray-400 mt-0.5">
                {language === 'ar' ? 'اصعد المرتفعات الشاهقة بسيارتك الشاص. [المكافأة: 5,000 ريال]' : 'Climb the steep Saber slopes in a Toyota Shas. [Payout: 5k YER]'}
              </p>
            </button>

            <button
              onClick={() => startMission('delivery')}
              disabled={!!activeMission}
              className="p-2.5 bg-[#1c1c22] border border-[#2a2a32] rounded-lg text-right text-xs font-medium hover:border-amber-500/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <span className="text-[9px] text-emerald-500 font-mono font-bold block uppercase">SOUQ DELIVERY</span>
              <span className="font-bold text-gray-100">{language === 'ar' ? 'توصيل بهارات المسجد الأثري' : 'Spice Delivery to Mosque'}</span>
              <p className="text-[10px] text-gray-400 mt-0.5">
                {language === 'ar' ? 'اوصل خلطة البهارات من العم صالح إلى باب المسجد. [المكافأة: 3,500 ريال]' : 'Deliver historic spice mixes from Uncle Saleh to Mosque. [Payout: 3.5k YER]'}
              </p>
            </button>

            <button
              onClick={() => startMission('hiace_run')}
              disabled={!!activeMission}
              className="p-2.5 bg-[#1c1c22] border border-[#2a2a32] rounded-lg text-right text-xs font-medium hover:border-amber-500/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <span className="text-[9px] text-sky-400 font-mono font-bold block uppercase">COMMUTER BUS</span>
              <span className="font-bold text-gray-100">{language === 'ar' ? 'باص فرزة الهائل الشهير' : 'HiAce Commuter Service'}</span>
              <p className="text-[10px] text-gray-400 mt-0.5">
                {language === 'ar' ? 'قد باص الهايس التاريخي من الميدان إلى محطة البترول. [المكافأة: 8,000 ريال]' : 'Drive HiAce microbus from Souq to fuel station. [Payout: 8k YER]'}
              </p>
            </button>

            <button
              onClick={() => startMission('honey_run')}
              disabled={!!activeMission}
              className="p-2.5 bg-[#1c1c22] border border-[#2a2a32] rounded-lg text-right text-xs font-medium hover:border-amber-500/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <span className="text-[9px] text-purple-400 font-mono font-bold block uppercase">HONEY COURIER</span>
              <span className="font-bold text-gray-100">{language === 'ar' ? 'عسل السدر الصبري الفاخر' : 'Royal Sidr Honey Courier'}</span>
              <p className="text-[10px] text-gray-400 mt-0.5">
                {language === 'ar' ? 'انقل جِرار عسل السدر من يحيى إلى مختار. [المكافأة: 12,000 ريال]' : 'Transport Sidr honey pots from Yahya to Mukhtar. [Payout: 12k YER]'}
              </p>
            </button>

            <button
              onClick={() => startMission('bab_musa_shuttle')}
              disabled={!!activeMission}
              className="p-2.5 bg-[#1c1c22] border border-[#2a2a32] rounded-lg text-right text-xs font-medium hover:border-amber-500/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <span className="text-[9px] text-amber-500 font-mono font-bold block uppercase">CITY SHUTTLE</span>
              <span className="font-bold text-gray-100">{language === 'ar' ? 'مكوك فرزة باب موسى الأثرية' : 'Bab Musa Ancient Gate Shuttle'}</span>
              <p className="text-[10px] text-gray-400 mt-0.5">
                {language === 'ar' ? 'انقل الزوار من الميدان المركزي إلى باب موسى الحجري. [المكافأة: 4,000 ريال]' : 'Drive tourists from central Al-Mudhaffar to Bab Musa ancient gate. [Payout: 4k YER]'}
              </p>
            </button>
          </div>

          {activeMission && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 mt-3 animate-pulse text-right">
              <span className="text-[9px] text-amber-400 font-bold block uppercase tracking-wider">
                {language === 'ar' ? 'الهدف الفعلي للمهمة الحالية' : 'Active Mission Target'}
              </span>
              <span className="text-xs text-white font-bold block">{activeMission.titleAr}</span>
              <p className="text-[10px] text-gray-300 mt-1">{activeMission.desc}</p>
              <div className="mt-2 text-[10px] font-mono text-amber-500 font-semibold">
                {language === 'ar' ? '← ابحث عن العمود الضوئي الذهبي الشاهق في المدينة!' : '→ LOOK FOR THE GLOWING 3D BEAM MARKER IN THE CITY!'}
              </div>
            </div>
          )}
        </div>

        {/* Exploration / Visited locations registry */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold text-gray-200 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-purple-400" />
            {language === 'ar' ? 'المعالم والمحلات المستكشفة' : 'Explored Places & Stalls'} ({visitedPlaces.length}/6)
          </h3>
          <div className="flex flex-wrap gap-1.5 pt-1">
            {['fuel_station', 'npc_saleh', 'npc_mukhtar', 'npc_ghalib', 'npc_bassam', 'npc_fares'].map(place => {
              const visited = visitedPlaces.some(p => p.toLowerCase().includes(place));
              const nameMap: { [key: string]: string } = {
                fuel_station: language === 'ar' ? 'محطة الوقود' : 'Fuel Station',
                npc_saleh: language === 'ar' ? 'بهارات صالح' : 'Spice Stall',
                npc_mukhtar: language === 'ar' ? 'فرزة التاكسي' : 'Taxi Park',
                npc_ghalib: language === 'ar' ? 'مسجد الأشرفية' : 'Al-Ashrafiya',
                npc_bassam: language === 'ar' ? 'المحطة الفرعية' : 'Service Depot',
                npc_fares: language === 'ar' ? 'منحدرات صبر' : 'Saber Hillside'
              };
              return (
                <span 
                  key={place}
                  className={`text-[9px] px-2 py-1 rounded font-bold font-mono border transition-all ${
                    visited 
                      ? 'bg-purple-950/35 border-purple-500 text-purple-300' 
                      : 'bg-[#17171a] border-[#2A2A32] text-gray-500'
                  }`}
                >
                  {visited ? '✓ ' : '○ '}{nameMap[place]}
                </span>
              );
            })}
          </div>
        </div>

        {/* Beautiful instructions box */}
        <div className="bg-[#1c1c22]/50 border border-[#2a2a32] rounded-xl p-4 mt-auto">
          <span className="text-[10px] font-mono text-amber-500 font-bold block mb-1">
            {language === 'ar' ? 'تعليمات التحكم باللعب' : 'KEYBOARD & TOUCH CONTROLS'}
          </span>
          <p className="text-[10px] text-gray-400 leading-relaxed text-right">
            {language === 'ar' ? (
              <>
                - **أزرار الأسهم أو WASD**: تحريك الشخصية وتوجيه السيارات.<br />
                - **زر الـ Shift**: المشي السريع والركض الصبري الفاخر.<br />
                - **زر الـ Space**: القفز فوق الأرصفة وتفحيط السيارة.<br />
                - **زر الـ E**: التفاعل مع المواطنين وركوب/النزول من السيارات.<br />
                - **سحب الشاشة بلمس إصبعك**: تدوير الكاميرا بشكل سلس بزاوية 360 درجة.<br />
                - *نصيحة*: اركب أي سيارة تويوتا (شاص، هيلوكس، هايس) لبدء التحديات الأثرية وسماع صوت محركها!
              </>
            ) : (
              <>
                - **W/A/S/D / Arrows**: Move Thobe avatar / Steer vehicles.<br />
                - **Shift**: Walk faster / Sprint.<br />
                - **Space**: Jump over sidewalks / Handbrake drift.<br />
                - **E**: Talk to citizens / Enter & Exit active vehicle.<br />
                - **Drag Mouse / Touch Screen**: Smooth orbit camera.<br />
                - *Tip*: Enter any Toyota (Shas, Hilux, HiAce) to drive and hear the engine synthesis!
              </>
            )}
          </p>
        </div>
      </div>

      {/* PAUSE MODAL OVERLAY */}
      {isPaused && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-[#0e0e11] border-2 border-amber-500/30 rounded-2xl p-8 max-w-sm w-full text-center space-y-6 shadow-2xl">
            <h2 className="text-2xl font-extrabold text-amber-500 tracking-wider">
              {language === 'ar' ? 'اللعبة متوقفة مؤقتاً' : 'GAME PAUSED'}
            </h2>
            <p className="text-xs text-gray-400">
              {language === 'ar' ? 'تم تعليق محاكاة مدينة تعز اليمنية حالياً' : 'The Taiz Sandbox simulation is currently suspended'}
            </p>

            <div className="flex flex-col gap-3">
              <button
                onClick={() => setIsPaused(false)}
                className="w-full py-3 bg-amber-500 text-black font-extrabold rounded-xl hover:bg-amber-400 active:scale-95 transition-all cursor-pointer"
              >
                {language === 'ar' ? 'متابعة اللعب' : 'Resume Simulation'}
              </button>

              <button
                onClick={handleManualSave}
                className="w-full py-3 bg-slate-800 text-white font-bold rounded-xl hover:bg-slate-700 active:scale-95 transition-all cursor-pointer"
              >
                {language === 'ar' ? '💾 حفظ تقدم اللعبة' : '💾 Manual Save Game'}
              </button>

              <button
                onClick={() => {
                  setIsPaused(false);
                  setShowSettings(true);
                }}
                className="w-full py-3 bg-slate-800/50 border border-white/5 text-gray-300 font-bold rounded-xl hover:bg-slate-800 active:scale-95 transition-all cursor-pointer"
              >
                {language === 'ar' ? '⚙️ الإعدادات العامة' : '⚙️ Game Settings'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SETTINGS MODAL OVERLAY */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-[#0e0e11] border-2 border-white/10 rounded-2xl p-8 max-w-md w-full space-y-6 shadow-2xl">
            <div className="flex justify-between items-center pb-3 border-b border-white/5">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                ⚙️ {language === 'ar' ? 'إعدادات اللعبة' : 'Game Settings'}
              </h2>
              <button 
                onClick={() => setShowSettings(false)}
                className="text-gray-400 hover:text-white font-bold text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              {/* Controls Toggle */}
              <div className="flex justify-between items-center py-2 border-b border-white/5">
                <span className="text-xs text-gray-400">{language === 'ar' ? 'نمط التحكم' : 'Control Layout'}</span>
                <div className="flex gap-1.5 bg-[#17171a] p-1 rounded-lg border border-white/5">
                  <button
                    onClick={() => setControlType('keyboard')}
                    className={`px-3 py-1 text-[10px] rounded font-bold cursor-pointer ${
                      controlType === 'keyboard' ? 'bg-amber-500 text-black' : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    {language === 'ar' ? 'لوحة المفاتيح' : 'Keyboard'}
                  </button>
                  <button
                    onClick={() => setControlType('touch')}
                    className={`px-3 py-1 text-[10px] rounded font-bold cursor-pointer ${
                      controlType === 'touch' ? 'bg-amber-500 text-black' : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    {language === 'ar' ? 'شاشة اللمس' : 'Touch (Mobile)'}
                  </button>
                </div>
              </div>

              {/* Graphics Selector */}
              <div className="flex justify-between items-center py-2 border-b border-white/5">
                <span className="text-xs text-gray-400">{language === 'ar' ? 'جودة الرسومات' : 'Graphics Quality'}</span>
                <div className="flex gap-1.5 bg-[#17171a] p-1 rounded-lg border border-white/5">
                  {(['low', 'medium', 'high'] as const).map(q => (
                    <button
                      key={q}
                      onClick={() => setGraphicsQuality(q)}
                      className={`px-3 py-1 text-[10px] rounded font-bold capitalize cursor-pointer ${
                        graphicsQuality === q ? 'bg-amber-500 text-black' : 'text-gray-400'
                      }`}
                    >
                      {q === 'low' ? (language === 'ar' ? 'منخفض' : 'Low') : q === 'medium' ? (language === 'ar' ? 'متوسط' : 'Medium') : (language === 'ar' ? 'مرتفع' : 'High')}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sound Volume Slider */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs text-gray-400">
                  <span>🔊 {language === 'ar' ? 'مستوى صوت المؤثرات' : 'Sound Effects Volume'}</span>
                  <span>{(soundVolume * 100).toFixed(0)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={soundVolume}
                  onChange={(e) => setSoundVolume(parseFloat(e.target.value))}
                  className="w-full accent-amber-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
                />
              </div>

              {/* Music Volume Slider */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs text-gray-400">
                  <span>🎵 {language === 'ar' ? 'مستوى صوت الموسيقى والخلفية' : 'Music Volume'}</span>
                  <span>{(musicVolume * 100).toFixed(0)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={musicVolume}
                  onChange={(e) => setMusicVolume(parseFloat(e.target.value))}
                  className="w-full accent-amber-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
                />
              </div>

              {/* Camera Sensitivity Slider */}
              <div className="space-y-1.5 pb-2">
                <div className="flex justify-between text-xs text-gray-400">
                  <span>🔄 {language === 'ar' ? 'حساسية دوران الكاميرا' : 'Camera Orbit Sensitivity'}</span>
                  <span>{sensitivity.toFixed(1)}x</span>
                </div>
                <input
                  type="range"
                  min="0.4"
                  max="2.5"
                  step="0.1"
                  value={sensitivity}
                  onChange={(e) => setSensitivity(parseFloat(e.target.value))}
                  className="w-full accent-amber-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
                />
              </div>

              {/* Reset Game Button */}
              <div className="pt-4 border-t border-white/5">
                <button
                  onClick={handleResetProgress}
                  className="w-full py-2.5 bg-rose-950/20 hover:bg-rose-950/40 border border-rose-500/20 text-rose-400 font-bold text-xs rounded-xl transition-all cursor-pointer"
                >
                  ⚠️ {language === 'ar' ? 'إعادة ضبط التقدم وحذف البيانات' : 'Reset All Game Progression'}
                </button>
              </div>
            </div>

            <button
              onClick={() => setShowSettings(false)}
              className="w-full py-3 bg-amber-500 text-black font-extrabold rounded-xl hover:bg-amber-400 cursor-pointer text-xs uppercase tracking-wider"
            >
              {language === 'ar' ? 'حفظ وإغلاق الإعدادات' : 'Save and Close Settings'}
            </button>
          </div>
        </div>
      )}

      {/* CELEBRATION BADGE OVERLAY FOR COMPLETED MISSIONS */}
      {activeMission && activeMission.completed && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] animate-fade-in pointer-events-none">
          <div className="bg-gradient-to-b from-[#1C1C24] to-[#0E0E12] border-2 border-yellow-500 rounded-2xl p-8 max-w-md w-full text-center space-y-4 shadow-[0_0_50px_rgba(234,179,8,0.35)] animate-bounce relative">
            <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-yellow-600 to-amber-400 flex items-center justify-center mx-auto text-black font-extrabold text-3xl shadow-lg border-2 border-white/20">
              🏆
            </div>
            
            <div className="space-y-1">
              <span className="text-yellow-500 text-xs font-mono font-bold tracking-widest uppercase">
                {language === 'ar' ? 'المهمة اكتملت!' : 'MISSION COMPLETED!'}
              </span>
              <h3 className="text-xl font-extrabold text-white">
                {language === 'ar' ? activeMission.titleAr : activeMission.title}
              </h3>
            </div>

            <div className="bg-black/50 border border-white/5 rounded-xl p-4 flex justify-around items-center">
              <div>
                <span className="text-[9px] text-gray-500 block">{language === 'ar' ? 'ريالات يمنية كاش' : 'YER CASH'}</span>
                <span className="text-emerald-400 font-mono font-black text-lg">
                  +﷼ {activeMission.reward.toLocaleString()}
                </span>
              </div>
              <div className="w-px h-8 bg-white/10" />
              <div>
                <span className="text-[9px] text-gray-500 block">{language === 'ar' ? 'نقاط السمعة' : 'REPUTATION'}</span>
                <span className="text-purple-400 font-mono font-black text-lg">
                  +25 XP
                </span>
              </div>
            </div>

            <p className="text-[10px] text-gray-400 animate-pulse">
              {language === 'ar' ? 'تم الحفظ تلقائياً بنجاح.' : 'Saved and written to legacy database.'}
            </p>
          </div>
        </div>
      )}

      {/* FLOATING SYSTEM TOAST CONFIRMATION NOTIFIER */}
      {showSaveToast && (
        <div className="fixed bottom-6 right-6 bg-[#0E0E12]/95 backdrop-blur border-2 border-amber-500/30 rounded-xl px-5 py-3.5 flex items-center gap-2.5 shadow-2xl z-[150] animate-slide-in pointer-events-none">
          <div className="w-5 h-5 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500 text-xs font-bold font-mono">
            💾
          </div>
          <span className="text-xs text-gray-100 font-bold">{toastMessage}</span>
        </div>
      )}
    </div>
  );
};
