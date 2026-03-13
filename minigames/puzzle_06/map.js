// minigames/puzzle_06/map.js
import { supabase } from '../../js/supabase.js';
import { missions } from '../../js/missions.js';

const canvas = document.getElementById('map-canvas');
const ctx = canvas.getContext('2d');
const statusText = document.getElementById('game-status');
const bountyDisplay = document.getElementById('bounty-display');
const colorButtons = document.querySelectorAll('.color-btn');

let currentUserId = null;
let gameActive = true;
let missionReward = 0;

// Vector Grid Settings
const COLS = 20; 
const ROWS = 20;
const TILE_SIZE = 400 / COLS; 
const TOTAL_TRIANGLES = COLS * ROWS * 2;
let numRegions = 28; 

let regionMap = new Int32Array(TOTAL_TRIANGLES); 
let adjacencies = {}; 
let regionColors = {}; 
let activeColor = 1;

// Crisp CSS Vector Colors (High Contrast Palette)
const COLORS = [
    "#02040a",   // 0: Empty (Dark)
    "#0066FF",   // 1: Deep Blue
    "#FF00FF",   // 2: Neon Pink
    "#FFD700",   // 3: Gold
    "#00FF33",   // 4: Neon Green
    "#FF3333"    // 5: Conflict Red
];

// --- 1. BOOT SEQUENCE ---
async function verifyClearance() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { window.location.href = '../../index.html'; return; }
    currentUserId = session.user.id;
}

async function fetchPoints() {
    if (!currentUserId) return;
    const { data: user } = await supabase.from('users').select('points').eq('id', currentUserId).single();
    if (user) document.getElementById('arcade-points').innerText = user.points;
}

function loadMissionIntel() {
    const missionData = missions.find(m => m.id === "map_color");
    if (missionData) {
        missionReward = missionData.reward;
        bountyDisplay.innerText = `Bounty: +${missionReward} Pts`;
    }

    const guideContent = document.getElementById('guide-content');
    const toggleBtn = document.getElementById('btn-toggle-guide');
    
    fetch('map.md').then(res => res.text()).then(text => {
        if (window.marked) guideContent.innerHTML = marked.parse(text);
    }).catch(err => console.error("Guide missing", err));

    toggleBtn.addEventListener('click', () => {
        guideContent.classList.toggle('hidden');
        toggleBtn.innerText = guideContent.classList.contains('hidden') ? "[+] EXPAND TACTICAL BRIEFING" : "[-] COLLAPSE TACTICAL BRIEFING";
        toggleBtn.style.background = guideContent.classList.contains('hidden') ? "rgba(0, 255, 204, 0.1)" : "var(--neon-cyan)";
        toggleBtn.style.color = guideContent.classList.contains('hidden') ? "var(--neon-cyan)" : "#000";
    });
}

// --- 2. VECTOR GRID MATH ---
function getNeighbors(index) {
    const t = index % 2; 
    const sq = Math.floor(index / 2);
    const x = sq % COLS;
    const y = Math.floor(sq / COLS);
    let neighbors = [];

    if (t === 0) {
        neighbors.push(sq * 2 + 1); 
        if (y > 0) neighbors.push(((y - 1) * COLS + x) * 2 + 1); 
        if (x > 0) neighbors.push((y * COLS + (x - 1)) * 2 + 1); 
    } else {
        neighbors.push(sq * 2 + 0); 
        if (y < ROWS - 1) neighbors.push(((y + 1) * COLS + x) * 2 + 0); 
        if (x < COLS - 1) neighbors.push((y * COLS + (x + 1)) * 2 + 0); 
    }
    return neighbors;
}

function getEdges(index) {
    const t = index % 2;
    const sq = Math.floor(index / 2);
    const x = sq % COLS;
    const y = Math.floor(sq / COLS);
    const px = x * TILE_SIZE;
    const py = y * TILE_SIZE;
    const ts = TILE_SIZE;

    if (t === 0) {
        return [
            { v1: [px, py], v2: [px+ts, py], neighbor: y > 0 ? ((y - 1) * COLS + x) * 2 + 1 : -1 }, 
            { v1: [px+ts, py], v2: [px, py+ts], neighbor: sq * 2 + 1 }, 
            { v1: [px, py+ts], v2: [px, py], neighbor: x > 0 ? (y * COLS + (x - 1)) * 2 + 1 : -1 } 
        ];
    } else {
        return [
            { v1: [px+ts, py+ts], v2: [px, py+ts], neighbor: y < ROWS - 1 ? ((y + 1) * COLS + x) * 2 + 0 : -1 }, 
            { v1: [px, py+ts], v2: [px+ts, py], neighbor: sq * 2 + 0 }, 
            { v1: [px+ts, py], v2: [px+ts, py+ts], neighbor: x < COLS - 1 ? (y * COLS + (x + 1)) * 2 + 0 : -1 } 
        ];
    }
}

