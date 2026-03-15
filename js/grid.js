// js/grid.js

export const canvas = document.getElementById('universe');
export const ctx = canvas ? canvas.getContext('2d') : null;

// Keep the camera object so main.js doesn't crash
export const camera = { x: 0, y: 0, zoom: 1 };

export function getGridCoords(mouseX, mouseY) {
    // Kill-switch: Prevents dropping payloads
    return { gridX: -1, gridY: -1 }; 
}

// --- NEW: Custom Text Wrapping Engine ---
function drawWrappedText(text, color, fontSize, isBold, startY, maxWidth) {
    ctx.font = `${isBold ? 'bold ' : ''}${fontSize}px 'Share Tech Mono', monospace`;
    ctx.fillStyle = color;

    const words = text.split(' ');
    let line = '';
    const lines = [];

    // Measure words and break them into lines
    for (let n = 0; n < words.length; n++) {
        const testLine = line + words[n] + ' ';
        const metrics = ctx.measureText(testLine);
        const testWidth = metrics.width;
        
        if (testWidth > maxWidth && n > 0) {
            lines.push(line);
            line = words[n] + ' ';
        } else {
            line = testLine;
        }
    }
    lines.push(line);

    // Draw each line and calculate total height
    const lineHeight = fontSize * 1.4;
    let currentY = startY;

    for (let i = 0; i < lines.length; i++) {
        ctx.fillText(lines[i], canvas.width / 2, currentY);
        currentY += lineHeight;
    }

    // Return the total vertical space used so the next paragraph knows where to start
    return lines.length * lineHeight; 
}

export function drawGrid(loadedChunks, hoverX, hoverY) {
    if (!ctx) return;
    
    // 1. Clear the entire canvas
    ctx.fillStyle = "rgba(0, 10, 15, 1)"; 
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.textAlign = "center";
    ctx.textBaseline = "top"; // Switched to top so wrapping math is easier
    
    const centerY = canvas.width < 600 ? canvas.height / 4 : canvas.height / 3;
    
    // 2. Set strict boundaries for mobile (canvas width minus 40px of padding)
    const maxWidth = Math.max(canvas.width - 40, 250);

    // 3. Responsive base font sizes
    const isMobile = canvas.width < 600;
    const headSize = isMobile ? 24 : 36;
    const subSize = isMobile ? 18 : 26;
    
    // 4. Draw paragraphs dynamically. Each one starts below the previous one!
    let currentY = centerY;

    currentY += drawWrappedText("Some anomaly has been detected.", "#FF3333", headSize, true, currentY, maxWidth);
    currentY += (isMobile ? 15 : 25); // Paragraph spacing
    
    currentY += drawWrappedText("Hence, the warzone is closed.", "#00FFCC", subSize, false, currentY, maxWidth);
    currentY += (isMobile ? 30 : 45); // Larger gap before the Pi reveal
    
    currentY += drawWrappedText("Our final approximation for pi was 3.14139.", "#FF00FF", subSize, false, currentY, maxWidth);
    currentY += (isMobile ? 15 : 25);
    
    drawWrappedText("You can still continue with the arcade games.", "#FFD700", subSize, false, currentY, maxWidth);
}