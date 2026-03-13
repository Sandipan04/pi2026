// minigames/puzzle_07/unruly.js
import { supabase } from '../../js/supabase.js';
import { missions } from '../../js/missions.js';

const gridElement = document.getElementById('unruly-grid');
const statusText = document.getElementById('game-status');
const bountyDisplay = document.getElementById('bounty-display');

let currentUserId = null;
let gameActive = true;
let missionReward = 0;

const SIZE = 8; // Standard 8x8 grid
const MAX_COLOR = SIZE / 2; // Each row/col must have exactly 4 of each color

let masterBoard = [];
let playBoard = [];
let uiElements = [];

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
    const missionData = missions.find(m => m.id === "unruly");
    if (missionData) {
        missionReward = missionData.reward;
        bountyDisplay.innerText = `Bounty: +${missionReward} Pts`;
    }

    const guideContent = document.getElementById('guide-content');
    const toggleBtn = document.getElementById('btn-toggle-guide');
    
    fetch('unruly.md').then(res => res.text()).then(text => {
        if (window.marked) guideContent.innerHTML = marked.parse(text);
    }).catch(err => console.error("Guide missing", err));

    toggleBtn.addEventListener('click', () => {
        guideContent.classList.toggle('hidden');
        toggleBtn.innerText = guideContent.classList.contains('hidden') ? "[+] EXPAND TACTICAL BRIEFING" : "[-] COLLAPSE TACTICAL BRIEFING";
        toggleBtn.style.background = guideContent.classList.contains('hidden') ? "rgba(0, 255, 204, 0.1)" : "var(--neon-cyan)";
        toggleBtn.style.color = guideContent.classList.contains('hidden') ? "var(--neon-cyan)" : "#000";
    });
}

// --- 2. UNRULY MATHEMATICS ---

// Checks if placing 'val' at (r, c) violates any Unruly rules
function isSafe(board, r, c, val) {
    board[r][c] = val; // Temporarily place

    // 1. Check Row
    let count1 = 0, count2 = 0;
    for (let i = 0; i < SIZE; i++) {
        let v = board[r][i];
        if (v === 1) count1++;
        if (v === 2) count2++;
        // Check for 3 consecutive
        if (i >= 2 && v !== 0 && v === board[r][i-1] && v === board[r][i-2]) { board[r][c] = 0; return false; }
    }
    if (count1 > MAX_COLOR || count2 > MAX_COLOR) { board[r][c] = 0; return false; }

    // 2. Check Column
    count1 = 0; count2 = 0;
    for (let i = 0; i < SIZE; i++) {
        let v = board[i][c];
        if (v === 1) count1++;
        if (v === 2) count2++;
        // Check for 3 consecutive
        if (i >= 2 && v !== 0 && v === board[i-1][c] && v === board[i-2][c]) { board[r][c] = 0; return false; }
    }
    if (count1 > MAX_COLOR || count2 > MAX_COLOR) { board[r][c] = 0; return false; }

    board[r][c] = 0; // Remove temporary placement
    return true;
}

// Recursively fill the board to create a valid master key
function solveBoard(board) {
    for (let r = 0; r < SIZE; r++) {
        for (let c = 0; c < SIZE; c++) {
            if (board[r][c] === 0) {
                // Randomize color order to ensure varied maps
                let colors = Math.random() < 0.5 ? [1, 2] : [2, 1];
                for (let color of colors) {
                    if (isSafe(board, r, c, color)) {
                        board[r][c] = color;
                        if (solveBoard(board)) return true;
                        board[r][c] = 0; // Backtrack
                    }
                }
                return false;
            }
        }
    }
    return true;
}

// Counts exactly how many valid realities exist for the current board
function countSolutions(board) {
    let count = 0;
    function solve() {
        for (let r = 0; r < SIZE; r++) {
            for (let c = 0; c < SIZE; c++) {
                if (board[r][c] === 0) {
                    for (let color = 1; color <= 2; color++) {
                        if (isSafe(board, r, c, color)) {
                            board[r][c] = color;
                            solve();
                            if (count > 1) { board[r][c] = 0; return; } // Optimization abort
                            board[r][c] = 0;
                        }
                    }
                    return;
                }
            }
        }
        count++;
    }
    solve();
    return count;
}

