import React, { useRef, useEffect, useState } from 'react';
import { DataPoint, PointClass } from '../types';
import { calculateDecisionValue } from '../utils/mathUtils';

interface Surface3DProps {
  points: DataPoint[];
  gamma: number;
  hoverLoc?: { x: number, y: number } | null;
  onHover?: (pos: { x: number, y: number } | null) => void;
}

const Surface3D: React.FC<Surface3DProps> = ({ points, gamma, hoverLoc, onHover }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Interaction State
  const [rotation, setRotation] = useState({ x: 0.7, z: 0.5 }); // Pitch, Yaw
  const [lift, setLift] = useState(0.5); // 0 = Flat (2D), 1 = Full 3D
  const [isDragging, setIsDragging] = useState(false);
  const lastMouse = useRef({ x: 0, y: 0 });
  const [hoverZ, setHoverZ] = useState<number | null>(null);
  
  // Screen Map for Hit Testing: Maps Screen X/Y to Data X/Y
  const hitMap = useRef<{sx: number, sy: number, x: number, y: number}[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Grid Settings
    const rows = 30;
    const cols = 30;
    const gridPoints: {x: number, y: number, z: number, val: number}[] = [];
    
    // Reset Hit Map
    hitMap.current = [];

    // Pre-calculate grid values for this frame
    for (let r = 0; r <= rows; r++) {
        for (let c = 0; c <= cols; c++) {
            const nx = c / cols;
            const ny = r / rows;
            const val = calculateDecisionValue(nx, ny, points, gamma);
            gridPoints.push({
                x: nx - 0.5, // Center at 0
                y: ny - 0.5,
                z: val,
                val: val
            });
        }
    }

    const render = () => {
        const width = canvas.width;
        const height = canvas.height;
        ctx.clearRect(0, 0, width, height);

        const scale = 200;
        const centerX = width / 2;
        const centerY = height / 2 + 50;

        // Projection Function
        // x, y are plane coordinates (-0.5 to 0.5)
        // z is the function value
        const project = (x: number, y: number, z: number) => {
            // Rotate around Z axis (Yaw)
            const x1 = x * Math.cos(rotation.z) - y * Math.sin(rotation.z);
            const y1 = x * Math.sin(rotation.z) + y * Math.cos(rotation.z);
            
            // Rotate around X axis (Pitch)
            // Apply Lift factor to Z: When lift is 0, z is ignored (flat plane)
            const effectiveZ = z * lift;
            
            const y2 = y1 * Math.cos(rotation.x) - effectiveZ * Math.sin(rotation.x);
            const z2 = y1 * Math.sin(rotation.x) + effectiveZ * Math.cos(rotation.x);

            // Perspective projection (isometric-ish)
            return {
                x: centerX + x1 * scale,
                y: centerY + y2 * scale
            };
        };

        // Register a point in the hit map
        const registerHit = (sx: number, sy: number, dataX: number, dataY: number) => {
             hitMap.current.push({ sx, sy, x: dataX, y: dataY });
        };

        ctx.lineWidth = 1.5;

        // Draw Grid Lines (Horizontal)
        for (let r = 0; r <= rows; r++) {
            ctx.beginPath();
            for (let c = 0; c <= cols; c++) {
                const idx = r * (cols + 1) + c;
                const p = gridPoints[idx];
                const proj = project(p.x, p.y, p.z);
                
                // Register grid vertices for general surface hover
                registerHit(proj.x, proj.y, p.x + 0.5, p.y + 0.5);

                if (c === 0) ctx.moveTo(proj.x, proj.y);
                else ctx.lineTo(proj.x, proj.y);
            }
            ctx.strokeStyle = `rgba(255, 255, 255, 0.15)`;
            ctx.stroke();
        }

        // Draw Grid Lines (Vertical)
        for (let c = 0; c <= cols; c++) {
            ctx.beginPath();
            for (let r = 0; r <= rows; r++) {
                const idx = r * (cols + 1) + c;
                const p = gridPoints[idx];
                const proj = project(p.x, p.y, p.z);

                if (r === 0) ctx.moveTo(proj.x, proj.y);
                else ctx.lineTo(proj.x, proj.y);
            }
            ctx.strokeStyle = `rgba(255, 255, 255, 0.15)`;
            ctx.stroke();
        }

        // Draw Data Points
        points.forEach(pt => {
            // Calculate actual Z for this point
            const zVal = calculateDecisionValue(pt.x, pt.y, points, gamma);
            // Draw "Stem" line from ground to point
            const ground = project(pt.x - 0.5, pt.y - 0.5, 0);
            const air = project(pt.x - 0.5, pt.y - 0.5, zVal);

            // Register data points (high priority for hit test)
            registerHit(air.x, air.y, pt.x, pt.y);

            // Stem
            ctx.beginPath();
            ctx.moveTo(ground.x, ground.y);
            ctx.lineTo(air.x, air.y);
            ctx.strokeStyle = 'rgba(255,255,255,0.3)';
            ctx.setLineDash([2, 2]);
            ctx.stroke();
            ctx.setLineDash([]);

            // The Point
            ctx.beginPath();
            const size = 5; 
            ctx.arc(air.x, air.y, size, 0, Math.PI * 2);
            ctx.fillStyle = pt.label === PointClass.RED ? '#ef4444' : '#3b82f6';
            ctx.fill();
            ctx.strokeStyle = '#fff';
            ctx.stroke();
        });
        
        // Draw Cursor Highlight if Hovering
        if (hoverLoc) {
            const zVal = calculateDecisionValue(hoverLoc.x, hoverLoc.y, points, gamma);
            setHoverZ(zVal); // Update state for UI readout

            const ground = project(hoverLoc.x - 0.5, hoverLoc.y - 0.5, 0);
            const air = project(hoverLoc.x - 0.5, hoverLoc.y - 0.5, zVal);

            // Vertical Guideline
            ctx.beginPath();
            ctx.moveTo(ground.x, ground.y);
            ctx.lineTo(air.x, air.y);
            ctx.strokeStyle = '#fbbf24'; // Amber color
            ctx.lineWidth = 2;
            ctx.setLineDash([4, 3]);
            ctx.stroke();
            ctx.setLineDash([]);

            // Surface Point
            ctx.beginPath();
            ctx.arc(air.x, air.y, 6, 0, Math.PI * 2);
            ctx.fillStyle = '#fbbf24';
            ctx.fill();
            ctx.strokeStyle = '#fff';
            ctx.stroke();

            // Ground Shadow
            ctx.beginPath();
            ctx.arc(ground.x, ground.y, 4, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(251, 191, 36, 0.5)';
            ctx.fill();
        } else {
            setHoverZ(null);
        }

        // Draw separating plane reference (z=0) border
        const p1 = project(-0.5, -0.5, 0);
        const p2 = project(0.5, -0.5, 0);
        const p3 = project(0.5, 0.5, 0);
        const p4 = project(-0.5, 0.5, 0);
        
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.lineTo(p3.x, p3.y);
        ctx.lineTo(p4.x, p4.y);
        ctx.closePath();
        ctx.strokeStyle = 'rgba(100, 200, 255, 0.2)';
        ctx.lineWidth = 2;
        ctx.stroke();
    };

    render();

  }, [points, gamma, rotation, lift, hoverLoc]);

  // Mouse Handlers
  const handleMouseDown = (e: React.MouseEvent) => {
      setIsDragging(true);
      lastMouse.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
      // Handle Rotation
      if (isDragging) {
          const deltaX = e.clientX - lastMouse.current.x;
          const deltaY = e.clientY - lastMouse.current.y;
          
          setRotation(prev => ({
              z: prev.z - deltaX * 0.01,
              x: Math.max(0.1, Math.min(Math.PI / 2, prev.x + deltaY * 0.01))
          }));
          
          lastMouse.current = { x: e.clientX, y: e.clientY };
          return;
      }

      // Handle Surface Probing (Hit Test)
      if (onHover) {
          const canvas = canvasRef.current;
          if(!canvas) return;
          const rect = canvas.getBoundingClientRect();
          
          // Scale mouse pos to canvas resolution (if displayed size differs from buffer size)
          const scaleX = canvas.width / rect.width;
          const scaleY = canvas.height / rect.height;
          
          const mx = (e.clientX - rect.left) * scaleX;
          const my = (e.clientY - rect.top) * scaleY;

          // Find nearest point in HitMap
          let minDist = 1000; // High initial value
          let nearest = null;
          const THRESHOLD = 40; // Distance in pixels to snap

          for (const pt of hitMap.current) {
              const dx = pt.sx - mx;
              const dy = pt.sy - my;
              const dist = Math.sqrt(dx*dx + dy*dy);
              if (dist < minDist) {
                  minDist = dist;
                  nearest = pt;
              }
          }

          if (nearest && minDist < THRESHOLD) {
              onHover({ x: nearest.x, y: nearest.y });
          } else {
              // Optional: Debounce this to avoid flickering, but direct clear is more responsive
              onHover(null);
          }
      }
  };

  const handleMouseUp = () => {
      setIsDragging(false);
  };

  return (
    <div className="relative rounded-lg overflow-hidden shadow-2xl border border-slate-700 bg-slate-900 flex flex-col h-full group">
      {/* Top Left Overlay: Legend */}
      <div className="absolute top-0 left-0 p-3 flex flex-col gap-2 z-10 pointer-events-none">
          <div className="bg-black/60 backdrop-blur text-xs text-white px-3 py-2 rounded-md pointer-events-auto border border-slate-700 shadow-xl">
              <div className="font-bold mb-2 text-cyan-400 border-b border-slate-600 pb-1">Z-Axis Legend</div>
              <div className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-1 text-[10px] items-center">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <div className="text-slate-300">Positive Score (+1)</div>
                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                  <div className="text-slate-300">Negative Score (-1)</div>
                  <div className="w-2 h-1 bg-cyan-400/30"></div>
                  <div className="text-slate-300">Zero Plane (Boundary)</div>
              </div>
          </div>
      </div>

      {/* Top Right Overlay: Lift Control */}
      <div className="absolute top-0 right-0 p-3 z-10 pointer-events-none">
          <div className="bg-black/70 backdrop-blur p-2 rounded border border-slate-700 pointer-events-auto w-32">
             <label className="block text-[10px] uppercase text-slate-400 font-bold mb-1">
                RBF Lift Effect
             </label>
             <input 
                type="range" 
                min="0" 
                max="1" 
                step="0.01" 
                value={lift}
                onChange={(e) => setLift(parseFloat(e.target.value))}
                className="w-full h-1 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-indigo-500"
             />
             <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                 <span>Flat (2D)</span>
                 <span>Lifted (3D)</span>
             </div>
          </div>
      </div>

      {/* Coordinate Display (Bottom Left) */}
      {hoverLoc && hoverZ !== null && (
        <div className="absolute bottom-2 left-2 z-10 pointer-events-none">
             <div className="bg-slate-900/90 backdrop-blur border border-emerald-500/50 shadow-lg rounded-lg p-3 text-sm font-mono">
                <div className="text-xs text-emerald-400 uppercase font-bold mb-1 border-b border-emerald-900/50 pb-1">Live Coordinates</div>
                <div className="flex flex-col space-y-1">
                    <div className="flex justify-between w-32">
                        <span className="text-slate-400">X:</span>
                        <span className="text-white">{hoverLoc.x.toFixed(3)}</span>
                    </div>
                    <div className="flex justify-between w-32">
                        <span className="text-slate-400">Y:</span>
                        <span className="text-white">{hoverLoc.y.toFixed(3)}</span>
                    </div>
                    <div className="flex justify-between w-32 bg-white/5 rounded px-1">
                        <span className="text-amber-400 font-bold">Z:</span>
                        <span className={`font-bold ${hoverZ > 0 ? 'text-blue-400' : 'text-red-400'}`}>
                            {hoverZ > 0 ? '+' : ''}{hoverZ.toFixed(3)}
                        </span>
                    </div>
                </div>
             </div>
        </div>
      )}

      <canvas 
        ref={canvasRef} 
        width={600} 
        height={500} 
        className={`w-full h-full object-cover ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => { handleMouseUp(); if(onHover) onHover(null); }}
      />
      
      {!hoverLoc && (
          <div className="absolute bottom-2 left-2 text-[10px] text-slate-500 pointer-events-none transition-opacity opacity-50 group-hover:opacity-100">
            Drag to Rotate • Hover Mesh to Probe
          </div>
      )}
    </div>
  );
};

export default Surface3D;