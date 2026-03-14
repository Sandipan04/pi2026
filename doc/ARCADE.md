# The Crypto Arcade (Minigames)

The Arcade is a collection of mathematical and logic-based minigames. Players solve these to "decrypt enemy intel" and earn Supply Points.

## Adding a New Minigame
All minigames follow a strict, standardized architecture to ensure UI consistency.

### 1. The Directory Strategy
Each puzzle lives in its own isolated folder: `minigames/puzzle_0X/`.
Inside the folder, there must be 4 files:
1. `game.html`: The markup, utilizing the standard `.puzzle-container` 2-column flexbox layout.
2. `game.css`: Game-specific styling (Grid generation, canvas wrappers).
3. `game.js`: The game engine, rendering logic, and win-state checker.
4. `game.md`: A markdown file containing the "Tactical Briefing" (Rules).

### 2. The Mission Hub (`js/missions.js`)
To make a new puzzle accessible from `arcade.html`, you simply add an object to the exported `missions` array in `missions.js`:

```javascript
{
    id: "new_game",
    title: "NEW PROTOCOL",
    description: "Brief flavor text.",
    reward: 500, 
    url: "minigames/puzzle_09/game.html",
    guide: "minigames/puzzle_09/game.md", 
    status: "active"
}
```

### 3. The Standard Victory Sequence
Every `game.js` file must import the Supabase client and run a standardized `triggerVictory()` function when the logic is solved. This locks the game UI, plays a success message, and calls the `admin_grant_points` RPC to pay the player.