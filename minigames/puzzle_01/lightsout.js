// minigames/puzzle_01/lightsout.js
import { supabase } from '../../js/supabase.js';
import { missions } from '../../js/missions.js'; // NEW IMPORT

const GRID_SIZE = 5;
const gridElement = document.getElementById('lights-grid');
const statusText = document.getElementById('game-status');

let currentUserId = null;
let grid = [];
let gameActive = true;
let missionReward = 0; // NEW VARIABLE

// 1. Authenticate Commander
async function verifyClearance() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        alert("Security Breach: Commander not identified.");
        window.location.href = '../../radar.html';
        return;
    }
    currentUserId = session.user.id;
}

async function fetchPoints() {
    if (!currentUserId) return;
    const { data: user } = await supabase
        .from('users')
        .select('points')
        .eq('id', currentUserId)
        .single();
        
    if (user) {
        document.getElementById('arcade-points').innerText = user.points;
    }
}

// --- DYNAMIC INTEL & REWARD ---
function loadMissionIntel() {
    // 1. Pull dynamic reward
    const missionData = missions.find(m => m.id === "sys_boot");
    const bountyDisplay = document.getElementById('bounty-display');
    if (missionData) {
        missionReward = missionData.reward;
        bountyDisplay.innerText = `Bounty: +${missionReward} Supply Points`;
    }

    // 2. Load the Guide & Wire the Accordion
    const guideContent = document.getElementById('guide-content');
    const toggleBtn = document.getElementById('btn-toggle-guide');
    
    fetch('lightsout.md').then(res => res.text()).then(text => {
        guideContent.innerHTML = marked.parse(text);
    });

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

// 2. Initialize the Game Board
function initGame() {
    gridElement.innerHTML = '';
    
    // Create a 5x5 array of 'false' (OFF)
    grid = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(false));

    // Draw the buttons
    for (let row = 0; row < GRID_SIZE; row++) {
        for (let col = 0; col < GRID_SIZE; col++) {
            const btn = document.createElement('button');
            btn.classList.add('light-btn');
            btn.dataset.row = row;
            btn.dataset.col = col;
            btn.addEventListener('click', () => handleLightClick(row, col));
            gridElement.appendChild(btn);
        }
    }

    // Scramble the board by simulating random valid clicks 
    // (This guarantees the puzzle is mathematically solvable)
    scrambleBoard(15);
    updateGridUI();
}

function scrambleBoard(difficulty) {
    // 1. Create a deck of all 25 possible button coordinates
    let possibleMoves = [];
    for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
            possibleMoves.push({ r, c });
        }
    }
    
    // 2. Shuffle the deck using the Fisher-Yates algorithm
    for (let i = possibleMoves.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [possibleMoves[i], possibleMoves[j]] = [possibleMoves[j], possibleMoves[i]];
    }
    
    // 3. Apply the exact number of unique clicks to guarantee difficulty
    for (let i = 0; i < difficulty; i++) {
        toggleLights(possibleMoves[i].r, possibleMoves[i].c);
    }
}

// 3. The Core Logic (Toggle self and adjacent orthogonal nodes)
function toggleLights(row, col) {
    const directions = [
        [0, 0],   // Self
        [-1, 0],  // Up
        [1, 0],   // Down
        [0, -1],  // Left
        [0, 1]    // Right
    ];

    directions.forEach(([dr, dc]) => {
        const nr = row + dr;
        const nc = col + dc;
        
        // Ensure the adjacent tile is actually within the 5x5 bounds
        if (nr >= 0 && nr < GRID_SIZE && nc >= 0 && nc < GRID_SIZE) {
            grid[nr][nc] = !grid[nr][nc];
        }
    });
}

function updateGridUI() {
    const buttons = gridElement.querySelectorAll('.light-btn');
    buttons.forEach(btn => {
        const r = parseInt(btn.dataset.row);
        const c = parseInt(btn.dataset.col);
        
        if (grid[r][c]) {
            btn.classList.add('is-on');
        } else {
            btn.classList.remove('is-on');
        }
    });
}

// 4. Gameplay & Win Detection
async function handleLightClick(row, col) {
    if (!gameActive) return;

    toggleLights(row, col);
    updateGridUI();
    checkWinCondition();
}

async function checkWinCondition() {
    // Look through the matrix. If ANY light is true (ON), the game continues.
    const hasOnLight = grid.some(row => row.some(light => light === true));
    
    if (!hasOnLight) {
        gameActive = false;
        triggerVictory();
    }
}

// 5. Secure Payout
async function triggerVictory() {
    if (!currentUserId) return;

    const buttons = gridElement.querySelectorAll('.light-btn');
    buttons.forEach(btn => btn.disabled = true);

    statusText.innerText = `> Matrix stabilized. Depositing ${missionReward} Supply Points...`;
    statusText.style.color = "var(--neon-cyan)";

    const { data, error } = await supabase.rpc('admin_grant_points', { 
        p_target_id: currentUserId, 
        p_points: missionReward 
    });

    if (!error) {
        statusText.innerText = `> Decryption successful. +${missionReward} Points secured.`;
        statusText.style.color = "var(--neon-gold)";
        fetchPoints(); 
        document.getElementById('btn-replay').classList.remove('hidden');
    } else {
        statusText.innerText = "> Error: Signal intercepted. Points lost.";
        statusText.style.color = "var(--alert-red)";
        gameActive = true; 
        buttons.forEach(btn => btn.disabled = false);
    }
}

// 6. Loop the Game
document.getElementById('btn-replay').addEventListener('click', () => {
    // Hide the replay button and clear the success message
    document.getElementById('btn-replay').classList.add('hidden');
    statusText.innerText = "";
    
    // Reactivate the game and scramble a brand new board!
    gameActive = true;
    initGame(); 
});

// --- DYNAMIC FIELD MANUAL ---
async function loadMissionBriefing() {
    const guideContent = document.getElementById('guide-content');
    const toggleBtn = document.getElementById('btn-toggle-guide');

    try {
        const response = await fetch('lightsout.md'); // Fetches from the same local folder
        if (response.ok) {
            const markdownText = await response.text();
            guideContent.innerHTML = marked.parse(markdownText);
        } else {
            guideContent.innerHTML = "<span style='color: red;'>Error: Briefing corrupted.</span>";
        }
    } catch (err) {
        console.error("Guide fetch error:", err);
    }

    toggleBtn.addEventListener('click', () => {
        guideContent.classList.toggle('hidden');
        if (guideContent.classList.contains('hidden')) {
            toggleBtn.innerText = "[+] EXPAND TACTICAL BRIEFING";
            toggleBtn.style.background = "rgba(0, 255, 204, 0.1)";
        } else {
            toggleBtn.innerText = "[-] COLLAPSE TACTICAL BRIEFING";
            toggleBtn.style.background = "var(--neon-cyan)";
            toggleBtn.style.color = "#000";
        }
    });
}

// --- MASTER BOOT SEQUENCE ---
async function bootSequence() {
    await verifyClearance();
    if (currentUserId) {
        loadMissionIntel(); // Pulls reward & guide!
        await fetchPoints();
        initGame();
    }
}

// Execute
bootSequence();