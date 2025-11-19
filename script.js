/**
 * RBF Kernel Explorer - Vanilla JS Implementation
 */

// --- Constants ---
const PointClass = {
    RED: -1,
    BLUE: 1
};

// --- State Management ---
const state = {
    points: [
        { id: '1', x: 0.3, y: 0.3, label: 1 },
        { id: '2', x: 0.7, y: 0.7, label: -1 },
        { id: '3', x: 0.5, y: 0.5, label: 1 }
    ],
    gamma: 30,
    activeClass: 1, // Default Blue
    hoverLoc: null, // {x, y} from canvas interactions
    selectedPointId: null,
    hoveredTermId: null, // For math inspector
    
    // 2D View State
    view2D: { scale: 1, offsetX: 0, offsetY: 0 },
    
    // 3D View State
    rot3D: { x: 0.7, z: 0.5 },
    lift: 0.5
};

// --- Math Utils ---

const rbfKernel = (x1, y1, x2, y2, gamma) => {
    const distSq = (x1 - x2) ** 2 + (y1 - y2) ** 2;
    return Math.exp(-gamma * distSq);
};

const calculateDecisionValue = (x, y, points, gamma) => {
    let sum = 0;
    for (const point of points) {
        sum += point.label * rbfKernel(x, y, point.x, point.y, gamma);
    }
    return sum;
};

// --- Elements ---
const els = {
    canvas2D: document.getElementById('canvas-2d'),
    canvas3D: document.getElementById('canvas-3d'),
    gammaSlider: document.getElementById('gamma-slider'),
    gammaVal: document.getElementById('gamma-val'),
    btnBlue: document.getElementById('btn-class-blue'),
    btnRed: document.getElementById('btn-class-red'),
    btnReset: document.getElementById('btn-reset'),
    countBlue: document.getElementById('count-blue'),
    countRed: document.getElementById('count-red'),
    btnZoomIn: document.getElementById('btn-zoom-in'),
    btnZoomOut: document.getElementById('btn-zoom-out'),
    btnZoomReset: document.getElementById('btn-zoom-reset'),
    liftSlider: document.getElementById('lift-slider'),
    mathContent: document.getElementById('math-content'),
    targetBadge: document.getElementById('target-badge'),
    btnUnlock: document.getElementById('btn-unlock'),
    coordDisplay: document.getElementById('coord-display'),
    rotateHint: document.getElementById('rotate-hint'),
    valX: document.getElementById('val-x'),
    valY: document.getElementById('val-y'),
    valZ: document.getElementById('val-z'),
};

// --- 2D Canvas Logic ---

