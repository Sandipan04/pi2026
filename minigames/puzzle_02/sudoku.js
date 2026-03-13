// minigames/puzzle_02/sudoku.js
import { supabase } from '../../js/supabase.js';
import { missions } from '../../js/missions.js';

const gridElement = document.getElementById('sudoku-grid');
const statusText = document.getElementById('game-status');
const bountyDisplay = document.getElementById('bounty-display');

let currentUserId = null;
let gameActive = true;
let missionReward = 0; 

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
    const missionData = missions.find(m => m.id === "sudoku_6x6");
    if (missionData) {
        missionReward = missionData.reward;
        bountyDisplay.innerText = `Bounty: +${missionReward} Supply Points`;
    }

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

// --- 2. SUDOKU MATHEMATICS (6x6 CORE) ---
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

// Generate the fully solved master key
function solveBoard(board) {
    for (let row = 0; row < 6; row++) {
        for (let col = 0; col < 6; col++) {
            if (board[row][col] === 0) {
                let nums = [1, 2, 3, 4, 5, 6].sort(() => Math.random() - 0.5);
                for (let num of nums) {
                    if (isValid(board, row, col, num)) {
                        board[row][col] = num;
                        if (solveBoard(board)) return true;
                        board[row][col] = 0; 
                    }
                }
                return false;
            }
        }
    }
    return true;
}

// Ensure the board only has one valid mathematical reality
function countSolutions(grid) {
    let count = 0;
    function solve() {
        for (let row = 0; row < 6; row++) {
            for (let col = 0; col < 6; col++) {
                if (grid[row][col] === 0) {
                    for (let num = 1; num <= 6; num++) {
                        if (isValid(grid, row, col, num)) {
                            grid[row][col] = num;
                            solve();
                            if (count > 1) {
                                grid[row][col] = 0; 
                                return; 
                            }
                            grid[row][col] = 0; 
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

// Dig holes safely, reverting if a bifurcation occurs
function createUniquePuzzle(fullGrid, targetHoles) {
    let puzzleGrid = JSON.parse(JSON.stringify(fullGrid));
    
    let positions = [];
    for (let i = 0; i < 36; i++) positions.push(i); // 36 tiles for a 6x6 grid
    positions.sort(() => Math.random() - 0.5);

    let holesDug = 0;
    
    for (let i = 0; i < positions.length; i++) {
        if (holesDug >= targetHoles) break;

        let row = Math.floor(positions[i] / 6);
        let col = positions[i] % 6;

        let backupVal = puzzleGrid[row][col];
        
        if (backupVal !== 0) {
            puzzleGrid[row][col] = 0; 

            if (countSolutions(puzzleGrid) === 1) {
                holesDug++; 
            } else {
                puzzleGrid[row][col] = backupVal; 
            }
        }
    }
    return puzzleGrid;
}

// --- 3. GAME INITIALIZATION ---
function initGame() {
    gridElement.innerHTML = '';
    gameActive = true;
    
    // 1. Generate master board
    solutionBoard = Array.from({length: 6}, () => Array(6).fill(0));
    solveBoard(solutionBoard);
    
    // 2. Dig unique holes (Remove ~18 clues for standard difficulty)
    // Note: If the verifier cannot safely remove 18 without causing multiple solutions, 
    // it will remove as many as mathematically safe and stop.
    playBoard = createUniquePuzzle(solutionBoard, 18);

    // 3. Draw the UI Grid
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
    
    let isWon = true;
    let isFilled = true;

    inputs.forEach(input => {
        let r = parseInt(input.dataset.row);
        let c = parseInt(input.dataset.col);
        let val = parseInt(input.value);
        
        if (isNaN(val)) {
            isFilled = false;
        } else if (val !== solutionBoard[r][c]) {
            isWon = false;
        }
    });

    // Only trigger victory if the board is completely filled AND correct
    if (isFilled && isWon) {
        gameActive = false;
        triggerVictory();
    }
}

async function triggerVictory() {
    if (!currentUserId) return;

    document.querySelectorAll('.sudoku-input').forEach(inp => inp.disabled = true);
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
        loadMissionIntel(); 
        await fetchPoints();
        initGame();
    }
}

bootSequence();