// minigames/puzzle_02/sudoku.js
import { supabase } from '../../js/supabase.js';
import { missions } from '../../js/missions.js';

const gridElement = document.getElementById('sudoku-grid');
const statusText = document.getElementById('game-status');
const bountyDisplay = document.getElementById('bounty-display');

let currentUserId = null;
let gameActive = true;
let missionReward = 0; // Will be dynamically loaded

// --- 1. BOOT SEQUENCE & DYNAMIC REWARD ---
async function verifyClearance() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        window.location.href = '../../index.html';
        return;
    }
    currentUserId = session.user.id;
}

async function fetchPoints() {
    if (!currentUserId) return;
    const { data: user } = await supabase.from('users').select('points').eq('id', currentUserId).single();
    if (user) document.getElementById('arcade-points').innerText = user.points;
}

function loadMissionIntel() {
    // 1. Pull dynamic reward
    const missionData = missions.find(m => m.id === "sudoku_6x6");
    if (missionData) {
        missionReward = missionData.reward;
        bountyDisplay.innerText = `Bounty: +${missionReward} Supply Points`;
    }

    // 2. Load the Guide & Wire the Accordion
    const guideContent = document.getElementById('guide-content');
    const toggleBtn = document.getElementById('btn-toggle-guide');
    
    fetch('sudoku.md').then(res => res.text()).then(text => {
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

// --- 2. SUDOKU MATHEMATICS ---
let solutionBoard = [];
let playBoard = [];

// Linear Algebra Check for Subgrids (2 rows x 3 cols)
function isValid(board, row, col, num) {
    for (let i = 0; i < 6; i++) {
        if (board[row][i] === num) return false;
        if (board[i][col] === num) return false;
    }
    const boxRow = Math.floor(row / 2) * 2;
    const boxCol = Math.floor(col / 3) * 3;
    for (let r = 0; r < 2; r++) {
        for (let c = 0; c < 3; c++) {
            if (board[boxRow + r][boxCol + c] === num) return false;
        }
    }
    return true;
}

function solveBoard(board) {
    for (let row = 0; row < 6; row++) {
        for (let col = 0; col < 6; col++) {
            if (board[row][col] === 0) {
                // Shuffle 1-6 to ensure random board generation
                let nums = [1, 2, 3, 4, 5, 6].sort(() => Math.random() - 0.5);
                for (let num of nums) {
                    if (isValid(board, row, col, num)) {
                        board[row][col] = num;
                        if (solveBoard(board)) return true;
                        board[row][col] = 0; // Backtrack
                    }
                }
                return false;
            }
        }
    }
    return true;
}

// --- 3. GAME INITIALIZATION ---
function initGame() {
    gridElement.innerHTML = '';
    gameActive = true;
    
    // Generate empty board, solve it, then poke holes
    solutionBoard = Array.from({length: 6}, () => Array(6).fill(0));
    solveBoard(solutionBoard);
    playBoard = JSON.parse(JSON.stringify(solutionBoard));

    // Remove random clues (Difficulty setting: remove 18 numbers)
    let cluesToRemove = 18;
    while (cluesToRemove > 0) {
        let r = Math.floor(Math.random() * 6);
        let c = Math.floor(Math.random() * 6);
        if (playBoard[r][c] !== 0) {
            playBoard[r][c] = 0;
            cluesToRemove--;
        }
    }

    // Draw the UI Grid
    for (let r = 0; r < 6; r++) {
        for (let c = 0; c < 6; c++) {
            const cell = document.createElement('div');
            cell.className = 'sudoku-cell';

            if (playBoard[r][c] !== 0) {
                cell.classList.add('sudoku-static');
                cell.innerText = playBoard[r][c];
            } else {
                const input = document.createElement('input');
                input.type = 'number';
                input.className = 'sudoku-input';
                input.dataset.row = r;
                input.dataset.col = c;
                input.min = 1;
                input.max = 6;
                input.addEventListener('input', checkWinCondition);
                cell.appendChild(input);
            }
            gridElement.appendChild(cell);
        }
    }
}

// --- 4. VICTORY LOGIC ---
function checkWinCondition() {
    if (!gameActive) return;
    const inputs = document.querySelectorAll('.sudoku-input');
    
    // Check if every input matches the solution board exactly
    let isWon = true;
    inputs.forEach(input => {
        let r = parseInt(input.dataset.row);
        let c = parseInt(input.dataset.col);
        let val = parseInt(input.value);
        if (val !== solutionBoard[r][c]) {
            isWon = false;
        }
    });

    if (isWon) {
        gameActive = false;
        triggerVictory();
    }
}

async function triggerVictory() {
    if (!currentUserId) return;

    document.querySelectorAll('.sudoku-input').forEach(inp => inp.disabled = true);
    statusText.innerText = `> Matrix stabilized. Depositing ${missionReward} Supply Points...`;
    statusText.style.color = "var(--neon-cyan)";

    // Use the dynamic reward amount directly!
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
    }
}

document.getElementById('btn-replay').addEventListener('click', () => {
    document.getElementById('btn-replay').classList.add('hidden');
    statusText.innerText = "";
    initGame(); 
});

// Master Boot Sequence
async function bootSequence() {
    await verifyClearance();
    if (currentUserId) {
        loadMissionIntel(); // Pulls reward points & guide
        await fetchPoints();
        initGame();
    }
}

bootSequence();