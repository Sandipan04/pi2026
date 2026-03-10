// ==========================================
// 1. CONFIGURATION & SETUP
// ==========================================
// Initialize Supabase Client
const supabaseUrl = 'https://pfyasxuoqxmnzyhqgyzu.supabase.co';
const supabaseKey = 'sb_publishable_vlohfHQ39FJuPKS5oKRn3Q_GbIhzDbS';
const supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);

// UI Elements - HUD & Auth
const logDiv = document.getElementById('log');
const authSection = document.getElementById('auth-section');
const gameControls = document.getElementById('game-controls');
const userInfo = document.getElementById('user-info');
const playerInventory = document.getElementById('player-inventory');
const piEstimateDisplay = document.getElementById('pi-estimate');
const hoverCoordDisplay = document.getElementById('hover-coord');
const lanternCountDisplay = document.getElementById('lantern-count');

// UI Elements - Canvas
const canvas = document.getElementById('universe');
const ctx = canvas.getContext('2d');

// Desmos-style Grid Variables
const TILE_SIZE = 6; 
const MARGIN_LEFT = 40;   // Room for Y-axis numbers
const MARGIN_BOTTOM = 40; // Room for X-axis numbers

// Global State
let isLoggedIn = false;
let currentChunkData = "";
let hoverX = -1;
let hoverY = -1;

// Simple logging utility
function log(msg) {
    console.log(msg);
    logDiv.innerHTML += `<br>> ${msg}`;
    // Auto-scroll log to bottom
    logDiv.scrollTop = logDiv.scrollHeight;
}


// ==========================================
// 2. BOOT SEQUENCE & DATA FETCHING
// ==========================================
// Run this immediately when the page loads
async function initializeApp() {
    log("Booting Universe Engine...");
    await fetchPublicData();

    // Check if the user is already logged in (or just returned from Google)
    const { data: { session } } = await supabaseClient.auth.getSession();
    
    if (session) {
        // Fetch their custom name from our database
        const { data: userRow } = await supabaseClient.from('users').select('username').eq('id', session.user.id).single();
        
        let displayUsername = "";

        if (!userRow) {
            // First time Google login! They don't have a row yet.
            displayUsername = session.user.user_metadata.full_name || "Google_Mapper";
            log("First time login! Giving you 10 lanterns...");
            await supabaseClient.from('users').insert([{ 
                id: session.user.id, 
                username: displayUsername, 
                lanterns: 10 
            }]);
        } else {
            // Returning player
            displayUsername = userRow.username;
        }

        log("Session found. Logging in as " + displayUsername);
        setLoggedInState(displayUsername);
    }
}

// Public Data: Anyone can fetch the grid and Pi stats
async function fetchPublicData() {
    log("Fetching public universe data...");
    const { data: stats } = await supabaseClient.from('global_stats').select('*').single();
    if (stats && stats.total_coprime > 0) {
        piEstimateDisplay.innerText = Math.sqrt(6 * (stats.total_explored / stats.total_coprime)).toFixed(5);
    } else {
        piEstimateDisplay.innerText = "Needs more data";
    }

    const { data: chunk } = await supabaseClient.from('grid_chunks').select('data').eq('chunk_id', '0_0').single();
    if (chunk) {
        currentChunkData = chunk.data;
        drawGrid(); 
    }
}

// Private Data
async function fetchPrivateData() {
    const { data: user, error } = await supabaseClient.from('users').select('lanterns').single();
    if (!error && user) {
        localLanterns = user.lanterns;
        lanternCountDisplay.innerText = localLanterns;
    }
}

// ==========================================
// 3. AUTHENTICATION LOGIC
// ==========================================
function setLoggedInState(username) {
    isLoggedIn = true;
    authSection.classList.add('hidden');
    gameControls.classList.remove('hidden');
    playerInventory.classList.remove('hidden');
    userInfo.innerText = `Logged in as: ${username}`;
    fetchPrivateData(); 
}

