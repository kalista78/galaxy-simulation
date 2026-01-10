import * as THREE from 'three';

// ============================================================
// ASTROPHYSICAL CONSTANTS (in arbitrary units, scaled for visualization)
// Real Milky Way: ~100,000-180,000 light-years diameter
// We use 1 unit = ~500 light-years for practical visualization
// ============================================================
export const GALAXY_CONFIG = {
    // Structural parameters
    diskRadius: 180,              // ~90,000 light-years radius
    bulgeRadius: 20,              // ~10,000 light-years
    diskThickness: 2,             // Thin disk ~1,000 light-years
    thickDiskThickness: 6,        // Thick disk ~3,000 light-years
    barLength: 54,                // ~27,000 light-years
    barWidth: 12,

    // Spiral arm parameters (logarithmic spiral: r = a * e^(b*θ))
    spiralArms: 4,
    spiralTightness: 0.22,        // Controls how tightly wound (pitch angle ~12-15°)
    armWidth: 18,                 // Width of spiral arms

    // Particle counts
    diskStars: 220000,            // Main disk population
    bulgeStars: 50000,            // Central bulge
    haloStars: 15000,             // Halo and globular clusters
    dustParticles: 25000,         // Dark dust lanes

    // Rotation (differential rotation - Keplerian-like)
    baseRotationSpeed: 0.15,   // Base angular velocity (increased for visible rotation)

    // Star spectral type distribution (realistic ratios)
    spectralDistribution: {
        M: 0.76,    // Red dwarfs (most common)
        K: 0.12,    // Orange
        G: 0.075,   // Yellow (Sun-like)
        F: 0.03,    // Yellow-white
        A: 0.006,   // White
        B: 0.0013,  // Blue-white
        O: 0.00003  // Blue giants (rarest)
    }
};

// Spectral type to color temperature mapping
export const SPECTRAL_COLORS = {
    O: new THREE.Color(0.6, 0.7, 1.0),      // >30,000K - Blue
    B: new THREE.Color(0.7, 0.8, 1.0),      // 10,000-30,000K - Blue-white
    A: new THREE.Color(0.9, 0.9, 1.0),      // 7,500-10,000K - White
    F: new THREE.Color(1.0, 1.0, 0.9),      // 6,000-7,500K - Yellow-white
    G: new THREE.Color(1.0, 0.95, 0.8),     // 5,200-6,000K - Yellow
    K: new THREE.Color(1.0, 0.8, 0.6),      // 3,700-5,200K - Orange
    M: new THREE.Color(1.0, 0.6, 0.4)       // <3,700K - Red
};

// Planet data for Solar System (scaled for visibility)
export const PLANET_DATA = [
    { name: 'Mercury', distance: 3, size: 0.15, color: new THREE.Color(0.7, 0.7, 0.7), color2: new THREE.Color(0.5, 0.5, 0.55), period: 0.24, atmosphere: false },
    { name: 'Venus', distance: 4.5, size: 0.35, color: new THREE.Color(0.9, 0.8, 0.6), color2: new THREE.Color(0.85, 0.75, 0.5), period: 0.62, atmosphere: true },
    { name: 'Earth', distance: 6, size: 0.38, color: new THREE.Color(0.2, 0.4, 0.8), color2: new THREE.Color(0.3, 0.6, 0.3), period: 1.0, atmosphere: true },
    { name: 'Mars', distance: 8, size: 0.2, color: new THREE.Color(0.8, 0.4, 0.2), color2: new THREE.Color(0.7, 0.3, 0.15), period: 1.88, atmosphere: false },
    { name: 'Jupiter', distance: 14, size: 1.2, color: new THREE.Color(0.8, 0.7, 0.6), color2: new THREE.Color(0.7, 0.5, 0.4), period: 11.86, atmosphere: true },
    { name: 'Saturn', distance: 20, size: 1.0, color: new THREE.Color(0.9, 0.85, 0.6), color2: new THREE.Color(0.85, 0.8, 0.5), period: 29.46, atmosphere: true, rings: true },
    { name: 'Uranus', distance: 28, size: 0.6, color: new THREE.Color(0.6, 0.8, 0.9), color2: new THREE.Color(0.5, 0.75, 0.85), period: 84.01, atmosphere: true },
    { name: 'Neptune', distance: 35, size: 0.55, color: new THREE.Color(0.3, 0.4, 0.9), color2: new THREE.Color(0.25, 0.35, 0.85), period: 164.8, atmosphere: true }
];

