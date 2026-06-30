import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { InteractionPrompt, PlayerStats, Landmark } from '../types';
import { LucideIcon, User, Star, Navigation, Wallet, Utensils, Droplets, Zap, Map as MapIcon } from 'lucide-react';

interface GameUIProps {
  stats: PlayerStats;
  interaction: InteractionPrompt | null;
  language: 'ar' | 'en';
  landmarks: Landmark[];
  playerPos: { x: number; z: number; rotation: number };
  weather?: string;
  wantedLevel?: number;
}

export const GameUI: React.FC<GameUIProps> = ({ stats, interaction, language, landmarks, playerPos, weather, wantedLevel }) => {
  const [showMap, setShowMap] = React.useState(false);

  const formatMoney = (val: number) => {
    return new Intl.NumberFormat(language === 'ar' ? 'ar-YE' : 'en-US').format(val);
  };

  return (
    <div className="fixed inset-0 pointer-events-none z-50 flex flex-col p-6 select-none font-sans">
      {/* Top Bar: Stats */}
      <div className="flex justify-between items-start w-full">
        <div className="flex flex-col gap-3">
          <StatBar 
            icon={Utensils} 
            value={stats.hunger} 
            color="bg-orange-500" 
            label={language === 'ar' ? 'الجوع' : 'Hunger'} 
          />
          <StatBar 
            icon={Droplets} 
            value={stats.thirst} 
            color="bg-blue-500" 
            label={language === 'ar' ? 'العطش' : 'Thirst'} 
          />
          <StatBar 
            icon={Zap} 
            value={stats.energy} 
            color="bg-yellow-400" 
            label={language === 'ar' ? 'الطاقة' : 'Energy'} 
          />

          {/* Weather & Wanted Level (v2.0) */}
          <div className="flex gap-2 mt-4">
            {weather && (
              <div className="bg-white/10 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 flex items-center gap-2">
                <span className="text-[10px] text-white/40 uppercase tracking-widest">{language === 'ar' ? 'الطقس' : 'Weather'}</span>
                <span className="text-xs text-white font-bold capitalize">{weather}</span>
              </div>
            )}
            {(wantedLevel ?? 0) > 0 && (
              <div className="bg-red-500/80 backdrop-blur-md px-3 py-1 rounded-full border border-red-400/50 flex items-center gap-2 animate-pulse">
                 <span className="text-[10px] text-white/90 font-black tracking-widest">WANTED</span>
                 <div className="flex gap-0.5">
                    {[...Array(5)].map((_, i) => (
                        <Star key={i} size={8} fill={i < (wantedLevel ?? 0) ? "white" : "none"} className="text-white" />
                    ))}
                 </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col items-end gap-2">
            <div className="bg-black/60 backdrop-blur-md px-6 py-3 rounded-2xl border border-white/10 flex items-center gap-4 shadow-2xl">
                <div className="text-right">
                    <p className="text-white/50 text-[10px] uppercase tracking-widest">
                        {language === 'ar' ? 'الرصيد الحالي' : 'CURRENT BALANCE'}
                    </p>
                    <p className="text-2xl font-bold text-emerald-400 font-mono">
                        {formatMoney(stats.money)} <span className="text-sm">{language === 'ar' ? 'ر.ي' : 'YER'}</span>
                    </p>
                </div>
                <div className="bg-emerald-500/20 p-2 rounded-xl border border-emerald-500/30">
                    <Star className="text-emerald-400 w-6 h-6" />
                </div>
            </div>

            <div className="bg-black/40 backdrop-blur-sm px-4 py-1.5 rounded-full border border-white/5 flex items-center gap-2">
                <span className="text-[10px] text-white/40 uppercase tracking-tighter">Reputation</span>
                <div className="flex gap-1">
                    {[...Array(5)].map((_, i) => (
                        <Star 
                            key={i} 
                            size={10} 
                            fill={i < Math.ceil((stats.reputation + 100) / 40) ? "#fbbf24" : "none"}
                            className={i < Math.ceil((stats.reputation + 100) / 40) ? "text-amber-400" : "text-white/20"}
                        />
                    ))}
                </div>
            </div>
        </div>
      </div>

      {/* Center: Interaction Prompt */}
      <div className="flex-1 flex items-center justify-center">
        <AnimatePresence>
            {interaction && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                    className="bg-black/80 backdrop-blur-xl px-8 py-4 rounded-3xl border border-white/20 shadow-[0_0_50px_rgba(0,0,0,0.5)] flex items-center gap-6"
                >
                    <div className="w-12 h-12 bg-white text-black rounded-xl flex items-center justify-center font-bold text-xl shadow-lg animate-pulse">
                        E
                    </div>
                    <div>
                        <p className="text-white/60 text-xs uppercase tracking-[0.2em] mb-1">
                            {language === 'ar' ? 'تفاعل' : 'INTERACT'}
                        </p>
                        <p className="text-white text-xl font-medium tracking-tight">
                            {language === 'ar' ? interaction.labelAr : interaction.label}
                        </p>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
      </div>

      {/* Bottom Bar: Map & Tools */}
      <div className="flex justify-between items-end w-full">
        <div className="pointer-events-auto">
            <button 
                onClick={() => setShowMap(!showMap)}
                className="bg-black/60 hover:bg-black/80 backdrop-blur-md p-4 rounded-2xl border border-white/10 transition-all active:scale-95 group"
            >
                <MapIcon className="text-white group-hover:text-blue-400 transition-colors" />
            </button>
        </div>

        <div className="text-right">
            <p className="text-white/20 text-[10px] font-mono mb-1">LUMEN CINEMATIC ENGINE v1.0</p>
            <p className="text-white/40 text-[10px] font-mono">TAIZ OPEN WORLD SIMULATOR</p>
        </div>
      </div>

      {/* Map Modal */}
      <AnimatePresence>
        {showMap && (
            <motion.div
                initial={{ opacity: 0, scale: 1.1 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.1 }}
                className="fixed inset-0 bg-black/90 backdrop-blur-2xl p-12 pointer-events-auto flex flex-col"
            >
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h2 className="text-4xl font-bold text-white tracking-tighter">
                            {language === 'ar' ? 'خريطة تعز' : 'WORLD MAP: TAIZ'}
                        </h2>
                        <p className="text-white/40">District: Al-Mudhaffar & Cairo Castle Region</p>
                    </div>
                    <button 
                        onClick={() => setShowMap(false)}
                        className="bg-white/10 hover:bg-white/20 px-6 py-2 rounded-xl text-white transition-colors"
                    >
                        {language === 'ar' ? 'إغلاق' : 'Close [Esc]'}
                    </button>
                </div>

                <div className="flex-1 bg-white/5 rounded-[40px] border border-white/10 relative overflow-hidden">
                    {/* Grid Background */}
                    <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
                    
                    {/* Map Content (Simplified Coordinates Mapping) */}
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="relative w-[800px] h-[800px]">
                            {/* Landmarks */}
                            {landmarks.map(lm => (
                                <div 
                                    key={lm.id}
                                    className="absolute transition-transform hover:scale-110 cursor-help group"
                                    style={{ 
                                        left: `${(lm.position.x / 500) * 400 + 400}px`,
                                        top: `${(lm.position.z / 500) * 400 + 400}px`
                                    }}
                                >
                                    <div className="bg-blue-500 w-3 h-3 rounded-full border-2 border-white shadow-[0_0_15px_rgba(59,130,246,0.5)]" />
                                    <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 bg-black/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
                                        <p className="text-white text-xs font-bold">{language === 'ar' ? lm.nameAr : lm.name}</p>
                                        <p className="text-white/40 text-[8px] uppercase">{lm.type}</p>
                                    </div>
                                </div>
                            ))}

                            {/* Player Marker */}
                            <motion.div 
                                className="absolute z-10"
                                style={{ 
                                    left: `${(playerPos.x / 500) * 400 + 400}px`,
                                    top: `${(playerPos.z / 500) * 400 + 400}px`
                                }}
                            >
                                <div className="relative">
                                    <div className="absolute inset-0 bg-emerald-500 blur-md opacity-50 animate-pulse" />
                                    <Navigation 
                                        className="text-emerald-400 w-6 h-6 shadow-2xl" 
                                        style={{ transform: `rotate(${playerPos.rotation}rad)` }}
                                    />
                                </div>
                            </motion.div>
                        </div>
                    </div>
                </div>
            </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const StatBar: React.FC<{ icon: any, value: number, color: string, label: string }> = ({ icon: Icon, value, color, label }) => (
    <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-black/60 backdrop-blur-md rounded-xl border border-white/10 flex items-center justify-center">
            <Icon className="text-white/60 w-5 h-5" />
        </div>
        <div className="w-48 h-2 bg-black/40 rounded-full border border-white/5 overflow-hidden">
            <motion.div 
                className={`h-full ${color}`}
                initial={{ width: 0 }}
                animate={{ width: `${value}%` }}
                transition={{ duration: 1 }}
            />
        </div>
        <span className="text-[10px] text-white/30 uppercase tracking-widest font-mono w-12">{label}</span>
    </div>
);
