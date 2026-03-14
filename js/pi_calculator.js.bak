// js/pi_calculator.js

// The global milestone requirement. Change this one number to balance the whole game!
export const ERROR_THRESHOLD_STEP = 100000;

export function calculatePi(totalExplored, totalCoprime, globalPoints, adminTierOverride = 0) {
    if (totalCoprime === 0 || totalExplored === 0) return { pi: "Calibrating...", tier: 0, nextGoal: ERROR_THRESHOLD_STEP };

    // 1. Determine Tier dynamically based on global points OR the admin override
    let tier = adminTierOverride > 0 
        ? adminTierOverride 
        : Math.floor(globalPoints / ERROR_THRESHOLD_STEP);
        
    // Calculate the next milestone dynamically (e.g., if Tier is 2, next goal is 300,000)
    let nextGoal = (tier + 1) * ERROR_THRESHOLD_STEP;

    // 2. Apply Error Term Corrections R(n)
    // Because totalExplored is an Area (n^2), we take the square root to find the approximate side length (n)
    let nApprox = Math.sqrt(totalExplored);
    let errorTerm = 0;
    
    if (tier >= 1) {
        // First order correction: O(n log n)
        errorTerm += nApprox * Math.log(nApprox);
    }
    if (tier >= 2) {
        // Second order correction: O(n)
        errorTerm += nApprox; 
    }
    if (tier >= 3) {
         // Third order correction: O(sqrt(n))
         errorTerm += Math.sqrt(nApprox);
    }
    // Note: If the server reaches Tier 4 (400,000 pts), the error term currently 
    // caps at the 3rd order correction, which fits the mathematical limits of this specific asymptotic expansion!

    // Subtract the error term from the denominator
    const adjustedDenominator = totalCoprime - errorTerm;
    
    // Failsafe: If the error term overcorrects, wait for players to explore more tiles
    if (adjustedDenominator <= 0) return { pi: "Filtering noise...", tier, nextGoal };

    // 3. Calculate! pi = sqrt((6 * totalExplored) / (Q(n) - R(n)))
    const piEstimate = Math.sqrt((6 * totalExplored) / adjustedDenominator);
    
    return {
        pi: piEstimate.toFixed(5),
        tier: tier,
        nextGoal: nextGoal
    };
}