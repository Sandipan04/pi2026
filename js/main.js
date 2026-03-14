// js/main.js
import { supabase } from './supabase.js';
import { drawGrid, canvas, camera, getGridCoords } from './grid.js';
import { setLoggedInState, setLoggedOutState, isLoggedIn } from './auth.js';
import { fetchLeaderboards, processPurchase, cheatPoints } from './economy.js';
import { calculatePi, ERROR_THRESHOLD_STEP } from './pi_calculator.js'; 

// DOM Elements
const logDiv = document.getElementById('log');
const hoverCoordDisplay = document.getElementById('hover-coord');
const toolSelector = document.getElementById('tool-selector');

function updateUI(id, value) {
    const el = document.getElementById(id);
    if (el) el.innerText = value;
}

// --- NEW CHUNK STATE ---
let globalGridSize = 100;
let loadedChunks = {}; // Maps "chunk_id" to its 10,000 char string
let hoverX = -1;
let hoverY = -1;
let currentUserId = null;
let equippedColor = '1';
let currentTool = '2'; 

let lastFireTime = 0; 
let localPoints = 0;
let localLifetime = 0;
let localBomb2 = 0; let localBomb3 = 0; let localBomb5 = 0; let localBomb8 = 0; let localBomb13 = 0;

if (toolSelector) {
    toolSelector.addEventListener('change', (e) => { currentTool = e.target.value; });
}

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
    let availableWidth = wrapper.clientWidth;
    let availableHeight = wrapper.clientHeight;

    if (availableHeight > availableWidth) availableHeight = availableWidth; 

    canvas.width = availableWidth;
    canvas.height = availableHeight;
    canvas.style.width = availableWidth + 'px';
    canvas.style.height = availableHeight + 'px';

    if (Object.keys(loadedChunks).length > 0) drawGrid(loadedChunks, hoverX, hoverY);
}

window.addEventListener('resize', resizeCanvas);
setTimeout(resizeCanvas, 100); 

async function initializeApp() {
    log("Booting Infinite Universe Engine...");
    await fetchPublicData();

    const controlsHint = document.getElementById('controls-hint');
    const isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
    if (controlsHint && isTouchDevice) controlsHint.innerText = "[ Tap to Fire Payload | 2-Finger Drag to Pan | Pinch to Zoom ]";

    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
        const { data: userRow } = await supabase.from('users').select('username').eq('id', session.user.id).single();
        let displayUsername = userRow ? userRow.username : (session.user.user_metadata?.full_name || "Commander");

        if (!userRow) {
            log("First time login! Supplying munitions...");
            await supabase.from('users').insert([{ id: session.user.id, username: displayUsername, points: 1000, bomb_2: 10, bomb_3: 5 }]);
        }

        log("Session found. Logging in as " + displayUsername);
        setLoggedInState(displayUsername, session.user);
        fetchPrivateData();
        
        const navBar = document.getElementById('nav-bar');
        if (navBar) navBar.classList.remove('hidden');
    }
}

// --- DATA FETCHING ---
async function fetchPublicData() {
    try {
        const { data: stats } = await supabase.from('global_stats').select('*').single();
        if (!stats) return;

        const piData = calculatePi(stats.total_explored, stats.total_coprime, stats.global_points, stats.pi_tier_override);    

        globalGridSize = 100;
        // If the total explored area is >= 60% of the current grid's maximum area, expand!
        while (stats.total_explored >= 0.6 * (globalGridSize * globalGridSize)) {
            globalGridSize += 100;
        }
        
        updateUI('pi-estimate', piData.pi);
        updateUI('global-points-display', stats.global_points);
        updateUI('global-next-goal', piData.nextGoal);
        updateUI('pi-tier-display', piData.tier);
        updateUI('grid-size-display', `${globalGridSize}x${globalGridSize}`); // <-- Updated!
        updateUI('total-placed-display', stats.total_explored);
        updateUI('total-glowing-display', stats.total_coprime);

        const progressBar = document.getElementById('global-progress-bar');
        if (progressBar) {
            const pointsInCurrentTier = stats.global_points % ERROR_THRESHOLD_STEP;
            const progressPercentage = (pointsInCurrentTier / ERROR_THRESHOLD_STEP) * 100;
            progressBar.style.width = `${progressPercentage}%`;
        }

        // --- NEW: FETCH ALL CHUNKS ---
        const { data: chunks } = await supabase.from('grid_chunks').select('*');
        if (chunks) {
            chunks.forEach(c => loadedChunks[c.chunk_id] = c.data);
            drawGrid(loadedChunks, hoverX, hoverY); 
        }
    } catch (err) {
        console.error("Public Data Fetch Error:", err);
    }
}

