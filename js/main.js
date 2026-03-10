// js/main.js
import { supabase } from './supabase.js';
import { drawGrid, canvas, camera, getGridCoords } from './grid.js';
import { setLoggedInState, setLoggedOutState, isLoggedIn } from './auth.js';
import { fetchLeaderboards, processPurchase, cheatPoints } from './economy.js';
import { calculatePi } from './pi_calculator.js';

// DOM Elements
const logDiv = document.getElementById('log');
const hoverCoordDisplay = document.getElementById('hover-coord');
const toolSelector = document.getElementById('tool-selector');

// UI Helper to prevent invisible crashes
function updateUI(id, value) {
    const el = document.getElementById(id);
    if (el) el.innerText = value;
}

// Game State
let currentChunkData = "";
let hoverX = -1;
let hoverY = -1;
let currentUserId = null;
let equippedColor = '1';
let currentTool = '2'; // Default to smallest bomb

let localPoints = 0;
let localLifetime = 0;
let localBomb2 = 0; let localBomb3 = 0; let localBomb5 = 0; let localBomb8 = 0; let localBomb13 = 0;

let pendingBatch = [];
let batchTimer = null;

if (toolSelector) {
    toolSelector.addEventListener('change', (e) => { currentTool = e.target.value; });
}

// --- UTILITIES ---
function log(msg) {
    console.log(msg);
    if (logDiv) {
        logDiv.innerHTML += `<br>> ${msg}`;
        logDiv.scrollTop = logDiv.scrollHeight;
    }
}

function gcd(a, b) {
    if (b === 0) return a;
    return gcd(b, a % b);
}

// --- INITIALIZATION ---

function resizeCanvas() {
    const wrapper = canvas.parentElement;
    canvas.width = wrapper.clientWidth;
    canvas.height = wrapper.clientHeight;
    if (currentChunkData) drawGrid(currentChunkData, hoverX, hoverY);
}
window.addEventListener('resize', resizeCanvas);
setTimeout(resizeCanvas, 100); // Trigger once on load

async function initializeApp() {
    log("Booting Universe Engine...");
    await fetchPublicData();

    const { data: { session } } = await supabase.auth.getSession();

    if (session) {
        const { data: userRow } = await supabase.from('users').select('username').eq('id', session.user.id).single();
        let displayUsername = "";

        if (!userRow) {
            displayUsername = session.user.user_metadata?.full_name || "Commander";
            log("First time login! Supplying munitions...");
            await supabase.from('users').insert([{ id: session.user.id, username: displayUsername, points: 1000, bomb_2: 10, bomb_3: 5 }]);
        } else {
            displayUsername = userRow.username;
        }

        log("Session found. Logging in as " + displayUsername);
        setLoggedInState(displayUsername, session.user);
        fetchPrivateData();
        
        // Unhide nav bar if it exists
        const navBar = document.getElementById('nav-bar');
        if (navBar) navBar.classList.remove('hidden');
    }
}

// --- DATA FETCHING ---
async function fetchPublicData() {
    try {
        const { data: stats } = await supabase.from('global_stats').select('*').single();
        if (!stats) return;

        // Run the isolated Math calculation
        const piData = calculatePi(stats.total_explored, stats.total_coprime, stats.global_points, stats.pi_tier_override);    

        // Safely update all HUD text without crashing if HTML is missing
        updateUI('pi-estimate', piData.pi);
        updateUI('global-points-display', stats.global_points);
        updateUI('global-next-goal', piData.nextGoal);
        updateUI('pi-tier-display', piData.tier);
        updateUI('grid-size-display', `${stats.grid_size}x${stats.grid_size}`);
        updateUI('total-placed-display', stats.total_explored);
        updateUI('total-glowing-display', stats.total_coprime);

        // Fill the visual Progress Bar safely
        const progressBar = document.getElementById('global-progress-bar');
        if (progressBar) {
            let pct = Math.min((stats.global_points / piData.nextGoal) * 100, 100);
            progressBar.style.width = `${pct}%`;
        }

        // CRITICAL: Load the chunk data AFTER UI updates so a UI error doesn't stop this
        const { data: chunk } = await supabase.from('grid_chunks').select('data').eq('chunk_id', '0_0').single();
        if (chunk && chunk.data) {
            currentChunkData = chunk.data;
            drawGrid(currentChunkData, hoverX, hoverY); 
        } else {
            log("Error: Chunk data not found or empty in database!");
        }
    } catch (err) {
        console.error("Public Data Fetch Error:", err);
        log("Engine error while fetching universe state.");
    }
}

