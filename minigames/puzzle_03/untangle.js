// minigames/puzzle_03/untangle.js
import { supabase } from '../../js/supabase.js';
import { missions } from '../../js/missions.js';

const canvas = document.getElementById('untangle-canvas');
const ctx = canvas.getContext('2d');
const statusText = document.getElementById('game-status');
const bountyDisplay = document.getElementById('bounty-display');

let currentUserId = null;
let gameActive = true;
let missionReward = 0;

let nodes = [];
let edges = [];
let draggedNode = null;

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
    // 1. Pull dynamic reward
    const missionData = missions.find(m => m.id === "untangle");
    if (missionData) {
        missionReward = missionData.reward;
        bountyDisplay.innerText = `Bounty: +${missionReward} Supply Points`;
    }

    // 2. Load the Guide & Wire the Accordion
    const guideContent = document.getElementById('guide-content');
    const toggleBtn = document.getElementById('btn-toggle-guide');
    
    // Fetch the markdown instructions
    fetch('untangle.md').then(res => res.text()).then(text => {
        if (window.marked) {
            guideContent.innerHTML = marked.parse(text);
        }
    }).catch(err => console.error("Could not load guide:", err));

    // Handle accordion toggle
    toggleBtn.addEventListener('click', () => {
        guideContent.classList.toggle('hidden');
        if (guideContent.classList.contains('hidden')) {
            toggleBtn.innerText = "[+] EXPAND TACTICAL BRIEFING";
            toggleBtn.style.background = "rgba(0, 255, 204, 0.1)";
            toggleBtn.style.color = "var(--neon-cyan)";
        } else {
            toggleBtn.innerText = "[-] COLLAPSE TACTICAL BRIEFING";
            toggleBtn.style.background = "var(--neon-cyan)";
            toggleBtn.style.color = "#000";
        }
    });
}

// --- 2. MATHEMATICS (Intersection Detection) ---
// Returns true if line segment 'ab' and 'cd' intersect
function ccw(A, B, C) {
    return (C.y - A.y) * (B.x - A.x) > (B.y - A.y) * (C.x - A.x);
}

function intersect(A, B, C, D) {
    // If they share a node, they don't intersect (they just connect)
    if (A === C || A === D || B === C || B === D) return false;
    return ccw(A, C, D) !== ccw(B, C, D) && ccw(A, B, C) !== ccw(A, B, D);
}

// --- 3. GRAPH GENERATOR ---
function initGraph(nodeCount) {
    nodes = [];
    edges = [];
    
    // 1. Create nodes in a perfect circle (Guarantees we can build a planar graph easily)
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = 200;

    for (let i = 0; i < nodeCount; i++) {
        const angle = (i / nodeCount) * Math.PI * 2;
        nodes.push({
            id: i,
            x: centerX + Math.cos(angle) * radius,
            y: centerY + Math.sin(angle) * radius,
            vx: 0, vy: 0 // Used for scrambling later
        });
    }

    // 2. Build a planar graph (Connect the outer ring)
    for (let i = 0; i < nodeCount; i++) {
        edges.push([i, (i + 1) % nodeCount]);
    }
    
    // Add random internal chords that don't cross each other
    // For a simple implementation, we just connect step+2 around the circle
    for (let i = 0; i < nodeCount - 2; i += 2) {
        edges.push([i, (i + 2) % nodeCount]);
    }

    // 3. SCRAMBLE THE NODES
    // We throw them into random positions within the canvas padding to tangle the graph
    nodes.forEach(n => {
        n.x = 50 + Math.random() * (canvas.width - 100);
        n.y = 50 + Math.random() * (canvas.height - 100);
    });

    draw();
}

