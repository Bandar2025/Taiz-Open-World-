import React, { useState } from 'react';
import { BlueprintNode, BlueprintLink } from '../types';
import { Network, Zap, Play, Info, HelpCircle } from 'lucide-react';

export const BlueprintVisualizer: React.FC = () => {
  const [selectedNode, setSelectedNode] = useState<BlueprintNode | null>(null);

  const nodes: BlueprintNode[] = [
    {
      id: 'event_move',
      title: 'IA_Move (Enhanced Input Event)',
      type: 'Input',
      inputs: [],
      outputs: ['Triggered', 'Started', 'Completed', 'Action Value'],
      x: 50,
      y: 100,
      description: 'Triggered when the player pushes the WASD keys. Injected via the Input Mapping Context (IMC_TaizDefault).'
    },
    {
      id: 'break_vector',
      title: 'Break Input Action Value 2D',
      type: 'Function',
      inputs: ['Action Value'],
      outputs: ['X (Right / Left)', 'Y (Forward / Backward)'],
      x: 320,
      y: 160,
      description: 'Breaks down the 2D joystick/WASD input vector into individual X (float) and Y (float) axes.'
    },
    {
      id: 'pawn_rotation',
      title: 'Get Control Rotation (Controller)',
      type: 'Getter',
      inputs: ['Target (Pawn)'],
      outputs: ['Rotation (FRotator)'],
      x: 100,
      y: 350,
      description: 'Retrieves the rotation vector of the player controller camera view.'
    },
    {
      id: 'break_rotator',
      title: 'Break Rotator (Yaw Only)',
      type: 'Function',
      inputs: ['Rotation'],
      outputs: ['Roll', 'Pitch', 'Yaw'],
      x: 350,
      y: 350,
      description: 'Isolates the Yaw parameter so the character moves strictly parallel to the ground, preventing fly-up angles.'
    },
    {
      id: 'make_rotator',
      title: 'Make Rotator (0, 0, Yaw)',
      type: 'Function',
      inputs: ['Roll', 'Pitch', 'Yaw'],
      outputs: ['Rotation (FRotator)'],
      x: 520,
      y: 350,
      description: 'Rebuilds a clean FRotator struct containing only the isolated Yaw rotation.'
    },
    {
      id: 'add_movement',
      title: 'Add Movement Input',
      type: 'Setter',
      inputs: ['Exec (In)', 'Target (Pawn)', 'World Direction', 'Scale Value'],
      outputs: ['Exec (Out)'],
      x: 750,
      y: 120,
      description: 'Injects physics force into the Character Movement Component along the chosen direction vector, scaled by WASD input.'
    }
  ];

  const links: BlueprintLink[] = [
    { fromNode: 'event_move', fromPin: 'Triggered', toNode: 'add_movement', toPin: 'Exec (In)' },
    { fromNode: 'event_move', fromPin: 'Action Value', toNode: 'break_vector', toPin: 'Action Value' },
    { fromNode: 'pawn_rotation', fromPin: 'Rotation (FRotator)', toNode: 'break_rotator', toPin: 'Rotation' },
    { fromNode: 'break_rotator', fromPin: 'Yaw', toNode: 'make_rotator', toPin: 'Yaw' },
    { fromNode: 'break_vector', fromPin: 'Y (Forward / Backward)', toNode: 'add_movement', toPin: 'Scale Value' }
  ];

  // Colors based on Node category/type
  const getNodeStyles = (type: BlueprintNode['type']) => {
    switch (type) {
      case 'Event':
      case 'Input':
        return { bg: 'border-red-600 bg-red-950/40', text: 'text-red-400', headerBg: 'bg-red-900/40' };
      case 'Function':
        return { bg: 'border-blue-600 bg-blue-950/40', text: 'text-blue-400', headerBg: 'bg-blue-900/40' };
      case 'Setter':
        return { bg: 'border-teal-600 bg-teal-950/40', text: 'text-teal-400', headerBg: 'bg-teal-900/40' };
      case 'Getter':
        return { bg: 'border-emerald-600 bg-emerald-950/40', text: 'text-emerald-400', headerBg: 'bg-emerald-900/40' };
      default:
        return { bg: 'border-gray-600 bg-gray-950/40', text: 'text-gray-400', headerBg: 'bg-gray-900/40' };
    }
  };

  return (
    <div className="bg-[#121214] border border-[#232329] rounded-xl p-6 shadow-2xl overflow-hidden flex flex-col h-[750px]">
      <div className="flex items-center justify-between pb-4 border-b border-[#232329] mb-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-200 flex items-center gap-2">
            <Network className="w-4 h-4 text-amber-500" />
            BP_TaizCharacter - Enhanced Input Movement Logic
          </h3>
          <p className="text-xs text-gray-400">Visual mapping connecting Unreal C++ variables to Input Mapping Contexts</p>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <span className="flex items-center gap-1 text-gray-400">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" /> Input/Events
          </span>
          <span className="flex items-center gap-1 text-gray-400">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" /> Function Call
          </span>
          <span className="flex items-center gap-1 text-gray-400">
            <span className="w-2.5 h-2.5 rounded-full bg-teal-500 inline-block" /> Setters
          </span>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 xl:grid-cols-4 gap-6 overflow-hidden">
        {/* Graph Area */}
        <div className="xl:col-span-3 bg-[#09090B] border border-[#1E1E24] rounded-xl relative overflow-auto p-4 select-none flex-1 h-[450px] xl:h-full custom-blueprint-grid">
          {/* SVG Connection Wires layer */}
          <svg className="absolute inset-0 w-[1200px] h-[700px] pointer-events-none z-0">
            <defs>
              <linearGradient id="exec_wire_grad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#ef4444" />
                <stop offset="100%" stopColor="#14b8a6" />
              </linearGradient>
              <linearGradient id="data_wire_grad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#3b82f6" />
                <stop offset="100%" stopColor="#10b981" />
              </linearGradient>
            </defs>

            {links.map((link, idx) => {
              const fromNode = nodes.find(n => n.id === link.fromNode);
              const toNode = nodes.find(n => n.id === link.toNode);

              if (!fromNode || !toNode) return null;

              // Compute relative socket locations
              const fromIdx = fromNode.outputs.indexOf(link.fromPin);
              const toIdx = toNode.inputs.indexOf(link.toPin);

              const startX = fromNode.x + 230; // approx width
              const startY = fromNode.y + 45 + (fromIdx * 24);

              const endX = toNode.x;
              const endY = toNode.y + 45 + (toIdx * 24);

              // Standard bezier curve for Blueprint wire shapes
              const controlDist = Math.max(50, Math.abs(endX - startX) * 0.4);
              const pathD = `M ${startX} ${startY} C ${startX + controlDist} ${startY}, ${endX - controlDist} ${endY}, ${endX} ${endY}`;

              const isExec = link.fromPin === 'Triggered' || link.toPin === 'Exec (In)';

              return (
                <g key={idx}>
                  {/* Outer glow wire */}
                  <path
                    d={pathD}
                    fill="none"
                    stroke={isExec ? 'rgba(239, 68, 68, 0.15)' : 'rgba(59, 130, 246, 0.15)'}
                    strokeWidth="4"
                    className="animate-pulse"
                  />
                  {/* Central wire */}
                  <path
                    d={pathD}
                    fill="none"
                    stroke={isExec ? 'url(#exec_wire_grad)' : 'url(#data_wire_grad)'}
                    strokeWidth="1.8"
                    strokeDasharray={isExec ? '6, 4' : 'none'}
                    className={isExec ? 'blueprint-wire-flow' : ''}
                  />
                </g>
              );
            })}
          </svg>

          {/* Render Visual Blueprint Nodes */}
          <div className="absolute w-[1200px] h-[700px] z-10">
            {nodes.map(node => {
              const styles = getNodeStyles(node.type);
              const isSelected = selectedNode?.id === node.id;

              return (
                <div
                  key={node.id}
                  style={{ left: node.x, top: node.y }}
                  onClick={() => setSelectedNode(node)}
                  className={`absolute w-56 rounded-lg border shadow-xl transition-all duration-150 cursor-pointer text-xs ${styles.bg} ${
                    isSelected ? 'ring-2 ring-amber-500 scale-[1.02]' : 'hover:border-gray-500'
                  }`}
                >
                  {/* Node Header */}
                  <div className={`px-3 py-1.5 rounded-t-lg font-bold flex items-center justify-between border-b border-[#232329] text-[11px] ${styles.headerBg}`}>
                    <span className="truncate">{node.title}</span>
                    <Zap className={`w-3 h-3 ${node.type === 'Input' ? 'text-red-400 animate-pulse' : 'text-gray-400'}`} />
                  </div>

                  {/* Pin Content */}
                  <div className="p-2.5 space-y-2">
                    {/* Inputs */}
                    {node.inputs.map((pin, i) => (
                      <div key={i} className="flex items-center gap-1.5 text-left text-gray-300">
                        <span className={`w-2 h-2 rounded-sm ${pin.includes('Exec') ? 'bg-amber-400 clip-triangle' : 'bg-blue-500'} inline-block`} />
                        <span className="text-[10px]">{pin}</span>
                      </div>
                    ))}

                    {/* Outputs */}
                    {node.outputs.map((pin, i) => (
                      <div key={i} className="flex items-center justify-end gap-1.5 text-right text-gray-300">
                        <span className="text-[10px]">{pin}</span>
                        <span className={`w-2 h-2 rounded-sm ${pin.includes('Triggered') || pin.includes('Exec') ? 'bg-red-500 clip-triangle' : 'bg-teal-500'} inline-block`} />
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Node Details Panel */}
        <div className="bg-[#1A1A1E] border border-[#2A2A32] rounded-xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3 pb-2 border-b border-[#2A2A32]">
              <Info className="w-4 h-4 text-amber-500" />
              <h4 className="text-xs font-semibold text-gray-200 uppercase tracking-wider">Blueprint Inspector</h4>
            </div>

            {selectedNode ? (
              <div className="space-y-4">
                <div>
                  <h5 className="text-xs font-bold text-amber-400">{selectedNode.title}</h5>
                  <span className="text-[10px] bg-[#232329] px-2 py-0.5 rounded text-gray-400 font-mono mt-1 inline-block uppercase">{selectedNode.type} Node</span>
                </div>
                <p className="text-xs text-gray-300 leading-relaxed">{selectedNode.description}</p>
              </div>
            ) : (
              <div className="text-center py-10 space-y-2">
                <HelpCircle className="w-8 h-8 text-gray-600 mx-auto" />
                <p className="text-xs text-gray-400">Click any Blueprint node to inspect variables and logic flow.</p>
              </div>
            )}
          </div>

          <div className="bg-amber-500/5 border border-amber-500/10 rounded-lg p-3 text-[11px] text-amber-300 leading-relaxed">
            <span className="font-bold block mb-1">💡 Architecture Note:</span>
            Unreal Engine Enhanced Input is built to bind high-efficiency inputs asynchronously. Bypassing old Tick bindings ensures optimal GPU and CPU execution.
          </div>
        </div>
      </div>
    </div>
  );
};
