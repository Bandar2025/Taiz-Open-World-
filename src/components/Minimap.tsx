import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { motion } from 'motion/react';
import { GameEngine } from '../game/GameEngine';
import { Landmark } from '../types';
import { MapPin, Navigation } from 'lucide-react';

interface MinimapProps {
  engine: GameEngine | null;
  landmarks: Landmark[];
  visible: boolean;
  activeMission?: { id: string; title: string } | null;
}

export const Minimap: React.FC<MinimapProps> = ({ engine, landmarks, visible, activeMission }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.OrthographicCamera | null>(null);
  const playerMarkerRef = useRef<THREE.Group | null>(null);

  useEffect(() => {
    if (!canvasRef.current || !engine) return;

    // Initialize Minimap Renderer
    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      alpha: true,
      antialias: true
    });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(200, 200);
    rendererRef.current = renderer;

    // Initialize Orthographic Camera for Top-Down View
    const size = 100; // World units visible in minimap
    const camera = new THREE.OrthographicCamera(
      -size / 2, size / 2,
      size / 2, -size / 2,
      1, 1000
    );
    camera.position.set(0, 500, 0);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // Create a specific marker for the player in the minimap
    // We'll add this to the main scene but maybe on a different layer?
    // Actually, we can just render a 2D overlay or a specific 3D mesh that only the minimap camera sees.
    const playerMarker = new THREE.Group();
    const arrowGeometry = new THREE.ConeGeometry(2, 6, 3);
    const arrowMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
    const arrow = new THREE.Mesh(arrowGeometry, arrowMaterial);
    arrow.rotation.x = Math.PI / 2; // Point "forward" along Z
    playerMarker.add(arrow);
    
    // Circle base
    const ringGeo = new THREE.RingGeometry(3, 4, 32);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x00ff00, transparent: true, opacity: 0.5, side: THREE.DoubleSide });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    playerMarker.add(ring);
    
    engine.getScene().add(playerMarker);
    playerMarkerRef.current = playerMarker;

    // Rendering Loop for Minimap
    const render = () => {
      if (!engine || !camera || !renderer) return;

      const playerPos = engine.getPlayerPos();
      const playerRot = engine.getPlayerRotation();

      // Update Camera Position to follow player
      camera.position.x = playerPos.x;
      camera.position.z = playerPos.z;

      // Update Player Marker
      playerMarker.position.copy(playerPos);
      playerMarker.position.y = 100; // Float above ground to be seen clearly by top camera
      playerMarker.rotation.y = playerRot;

      // Render the scene
      renderer.render(engine.getScene(), camera);

      requestAnimationFrame(render);
    };

    const animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
      if (playerMarkerRef.current) {
        engine.getScene().remove(playerMarkerRef.current);
      }
      renderer.dispose();
    };
  }, [engine]);

  if (!visible) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8, x: 20, y: 20 }}
      animate={{ opacity: 1, scale: 1, x: 0, y: 0 }}
      className="fixed bottom-6 right-6 w-48 h-48 rounded-full border-4 border-white/20 overflow-hidden shadow-2xl bg-black/40 backdrop-blur-md z-50 pointer-events-none"
      ref={containerRef}
      style={{ boxShadow: '0 0 20px rgba(0,0,0,0.5), inset 0 0 10px rgba(0,0,0,0.5)' }}
    >
      {/* 3D Render Canvas */}
      <canvas ref={canvasRef} className="w-full h-full" />

      {/* Map Overlay Decor */}
      <div className="absolute inset-0 rounded-full border border-green-500/30 pointer-events-none">
        <div className="absolute top-1/2 left-0 w-full h-px bg-green-500/10" />
        <div className="absolute left-1/2 top-0 w-px h-full bg-green-500/10" />
        <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-green-500/5 to-transparent" />
      </div>

      {/* Compass Letters */}
      <div className="absolute top-2 left-1/2 -translate-x-1/2 text-[10px] font-bold text-white/70">N</div>
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[10px] font-bold text-white/70">S</div>
      <div className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-white/70">W</div>
      <div className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-white/70">E</div>

      {/* Landmark Markers (2D Overlay for better clarity) */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-full">
        {landmarks.map((landmark) => {
          if (!engine) return null;
          const playerPos = engine.getPlayerPos();
          
          // Calculate relative position (size is 100 units total, so -50 to 50)
          const relX = landmark.position.x - playerPos.x;
          const relZ = landmark.position.z - playerPos.z;
          
          // Size of map is 200px, 100 units = 200px => 1 unit = 2px
          const mapX = 96 + relX * 1.92; // 96 is center (48*2)
          const mapZ = 96 + relZ * 1.92;

          // Check if within bounds of the circle (radius 96px)
          const dist = Math.sqrt(Math.pow(relX * 1.92, 2) + Math.pow(relZ * 1.92, 2));
          if (dist > 90) return null;

          return (
            <div
              key={landmark.id}
              className="absolute w-4 h-4 -ml-2 -mt-2 flex items-center justify-center transition-all duration-300"
              style={{ left: `${mapX}px`, top: `${mapZ}px` }}
            >
              <div className="w-2 h-2 rounded-full bg-yellow-400 shadow-[0_0_5px_rgba(250,204,21,0.8)]" title={landmark.name} />
            </div>
          );
        })}
      </div>

      {/* Scanline Effect */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%),linear-gradient(90deg,rgba(255,0,0,0.03),rgba(0,255,0,0.01),rgba(0,0,255,0.03))] bg-[length:100%_4px,3px_100%] pointer-events-none opacity-20" />
    </motion.div>
  );
};
