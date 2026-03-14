# WW 3.14159 // Tactical Command Wiki

Welcome to the developer documentation for **World War 3.14159**. 
This is a massively multiplayer, infinite-canvas logic game where players drop ordnance to reveal a grid, calculate the value of Pi, and solve cryptography minigames to fund their war effort.

## Table of Contents
1. [Architecture & Frontend Modularity](ARCHITECTURE.md)
2. [Database Schema & SQL Engine](DATABASE.md)
3. [The Crypto Arcade (Minigames)](ARCADE.md)

## The Core Gameplay Loop
1. **Earn:** Players log in and play HTML5 Canvas logic puzzles in the **Crypto Arcade** to earn *Supply Points*.
2. **Buy:** Players spend Supply Points in the **Munitions Depot** to buy bombs of varying radii (based on the Fibonacci sequence: Mk-2, 3, 5, 8, 13).
3. **Drop:** Players drop bombs on the **Infinite Warzone** (Grid). 
4. **Calculate:** Every destroyed tile is checked. If its `(X, Y)` coordinates are mathematically coprime, it glows. The server tracks the ratio of standard tiles to coprime tiles to calculate a live approximation of Pi.
5. **Reward:** As the community destroys more tiles, the Global Tier increases, automatically paying out Supply Points to the entire server.

## Tech Stack
* **Frontend:** Vanilla HTML5, CSS3 (CSS Variables for Neon Theming), ES6 Modular JavaScript.
* **Rendering:** HTML5 `<canvas>` with custom mathematically-driven rendering engines (no heavy image assets).
* **Backend:** Supabase (PostgreSQL, GoTrue Auth, PostgREST API).