import { GALAXY_CONFIG } from './config.js';

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

// Seeded random number generator for reproducibility
export function seededRandom(seed) {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
}

// Gaussian random using Box-Muller transform
export function gaussianRandom(mean = 0, stdev = 1, seed = null) {
    const u1 = seed !== null ? seededRandom(seed) : Math.random();
    const u2 = seed !== null ? seededRandom(seed + 0.5) : Math.random();
    const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
    return z0 * stdev + mean;
}

// Logarithmic spiral: r = a * e^(b*θ)
export function logarithmicSpiral(theta, a, b) {
    return a * Math.exp(b * theta);
}

// Get spectral type based on probability distribution
export function getSpectralType(rand) {
    const dist = GALAXY_CONFIG.spectralDistribution;
    let cumulative = 0;

    for (const [type, prob] of Object.entries(dist)) {
        cumulative += prob;
        if (rand < cumulative) return type;
    }
    return 'M'; // Default to most common
}

// Density falloff function for bulge (de Vaucouleurs profile)
export function bulgeDensity(r, effectiveRadius) {
    // I(r) = I_e * exp(-7.67 * ((r/r_e)^(1/4) - 1))
    const x = Math.pow(r / effectiveRadius, 0.25);
    return Math.exp(-7.67 * (x - 1));
}

// Exponential disk density profile
export function diskDensity(r, scaleLength) {
    // Σ(r) = Σ_0 * exp(-r/h)
    return Math.exp(-r / scaleLength);
}

// Smooth easing function (ease in-out cubic)
export function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}
