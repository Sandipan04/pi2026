// js/auth.js
import { supabase } from './supabase.js';

const authSection = document.getElementById('auth-section');
const gameControls = document.getElementById('game-controls');
const userInfo = document.getElementById('user-info');
const navBar = document.getElementById('nav-bar'); // Grab the nav bar

export let isLoggedIn = false;
export let currentUser = null;

export function setLoggedInState(username, userObj) {
    isLoggedIn = true;
    currentUser = userObj;
    
    authSection.classList.add('hidden');
    gameControls.classList.remove('hidden');
    
    if (navBar) navBar.classList.remove('hidden'); // Show Nav Bar!
    
    userInfo.innerText = `Commander ${username}`;
}

export function setLoggedOutState() {
    isLoggedIn = false;
    currentUser = null;
    
    authSection.classList.remove('hidden');
    gameControls.classList.add('hidden');
    
    if (navBar) navBar.classList.add('hidden'); // Hide Nav Bar!
}