async function fetchPrivateData() {
    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        currentUserId = session.user.id; 

        const { data: user, error } = await supabase
            .from('users')
            .select('id, points, lifetime_points, equipped_color, unlocked_colors, bomb_2, bomb_3, bomb_5, bomb_8, bomb_13, is_admin')
            .eq('id', currentUserId) 
            .single();

        if (user) {
            localPoints = user.points; localLifetime = user.lifetime_points; equippedColor = user.equipped_color;
            localBomb2 = user.bomb_2; localBomb3 = user.bomb_3; localBomb5 = user.bomb_5; localBomb8 = user.bomb_8; localBomb13 = user.bomb_13;

            updateUI('point-count', localPoints); updateUI('bomb-2-count', localBomb2); updateUI('bomb-3-count', localBomb3);
            updateUI('bomb-5-count', localBomb5); updateUI('bomb-8-count', localBomb8); updateUI('bomb-13-count', localBomb13);

            if (user.is_admin) {
                const userInfo = document.getElementById('user-info');
                if (userInfo && !userInfo.innerHTML.includes('ADMIN')) {
                    userInfo.innerHTML += ` | <a href="admin.html" style="color: var(--neon-pink); font-size: 0.8em; text-decoration: none;">[ADMIN TERMINAL]</a>`;
                }
            }
        }
    } catch (err) {}
}

// --- AUTHENTICATION LISTENERS (Kept identical) ---
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
        setLoggedInState(displayName, data.user); fetchPrivateData();
        document.getElementById('nav-bar')?.classList.remove('hidden');
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
        setLoggedInState(userRow ? userRow.username : email, data.user); fetchPrivateData();
        document.getElementById('nav-bar')?.classList.remove('hidden');
    });
}

const btnLogout = document.getElementById('btn-logout');
if (btnLogout) {
    btnLogout.addEventListener('click', async () => {
        await supabase.auth.signOut(); setLoggedOutState(); log("Logged out successfully.");
        document.getElementById('nav-bar')?.classList.add('hidden');
    });
}

// --- CAMERA & MOUSE CONTROLS ---
canvas.addEventListener('contextmenu', e => e.preventDefault());

let isDragging = false;
let lastMouseX = 0; let lastMouseY = 0; let dragDistance = 0; 

canvas.addEventListener('mousedown', (e) => {
    isDragging = true; dragDistance = 0; lastMouseX = e.clientX; lastMouseY = e.clientY;
});

window.addEventListener('mouseup', () => { isDragging = false; });

canvas.addEventListener('mousemove', (event) => {
    const rect = canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    if (isDragging) {
        const deltaX = event.clientX - lastMouseX; const deltaY = event.clientY - lastMouseY;
        dragDistance += Math.abs(deltaX) + Math.abs(deltaY);
        camera.x += deltaX; camera.y += deltaY;
        lastMouseX = event.clientX; lastMouseY = event.clientY;
    }

    const coords = getGridCoords(mouseX, mouseY);
    hoverX = coords.gridX; hoverY = coords.gridY;

    if (hoverCoordDisplay) hoverCoordDisplay.innerText = (hoverX >= 0 && hoverY >= 0) ? `(${hoverX}, ${hoverY})` : `Out of bounds`;
    drawGrid(loadedChunks, hoverX, hoverY);
});

canvas.addEventListener('wheel', (event) => {
    event.preventDefault(); 
    camera.zoom += event.deltaY * -0.001;
    if (camera.zoom < 0.2) camera.zoom = 0.2;
    if (camera.zoom > 3.0) camera.zoom = 3.0;
    drawGrid(loadedChunks, hoverX, hoverY);
});

// --- MOBILE TOUCH CONTROLS ---
let initialPinchDistance = null; let wasZoomingOrPanning = false; let lastPanX = 0; let lastPanY = 0;

