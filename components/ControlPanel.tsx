import React from 'react';
import { PointClass } from '../types';

interface ControlPanelProps {
    gamma: number;
    setGamma: (val: number) => void;
    activeClass: PointClass;
    setActiveClass: (c: PointClass) => void;
    onReset: () => void;
}

const ControlPanel: React.FC<ControlPanelProps> = ({
    gamma,
    setGamma,
    activeClass,
    setActiveClass,
    onReset
}) => {
    return (
        <div className="bg-slate-800 p-4 rounded-lg border border-slate-700 space-y-6">
            <div>
                <label className="block text-sm font-medium text-slate-300 mb-2 flex justify-between">
                    <span>Gamma (γ)</span>
                    <span className="text-cyan-400 font-mono">{gamma.toFixed(1)}</span>
                </label>
                <input 
                    type="range" 
                    min="1" 
                    max="100" 
                    step="1" 
                    value={gamma}
                    onChange={(e) => setGamma(Number(e.target.value))}
                    className="w-full h-2 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                />
                <p className="text-xs text-slate-500 mt-1">
                    Controls the "width" of the RBF bell curve. Higher γ = Narrower influence.
                </p>
            </div>

            <div>
                <span className="block text-sm font-medium text-slate-300 mb-2">Active Class</span>
                <div className="flex space-x-2">
                    <button 
                        onClick={() => setActiveClass(PointClass.BLUE)}
                        className={`flex-1 py-2 rounded-md font-semibold transition-colors ${
                            activeClass === PointClass.BLUE 
                            ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30' 
                            : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                        }`}
                    >
                        Blue (+1)
                    </button>
                    <button 
                        onClick={() => setActiveClass(PointClass.RED)}
                        className={`flex-1 py-2 rounded-md font-semibold transition-colors ${
                            activeClass === PointClass.RED 
                            ? 'bg-red-500 text-white shadow-lg shadow-red-500/30' 
                            : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                        }`}
                    >
                        Red (-1)
                    </button>
                </div>
            </div>

            <div className="pt-2 border-t border-slate-700">
                <button 
                    onClick={onReset}
                    className="w-full py-2 text-sm text-slate-300 hover:text-white hover:bg-slate-700 rounded transition-colors"
                >
                    Clear All Points
                </button>
            </div>
            
            <div className="bg-slate-900/50 p-3 rounded text-xs text-slate-400 font-mono border border-slate-700/50">
                K(x, x') = exp(-γ||x - x'||²)
            </div>
        </div>
    );
};

export default ControlPanel;