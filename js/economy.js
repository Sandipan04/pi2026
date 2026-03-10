// js/economy.js
import { supabase } from './supabase.js';

export async function fetchLeaderboards() {
    const list = document.getElementById('leaderboard-list');
    if (!list) return;

    list.innerHTML = "<li style='color: var(--neon-cyan); padding: 10px;'>Decrypting commander logs...</li>";

    // Request the new columns: coprimes_found instead of lanterns
    const { data: leaders, error } = await supabase
        .from('users')
        .select('username, coprimes_found, lifetime_points')
        .order('lifetime_points', { ascending: false })
        .limit(10);

    if (error) {
        list.innerHTML = `<li style='color: var(--alert-red); padding: 10px;'>Error accessing command logs: ${error.message}</li>`;
        return;
    }

    list.innerHTML = '';
    
    if (leaders.length === 0) {
        list.innerHTML = "<li style='padding: 10px;'>No active commanders found in this sector.</li>";
        return;
    }

    // Build the Top Commanders UI
    leaders.forEach((user, index) => {
        const rank = index + 1;
        
        // Color-code the Top 3 commanders for bragging rights
        let rankColor = "var(--neon-cyan)";
        if (rank === 1) rankColor = "var(--neon-gold)";
        else if (rank === 2) rankColor = "#C0C0C0"; // Silver
        else if (rank === 3) rankColor = "#CD7F32"; // Bronze

        const li = document.createElement('li');
        li.style.padding = "10px 5px";
        li.style.borderBottom = "1px dashed rgba(0, 255, 204, 0.2)";
        li.style.display = "flex";
        li.style.justifyContent = "space-between";
        li.style.alignItems = "center";
        
        li.innerHTML = `
            <span style="color: ${rankColor}; font-weight: bold; font-size: 1.1em;">
                #${rank} ${user.username}
            </span>
            <span style="font-size: 0.9em; opacity: 0.9;">
                Radar Bases: <span class="highlight">${user.coprimes_found || 0}</span> | 
                XP: <span class="gold-text">${user.lifetime_points || 0}</span>
            </span>
        `;
        list.appendChild(li);
    });
}

export async function processPurchase(user, type, val, cost) {
    if (user.points < cost) {
        alert("Not enough points!"); return false;
    }

    if (type === 'bomb') {
        const radius = parseInt(val);
        const column = `bomb_${radius}`;
        await supabase.from('users').update({ 
            [column]: user[column] + 1, 
            points: user.points - cost 
        }).eq('id', user.id);
        alert(`Acquired 1 Mk-${radius} Cluster Missile!`);
        return true;
    }

    if (type === 'color') {
        let unlocked = user.unlocked_colors;
        if (!unlocked.includes(val)) {
            unlocked += val; 
            await supabase.from('users').update({ 
                unlocked_colors: unlocked, 
                equipped_color: val,
                points: user.points - cost 
            }).eq('id', user.id);
            alert("Color purchased and equipped!");
        } else {
            await supabase.from('users').update({ equipped_color: val }).eq('id', user.id);
            alert("Color equipped!");
        }
        return true;
    }
}

// Dev function to give yourself money
export async function cheatPoints(userId, currentPoints, lifetime) {
    await supabase.from('users').update({ 
        points: currentPoints + 1000,
        lifetime_points: lifetime + 1000
    }).eq('id', userId);
}