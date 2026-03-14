// js/pi_calculator.js

// The global milestone requirement. Linear scaling: 100k, 200k, 300k, etc.
export const ERROR_THRESHOLD_STEP = 100000;

export function calculatePi(totalExplored, totalCoprime, globalPoints, adminTierOverride = 0) {
    if (totalCoprime === 0 || totalExplored === 0) {
        return { pi: "Calibrating...", tier: 0, nextGoal: ERROR_THRESHOLD_STEP };
    }

    // 1. Determine Tier dynamically based on global points OR the admin override
    // Linear progression: 0-99k = Tier 0, 100k-199k = Tier 1, 200k-299k = Tier 2...
    let tier = adminTierOverride > 0 
        ? adminTierOverride 
        : Math.floor(globalPoints / ERROR_THRESHOLD_STEP);
        
    // Calculate the next linear milestone for the HUD
    let nextGoal = (tier + 1) * ERROR_THRESHOLD_STEP;

    // 2. Pure Mathematical Pi Calculation (No faked error corrections)
    // The probability of two random numbers being coprime is 6 / pi^2.
    const piEstimate = Math.sqrt((6 * totalExplored) / totalCoprime);
    
    return {
        pi: piEstimate.toFixed(5),
        tier: tier,
        nextGoal: nextGoal
    };
}