// js/missions.js
export const missions = [
    {
        id: "sys_boot",
        title: "Lights Out",
        description: "",
        reward: 50,
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
        id: "untangle",
        title: "Untangle",
        description: "",
        reward: 150, // <-- The JS will fetch this number dynamically!
        url: "minigames/puzzle_03/untangle.html",
        guide: "minigames/puzzle_03/untangle.md",
        status: "locked" 
    }
];