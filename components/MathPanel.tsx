import React, { useMemo, useState, useEffect } from 'react';
import { DataPoint, PointClass } from '../types';
import { calculateDecisionValue } from '../utils/mathUtils';

interface MathPanelProps {
    points: DataPoint[];
    gamma: number;
    hoverLoc: { x: number, y: number } | null;
}

const MathPanel: React.FC<MathPanelProps> = ({ points, gamma, hoverLoc }) => {
    const [selectedPointId, setSelectedPointId] = useState<string | null>(null);
    const [hoveredTermId, setHoveredTermId] = useState<string | null>(null);

    // Reset selection if points are cleared or the selected point is removed
    useEffect(() => {
        if (selectedPointId && !points.find(p => p.id === selectedPointId)) {
            setSelectedPointId(null);
        }
    }, [points, selectedPointId]);

    // Determine where we are calculating Z
    const inspectTarget = useMemo(() => {
        // 1. Locked Selection
        if (selectedPointId) {
            const p = points.find(pt => pt.id === selectedPointId);
            if (p) return { x: p.x, y: p.y, type: 'selected', id: p.id };
        }
        // 2. Canvas Hover
        if (hoverLoc) return { x: hoverLoc.x, y: hoverLoc.y, type: 'cursor' };
        
        // 3. Default (Last Added)
        if (points.length > 0) {
            const last = points[points.length - 1];
            return { x: last.x, y: last.y, type: 'point', id: last.id };
        }
        return null;
    }, [hoverLoc, points, selectedPointId]);

    // Calculate contributions for the target location
    const contributions = useMemo(() => {
        if (!inspectTarget) return [];
        
        const details = points.map((p, idx) => {
            const distSq = (p.x - inspectTarget.x)**2 + (p.y - inspectTarget.y)**2;
            // RBF Kernel Formula
            const kernelVal = Math.exp(-gamma * distSq);
            const weightedVal = p.label * kernelVal;
            
            const isTargetSelf = ('id' in inspectTarget) && inspectTarget.id === p.id;
            
            return {
                id: p.id,
                idx: idx + 1,
                label: p.label,
                distSq,
                dist: Math.sqrt(distSq),
                kernelVal,
                weightedVal,
                isTargetSelf
            };
        });

        // Sort by absolute influence
        return details.sort((a, b) => Math.abs(b.weightedVal) - Math.abs(a.weightedVal));
    }, [points, gamma, inspectTarget]);

    const totalDecision = useMemo(() => {
        if (!inspectTarget) return 0;
        return calculateDecisionValue(inspectTarget.x, inspectTarget.y, points, gamma);
    }, [inspectTarget, points, gamma]);

    // Determine which term to show in the "Detailed Breakdown" card
    const breakdownTerm = useMemo(() => {
        if (contributions.length === 0) return null;

        // 1. If user is hovering a row in the list, show that one
        if (hoveredTermId) {
            return contributions.find(c => c.id === hoveredTermId) || null;
        }

        // 2. If we are inspecting a specific point (Self)...
        if (inspectTarget && 'id' in inspectTarget) {
            // The top contributor is likely itself (Dist=0, Val=1). This is boring math.
            // Try to show the SECOND highest contributor (Strongest Neighbor) if available.
            if (contributions.length > 1 && contributions[0].isTargetSelf) {
                return contributions[1]; 
            }
        }

        // 3. Default to top contributor
        return contributions[0];
    }, [contributions, hoveredTermId, inspectTarget]);


    if (!inspectTarget) {
        return (
            <div className="bg-slate-800 border border-slate-700 rounded-lg h-full flex items-center justify-center p-8 text-slate-500 text-center shadow-xl">
                <div className="space-y-2">
                    <svg className="w-12 h-12 mx-auto opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                    <p>Add points to see the math engine.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-slate-800 border border-slate-700 rounded-lg flex flex-col h-[600px] shadow-xl overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-slate-700 bg-slate-900/50">
                <div className="flex justify-between items-start">
                    <div>
                        <h2 className="text-lg font-bold text-white flex items-center gap-2">
                            <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                            </svg>
                            Math Inspector
                        </h2>
                        <div className="text-xs text-slate-400 mt-1 flex items-center gap-2">
                            Target: 
                            <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wide transition-colors ${
                                inspectTarget.type === 'selected' 
                                    ? 'bg-indigo-900 text-indigo-300 ring-1 ring-indigo-500' 
                                    : inspectTarget.type === 'cursor' 
                                        ? 'bg-emerald-900 text-emerald-300' 
                                        : 'bg-amber-900 text-amber-300'
                            }`}>
                                {inspectTarget.type === 'selected' 
                                    ? 'Fixed Point' 
                                    : inspectTarget.type === 'cursor' 
                                        ? 'Cursor' 
                                        : 'Latest Point'}
                            </span>
                        </div>
                    </div>
                    {selectedPointId && (
                        <button 
                            onClick={() => setSelectedPointId(null)}
                            className="text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 px-2 py-1 rounded border border-slate-600 transition-colors"
                        >
                            Unlock
                        </button>
                    )}
                </div>
            </div>

            {/* Full Calculation Breakdown */}
            <div className="p-4 bg-slate-950 border-b border-slate-700 space-y-4">
                
                {/* 1. The Summation Equation */}
                <div className="space-y-1">
                    <div className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Equation Expansion</div>
                    <div className="bg-slate-900 p-3 rounded font-mono text-xs overflow-x-auto whitespace-nowrap custom-scrollbar border border-slate-800">
                        <span className="text-amber-500 font-bold mr-2">Z =</span>
                        {contributions.map((c, i) => (
                            <span key={c.id} className="inline-block">
                                {i > 0 && <span className="text-slate-600 mx-1">+</span>}
                                <span 
                                    onMouseEnter={() => setHoveredTermId(c.id)}
                                    onMouseLeave={() => setHoveredTermId(null)}
                                    className={`relative cursor-help inline-block rounded px-1 transition-colors border border-transparent
                                        ${hoveredTermId === c.id ? 'bg-slate-800 border-slate-600' : 'hover:bg-slate-800'}
                                    `}
                                >
                                    <span className={c.label === 1 ? "text-blue-400" : "text-red-400"}>
                                        ({c.label === 1 ? "+1" : "-1"} &middot; {c.kernelVal.toFixed(2)})
                                    </span>
                                </span>
                            </span>
                        ))}
                        <div className="mt-2 pt-2 border-t border-slate-800 flex items-center">
                            <span className="text-slate-500 mr-2">=</span>
                            <span className={`text-lg font-bold ${totalDecision > 0 ? "text-blue-400" : "text-red-400"}`}>
                                {totalDecision > 0 ? '+' : ''}{totalDecision.toFixed(4)}
                            </span>
                            <span className="ml-2 text-[10px] text-slate-600">(Decision Value)</span>
                        </div>
                    </div>
                </div>

                {/* 2. Detailed Kernel Breakdown */}
                {breakdownTerm ? (
                    <div className="space-y-2 mt-2">
                        <div className="flex justify-between items-end border-b border-slate-800 pb-1">
                            <div className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">
                                Detailed Step-by-Step: <span className="text-slate-300">Pt #{breakdownTerm.idx}</span>
                                {breakdownTerm.isTargetSelf && <span className="ml-2 text-indigo-400 normal-case opacity-75">(Self-Influence)</span>}
                            </div>
                            <div className="text-[10px] text-slate-600">
                                Hover list to inspect others
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-1 gap-2 text-xs font-mono">
                            
                            {/* Step 1: Distance */}
                            <div className="flex items-center justify-between p-2 bg-slate-900 rounded border border-slate-800/50">
                                <div className="flex flex-col">
                                    <span className="text-slate-400 font-sans font-bold text-[10px] uppercase">Step 1: Distance</span>
                                    <span className="text-slate-500">
                                        {breakdownTerm.isTargetSelf ? "Distance to self is zero" : "Distance from target to point"}
                                    </span>
                                </div>
                                <div className="text-right">
                                    <span className="text-slate-600 mr-2">d =</span>
                                    <span className="text-white font-bold">{breakdownTerm.dist.toFixed(3)}</span>
                                </div>
                            </div>

                            {/* Step 2: Squared & Gamma */}
                            <div className="flex items-center justify-between p-2 bg-slate-900 rounded border border-slate-800/50">
                                <div className="flex flex-col">
                                    <span className="text-slate-400 font-sans font-bold text-[10px] uppercase">Step 2: Gamma Scale</span>
                                    <span className="text-slate-500">Square distance & apply γ</span>
                                </div>
                                <div className="text-right">
                                    <span className="text-slate-600 mr-2">-γ·d² =</span>
                                    <span className="text-amber-400 font-bold">{(-gamma * breakdownTerm.distSq).toFixed(3)}</span>
                                </div>
                            </div>

                            {/* Step 3: Exponentiation */}
                            <div className={`flex items-center justify-between p-2 rounded border shadow-inner transition-colors ${
                                breakdownTerm.isTargetSelf ? 'bg-indigo-900/20 border-indigo-500/30' : 'bg-slate-800/80 border-indigo-500/30'
                            }`}>
                                <div className="flex flex-col">
                                    <span className="text-indigo-300 font-sans font-bold text-[10px] uppercase">Step 3: Gaussian</span>
                                    <span className="text-indigo-400/60">Apply e^x function</span>
                                </div>
                                <div className="text-right">
                                    <span className="text-slate-500 mr-1">K = e^<span className="text-amber-500/70">{(-gamma * breakdownTerm.distSq).toFixed(1)}</span> =</span>
                                    <span className="text-emerald-400 font-bold text-sm">{breakdownTerm.kernelVal.toFixed(5)}</span>
                                </div>
                            </div>

                        </div>
                    </div>
                ) : (
                    <div className="p-4 text-center text-slate-600 text-xs italic">
                        No visible contributions
                    </div>
                )}
            </div>

            {/* List Header */}
            <div className="grid grid-cols-12 gap-2 px-4 py-2 bg-slate-800 text-[10px] uppercase text-slate-500 font-semibold tracking-wider border-b border-slate-700">
                <div className="col-span-2">Pt</div>
                <div className="col-span-2 text-right">Lbl</div>
                <div className="col-span-3 text-right">Dist(d)</div>
                <div className="col-span-2 text-right">Sim(K)</div>
                <div className="col-span-3 text-right">Vote</div>
            </div>

            {/* Scrollable List */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
                {contributions.map((c) => {
                    const isSelected = selectedPointId === c.id;
                    const isHovered = hoveredTermId === c.id;
                    
                    return (
                        <div 
                            key={c.id} 
                            onClick={() => setSelectedPointId(isSelected ? null : c.id)}
                            onMouseEnter={() => setHoveredTermId(c.id)}
                            onMouseLeave={() => setHoveredTermId(null)}
                            className={`grid grid-cols-12 gap-2 px-4 py-2 text-xs border-b border-slate-700/50 cursor-pointer transition-all
                                ${isSelected ? 'bg-indigo-900/40 border-indigo-500/50' : ''}
                                ${!isSelected && isHovered ? 'bg-slate-700/60' : ''}
                                ${!isSelected && !isHovered ? 'hover:bg-slate-700/40' : ''}
                                ${c.isTargetSelf ? 'bg-white/5' : ''}
                            `}
                        >
                            <div className="col-span-2 font-mono text-slate-400 flex items-center gap-1">
                                #{c.idx}
                                {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse"></span>}
                            </div>
                            <div className={`col-span-2 text-right font-bold ${c.label === 1 ? 'text-blue-400' : 'text-red-400'}`}>
                                {c.label === 1 ? '+1' : '-1'}
                            </div>
                            <div className="col-span-3 text-right font-mono text-slate-300">
                                {c.dist.toFixed(2)}
                            </div>
                            <div className="col-span-2 text-right font-mono text-emerald-400">
                                {c.kernelVal.toFixed(2)}
                            </div>
                            <div className="col-span-3 text-right font-mono relative">
                                <span className={c.weightedVal > 0 ? 'text-blue-400' : 'text-red-400'}>
                                    {c.weightedVal > 0 ? '+' : ''}{c.weightedVal.toFixed(2)}
                                </span>
                                {/* Visual Bar */}
                                <div 
                                    className={`absolute bottom-0 right-0 h-[2px] opacity-50 ${c.weightedVal > 0 ? 'bg-blue-500' : 'bg-red-500'}`}
                                    style={{ width: `${Math.min(Math.abs(c.weightedVal) * 100, 100)}%` }}
                                />
                            </div>
                        </div>
                    );
                })}
            </div>
             
             {/* Footer Info */}
             <div className="p-2 bg-slate-900 text-[10px] text-slate-500 text-center border-t border-slate-700 flex justify-between px-4">
                <span>Click row to lock Target</span>
                <span>Hover row to inspect Term</span>
             </div>
        </div>
    );
};

export default MathPanel;