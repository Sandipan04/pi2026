// minigames/puzzle_05/fifteen.js
import { supabase } from '../../js/supabase.js';
import { missions } from '../../js/missions.js';

const gridElement = document.getElementById('fifteen-grid');
const statusText = document.getElementById('game-status');
const bountyDisplay = document.getElementById('bounty-display');

let currentUserId = null;
let gameActive = true;
let missionReward = 0;

const SIZE = 4;
let board = [];
let emptyPos = { r: 3, c: 3 }; // The empty tile starts at bottom right

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
    const missionData = missions.find(m => m.id === "fifteen");
    if (missionData) {
        missionReward = missionData.reward;
        bountyDisplay.innerText = `Bounty: +${missionReward} Pts`;
    }

    const guideContent = document.getElementById('guide-content');
    const toggleBtn = document.getElementById('btn-toggle-guide');
    
    fetch('fifteen.md').then(res => res.text()).then(text => {
        if (window.marked) guideContent.innerHTML = marked.parse(text);
    }).catch(err => console.error("Guide missing", err));

    toggleBtn.addEventListener('click', () => {
        guideContent.classList.toggle('hidden');
        toggleBtn.innerText = guideContent.classList.contains('hidden') ? "[+] EXPAND TACTICAL BRIEFING" : "[-] COLLAPSE TACTICAL BRIEFING";
        toggleBtn.style.background = guideContent.classList.contains('hidden') ? "rgba(0, 255, 204, 0.1)" : "var(--neon-cyan)";
        toggleBtn.style.color = guideContent.classList.contains('hidden') ? "var(--neon-cyan)" : "#000";
    });
}

// --- 2. GAME LOGIC ---

function initGame() {
    gameActive = true;
    statusText.innerText = "";
    
    // 1. Create Solved Board
    board = [];
    let counter = 1;
    for (let r = 0; r < SIZE; r++) {
        let row = [];
        for (let c = 0; c < SIZE; c++) {
            if (r === SIZE - 1 && c === SIZE - 1) {
                row.push(0); // 0 represents the empty space
                emptyPos = { r, c };
            } else {
                row.push(counter++);
            }
        }
        board.push(row);
    }

    // 2. Safely scramble the board by simulating random valid moves
    // 150 moves is enough to thoroughly scramble a 4x4 grid
    let lastMove = null;
    for (let i = 0; i < 150; i++) {
        const neighbors = getValidNeighbors(emptyPos.r, emptyPos.c);
        
        // Prevent it from just undoing its previous move immediately
        const validMoves = neighbors.filter(n => !(lastMove && n.r === lastMove.r && n.c === lastMove.c));
        const move = validMoves[Math.floor(Math.random() * validMoves.length)];
        
        // Swap
        board[emptyPos.r][emptyPos.c] = board[move.r][move.c];
        board[move.r][move.c] = 0;
        
        lastMove = { r: emptyPos.r, c: emptyPos.c };
        emptyPos = { r: move.r, c: move.c };
    }

    renderBoard();
}

function getValidNeighbors(r, c) {
    const neighbors = [];
    if (r > 0) neighbors.push({ r: r - 1, c }); // Up
    if (r < SIZE - 1) neighbors.push({ r: r + 1, c }); // Down
    if (c > 0) neighbors.push({ r, c: c - 1 }); // Left
    if (c < SIZE - 1) neighbors.push({ r, c: c + 1 }); // Right
    return neighbors;
}

function handleTileClick(r, c) {
    if (!gameActive) return;

    // Check if the clicked tile is adjacent to the empty space
    const isAdjacent = Math.abs(emptyPos.r - r) + Math.abs(emptyPos.c - c) === 1;
    
    if (isAdjacent) {
        // Swap the clicked tile with the empty space
        board[emptyPos.r][emptyPos.c] = board[r][c];
        board[r][c] = 0;
        emptyPos = { r, c };
        
        renderBoard();
        checkWin();
    }
}

function renderBoard() {
    gridElement.innerHTML = '';
    
    for (let r = 0; r < SIZE; r++) {
        for (let c = 0; c < SIZE; c++) {
            const val = board[r][c];
            const tile = document.createElement('div');
            
            if (val === 0) {
                tile.className = 'fifteen-tile fifteen-empty';
            } else {
                tile.className = 'fifteen-tile';
                tile.innerText = val;
                
                // Highlight tiles that are in their correct final position
                const expectedVal = (r * SIZE) + c + 1;
                if (val === expectedVal) {
                    tile.style.color = "var(--neon-gold)";
                    tile.style.borderColor = "var(--neon-gold)";
                }
                
                // Add click listener
                tile.addEventListener('click', () => handleTileClick(r, c));
            }
            gridElement.appendChild(tile);
        }
    }
}

// --- 3. WIN STATE ---

function checkWin() {
    let counter = 1;
    for (let r = 0; r < SIZE; r++) {
        for (let c = 0; c < SIZE; c++) {
            if (r === SIZE - 1 && c === SIZE - 1) {
                if (board[r][c] !== 0) return; // Last spot must be empty
            } else {
                if (board[r][c] !== counter) return; // Numbers must match sequence
            }
            counter++;
        }
    }
    
    // If we make it through the loops, the board is perfectly sorted!
    gameActive = false;
    triggerVictory();
}

async function triggerVictory() {
    if (!currentUserId) return;

    statusText.innerText = `> Data sequence realigned. Depositing ${missionReward} Supply Points...`;
    statusText.style.color = "var(--neon-cyan)";

    // Lock the grid visuals
    document.querySelectorAll('.fifteen-tile').forEach(t => {
        if (!t.classList.contains('fifteen-empty')) {
            t.style.background = "rgba(0, 255, 204, 0.2)";
            t.style.color = "var(--neon-cyan)";
            t.style.borderColor = "var(--neon-cyan)";
            t.style.cursor = "default";
        }
    });

    const { error } = await supabase.rpc('admin_grant_points', { 
        p_target_id: currentUserId, p_points: missionReward 
    });

    if (!error) {
        statusText.innerText = `> Decryption Complete. +${missionReward} Points secured.`;
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
    initGame(); 
});

// Boot Sequence
async function bootSequence() {
    await verifyClearance();
    if (currentUserId) {
        loadMissionIntel();
        await fetchPoints();
        initGame();
    }
}

bootSequence();