// Solar system journey phases
export const SOLAR_JOURNEY_PHASES = [
    { duration: 2, title: 'Leaving Galaxy View', subtitle: 'Beginning journey to the Orion Arm' },
    { duration: 3, title: 'Approaching Orion Arm', subtitle: '26,000 light-years from galactic center' },
    { duration: 2.5, title: 'Entering Solar System', subtitle: 'Our cosmic home' },
    { duration: 2, title: 'Solar System', subtitle: '8 planets orbiting the Sun' }
];

// Black hole journey phases
export const BLACK_HOLE_JOURNEY_PHASES = [
    { duration: 2, title: 'Descending to Galactic Center', subtitle: 'Journey to Sagittarius A*' },
    { duration: 3, title: 'Approaching Event Horizon', subtitle: '4 million solar masses' },
    { duration: 2, title: 'Sagittarius A*', subtitle: 'The heart of our galaxy' }
];

// ============================================================
// CINEMATIC TOUR SEQUENCES (~1 min total) - ULTRA DYNAMIC
// ============================================================
export const TOUR_SEQUENCES = [
    {
        name: 'opening_pan',
        displayName: 'The Awakening',
        duration: 6,
        speed: 'slow',
        cameraRoll: 0,
        shake: 0,
        waypoints: [
            { pos: [0, 400, 50], target: [0, 0, 0], fov: 45, roll: 0 },
            { pos: [80, 350, 150], target: [20, 0, 20], fov: 50, roll: 3 },
            { pos: [180, 280, 220], target: [40, 0, 60], fov: 55, roll: 0 }
        ],
        audioMood: 'ambient'
    },
    {
        name: 'spiral_dive',
        displayName: 'Into The Spiral',
        duration: 5,
        speed: 'accelerating',
        cameraRoll: 15,
        shake: 0.3,
        waypoints: [
            { pos: [180, 280, 220], target: [40, 0, 60], fov: 55, roll: 0 },
            { pos: [140, 150, 160], target: [70, 0, 80], fov: 65, roll: 8 },
            { pos: [100, 60, 100], target: [80, 0, 90], fov: 78, roll: 15 },
            { pos: [70, 25, 70], target: [60, -5, 65], fov: 85, roll: 5 }
        ],
        audioMood: 'building'
    },
    {
        name: 'star_rush',
        displayName: 'Stellar Highway',
        duration: 5,
        speed: 'fast',
        cameraRoll: 25,
        shake: 0.6,
        waypoints: [
            { pos: [70, 25, 70], target: [60, -5, 65], fov: 85, roll: 5 },
            { pos: [40, 15, 50], target: [20, 0, 30], fov: 95, roll: -12 },
            { pos: [-20, 20, 80], target: [-30, 0, 60], fov: 90, roll: 18 },
            { pos: [-60, 35, 100], target: [-40, 0, 70], fov: 80, roll: -8 }
        ],
        audioMood: 'intense'
    },
    {
        name: 'weaving_arms',
        displayName: 'Dancing Through Arms',
        duration: 6,
        speed: 'medium',
        cameraRoll: 20,
        shake: 0.4,
        waypoints: [
            { pos: [-60, 35, 100], target: [-40, 0, 70], fov: 80, roll: -8 },
            { pos: [-100, 50, 60], target: [-80, 5, 30], fov: 70, roll: 12 },
            { pos: [-80, 40, -30], target: [-50, 0, -50], fov: 75, roll: -15 },
            { pos: [-40, 55, -80], target: [-20, 0, -40], fov: 68, roll: 5 }
        ],
        audioMood: 'building'
    },
    {
        name: 'core_approach',
        displayName: 'Heart of the Galaxy',
        duration: 7,
        speed: 'decelerating',
        cameraRoll: 10,
        shake: 0.2,
        waypoints: [
            { pos: [-40, 55, -80], target: [-20, 0, -40], fov: 68, roll: 5 },
            { pos: [-20, 70, -50], target: [0, 0, 0], fov: 60, roll: -3 },
            { pos: [10, 90, -20], target: [0, 0, 0], fov: 55, roll: 0 },
            { pos: [25, 100, 15], target: [0, 0, 0], fov: 50, roll: 2 }
        ],
        audioMood: 'epic'
    },
    {
        name: 'black_hole_descent',
        displayName: 'Event Horizon',
        duration: 8,
        speed: 'slow_dramatic',
        cameraRoll: 8,
        shake: 0.8,
        waypoints: [
            { pos: [25, 100, 15], target: [0, 0, 0], fov: 50, roll: 2 },
            { pos: [20, 60, 20], target: [0, 0, 0], fov: 48, roll: -2 },
            { pos: [15, 35, 18], target: [0, 0, 0], fov: 45, roll: 3 },
            { pos: [10, 18, 14], target: [0, 0, 0], fov: 42, roll: -1 },
            { pos: [8, 10, 10], target: [0, 0, 0], fov: 38, roll: 0 }
        ],
        audioMood: 'tension'
    },
    {
        name: 'escape_velocity',
        displayName: 'Breaking Free',
        duration: 5,
        speed: 'explosive',
        cameraRoll: 35,
        shake: 1.0,
        waypoints: [
            { pos: [8, 10, 10], target: [0, 0, 0], fov: 38, roll: 0 },
            { pos: [25, 40, 35], target: [5, 0, 5], fov: 55, roll: -20 },
            { pos: [80, 120, 100], target: [20, 0, 30], fov: 70, roll: 25 },
            { pos: [150, 220, 180], target: [30, 0, 40], fov: 62, roll: 5 }
        ],
        audioMood: 'epic'
    },
    {
        name: 'outer_rim_cruise',
        displayName: 'Edge of Infinity',
        duration: 6,
        speed: 'cruising',
        cameraRoll: 12,
        shake: 0.2,
        waypoints: [
            { pos: [150, 220, 180], target: [30, 0, 40], fov: 62, roll: 5 },
            { pos: [200, 150, 100], target: [120, 0, 50], fov: 58, roll: -6 },
            { pos: [220, 100, -40], target: [140, 0, -20], fov: 55, roll: 8 },
            { pos: [200, 120, -120], target: [100, 0, -80], fov: 52, roll: -4 }
        ],
        audioMood: 'ambient'
    },
    {
        name: 'barrel_roll',
        displayName: 'Cosmic Roll',
        duration: 4,
        speed: 'fast',
        cameraRoll: 360,
        shake: 0.5,
        waypoints: [
            { pos: [200, 120, -120], target: [100, 0, -80], fov: 52, roll: 0 },
            { pos: [150, 100, -160], target: [50, 0, -100], fov: 60, roll: 90 },
            { pos: [80, 90, -180], target: [0, 0, -100], fov: 65, roll: 180 },
            { pos: [0, 100, -150], target: [-30, 0, -60], fov: 60, roll: 270 },
            { pos: [-50, 130, -100], target: [0, 0, 0], fov: 55, roll: 360 }
        ],
        audioMood: 'intense'
    },
    {
        name: 'vertical_ascent',
        displayName: 'Ascending',
        duration: 4,
        speed: 'accelerating',
        cameraRoll: 15,
        shake: 0.4,
        waypoints: [
            { pos: [-50, 130, -100], target: [0, 0, 0], fov: 55, roll: 0 },
            { pos: [-30, 200, -60], target: [0, 0, 0], fov: 52, roll: 8 },
            { pos: [0, 320, 0], target: [0, 0, 0], fov: 48, roll: -5 },
            { pos: [20, 400, 40], target: [0, 0, 0], fov: 45, roll: 0 }
        ],
        audioMood: 'building'
    },
    {
        name: 'final_descent',
        displayName: 'The Return',
        duration: 4,
        speed: 'decelerating',
        cameraRoll: 10,
        shake: 0.3,
        waypoints: [
            { pos: [20, 400, 40], target: [0, 0, 0], fov: 45, roll: 0 },
            { pos: [40, 380, 80], target: [10, 0, 20], fov: 47, roll: 5 },
            { pos: [0, 400, 50], target: [0, 0, 0], fov: 45, roll: 0 }
        ],
        audioMood: 'ambient'
    }
];

