import React, { useState } from 'react';
import { BookOpen, Hammer, Keyboard, Map, Settings, Play } from 'lucide-react';

export const IntegrationGuide: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'compile' | 'input' | 'level' | 'gamemode'>('compile');

  const steps = {
    compile: [
      {
        num: '01',
        title: 'Place C++ source files',
        desc: 'Place the header (.h) files inside the /Source/TaizOpenWorld/ directories and the source (.cpp) files in their corresponding locations, exactly matching the structure shown in the Source Explorer.'
      },
      {
        num: '02',
        title: 'Regenerate IDE Project Files',
        desc: 'Right-click on your TaizOpenWorld.uproject file in your system file explorer and select **"Generate Visual Studio project files"** (or Xcode/Rider files depending on your platform).'
      },
      {
        num: '03',
        title: 'Compile inside IDE / Live Coding',
        desc: 'Open the solution file (.sln), configure your target build to **Development Editor / Win64**, and press build. Or start Unreal Engine and run Live Coding compilation (Ctrl+Alt+F11).'
      }
    ],
    input: [
      {
        num: '01',
        title: 'Create Input Actions (IA) Assets',
        desc: 'Inside the Content Browser, right-click and choose **Input > Input Action**. Create five separate assets: `IA_Move` (Value Type: Axis2D), `IA_Look` (Value Type: Axis2D), `IA_Sprint` (Digital), `IA_Crouch` (Digital), and `IA_Interact` (Digital).'
      },
      {
        num: '02',
        title: 'Create Input Mapping Context (IMC)',
        desc: 'Right-click and choose **Input > Input Mapping Context**. Name it `IMC_TaizDefault`. Inside, click "+" to add mappings. Map `IA_Move` to WASD and Left Joystick. Map `IA_Look` to Mouse XY and Right Joystick. Map others to Shift, Ctrl, and E respectively.'
      },
      {
        num: '03',
        title: 'Bind IMC in Player Controller Blueprint',
        desc: 'Create a blueprint class inheriting from our C++ class `TaizPlayerController` (e.g. `BP_TaizPlayerController`). In its Details panel, bind `IMC_TaizDefault` to the **"Default Input Mapping Context"** variable.'
      }
    ],
    level: [
      {
        num: '01',
        title: 'Configure World Partition',
        desc: 'Create a new Open World level. In **World Settings**, check "Enable World Partition". This divides the city into cell grids streamed dynamically around the player coordinate.'
      },
      {
        num: '02',
        title: 'Asset Placement - City Core',
        desc: 'Drag your 20 house modular meshes into place. Align them around a centralized curving primary splined road (Main Street). Anchor the Mosque in the center block, and place the Fuel Station at the outer exit lane near the parking lots.'
      },
      {
        num: '03',
        title: 'Enable Day/Night Atmospheric Lighting',
        desc: 'Insert a **Directional Light** (Sun), **Sky Light**, **Exponential Height Fog**, and **SkyAtmosphere**. Link their rotations to our C++ GameState time-tick delegators to dynamically update colors from sunrise golden hour to deep midnight.'
      }
    ],
    gamemode: [
      {
        num: '01',
        title: 'Create Blueprints derived from C++',
        desc: 'In Content Browser, right-click and create Blueprints based on `TaizGameModeBase`, `TaizPlayerCharacter` (BP_Khalid), and `TaizHUD`. This allows you to bind visual Skeletal Meshes and sound cues.'
      },
      {
        num: '02',
        title: 'Bind Defaults in GameMode',
        desc: 'Open `BP_TaizGameMode`. Under **Classes**, set Default Pawn to `BP_Khalid`, Player Controller to `BP_TaizPlayerController`, and HUD to `BP_TaizHUD`.'
      },
      {
        num: '03',
        title: 'Assign GameMode in Project Settings',
        desc: 'Go to **Project Settings > Maps & Modes**. Under Default GameMode, assign `BP_TaizGameMode`. Your custom open-world lifecycle rules are now fully operational!'
      }
    ]
  };

  return (
    <div className="bg-[#121214] border border-[#232329] rounded-xl p-6 shadow-2xl flex flex-col h-[750px]">
      <div className="flex items-center justify-between pb-4 border-b border-[#232329] mb-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-200 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-amber-500" />
            Unreal Engine 5.6 Integration Guide
          </h3>
          <p className="text-xs text-gray-400">Step-by-step instructions to compile C++ classes and wire assets in editor</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 p-1 bg-[#1A1A1E] rounded-lg border border-[#232329] mb-6">
        <button
          onClick={() => setActiveTab('compile')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-md text-xs font-semibold cursor-pointer transition-all ${
            activeTab === 'compile'
              ? 'bg-amber-500 text-black shadow-lg'
              : 'text-gray-400 hover:text-white hover:bg-[#232329]'
          }`}
        >
          <Hammer className="w-4 h-4" />
          Compilation & C++ Build
        </button>
        <button
          onClick={() => setActiveTab('input')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-md text-xs font-semibold cursor-pointer transition-all ${
            activeTab === 'input'
              ? 'bg-amber-500 text-black shadow-lg'
              : 'text-gray-400 hover:text-white hover:bg-[#232329]'
          }`}
        >
          <Keyboard className="w-4 h-4" />
          Enhanced Input (IMC)
        </button>
        <button
          onClick={() => setActiveTab('gamemode')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-md text-xs font-semibold cursor-pointer transition-all ${
            activeTab === 'gamemode'
              ? 'bg-amber-500 text-black shadow-lg'
              : 'text-gray-400 hover:text-white hover:bg-[#232329]'
          }`}
        >
          <Settings className="w-4 h-4" />
          GameMode & Classes
        </button>
        <button
          onClick={() => setActiveTab('level')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-md text-xs font-semibold cursor-pointer transition-all ${
            activeTab === 'level'
              ? 'bg-amber-500 text-black shadow-lg'
              : 'text-gray-400 hover:text-white hover:bg-[#232329]'
          }`}
        >
          <Map className="w-4 h-4" />
          World Partition & Level
        </button>
      </div>

      {/* Tab Contents */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-1">
        {steps[activeTab].map((step, idx) => (
          <div
            key={idx}
            className="flex gap-5 p-5 bg-[#17171A] border border-[#232329] hover:border-amber-500/20 rounded-xl transition-all duration-300 group"
          >
            <div className="text-3xl font-bold font-mono text-amber-500/10 group-hover:text-amber-500/25 transition-all flex-shrink-0 select-none">
              {step.num}
            </div>
            <div className="space-y-1.5">
              <h4 className="text-sm font-semibold text-gray-200 group-hover:text-amber-400 transition-colors flex items-center gap-2">
                <Play className="w-3.5 h-3.5 text-amber-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                {step.title}
              </h4>
              <p className="text-xs text-gray-400 leading-relaxed">{step.desc}</p>
            </div>
          </div>
        ))}

        <div className="p-4 bg-amber-500/5 border border-amber-500/10 rounded-xl text-xs text-amber-300/90 leading-relaxed flex gap-3 items-start mt-6">
          <Settings className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-bold block mb-0.5">Epic Games Naming Standards applied:</span>
            All classes utilize standard prefixing: <span className="font-mono text-amber-400 font-semibold">"A"</span> for Actors (`ATaizPlayerCharacter`, `ATaizGameState`), <span className="font-mono text-amber-400 font-semibold">"U"</span> for Components or Subsystems (`UTaizSaveSubsystem`), and <span className="font-mono text-amber-400 font-semibold">"E"</span> for Enums (`ETaizMovementState`). Keeping standard prefixing prevents reflection compile errors.
          </div>
        </div>
      </div>
    </div>
  );
};