// --- 3. MAP GENERATOR & SMOOTHING ---
function generateMap() {
    regionMap.fill(-1);
    let queue = [];

    // 1. Plant Seeds
    for (let i = 0; i < numRegions; i++) {
        let rIndex;
        do { rIndex = Math.floor(Math.random() * TOTAL_TRIANGLES); } while (regionMap[rIndex] !== -1);
        regionMap[rIndex] = i;
        queue.push({ index: rIndex, id: i });
    }

    // 2. Grow Regions
    while (queue.length > 0) {
        let rIdx = Math.floor(Math.random() * Math.min(5, queue.length));
        let curr = queue.splice(rIdx, 1)[0];

        let neighbors = getNeighbors(curr.index);
        neighbors.sort(() => Math.random() - 0.5);

        for (let n of neighbors) {
            if (regionMap[n] === -1) {
                regionMap[n] = curr.id;
                queue.push({ index: n, id: curr.id });
            }
        }
    }

    // 3. Sand down 45-degree acute corners
    smoothMap();
    
    // 4. Clean indexing
    extractCleanRegions();
    
    // 5. Forcefully absorb micro-regions
    eliminateMicroRegions();
    
    // 6. Clean indexing one final time after absorptions
    extractCleanRegions();

    // 7. Build Adjacencies
    for (let i = 0; i < TOTAL_TRIANGLES; i++) {
        let myRegion = regionMap[i];
        for (let n of getNeighbors(i)) {
            let nRegion = regionMap[n];
            if (nRegion !== -1 && nRegion !== myRegion) {
                adjacencies[myRegion].add(nRegion);
                adjacencies[nRegion].add(myRegion);
            }
        }
    }
}

function smoothMap() {
    for (let pass = 0; pass < 3; pass++) {
        let newMap = new Int32Array(regionMap);
        for (let i = 0; i < TOTAL_TRIANGLES; i++) {
            let myRegion = regionMap[i];
            let neighbors = getNeighbors(i);
            
            let counts = {};
            let maxCount = 0;
            let dominantRegion = myRegion;

            for (let n of neighbors) {
                let nr = regionMap[n];
                counts[nr] = (counts[nr] || 0) + 1;
                if (counts[nr] > maxCount) {
                    maxCount = counts[nr];
                    dominantRegion = nr;
                }
            }
            if (maxCount >= 2 && dominantRegion !== myRegion) newMap[i] = dominantRegion;
        }
        regionMap = newMap;
    }
}

function eliminateMicroRegions() {
    let changed = true;
    while (changed) {
        changed = false;
        
        // Count size of all regions
        let sizes = new Array(numRegions).fill(0);
        for (let i = 0; i < TOTAL_TRIANGLES; i++) {
            if (regionMap[i] !== -1) sizes[regionMap[i]]++;
        }

        // Hunt for tiny regions (less than 6 triangles)
        for (let i = 0; i < numRegions; i++) {
            if (sizes[i] > 0 && sizes[i] < 6) { 
                
                // Find the neighbor it shares the most borders with
                let neighborCounts = {};
                let bestNeighbor = -1;
                let maxEdges = -1;

                for (let t = 0; t < TOTAL_TRIANGLES; t++) {
                    if (regionMap[t] === i) {
                        for (let n of getNeighbors(t)) {
                            let nr = regionMap[n];
                            if (nr !== -1 && nr !== i) {
                                neighborCounts[nr] = (neighborCounts[nr] || 0) + 1;
                                if (neighborCounts[nr] > maxEdges) {
                                    maxEdges = neighborCounts[nr];
                                    bestNeighbor = nr;
                                }
                            }
                        }
                    }
                }

                if (bestNeighbor !== -1) {
                    // Forcefully absorb it
                    for (let t = 0; t < TOTAL_TRIANGLES; t++) {
                        if (regionMap[t] === i) regionMap[t] = bestNeighbor;
                    }
                    sizes[i] = 0;
                    changed = true;
                }
            }
        }
    }
}

function extractCleanRegions() {
    let newRegionMap = new Int32Array(TOTAL_TRIANGLES).fill(-1);
    let nextId = 0;

    for (let i = 0; i < TOTAL_TRIANGLES; i++) {
        if (newRegionMap[i] === -1 && regionMap[i] !== -1) {
            let oldId = regionMap[i];
            let targetId = nextId++;
            
            let q = [i];
            newRegionMap[i] = targetId;
            
            while (q.length > 0) {
                let curr = q.pop();
                for (let n of getNeighbors(curr)) {
                    if (regionMap[n] === oldId && newRegionMap[n] === -1) {
                        newRegionMap[n] = targetId;
                        q.push(n);
                    }
                }
            }
        }
    }
    
    regionMap = newRegionMap;
    numRegions = nextId; 
    
    adjacencies = {};
    regionColors = {};
    for (let i = 0; i < numRegions; i++) {
        adjacencies[i] = new Set();
        regionColors[i] = 0;
    }
}