// ============================================================
// ANDROMEDA GALAXY CONFIGURATION
// ============================================================
export const ANDROMEDA_CONFIG = {
    // Position relative to Milky Way (2.5 million light-years = ~5000 units in our scale)
    // For visualization, we'll use a closer distance
    initialPosition: { x: 600, y: 100, z: 400 },

    // Andromeda is larger than Milky Way (~220,000 light-years diameter)
    diskRadius: 220,
    bulgeRadius: 30,
    diskThickness: 2.5,

    // Spiral structure (Andromeda has 2 main arms)
    spiralArms: 2,
    spiralTightness: 0.18,
    armWidth: 22,

    // Particle counts (scaled for performance)
    diskStars: 180000,
    bulgeStars: 45000,
    haloStars: 12000,

    // Color tint (Andromeda appears slightly more yellow/warm)
    colorTint: { r: 1.05, g: 0.98, b: 0.92 },

    // Rotation (Andromeda rotates opposite to Milky Way from our perspective)
    rotationSpeed: -0.12,

    // Inclination angle (tilted ~77 degrees from face-on)
    inclination: 77 * Math.PI / 180
};

// Galaxy merger simulation phases (~45 seconds total)
export const MERGER_PHASES = [
    {
        duration: 4,
        title: 'Present Day',
        subtitle: '2.5 million light-years apart',
        description: 'The Andromeda Galaxy approaches at 110 km/s'
    },
    {
        duration: 6,
        title: 'First Approach',
        subtitle: '4 billion years from now',
        description: 'Gravitational interaction begins distorting both galaxies'
    },
    {
        duration: 10,
        title: 'First Pass',
        subtitle: '4.5 billion years',
        description: 'Galaxies pass through each other, tidal tails form'
    },
    {
        duration: 6,
        title: 'Separation',
        subtitle: '5 billion years',
        description: 'Galaxies separate briefly, trailing stellar streams'
    },
    {
        duration: 10,
        title: 'Second Collision',
        subtitle: '5.5 billion years',
        description: 'Final collision begins, cores spiral together'
    },
    {
        duration: 9,
        title: 'Milkomeda',
        subtitle: '7 billion years from now',
        description: 'A giant elliptical galaxy is born'
    }
];

