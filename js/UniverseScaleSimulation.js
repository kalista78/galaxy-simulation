/**
 * Universe Scale Simulation
 * A cinematic journey through 62 orders of magnitude
 * From Planck length (10^-35m) to Observable Universe (10^27m)
 */

import * as THREE from 'three';

// Scale data - 30 distinct stops across 62 orders of magnitude
const SCALE_DATA = [
    {
        name: "Planck Length",
        size: 1.616e-35,
        exponent: -35,
        description: "The smallest meaningful length in physics - where quantum gravity dominates",
        category: "quantum",
        color: { primary: [100, 255, 200], secondary: [0, 188, 212] },
        particleCount: 50,
        particleType: "quantum"
    },
    {
        name: "String Scale",
        size: 1e-34,
        exponent: -34,
        description: "Theoretical size of vibrating strings in string theory",
        category: "quantum",
        color: { primary: [100, 255, 220], secondary: [0, 200, 200] },
        particleCount: 80,
        particleType: "quantum"
    },
    {
        name: "Quark",
        size: 1e-19,
        exponent: -19,
        description: "Fundamental particles that make up protons and neutrons",
        category: "quantum",
        color: { primary: [255, 100, 150], secondary: [200, 50, 100] },
        particleCount: 6,
        particleType: "quark"
    },
    {
        name: "Proton",
        size: 8.75e-16,
        exponent: -15,
        description: "Made of three quarks held together by the strong force",
        category: "quantum",
        color: { primary: [255, 150, 100], secondary: [255, 100, 50] },
        particleCount: 3,
        particleType: "proton"
    },
    {
        name: "Atomic Nucleus",
        size: 1e-14,
        exponent: -14,
        description: "Dense core of an atom containing protons and neutrons",
        category: "quantum",
        color: { primary: [255, 180, 100], secondary: [255, 150, 50] },
        particleCount: 12,
        particleType: "nucleus"
    },
    {
        name: "Atom",
        size: 1e-10,
        exponent: -10,
        description: "Hydrogen atom - the simplest and most abundant element",
        category: "molecular",
        color: { primary: [100, 200, 255], secondary: [50, 150, 255] },
        particleCount: 8,
        particleType: "atom"
    },
    {
        name: "DNA Helix Width",
        size: 2e-9,
        exponent: -9,
        description: "The famous double helix that encodes life's instructions",
        category: "molecular",
        color: { primary: [255, 100, 180], secondary: [200, 50, 150] },
        particleCount: 40,
        particleType: "dna"
    },
    {
        name: "Virus",
        size: 1e-7,
        exponent: -7,
        description: "Coronavirus-sized - between living and non-living",
        category: "molecular",
        color: { primary: [150, 255, 100], secondary: [100, 200, 50] },
        particleCount: 20,
        particleType: "virus"
    },
    {
        name: "Bacteria",
        size: 2e-6,
        exponent: -6,
        description: "E. coli - single-celled organisms essential for life on Earth",
        category: "molecular",
        color: { primary: [100, 255, 150], secondary: [50, 200, 100] },
        particleCount: 15,
        particleType: "bacteria"
    },
    {
        name: "Human Cell",
        size: 1e-5,
        exponent: -5,
        description: "Red blood cell - one of 37 trillion cells in your body",
        category: "molecular",
        color: { primary: [255, 100, 100], secondary: [200, 50, 50] },
        particleCount: 1,
        particleType: "cell"
    },
    {
        name: "Human Hair",
        size: 7e-5,
        exponent: -4,
        description: "Width of a human hair - where we begin to see with our eyes",
        category: "macro",
        color: { primary: [200, 180, 150], secondary: [150, 130, 100] },
        particleCount: 30,
        particleType: "fibers"
    },
    {
        name: "Grain of Sand",
        size: 1e-3,
        exponent: -3,
        description: "A single grain of sand - there are more stars than grains on all beaches",
        category: "macro",
        color: { primary: [255, 220, 150], secondary: [200, 180, 100] },
        particleCount: 100,
        particleType: "sand"
    },
    {
        name: "Ant",
        size: 3e-3,
        exponent: -2,
        description: "Worker ant - capable of lifting 50 times its own body weight",
        category: "macro",
        color: { primary: [100, 80, 60], secondary: [80, 60, 40] },
        particleCount: 1,
        particleType: "insect"
    },
    {
        name: "Human Eye",
        size: 2.4e-2,
        exponent: -1,
        description: "The human eye - can distinguish about 10 million colors",
        category: "macro",
        color: { primary: [100, 150, 200], secondary: [50, 100, 150] },
        particleCount: 1,
        particleType: "eye"
    },
    {
        name: "Human",
        size: 1.7,
        exponent: 0,
        description: "Average human height - 7 billion of us on one pale blue dot",
        category: "macro",
        color: { primary: [255, 200, 150], secondary: [200, 150, 100] },
        particleCount: 1,
        particleType: "human"
    },
    {
        name: "Blue Whale",
        size: 30,
        exponent: 1,
        description: "The largest animal ever - heart the size of a car",
        category: "macro",
        color: { primary: [100, 150, 200], secondary: [50, 100, 180] },
        particleCount: 1,
        particleType: "whale"
    },
    {
        name: "Football Field",
        size: 100,
        exponent: 2,
        description: "100 meters - the length of a standard football/soccer field",
        category: "macro",
        color: { primary: [100, 200, 100], secondary: [50, 150, 50] },
        particleCount: 50,
        particleType: "grid"
    },
    {
        name: "Burj Khalifa",
        size: 828,
        exponent: 2.9,
        description: "World's tallest building - 163 floors reaching into the clouds",
        category: "macro",
        color: { primary: [150, 180, 200], secondary: [100, 130, 150] },
        particleCount: 30,
        particleType: "building"
    },
    {
        name: "Mount Everest",
        size: 8849,
        exponent: 3.9,
        description: "Earth's highest peak - where the atmosphere thins to nothing",
        category: "planetary",
        color: { primary: [200, 220, 255], secondary: [150, 180, 220] },
        particleCount: 40,
        particleType: "mountain"
    },
    {
        name: "Earth",
        size: 1.27e7,
        exponent: 7,
        description: "Our pale blue dot - the only known harbor of life",
        category: "planetary",
        color: { primary: [100, 150, 255], secondary: [50, 100, 200] },
        particleCount: 1,
        particleType: "planet"
    },
    {
        name: "Earth-Moon Distance",
        size: 3.84e8,
        exponent: 8,
        description: "384,400 km - light takes 1.3 seconds to travel this distance",
        category: "planetary",
        color: { primary: [150, 150, 180], secondary: [100, 100, 130] },
        particleCount: 2,
        particleType: "orbit"
    },
    {
        name: "The Sun",
        size: 1.39e9,
        exponent: 9,
        description: "Our star - 1.3 million Earths could fit inside",
        category: "planetary",
        color: { primary: [255, 200, 100], secondary: [255, 150, 50] },
        particleCount: 1,
        particleType: "star"
    },
    {
        name: "Sun-Earth Distance",
        size: 1.5e11,
        exponent: 11,
        description: "1 Astronomical Unit - light takes 8 minutes to reach Earth",
        category: "planetary",
        color: { primary: [255, 220, 150], secondary: [200, 180, 100] },
        particleCount: 2,
        particleType: "orbit"
    },
    {
        name: "Solar System",
        size: 9e12,
        exponent: 12,
        description: "To Neptune's orbit - Voyager 1 took 35 years to leave",
        category: "planetary",
        color: { primary: [100, 120, 180], secondary: [50, 80, 150] },
        particleCount: 8,
        particleType: "solarsystem"
    },
    {
        name: "Oort Cloud",
        size: 1.5e13,
        exponent: 13,
        description: "Spherical shell of icy objects surrounding our solar system",
        category: "cosmic",
        color: { primary: [150, 180, 220], secondary: [100, 130, 180] },
        particleCount: 200,
        particleType: "cloud"
    },
    {
        name: "Light Year",
        size: 9.46e15,
        exponent: 15,
        description: "The distance light travels in one year - 9.46 trillion km",
        category: "cosmic",
        color: { primary: [255, 255, 200], secondary: [200, 200, 150] },
        particleCount: 100,
        particleType: "lightbeam"
    },
    {
        name: "Nearest Star",
        size: 4e16,
        exponent: 16,
        description: "Proxima Centauri - 4.24 light years away",
        category: "cosmic",
        color: { primary: [255, 200, 150], secondary: [200, 150, 100] },
        particleCount: 3,
        particleType: "stars"
    },
    {
        name: "Nebula",
        size: 3e17,
        exponent: 17,
        description: "Orion Nebula - stellar nursery where stars are born",
        category: "cosmic",
        color: { primary: [255, 150, 200], secondary: [200, 100, 180] },
        particleCount: 500,
        particleType: "nebula"
    },
    {
        name: "Milky Way Galaxy",
        size: 1e21,
        exponent: 21,
        description: "Our galaxy - 200-400 billion stars spiraling together",
        category: "cosmic",
        color: { primary: [200, 180, 255], secondary: [150, 130, 200] },
        particleCount: 1000,
        particleType: "galaxy"
    },
    {
        name: "Local Group",
        size: 3e22,
        exponent: 22,
        description: "Our galactic neighborhood - ~80 galaxies including Andromeda",
        category: "cosmic",
        color: { primary: [180, 150, 255], secondary: [130, 100, 200] },
        particleCount: 80,
        particleType: "galaxygroup"
    },
    {
        name: "Galaxy Supercluster",
        size: 5e24,
        exponent: 24,
        description: "Laniakea - our supercluster containing 100,000 galaxies",
        category: "cosmic",
        color: { primary: [150, 100, 255], secondary: [100, 50, 200] },
        particleCount: 300,
        particleType: "supercluster"
    },
    {
        name: "Observable Universe",
        size: 8.8e26,
        exponent: 26,
        description: "Everything we can possibly see - 93 billion light years across",
        category: "cosmic",
        color: { primary: [255, 255, 255], secondary: [200, 200, 255] },
        particleCount: 2000,
        particleType: "universe"
    }
];

