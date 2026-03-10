// js/pi_calculator.js

export function calculatePi(totalExplored, totalCoprime, globalPoints, adminTierOverride = 0) {
    if (totalCoprime === 0 || totalExplored === 0) return { pi: "Calibrating...", tier: 0, nextGoal: 10000 };

    // 1. Determine Tier based on global points OR the admin override
    let tier = adminTierOverride;
    let nextGoal = 10000;

    if (tier === 0) {
        if (globalPoints >= 50000) { tier = 3; nextGoal = 100000; }
        else if (globalPoints >= 25000) { tier = 2; nextGoal = 50000; }
        else if (globalPoints >= 10000) { tier = 1; nextGoal = 25000; }
    } else {
        nextGoal = (tier === 1) ? 25000 : (tier === 2) ? 50000 : 100000; 
    }

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