canvas.addEventListener('touchstart', (e) => {
    if (e.touches.length === 1) {
        wasZoomingOrPanning = false; dragDistance = 0; lastMouseX = e.touches[0].clientX; lastMouseY = e.touches[0].clientY;
    } else if (e.touches.length === 2) {
        e.preventDefault(); wasZoomingOrPanning = true;
        lastPanX = (e.touches[0].clientX + e.touches[1].clientX) / 2; lastPanY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
        initialPinchDistance = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
    }
}, { passive: false });

canvas.addEventListener('touchmove', (e) => {
    if (e.touches.length === 1) {
        dragDistance += Math.abs(e.touches[0].clientX - lastMouseX) + Math.abs(e.touches[0].clientY - lastMouseY);
    } else if (e.touches.length === 2) {
        e.preventDefault(); 
        const currentPanX = (e.touches[0].clientX + e.touches[1].clientX) / 2; const currentPanY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
        camera.x += (currentPanX - lastPanX); camera.y += (currentPanY - lastPanY);
        lastPanX = currentPanX; lastPanY = currentPanY;

        if (initialPinchDistance) {
            const currentDistance = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
            camera.zoom += (currentDistance - initialPinchDistance) * 0.005;
            if (camera.zoom < 0.2) camera.zoom = 0.2; if (camera.zoom > 3.0) camera.zoom = 3.0;
            initialPinchDistance = currentDistance;
        }
        drawGrid(loadedChunks, hoverX, hoverY);
    }
}, { passive: false });

canvas.addEventListener('touchend', (e) => {
    if (e.touches.length === 0) {
        if (!wasZoomingOrPanning && dragDistance < 15) { 
            e.preventDefault(); 
            const rect = canvas.getBoundingClientRect();
            const coords = getGridCoords(lastMouseX - rect.left, lastMouseY - rect.top);
            hoverX = coords.gridX; hoverY = coords.gridY;
            canvas.dispatchEvent(new MouseEvent('click'));
        }
        initialPinchDistance = null; wasZoomingOrPanning = false; 
    }
}, { passive: false });