export class UniverseScaleSimulation {
    constructor() {
        this.container = document.getElementById('universe-container');
        this.currentScaleIndex = 0;
        this.targetScaleIndex = 0;
        this.isPlaying = false;
        this.transitionProgress = 0;
        this.autoPlayInterval = null;
        this.autoPlayDelay = 4000; // 4 seconds per scale

        // Three.js components
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.particles = null;
        this.backgroundStars = null;

        // Animation state
        this.clock = new THREE.Clock();
        this.isTransitioning = false;
        this.transitionDuration = 2.5; // seconds
        this.transitionStartTime = 0;

        // DOM elements
        this.scaleNameEl = document.getElementById('scale-name');
        this.scaleSizeEl = document.getElementById('scale-size');
        this.scaleDescEl = document.getElementById('scale-description');
        this.powerExponentEl = document.getElementById('power-exponent');
        this.progressBar = document.getElementById('progress-bar');
        this.scaleSlider = document.getElementById('scale-slider');
        this.playBtn = document.getElementById('btn-play');
        this.prevBtn = document.getElementById('btn-prev');
        this.nextBtn = document.getElementById('btn-next');
        this.loadingScreen = document.getElementById('loading-screen');
        this.loadingProgress = document.querySelector('.loading-progress');

        this.init();
    }

