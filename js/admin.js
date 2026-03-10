// js/admin.js
import { supabase } from './supabase.js';

const adminContent = document.getElementById('admin-content');
const accessDenied = document.getElementById('access-denied');
const tableBody = document.getElementById('player-table-body');

async function bootAdminPanel() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        window.location.href = 'index.html'; 
        return;
    }

    const { data: user } = await supabase.from('users').select('is_admin').eq('id', session.user.id).single();
    if (!user || !user.is_admin) {
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
        tableBody.innerHTML = `<tr><td colspan='5'>Error: ${error.message}</td></tr>`;
        return;
    }

    tableBody.innerHTML = '';
    
    players.forEach(p => {
        // Format the arsenal into a clean string so it doesn't take up too much table space
        const arsenal = `[${p.bomb_2}, ${p.bomb_3}, ${p.bomb_5}, ${p.bomb_8}, ${p.bomb_13}]`;
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><strong>${p.username}</strong></td>
            <td>${p.coprimes_found}</td>
            <td style="font-family: monospace; color: #FFD700;">${arsenal}</td>
            <td>${p.points}</td>
            <td>
                <input type="number" id="amt-${p.id}" value="1000">
                <button class="action-btn" onclick="grantIndividual('${p.id}')">Grant Points</button>
            </td>
        `;
        tableBody.appendChild(row);
    });
}

window.grantIndividual = async (userId) => {
    const amt = parseInt(document.getElementById(`amt-${userId}`).value);
    const { data, error } = await supabase.rpc('admin_grant_points', { p_target_id: userId, p_points: amt });
    
    if (data === true) {
        alert("Command confirmed: Points granted successfully!");
        loadPlayers(); 
    } else {
        alert("Action failed or unauthorized.");
    }
};

document.getElementById('btn-global-grant').addEventListener('click', async () => {
    const amt = parseInt(document.getElementById('global-points-val').value);
    const confirmAction = confirm(`Are you absolutely sure you want to drop ${amt} supply points to EVERY commander?`);
    
    if (confirmAction) {
        const { data } = await supabase.rpc('admin_grant_global_points', { p_points: amt });
        if (data === true) {
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