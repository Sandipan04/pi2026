// js/missions.js
export const missions = [
    {
        id: "sys_boot",
        title: "Lights Out",
        description: "",
        reward: 200,
        url: "minigames/puzzle_01/lightsout.html",
        guide: "minigames/puzzle_01/lightsout.md",
        status: "active" 
    },
    {
        id: "sudoku_6x6",
        title: "Sudoku",
        description: "",
        reward: 150, // <-- The JS will fetch this number dynamically!
        url: "minigames/puzzle_02/sudoku.html",
        guide: "minigames/puzzle_02/sudoku.md",
        status: "active" 
    },
    {
        id: "anomaly_00",
        title: "???",
        description: "",
        reward: 999999, // Bait them with an impossible bounty
        url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", // The ultimate trap
        guide: null, // Crucial: Keeps it out of the Dossier manual
        status: "active" 
    },
    {
        id: "untangle",
        title: "Untangle",
        description: "",
        reward: 100, 
        url: "minigames/puzzle_03/untangle.html",
        guide: "minigames/puzzle_03/untangle.md", // You'll need to make a quick MD guide for the Dossier!
        status: "active"
    },
    {
        id: "minesweeper_9x9",
        title: "Minesweeper",
        description: "",
        reward: 150, 
        url: "minigames/puzzle_04/minesweeper.html",
        guide: "minigames/puzzle_04/minesweeper.md", 
        status: "active"
    }
];