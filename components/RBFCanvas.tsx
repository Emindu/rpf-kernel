import React, { useRef, useEffect, useState } from 'react';
import { DataPoint, PointClass } from '../types';
import { calculateDecisionValue } from '../utils/mathUtils';

interface RBFCanvasProps {
  points: DataPoint[];
  gamma: number;
  activeClass: PointClass;
  onAddPoint: (p: DataPoint) => void;
  onHover?: (pos: {x: number, y: number} | null) => void;
  externalHover?: {x: number, y: number} | null;
}

const RBFCanvas: React.FC<RBFCanvasProps> = ({ points, gamma, activeClass, onAddPoint, onHover, externalHover }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hoverPos, setHoverPos] = useState<{x: number, y: number} | null>(null);
  
  // View Transformation State
  const [view, setView] = useState({ scale: 1, offsetX: 0, offsetY: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [hasMoved, setHasMoved] = useState(false);

  // Helper to get mouse coordinates relative to canvas internal resolution
  const getMousePos = (e: React.MouseEvent | React.WheelEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };
      const rect = canvas.getBoundingClientRect();
      return {
          x: (e.clientX - rect.left) * (canvas.width / rect.width),
          y: (e.clientY - rect.top) * (canvas.height / rect.height)
      };
  };

  // Draw the heatmap and points
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // 1. Clear & Prepare
    ctx.clearRect(0, 0, width, height);
    const resolution = 8; // Low res for performance
    const imgData = ctx.createImageData(width, height);
    const data = imgData.data;

    // 2. Draw Infinite Heatmap
    // Iterate over screen pixels
    for (let y = 0; y < height; y += resolution) {
      for (let x = 0; x < width; x += resolution) {
        // Convert Screen Pixel -> World Coordinate (normalized 0-1 base)
        const wx = (x - view.offsetX) / (width * view.scale);
        const wy = (y - view.offsetY) / (height * view.scale);
        
        const val = calculateDecisionValue(wx, wy, points, gamma);
        
        // Color Logic
        let r, g, b, a;
        const intensity = Math.min(Math.abs(val), 1.5); 
        
        if (val > 0.02) {
           r = 59; g = 130; b = 246; a = 50 + (intensity * 150);
        } else if (val < -0.02) {
           r = 239; g = 68; b = 68; a = 50 + (intensity * 150);
        } else {
           r = 255; g = 255; b = 255; a = 200; // Boundary
        }

        // Fill the pixel block
        for (let dy = 0; dy < resolution; dy++) {
           for (let dx = 0; dx < resolution; dx++) {
              if (x + dx < width && y + dy < height) {
                 const idx = 4 * ((y + dy) * width + (x + dx));
                 data[idx] = r; data[idx + 1] = g; data[idx + 2] = b; data[idx + 3] = a;
              }
           }
        }
      }
    }
    ctx.putImageData(imgData, 0, 0);

    // 3. Draw Data Boundaries ([0,1] Unit Square)
    const originX = view.offsetX;
    const originY = view.offsetY;
    const unitW = width * view.scale;
    const unitH = height * view.scale;

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 2;
    ctx.strokeRect(originX, originY, unitW, unitH);

    // 4. Draw Grid inside unit square
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.lineWidth = 1;
    const step = 0.1;
    
    // Clip grid to unit square
    ctx.save();
    ctx.beginPath();
    ctx.rect(originX, originY, unitW, unitH);
    ctx.clip();

    for(let i = 0; i <= 1.001; i += step) {
        // Verticals
        const xPos = originX + i * unitW;
        ctx.beginPath(); ctx.moveTo(xPos, originY); ctx.lineTo(xPos, originY + unitH); ctx.stroke();
        // Horizontals
        const yPos = originY + i * unitH;
        ctx.beginPath(); ctx.moveTo(originX, yPos); ctx.lineTo(originX + unitW, yPos); ctx.stroke();
    }
    ctx.restore();

    // 5. Draw Points
    points.forEach(p => {
      const px = p.x * unitW + originX;
      const py = p.y * unitH + originY;
      
      ctx.beginPath();
      ctx.arc(px, py, 6 * Math.sqrt(Math.max(0.5, view.scale)), 0, Math.PI * 2);
      ctx.fillStyle = p.label === PointClass.RED ? '#ef4444' : '#3b82f6';
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();
      
      // Influence Ring (Scales with zoom)
      const rWorld = Math.sqrt(1/gamma) * 0.5;
      ctx.beginPath();
      ctx.arc(px, py, rWorld * unitW, 0, Math.PI * 2);
      ctx.strokeStyle = p.label === PointClass.RED ? 'rgba(239, 68, 68, 0.3)' : 'rgba(59, 130, 246, 0.3)';
      ctx.stroke();
    });

    // 6. Hover Cursor (Internal or External)
    // Prioritize internal hover for responsiveness, fall back to external for sync
    const activeCursor = hoverPos || (externalHover ? {
        x: externalHover.x * unitW + originX,
        y: externalHover.y * unitH + originY
    } : null);

    if (activeCursor) {
      ctx.beginPath();
      ctx.arc(activeCursor.x, activeCursor.y, 6, 0, Math.PI * 2);
      ctx.strokeStyle = activeClass === PointClass.RED ? '#ef4444' : '#3b82f6';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 2]);
      ctx.stroke();
      ctx.setLineDash([]);
    }

  }, [points, gamma, hoverPos, activeClass, view, externalHover]);


  // Interaction Handlers
  const handleWheel = (e: React.WheelEvent) => {
      e.preventDefault();
      const zoomIntensity = 0.0015;
      const delta = -e.deltaY * zoomIntensity;
      // Limit zoom
      const newScale = Math.min(Math.max(0.2, view.scale + delta), 10);
      
      const m = getMousePos(e);
      const canvas = canvasRef.current!;
      
      const wx = (m.x - view.offsetX) / (canvas.width * view.scale);
      const wy = (m.y - view.offsetY) / (canvas.height * view.scale);

      const newOffX = m.x - wx * canvas.width * newScale;
      const newOffY = m.y - wy * canvas.height * newScale;

      setView({ scale: newScale, offsetX: newOffX, offsetY: newOffY });
      
      // Report hover during zoom
      if (onHover) onHover({ x: wx, y: wy });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
      setIsDragging(true);
      setHasMoved(false);
      const m = getMousePos(e);
      setDragStart(m);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
      const m = getMousePos(e);
      
      // Only set internal hover if we are interacting with this canvas directly
      setHoverPos(m);

      const canvas = canvasRef.current;
      if (canvas && onHover) {
          const wx = (m.x - view.offsetX) / (canvas.width * view.scale);
          const wy = (m.y - view.offsetY) / (canvas.height * view.scale);
          onHover({ x: wx, y: wy });
      }

      if (isDragging) {
          const dx = m.x - dragStart.x;
          const dy = m.y - dragStart.y;
          if (dx*dx + dy*dy > 9) setHasMoved(true); 

          setView(prev => ({
              ...prev,
              offsetX: prev.offsetX + dx,
              offsetY: prev.offsetY + dy
          }));
          setDragStart(m);
      }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
      setIsDragging(false);
      
      if (!hasMoved) {
          const m = getMousePos(e);
          const canvas = canvasRef.current!;
          
          const wx = (m.x - view.offsetX) / (canvas.width * view.scale);
          const wy = (m.y - view.offsetY) / (canvas.height * view.scale);
          
          onAddPoint({
              id: Math.random().toString(36).substr(2, 9),
              x: wx,
              y: wy,
              label: activeClass
          });
      }
  };

  const zoomCenter = (factor: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;
      const newScale = Math.min(Math.max(0.2, view.scale * factor), 10);
      
      const ratio = newScale / view.scale;
      
      setView(prev => ({
          scale: newScale,
          offsetX: cx - (cx - prev.offsetX) * ratio,
          offsetY: cy - (cy - prev.offsetY) * ratio
      }));
  };

  const resetView = () => setView({ scale: 1, offsetX: 0, offsetY: 0 });

  return (
    <div className="relative rounded-lg overflow-hidden shadow-2xl border border-slate-700 bg-slate-900 group">
        <canvas 
          ref={canvasRef} 
          width={500} 
          height={500}
          className={`w-full h-auto ${isDragging ? 'cursor-grabbing' : 'cursor-crosshair'} touch-none`}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={() => { 
              setHoverPos(null); 
              setIsDragging(false); 
              // Don't clear global hover here immediately, handled by App or let it linger for a moment
              if(onHover) onHover(null);
          }}
        />
        
        {/* Instructions Overlay */}
        <div className="absolute top-2 left-2 pointer-events-none flex flex-col gap-1">
            <div className="bg-black/60 backdrop-blur text-xs text-white px-2 py-1 rounded">
                Top-Down View
            </div>
            <div className="bg-black/40 backdrop-blur text-[10px] text-slate-300 px-2 py-1 rounded hidden group-hover:block transition-opacity">
                Scroll to Zoom • Drag to Pan • Click to Add
            </div>
        </div>

        {/* Zoom Controls */}
        <div className="absolute bottom-4 right-4 flex flex-col gap-2">
            <div className="flex flex-col bg-slate-800 rounded-lg border border-slate-700 shadow-lg overflow-hidden">
                <button 
                    onClick={() => zoomCenter(1.2)}
                    className="p-2 hover:bg-indigo-600 text-white border-b border-slate-700 transition-colors"
                    title="Zoom In"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                </button>
                <button 
                    onClick={() => zoomCenter(0.8333)}
                    className="p-2 hover:bg-indigo-600 text-white transition-colors"
                    title="Zoom Out"
                >
                     <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                    </svg>
                </button>
            </div>
            <button 
                onClick={resetView}
                className="bg-slate-800 hover:bg-slate-700 text-xs text-white px-3 py-1.5 rounded shadow border border-slate-700 transition-colors"
            >
                Reset
            </button>
        </div>
    </div>
  );
};

export default RBFCanvas;