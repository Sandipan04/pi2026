// minigames/puzzle_08/net.js
import { supabase } from '../../js/supabase.js';
import { missions } from '../../js/missions.js';

const gridElement = document.getElementById('net-grid');
const statusText = document.getElementById('game-status');
const bountyDisplay = document.getElementById('bounty-display');

let currentUserId = null;
let gameActive = true;
let missionReward = 0;

const SIZE = 7; // 7x7 Grid
const CENTER = Math.floor(SIZE / 2);

// Map of port connections: 0=Up, 1=Right, 2=Down, 3=Left
let board = [];
// DOM references
let uiTiles = [];

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
    const missionData = missions.find(m => m.id === "net");
    if (missionData) {
        missionReward = missionData.reward;
        bountyDisplay.innerText = `Bounty: +${missionReward} Pts`;
    }

    const guideContent = document.getElementById('guide-content');
    const toggleBtn = document.getElementById('btn-toggle-guide');
    
    fetch('net.md').then(res => res.text()).then(text => {
        if (window.marked) guideContent.innerHTML = marked.parse(text);
    }).catch(err => console.error("Guide missing", err));

    toggleBtn.addEventListener('click', () => {
        guideContent.classList.toggle('hidden');
        toggleBtn.innerText = guideContent.classList.contains('hidden') ? "[+] EXPAND TACTICAL BRIEFING" : "[-] COLLAPSE TACTICAL BRIEFING";
        toggleBtn.style.background = guideContent.classList.contains('hidden') ? "rgba(0, 255, 204, 0.1)" : "var(--neon-cyan)";
        toggleBtn.style.color = guideContent.classList.contains('hidden') ? "var(--neon-cyan)" : "#000";
    });
}

// --- 2. MAZE GENERATION (Prim's Algorithm) ---
function generateNetwork() {
    // Initialize empty board
    board = [];
    for (let r = 0; r < SIZE; r++) {
        let row = [];
        for (let c = 0; c < SIZE; c++) {
            row.push({
                ports: [false, false, false, false], // U, R, D, L
                rotation: 0, // Visual rotation index (0 to 3)
                powered: false
            });
        }
        board.push(row);
    }

    let visited = Array.from({length: SIZE}, () => Array(SIZE).fill(false));
    let walls = [];

    // Start carving from the center
    visited[CENTER][CENTER] = true;
    addWalls(CENTER, CENTER, walls, visited);

    while (walls.length > 0) {
        // Pick a random wall
        let wIndex = Math.floor(Math.random() * walls.length);
        let w = walls.splice(wIndex, 1)[0];

        if (visited[w.r2][w.c2]) continue; // Already connected

        // Carve the path!
        board[w.r1][w.c1].ports[w.dir1] = true;
        board[w.r2][w.c2].ports[w.dir2] = true;
        
        visited[w.r2][w.c2] = true;
        addWalls(w.r2, w.c2, walls, visited);
    }

    // Scramble! Rotate every tile randomly
    for (let r = 0; r < SIZE; r++) {
        for (let c = 0; c < SIZE; c++) {
            let rotations = Math.floor(Math.random() * 4);
            for(let i=0; i<rotations; i++) rotateTileData(r, c);
            board[r][c].rotation = rotations; // Keep track of physical rotation for CSS
        }
    }
}

function addWalls(r, c, walls, visited) {
    if (r > 0 && !visited[r-1][c]) walls.push({ r1: r, c1: c, r2: r-1, c2: c, dir1: 0, dir2: 2 }); // Up
    if (c < SIZE-1 && !visited[r][c+1]) walls.push({ r1: r, c1: c, r2: r, c2: c+1, dir1: 1, dir2: 3 }); // Right
    if (r < SIZE-1 && !visited[r+1][c]) walls.push({ r1: r, c1: c, r2: r+1, c2: c, dir1: 2, dir2: 0 }); // Down
    if (c > 0 && !visited[r][c-1]) walls.push({ r1: r, c1: c, r2: r, c2: c-1, dir1: 3, dir2: 1 }); // Left
}

// Shifts the data array [U, R, D, L] to the right
function rotateTileData(r, c) {
    let p = board[r][c].ports;
    board[r][c].ports = [p[3], p[0], p[1], p[2]];
}

