// js/grid.js
export const canvas = document.getElementById('universe');
export const ctx = canvas.getContext('2d');

// --- CAMERA & RENDER SETTINGS ---
export const camera = { x: 0, y: 0, zoom: 1 };
const BASE_TILE_SIZE = 15; 
export const MARGIN_LEFT = 40;   
export const MARGIN_BOTTOM = 40; 

// Helper function to convert screen pixels into Math Grid coordinates
export function getGridCoords(mouseX, mouseY) {
    const tileSize = BASE_TILE_SIZE * camera.zoom;
    const originX = MARGIN_LEFT + camera.x;
    const originY = canvas.height - MARGIN_BOTTOM + camera.y; 

    const gridX = Math.floor((mouseX - originX) / tileSize);
    const gridY = Math.floor((originY - mouseY) / tileSize);

    return { gridX, gridY };
}

export function drawGrid(loadedChunks, hoverX, hoverY) {
    // 1. Draw Deep Space Background
    ctx.fillStyle = "#0a0b10"; 
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const tileSize = BASE_TILE_SIZE * camera.zoom;
    const originX = MARGIN_LEFT + camera.x;
    const originY = canvas.height - MARGIN_BOTTOM + camera.y;

    // 2. Draw Faint High-Tech Blueprint Lines (Expanded for infinite scrolling)
    ctx.strokeStyle = "rgba(255, 255, 255, 0.05)"; 
    ctx.lineWidth = 1;

    // We draw grid lines far out so the universe feels infinite
    for (let i = 0; i <= 1000; i += 10) { 
        let cx = originX + (i * tileSize);
        let cy = originY - (i * tileSize);
        
        ctx.beginPath(); ctx.moveTo(cx, 0); ctx.lineTo(cx, canvas.height); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, cy); ctx.lineTo(canvas.width, cy); ctx.stroke();
    }

    // 3. Draw the solid white Math Axes
    ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(originX, 0); ctx.lineTo(originX, canvas.height); // Y Axis
    ctx.moveTo(0, originY); ctx.lineTo(canvas.width, originY); // X Axis
    ctx.stroke();

    // 4. Plot the Cosmic Data across ALL loaded chunks!
    if (!loadedChunks) return;
    
    for (const [chunkId, chunkData] of Object.entries(loadedChunks)) {
        // Extract the chunk's global position from its ID (e.g., "1_0" -> chunkX: 1, chunkY: 0)
        const [chunkX, chunkY] = chunkId.split('_').map(Number);

        for (let i = 0; i < chunkData.length; i++) {
            const char = chunkData[i];
            if (char === '0') continue;

            // Calculate Local Chunk Coordinates
            const localX = i % 100;
            const localY = Math.floor(i / 100);

            // Translate to Global Universe Coordinates
            const globalX = (chunkX * 100) + localX;
            const globalY = (chunkY * 100) + localY;

            const drawX = originX + (globalX * tileSize);
            const drawY = originY - ((globalY + 1) * tileSize);
            const centerX = drawX + tileSize / 2;
            const centerY = drawY + tileSize / 2;

            // Optimization: Don't render tiles that are way off-screen
            if (drawX < -50 || drawX > canvas.width + 50 || drawY < -50 || drawY > canvas.height + 50) {
                continue; 
            }

            ctx.beginPath();
            
            if (char === '2') {
                ctx.arc(centerX, centerY, tileSize * 0.2, 0, Math.PI * 2);
                ctx.fillStyle = "#443333";
                ctx.fill();
            } else {
                ctx.arc(centerX, centerY, tileSize * 0.35, 0, Math.PI * 2);
                if (char === '1') ctx.fillStyle = "#00FFCC"; 
                else if (char === '3') ctx.fillStyle = "#FF00FF"; 
                else if (char === '4') ctx.fillStyle = "#FFD700"; 
                
                ctx.shadowColor = ctx.fillStyle;
                ctx.shadowBlur = 15 * camera.zoom; 
                ctx.fill();
                ctx.shadowBlur = 0; 
            }
        }
    }

    // 5. Draw the Targeting Reticle
    if (hoverX >= 0 && hoverY >= 0) {
        const targetX = originX + (hoverX * tileSize);
        const targetY = originY - ((hoverY + 1) * tileSize);
        
        ctx.strokeStyle = "rgba(255, 255, 0, 0.8)";
        ctx.lineWidth = 2 * camera.zoom;
        
        const size = tileSize;
        const edge = size * 0.3;
        ctx.beginPath();
        ctx.moveTo(targetX, targetY + edge); ctx.lineTo(targetX, targetY); ctx.lineTo(targetX + edge, targetY);
        ctx.moveTo(targetX + size - edge, targetY); ctx.lineTo(targetX + size, targetY); ctx.lineTo(targetX + size, targetY + edge);
        ctx.moveTo(targetX + size, targetY + size - edge); ctx.lineTo(targetX + size, targetY + size); ctx.lineTo(targetX + size - edge, targetY + size);
        ctx.moveTo(targetX + edge, targetY + size); ctx.lineTo(targetX, targetY + size); ctx.lineTo(targetX, targetY + size - edge);
        ctx.stroke();
    }
}