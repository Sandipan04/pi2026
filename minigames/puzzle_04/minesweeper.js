// minigames/puzzle_04/minesweeper.js
import { supabase } from '../../js/supabase.js';
import { missions } from '../../js/missions.js';

const gridElement = document.getElementById('ms-grid');
const statusText = document.getElementById('game-status');
const bountyDisplay = document.getElementById('bounty-display');
const flagDisplay = document.getElementById('flag-count');

let currentUserId = null;
let gameActive = true;
let missionReward = 0;

// Grid Settings
const ROWS = 9;
const COLS = 9;
const TOTAL_MINES = 10;

let board = [];
let flagsPlaced = 0;
let tilesRevealed = 0;
let isFirstClick = true;

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
    const missionData = missions.find(m => m.id === "minesweeper_9x9");
    if (missionData) {
        missionReward = missionData.reward;
        bountyDisplay.innerText = `Bounty: +${missionReward} Pts`;
    }

    const guideContent = document.getElementById('guide-content');
    const toggleBtn = document.getElementById('btn-toggle-guide');
    
    fetch('minesweeper.md').then(res => res.text()).then(text => {
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
    gridElement.innerHTML = '';
    board = [];
    flagsPlaced = 0;
    tilesRevealed = 0;
    isFirstClick = true;
    gameActive = true;
    updateFlagHUD();
    statusText.innerText = "";

    // Create logical board
    for (let r = 0; r < ROWS; r++) {
        let row = [];
        for (let c = 0; c < COLS; c++) {
            row.push({
                r, c,
                isMine: false,
                isRevealed: false,
                isFlagged: false,
                neighborMines: 0,
                element: null
            });
        }
        board.push(row);
    }

    // Create DOM Grid
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            const cellEl = document.createElement('div');
            cellEl.className = 'ms-cell hidden-cell';
            
            // Left Click (Reveal)
            cellEl.addEventListener('click', () => handleCellClick(r, c));
            
            // Right Click (Flag)
            cellEl.addEventListener('contextmenu', (e) => {
                e.preventDefault(); // Stop normal browser right-click menu
                handleRightClick(r, c);
            });

            board[r][c].element = cellEl;
            gridElement.appendChild(cellEl);
        }
    }
}

function placeMines(safeRow, safeCol) {
    let minesPlaced = 0;
    while (minesPlaced < TOTAL_MINES) {
        let r = Math.floor(Math.random() * ROWS);
        let c = Math.floor(Math.random() * COLS);
        
        // Ensure we don't put a mine on the first clicked tile OR its immediate 8 neighbors!
        // This guarantees a clean opening cavern.
        let isSafeZone = Math.abs(safeRow - r) <= 1 && Math.abs(safeCol - c) <= 1;

        if (!board[r][c].isMine && !isSafeZone) {
            board[r][c].isMine = true;
            minesPlaced++;
        }
    }

    // Calculate neighbors
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            if (!board[r][c].isMine) {
                let count = 0;
                for (let i = -1; i <= 1; i++) {
                    for (let j = -1; j <= 1; j++) {
                        if (r+i >= 0 && r+i < ROWS && c+j >= 0 && c+j < COLS) {
                            if (board[r+i][c+j].isMine) count++;
                        }
                    }
                }
                board[r][c].neighborMines = count;
            }
        }
    }
}

function handleCellClick(r, c) {
    if (!gameActive) return;
    const cell = board[r][c];
    if (cell.isRevealed || cell.isFlagged) return;

    if (isFirstClick) {
        placeMines(r, c);
        isFirstClick = false;
    }

    if (cell.isMine) {
        triggerDefeat();
        return;
    }

    revealCell(r, c);
    checkWin();
}

function handleRightClick(r, c) {
    if (!gameActive || isFirstClick) return;
    const cell = board[r][c];
    if (cell.isRevealed) return;

    if (!cell.isFlagged) {
        if (flagsPlaced < TOTAL_MINES) {
            cell.isFlagged = true;
            cell.element.classList.add('flag');
            cell.element.innerText = '[!]';
            flagsPlaced++;
        }
    } else {
        cell.isFlagged = false;
        cell.element.classList.remove('flag');
        cell.element.innerText = '';
        flagsPlaced--;
    }
    updateFlagHUD();
}

function updateFlagHUD() {
    flagDisplay.innerText = `${TOTAL_MINES - flagsPlaced}`;
}

// Flood-fill Algorithm
function revealCell(r, c) {
    if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return;
    const cell = board[r][c];
    
    if (cell.isRevealed || cell.isFlagged) return;
    
    cell.isRevealed = true;
    cell.element.classList.remove('hidden-cell');
    cell.element.classList.add('revealed-cell');
    tilesRevealed++;

    if (cell.neighborMines > 0) {
        cell.element.innerText = cell.neighborMines;
        cell.element.classList.add(`ms-color-${cell.neighborMines}`);
    } else {
        // If it's a 0, recursively reveal all 8 neighbors!
        for (let i = -1; i <= 1; i++) {
            for (let j = -1; j <= 1; j++) {
                revealCell(r + i, c + j);
            }
        }
    }
}

// --- 3. WIN / LOSS STATES ---

function triggerDefeat() {
    gameActive = false;
    statusText.innerText = "> FATAL ERROR: Ordnance Detonated.";
    statusText.style.color = "var(--alert-red)";
    document.getElementById('btn-replay').classList.remove('hidden');

    // Reveal all mines so they see where they messed up
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            if (board[r][c].isMine) {
                board[r][c].element.classList.remove('hidden-cell');
                board[r][c].element.classList.add('revealed-cell', 'mine');
                board[r][c].element.innerText = 'X';
            }
        }
    }
}

function checkWin() {
    // Total safe tiles = (81 - 10) = 71
    if (tilesRevealed === (ROWS * COLS) - TOTAL_MINES) {
        gameActive = false;
        triggerVictory();
    }
}

async function triggerVictory() {
    if (!currentUserId) return;

    statusText.innerText = `> Sector Cleared. Depositing ${missionReward} Supply Points...`;
    statusText.style.color = "var(--neon-cyan)";

    // Flag remaining mines for aesthetic flair
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            if (board[r][c].isMine && !board[r][c].isFlagged) {
                board[r][c].element.classList.add('flag');
                board[r][c].element.innerText = '[!]';
            }
        }
    }

    const { error } = await supabase.rpc('admin_grant_points', { 
        p_target_id: currentUserId, p_points: missionReward 
    });

    if (!error) {
        statusText.innerText = `> Mission Accomplished. +${missionReward} Points secured.`;
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