    init() {
        this.setupRenderer();
        this.setupCamera();
        this.setupScene();
        this.setupLights();
        this.createBackgroundStars();
        this.createScaleVisualization(0);
        this.setupEventListeners();
        this.updateUI();

        // Start animation loop
        this.animate();

        // Hide loading screen after initialization
        setTimeout(() => {
            this.loadingProgress.style.width = '100%';
            setTimeout(() => {
                this.loadingScreen.classList.add('hidden');
            }, 500);
        }, 1000);
    }

    setupRenderer() {
        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: true
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.setClearColor(0x000000, 1);
        this.container.appendChild(this.renderer.domElement);
    }

    setupCamera() {
        this.camera = new THREE.PerspectiveCamera(
            60,
            window.innerWidth / window.innerHeight,
            0.1,
            10000
        );
        this.camera.position.z = 50;
    }

    setupScene() {
        this.scene = new THREE.Scene();

        // Add fog for depth
        this.scene.fog = new THREE.FogExp2(0x000000, 0.008);
    }

    setupLights() {
        // Ambient light
        const ambient = new THREE.AmbientLight(0x404060, 0.5);
        this.scene.add(ambient);

        // Point light for dramatic effect
        const pointLight = new THREE.PointLight(0x7db4ff, 1, 100);
        pointLight.position.set(0, 0, 30);
        this.scene.add(pointLight);
    }

