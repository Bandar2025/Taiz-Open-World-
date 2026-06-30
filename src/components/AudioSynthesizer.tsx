import React, { useEffect, useRef, useState } from 'react';
import { Volume2, VolumeX, Radio, Wind, ShoppingBag, Car, Bell } from 'lucide-react';
import { AudioLayer } from '../types';

interface AudioSynthesizerProps {
  timeOfDay: number; // 0 to 24 hours
  isMuted: boolean;
  setIsMuted: (muted: boolean) => void;
  activeDistrict: string;
}

export const AudioSynthesizer: React.FC<AudioSynthesizerProps> = ({
  timeOfDay,
  isMuted,
  setIsMuted,
  activeDistrict
}) => {
  const [layers, setLayers] = useState<AudioLayer[]>([
    { id: 'wind', name: 'Mountain Wind', nameAr: 'رياح الجبل', volume: 0.5, isPlaying: false, type: 'wind' },
    { id: 'adhan', name: 'Distant Adhan Call', nameAr: 'صوت الأذان', volume: 0.0, isPlaying: false, type: 'adhan' },
    { id: 'market', name: 'Souq Hustle', nameAr: 'ضجيج السوق', volume: 0.4, isPlaying: false, type: 'market' },
    { id: 'traffic', name: 'Main Road Traffic', nameAr: 'حركة المرور', volume: 0.3, isPlaying: false, type: 'traffic' },
    { id: 'birds', name: 'Al-Qahira Birds', nameAr: 'زقزقة عصافير', volume: 0.2, isPlaying: false, type: 'birds' },
    { id: 'children', name: 'Children Playing', nameAr: 'أطفال يلعبون', volume: 0.1, isPlaying: false, type: 'children' }
  ]);

  const audioCtxRef = useRef<AudioContext | null>(null);
  
  // Audio Nodes References
  const windNodeRef = useRef<BiquadFilterNode | null>(null);
  const windGainRef = useRef<GainNode | null>(null);
  const marketNodeRef = useRef<BiquadFilterNode | null>(null);
  const marketGainRef = useRef<GainNode | null>(null);
  const trafficGainRef = useRef<GainNode | null>(null);
  const birdsGainRef = useRef<GainNode | null>(null);
  const childrenGainRef = useRef<GainNode | null>(null);
  const adhanGainRef = useRef<GainNode | null>(null);
  const adhanOscsRef = useRef<OscillatorNode[]>([]);
  const masterGainRef = useRef<GainNode | null>(null);

  // Initialize Web Audio API
  const initAudio = () => {
    if (audioCtxRef.current) return;

    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioContextClass();
      audioCtxRef.current = ctx;

      // Master Gain
      const master = ctx.createGain();
      master.gain.setValueAtTime(isMuted ? 0 : 0.8, ctx.currentTime);
      master.connect(ctx.destination);
      masterGainRef.current = master;

      // 1. Synthesize Mountain Wind (Brown Noise + Bandpass Filter with moving frequency)
      const bufferSize = 2 * ctx.sampleRate;
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      let lastOut = 0.0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        // Brown noise filter formula
        output[i] = (lastOut + (0.02 * white)) / 1.02;
        lastOut = output[i];
        output[i] *= 3.5; // Gain compensation
      }

      const windSource = ctx.createBufferSource();
      windSource.buffer = noiseBuffer;
      windSource.loop = true;

      const windFilter = ctx.createBiquadFilter();
      windFilter.type = 'bandpass';
      windFilter.frequency.setValueAtTime(400, ctx.currentTime);
      windFilter.Q.setValueAtTime(2.0, ctx.currentTime);

      const windGain = ctx.createGain();
      windGain.gain.setValueAtTime(layers[0].volume, ctx.currentTime);

      windSource.connect(windFilter);
      windFilter.connect(windGain);
      windGain.connect(master);
      windSource.start(0);

      windNodeRef.current = windFilter;
      windGainRef.current = windGain;

      // Modulate wind frequency for natural gust effect
      const windOsc = ctx.createOscillator();
      windOsc.frequency.setValueAtTime(0.15, ctx.currentTime); // very slow sweep
      const windOscGain = ctx.createGain();
      windOscGain.gain.setValueAtTime(150, ctx.currentTime); // swing by 150Hz
      windOsc.connect(windOscGain);
      windOscGain.connect(windFilter.frequency);
      windOsc.start(0);

      // 2. Synthesize Souq Hustle (Multiple bandpass filtered noise streams & low bubble oscillators)
      const marketSource = ctx.createBufferSource();
      marketSource.buffer = noiseBuffer;
      marketSource.loop = true;

      const marketFilter = ctx.createBiquadFilter();
      marketFilter.type = 'lowpass';
      marketFilter.frequency.setValueAtTime(180, ctx.currentTime); // Muffled low hum

      const marketGain = ctx.createGain();
      marketGain.gain.setValueAtTime(layers[2].volume, ctx.currentTime);

      marketSource.connect(marketFilter);
      marketFilter.connect(marketGain);
      marketGain.connect(master);
      marketSource.start(0);

      marketNodeRef.current = marketFilter;
      marketGainRef.current = marketGain;

      // 3. Traffic Hum (Low frequency rumble with varying gains)
      const trafficOsc1 = ctx.createOscillator();
      trafficOsc1.type = 'sawtooth';
      trafficOsc1.frequency.setValueAtTime(55, ctx.currentTime); // Low A

      const trafficFilter = ctx.createBiquadFilter();
      trafficFilter.type = 'lowpass';
      trafficFilter.frequency.setValueAtTime(120, ctx.currentTime);

      const trafficGain = ctx.createGain();
      trafficGain.gain.setValueAtTime(layers[3].volume, ctx.currentTime);

      trafficOsc1.connect(trafficFilter);
      trafficFilter.connect(trafficGain);
      trafficGain.connect(master);
      trafficOsc1.start(0);

      trafficGainRef.current = trafficGain;

      // 5. Synthesize Birds (High pitched chirps using intermittent sine wave sweeps)
      const birdsGain = ctx.createGain();
      birdsGain.gain.setValueAtTime(layers[4].volume, ctx.currentTime);
      birdsGain.connect(master);
      birdsGainRef.current = birdsGain;

      const birdOsc = ctx.createOscillator();
      birdOsc.type = 'sine';
      birdOsc.frequency.setValueAtTime(2500, ctx.currentTime);
      const birdEnv = ctx.createGain();
      birdEnv.gain.setValueAtTime(0, ctx.currentTime);
      birdOsc.connect(birdEnv);
      birdEnv.connect(birdsGain);
      birdOsc.start(0);

      // Random chirping interval
      const chirp = () => {
        if (!audioCtxRef.current || isMuted) return;
        const now = ctx.currentTime;
        birdOsc.frequency.setValueAtTime(2000 + Math.random() * 2000, now);
        birdEnv.gain.setValueAtTime(0, now);
        birdEnv.gain.linearRampToValueAtTime(0.1, now + 0.05);
        birdEnv.gain.linearRampToValueAtTime(0, now + 0.15);
        setTimeout(chirp, 500 + Math.random() * 3000);
      };
      chirp();

      // 6. Synthesize Children Playing (Distant intermittent high-mid frequency filtered noise bursts)
      const childrenGain = ctx.createGain();
      childrenGain.gain.setValueAtTime(layers[5].volume, ctx.currentTime);
      childrenGain.connect(master);
      childrenGainRef.current = childrenGain;

      // 4. Adhan Synthesis (Atmospheric and spiritual pure Sine wave drones representing distant beautifully echoing sounds)
      const adhanGain = ctx.createGain();
      adhanGain.gain.setValueAtTime(0, ctx.currentTime); // Starts muted
      adhanGain.connect(master);
      adhanGainRef.current = adhanGain;

      // Harmonic chords for prayer call simulation (Atmospheric, modal keys in Maqam Bayati vibe)
      const frequencies = [220.0, 261.63, 293.66, 329.63]; // A3, C4, D4, E4
      const oscs: OscillatorNode[] = [];
      frequencies.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime);
        
        // Gentle vibrato
        const vibrato = ctx.createOscillator();
        vibrato.frequency.setValueAtTime(4 + idx * 0.5, ctx.currentTime);
        const vibGain = ctx.createGain();
        vibGain.gain.setValueAtTime(1.5, ctx.currentTime);
        vibrato.connect(vibGain);
        vibGain.connect(osc.frequency);

        const oscGain = ctx.createGain();
        oscGain.gain.setValueAtTime(0.15, ctx.currentTime); // Low individual volumes

        osc.connect(oscGain);
        oscGain.connect(adhanGain);
        
        vibrato.start(0);
        osc.start(0);
        oscs.push(osc);
      });
      adhanOscsRef.current = oscs;

      setLayers(prev => prev.map(l => ({ ...l, isPlaying: true })));
    } catch (e) {
      console.error("Failed to initialize Web Audio Synthesizer: ", e);
    }
  };

  // Trigger audio on first interaction
  const handleToggleMute = () => {
    if (!audioCtxRef.current) {
      initAudio();
    } else {
      const isCurrentlyMuted = !isMuted;
      setIsMuted(isCurrentlyMuted);
      if (masterGainRef.current && audioCtxRef.current) {
        masterGainRef.current.gain.setValueAtTime(isCurrentlyMuted ? 0 : 0.8, audioCtxRef.current.currentTime);
      }
    }
  };

  // Adjust layer volume
  const handleLayerVolumeChange = (id: string, newVol: number) => {
    setLayers(prev => prev.map(l => l.id === id ? { ...l, volume: newVol } : l));

    if (!audioCtxRef.current) return;
    const time = audioCtxRef.current.currentTime;

    switch (id) {
      case 'wind':
        if (windGainRef.current) windGainRef.current.gain.linearRampToValueAtTime(newVol, time + 0.5);
        break;
      case 'market':
        if (marketGainRef.current) marketGainRef.current.gain.linearRampToValueAtTime(newVol, time + 0.5);
        break;
      case 'traffic':
        if (trafficGainRef.current) trafficGainRef.current.gain.linearRampToValueAtTime(newVol, time + 0.5);
        break;
      case 'birds':
        if (birdsGainRef.current) birdsGainRef.current.gain.linearRampToValueAtTime(newVol, time + 0.5);
        break;
      case 'children':
        if (childrenGainRef.current) childrenGainRef.current.gain.linearRampToValueAtTime(newVol, time + 0.5);
        break;
      case 'adhan':
        if (adhanGainRef.current) adhanGainRef.current.gain.linearRampToValueAtTime(newVol, time + 0.5);
        break;
    }
  };

  // Dynamically blend soundscape depending on In-game Time & Active District
  useEffect(() => {
    if (!audioCtxRef.current) return;

    const ctx = audioCtxRef.current;
    const time = ctx.currentTime;

    // Wind is stronger in the evening and morning on Saber Mountain
    let windVol = 0.2 + (activeDistrict === 'SaberMountain' ? 0.4 : 0.1);
    if (timeOfDay < 6 || timeOfDay > 18) {
      windVol += 0.2; // night mountain breeze
    }

    // Market is busy from 8:00 to 13:00 and 16:00 to 20:00
    let marketVol = 0.05;
    if ((timeOfDay >= 8 && timeOfDay <= 13) || (timeOfDay >= 16 && timeOfDay <= 20)) {
      marketVol = activeDistrict === 'SouqAlQahira' ? 0.6 : 0.2;
    }

    // Traffic peaks during commute hours: 7:00-9:00 and 17:00-19:00
    let trafficVol = 0.05;
    if ((timeOfDay >= 7 && timeOfDay <= 9) || (timeOfDay >= 17 && timeOfDay <= 19)) {
      trafficVol = activeDistrict === 'AlGanadCorridor' ? 0.5 : 0.25;
    }

    // Prayer timings (Fajr ~5am, Dhuhr ~12pm, Asr ~3:30pm, Maghrib ~6:30pm, Isha ~8pm)
    // When prayer triggers, fade in the Adhan synthesizer for 15 in-game minutes (e.g. some seconds)
    let adhanVol = 0.0;
    const isAroundPrayerTime = 
      (timeOfDay >= 4.9 && timeOfDay <= 5.2) ||   // Fajr
      (timeOfDay >= 12.0 && timeOfDay <= 12.3) || // Dhuhr
      (timeOfDay >= 15.4 && timeOfDay <= 15.7) || // Asr
      (timeOfDay >= 18.2 && timeOfDay <= 18.5) || // Maghrib
      (timeOfDay >= 20.0 && timeOfDay <= 20.3);   // Isha

    if (isAroundPrayerTime) {
      adhanVol = 0.45;
    }

    // Birds are active during the day, quiet at night
    let birdsVol = (timeOfDay > 5 && timeOfDay < 18) ? 0.3 : 0.05;
    
    // Children play in the afternoon and early evening
    let childrenVol = (timeOfDay >= 15 && timeOfDay <= 19) ? 0.25 : 0.05;

    // Apply computed volume levels to active Web Audio nodes smoothly
    if (windGainRef.current) windGainRef.current.gain.linearRampToValueAtTime(windVol, time + 1.0);
    if (marketGainRef.current) marketGainRef.current.gain.linearRampToValueAtTime(marketVol, time + 1.0);
    if (trafficGainRef.current) trafficGainRef.current.gain.linearRampToValueAtTime(trafficVol, time + 1.0);
    if (birdsGainRef.current) birdsGainRef.current.gain.linearRampToValueAtTime(birdsVol, time + 1.0);
    if (childrenGainRef.current) childrenGainRef.current.gain.linearRampToValueAtTime(childrenVol, time + 1.0);
    if (adhanGainRef.current) adhanGainRef.current.gain.linearRampToValueAtTime(adhanVol, time + 1.5);

    setLayers(prev => prev.map(l => {
      if (l.id === 'wind') return { ...l, volume: windVol };
      if (l.id === 'market') return { ...l, volume: marketVol };
      if (l.id === 'traffic') return { ...l, volume: trafficVol };
      if (l.id === 'birds') return { ...l, volume: birdsVol };
      if (l.id === 'children') return { ...l, volume: childrenVol };
      if (l.id === 'adhan') return { ...l, volume: adhanVol };
      return l;
    }));

  }, [timeOfDay, activeDistrict]);

  // Clean up AudioContext on unmount
  useEffect(() => {
    return () => {
      if (audioCtxRef.current) {
        audioCtxRef.current.close();
      }
    };
  }, []);

  const getLayerIcon = (type: string) => {
    switch (type) {
      case 'wind': return <Wind className="w-4 h-4 text-sky-400" />;
      case 'market': return <ShoppingBag className="w-4 h-4 text-amber-500" />;
      case 'traffic': return <Car className="w-4 h-4 text-emerald-500" />;
      case 'adhan': return <Bell className="w-4 h-4 text-yellow-400 animate-pulse" />;
      default: return <Radio className="w-4 h-4 text-gray-400" />;
    }
  };

  return (
    <div className="bg-[#121214] border border-[#232329] rounded-xl p-5 shadow-xl">
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#232329]">
        <div>
          <h3 className="text-sm font-semibold text-gray-200 flex items-center gap-2">
            <Radio className="w-4 h-4 text-amber-500 animate-pulse" />
            Lumen Ambient Sound Synthesis
          </h3>
          <p className="text-xs text-gray-400">Synthesizing real-time atmospheric sounds of Taiz</p>
        </div>
        <button
          onClick={handleToggleMute}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-300 cursor-pointer ${
            isMuted || !audioCtxRef.current
              ? 'bg-red-950/40 text-red-400 border border-red-900/40 hover:bg-red-900/30'
              : 'bg-amber-950/40 text-amber-400 border border-amber-900/40 hover:bg-amber-900/30'
          }`}
        >
          {isMuted || !audioCtxRef.current ? (
            <>
              <VolumeX className="w-4 h-4" />
              Muted / Start Synth
            </>
          ) : (
            <>
              <Volume2 className="w-4 h-4" />
              Synth Running
            </>
          )}
        </button>
      </div>

      {!audioCtxRef.current ? (
        <div className="text-center py-4 bg-amber-500/5 rounded-lg border border-amber-500/10 mb-2">
          <p className="text-xs text-amber-300">
            Click the button above to initialize the **Web Audio Synthesizer** and enable dynamic atmospheric sounds.
          </p>
        </div>
      ) : null}

      <div className="space-y-3">
        {layers.map(layer => (
          <div key={layer.id} className="flex flex-col gap-1">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-2 text-gray-300 font-medium">
                {getLayerIcon(layer.type)}
                {layer.name} <span className="text-gray-500 text-[10px] font-mono">({layer.nameAr})</span>
              </span>
              <span className="text-[10px] font-mono text-gray-400">{(layer.volume * 100).toFixed(0)}%</span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                disabled={isMuted || !audioCtxRef.current}
                value={layer.volume}
                onChange={(e) => handleLayerVolumeChange(layer.id, parseFloat(e.target.value))}
                className="w-full h-1.5 bg-[#232329] rounded-lg appearance-none cursor-pointer accent-amber-500 disabled:opacity-30 disabled:cursor-not-allowed"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