async function fetchPrivateData() {
    try {
        // NEW: Added is_admin to the select query
        const { data: user, error } = await supabase.from('users').select('id, points, lifetime_points, equipped_color, unlocked_colors, bomb_2, bomb_3, bomb_5, bomb_8, bomb_13, is_admin').single();
        if (!error && user) {
            currentUserId = user.id;
            localPoints = user.points; localLifetime = user.lifetime_points; equippedColor = user.equipped_color;
            localBomb2 = user.bomb_2; localBomb3 = user.bomb_3; localBomb5 = user.bomb_5; localBomb8 = user.bomb_8; localBomb13 = user.bomb_13;

            updateUI('point-count', localPoints);
            updateUI('bomb-2-count', localBomb2);
            updateUI('bomb-3-count', localBomb3);
            updateUI('bomb-5-count', localBomb5);
            updateUI('bomb-8-count', localBomb8);
            updateUI('bomb-13-count', localBomb13);

            // NEW: Inject the Admin Link if authorized
            if (user.is_admin) {
                const userInfo = document.getElementById('user-info');
                if (userInfo && !userInfo.innerHTML.includes('ADMIN')) {
                    userInfo.innerHTML += ` | <a href="admin.html" style="color: var(--neon-pink); font-size: 0.8em; text-decoration: none;">[ADMIN TERMINAL]</a>`;
                }
            }
        }
    } catch (err) {
        console.error("Private Data Fetch Error:", err);
    }
}

// --- AUTHENTICATION EVENT LISTENERS ---
const btnSignup = document.getElementById('btn-signup');
if (btnSignup) {
    btnSignup.addEventListener('click', async () => {
        const email = document.getElementById('email')?.value.trim();
        const password = document.getElementById('password')?.value;
        const displayName = document.getElementById('display-name')?.value.trim();

        if (!email || !password || !displayName) { log("Please fill all fields to sign up."); return; }

        log("Registering commander...");
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) { log("Auth Error: " + error.message); return; }

        await supabase.from('users').insert([{ id: data.user.id, username: displayName, points: 1000, bomb_2: 10, bomb_3: 5 }]);
        setLoggedInState(displayName, data.user);
        fetchPrivateData();
        
        const navBar = document.getElementById('nav-bar');
        if (navBar) navBar.classList.remove('hidden');
    });
}

const btnLogin = document.getElementById('btn-login');
if (btnLogin) {
    btnLogin.addEventListener('click', async () => {
        const email = document.getElementById('email')?.value.trim();
        const password = document.getElementById('password')?.value;

        if (!email || !password) { log("Please enter email and password."); return; }

        log("Logging in...");
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) { log("Login Error: " + error.message); return; }

        const { data: userRow } = await supabase.from('users').select('username').eq('id', data.user.id).single();
        setLoggedInState(userRow ? userRow.username : email, data.user);
        fetchPrivateData();
        
        const navBar = document.getElementById('nav-bar');
        if (navBar) navBar.classList.remove('hidden');
    });
}

const btnGoogle = document.getElementById('btn-google');
if (btnGoogle) {
    btnGoogle.addEventListener('click', async () => {
        await supabase.auth.signInWithOAuth({ provider: 'google' });
    });
}

const btnLogout = document.getElementById('btn-logout');
if (btnLogout) {
    btnLogout.addEventListener('click', async () => {
        await supabase.auth.signOut();
        setLoggedOutState();
        log("Logged out successfully.");
        
        const navBar = document.getElementById('nav-bar');
        if (navBar) navBar.classList.add('hidden');
    });
}

// --- CAMERA & MOUSE CONTROLS ---

// Disable the default right-click menu
canvas.addEventListener('contextmenu', e => e.preventDefault());

let isDragging = false;
let lastMouseX = 0;
let lastMouseY = 0;
let dragDistance = 0; // Tracks how far the mouse moves during a click

// Mouse Down: Start dragging on ANY click (Left, Middle, or Right)
canvas.addEventListener('mousedown', (e) => {
    isDragging = true;
    dragDistance = 0; // Reset the drag tracker
    lastMouseX = e.clientX;
    lastMouseY = e.clientY;
});

// Mouse Up: Stop dragging
window.addEventListener('mouseup', () => {
    isDragging = false;
});

canvas.addEventListener('mousemove', (event) => {
    const rect = canvas.getBoundingClientRect();
    
    // We removed the scale multiplier because the canvas dynamically resizes now!
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    if (isDragging) {
        const deltaX = event.clientX - lastMouseX;
        const deltaY = event.clientY - lastMouseY;

        dragDistance += Math.abs(deltaX) + Math.abs(deltaY);

        camera.x += deltaX;
        camera.y += deltaY;

        lastMouseX = event.clientX;
        lastMouseY = event.clientY;
    }

    const coords = getGridCoords(mouseX, mouseY);
    hoverX = coords.gridX;
    hoverY = coords.gridY;

    if (hoverCoordDisplay) {
        hoverCoordDisplay.innerText = (hoverX >= 0 && hoverY >= 0) ? `(${hoverX}, ${hoverY})` : `Out of bounds`;
    }

    drawGrid(currentChunkData, hoverX, hoverY);
});

// Mouse Wheel: Zoom
canvas.addEventListener('wheel', (event) => {
    event.preventDefault(); 
    const zoomAmount = event.deltaY * -0.001;
    camera.zoom += zoomAmount;
    if (camera.zoom < 0.2) camera.zoom = 0.2;
    if (camera.zoom > 3.0) camera.zoom = 3.0;
    drawGrid(currentChunkData, hoverX, hoverY);
});