    createBackgroundStars() {
        const geometry = new THREE.BufferGeometry();
        const positions = [];
        const colors = [];
        const sizes = [];

        for (let i = 0; i < 3000; i++) {
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            const radius = 200 + Math.random() * 300;

            positions.push(
                radius * Math.sin(phi) * Math.cos(theta),
                radius * Math.sin(phi) * Math.sin(theta),
                radius * Math.cos(phi)
            );

            const colorValue = 0.5 + Math.random() * 0.5;
            colors.push(colorValue, colorValue, colorValue + Math.random() * 0.2);
            sizes.push(Math.random() * 2 + 0.5);
        }

        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
        geometry.setAttribute('size', new THREE.Float32BufferAttribute(sizes, 1));

        const material = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0 }
            },
            vertexShader: `
                attribute float size;
                attribute vec3 color;
                varying vec3 vColor;
                uniform float time;

                void main() {
                    vColor = color;
                    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                    gl_PointSize = size * (200.0 / -mvPosition.z);
                    gl_Position = projectionMatrix * mvPosition;
                }
            `,
            fragmentShader: `
                varying vec3 vColor;

                void main() {
                    float dist = length(gl_PointCoord - vec2(0.5));
                    if (dist > 0.5) discard;
                    float alpha = 1.0 - smoothstep(0.0, 0.5, dist);
                    gl_FragColor = vec4(vColor, alpha * 0.8);
                }
            `,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });

        this.backgroundStars = new THREE.Points(geometry, material);
        this.scene.add(this.backgroundStars);
    }

    createScaleVisualization(scaleIndex) {
        // Remove existing particles
        if (this.particles) {
            this.scene.remove(this.particles);
            this.particles.geometry.dispose();
            this.particles.material.dispose();
        }

        const scaleData = SCALE_DATA[scaleIndex];
        const geometry = new THREE.BufferGeometry();
        const positions = [];
        const colors = [];
        const sizes = [];

        const particleCount = scaleData.particleCount;
        const primaryColor = scaleData.color.primary;
        const secondaryColor = scaleData.color.secondary;

        // Different particle arrangements based on type
        switch (scaleData.particleType) {
            case 'quantum':
                this.createQuantumParticles(positions, colors, sizes, particleCount, primaryColor, secondaryColor);
                break;
            case 'quark':
                this.createQuarkParticles(positions, colors, sizes, particleCount, primaryColor, secondaryColor);
                break;
            case 'proton':
                this.createProtonParticles(positions, colors, sizes, particleCount, primaryColor, secondaryColor);
                break;
            case 'nucleus':
                this.createNucleusParticles(positions, colors, sizes, particleCount, primaryColor, secondaryColor);
                break;
            case 'atom':
                this.createAtomParticles(positions, colors, sizes, particleCount, primaryColor, secondaryColor);
                break;
            case 'dna':
                this.createDNAParticles(positions, colors, sizes, particleCount, primaryColor, secondaryColor);
                break;
            case 'virus':
                this.createVirusParticles(positions, colors, sizes, particleCount, primaryColor, secondaryColor);
                break;
            case 'bacteria':
                this.createBacteriaParticles(positions, colors, sizes, particleCount, primaryColor, secondaryColor);
                break;
            case 'cell':
                this.createCellParticles(positions, colors, sizes, particleCount, primaryColor, secondaryColor);
                break;
            case 'planet':
            case 'star':
                this.createSphereParticles(positions, colors, sizes, particleCount, primaryColor, secondaryColor);
                break;
            case 'orbit':
                this.createOrbitParticles(positions, colors, sizes, particleCount, primaryColor, secondaryColor);
                break;
            case 'solarsystem':
                this.createSolarSystemParticles(positions, colors, sizes, particleCount, primaryColor, secondaryColor);
                break;
            case 'galaxy':
                this.createGalaxyParticles(positions, colors, sizes, particleCount, primaryColor, secondaryColor);
                break;
            case 'nebula':
                this.createNebulaParticles(positions, colors, sizes, particleCount, primaryColor, secondaryColor);
                break;
            case 'universe':
                this.createUniverseParticles(positions, colors, sizes, particleCount, primaryColor, secondaryColor);
                break;
            default:
                this.createDefaultParticles(positions, colors, sizes, particleCount, primaryColor, secondaryColor);
        }

        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
        geometry.setAttribute('size', new THREE.Float32BufferAttribute(sizes, 1));

        const material = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0 },
                scale: { value: 1.0 },
                opacity: { value: 1.0 }
            },
            vertexShader: `
                attribute float size;
                attribute vec3 color;
                varying vec3 vColor;
                varying float vAlpha;
                uniform float time;
                uniform float scale;

                void main() {
                    vColor = color;
                    vAlpha = 1.0;

                    vec3 pos = position * scale;
                    pos += sin(time * 0.5 + position.x) * 0.1;
                    pos += cos(time * 0.3 + position.y) * 0.1;

                    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
                    gl_PointSize = size * scale * (150.0 / -mvPosition.z);
                    gl_PointSize = clamp(gl_PointSize, 1.0, 50.0);
                    gl_Position = projectionMatrix * mvPosition;
                }
            `,
            fragmentShader: `
                varying vec3 vColor;
                varying float vAlpha;
                uniform float opacity;

                void main() {
                    float dist = length(gl_PointCoord - vec2(0.5));
                    if (dist > 0.5) discard;

                    float glow = 1.0 - smoothstep(0.0, 0.5, dist);
                    float core = 1.0 - smoothstep(0.0, 0.2, dist);

                    vec3 finalColor = vColor * glow + vec3(1.0) * core * 0.3;
                    gl_FragColor = vec4(finalColor, glow * opacity * vAlpha);
                }
            `,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });

        this.particles = new THREE.Points(geometry, material);
        this.scene.add(this.particles);

        // Update body class for theme
        document.body.className = `${scaleData.category}-theme`;
    }

    // Particle creation methods for different scale types
    createQuantumParticles(positions, colors, sizes, count, primary, secondary) {
        for (let i = 0; i < count; i++) {
            const r = Math.random() * 15;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);

            positions.push(
                r * Math.sin(phi) * Math.cos(theta),
                r * Math.sin(phi) * Math.sin(theta),
                r * Math.cos(phi)
            );

            const t = Math.random();
            colors.push(
                (primary[0] * (1 - t) + secondary[0] * t) / 255,
                (primary[1] * (1 - t) + secondary[1] * t) / 255,
                (primary[2] * (1 - t) + secondary[2] * t) / 255
            );

            sizes.push(Math.random() * 3 + 1);
        }
    }

    createQuarkParticles(positions, colors, sizes, count, primary, secondary) {
        const quarkPositions = [
            [-5, 0, 0], [5, 0, 0], [0, 5, 0]
        ];
        const quarkColors = [
            [255, 0, 0], [0, 255, 0], [0, 0, 255]
        ];

        for (let i = 0; i < 3; i++) {
            positions.push(...quarkPositions[i]);
            colors.push(quarkColors[i][0] / 255, quarkColors[i][1] / 255, quarkColors[i][2] / 255);
            sizes.push(15);
        }

        // Gluon lines
        for (let i = 0; i < 50; i++) {
            const t = i / 50;
            const idx1 = Math.floor(Math.random() * 3);
            const idx2 = (idx1 + 1 + Math.floor(Math.random() * 2)) % 3;

            const p1 = quarkPositions[idx1];
            const p2 = quarkPositions[idx2];

            positions.push(
                p1[0] * (1 - t) + p2[0] * t + (Math.random() - 0.5) * 2,
                p1[1] * (1 - t) + p2[1] * t + (Math.random() - 0.5) * 2,
                p1[2] * (1 - t) + p2[2] * t + (Math.random() - 0.5) * 2
            );
            colors.push(1, 1, 0);
            sizes.push(2);
        }
    }

    createProtonParticles(positions, colors, sizes, count, primary, secondary) {
        // 3 quarks in triangular arrangement with gluon field
        const angle = Math.PI * 2 / 3;
        for (let i = 0; i < 3; i++) {
            const x = Math.cos(angle * i) * 8;
            const y = Math.sin(angle * i) * 8;
            positions.push(x, y, 0);

            const quarkColor = i === 0 ? [1, 0.2, 0.2] : i === 1 ? [0.2, 1, 0.2] : [0.2, 0.2, 1];
            colors.push(...quarkColor);
            sizes.push(20);
        }

        // Gluon field
        for (let i = 0; i < 100; i++) {
            const r = Math.random() * 12;
            const theta = Math.random() * Math.PI * 2;
            positions.push(r * Math.cos(theta), r * Math.sin(theta), (Math.random() - 0.5) * 5);
            colors.push(1, 0.8, 0.2);
            sizes.push(Math.random() * 3 + 1);
        }
    }

    createNucleusParticles(positions, colors, sizes, count, primary, secondary) {
        // Protons and neutrons in a cluster
        for (let i = 0; i < count; i++) {
            const r = Math.random() * 10;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);

            positions.push(
                r * Math.sin(phi) * Math.cos(theta),
                r * Math.sin(phi) * Math.sin(theta),
                r * Math.cos(phi)
            );

            // Alternating protons (red) and neutrons (blue)
            const isProton = i % 2 === 0;
            colors.push(
                isProton ? 1 : 0.3,
                isProton ? 0.3 : 0.3,
                isProton ? 0.3 : 1
            );
            sizes.push(12);
        }
    }

    createAtomParticles(positions, colors, sizes, count, primary, secondary) {
        // Nucleus at center
        positions.push(0, 0, 0);
        colors.push(1, 0.5, 0.2);
        sizes.push(15);

        // Electron orbits
        for (let orbit = 0; orbit < 3; orbit++) {
            const radius = 10 + orbit * 5;
            for (let i = 0; i < 30; i++) {
                const angle = (i / 30) * Math.PI * 2;
                const x = Math.cos(angle) * radius;
                const y = Math.sin(angle) * radius * Math.cos(orbit * Math.PI / 3);
                const z = Math.sin(angle) * radius * Math.sin(orbit * Math.PI / 3);

                positions.push(x, y, z);
                colors.push(0.3, 0.7, 1);
                sizes.push(1);
            }
        }

        // Electrons
        for (let i = 0; i < 2; i++) {
            const angle = Math.random() * Math.PI * 2;
            const radius = 10 + i * 5;
            positions.push(Math.cos(angle) * radius, Math.sin(angle) * radius, 0);
            colors.push(0.2, 0.6, 1);
            sizes.push(8);
        }
    }

    createDNAParticles(positions, colors, sizes, count, primary, secondary) {
        // Double helix
        for (let i = 0; i < count; i++) {
            const t = (i / count) * Math.PI * 4;
            const y = (i / count - 0.5) * 30;

            // First strand
            positions.push(Math.cos(t) * 8, y, Math.sin(t) * 8);
            colors.push(primary[0] / 255, primary[1] / 255, primary[2] / 255);
            sizes.push(4);

            // Second strand
            positions.push(Math.cos(t + Math.PI) * 8, y, Math.sin(t + Math.PI) * 8);
            colors.push(secondary[0] / 255, secondary[1] / 255, secondary[2] / 255);
            sizes.push(4);

            // Base pairs
            if (i % 3 === 0) {
                for (let j = 0; j < 5; j++) {
                    const bx = Math.cos(t) * 8 * (1 - j / 5) + Math.cos(t + Math.PI) * 8 * (j / 5);
                    const bz = Math.sin(t) * 8 * (1 - j / 5) + Math.sin(t + Math.PI) * 8 * (j / 5);
                    positions.push(bx, y, bz);
                    colors.push(0.5, 1, 0.8);
                    sizes.push(2);
                }
            }
        }
    }

    createVirusParticles(positions, colors, sizes, count, primary, secondary) {
        // Spherical shell with spikes
        const shellRadius = 10;

        // Shell
        for (let i = 0; i < count * 3; i++) {
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);

            const r = shellRadius + (Math.random() - 0.5) * 2;
            positions.push(
                r * Math.sin(phi) * Math.cos(theta),
                r * Math.sin(phi) * Math.sin(theta),
                r * Math.cos(phi)
            );
            colors.push(primary[0] / 255, primary[1] / 255, primary[2] / 255);
            sizes.push(3);
        }

        // Spikes
        for (let i = 0; i < count; i++) {
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);

            const baseR = shellRadius;
            const tipR = shellRadius + 5;

            const dir = new THREE.Vector3(
                Math.sin(phi) * Math.cos(theta),
                Math.sin(phi) * Math.sin(theta),
                Math.cos(phi)
            );

            for (let j = 0; j < 3; j++) {
                const r = baseR + (tipR - baseR) * (j / 2);
                positions.push(dir.x * r, dir.y * r, dir.z * r);
                colors.push(secondary[0] / 255, secondary[1] / 255, secondary[2] / 255);
                sizes.push(4 - j);
            }
        }
    }

    createBacteriaParticles(positions, colors, sizes, count, primary, secondary) {
        // Rod-shaped bacteria
        for (let i = 0; i < count * 10; i++) {
            const t = Math.random();
            const y = (t - 0.5) * 25;
            const angle = Math.random() * Math.PI * 2;
            const r = 8 * Math.sqrt(1 - Math.pow(t * 2 - 1, 4));

            positions.push(
                Math.cos(angle) * r,
                y,
                Math.sin(angle) * r
            );

            colors.push(
                primary[0] / 255 * (0.8 + Math.random() * 0.2),
                primary[1] / 255 * (0.8 + Math.random() * 0.2),
                primary[2] / 255 * (0.8 + Math.random() * 0.2)
            );
            sizes.push(3);
        }

        // Flagella
        for (let f = 0; f < 3; f++) {
            for (let i = 0; i < 20; i++) {
                const t = i / 20;
                positions.push(
                    Math.sin(t * Math.PI * 4 + f) * 3,
                    -12.5 - t * 15,
                    Math.cos(t * Math.PI * 4 + f) * 3
                );
                colors.push(0.5, 0.8, 0.5);
                sizes.push(2);
            }
        }
    }

    createCellParticles(positions, colors, sizes, count, primary, secondary) {
        // Red blood cell - biconcave disc
        for (let i = 0; i < 200; i++) {
            const angle = Math.random() * Math.PI * 2;
            const r = Math.random() * 12;
            const biconcave = 3 * (1 - Math.pow(r / 12, 2)) * Math.cos(r / 12 * Math.PI);

            positions.push(
                Math.cos(angle) * r,
                biconcave * (Math.random() > 0.5 ? 1 : -1) + (Math.random() - 0.5),
                Math.sin(angle) * r
            );
            colors.push(
                primary[0] / 255 * (0.7 + Math.random() * 0.3),
                primary[1] / 255 * (0.7 + Math.random() * 0.3),
                primary[2] / 255 * (0.7 + Math.random() * 0.3)
            );
            sizes.push(4);
        }
    }

    createSphereParticles(positions, colors, sizes, count, primary, secondary) {
        // Solid sphere
        for (let i = 0; i < 500; i++) {
            const r = Math.pow(Math.random(), 0.33) * 15;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);

            positions.push(
                r * Math.sin(phi) * Math.cos(theta),
                r * Math.sin(phi) * Math.sin(theta),
                r * Math.cos(phi)
            );

            const t = r / 15;
            colors.push(
                (primary[0] * (1 - t) + secondary[0] * t) / 255,
                (primary[1] * (1 - t) + secondary[1] * t) / 255,
                (primary[2] * (1 - t) + secondary[2] * t) / 255
            );
            sizes.push(3 + (1 - t) * 5);
        }
    }

    createOrbitParticles(positions, colors, sizes, count, primary, secondary) {
        // Central body
        positions.push(0, 0, 0);
        colors.push(primary[0] / 255, primary[1] / 255, primary[2] / 255);
        sizes.push(20);

        // Orbiting body
        positions.push(20, 0, 0);
        colors.push(secondary[0] / 255, secondary[1] / 255, secondary[2] / 255);
        sizes.push(8);

        // Orbit trail
        for (let i = 0; i < 100; i++) {
            const angle = (i / 100) * Math.PI * 2;
            positions.push(Math.cos(angle) * 20, 0, Math.sin(angle) * 20);
            colors.push(0.3, 0.3, 0.5);
            sizes.push(1);
        }
    }

    createSolarSystemParticles(positions, colors, sizes, count, primary, secondary) {
        // Sun
        positions.push(0, 0, 0);
        colors.push(1, 0.8, 0.3);
        sizes.push(15);

        // Planets
        const planetDistances = [4, 7, 10, 15, 25, 35, 45, 55];
        const planetColors = [
            [0.7, 0.7, 0.7], // Mercury
            [0.9, 0.7, 0.5], // Venus
            [0.3, 0.5, 0.9], // Earth
            [0.9, 0.4, 0.3], // Mars
            [0.9, 0.8, 0.6], // Jupiter
            [0.9, 0.8, 0.5], // Saturn
            [0.6, 0.8, 0.9], // Uranus
            [0.4, 0.5, 0.9]  // Neptune
        ];
        const planetSizes = [3, 4, 4, 3, 10, 9, 6, 6];

        for (let i = 0; i < 8; i++) {
            const angle = Math.random() * Math.PI * 2;
            positions.push(
                Math.cos(angle) * planetDistances[i],
                (Math.random() - 0.5) * 2,
                Math.sin(angle) * planetDistances[i]
            );
            colors.push(...planetColors[i]);
            sizes.push(planetSizes[i]);

            // Orbit
            for (let j = 0; j < 30; j++) {
                const orbitAngle = (j / 30) * Math.PI * 2;
                positions.push(
                    Math.cos(orbitAngle) * planetDistances[i],
                    0,
                    Math.sin(orbitAngle) * planetDistances[i]
                );
                colors.push(0.2, 0.2, 0.3);
                sizes.push(0.5);
            }
        }
    }

    createGalaxyParticles(positions, colors, sizes, count, primary, secondary) {
        // Spiral galaxy
        for (let i = 0; i < count; i++) {
            const arm = Math.floor(Math.random() * 4);
            const armAngle = (arm / 4) * Math.PI * 2;
            const r = Math.random() * 25;
            const spiralAngle = armAngle + r * 0.3 + (Math.random() - 0.5) * 0.5;

            positions.push(
                Math.cos(spiralAngle) * r,
                (Math.random() - 0.5) * 3 * Math.exp(-r / 15),
                Math.sin(spiralAngle) * r
            );

            const brightness = 0.5 + Math.random() * 0.5;
            const t = r / 25;
            colors.push(
                (primary[0] * (1 - t) + secondary[0] * t) / 255 * brightness,
                (primary[1] * (1 - t) + secondary[1] * t) / 255 * brightness,
                (primary[2] * (1 - t) + secondary[2] * t) / 255 * brightness
            );
            sizes.push(Math.random() * 3 + 1);
        }

        // Core
        for (let i = 0; i < 200; i++) {
            const r = Math.random() * 5;
            const theta = Math.random() * Math.PI * 2;
            positions.push(
                Math.cos(theta) * r,
                (Math.random() - 0.5) * 2,
                Math.sin(theta) * r
            );
            colors.push(1, 0.9, 0.7);
            sizes.push(2);
        }
    }

    createNebulaParticles(positions, colors, sizes, count, primary, secondary) {
        for (let i = 0; i < count; i++) {
            const r = Math.random() * 30;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);

            // Turbulent offset
            const turbulence = Math.sin(theta * 5) * Math.cos(phi * 3) * 5;

            positions.push(
                (r + turbulence) * Math.sin(phi) * Math.cos(theta),
                (r + turbulence) * Math.sin(phi) * Math.sin(theta),
                (r + turbulence) * Math.cos(phi)
            );

            // Colorful nebula
            const hue = Math.random();
            if (hue < 0.33) {
                colors.push(primary[0] / 255, primary[1] / 255, primary[2] / 255);
            } else if (hue < 0.66) {
                colors.push(secondary[0] / 255, secondary[1] / 255, secondary[2] / 255);
            } else {
                colors.push(0.5, 0.8, 1);
            }
            sizes.push(Math.random() * 4 + 1);
        }

        // Embedded stars
        for (let i = 0; i < 20; i++) {
            const r = Math.random() * 15;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);

            positions.push(
                r * Math.sin(phi) * Math.cos(theta),
                r * Math.sin(phi) * Math.sin(theta),
                r * Math.cos(phi)
            );
            colors.push(1, 1, 0.9);
            sizes.push(5);
        }
    }

    createUniverseParticles(positions, colors, sizes, count, primary, secondary) {
        // Cosmic web structure
        for (let i = 0; i < count; i++) {
            // Create filament-like structure
            const mainAxis = Math.floor(Math.random() * 3);
            const t = Math.random();

            let x, y, z;
            const spread = 5;

            if (mainAxis === 0) {
                x = (t - 0.5) * 80;
                y = (Math.random() - 0.5) * spread + Math.sin(t * Math.PI * 2) * 10;
                z = (Math.random() - 0.5) * spread + Math.cos(t * Math.PI * 2) * 10;
            } else if (mainAxis === 1) {
                y = (t - 0.5) * 80;
                x = (Math.random() - 0.5) * spread + Math.sin(t * Math.PI * 2) * 10;
                z = (Math.random() - 0.5) * spread + Math.cos(t * Math.PI * 2) * 10;
            } else {
                z = (t - 0.5) * 80;
                x = (Math.random() - 0.5) * spread + Math.sin(t * Math.PI * 2) * 10;
                y = (Math.random() - 0.5) * spread + Math.cos(t * Math.PI * 2) * 10;
            }

            positions.push(x, y, z);

            const brightness = 0.3 + Math.random() * 0.7;
            colors.push(brightness, brightness, brightness + Math.random() * 0.2);
            sizes.push(Math.random() * 2 + 0.5);
        }

        // Galaxy clusters (brighter nodes)
        for (let i = 0; i < 50; i++) {
            positions.push(
                (Math.random() - 0.5) * 60,
                (Math.random() - 0.5) * 60,
                (Math.random() - 0.5) * 60
            );
            colors.push(1, 0.9, 0.8);
            sizes.push(5);
        }
    }

    createDefaultParticles(positions, colors, sizes, count, primary, secondary) {
        for (let i = 0; i < count * 3; i++) {
            const r = Math.random() * 20;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);

            positions.push(
                r * Math.sin(phi) * Math.cos(theta),
                r * Math.sin(phi) * Math.sin(theta),
                r * Math.cos(phi)
            );

            const t = Math.random();
            colors.push(
                (primary[0] * (1 - t) + secondary[0] * t) / 255,
                (primary[1] * (1 - t) + secondary[1] * t) / 255,
                (primary[2] * (1 - t) + secondary[2] * t) / 255
            );
            sizes.push(Math.random() * 4 + 1);
        }
    }

    setupEventListeners() {
        // Navigation buttons
        this.prevBtn.addEventListener('click', () => this.goToPreviousScale());
        this.nextBtn.addEventListener('click', () => this.goToNextScale());
        this.playBtn.addEventListener('click', () => this.toggleAutoPlay());

        // Slider
        this.scaleSlider.addEventListener('input', (e) => {
            const index = Math.round((e.target.value / 100) * (SCALE_DATA.length - 1));
            this.goToScale(index);
        });

        // Keyboard
        document.addEventListener('keydown', (e) => {
            switch (e.code) {
                case 'Space':
                    e.preventDefault();
                    this.toggleAutoPlay();
                    break;
                case 'ArrowLeft':
                    this.goToPreviousScale();
                    break;
                case 'ArrowRight':
                    this.goToNextScale();
                    break;
                case 'ArrowUp':
                    this.goToScale(SCALE_DATA.length - 1);
                    break;
                case 'ArrowDown':
                    this.goToScale(0);
                    break;
            }
        });

        // Scroll wheel
        let scrollTimeout;
        document.addEventListener('wheel', (e) => {
            clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(() => {
                if (e.deltaY > 0) {
                    this.goToNextScale();
                } else {
                    this.goToPreviousScale();
                }
            }, 50);
        }, { passive: true });

        // Window resize
        window.addEventListener('resize', () => this.onResize());
    }

    goToScale(index) {
        if (index < 0 || index >= SCALE_DATA.length || this.isTransitioning) return;

        this.targetScaleIndex = index;
        this.isTransitioning = true;
        this.transitionStartTime = this.clock.getElapsedTime();

        // Create new visualization
        this.createScaleVisualization(index);

        // Animate transition
        this.currentScaleIndex = index;
        this.updateUI();
    }

    goToNextScale() {
        if (this.currentScaleIndex < SCALE_DATA.length - 1) {
            this.goToScale(this.currentScaleIndex + 1);
        }
    }

    goToPreviousScale() {
        if (this.currentScaleIndex > 0) {
            this.goToScale(this.currentScaleIndex - 1);
        }
    }

    toggleAutoPlay() {
        this.isPlaying = !this.isPlaying;
        this.playBtn.classList.toggle('playing', this.isPlaying);

        if (this.isPlaying) {
            this.startAutoPlay();
        } else {
            this.stopAutoPlay();
        }
    }

    startAutoPlay() {
        this.autoPlayInterval = setInterval(() => {
            if (this.currentScaleIndex < SCALE_DATA.length - 1) {
                this.goToNextScale();
            } else {
                // Loop back to beginning
                this.goToScale(0);
            }
        }, this.autoPlayDelay);
    }

    stopAutoPlay() {
        if (this.autoPlayInterval) {
            clearInterval(this.autoPlayInterval);
            this.autoPlayInterval = null;
        }
    }

    updateUI() {
        const scale = SCALE_DATA[this.currentScaleIndex];

        // Update text
        this.scaleNameEl.textContent = scale.name;
        this.scaleDescEl.textContent = scale.description;

        // Format size
        const sizeStr = this.formatSize(scale.size);
        this.scaleSizeEl.innerHTML = sizeStr;

        // Update power exponent
        this.powerExponentEl.textContent = scale.exponent >= 0 ? `+${scale.exponent}` : scale.exponent;

        // Update progress bar
        const progress = (this.currentScaleIndex / (SCALE_DATA.length - 1)) * 100;
        this.progressBar.style.width = `${progress}%`;

        // Update slider
        this.scaleSlider.value = progress;
    }

    formatSize(size) {
        if (size >= 1e9) {
            const exp = Math.floor(Math.log10(size));
            const mantissa = size / Math.pow(10, exp);
            return `${mantissa.toFixed(1)} × 10<sup>${exp}</sup> m`;
        } else if (size >= 1) {
            return `${size.toFixed(1)} m`;
        } else if (size >= 1e-3) {
            return `${(size * 1000).toFixed(1)} mm`;
        } else if (size >= 1e-6) {
            return `${(size * 1e6).toFixed(1)} μm`;
        } else if (size >= 1e-9) {
            return `${(size * 1e9).toFixed(1)} nm`;
        } else {
            const exp = Math.floor(Math.log10(size));
            const mantissa = size / Math.pow(10, exp);
            return `${mantissa.toFixed(1)} × 10<sup>${exp}</sup> m`;
        }
    }

    onResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        const time = this.clock.getElapsedTime();
        const delta = this.clock.getDelta();

        // Update particles
        if (this.particles) {
            this.particles.material.uniforms.time.value = time;

            // Handle transition
            if (this.isTransitioning) {
                const transitionTime = time - this.transitionStartTime;
                const progress = Math.min(transitionTime / this.transitionDuration, 1);
                const eased = this.easeInOutCubic(progress);

                this.particles.material.uniforms.scale.value = 0.5 + eased * 0.5;
                this.particles.material.uniforms.opacity.value = eased;

                // Camera zoom effect
                this.camera.position.z = 50 + (1 - eased) * 30;

                if (progress >= 1) {
                    this.isTransitioning = false;
                }
            }

            // Gentle rotation
            this.particles.rotation.y += delta * 0.1;
            this.particles.rotation.x = Math.sin(time * 0.2) * 0.1;
        }

        // Rotate background stars
        if (this.backgroundStars) {
            this.backgroundStars.rotation.y += delta * 0.02;
            this.backgroundStars.material.uniforms.time.value = time;
        }

        this.renderer.render(this.scene, this.camera);
    }

    easeInOutCubic(t) {
        return t < 0.5
            ? 4 * t * t * t
            : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }
}
