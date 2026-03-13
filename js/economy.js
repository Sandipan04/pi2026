// js/economy.js
import { supabase } from './supabase.js';

export async function fetchLeaderboards() {
    const radarList = document.getElementById('leaderboard-radar-list');
    const supplyList = document.getElementById('leaderboard-supply-list');

    if (radarList) radarList.innerHTML = "<li style='color: var(--neon-cyan); padding: 10px;'>Decrypting radar logs...</li>";
    if (supplyList) supplyList.innerHTML = "<li style='color: var(--neon-gold); padding: 10px;'>Decrypting supply logs...</li>";

    // --- 1. FETCH RADAR LEADERS (Ordered by coprimes_found) ---
    const { data: radarLeaders, error: radarError } = await supabase
        .from('users')
        .select('username, coprimes_found')
        .order('coprimes_found', { ascending: false })
        .limit(10);

    // --- 2. FETCH SUPPLY LEADERS (Ordered by lifetime_points) ---
    const { data: supplyLeaders, error: supplyError } = await supabase
        .from('users')
        .select('username, lifetime_points')
        .order('lifetime_points', { ascending: false })
        .limit(10);

    // Handle potential errors
    if (radarError && radarList) {
        radarList.innerHTML = `<li style='color: var(--alert-red); padding: 10px;'>Error: ${radarError.message}</li>`;
    }
    if (supplyError && supplyList) {
        supplyList.innerHTML = `<li style='color: var(--alert-red); padding: 10px;'>Error: ${supplyError.message}</li>`;
    }

    // --- 3. BUILD UI STRINGS ---
    
    // Helper function to build the rows
    const buildRow = (user, index, metricLabel, metricValue, highlightClass) => {
        const rank = index + 1;
        let rankColor = "var(--neon-cyan)";
        if (rank === 1) rankColor = "var(--neon-gold)";
        else if (rank === 2) rankColor = "#C0C0C0"; 
        else if (rank === 3) rankColor = "#CD7F32"; 

        return `
            <li style="padding: 10px 5px; border-bottom: 1px dashed rgba(255, 255, 255, 0.1); display: flex; justify-content: space-between; align-items: center;">
                <span style="color: ${rankColor}; font-weight: bold; font-size: 1.1em;">
                    #${rank} ${user.username}
                </span>
                <span style="font-size: 0.9em; opacity: 0.9;">
                    ${metricLabel}: <strong class="${highlightClass}">${metricValue}</strong>
                </span>
            </li>
        `;
    };

    // Populate Radar List
    if (radarList && radarLeaders) {
        radarList.innerHTML = radarLeaders.length === 0 
            ? "<li style='padding: 10px;'>No active bombers found.</li>" 
            : radarLeaders.map((u, i) => buildRow(u, i, "Bases", u.coprimes_found || 0, "highlight")).join('');
    }

    // Populate Supply List
    if (supplyList && supplyLeaders) {
        supplyList.innerHTML = supplyLeaders.length === 0 
            ? "<li style='padding: 10px;'>No puzzlers found.</li>" 
            : supplyLeaders.map((u, i) => buildRow(u, i, "XP", u.lifetime_points || 0, "gold-text")).join('');
    }
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