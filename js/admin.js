// js/admin.js
import { supabase } from './supabase.js';

const adminContent = document.getElementById('admin-content');
const accessDenied = document.getElementById('access-denied');
const tableBody = document.getElementById('player-table-body');

async function bootAdminPanel() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        window.location.href = 'radar.html'; 
        return;
    }

    const { data: user, error } = await supabase.from('users').select('is_admin').eq('id', session.user.id).single();
    if (error || !user || !user.is_admin) {
        accessDenied.style.display = 'block';
        return;
    }

    adminContent.style.display = 'block';
    loadPlayers();
}

async function loadPlayers() {
    tableBody.innerHTML = "<tr><td colspan='5'>Loading secure military data...</td></tr>";
    
    const { data: players, error } = await supabase.rpc('admin_get_all_users');
    
    if (error) {
        tableBody.innerHTML = `<tr><td colspan='5' style="color: var(--alert-red);">Error: ${error.message}</td></tr>`;
        return;
    }

    tableBody.innerHTML = '';
    
    players.forEach(p => {
        // Fallbacks added just in case a user hasn't bought a bomb yet
        const arsenal = `[${p.bomb_2 || 0}, ${p.bomb_3 || 0}, ${p.bomb_5 || 0}, ${p.bomb_8 || 0}, ${p.bomb_13 || 0}]`;
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><strong>${p.username}</strong></td>
            <td>${p.coprimes_found || 0}</td>
            <td style="font-family: monospace; color: #FFD700;">${arsenal}</td>
            <td>${p.points}</td>
            <td>
                <input type="number" id="amt-${p.id}" value="1000" style="width: 80px;">
                <button class="action-btn" onclick="grantIndividual('${p.id}')">Grant Points</button>
            </td>
        `;
        tableBody.appendChild(row);
    });
}

// CRITICAL FIX: Safer error handling and parameter checking
window.grantIndividual = async (userId) => {
    const amtInput = document.getElementById(`amt-${userId}`);
    if (!amtInput) return;
    
    const amt = parseInt(amtInput.value);
    
    console.log(`[Admin] Initiating transfer of ${amt} points to ${userId}...`);

    const { data, error } = await supabase.rpc('admin_grant_points', { 
        p_target_id: userId, 
        p_points: amt 
    });
    
    // Check for the error directly
    if (error) {
        console.error("RPC Execution Error:", error);
        alert(`Action failed: ${error.message}\n\n(Check the browser console for exact details)`);
    } else {
        alert("Command confirmed: Points granted successfully!");
        loadPlayers(); 
    }
};

document.getElementById('btn-global-grant').addEventListener('click', async () => {
    const amt = parseInt(document.getElementById('global-points-val').value);
    const confirmAction = confirm(`Are you absolutely sure you want to drop ${amt} supply points to EVERY commander?`);
    
    if (confirmAction) {
        const { data, error } = await supabase.rpc('admin_grant_global_points', { p_points: amt });
        if (error) {
            alert(`Action failed: ${error.message}`);
        } else {
            alert("Global supply drop successful!");
            loadPlayers();
        }
    }
});

document.getElementById('btn-advance-pi').addEventListener('click', async () => {
    const { data, error } = await supabase.rpc('admin_advance_pi_tier');
    if (error) alert(error.message);
    else alert(`Success! Tactical Pi calculations advanced to Tier ${data}.`);
});

bootAdminPanel();