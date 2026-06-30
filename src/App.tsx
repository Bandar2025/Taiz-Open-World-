import { useState, useEffect } from 'react';
import { CitySandbox } from './components/CitySandbox';
import { AudioSynthesizer } from './components/AudioSynthesizer';
import { Clock, MapPin, Play, Volume2, Sparkles, Trophy } from 'lucide-react';

export default function App() {
  const [appState, setAppState] = useState<'menu' | 'loading' | 'game'>('menu');
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingLabel, setLoadingLabel] = useState('Initializing...');
  const [assetErrors, setAssetErrors] = useState<string[]>([]);
  const [timeOfDay, setTimeOfDay] = useState<number>(8.0);
  const [isMuted, setIsMuted] = useState<boolean>(true); // Start muted to satisfy browser policies
  const [activeDistrict, setActiveDistrict] = useState<string>('SouqAlQahira');
  const [currentTimeStr, setCurrentTimeStr] = useState<string>('');

  // Auto time-of-day progression (simulates real time-lapsed day/night light cycle)
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeOfDay(prev => {
        const next = prev + 0.04; // progression speed
        return next >= 24 ? 0 : next;
      });
    }, 400);
    return () => clearInterval(interval);
  }, []);

  // Sync real-world clock
  useEffect(() => {
    const updateTime = () => {
      const d = new Date();
      setCurrentTimeStr(d.toLocaleTimeString());
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const getDistrictNameAr = (dist: string) => {
    switch (dist) {
      case 'SaberMountain': return 'جبل صبر الشامخ';
      case 'AlGanadCorridor': return 'ممر الجند التاريخي';
      default: return 'حي الأشرفية وسوق القاهرة';
    }
  };

  return (
    <div className="min-h-screen bg-[#060608] text-gray-100 flex flex-col font-sans antialiased selection:bg-amber-500 selection:text-black relative">
      
      {/* Cinematic Main Menu Overlay */}
      {appState === 'menu' && (
        <div className="absolute inset-0 z-[100] bg-black/40 backdrop-blur-sm flex flex-col items-center justify-center p-6 animate-fade-in">
          <div className="max-w-md w-full space-y-12 text-center">
            <div className="space-y-4">
              <div className="w-24 h-24 mx-auto rounded-3xl bg-gradient-to-tr from-amber-600 to-yellow-400 flex items-center justify-center text-black font-extrabold text-4xl shadow-2xl shadow-amber-500/20 transform hover:scale-105 transition-transform duration-500">
                L
              </div>
              <h1 className="text-4xl font-black tracking-tighter text-white uppercase italic drop-shadow-2xl">LUMEN AI CINEMATIC ENGINE</h1>
              <p className="text-amber-500 font-mono text-xs tracking-[0.3em] font-bold">TAIZ: OPEN WORLD SIMULATOR</p>
            </div>

            <nav className="flex flex-col gap-4">
              <button 
                onClick={() => setAppState('loading')}
                className="group relative px-8 py-4 bg-amber-500 text-black font-black uppercase tracking-widest rounded-xl hover:bg-white transition-all duration-300 shadow-xl hover:shadow-amber-500/20 overflow-hidden"
              >
                <span className="relative z-10">Start New Game</span>
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000" />
              </button>
              
              <button className="px-8 py-4 bg-white/5 border border-white/10 text-white font-bold uppercase tracking-widest rounded-xl hover:bg-white/10 transition-all">
                Continue Game
              </button>
              
              <div className="grid grid-cols-2 gap-4">
                <button className="px-6 py-3 bg-white/5 border border-white/10 text-white text-xs font-bold uppercase tracking-widest rounded-xl hover:bg-white/10 transition-all">
                  Settings
                </button>
                <button className="px-6 py-3 bg-white/5 border border-white/10 text-white text-xs font-bold uppercase tracking-widest rounded-xl hover:bg-white/10 transition-all">
                  Language (AR)
                </button>
              </div>

              <button className="px-8 py-4 text-gray-500 font-bold uppercase tracking-widest rounded-xl hover:text-rose-500 transition-all mt-4 text-xs">
                Exit Engine
              </button>
            </nav>

            <div className="pt-12 text-[10px] text-gray-500 font-mono space-y-1">
              <p>© 2026 LUMEN AI CINEMATIC ENGINE</p>
              <p className="text-amber-500/50 uppercase tracking-widest">Build 1.0.4.STABILITY</p>
            </div>
          </div>
        </div>
      )}

      {/* Real-time Loading Screen */}
      {appState === 'loading' && (
        <div className="absolute inset-0 z-[110] bg-[#08080a] flex flex-col items-center justify-center p-12 animate-fade-in">
          <div className="max-w-lg w-full space-y-8">
            <div className="space-y-2">
              <div className="flex justify-between items-end">
                <h3 className="text-amber-500 font-mono text-xs font-bold tracking-widest uppercase">Syncing Taiz World State...</h3>
                <span className="text-white font-mono text-xl font-black">{loadingProgress}%</span>
              </div>
              <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden border border-white/5">
                <div 
                  className="h-full bg-amber-500 transition-all duration-300 ease-out shadow-[0_0_15px_rgba(245,158,11,0.5)]" 
                  style={{ width: `${loadingProgress}%` }} 
                />
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center gap-4 text-gray-400">
                <div className="w-4 h-4 rounded-full border border-amber-500/30 border-t-amber-500 animate-spin" />
                <p className="text-[10px] font-mono uppercase tracking-wider text-amber-500/80">{loadingLabel}</p>
              </div>

              {assetErrors.length > 0 && (
                <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl space-y-2">
                  <p className="text-[10px] text-rose-500 font-bold uppercase tracking-widest flex items-center gap-2">
                    <span className="w-2 h-2 bg-rose-500 rounded-full animate-pulse" />
                    Asset Validation Warnings
                  </p>
                  <div className="max-h-24 overflow-y-auto space-y-1 pr-2 custom-scrollbar">
                    {assetErrors.map((err, i) => (
                      <p key={i} className="text-[9px] text-rose-400/70 font-mono italic">→ {err}</p>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="p-6 bg-white/5 rounded-2xl border border-white/5 space-y-3">
                <p className="text-[10px] text-amber-500 font-bold uppercase tracking-widest">Loading Tip</p>
                <p className="text-xs text-gray-400 leading-relaxed italic">
                  "Taiz is famous for its architectural stone heritage. The Al-Ashrafiya Mosque minarets have stood for centuries as a testament to Yemeni craftsmanship."
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Top Gaming HUD Header */}
      <header className="border-b border-[#18181f] bg-[#09090b]/95 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-amber-600 to-yellow-400 flex items-center justify-center text-black font-extrabold text-lg shadow-lg shadow-amber-500/10">
              L
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-extrabold tracking-tight text-white uppercase font-sans">Lumen AI Cinematic Engine</h1>
                <span className="text-[9px] bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-bold px-2 py-0.5 rounded tracking-widest uppercase font-mono animate-pulse">
                  PLAYABLE STAGE 0.1
                </span>
              </div>
              <p className="text-xs text-gray-400">Taiz, Yemen: 3D Open World Simulator (محاكاة مدينة تعز اليمنية ثلاثية الأبعاد)</p>
            </div>
          </div>

          {/* Real-time system diagnostics */}
          <div className="flex flex-wrap items-center gap-3 md:gap-5 text-xs text-gray-400 font-mono">
            <div className="flex items-center gap-2 bg-[#0f0f12] px-3.5 py-1.5 rounded-lg border border-[#1b1b22]">
              <Clock className="w-3.5 h-3.5 text-amber-500" />
              <span className="text-gray-500">CLOCK:</span>
              <span className="text-gray-200 font-bold">{currentTimeStr || '12:00:00'}</span>
            </div>
            <div className="flex items-center gap-2 bg-[#0f0f12] px-3.5 py-1.5 rounded-lg border border-[#1b1b22]">
              <MapPin className="w-3.5 h-3.5 text-emerald-500" />
              <span className="text-gray-500">DISTRICT:</span>
              <span className="text-emerald-400 font-bold">{getDistrictNameAr(activeDistrict)}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-6 space-y-6">
        
        {/* Cinematic Announcement Banner */}
        <section className="bg-gradient-to-r from-amber-950/20 via-slate-900/40 to-indigo-950/10 border border-amber-500/10 p-6 rounded-2xl relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-xl">
          <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
          <div className="space-y-2 max-w-2xl relative z-10">
            <div className="flex items-center gap-1.5 text-[10px] text-amber-500 font-mono tracking-wider font-bold uppercase">
              <Sparkles className="w-3.5 h-3.5" />
              Live Playable WebGL fallback active
            </div>
            <h2 className="text-lg md:text-xl font-extrabold text-white tracking-tight">
              Taiz City Open World Simulation - الإصدار التجريبي الأول
            </h2>
            <p className="text-xs text-gray-400 leading-relaxed">
              Experience the atmosphere of Taiz, Yemen in this responsive, playable 3D sandbox. Walk around the traditional stone houses, visit the majestic Al-Ashrafiya Mosque, talk with citizens, and drive a realistic Toyota Land Cruiser across the district with full vehicle tire physics!
            </p>
          </div>
          
          <div className="flex flex-col gap-2.5 sm:flex-row md:flex-col lg:flex-row flex-shrink-0 z-10">
            <div className="bg-[#0f0f12] border border-[#1b1b22] px-4 py-3 rounded-xl min-w-[140px]">
              <span className="text-[9px] text-gray-500 font-mono block">3D ENGINE</span>
              <span className="text-xs font-bold text-gray-200">Three.js WebGL</span>
              <p className="text-[9px] text-gray-500 mt-0.5">Procedural Yemeni models</p>
            </div>
            <div className="bg-[#0f0f12] border border-[#1b1b22] px-4 py-3 rounded-xl min-w-[140px]">
              <span className="text-[9px] text-gray-500 font-mono block">VEHICLE</span>
              <span className="text-xs font-bold text-gray-200">Toyota Land Cruiser</span>
              <p className="text-[9px] text-gray-500 mt-0.5">Drivable, wheel steering</p>
            </div>
          </div>
        </section>

        {/* Dynamic 3D Game Area */}
        <section className="bg-[#0a0a0d] rounded-2xl overflow-hidden min-h-[580px]">
          <CitySandbox
            timeOfDay={timeOfDay}
            setTimeOfDay={setTimeOfDay}
            isMuted={isMuted}
            setIsMuted={setIsMuted}
            activeDistrict={activeDistrict}
            setActiveDistrict={setActiveDistrict}
            onLoadingProgress={(progress, label) => {
              setLoadingProgress(progress);
              setLoadingLabel(label);
              
              if (label.includes('(')) {
                const error = label.split('(')[1].replace(')', '');
                const fileName = label.split(' (')[0];
                setAssetErrors(prev => [...new Set([...prev, `${fileName}: ${error}`])]);
              }

              if (progress >= 100) {
                // Short delay for cinematic feel
                setTimeout(() => {
                  if (appState === 'loading') {
                    setAppState('game');
                  }
                }, 1000);
              }
            }}
            appState={appState}
          />
        </section>

        {/* Ambient Soundscapes and Manual */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Ambient sound synthesis dashboard */}
          <div className="lg:col-span-2">
            <AudioSynthesizer
              timeOfDay={timeOfDay}
              isMuted={isMuted}
              setIsMuted={setIsMuted}
              activeDistrict={activeDistrict}
            />
          </div>

          {/* Interactive Game Specs card */}
          <div className="bg-[#0f0f12] border border-[#1b1b22] p-5 rounded-xl space-y-3 shadow-xl">
            <h3 className="text-xs font-bold text-gray-200 flex items-center gap-2 pb-2 border-b border-[#1b1b22]">
              <Trophy className="w-4 h-4 text-amber-500" />
              Game Manual & Tips
            </h3>
            <div className="space-y-2.5 text-[11px] text-gray-400 leading-relaxed">
              <p>
                <strong className="text-gray-200">1. Drive Cars:</strong> Walk up to the white Toyota Land Cruiser (parked in front of the green/red fuel station) and press <kbd className="px-1.5 py-0.5 bg-[#1C1C22] border border-white/10 rounded text-[9px] font-mono text-white">E</kbd> to jump inside and start driving!
              </p>
              <p>
                <strong className="text-gray-200">2. Night Cycles:</strong> Move the lighting slider in the header or watch the automatic sunset at <span className="text-amber-500 font-mono">18:30</span>. Streetlights will turn on with glowing volumetric overlays.
              </p>
              <p>
                <strong className="text-gray-200">3. Talking with Citizens:</strong> Approach any walking NPC (e.g., Uncle Saleh at the market or Imam Ghalib near the mosque) and press <kbd className="px-1.5 py-0.5 bg-[#1C1C22] border border-white/10 rounded text-[9px] font-mono text-white">E</kbd> to converse in Arabic and English.
              </p>
            </div>
          </div>

        </section>
        
      </main>

      {/* Elegant minimalist footer */}
      <footer className="mt-auto border-t border-[#18181f] bg-[#070709] py-5 text-center text-xs text-gray-500 font-mono">
        <p>© 2026 Lumen AI Cinematic Engine. Built for Taiz: Open World Yemen RPG.</p>
      </footer>
    </div>
  );
}