// Mouse Click: Fire Missiles
canvas.addEventListener('click', async () => {
    // CRITICAL FIX: If they dragged the map, abort the missile launch!
    if (dragDistance > 5) return;

    if (!isLoggedIn) { alert("Please Log In or Sign Up!"); return; }
    if (hoverX < 0 || hoverY < 0) return; 

    // --- MUNITIONS VALIDATION ---
    if (currentTool === '2' && localBomb2 <= 0) { alert("Out of Mk-2 Clusters!"); return; }
    if (currentTool === '3' && localBomb3 <= 0) { alert("Out of Mk-3 Clusters!"); return; }
    if (currentTool === '5' && localBomb5 <= 0) { alert("Out of Mk-5 Clusters!"); return; }
    if (currentTool === '8' && localBomb8 <= 0) { alert("Out of Mk-8 Clusters!"); return; }
    if (currentTool === '13' && localBomb13 <= 0) { alert("Out of Mk-13 Clusters!"); return; }

    let blastRadius = parseInt(currentTool);
    let coordsToProcess = [];

    // Failsafe: Check if chunk is loaded properly
    if (!currentChunkData || currentChunkData.length < 10000) {
        log("Error: Chunk data not synchronized. Please refresh.");
        return;
    }

    for (let dx = -blastRadius; dx <= blastRadius; dx++) {
        for (let dy = -blastRadius; dy <= blastRadius; dy++) {
            if (dx*dx + dy*dy <= blastRadius*blastRadius) {
                let targetX = hoverX + dx;
                let targetY = hoverY + dy;

                if (targetX >= 0 && targetX < 100 && targetY >= 0 && targetY < 100) {
                    let stringIndex = (targetY * 100) + targetX;

                    if (currentChunkData[stringIndex] === '0') {
                        let isCoprime = gcd(targetX, targetY) === 1;
                        let newState = isCoprime ? equippedColor : '2'; 
                        coordsToProcess.push({ index: stringIndex, state: newState, coprime: isCoprime });

                        currentChunkData = currentChunkData.substring(0, stringIndex) + newState + currentChunkData.substring(stringIndex + 1);
                    }
                }
            }
        }
    }

    if (coordsToProcess.length === 0) {
        log("Radar confirms sector is already destroyed or mapped!"); return;
    }

    drawGrid(currentChunkData, hoverX, hoverY);

    log(`Missiles away! Firing Mk-${blastRadius} payload. Processing ${coordsToProcess.length} impacts...`);

    if (currentTool === '2') { localBomb2--; updateUI('bomb-2-count', localBomb2); }
    if (currentTool === '3') { localBomb3--; updateUI('bomb-3-count', localBomb3); }
    if (currentTool === '5') { localBomb5--; updateUI('bomb-5-count', localBomb5); }
    if (currentTool === '8') { localBomb8--; updateUI('bomb-8-count', localBomb8); }
    if (currentTool === '13') { localBomb13--; updateUI('bomb-13-count', localBomb13); }

    const { data, error } = await supabase.rpc('fire_missile_batch', { p_chunk_id: '0_0', p_batch: coordsToProcess, p_radius: blastRadius });

    if (error) log("Command Error: " + error.message);
    else log(`Strike confirmed! ${data?.success_count || 0} targets hit.`);

    fetchPublicData(); fetchPrivateData();
});

// --- NAVIGATION & VIEWS ---
function setupNav(btnId, showView, hideView1, hideView2) {
    const btn = document.getElementById(btnId);
    if (btn) {
        btn.addEventListener('click', () => {
            document.getElementById(showView)?.classList.remove('hidden');
            document.getElementById(hideView1)?.classList.add('hidden');
            document.getElementById(hideView2)?.classList.add('hidden');
            if (btnId === 'nav-leaderboard') fetchLeaderboards();
        });
    }
}

setupNav('nav-universe', 'view-universe', 'view-market', 'view-leaderboard');
setupNav('nav-market', 'view-market', 'view-universe', 'view-leaderboard');
setupNav('nav-leaderboard', 'view-leaderboard', 'view-universe', 'view-market');

// --- MARKETPLACE LOGIC ---
document.querySelectorAll('.buy-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
        const type = e.target.getAttribute('data-type');
        const val = e.target.getAttribute('data-qty') || e.target.getAttribute('data-val');
        const cost = parseInt(e.target.getAttribute('data-cost'));

        const { data: user } = await supabase.from('users').select('*').eq('id', currentUserId).single();
        const success = await processPurchase(user, type, val, cost);
        if (success) fetchPrivateData(); 
    });
});

const btnCheat = document.getElementById('cheat-points');
if (btnCheat) {
    btnCheat.addEventListener('click', async () => {
        await cheatPoints(currentUserId, localPoints, localLifetime);
        fetchPrivateData();
    });
}

// Start!
initializeApp();