// ============================================================
// SUPERNOVA SIMULATION PHASES (~50 seconds total)
// ============================================================
export const SUPERNOVA_PHASES = [
    {
        name: 'doomed_star',
        duration: 6,
        title: 'A Dying Star',
        subtitle: 'Betelgeuse - 700 light-years away',
        description: 'A red supergiant in its final moments'
    },
    {
        name: 'instability',
        duration: 4,
        title: 'Core Instability',
        subtitle: 'Silicon burning complete',
        description: 'Iron core reaches critical mass'
    },
    {
        name: 'collapse',
        duration: 3,
        title: 'Core Collapse',
        subtitle: 'In milliseconds...',
        description: 'Gravity overwhelms nuclear forces'
    },
    {
        name: 'bounce',
        duration: 2,
        title: 'Neutron Degeneracy',
        subtitle: 'The core rebounds',
        description: 'Matter compressed to nuclear density'
    },
    {
        name: 'explosion',
        duration: 5,
        title: 'SUPERNOVA',
        subtitle: '10 billion solar luminosities',
        description: 'Brighter than an entire galaxy'
    },
    {
        name: 'shockwave',
        duration: 8,
        title: 'Shockwave Expansion',
        subtitle: '10,000 km/s',
        description: 'Stellar material ejected into space'
    },
    {
        name: 'nebula_formation',
        duration: 12,
        title: 'Nebula Formation',
        subtitle: 'The Crab Nebula is born',
        description: 'Heavy elements seed the cosmos'
    },
    {
        name: 'aftermath',
        duration: 10,
        title: 'The Aftermath',
        subtitle: 'A pulsar remains',
        description: 'A neutron star spins 30 times per second'
    }
];

// Supernova configuration
export const SUPERNOVA_CONFIG = {
    // Starting position in galaxy (pick a visible location in outer arm)
    position: { x: 120, y: 5, z: 80 },

    // Star parameters
    starRadius: 8,              // Visual size of the pre-supernova star
    maxExplosionRadius: 150,    // Maximum shockwave expansion

    // Debris parameters
    debrisCount: 15000,
    debrisSpeed: 2.5,

    // Nebula parameters
    nebulaRadius: 100,

    // Colors
    starColor: { r: 1.0, g: 0.3, b: 0.1 },        // Red supergiant
    coronaColor: { r: 1.0, g: 0.5, b: 0.2 },      // Orange corona
    explosionColor: { r: 1.0, g: 0.95, b: 0.9 },  // White-hot
    nebulaColors: {
        hydrogen: { r: 0.9, g: 0.2, b: 0.3 },     // H-alpha red
        oxygen: { r: 0.2, g: 0.8, b: 0.6 },       // OIII teal
        sulfur: { r: 1.0, g: 0.4, b: 0.2 }        // SII orange
    }
};