function draw2D() {
    const canvas = els.canvas2D;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const { scale, offsetX, offsetY } = state.view2D;

    ctx.clearRect(0, 0, width, height);
    
    // 1. Heatmap
    const resolution = 8;
    const imgData = ctx.createImageData(width, height);
    const data = imgData.data;

    for (let y = 0; y < height; y += resolution) {
        for (let x = 0; x < width; x += resolution) {
            // Screen to World
            const wx = (x - offsetX) / (width * scale);
            const wy = (y - offsetY) / (height * scale);
            
            const val = calculateDecisionValue(wx, wy, state.points, state.gamma);
            
            let r, g, b, a;
            const intensity = Math.min(Math.abs(val), 1.5);
            
            if (val > 0.02) {
                r = 59; g = 130; b = 246; a = 50 + (intensity * 150);
            } else if (val < -0.02) {
                r = 239; g = 68; b = 68; a = 50 + (intensity * 150);
            } else {
                r = 255; g = 255; b = 255; a = 200;
            }

            // Block fill
            for (let dy = 0; dy < resolution; dy++) {
                for (let dx = 0; dx < resolution; dx++) {
                    if (x + dx < width && y + dy < height) {
                        const idx = 4 * ((y + dy) * width + (x + dx));
                        data[idx] = r; data[idx+1] = g; data[idx+2] = b; data[idx+3] = a;
                    }
                }
            }
        }
    }
    ctx.putImageData(imgData, 0, 0);

    // 2. Unit Square Boundary
    const unitW = width * scale;
    const unitH = height * scale;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 2;
    ctx.strokeRect(offsetX, offsetY, unitW, unitH);

    // 3. Grid
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.lineWidth = 1;
    ctx.save();
    ctx.beginPath();
    ctx.rect(offsetX, offsetY, unitW, unitH);
    ctx.clip();
    const step = 0.1;
    for(let i = 0; i <= 1.001; i += step) {
        const xPos = offsetX + i * unitW;
        ctx.beginPath(); ctx.moveTo(xPos, offsetY); ctx.lineTo(xPos, offsetY + unitH); ctx.stroke();
        const yPos = offsetY + i * unitH;
        ctx.beginPath(); ctx.moveTo(offsetX, yPos); ctx.lineTo(offsetX + unitW, yPos); ctx.stroke();
    }
    ctx.restore();

    // 4. Points
    state.points.forEach(p => {
        const px = p.x * unitW + offsetX;
        const py = p.y * unitH + offsetY;
        
        ctx.beginPath();
        ctx.arc(px, py, 6 * Math.sqrt(Math.max(0.5, scale)), 0, Math.PI * 2);
        ctx.fillStyle = p.label === PointClass.RED ? '#ef4444' : '#3b82f6';
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Influence Ring
        const rWorld = Math.sqrt(1/state.gamma) * 0.5;
        ctx.beginPath();
        ctx.arc(px, py, rWorld * unitW, 0, Math.PI * 2);
        ctx.strokeStyle = p.label === PointClass.RED ? 'rgba(239, 68, 68, 0.3)' : 'rgba(59, 130, 246, 0.3)';
        ctx.stroke();
    });

    // 5. Hover
    if (state.hoverLoc) {
        const px = state.hoverLoc.x * unitW + offsetX;
        const py = state.hoverLoc.y * unitH + offsetY;
        
        ctx.beginPath();
        ctx.arc(px, py, 6, 0, Math.PI * 2);
        ctx.strokeStyle = state.activeClass === PointClass.RED ? '#ef4444' : '#3b82f6';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 2]);
        ctx.stroke();
        ctx.setLineDash([]);
    }
}

// --- 3D Canvas Logic ---

let hitMap3D = []; // Stores projected points for hit testing