// --- 3. RENDER ENGINE ---
function buildDOM() {
    gridElement.innerHTML = '';
    uiTiles = [];

    for (let r = 0; r < SIZE; r++) {
        uiTiles[r] = [];
        for (let c = 0; c < SIZE; c++) {
            const cell = document.createElement('div');
            cell.className = 'net-cell';
            if (r === CENTER && c === CENTER) cell.classList.add('is-center');

            // Set initial rotation
            cell.style.transform = `rotate(${board[r][c].rotation * 90}deg)`;

            let originalPorts = getOriginalPorts(r, c);
            let hasWire = false;
            let portCount = 0; // <-- NEW: Track how many connections this tile has
            
            for (let i = 0; i < 4; i++) {
                if (originalPorts[i]) {
                    let wire = document.createElement('div');
                    wire.className = `wire port-${i}`;
                    cell.appendChild(wire);
                    hasWire = true;
                    portCount++; // <-- NEW: Increment the count
                }
            }

            // --- NEW: Identify Endpoints ---
            // If the tile only has 1 wire, and it's NOT the center server, it's a Terminal!
            if (portCount === 1 && !(r === CENTER && c === CENTER)) {
                cell.classList.add('is-endpoint');
            }
            // -------------------------------

            // Add center hub if it has any wires
            if (hasWire) {
                let hub = document.createElement('div');
                hub.className = 'wire-hub';
                cell.appendChild(hub);
            }

            // Click to rotate!
            cell.addEventListener('click', () => handleCellClick(r, c));
            // Prevent right-click menu, allow fast right-click rotating (Counter-Clockwise)
            cell.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                handleCellClick(r, c, true);
            });

            uiTiles[r][c] = cell;
            gridElement.appendChild(cell);
        }
    }
}

// To draw the physical DOM, we must calculate what the ports were BEFORE the initial scramble
function getOriginalPorts(r, c) {
    let p = [...board[r][c].ports];
    let rotsToUndo = board[r][c].rotation % 4;
    // Shift left to undo
    for (let i = 0; i < rotsToUndo; i++) {
        p = [p[1], p[2], p[3], p[0]];
    }
    return p;
}

// --- 4. GAMEPLAY MECHANICS ---
function handleCellClick(r, c, reverse = false) {
    if (!gameActive) return;

    if (reverse) {
        // Rotate Counter-Clockwise
        for(let i=0; i<3; i++) rotateTileData(r, c);
        board[r][c].rotation--;
    } else {
        // Rotate Clockwise
        rotateTileData(r, c);
        board[r][c].rotation++;
    }

    // Apply visual rotation
    uiTiles[r][c].style.transform = `rotate(${board[r][c].rotation * 90}deg)`;
    
    scanPower();
}

function scanPower() {
    // Reset all power
    for (let r = 0; r < SIZE; r++) {
        for (let c = 0; c < SIZE; c++) {
            board[r][c].powered = false;
            uiTiles[r][c].classList.remove('powered');
        }
    }

    // BFS Queue starting from the Center Server
    let q = [{ r: CENTER, c: CENTER }];
    board[CENTER][CENTER].powered = true;
    uiTiles[CENTER][CENTER].classList.add('powered');

    let totalPowered = 1;
    let hasLeaks = false;

    // The Directions: 0=Up, 1=Right, 2=Down, 3=Left
    // The Opposite Ports: If I go Up(0), neighbor must have Down(2)
    const DR = [-1, 0, 1, 0];
    const DC = [0, 1, 0, -1];
    const OPP = [2, 3, 0, 1];

    while (q.length > 0) {
        let curr = q.shift();
        let tile = board[curr.r][curr.c];

        // Check all 4 ports of the current tile
        for (let dir = 0; dir < 4; dir++) {
            if (tile.ports[dir]) {
                let nr = curr.r + DR[dir];
                let nc = curr.c + DC[dir];

                // Did the wire point off the edge of the board? Leak!
                if (nr < 0 || nr >= SIZE || nc < 0 || nc >= SIZE) {
                    hasLeaks = true;
                    continue;
                }

                let neighbor = board[nr][nc];
                
                // Does the neighbor have a matching port pointing back?
                if (neighbor.ports[OPP[dir]]) {
                    if (!neighbor.powered) {
                        neighbor.powered = true;
                        uiTiles[nr][nc].classList.add('powered');
                        totalPowered++;
                        q.push({ r: nr, c: nc });
                    }
                } else {
                    // Wire hit a dead wall on the neighbor. Leak!
                    hasLeaks = true;
                }
            }
        }
    }

    // Victory Check: Are all tiles powered, and are there zero loose ends?
    if (totalPowered === (SIZE * SIZE) && !hasLeaks && gameActive) {
        gameActive = false;
        setTimeout(triggerVictory, 300); // Tiny delay so they can admire the glowing grid
    }
}

// --- 5. VICTORY STATE ---
async function triggerVictory() {
    if (!currentUserId) return;

    statusText.innerText = `> Network Synchronized. Depositing ${missionReward} Supply Points...`;
    statusText.style.color = "var(--neon-cyan)";

    const { error } = await supabase.rpc('admin_grant_points', { 
        p_target_id: currentUserId, p_points: missionReward 
    });

    if (!error) {
        statusText.innerText = `> Relay Calibration Complete. +${missionReward} Points secured.`;
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
    generateNetwork();
    buildDOM();
    scanPower(); // Run initial scan to light up whatever happens to connect on start
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