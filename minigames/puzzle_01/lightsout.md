### DECRYPTION TACTICS: Lights Out
**Objective:** Turn off all rogue nodes to bypass the firewall.

**Mechanics:**
* Clicking any node toggles its state (ON to OFF, or OFF to ON).
* *Warning:* Clicking a node simultaneously toggles the 4 directly adjacent nodes (Up, Down, Left, Right).

**Cryptographic Theory:**
This security array operates using modulo-2 linear algebra over $GF(2)$. Every node you toggle essentially adds a basis vector to the current state of the board matrix. Your objective is to discover the exact linear combination of vectors that cancels out the starting matrix, returning it to the zero state.