function draw3D() {
    const canvas = els.canvas3D;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    ctx.clearRect(0, 0, width, height);
    
    const rows = 30;
    const cols = 30;
    const scale = 200;
    const centerX = width / 2;
    const centerY = height / 2 + 50;

    hitMap3D = []; // clear

    const project = (x, y, z) => {
        // Rotation Z
        const x1 = x * Math.cos(state.rot3D.z) - y * Math.sin(state.rot3D.z);
        const y1 = x * Math.sin(state.rot3D.z) + y * Math.cos(state.rot3D.z);
        
        // Lift & Rotation X
        const effZ = z * state.lift;
        const y2 = y1 * Math.cos(state.rot3D.x) - effZ * Math.sin(state.rot3D.x);
        
        return {
            x: centerX + x1 * scale,
            y: centerY + y2 * scale
        };
    };

    // Pre-calc Grid
    const grid = [];
    for (let r = 0; r <= rows; r++) {
        for (let c = 0; c <= cols; c++) {
            const nx = c / cols;
            const ny = r / rows;
            const z = calculateDecisionValue(nx, ny, state.points, state.gamma);
            grid.push({ x: nx-0.5, y: ny-0.5, z, nx, ny });
        }
    }

    ctx.lineWidth = 1.5;

    // Draw Grid Lines H
    for (let r = 0; r <= rows; r++) {
        ctx.beginPath();
        for (let c = 0; c <= cols; c++) {
            const p = grid[r*(cols+1) + c];
            const proj = project(p.x, p.y, p.z);
            hitMap3D.push({ sx: proj.x, sy: proj.y, x: p.nx, y: p.ny }); // for hit test
            if (c===0) ctx.moveTo(proj.x, proj.y); else ctx.lineTo(proj.x, proj.y);
        }
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.stroke();
    }
    // Draw Grid Lines V
    for (let c = 0; c <= cols; c++) {
        ctx.beginPath();
        for (let r = 0; r <= rows; r++) {
            const p = grid[r*(cols+1) + c];
            const proj = project(p.x, p.y, p.z);
            if (r===0) ctx.moveTo(proj.x, proj.y); else ctx.lineTo(proj.x, proj.y);
        }
        ctx.stroke();
    }

    // Data Points
    state.points.forEach(pt => {
        const z = calculateDecisionValue(pt.x, pt.y, state.points, state.gamma);
        const ground = project(pt.x-0.5, pt.y-0.5, 0);
        const air = project(pt.x-0.5, pt.y-0.5, z);
        
        hitMap3D.push({ sx: air.x, sy: air.y, x: pt.x, y: pt.y }); // High priority hit

        // Stem
        ctx.beginPath(); ctx.moveTo(ground.x, ground.y); ctx.lineTo(air.x, air.y);
        ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.setLineDash([2, 2]); ctx.stroke(); ctx.setLineDash([]);

        // Point
        ctx.beginPath(); ctx.arc(air.x, air.y, 5, 0, Math.PI*2);
        ctx.fillStyle = pt.label === PointClass.RED ? '#ef4444' : '#3b82f6';
        ctx.fill(); ctx.strokeStyle = '#fff'; ctx.stroke();
    });

    // Hover Highlight
    if (state.hoverLoc) {
        const z = calculateDecisionValue(state.hoverLoc.x, state.hoverLoc.y, state.points, state.gamma);
        const ground = project(state.hoverLoc.x-0.5, state.hoverLoc.y-0.5, 0);
        const air = project(state.hoverLoc.x-0.5, state.hoverLoc.y-0.5, z);
        
        ctx.beginPath(); ctx.moveTo(ground.x, ground.y); ctx.lineTo(air.x, air.y);
        ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 2; ctx.setLineDash([4,3]); ctx.stroke(); ctx.setLineDash([]);
        
        ctx.beginPath(); ctx.arc(air.x, air.y, 6, 0, Math.PI*2);
        ctx.fillStyle = '#fbbf24'; ctx.fill(); ctx.strokeStyle = '#fff'; ctx.stroke();
    }

    // Separating Plane Border
    const corners = [[-0.5,-0.5], [0.5,-0.5], [0.5,0.5], [-0.5,0.5]];
    ctx.beginPath();
    corners.forEach((c, i) => {
        const p = project(c[0], c[1], 0);
        if (i===0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
    });
    ctx.closePath();
    ctx.strokeStyle = 'rgba(100, 200, 255, 0.2)'; ctx.lineWidth = 2; ctx.stroke();
}

// --- Math Panel Logic ---

function renderMathPanel() {
    const points = state.points;
    if (points.length === 0) {
        els.mathContent.innerHTML = `<div class="flex-1 flex items-center justify-center text-slate-500 p-8 text-center"><div class="space-y-2"><p>Add points to see math.</p></div></div>`;
        return;
    }

    // 1. Determine Target
    let target = null;
    if (state.selectedPointId) {
        const p = points.find(pt => pt.id === state.selectedPointId);
        if (p) target = { x: p.x, y: p.y, type: 'selected', id: p.id };
    } else if (state.hoverLoc) {
        target = { x: state.hoverLoc.x, y: state.hoverLoc.y, type: 'cursor' };
    } else {
        const last = points[points.length - 1];
        target = { x: last.x, y: last.y, type: 'point', id: last.id };
    }

    // Update Header Badge
    els.targetBadge.className = `px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wide transition-colors ${
        target.type === 'selected' ? 'bg-indigo-900 text-indigo-300 ring-1 ring-indigo-500' :
        target.type === 'cursor' ? 'bg-emerald-900 text-emerald-300' :
        'bg-amber-900 text-amber-300'
    }`;
    els.targetBadge.textContent = target.type === 'selected' ? 'Fixed Point' : target.type === 'cursor' ? 'Cursor' : 'Latest Point';
    els.btnUnlock.classList.toggle('hidden', target.type !== 'selected');

    // 2. Calculate Contributions
    const contributions = points.map((p, idx) => {
        const distSq = (p.x - target.x)**2 + (p.y - target.y)**2;
        const kernelVal = Math.exp(-state.gamma * distSq);
        const weightedVal = p.label * kernelVal;
        const isTargetSelf = target.id === p.id;
        return { id: p.id, idx: idx+1, label: p.label, dist: Math.sqrt(distSq), distSq, kernelVal, weightedVal, isTargetSelf };
    }).sort((a, b) => Math.abs(b.weightedVal) - Math.abs(a.weightedVal));

    const totalDecision = contributions.reduce((sum, c) => sum + c.weightedVal, 0);

    // 3. Breakdown Term
    let breakdown = contributions[0];
    if (state.hoveredTermId) {
        breakdown = contributions.find(c => c.id === state.hoveredTermId) || breakdown;
    } else if (target.id && contributions.length > 1 && contributions[0].isTargetSelf) {
        breakdown = contributions[1];
    }

    // 4. Generate HTML
    const eqHtml = contributions.map((c, i) => `
        <span class="inline-block">
            ${i > 0 ? '<span class="text-slate-600 mx-1">+</span>' : ''}
            <span class="term-span relative cursor-help inline-block rounded px-1 transition-colors border border-transparent ${state.hoveredTermId === c.id ? 'bg-slate-800 border-slate-600' : 'hover:bg-slate-800'}" data-id="${c.id}">
                <span class="${c.label === 1 ? 'text-blue-400' : 'text-red-400'}">
                    (${c.label === 1 ? '+1' : '-1'} &middot; ${c.kernelVal.toFixed(2)})
                </span>
            </span>
        </span>
    `).join('');

    const breakHtml = breakdown ? `
        <div class="space-y-2 mt-2">
            <div class="flex justify-between items-end border-b border-slate-800 pb-1">
                <div class="text-[10px] text-slate-500 uppercase tracking-wider font-bold">
                    Step-by-Step: <span class="text-slate-300">Pt #${breakdown.idx}</span>
                    ${breakdown.isTargetSelf ? '<span class="ml-2 text-indigo-400 normal-case opacity-75">(Self)</span>' : ''}
                </div>
            </div>
            <div class="grid grid-cols-1 gap-2 text-xs font-mono">
                 <!-- Step 1 -->
                 <div class="flex items-center justify-between p-2 bg-slate-900 rounded border border-slate-800/50">
                    <div class="flex flex-col"><span class="text-slate-400 font-sans font-bold text-[10px] uppercase">Step 1: Distance</span><span class="text-slate-500">d = sqrt((x-x')²+(y-y')²)</span></div>
                    <div class="text-right"><span class="text-slate-600 mr-2">d =</span><span class="text-white font-bold">${breakdown.dist.toFixed(3)}</span></div>
                 </div>
                 <!-- Step 2 -->
                 <div class="flex items-center justify-between p-2 bg-slate-900 rounded border border-slate-800/50">
                    <div class="flex flex-col"><span class="text-slate-400 font-sans font-bold text-[10px] uppercase">Step 2: Gamma Scale</span><span class="text-slate-500">Square & Apply γ</span></div>
                    <div class="text-right"><span class="text-slate-600 mr-2">-γ·d² =</span><span class="text-amber-400 font-bold">${(-state.gamma * breakdown.distSq).toFixed(3)}</span></div>
                 </div>
                 <!-- Step 3 -->
                 <div class="flex items-center justify-between p-2 rounded border shadow-inner transition-colors ${breakdown.isTargetSelf ? 'bg-indigo-900/20 border-indigo-500/30' : 'bg-slate-800/80 border-indigo-500/30'}">
                    <div class="flex flex-col"><span class="text-indigo-300 font-sans font-bold text-[10px] uppercase">Step 3: Gaussian</span><span class="text-indigo-400/60">K = e^(-γ·d²)</span></div>
                    <div class="text-right"><span class="text-emerald-400 font-bold text-sm">${breakdown.kernelVal.toFixed(5)}</span></div>
                 </div>
            </div>
        </div>
    ` : '';

    const listHtml = contributions.map(c => {
        const isSel = state.selectedPointId === c.id;
        const isHov = state.hoveredTermId === c.id;
        return `
        <div class="contribution-row grid grid-cols-12 gap-2 px-4 py-2 text-xs border-b border-slate-700/50 cursor-pointer transition-all ${isSel ? 'bg-indigo-900/40 border-indigo-500/50' : ''} ${!isSel && isHov ? 'bg-slate-700/60' : ''} ${!isSel && !isHov ? 'hover:bg-slate-700/40' : ''}" data-id="${c.id}">
            <div class="col-span-2 font-mono text-slate-400 flex items-center gap-1">#${c.idx} ${isSel ? '<span class="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse"></span>' : ''}</div>
            <div class="col-span-2 text-right font-bold ${c.label === 1 ? 'text-blue-400' : 'text-red-400'}">${c.label === 1 ? '+1' : '-1'}</div>
            <div class="col-span-3 text-right font-mono text-slate-300">${c.dist.toFixed(2)}</div>
            <div class="col-span-2 text-right font-mono text-emerald-400">${c.kernelVal.toFixed(2)}</div>
            <div class="col-span-3 text-right font-mono relative">
                <span class="${c.weightedVal > 0 ? 'text-blue-400' : 'text-red-400'}">${c.weightedVal > 0 ? '+' : ''}${c.weightedVal.toFixed(2)}</span>
                <div class="absolute bottom-0 right-0 h-[2px] opacity-50 ${c.weightedVal > 0 ? 'bg-blue-500' : 'bg-red-500'}" style="width: ${Math.min(Math.abs(c.weightedVal) * 100, 100)}%"></div>
            </div>
        </div>
        `;
    }).join('');

    els.mathContent.innerHTML = `
        <div class="p-4 bg-slate-950 border-b border-slate-700 space-y-4">
            <div class="space-y-1">
                <div class="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Equation Expansion</div>
                <div class="bg-slate-900 p-3 rounded font-mono text-xs overflow-x-auto whitespace-nowrap custom-scrollbar border border-slate-800">
                    <span class="text-amber-500 font-bold mr-2">Z =</span>${eqHtml}
                    <div class="mt-2 pt-2 border-t border-slate-800 flex items-center">
                        <span class="text-slate-500 mr-2">=</span>
                        <span class="text-lg font-bold ${totalDecision > 0 ? 'text-blue-400' : 'text-red-400'}">${totalDecision > 0 ? '+' : ''}${totalDecision.toFixed(4)}</span>
                        <span class="ml-2 text-[10px] text-slate-600">(Decision)</span>
                    </div>
                </div>
            </div>
            ${breakHtml}
        </div>
        <div class="grid grid-cols-12 gap-2 px-4 py-2 bg-slate-800 text-[10px] uppercase text-slate-500 font-semibold tracking-wider border-b border-slate-700">
            <div class="col-span-2">Pt</div><div class="col-span-2 text-right">Lbl</div><div class="col-span-3 text-right">Dist</div><div class="col-span-2 text-right">Sim(K)</div><div class="col-span-3 text-right">Vote</div>
        </div>
        <div class="flex-1 overflow-y-auto custom-scrollbar">${listHtml}</div>
    `;

    // Attach Listeners to new DOM elements
    document.querySelectorAll('.term-span').forEach(el => {
        el.addEventListener('mouseenter', () => { 
            if(state.hoveredTermId !== el.dataset.id) {
                state.hoveredTermId = el.dataset.id; renderMathPanel(); 
            }
        });
        el.addEventListener('mouseleave', () => { 
            if(state.hoveredTermId) {
                state.hoveredTermId = null; renderMathPanel(); 
            }
        });
    });
    document.querySelectorAll('.contribution-row').forEach(el => {
        el.addEventListener('click', () => { 
            state.selectedPointId = state.selectedPointId === el.dataset.id ? null : el.dataset.id; 
            renderMathPanel(); 
        });
        el.addEventListener('mouseenter', () => { 
            // Only trigger re-render if changing
            if (state.hoveredTermId !== el.dataset.id) {
                state.hoveredTermId = el.dataset.id; 
                renderMathPanel(); 
            }
        });
        el.addEventListener('mouseleave', () => { 
             if (state.hoveredTermId) {
                state.hoveredTermId = null; 
                renderMathPanel(); 
             }
        });
    });
}

// --- Event Listeners & Update Loop ---

function updateUI() {
    els.gammaVal.textContent = state.gamma.toFixed(1);
    els.countBlue.textContent = state.points.filter(p => p.label === 1).length;
    els.countRed.textContent = state.points.filter(p => p.label === -1).length;
    
    els.btnBlue.className = `flex-1 py-2 rounded-md font-semibold transition-colors ${state.activeClass === 1 ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30' : 'bg-slate-700 text-slate-400 hover:bg-slate-600'}`;
    els.btnRed.className = `flex-1 py-2 rounded-md font-semibold transition-colors ${state.activeClass === -1 ? 'bg-red-500 text-white shadow-lg shadow-red-500/30' : 'bg-slate-700 text-slate-400 hover:bg-slate-600'}`;

    if (state.hoverLoc) {
        els.coordDisplay.classList.remove('hidden');
        els.rotateHint.classList.add('opacity-0');
        els.valX.textContent = state.hoverLoc.x.toFixed(3);
        els.valY.textContent = state.hoverLoc.y.toFixed(3);
        const z = calculateDecisionValue(state.hoverLoc.x, state.hoverLoc.y, state.points, state.gamma);
        els.valZ.textContent = (z > 0 ? '+' : '') + z.toFixed(3);
        els.valZ.className = `font-bold ${z > 0 ? 'text-blue-400' : 'text-red-400'}`;
    } else {
        els.coordDisplay.classList.add('hidden');
        els.rotateHint.classList.remove('opacity-0');
    }
}

function updateAll() {
    draw2D();
    draw3D();
    renderMathPanel();
    updateUI();
}

// Controls
els.gammaSlider.addEventListener('input', (e) => { state.gamma = parseFloat(e.target.value); updateAll(); });
els.liftSlider.addEventListener('input', (e) => { state.lift = parseFloat(e.target.value); draw3D(); });
els.btnBlue.addEventListener('click', () => { state.activeClass = 1; updateUI(); });
els.btnRed.addEventListener('click', () => { state.activeClass = -1; updateUI(); });
els.btnReset.addEventListener('click', () => { state.points = []; state.selectedPointId = null; updateAll(); });
els.btnUnlock.addEventListener('click', () => { state.selectedPointId = null; renderMathPanel(); });

// Zoom
const zoomCenter = (factor) => {
    const w = els.canvas2D.width; const h = els.canvas2D.height;
    const cx = w/2; const cy = h/2;
    const newScale = Math.min(Math.max(0.2, state.view2D.scale * factor), 10);
    const ratio = newScale / state.view2D.scale;
    state.view2D.scale = newScale;
    state.view2D.offsetX = cx - (cx - state.view2D.offsetX) * ratio;
    state.view2D.offsetY = cy - (cy - state.view2D.offsetY) * ratio;
    draw2D();
};
els.btnZoomIn.addEventListener('click', () => zoomCenter(1.2));
els.btnZoomOut.addEventListener('click', () => zoomCenter(0.8333));
els.btnZoomReset.addEventListener('click', () => { state.view2D = { scale: 1, offsetX: 0, offsetY: 0 }; draw2D(); });

// Canvas 2D Interactions
let isDragging2D = false;
let dragStart2D = { x: 0, y: 0 };
let hasMoved2D = false;

const getMousePos2D = (e) => {
    const rect = els.canvas2D.getBoundingClientRect();
    return {
        x: (e.clientX - rect.left) * (els.canvas2D.width / rect.width),
        y: (e.clientY - rect.top) * (els.canvas2D.height / rect.height)
    };
};

els.canvas2D.addEventListener('wheel', (e) => {
    e.preventDefault();
    const delta = -e.deltaY * 0.0015;
    const newScale = Math.min(Math.max(0.2, state.view2D.scale + delta), 10);
    const m = getMousePos2D(e);
    const w = els.canvas2D.width; const h = els.canvas2D.height;
    
    const wx = (m.x - state.view2D.offsetX) / (w * state.view2D.scale);
    const newOffX = m.x - wx * w * newScale;
    const newOffY = m.y - ( (m.y - state.view2D.offsetY) / (h * state.view2D.scale) ) * h * newScale;
    
    state.view2D.scale = newScale; state.view2D.offsetX = newOffX; state.view2D.offsetY = newOffY;
    draw2D();
});

els.canvas2D.addEventListener('mousedown', (e) => {
    isDragging2D = true; hasMoved2D = false;
    dragStart2D = getMousePos2D(e);
});

els.canvas2D.addEventListener('mousemove', (e) => {
    const m = getMousePos2D(e);
    const w = els.canvas2D.width; const h = els.canvas2D.height;
    const wx = (m.x - state.view2D.offsetX) / (w * state.view2D.scale);
    const wy = (m.y - state.view2D.offsetY) / (h * state.view2D.scale);
    
    state.hoverLoc = { x: wx, y: wy };
    updateUI(); // Update tooltip
    renderMathPanel(); // Live math update
    requestAnimationFrame(draw2D); // Re-draw cursor
    requestAnimationFrame(draw3D); // Re-draw 3D cursor highlight

    if (isDragging2D) {
        const dx = m.x - dragStart2D.x;
        const dy = m.y - dragStart2D.y;
        if (dx*dx + dy*dy > 9) hasMoved2D = true;
        state.view2D.offsetX += dx;
        state.view2D.offsetY += dy;
        dragStart2D = m;
        draw2D();
    }
});

const endDrag2D = (e) => {
    if (!isDragging2D) return;
    isDragging2D = false;
    if (!hasMoved2D) {
        // Click to add point
        const m = getMousePos2D(e);
        const w = els.canvas2D.width; const h = els.canvas2D.height;
        const wx = (m.x - state.view2D.offsetX) / (w * state.view2D.scale);
        const wy = (m.y - state.view2D.offsetY) / (h * state.view2D.scale);
        
        if (wx >= 0 && wx <= 1 && wy >= 0 && wy <= 1) {
            state.points.push({
                id: Math.random().toString(36).substr(2,9),
                x: wx, y: wy, label: state.activeClass
            });
            updateAll();
        }
    }
};
els.canvas2D.addEventListener('mouseup', endDrag2D);
els.canvas2D.addEventListener('mouseleave', () => { state.hoverLoc = null; updateAll(); isDragging2D = false; });

// Canvas 3D Interactions
let isDragging3D = false;
let lastMouse3D = { x: 0, y: 0 };

els.canvas3D.addEventListener('mousedown', (e) => {
    isDragging3D = true;
    lastMouse3D = { x: e.clientX, y: e.clientY };
});

els.canvas3D.addEventListener('mousemove', (e) => {
    if (isDragging3D) {
        const dx = e.clientX - lastMouse3D.x;
        const dy = e.clientY - lastMouse3D.y;
        state.rot3D.z -= dx * 0.01;
        state.rot3D.x = Math.max(0.1, Math.min(Math.PI/2, state.rot3D.x + dy * 0.01));
        lastMouse3D = { x: e.clientX, y: e.clientY };
        draw3D();
    } else {
        // Hit Test
        const rect = els.canvas3D.getBoundingClientRect();
        const scaleX = els.canvas3D.width / rect.width;
        const scaleY = els.canvas3D.height / rect.height;
        const mx = (e.clientX - rect.left) * scaleX;
        const my = (e.clientY - rect.top) * scaleY;
        
        let min = 1000; let nearest = null;
        for(const pt of hitMap3D) {
            const d = Math.sqrt((pt.sx - mx)**2 + (pt.sy - my)**2);
            if (d < min) { min = d; nearest = pt; }
        }
        
        if (nearest && min < 40) {
            state.hoverLoc = { x: nearest.x, y: nearest.y };
        } else {
            state.hoverLoc = null;
        }
        updateAll();
    }
});

els.canvas3D.addEventListener('mouseup', () => isDragging3D = false);
els.canvas3D.addEventListener('mouseleave', () => { isDragging3D = false; state.hoverLoc = null; updateAll(); });


// Init
updateAll();
