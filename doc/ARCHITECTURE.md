# Architecture & Frontend Modularity

The application is built using **ES6 JavaScript Modules**, keeping the codebase strictly separated by domain logic. There are no bloated, 3,000-line monolithic files.

## Directory Structure
```text
/ (Root)
├── index.html           # Landing page
├── radar.html           # Main game terminal (Warzone, Market, Leaderboard)
├── arcade.html          # Minigame Hub
├── /css
│   └── style.css        # Global tactical styling & CSS Variables
├── /doc                 # You are here
├── /js                  # Core Engine Modules
└── /minigames           # Puzzle folders (Sudoku, Untangle, Net, etc.)
```

## CSS Styling (style.css)
The entire app relies on CSS Variables defined at the :root level. This ensures absolute consistency across the main app and all minigames.

* `--neon-cyan`: `#00FFCC` (Main interface borders, standard text)

* `--neon-pink`: `#FF00FF` (Accent colors, enemy/alert states)

* `--neon-gold`: `#FFD700` (Currency, points, active states)

* `--alert-red`: `#FF3333` (Errors, destruction, logout)

## JavaScript Modularity
The core engine is split into isolated modules inside the /js folder:

1. `main.js` (The Bootstrapper)
    
    This is the controller. It imports all other modules, handles the DOM event listeners (button clicks, market toggles), manages the isDragging camera state, and coordinates the cross-chunk missile firing logic.

2. `grid.js` (The Render Engine)

    Handles drawing the Infinite Warzone.

    - Uses a camera object ({x, y, zoom}) to translate screen coordinates into mathematical grid coordinates.

    - Only loops through and draws chunks that currently exist in the database, ignoring empty space to maintain 60FPS.

3. `auth.js` & `economy.js`
    - Auth: Handles UI state toggling depending on whether the user is logged in or out.

    - Economy: Handles the math for the Munitions Depot, ensuring players have enough points before hitting the Supabase database to deduct currency and add ammo.

4. `pi_calculator.js`

    A pure math module. It takes the total_explored and total_coprime numbers from the server and runs the formula: Pi = sqrt((6 * Area) / Coprimes). It also determines the linear Base-10 Global Tier.