async function signUp() {
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const displayName = document.getElementById('display-name').value.trim();
    
    if (!email || !password || !displayName) {
        log("Please fill out Email, Password, and Display Name to sign up."); return;
    }

    log("Registering user...");
    const { data, error } = await supabaseClient.auth.signUp({ email, password });
    if (error) { log("Auth Error: " + error.message); return; }
    
    log("Creating database row...");
    await supabaseClient.from('users').insert([{ 
        id: data.user.id, 
        username: displayName, 
        lanterns: 10 
    }]);
    
    setLoggedInState(displayName);
}

async function signIn() {
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    
    if (!email || !password) {
        log("Please enter your email and password to log in."); return;
    }

    log("Attempting to log in...");
    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) { log("Login Error: " + error.message); return; }
    
    // Fetch the display name to show on the UI
    const { data: userRow } = await supabaseClient.from('users').select('username').eq('id', data.user.id).single();
    const displayName = userRow ? userRow.username : email;

    setLoggedInState(displayName);
}

// -- GOOGLE SIGN IN --
async function signInWithGoogle() {
    log("Redirecting to Google...");
    const { error } = await supabaseClient.auth.signInWithOAuth({ provider: 'google' });
    if (error) log("Google Auth Error: " + error.message);
}

async function logOut() {
    await supabaseClient.auth.signOut();
    isLoggedIn = false;
    authSection.classList.remove('hidden');
    gameControls.classList.add('hidden');
    playerInventory.classList.add('hidden');
    log("Logged out successfully.");
}


// ==========================================
// 4. RENDERING ENGINE (CANVAS)
// ==========================================
// Draw the fully labeled Cartesian Grid
function drawGrid() {
    // Fill the background (Dark Theme Desmos)
    ctx.fillStyle = "#111111"; 
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw the faint grey grid lines & numbers every 10 units
    ctx.strokeStyle = "#333333";
    ctx.fillStyle = "#888888";
    ctx.font = "10px monospace";
    ctx.lineWidth = 1;

    for (let i = 0; i <= 100; i += 10) {
        // X-axis lines (Vertical) & Labels
        let cx = MARGIN_LEFT + (i * TILE_SIZE);
        ctx.beginPath(); ctx.moveTo(cx, 0); ctx.lineTo(cx, canvas.height - MARGIN_BOTTOM); ctx.stroke();
        if (i < 100) ctx.fillText(i, cx + 2, canvas.height - MARGIN_BOTTOM + 15);

        // Y-axis lines (Horizontal) & Labels
        let cy = canvas.height - MARGIN_BOTTOM - (i * TILE_SIZE);
        ctx.beginPath(); ctx.moveTo(MARGIN_LEFT, cy); ctx.lineTo(canvas.width, cy); ctx.stroke();
        if (i > 0) ctx.fillText(i, MARGIN_LEFT - 25, cy - 2);
    }

    // Draw the solid white Math Axes
    ctx.strokeStyle = "#FFFFFF";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(MARGIN_LEFT, 0); ctx.lineTo(MARGIN_LEFT, canvas.height - MARGIN_BOTTOM); // Y Axis
    ctx.moveTo(MARGIN_LEFT, canvas.height - MARGIN_BOTTOM); ctx.lineTo(canvas.width, canvas.height - MARGIN_BOTTOM); // X Axis
    ctx.stroke();

    // Plot the actual Player Data
    if (!currentChunkData) return;
    
    for (let i = 0; i < currentChunkData.length; i++) {
        const char = currentChunkData[i];
        if (char === '0') continue;

        const x = i % 100;
        const y = Math.floor(i / 100);

        // FLIP THE Y-AXIS: Calculate pixels from the bottom-left origin
        const drawX = MARGIN_LEFT + (x * TILE_SIZE);
        const drawY = canvas.height - MARGIN_BOTTOM - ((y + 1) * TILE_SIZE);

        if (char === '1') ctx.fillStyle = "#00FFCC"; // Glowing Cyan (Coprime)
        else if (char === '2') ctx.fillStyle = "#553333"; // Space Dust (Not Coprime)

        ctx.fillRect(drawX, drawY, TILE_SIZE, TILE_SIZE);
    }

    // Draw the Yellow Targeting Highlight box where the mouse is
    if (hoverX >= 0 && hoverX < 100 && hoverY >= 0 && hoverY < 100) {
        const targetX = MARGIN_LEFT + (hoverX * TILE_SIZE);
        const targetY = canvas.height - MARGIN_BOTTOM - ((hoverY + 1) * TILE_SIZE);
        ctx.strokeStyle = "#FFFF00";
        ctx.lineWidth = 1;
        ctx.strokeRect(targetX, targetY, TILE_SIZE, TILE_SIZE);
    }
}