// --- 4. RENDER ENGINE ---
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    let intersectionsCount = 0;
    let intersectedEdges = new Set();

    // Check all edge pairs for intersections
    for (let i = 0; i < edges.length; i++) {
        for (let j = i + 1; j < edges.length; j++) {
            const n1 = nodes[edges[i][0]]; const n2 = nodes[edges[i][1]];
            const n3 = nodes[edges[j][0]]; const n4 = nodes[edges[j][1]];

            if (intersect(n1, n2, n3, n4)) {
                intersectedEdges.add(i);
                intersectedEdges.add(j);
                intersectionsCount++;
            }
        }
    }

    // Draw Edges
    edges.forEach((edge, index) => {
        const start = nodes[edge[0]];
        const end = nodes[edge[1]];

        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(end.x, end.y);
        ctx.lineWidth = 2;

        if (intersectedEdges.has(index)) {
            // Tangled wires are RED
            ctx.strokeStyle = "rgba(255, 50, 50, 0.8)"; 
            ctx.shadowBlur = 0;
        } else {
            // Clean wires are NEON CYAN
            ctx.strokeStyle = "rgba(0, 255, 204, 0.6)";
            ctx.shadowColor = "#00FFCC";
            ctx.shadowBlur = 5;
        }
        
        ctx.stroke();
    });

    // Draw Nodes
    nodes.forEach(node => {
        ctx.beginPath();
        ctx.arc(node.x, node.y, 8, 0, Math.PI * 2);
        
        if (node === draggedNode) {
            ctx.fillStyle = "#FFD700"; // Gold when dragging
            ctx.shadowColor = "#FFD700";
            ctx.shadowBlur = 15;
        } else {
            ctx.fillStyle = "#FFF";
            ctx.shadowColor = "#00FFCC";
            ctx.shadowBlur = 10;
        }
        ctx.fill();
        ctx.shadowBlur = 0; // Reset
    });

    // Check Victory
    // NEW: We added `&& !draggedNode` so it only fires when you release the mouse/touch!
    if (intersectionsCount === 0 && gameActive && !draggedNode) {
        gameActive = false;
        triggerVictory();
    }
}

// --- 5. INTERACTION (Drag & Drop) ---
function getMousePos(evt) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
        x: (evt.clientX - rect.left) * scaleX,
        y: (evt.clientY - rect.top) * scaleY
    };
}

canvas.addEventListener('mousedown', (e) => {
    if (!gameActive) return;
    const pos = getMousePos(e);
    
    // Find if we clicked a node (radius detection)
    draggedNode = nodes.find(n => Math.hypot(n.x - pos.x, n.y - pos.y) < 15);
    if (draggedNode) draw();
});

canvas.addEventListener('mousemove', (e) => {
    if (!draggedNode || !gameActive) return;
    const pos = getMousePos(e);
    
    // Keep nodes inside canvas bounds
    draggedNode.x = Math.max(10, Math.min(canvas.width - 10, pos.x));
    draggedNode.y = Math.max(10, Math.min(canvas.height - 10, pos.y));
    draw();
});

window.addEventListener('mouseup', () => {
    draggedNode = null;
    if (gameActive) draw();
});

// Mobile Touch Support
canvas.addEventListener('touchstart', (e) => {
    if (!gameActive) return;
    e.preventDefault();
    const touch = e.touches[0];
    const pos = getMousePos(touch);
    draggedNode = nodes.find(n => Math.hypot(n.x - pos.x, n.y - pos.y) < 25); // Larger hit radius for fingers
    if (draggedNode) draw();
}, { passive: false });

canvas.addEventListener('touchmove', (e) => {
    if (!draggedNode || !gameActive) return;
    e.preventDefault();
    const pos = getMousePos(e.touches[0]);
    draggedNode.x = Math.max(10, Math.min(canvas.width - 10, pos.x));
    draggedNode.y = Math.max(10, Math.min(canvas.height - 10, pos.y));
    draw();
}, { passive: false });

canvas.addEventListener('touchend', () => { draggedNode = null; if (gameActive) draw(); });

// --- 6. VICTORY LOGIC ---
async function triggerVictory() {
    if (!currentUserId) return;

    statusText.innerText = `> Signal isolated. Decrypting... Depositing ${missionReward} Supply Points.`;
    statusText.style.color = "var(--neon-gold)";

    const { error } = await supabase.rpc('admin_grant_points', { 
        p_target_id: currentUserId, p_points: missionReward 
    });

    if (!error) {
        statusText.innerText = `> Transmission intercepted. +${missionReward} Points secured.`;
        fetchPoints(); 
        document.getElementById('btn-replay').classList.remove('hidden');
    } else {
        statusText.innerText = "> Error: Signal dropped. Points lost.";
        statusText.style.color = "var(--alert-red)";
    }
}

document.getElementById('btn-replay').addEventListener('click', () => {
    document.getElementById('btn-replay').classList.add('hidden');
    statusText.innerText = "> Intercepted enemy routing node. Untangle the graph to decrypt.";
    statusText.style.color = "var(--neon-cyan)";
    gameActive = true;
    initGraph(8); // Adjust difficulty here (8 nodes is a good start)
});

// Master Boot
async function bootSequence() {
    await verifyClearance();
    if (currentUserId) {
        loadMissionIntel();
        await fetchPoints();
        gameActive = true;
        initGraph(12); // Start with an 8-node graph
    }
}

bootSequence();