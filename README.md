# WORLD WAR 3.14159
**Strategic Warfare for Approximating $\pi$.**

[![Play Now](https://img.shields.io/badge/Play-Live_Server-00FFCC?style=for-the-badge)](https://sandipan04.github.io/pi2026/)
[![Developer Docs](https://img.shields.io/badge/Read-Developer_Docs-FFD700?style=for-the-badge)](https://sandipan04.github.io/pi2026/doc/)

Welcome to **World War 3.14159**, a massively multiplayer, infinite-canvas logic game where the community works together to calculate the mathematical value of Pi through orbital bombardment.

## 🎯 The Mission
The probability that two randomly chosen integers are coprime is exactly **$6/\pi^2$**. 
We are using this mathematical truth to wage a global war:

1. **Earn Supply Points:** Commanders log into the **Crypto Arcade** to solve logic puzzles (Sudoku, Unruly, Signal Relay, etc.) to fund their war effort.
2. **Buy Munitions:** Spend points in the Depot to purchase cluster bombs of varying radii (scaled to the Fibonacci sequence).
3. **Strike the Grid:** Drop payloads onto an infinitely expanding grid. 
4. **Approximate $\pi$:** If a destroyed tile's `(X, Y)` coordinates are coprime, it glows. The central server tracks the ratio of total destroyed tiles to coprime tiles, actively calculating a live approximation of Pi for the entire server.

When the community hits massive destruction milestones, the **Global Tier** levels up, triggering server-wide Supply Point drops for all commanders!

## 💻 Developer Documentation
This project is built using a custom vanilla HTML5 `<canvas>` rendering engine, modular ES6 JavaScript, and a **Supabase (PostgreSQL)** backend. 

We have heavily documented the architecture, database schema, and minigame integration protocols. 

* 📖 **[Read the Wiki Online](https://sandipan04.github.io/pi2026/doc/)** (Recommended)
* 🗄️ **[Browse the Raw Docs](/doc/README.md)** (GitHub Markdown)

## 🛠️ Tech Stack
* **Frontend:** Vanilla HTML5, CSS3 (CSS Variables for dynamic theming), ES6 JavaScript.
* **Rendering:** Mathematics-driven `<canvas>` APIs (No heavy image assets).
* **Backend:** Supabase (GoTrue Auth, PostgreSQL, PostgREST API).
* **Parsers:** `marked.js` (Markdown rendering) & `MathJax` (LaTeX rendering).

## 🎖️ Command Staff (Credits)
* **Sandipan Samanta** ([Website](https://sandipan04.github.io/webpage/))
* **Aaditya Vicram Saraf** ([Website](https://sites.google.com/view/aadityavicramsaraf/))

## 📄 License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.