// --- 3. GAME INITIALIZATION ---
function initGame() {
    gameActive = true;
    gridElement.innerHTML = '';
    statusText.innerText = "";
    uiElements = [];

    // 1. Generate Solved Master Board
    masterBoard = Array.from({length: SIZE}, () => Array(SIZE).fill(0));
    solveBoard(masterBoard);

    // 2. Deep copy and dig holes to create the playable puzzle
    playBoard = JSON.parse(JSON.stringify(masterBoard));
    let positions = [];
    for (let i = 0; i < SIZE * SIZE; i++) positions.push(i);
    positions.sort(() => Math.random() - 0.5);

    let holesDug = 0;
    // We aim to remove ~40 tiles. The solver ensures it's always logically deducible.
    for (let i = 0; i < positions.length; i++) {
        if (holesDug >= 40) break;
        
        let r = Math.floor(positions[i] / SIZE);
        let c = positions[i] % SIZE;
        let backup = playBoard[r][c];
        
        playBoard[r][c] = 0;
        
        // Unruly check: Does removing this cause multiple valid realities?
        if (countSolutions(playBoard) === 1) {
            holesDug++;
        } else {
            playBoard[r][c] = backup; // Bifurcation! Put it back.
        }
    }

    // 3. Render the UI
    for (let r = 0; r < SIZE; r++) {
        uiElements[r] = [];
        for (let c = 0; c < SIZE; c++) {
            const cell = document.createElement('div');
            cell.className = 'unruly-cell';
            
            let val = playBoard[r][c];
            if (val !== 0) {
                cell.classList.add('locked', `state-${val}`);
            } else {
                cell.addEventListener('click', () => handleCellClick(r, c));
            }
            
            uiElements[r][c] = cell;
            gridElement.appendChild(cell);
        }
    }
}

// --- 4. INTERACTION & VICTORY LOGIC ---
function handleCellClick(r, c) {
    if (!gameActive || playBoard[r][c] !== 0) return; // Ignore locked cells

    const cell = uiElements[r][c];
    
    // Cycle states: Empty(0) -> State(1) -> State(2) -> Empty(0)
    if (cell.classList.contains('state-1')) {
        cell.classList.remove('state-1');
        cell.classList.add('state-2');
    } else if (cell.classList.contains('state-2')) {
        cell.classList.remove('state-2');
    } else {
        cell.classList.add('state-1');
    }

    validateBoard();
}

function validateBoard() {
    // 1. Clear previous error styling
    for (let r = 0; r < SIZE; r++) {
        for (let c = 0; c < SIZE; c++) {
            uiElements[r][c].classList.remove('error');
        }
    }

    let isComplete = true;
    let hasErrors = false;

    // Build the current state matrix from the DOM classes
    let currentMatrix = Array.from({length: SIZE}, () => Array(SIZE).fill(0));
    for (let r = 0; r < SIZE; r++) {
        for (let c = 0; c < SIZE; c++) {
            if (uiElements[r][c].classList.contains('state-1')) currentMatrix[r][c] = 1;
            else if (uiElements[r][c].classList.contains('state-2')) currentMatrix[r][c] = 2;
            else isComplete = false; // Empty space found
        }
    }

    // 2. Live Validation (Highlights errors if player makes a mistake)
    for (let i = 0; i < SIZE; i++) {
        let rCount1 = 0, rCount2 = 0;
        let cCount1 = 0, cCount2 = 0;

        for (let j = 0; j < SIZE; j++) {
            // Check Row Counts
            if (currentMatrix[i][j] === 1) rCount1++;
            if (currentMatrix[i][j] === 2) rCount2++;
            // Check Col Counts
            if (currentMatrix[j][i] === 1) cCount1++;
            if (currentMatrix[j][i] === 2) cCount2++;

            // Check Row Consecutive (Horizontal)
            if (j >= 2 && currentMatrix[i][j] !== 0 && currentMatrix[i][j] === currentMatrix[i][j-1] && currentMatrix[i][j] === currentMatrix[i][j-2]) {
                uiElements[i][j].classList.add('error'); uiElements[i][j-1].classList.add('error'); uiElements[i][j-2].classList.add('error');
                hasErrors = true;
            }
            // Check Col Consecutive (Vertical)
            if (j >= 2 && currentMatrix[j][i] !== 0 && currentMatrix[j][i] === currentMatrix[j-1][i] && currentMatrix[j][i] === currentMatrix[j-2][i]) {
                uiElements[j][i].classList.add('error'); uiElements[j-1][i].classList.add('error'); uiElements[j-2][i].classList.add('error');
                hasErrors = true;
            }
        }

        // Highlight whole row/col if parity is broken
        if (rCount1 > MAX_COLOR || rCount2 > MAX_COLOR) {
            for(let j=0; j<SIZE; j++) uiElements[i][j].classList.add('error');
            hasErrors = true;
        }
        if (cCount1 > MAX_COLOR || cCount2 > MAX_COLOR) {
            for(let j=0; j<SIZE; j++) uiElements[j][i].classList.add('error');
            hasErrors = true;
        }
    }

    // 3. Check Win Condition
    if (isComplete && !hasErrors && gameActive) {
        gameActive = false;
        triggerVictory();
    }
}

async function triggerVictory() {
    if (!currentUserId) return;

    statusText.innerText = `> Protocol stabilized. Depositing ${missionReward} Supply Points...`;
    statusText.style.color = "var(--neon-cyan)";

    const { error } = await supabase.rpc('admin_grant_points', { 
        p_target_id: currentUserId, p_points: missionReward 
    });

    if (!error) {
        statusText.innerText = `> Parity Verified. +${missionReward} Points secured.`;
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

async function bootSequence() {
    await verifyClearance();
    if (currentUserId) {
        loadMissionIntel();
        await fetchPoints();
        initGame();
    }
}

bootSequence();