// ==========================================
// 5. MATH & INTERACTIVITY LOGIC (BATCHED)
// ==========================================
// Euclidean Algorithm
function gcd(a, b) {
    if (b === 0) return a;
    return gcd(b, a % b);
}

// Track mouse movement
canvas.addEventListener('mousemove', (event) => {
    const rect = canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    hoverX = Math.floor((mouseX - MARGIN_LEFT) / TILE_SIZE);
    hoverY = Math.floor((canvas.height - MARGIN_BOTTOM - mouseY) / TILE_SIZE);
    
    if (hoverX >= 0 && hoverX < 100 && hoverY >= 0 && hoverY < 100) {
        hoverCoordDisplay.innerText = `(${hoverX}, ${hoverY})`;
        drawGrid(); 
    } else {
        hoverCoordDisplay.innerText = `Out of bounds`;
        hoverX = -1;
        hoverY = -1;
        drawGrid(); 
    }
});

// --- THE BATCHING ENGINE ---
let pendingBatch = [];
let batchTimer = null;
let localLanterns = 0; // Tracked locally for instant feedback

// Override the fetchPrivateData function from Section 2 to sync our local tracker
async function fetchPrivateData() {
    const { data: user, error } = await supabaseClient.from('users').select('lanterns').single();
    if (!error && user) {
        localLanterns = user.lanterns;
        lanternCountDisplay.innerText = localLanterns;
    }
}

// 1. The Click Receiver (Optimistic UI)
canvas.addEventListener('click', () => {
    if (!isLoggedIn) {
        alert("Please Log In or Sign Up to place a lantern!");
        return;
    }
    if (hoverX < 0 || hoverX >= 100 || hoverY < 0 || hoverY >= 100) return;
    
    if (localLanterns <= 0) {
        alert("You are out of lanterns! Head to the arcade to earn more.");
        return;
    }

    const stringIndex = (hoverY * 100) + hoverX;
    if (currentChunkData[stringIndex] !== '0') return; // Already clicked

    // Math & Optimistic UI Update
    const isCoprime = gcd(hoverX, hoverY) === 1;
    const newState = isCoprime ? '1' : '2';

    // Instantly update the screen and deduct local lantern
    currentChunkData = currentChunkData.substring(0, stringIndex) + newState + currentChunkData.substring(stringIndex + 1);
    localLanterns--;
    lanternCountDisplay.innerText = localLanterns;
    drawGrid(); 

    // Add to the queue
    pendingBatch.push({ index: stringIndex, state: newState, coprime: isCoprime });

    // Reset the 1.5 second countdown timer
    clearTimeout(batchTimer);
    batchTimer = setTimeout(sendBatchToServer, 1500);
});

// 2. The Server Transmitter
async function sendBatchToServer() {
    if (pendingBatch.length === 0) return;

    // Lock in the payload and clear the queue immediately 
    // so players can keep clicking while it uploads
    const payload = [...pendingBatch];
    pendingBatch = []; 

    log(`Transmitting batch of ${payload.length} lanterns...`);

    const { data, error } = await supabaseClient.rpc('place_lantern_batch', {
        p_chunk_id: '0_0',
        p_batch: payload
    });

    if (error) {
        log("Transmission Error: " + error.message);
    } else {
        log(`Server confirmed ${data.success_count} placements.`);
        if (data.failed_indices && data.failed_indices.length > 0) {
            log(`Conflict! Someone beat you to tiles: ${data.failed_indices.join(', ')}`);
        }
    }

    // Hard Sync: Fetch exact server stats to correct any race-condition errors 
    // and update the global Pi estimate
    fetchPublicData();
    fetchPrivateData();
}

// Start the app!
initializeApp();