// --- 4. RENDER ENGINE ---
function drawMap() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    let conflicts = new Set();
    for (let i = 0; i < numRegions; i++) {
        let myColor = regionColors[i];
        if (myColor !== 0) {
            for (let neighbor of adjacencies[i]) {
                if (regionColors[neighbor] === myColor) {
                    conflicts.add(i);
                    conflicts.add(neighbor);
                }
            }
        }
    }

    // Draw Fills
    for (let i = 0; i < TOTAL_TRIANGLES; i++) {
        let regionId = regionMap[i];
        let colorCode = regionColors[regionId];
        if (conflicts.has(regionId)) colorCode = 5; 

        let edges = getEdges(i);
        
        ctx.beginPath();
        ctx.moveTo(edges[0].v1[0], edges[0].v1[1]);
        ctx.lineTo(edges[1].v1[0], edges[1].v1[1]);
        ctx.lineTo(edges[2].v1[0], edges[2].v1[1]);
        ctx.closePath();

        ctx.fillStyle = COLORS[colorCode];
        ctx.fill();
        ctx.strokeStyle = COLORS[colorCode];
        ctx.lineWidth = 1;
        ctx.stroke(); 
    }

    // Draw Borders
    ctx.strokeStyle = "rgba(0, 255, 204, 0.8)"; 
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    for (let i = 0; i < TOTAL_TRIANGLES; i++) {
        let edges = getEdges(i);
        for (let edge of edges) {
            let isBorder = edge.neighbor === -1 || regionMap[edge.neighbor] !== regionMap[i];
            if (isBorder && (edge.neighbor === -1 || i < edge.neighbor)) {
                ctx.beginPath();
                ctx.moveTo(edge.v1[0], edge.v1[1]);
                ctx.lineTo(edge.v2[0], edge.v2[1]);
                ctx.stroke();
            }
        }
    }

    if (gameActive) checkWin(conflicts);
}

// --- 5. INTERACTION ---
colorButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
        colorButtons.forEach(b => b.classList.remove('selected'));
        e.target.classList.add('selected');
        activeColor = parseInt(e.target.getAttribute('data-color'));
    });
});

function handleInteraction(clientX, clientY) {
    if (!gameActive) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    let mouseX = (clientX - rect.left) * scaleX;
    let mouseY = (clientY - rect.top) * scaleY;

    let gridX = Math.floor(mouseX / TILE_SIZE);
    let gridY = Math.floor(mouseY / TILE_SIZE);
    let localX = mouseX % TILE_SIZE;
    let localY = mouseY % TILE_SIZE;

    if (gridX >= 0 && gridX < COLS && gridY >= 0 && gridY < ROWS) {
        let t = (localY < TILE_SIZE - localX) ? 0 : 1; 
        
        let index = (gridY * COLS + gridX) * 2 + t;
        let clickedRegion = regionMap[index];
        
        if (regionColors[clickedRegion] === activeColor) {
            regionColors[clickedRegion] = 0; 
        } else {
            regionColors[clickedRegion] = activeColor;
        }
        drawMap();
    }
}

canvas.addEventListener('mousedown', (e) => handleInteraction(e.clientX, e.clientY));
canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    handleInteraction(e.touches[0].clientX, e.touches[0].clientY);
}, { passive: false });

// --- 6. WIN STATE ---
function checkWin(conflicts) {
    if (conflicts.size > 0) return; 

    for (let i = 0; i < numRegions; i++) {
        if (regionColors[i] === 0) return; 
    }
    
    gameActive = false;
    triggerVictory();
}

async function triggerVictory() {
    if (!currentUserId) return;

    statusText.innerText = `> Cartography validated. Depositing ${missionReward} Supply Points...`;
    statusText.style.color = "var(--neon-cyan)";

    const { error } = await supabase.rpc('admin_grant_points', { 
        p_target_id: currentUserId, p_points: missionReward 
    });

    if (!error) {
        statusText.innerText = `> Sector Secured. +${missionReward} Points secured.`;
        statusText.style.color = "var(--neon-gold)";
        fetchPoints(); 
        document.getElementById('btn-replay').classList.remove('hidden');
    } else {
        statusText.innerText = "> Error: Signal dropped. Points lost.";
        statusText.style.color = "var(--alert-red)";
    }
}

document.getElementById('btn-replay').addEventListener('click', () => {
    document.getElementById('btn-replay').classList.add('hidden');
    statusText.innerText = "";
    initGame(); 
});

// Boot Master
function initGame() {
    gameActive = true;
    generateMap();
    drawMap();
}

async function bootSequence() {
    await verifyClearance();
    if (currentUserId) {
        loadMissionIntel();
        await fetchPoints();
        initGame();
    }
}

bootSequence();