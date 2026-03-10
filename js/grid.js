// js/grid.js
export const canvas = document.getElementById('universe');
export const ctx = canvas.getContext('2d');

// --- CAMERA & RENDER SETTINGS ---
export const camera = { x: 0, y: 0, zoom: 1 };
const BASE_TILE_SIZE = 15; // Increased base size for better graphics
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

export function drawGrid(chunkData, hoverX, hoverY) {
    // 1. Draw Deep Space Background
    ctx.fillStyle = "#0a0b10"; // Very dark blue/black
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const tileSize = BASE_TILE_SIZE * camera.zoom;
    const originX = MARGIN_LEFT + camera.x;
    const originY = canvas.height - MARGIN_BOTTOM + camera.y;

    // 2. Draw Faint High-Tech Blueprint Lines
    ctx.strokeStyle = "rgba(255, 255, 255, 0.05)"; // Very transparent white
    ctx.lineWidth = 1;

    for (let i = 0; i <= 200; i += 10) { // Drawing up to 200 for expansion
        let cx = originX + (i * tileSize);
        let cy = originY - (i * tileSize);
        
        // Vertical lines
        ctx.beginPath(); ctx.moveTo(cx, 0); ctx.lineTo(cx, canvas.height); ctx.stroke();
        // Horizontal lines
        ctx.beginPath(); ctx.moveTo(0, cy); ctx.lineTo(canvas.width, cy); ctx.stroke();
    }

    // 3. Draw the solid white Math Axes
    ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(originX, 0); ctx.lineTo(originX, canvas.height); // Y Axis
    ctx.moveTo(0, originY); ctx.lineTo(canvas.width, originY); // X Axis
    ctx.stroke();

    // 4. Plot the Cosmic Data
    if (!chunkData) return;
    
    for (let i = 0; i < chunkData.length; i++) {
        const char = chunkData[i];
        if (char === '0') continue;

        const x = i % 100;
        const y = Math.floor(i / 100);

        const drawX = originX + (x * tileSize);
        const drawY = originY - ((y + 1) * tileSize);
        const centerX = drawX + tileSize / 2;
        const centerY = drawY + tileSize / 2;

        ctx.beginPath();
        
        if (char === '2') {
            // Space Dust (Dim, small rock)
            ctx.arc(centerX, centerY, tileSize * 0.2, 0, Math.PI * 2);
            ctx.fillStyle = "#443333";
            ctx.fill();
        } else {
            // Glowing Lanterns (Coprimes)
            ctx.arc(centerX, centerY, tileSize * 0.35, 0, Math.PI * 2);
            
            if (char === '1') ctx.fillStyle = "#00FFCC"; // Cyan
            else if (char === '3') ctx.fillStyle = "#FF00FF"; // Neon Pink
            else if (char === '4') ctx.fillStyle = "#FFD700"; // Gold
            
            // Add the Neon Glow Effect
            ctx.shadowColor = ctx.fillStyle;
            ctx.shadowBlur = 15 * camera.zoom; 
            ctx.fill();
            
            // Reset shadow so it doesn't bleed to other things
            ctx.shadowBlur = 0; 
        }
    }

    // 5. Draw the Targeting Reticle (Hover)
    if (hoverX >= 0 && hoverY >= 0) {
        const targetX = originX + (hoverX * tileSize);
        const targetY = originY - ((hoverY + 1) * tileSize);
        
        ctx.strokeStyle = "rgba(255, 255, 0, 0.8)";
        ctx.lineWidth = 2 * camera.zoom;
        
        // Draw a cool corner-bracket reticle instead of a boring box
        const size = tileSize;
        const edge = size * 0.3;
        ctx.beginPath();
        // Top Left
        ctx.moveTo(targetX, targetY + edge); ctx.lineTo(targetX, targetY); ctx.lineTo(targetX + edge, targetY);
        // Top Right
        ctx.moveTo(targetX + size - edge, targetY); ctx.lineTo(targetX + size, targetY); ctx.lineTo(targetX + size, targetY + edge);
        // Bottom Right
        ctx.moveTo(targetX + size, targetY + size - edge); ctx.lineTo(targetX + size, targetY + size); ctx.lineTo(targetX + size - edge, targetY + size);
        // Bottom Left
        ctx.moveTo(targetX + edge, targetY + size); ctx.lineTo(targetX, targetY + size); ctx.lineTo(targetX, targetY + size - edge);
        ctx.stroke();
    }
}