// --- THE NEW CROSS-CHUNK MISSILE LOGIC ---
canvas.addEventListener('click', async () => {
    const now = Date.now();
    if (now - lastFireTime < 400) return; 
    lastFireTime = now;

    if (dragDistance > 5) return;
    if (!isLoggedIn) { log("Please Log In or Sign Up!"); return; }
    if (hoverX < 0 || hoverY < 0) return; // Keep strikes in positive space for now

    if (currentTool === '2' && localBomb2 <= 0) { log("Out of Mk-2 Clusters!"); return; }
    if (currentTool === '3' && localBomb3 <= 0) { log("Out of Mk-3 Clusters!"); return; }
    if (currentTool === '5' && localBomb5 <= 0) { log("Out of Mk-5 Clusters!"); return; }
    if (currentTool === '8' && localBomb8 <= 0) { log("Out of Mk-8 Clusters!"); return; }
    if (currentTool === '13' && localBomb13 <= 0) { log("Out of Mk-13 Clusters!"); return; }

    let blastRadius = parseInt(currentTool);
    
    // Dictionary to group database updates by their specific chunks
    let impactsByChunk = {};
    let totalTargetsHit = 0;

    for (let dx = -blastRadius; dx <= blastRadius; dx++) {
        for (let dy = -blastRadius; dy <= blastRadius; dy++) {
            if (dx*dx + dy*dy <= blastRadius*blastRadius) {
                let targetX = hoverX + dx;
                let targetY = hoverY + dy;

                if (targetX >= 0 && targetX < globalGridSize && targetY >= 0 && targetY < globalGridSize) {
                    // 1. Mathematically determine WHICH chunk this pixel belongs to
                    let chunkX = Math.floor(targetX / 100);
                    let chunkY = Math.floor(targetY / 100);
                    let chunkId = `${chunkX}_${chunkY}`;

                    // 2. Determine its local coordinates within that specific chunk
                    let localX = targetX % 100;
                    let localY = targetY % 100;
                    let stringIndex = (localY * 100) + localX;

                    // 3. Auto-generate the chunk locally if it's completely unexplored
                    if (!loadedChunks[chunkId]) {
                        loadedChunks[chunkId] = '0'.repeat(10000);
                    }

                    if (loadedChunks[chunkId][stringIndex] === '0') {
                        let isCoprime = gcd(targetX, targetY) === 1;
                        let newState = isCoprime ? equippedColor : '2'; 
                        
                        // Initialize the array for this chunk if needed
                        if (!impactsByChunk[chunkId]) impactsByChunk[chunkId] = [];
                        
                        impactsByChunk[chunkId].push({ index: stringIndex, state: newState, coprime: isCoprime });
                        totalTargetsHit++;

                        // Instantly update the HTML Canvas
                        loadedChunks[chunkId] = loadedChunks[chunkId].substring(0, stringIndex) + newState + loadedChunks[chunkId].substring(stringIndex + 1);
                    }
                }
            }
        }
    }

    if (totalTargetsHit === 0) {
        log("Radar confirms sector is already destroyed or mapped!"); return;
    }

    drawGrid(loadedChunks, hoverX, hoverY);
    log(`Missiles away! Firing Mk-${blastRadius}. Processing ${totalTargetsHit} multi-sector impacts...`);

    if (currentTool === '2') { localBomb2--; updateUI('bomb-2-count', localBomb2); }
    if (currentTool === '3') { localBomb3--; updateUI('bomb-3-count', localBomb3); }
    if (currentTool === '5') { localBomb5--; updateUI('bomb-5-count', localBomb5); }
    if (currentTool === '8') { localBomb8--; updateUI('bomb-8-count', localBomb8); }
    if (currentTool === '13') { localBomb13--; updateUI('bomb-13-count', localBomb13); }

    // --- NEW: DATABASE AMMO DEDUCTION ---
    // We update the database here (ONCE) so multi-chunk blasts don't charge you multiple times!
    let newAmmoCount = 0;
    if (currentTool === '2') newAmmoCount = localBomb2;
    else if (currentTool === '3') newAmmoCount = localBomb3;
    else if (currentTool === '5') newAmmoCount = localBomb5;
    else if (currentTool === '8') newAmmoCount = localBomb8;
    else if (currentTool === '13') newAmmoCount = localBomb13;

    const { error: updateError } = await supabase
        .from('users')
        .update({ [`bomb_${blastRadius}`]: newAmmoCount })
        .eq('id', currentUserId);

    if (updateError) {
        console.error("Failed to deduct ammo:", updateError);
    }
    // ------------------------------------

    // Execute separate database strikes for every chunk the blast touched
    for (const [chunkId, coordsToProcess] of Object.entries(impactsByChunk)) {
        const { error } = await supabase.rpc('fire_missile_batch', { 
            p_chunk_id: chunkId, 
            p_batch: coordsToProcess, 
            p_radius: blastRadius // Radius doesn't matter for the DB, but keeps signature intact
        });
        if (error) console.error(`Failed to update chunk ${chunkId}:`, error);
    }

    fetchPublicData(); fetchPrivateData();
});

// --- NAVIGATION LOGIC ---
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
        const unitCost = parseInt(e.target.getAttribute('data-unitcost'));

        let quantity = 1; let totalCost = unitCost;

        if (type === 'bomb') {
            const inputEl = document.getElementById(`qty-bomb-${val}`);
            if (inputEl) { quantity = Math.max(1, parseInt(inputEl.value) || 1); totalCost = unitCost * quantity; }
        }

        const { data: user } = await supabase.from('users').select('*').eq('id', currentUserId).single();
        const success = await processPurchase(user, type, val, totalCost, quantity);
        
        if (success) {
            fetchPrivateData(); 
            if (type === 'bomb') {
                document.getElementById(`qty-bomb-${val}`).value = 1;
                document.getElementById(`total-cost-${val}`).innerText = unitCost;
                document.getElementById(`details-mk${val}`).classList.add('hidden');
            }
        }
    });
});

document.getElementById('cheat-points')?.addEventListener('click', async () => {
    await cheatPoints(currentUserId, localPoints, localLifetime); fetchPrivateData();
});
document.getElementById('nav-minigames')?.addEventListener('click', () => {
    window.location.href = 'arcade.html'; 
});

initializeApp();