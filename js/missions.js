// js/missions.js
export const missions = [
    {
        id: "sys_boot",
        title: "SYS.BOOT // CALIBRATION",
        description: "A basic diagnostic routine to ensure your logic circuits are functioning.",
        reward: 50,
        url: "minigames/puzzle_01/lightsout.html",
        guide: "minigames/puzzle_01/guide.md",
        status: "active" 
    },
    {
        id: "sudoku_6x6",
        title: "GRID_LOCK // DATA RESTORATION",
        description: "Reconstruct the missing data blocks in a corrupted 6x6 data transmission.",
        reward: 150, // <-- The JS will fetch this number dynamically!
        url: "minigames/puzzle_02/sudoku.html",
        guide: "minigames/puzzle_02/sudoku.md",
        status: "active" 
    }
];