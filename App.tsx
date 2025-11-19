import React, { useState, useCallback } from 'react';
import RBFCanvas from './components/RBFCanvas';
import Surface3D from './components/Surface3D';
import ControlPanel from './components/ControlPanel';
import MathPanel from './components/MathPanel';
import { DataPoint, PointClass } from './types';

const App: React.FC = () => {
  const [points, setPoints] = useState<DataPoint[]>([
    { id: '1', x: 0.3, y: 0.3, label: PointClass.BLUE },
    { id: '2', x: 0.7, y: 0.7, label: PointClass.RED },
    { id: '3', x: 0.5, y: 0.5, label: PointClass.BLUE },
  ]);
  const [gamma, setGamma] = useState<number>(30);
  const [activeClass, setActiveClass] = useState<PointClass>(PointClass.BLUE);
  const [hoverLoc, setHoverLoc] = useState<{x: number, y: number} | null>(null);

  const handleAddPoint = useCallback((newPoint: DataPoint) => {
    setPoints(prev => [...prev, newPoint]);
  }, []);

  const handleReset = () => setPoints([]);

  return (
    <div className="w-full min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      
      {/* Header */}
      <div className="max-w-[1600px] mx-auto w-full p-4 md:p-8 pb-4">
        <header className="mb-8 md:mb-12 text-center md:text-left border-b border-slate-800 pb-6">
          <h1 className="text-3xl md:text-5xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-500 mb-4">
            RBF Kernel Explorer
          </h1>
          <p className="text-slate-400 max-w-3xl text-lg leading-relaxed">
            An interactive laboratory to understand how Support Vector Machines use the 
            <span className="text-cyan-400 font-mono mx-1">Radial Basis Function</span> 
            to lift non-linear data into higher dimensions.
          </p>
        </header>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
          
          {/* Left Column: Controls */}
          <div className="xl:col-span-3 space-y-6">
            <ControlPanel 
              gamma={gamma} 
              setGamma={setGamma}
              activeClass={activeClass}
              setActiveClass={setActiveClass}
              onReset={handleReset}
            />
            
            <div className="bg-slate-900 p-5 rounded-lg border border-slate-800 shadow-lg">
              <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">Dataset Metrics</h3>
              <div className="space-y-3 text-sm">
                  <div className="flex justify-between items-center bg-slate-800/50 p-2 rounded">
                      <span className="text-blue-400 font-medium">Blue Class (+1)</span>
                      <span className="font-mono bg-blue-900/30 text-blue-200 px-2 py-0.5 rounded">{points.filter(p => p.label === PointClass.BLUE).length}</span>
                  </div>
                  <div className="flex justify-between items-center bg-slate-800/50 p-2 rounded">
                      <span className="text-red-400 font-medium">Red Class (-1)</span>
                      <span className="font-mono bg-red-900/30 text-red-200 px-2 py-0.5 rounded">{points.filter(p => p.label === PointClass.RED).length}</span>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-800 text-xs text-slate-500">
                      Each point acts as a center for a Gaussian distribution. The sum of these Gaussians creates the decision surface.
                  </div>
              </div>
            </div>
          </div>

          {/* Middle Column: Visualization */}
          <div className="xl:col-span-6 space-y-8">
            <div className="space-y-2">
               <h3 className="text-lg font-semibold text-white flex items-center">
                  <span className="w-2 h-8 bg-cyan-500 rounded-full mr-3"></span>
                  Input Space (2D)
               </h3>
               <div className="h-[400px] md:h-[500px] w-full">
                 <RBFCanvas 
                    points={points} 
                    gamma={gamma}
                    activeClass={activeClass}
                    onAddPoint={handleAddPoint}
                    onHover={setHoverLoc}
                    externalHover={hoverLoc}
                 />
               </div>
            </div>

            <div className="space-y-2">
               <h3 className="text-lg font-semibold text-white flex items-center">
                  <span className="w-2 h-8 bg-indigo-500 rounded-full mr-3"></span>
                  Feature Space (3D Projection)
               </h3>
               <div className="h-[400px] md:h-[500px] w-full">
                <Surface3D 
                    points={points}
                    gamma={gamma}
                    hoverLoc={hoverLoc}
                    onHover={setHoverLoc}
                />
               </div>
            </div>
          </div>

          {/* Right Column: Math Inspector */}
          <div className="xl:col-span-3">
             <div className="sticky top-8">
                 <MathPanel 
                    points={points} 
                    gamma={gamma}
                    hoverLoc={hoverLoc}
                 />
             </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default App;