// ============================================================
// DETAILED PLANET DATA (for planet view mode)
// ============================================================
export const DETAILED_PLANET_DATA = {
    Mercury: {
        distanceFromSun: '57.9 million km',
        diameter: '4,879 km',
        dayLength: '59 Earth days',
        yearLength: '88 Earth days',
        surfaceTemp: '-180°C to 430°C',
        moons: 0,
        description: 'The smallest planet, heavily cratered',
        atmosphere: false,
        atmosphereColor: null,
        surfaceColors: [new THREE.Color(0.5, 0.5, 0.5), new THREE.Color(0.35, 0.35, 0.35)],
        hasRings: false
    },
    Venus: {
        distanceFromSun: '108.2 million km',
        diameter: '12,104 km',
        dayLength: '243 Earth days',
        yearLength: '225 Earth days',
        surfaceTemp: '465°C average',
        moons: 0,
        description: 'Shrouded in thick toxic clouds',
        atmosphere: true,
        atmosphereColor: new THREE.Color(0.95, 0.85, 0.5),
        surfaceColors: [new THREE.Color(0.9, 0.7, 0.4), new THREE.Color(0.8, 0.6, 0.3)],
        hasRings: false
    },
    Earth: {
        distanceFromSun: '149.6 million km',
        diameter: '12,742 km',
        dayLength: '24 hours',
        yearLength: '365.25 days',
        surfaceTemp: '15°C average',
        moons: 1,
        description: 'Our home, the blue marble',
        atmosphere: true,
        atmosphereColor: new THREE.Color(0.4, 0.6, 1.0),
        surfaceColors: [new THREE.Color(0.2, 0.5, 0.8), new THREE.Color(0.2, 0.5, 0.25)],
        hasClouds: true,
        hasRings: false
    },
    Mars: {
        distanceFromSun: '227.9 million km',
        diameter: '6,779 km',
        dayLength: '24.6 hours',
        yearLength: '687 Earth days',
        surfaceTemp: '-60°C average',
        moons: 2,
        description: 'The red planet with polar ice caps',
        atmosphere: true,
        atmosphereColor: new THREE.Color(0.9, 0.6, 0.4),
        surfaceColors: [new THREE.Color(0.8, 0.4, 0.2), new THREE.Color(0.6, 0.3, 0.15)],
        hasRings: false
    },
    Jupiter: {
        distanceFromSun: '778.5 million km',
        diameter: '139,820 km',
        dayLength: '10 hours',
        yearLength: '12 Earth years',
        surfaceTemp: '-110°C cloud tops',
        moons: 95,
        description: 'The gas giant with the Great Red Spot',
        atmosphere: true,
        atmosphereColor: new THREE.Color(0.85, 0.75, 0.6),
        surfaceColors: [new THREE.Color(0.8, 0.7, 0.55), new THREE.Color(0.7, 0.5, 0.4)],
        hasBands: true,
        hasStorm: true,
        hasRings: false
    },
    Saturn: {
        distanceFromSun: '1.43 billion km',
        diameter: '116,460 km',
        dayLength: '10.7 hours',
        yearLength: '29 Earth years',
        surfaceTemp: '-140°C cloud tops',
        moons: 146,
        description: 'Famous for its stunning ring system',
        atmosphere: true,
        atmosphereColor: new THREE.Color(0.9, 0.85, 0.6),
        surfaceColors: [new THREE.Color(0.9, 0.85, 0.6), new THREE.Color(0.85, 0.75, 0.5)],
        hasBands: true,
        hasRings: true,
        ringColors: [new THREE.Color(0.8, 0.75, 0.6), new THREE.Color(0.6, 0.55, 0.45)]
    },
    Uranus: {
        distanceFromSun: '2.87 billion km',
        diameter: '50,724 km',
        dayLength: '17 hours',
        yearLength: '84 Earth years',
        surfaceTemp: '-195°C',
        moons: 28,
        description: 'The ice giant tilted on its side',
        atmosphere: true,
        atmosphereColor: new THREE.Color(0.6, 0.8, 0.9),
        surfaceColors: [new THREE.Color(0.6, 0.8, 0.9), new THREE.Color(0.5, 0.7, 0.85)],
        axialTilt: 98,
        hasRings: true,
        ringColors: [new THREE.Color(0.4, 0.45, 0.5), new THREE.Color(0.35, 0.4, 0.45)]
    },
    Neptune: {
        distanceFromSun: '4.5 billion km',
        diameter: '49,244 km',
        dayLength: '16 hours',
        yearLength: '165 Earth years',
        surfaceTemp: '-200°C',
        moons: 16,
        description: 'The windiest planet with dark storms',
        atmosphere: true,
        atmosphereColor: new THREE.Color(0.3, 0.45, 0.9),
        surfaceColors: [new THREE.Color(0.25, 0.4, 0.85), new THREE.Color(0.2, 0.35, 0.8)],
        hasBands: true,
        hasStorm: true,
        hasRings: true,
        ringColors: [new THREE.Color(0.3, 0.35, 0.4), new THREE.Color(0.25, 0.3, 0.35)]
    }
};
