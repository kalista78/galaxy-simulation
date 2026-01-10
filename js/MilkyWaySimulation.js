import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

import { GALAXY_CONFIG, SPECTRAL_COLORS, PLANET_DATA, SOLAR_JOURNEY_PHASES, BLACK_HOLE_JOURNEY_PHASES, TOUR_SEQUENCES, DETAILED_PLANET_DATA, ANDROMEDA_CONFIG, MERGER_PHASES, SUPERNOVA_PHASES, SUPERNOVA_CONFIG } from './config.js?v=3';
import { gaussianRandom, getSpectralType, bulgeDensity, diskDensity, easeInOutCubic } from './utils.js?v=3';
import { starVertexShader, starFragmentShader } from './shaders/star-shaders.js?v=3';
import { dustVertexShader, dustFragmentShader } from './shaders/dust-shaders.js?v=3';
import { coreVertexShader, coreFragmentShader, coronaFragmentShader, markerVertexShader, markerFragmentShader } from './shaders/core-shaders.js?v=3';
import { blackHoleVertexShader, blackHoleFragmentShader, accretionVertexShader, accretionFragmentShader } from './shaders/blackhole-shaders.js?v=3';
import { sunVertexShader, sunFragmentShader, planetVertexShader, planetFragmentShader, ringsVertexShader, ringsFragmentShader } from './shaders/solarsystem-shaders.js?v=3';
import { detailedPlanetVertexShader, detailedPlanetFragmentShader, atmosphereVertexShader, atmosphereFragmentShader, cloudVertexShader, cloudFragmentShader, detailedRingsVertexShader, detailedRingsFragmentShader } from './shaders/planet-detail-shaders.js?v=3';
import { supernovaStarVertexShader, supernovaStarFragmentShader, shockwaveVertexShader, shockwaveFragmentShader, debrisVertexShader, debrisFragmentShader, nebulaVertexShader, nebulaFragmentShader, pulsarVertexShader, pulsarFragmentShader, flashVertexShader, flashFragmentShader, coronaVertexShader as supernovaCoronaVertexShader, coronaFragmentShader as supernovaCoronaFragmentShader } from './shaders/supernova-shaders.js?v=3';
import { AudioManager } from './AudioManager.js?v=3';
import { SolarSystemDetailed } from './SolarSystemDetailed.js?v=1';

export class MilkyWaySimulation {
    constructor() {
        this.scene = new THREE.Scene();
        this.clock = new THREE.Clock();
        this.uniforms = {
            time: { value: 0 },
            globalBrightness: { value: 1.0 },
            speedMultiplier: { value: 1.0 },
            coreGlow: { value: 1.0 }
        };

        // Simulation state
        this.isPaused = false;
        this.timeScale = 1.0;
        this.speedMultiplier = 1.0;
        this.simulationTime = 0;
        this.lastFrameTime = performance.now();
        this.frameCount = 0;
        this.fpsUpdateTime = 0;

        // Planet data reference
        this.planetData = PLANET_DATA;
        this.detailedPlanetData = DETAILED_PLANET_DATA;

        // Tour sequences
        this.tourSequences = TOUR_SEQUENCES;

        // Audio manager
        this.audioManager = new AudioManager();
        this.lastCameraPos = new THREE.Vector3();
        this.cameraVelocity = 0;

        // Planet view state
        this.planetViewState = {
            active: false,
            planet: null,
            detailedPlanetMesh: null,
            savedCameraPos: new THREE.Vector3(),
            savedTarget: new THREE.Vector3(),
            orbitTime: 0
        };

        // Raycaster for planet clicking
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();

        // Detailed solar system (textured)
        this.detailedSolarSystem = null;
        this.useDetailedSolarSystem = true;

        // Andromeda galaxy
        this.andromedaConfig = ANDROMEDA_CONFIG;
        this.andromedaGroup = null;

        // Merger simulation state with physics
        this.mergerState = {
            active: false,
            progress: 0,
            phase: 0,
            savedCameraPos: new THREE.Vector3(),
            savedTarget: new THREE.Vector3(),
            milkyWayOriginalPos: new THREE.Vector3(0, 0, 0),
            andromedaOriginalPos: new THREE.Vector3(),
            mergerPhases: MERGER_PHASES,
            // Physics-based simulation
            physics: {
                milkyWay: {
                    pos: new THREE.Vector3(0, 0, 0),
                    vel: new THREE.Vector3(0, 0, 0),
                    mass: 1.0,  // Relative mass
                    tidal: 0    // Tidal distortion factor
                },
                andromeda: {
                    pos: new THREE.Vector3(),
                    vel: new THREE.Vector3(),
                    mass: 1.2,  // Andromeda is slightly more massive
                    tidal: 0
                },
                G: 800,         // Gravitational constant (tuned for visual effect)
                timeScale: 1.5, // Speed multiplier
                centerOfMass: new THREE.Vector3(),
                orbitalEnergy: 0
            }
        };

        // Supernova simulation state
        this.supernovaState = {
            active: false,
            progress: 0,
            phase: 0,
            savedCameraPos: new THREE.Vector3(),
            savedTarget: new THREE.Vector3(),
            supernovaPhases: SUPERNOVA_PHASES,
            config: SUPERNOVA_CONFIG,
            // Animation state
            starScale: 1.0,
            collapseProgress: 0,
            explosionProgress: 0,
            shockwaveRadius: 1,
            flashIntensity: 0,
            nebulaAge: 0,
            temperature: 0,
            pulsarActive: false
        };

        this.init();
        this.createGalaxy();
        this.setupPostProcessing();
        this.setupControls();
        this.setupPlanetClicking();
        this.animate();
    }

    init() {
        // Renderer with logarithmic depth buffer
        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: true,
            logarithmicDepthBuffer: true
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.setClearColor(0x000000, 1);
        this.renderer.sortObjects = true;
        document.body.appendChild(this.renderer.domElement);

        // Camera
        this.camera = new THREE.PerspectiveCamera(
            60,
            window.innerWidth / window.innerHeight,
            0.1,
            10000
        );
        this.camera.position.set(0, 150, 250);

        // Controls
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.minDistance = 30;
        this.controls.maxDistance = 800;
        this.controls.autoRotate = false;
        this.controls.autoRotateSpeed = 0.2;

        // Resize handler
        window.addEventListener('resize', () => this.onResize());
    }

    createGalaxy() {
        // Create all galaxy components
        this.createBackgroundStars();
        this.createGalacticCore();
        this.createBlackHole();
        this.createDiskStars();
        this.createBulgeStars();
        this.createHaloAndGlobularClusters();
        this.createDustLanes();
        this.createSolarSystem();
        this.createAndromedaGalaxy();
        this.createSupernova();
        this.initCinematicSystem();
    }

    createBackgroundStars() {
        // Distant background stars/galaxies for depth
        const geometry = new THREE.BufferGeometry();
        const count = 5000;

        const positions = new Float32Array(count * 3);
        const colors = new Float32Array(count * 3);
        const sizes = new Float32Array(count);

        for (let i = 0; i < count; i++) {
            // Distribute on a large sphere
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            const r = 800 + Math.random() * 500;

            positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
            positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
            positions[i * 3 + 2] = r * Math.cos(phi);

            // Faint white/blue colors
            const brightness = 0.3 + Math.random() * 0.4;
            colors[i * 3] = brightness * (0.8 + Math.random() * 0.2);
            colors[i * 3 + 1] = brightness * (0.85 + Math.random() * 0.15);
            colors[i * 3 + 2] = brightness;

            sizes[i] = 0.5 + Math.random() * 1.5;
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('customColor', new THREE.BufferAttribute(colors, 3));
        geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
        geometry.setAttribute('brightness', new THREE.BufferAttribute(new Float32Array(count).fill(0.5), 1));
        geometry.setAttribute('rotationSpeed', new THREE.BufferAttribute(new Float32Array(count).fill(0), 1));
        geometry.setAttribute('initialAngle', new THREE.BufferAttribute(new Float32Array(count).fill(0), 1));
        geometry.setAttribute('distanceFromCenter', new THREE.BufferAttribute(new Float32Array(count).fill(1000), 1));

        const material = new THREE.ShaderMaterial({
            uniforms: {
                time: this.uniforms.time,
                globalBrightness: this.uniforms.globalBrightness,
                speedMultiplier: this.uniforms.speedMultiplier
            },
            vertexShader: starVertexShader,
            fragmentShader: starFragmentShader,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });

        const stars = new THREE.Points(geometry, material);
        this.scene.add(stars);
    }

    createGalacticCore() {
        // Volumetric core glow using a sphere with custom shader
        const geometry = new THREE.SphereGeometry(40, 64, 64);
        const material = new THREE.ShaderMaterial({
            uniforms: {
                time: this.uniforms.time,
                coreGlow: this.uniforms.coreGlow
            },
            vertexShader: coreVertexShader,
            fragmentShader: coreFragmentShader,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            side: THREE.BackSide
        });

        const core = new THREE.Mesh(geometry, material);
        this.scene.add(core);

        // Additional inner glow layer
        const innerGeometry = new THREE.SphereGeometry(20, 32, 32);
        const innerMaterial = new THREE.ShaderMaterial({
            uniforms: {
                time: this.uniforms.time,
                coreGlow: this.uniforms.coreGlow
            },
            vertexShader: coreVertexShader,
            fragmentShader: coreFragmentShader,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            side: THREE.FrontSide
        });

        const innerCore = new THREE.Mesh(innerGeometry, innerMaterial);
        this.scene.add(innerCore);
    }

    createBlackHole() {
        // Create black hole group
        this.blackHoleGroup = new THREE.Group();

        // Main black hole with enhanced shader (billboard)
        const bhGeometry = new THREE.PlaneGeometry(15, 15);
        const bhMaterial = new THREE.ShaderMaterial({
            uniforms: {
                time: this.uniforms.time
            },
            vertexShader: blackHoleVertexShader,
            fragmentShader: blackHoleFragmentShader,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            side: THREE.DoubleSide
        });

        const blackHolePlane = new THREE.Mesh(bhGeometry, bhMaterial);
        this.blackHolePlane = blackHolePlane;
        this.blackHoleGroup.add(blackHolePlane);

        // Create 3D accretion disk with particles
        this.createAccretionDisk();

        // Add the event horizon sphere (pure black)
        const eventHorizonGeo = new THREE.SphereGeometry(0.8, 32, 32);
        const eventHorizonMat = new THREE.MeshBasicMaterial({
            color: 0x000000,
            transparent: false
        });
        const eventHorizon = new THREE.Mesh(eventHorizonGeo, eventHorizonMat);
        this.blackHoleGroup.add(eventHorizon);

        this.scene.add(this.blackHoleGroup);
    }

    createAccretionDisk() {
        // Particle-based accretion disk
        const particleCount = 8000;
        const geometry = new THREE.BufferGeometry();

        const positions = new Float32Array(particleCount * 3);
        const sizes = new Float32Array(particleCount);
        const orbitRadii = new Float32Array(particleCount);
        const orbitSpeeds = new Float32Array(particleCount);
        const orbitPhases = new Float32Array(particleCount);
        const temps = new Float32Array(particleCount);

        for (let i = 0; i < particleCount; i++) {
            // Distribute particles in disk
            const r = 1.5 + Math.pow(Math.random(), 0.7) * 6;
            const theta = Math.random() * Math.PI * 2;

            positions[i * 3] = Math.cos(theta) * r;
            positions[i * 3 + 1] = (Math.random() - 0.5) * 0.3 * (1 - r / 8);
            positions[i * 3 + 2] = Math.sin(theta) * r;

            sizes[i] = 0.5 + Math.random() * 1.5;
            orbitRadii[i] = r;
            // Keplerian: v ∝ r^(-0.5)
            orbitSpeeds[i] = 0.8 / Math.sqrt(r);
            orbitPhases[i] = theta;
            // Temperature decreases with radius
            temps[i] = 1.0 - (r - 1.5) / 6;
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
        geometry.setAttribute('orbitRadius', new THREE.BufferAttribute(orbitRadii, 1));
        geometry.setAttribute('orbitSpeed', new THREE.BufferAttribute(orbitSpeeds, 1));
        geometry.setAttribute('orbitPhase', new THREE.BufferAttribute(orbitPhases, 1));
        geometry.setAttribute('particleTemp', new THREE.BufferAttribute(temps, 1));

        const material = new THREE.ShaderMaterial({
            uniforms: {
                time: this.uniforms.time
            },
            vertexShader: accretionVertexShader,
            fragmentShader: accretionFragmentShader,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });

        const accretionDisk = new THREE.Points(geometry, material);
        accretionDisk.rotation.x = Math.PI * 0.15; // Slight tilt
        this.blackHoleGroup.add(accretionDisk);
    }

    createDiskStars() {
        // Main disk population with spiral arms
        const count = GALAXY_CONFIG.diskStars;
        const geometry = new THREE.BufferGeometry();

        const positions = new Float32Array(count * 3);
        const colors = new Float32Array(count * 3);
        const sizes = new Float32Array(count);
        const brightness = new Float32Array(count);
        const rotationSpeeds = new Float32Array(count);
        const initialAngles = new Float32Array(count);
        const distances = new Float32Array(count);

        // Spiral arm base angles (4 arms, evenly spaced)
        const armAngles = [0, Math.PI / 2, Math.PI, 3 * Math.PI / 2];

        for (let i = 0; i < count; i++) {
            // Determine if star is in an arm or inter-arm region
            const inArm = Math.random() < 0.65; // 65% in arms

            let x, y, z, r, theta;

            if (inArm) {
                // Place star along a spiral arm
                const armIndex = Math.floor(Math.random() * 4);
                const baseAngle = armAngles[armIndex];

                // Radial position along arm
                r = 8 + Math.random() * (GALAXY_CONFIG.diskRadius - 8);

                // Logarithmic spiral equation
                // θ = (1/b) * ln(r/a)
                const spiralAngle = Math.log(r / 8) / GALAXY_CONFIG.spiralTightness;
                theta = baseAngle + spiralAngle;

                // Add spread around arm center
                const armSpread = GALAXY_CONFIG.armWidth * (0.5 + 0.5 * Math.random());
                const spreadAngle = gaussianRandom(0, armSpread / r);
                theta += spreadAngle;

                // Small radial perturbation
                r += gaussianRandom(0, 3);

            } else {
                // Inter-arm disk stars (more uniform distribution)
                r = 5 + Math.pow(Math.random(), 0.5) * GALAXY_CONFIG.diskRadius;
                theta = Math.random() * Math.PI * 2;
            }

            // Apply exponential disk density falloff (reject sampling)
            const densityThreshold = diskDensity(r, GALAXY_CONFIG.diskRadius / 3);
            if (Math.random() > densityThreshold && r > 30) {
                // Redistribute rejected stars to inner regions
                r = 5 + Math.random() * 50;
            }

            // Height above/below disk plane (thin + thick disk components)
            const isThinDisk = Math.random() < 0.8;
            const scaleHeight = isThinDisk ?
                GALAXY_CONFIG.diskThickness :
                GALAXY_CONFIG.thickDiskThickness;
            y = gaussianRandom(0, scaleHeight * (1 - r / GALAXY_CONFIG.diskRadius * 0.5));

            // Central bar modification
            if (r < GALAXY_CONFIG.barLength / 2) {
                const barAngle = 0.45; // Bar orientation ~25 degrees
                const barFactor = 1 - r / (GALAXY_CONFIG.barLength / 2);

                // Elongate distribution along bar axis
                const cosBar = Math.cos(barAngle);
                const sinBar = Math.sin(barAngle);

                // Project position
                const xTemp = r * Math.cos(theta);
                const zTemp = r * Math.sin(theta);

                // Compress perpendicular to bar
                const alongBar = xTemp * cosBar + zTemp * sinBar;
                const perpBar = -xTemp * sinBar + zTemp * cosBar;

                x = alongBar * cosBar - perpBar * sinBar * (1 - barFactor * 0.6);
                z = alongBar * sinBar + perpBar * cosBar * (1 - barFactor * 0.6);
            } else {
                x = r * Math.cos(theta);
                z = r * Math.sin(theta);
            }

            positions[i * 3] = x;
            positions[i * 3 + 1] = y;
            positions[i * 3 + 2] = z;

            // Spectral type and color
            const spectralType = getSpectralType(Math.random());
            const starColor = SPECTRAL_COLORS[spectralType];

            // Add slight color variation
            const colorVar = 0.9 + Math.random() * 0.2;
            colors[i * 3] = starColor.r * colorVar;
            colors[i * 3 + 1] = starColor.g * colorVar;
            colors[i * 3 + 2] = starColor.b * colorVar;

            // Size based on spectral type (hotter = larger visual)
            const spectralSizes = { O: 4.0, B: 3.5, A: 2.5, F: 2.0, G: 1.8, K: 1.5, M: 1.2 };
            sizes[i] = spectralSizes[spectralType] * (0.7 + Math.random() * 0.6);

            // Brightness based on spectral type
            const spectralBright = { O: 2.0, B: 1.5, A: 1.2, F: 1.0, G: 0.9, K: 0.7, M: 0.5 };
            brightness[i] = spectralBright[spectralType] * (0.6 + Math.random() * 0.4);

            // Boost brightness for arm stars
            if (inArm) brightness[i] *= 1.3;

            // Rotation parameters
            const dist = Math.sqrt(x * x + z * z);
            distances[i] = dist;
            initialAngles[i] = Math.atan2(z, x);
            rotationSpeeds[i] = GALAXY_CONFIG.baseRotationSpeed * (0.8 + Math.random() * 0.4);
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('customColor', new THREE.BufferAttribute(colors, 3));
        geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
        geometry.setAttribute('brightness', new THREE.BufferAttribute(brightness, 1));
        geometry.setAttribute('rotationSpeed', new THREE.BufferAttribute(rotationSpeeds, 1));
        geometry.setAttribute('initialAngle', new THREE.BufferAttribute(initialAngles, 1));
        geometry.setAttribute('distanceFromCenter', new THREE.BufferAttribute(distances, 1));

        const material = new THREE.ShaderMaterial({
            uniforms: {
                time: this.uniforms.time,
                globalBrightness: this.uniforms.globalBrightness,
                speedMultiplier: this.uniforms.speedMultiplier
            },
            vertexShader: starVertexShader,
            fragmentShader: starFragmentShader,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });

        const stars = new THREE.Points(geometry, material);
        this.scene.add(stars);
    }

    createBulgeStars() {
        // Central bulge with de Vaucouleurs profile
        const count = GALAXY_CONFIG.bulgeStars;
        const geometry = new THREE.BufferGeometry();

        const positions = new Float32Array(count * 3);
        const colors = new Float32Array(count * 3);
        const sizes = new Float32Array(count);
        const brightness = new Float32Array(count);
        const rotationSpeeds = new Float32Array(count);
        const initialAngles = new Float32Array(count);
        const distances = new Float32Array(count);

        for (let i = 0; i < count; i++) {
            // Spheroidal distribution with de Vaucouleurs profile
            // Use rejection sampling for proper density
            let r, attempts = 0;
            do {
                r = Math.random() * GALAXY_CONFIG.bulgeRadius * 2;
                attempts++;
            } while (Math.random() > bulgeDensity(r, GALAXY_CONFIG.bulgeRadius) && attempts < 10);

            // Spherical coordinates with flattening
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);

            // Oblate spheroid (flattened along rotation axis)
            const flattening = 0.6;
            const x = r * Math.sin(phi) * Math.cos(theta);
            const y = r * Math.cos(phi) * flattening;
            const z = r * Math.sin(phi) * Math.sin(theta);

            positions[i * 3] = x;
            positions[i * 3 + 1] = y;
            positions[i * 3 + 2] = z;

            // Bulge stars are older/redder population (K and M dominated)
            const rand = Math.random();
            let spectralType;
            if (rand < 0.65) spectralType = 'M';
            else if (rand < 0.90) spectralType = 'K';
            else if (rand < 0.97) spectralType = 'G';
            else spectralType = 'F';

            const starColor = SPECTRAL_COLORS[spectralType];

            // Warmer/yellower tint for bulge
            colors[i * 3] = starColor.r * 1.1;
            colors[i * 3 + 1] = starColor.g * 0.95;
            colors[i * 3 + 2] = starColor.b * 0.85;

            sizes[i] = 1.5 + Math.random() * 1.5;

            // Brightness increases toward center
            const centralBrightness = 1 - r / (GALAXY_CONFIG.bulgeRadius * 2);
            brightness[i] = (0.6 + centralBrightness * 0.8) * (0.7 + Math.random() * 0.3);

            // Faster rotation in bulge
            const dist = Math.sqrt(x * x + z * z);
            distances[i] = dist;
            initialAngles[i] = Math.atan2(z, x);
            rotationSpeeds[i] = GALAXY_CONFIG.baseRotationSpeed * 1.5 * (0.8 + Math.random() * 0.4);
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('customColor', new THREE.BufferAttribute(colors, 3));
        geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
        geometry.setAttribute('brightness', new THREE.BufferAttribute(brightness, 1));
        geometry.setAttribute('rotationSpeed', new THREE.BufferAttribute(rotationSpeeds, 1));
        geometry.setAttribute('initialAngle', new THREE.BufferAttribute(initialAngles, 1));
        geometry.setAttribute('distanceFromCenter', new THREE.BufferAttribute(distances, 1));

        const material = new THREE.ShaderMaterial({
            uniforms: {
                time: this.uniforms.time,
                globalBrightness: this.uniforms.globalBrightness,
                speedMultiplier: this.uniforms.speedMultiplier
            },
            vertexShader: starVertexShader,
            fragmentShader: starFragmentShader,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });

        const stars = new THREE.Points(geometry, material);
        this.scene.add(stars);
    }

    createHaloAndGlobularClusters() {
        // Halo stars and globular clusters
        const count = GALAXY_CONFIG.haloStars;
        const geometry = new THREE.BufferGeometry();

        const positions = new Float32Array(count * 3);
        const colors = new Float32Array(count * 3);
        const sizes = new Float32Array(count);
        const brightness = new Float32Array(count);
        const rotationSpeeds = new Float32Array(count);
        const initialAngles = new Float32Array(count);
        const distances = new Float32Array(count);

        // Create ~50 globular clusters
        const numClusters = 50;
        const clusterPositions = [];

        for (let c = 0; c < numClusters; c++) {
            const r = 30 + Math.random() * 150;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);

            clusterPositions.push({
                x: r * Math.sin(phi) * Math.cos(theta),
                y: r * Math.cos(phi),
                z: r * Math.sin(phi) * Math.sin(theta),
                size: 2 + Math.random() * 4
            });
        }

        for (let i = 0; i < count; i++) {
            let x, y, z;

            // 60% in globular clusters, 40% diffuse halo
            if (Math.random() < 0.6 && clusterPositions.length > 0) {
                const cluster = clusterPositions[Math.floor(Math.random() * clusterPositions.length)];
                const spread = cluster.size;

                x = cluster.x + gaussianRandom(0, spread);
                y = cluster.y + gaussianRandom(0, spread);
                z = cluster.z + gaussianRandom(0, spread);
            } else {
                // Diffuse halo (power-law distribution)
                const r = 20 + Math.pow(Math.random(), 0.3) * 200;
                const theta = Math.random() * Math.PI * 2;
                const phi = Math.acos(2 * Math.random() - 1);

                x = r * Math.sin(phi) * Math.cos(theta);
                y = r * Math.cos(phi);
                z = r * Math.sin(phi) * Math.sin(theta);
            }

            positions[i * 3] = x;
            positions[i * 3 + 1] = y;
            positions[i * 3 + 2] = z;

            // Halo/GC stars are old, metal-poor (bluer horizontal branch + red giants)
            const rand = Math.random();
            let spectralType;
            if (rand < 0.1) spectralType = 'A'; // Horizontal branch
            else if (rand < 0.2) spectralType = 'F';
            else if (rand < 0.5) spectralType = 'K';
            else spectralType = 'M';

            const starColor = SPECTRAL_COLORS[spectralType];
            colors[i * 3] = starColor.r;
            colors[i * 3 + 1] = starColor.g;
            colors[i * 3 + 2] = starColor.b;

            sizes[i] = 1.0 + Math.random() * 1.5;
            brightness[i] = 0.4 + Math.random() * 0.4;

            // Very slow or no rotation (random orbits)
            const dist = Math.sqrt(x * x + z * z);
            distances[i] = dist;
            initialAngles[i] = Math.atan2(z, x);
            rotationSpeeds[i] = GALAXY_CONFIG.baseRotationSpeed * 0.3 * Math.random();
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('customColor', new THREE.BufferAttribute(colors, 3));
        geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
        geometry.setAttribute('brightness', new THREE.BufferAttribute(brightness, 1));
        geometry.setAttribute('rotationSpeed', new THREE.BufferAttribute(rotationSpeeds, 1));
        geometry.setAttribute('initialAngle', new THREE.BufferAttribute(initialAngles, 1));
        geometry.setAttribute('distanceFromCenter', new THREE.BufferAttribute(distances, 1));

        const material = new THREE.ShaderMaterial({
            uniforms: {
                time: this.uniforms.time,
                globalBrightness: this.uniforms.globalBrightness,
                speedMultiplier: this.uniforms.speedMultiplier
            },
            vertexShader: starVertexShader,
            fragmentShader: starFragmentShader,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });

        const stars = new THREE.Points(geometry, material);
        this.scene.add(stars);
    }

    createDustLanes() {
        // Dark dust lanes along spiral arms
        const count = GALAXY_CONFIG.dustParticles;
        const geometry = new THREE.BufferGeometry();

        const positions = new Float32Array(count * 3);
        const sizes = new Float32Array(count);
        const opacity = new Float32Array(count);
        const rotationSpeeds = new Float32Array(count);
        const initialAngles = new Float32Array(count);
        const distances = new Float32Array(count);

        const armAngles = [0, Math.PI / 2, Math.PI, 3 * Math.PI / 2];

        for (let i = 0; i < count; i++) {
            const armIndex = Math.floor(Math.random() * 4);
            const baseAngle = armAngles[armIndex];

            // Follow inner edge of spiral arms
            const r = 10 + Math.random() * (GALAXY_CONFIG.diskRadius * 0.7);
            const spiralAngle = Math.log(r / 8) / GALAXY_CONFIG.spiralTightness;

            // Offset slightly inward from arm center (dust lanes on inner edge)
            let theta = baseAngle + spiralAngle - 0.08;

            // Narrow distribution along lane
            theta += gaussianRandom(0, 0.03);

            const x = r * Math.cos(theta);
            const z = r * Math.sin(theta);
            const y = gaussianRandom(0, 0.5); // Very flat

            positions[i * 3] = x;
            positions[i * 3 + 1] = y;
            positions[i * 3 + 2] = z;

            // Larger particles for dust clouds
            sizes[i] = 8 + Math.random() * 15;

            // Variable opacity
            opacity[i] = 0.15 + Math.random() * 0.25;

            const dist = Math.sqrt(x * x + z * z);
            distances[i] = dist;
            initialAngles[i] = Math.atan2(z, x);
            rotationSpeeds[i] = GALAXY_CONFIG.baseRotationSpeed * (0.8 + Math.random() * 0.4);
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
        geometry.setAttribute('opacity', new THREE.BufferAttribute(opacity, 1));
        geometry.setAttribute('rotationSpeed', new THREE.BufferAttribute(rotationSpeeds, 1));
        geometry.setAttribute('initialAngle', new THREE.BufferAttribute(initialAngles, 1));
        geometry.setAttribute('distanceFromCenter', new THREE.BufferAttribute(distances, 1));

        const material = new THREE.ShaderMaterial({
            uniforms: {
                time: this.uniforms.time,
                speedMultiplier: this.uniforms.speedMultiplier
            },
            vertexShader: dustVertexShader,
            fragmentShader: dustFragmentShader,
            transparent: true,
            blending: THREE.NormalBlending,
            depthWrite: false
        });

        const dust = new THREE.Points(geometry, material);
        dust.renderOrder = 1; // Render after stars
        this.scene.add(dust);
    }

    // ============================================================
    // ANDROMEDA GALAXY
    // ============================================================

    createAndromedaGalaxy() {
        const config = this.andromedaConfig;

        // Create Andromeda group
        this.andromedaGroup = new THREE.Group();
        this.andromedaGroup.position.set(
            config.initialPosition.x,
            config.initialPosition.y,
            config.initialPosition.z
        );

        // Apply inclination (Andromeda is tilted ~77 degrees)
        this.andromedaGroup.rotation.x = config.inclination;
        this.andromedaGroup.rotation.z = 0.3; // Slight additional tilt

        // Store original position for merger
        this.mergerState.andromedaOriginalPos.copy(this.andromedaGroup.position);

        // Create Andromeda's core
        this.createAndromedaCore(config);

        // Create Andromeda's disk stars
        this.createAndromedaDiskStars(config);

        // Create Andromeda's bulge
        this.createAndromedaBulge(config);

        // Create Andromeda's halo
        this.createAndromedaHalo(config);

        this.scene.add(this.andromedaGroup);
    }

    createAndromedaCore(config) {
        // Andromeda's core glow
        const geometry = new THREE.SphereGeometry(45, 64, 64);
        const material = new THREE.ShaderMaterial({
            uniforms: {
                time: this.uniforms.time,
                coreGlow: { value: 0.9 }
            },
            vertexShader: coreVertexShader,
            fragmentShader: coreFragmentShader,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            side: THREE.BackSide
        });

        const core = new THREE.Mesh(geometry, material);
        this.andromedaGroup.add(core);

        // Inner core
        const innerGeometry = new THREE.SphereGeometry(25, 32, 32);
        const innerMaterial = new THREE.ShaderMaterial({
            uniforms: {
                time: this.uniforms.time,
                coreGlow: { value: 0.8 }
            },
            vertexShader: coreVertexShader,
            fragmentShader: coreFragmentShader,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            side: THREE.FrontSide
        });

        const innerCore = new THREE.Mesh(innerGeometry, innerMaterial);
        this.andromedaGroup.add(innerCore);
    }

    createAndromedaDiskStars(config) {
        const count = config.diskStars;
        const geometry = new THREE.BufferGeometry();

        const positions = new Float32Array(count * 3);
        const colors = new Float32Array(count * 3);
        const sizes = new Float32Array(count);
        const brightness = new Float32Array(count);
        const rotationSpeeds = new Float32Array(count);
        const initialAngles = new Float32Array(count);
        const distances = new Float32Array(count);

        // Andromeda has 2 main spiral arms
        const armAngles = [0, Math.PI];

        for (let i = 0; i < count; i++) {
            const inArm = Math.random() < 0.6;

            let x, y, z, r, theta;

            if (inArm) {
                const armIndex = Math.floor(Math.random() * 2);
                const baseAngle = armAngles[armIndex];

                r = 10 + Math.random() * (config.diskRadius - 10);
                const spiralAngle = Math.log(r / 10) / config.spiralTightness;
                theta = baseAngle + spiralAngle;

                const armSpread = config.armWidth * (0.5 + 0.5 * Math.random());
                const spreadAngle = gaussianRandom(0, armSpread / r);
                theta += spreadAngle;
                r += gaussianRandom(0, 4);
            } else {
                r = 6 + Math.pow(Math.random(), 0.5) * config.diskRadius;
                theta = Math.random() * Math.PI * 2;
            }

            const densityThreshold = diskDensity(r, config.diskRadius / 3);
            if (Math.random() > densityThreshold && r > 40) {
                r = 6 + Math.random() * 60;
            }

            y = gaussianRandom(0, config.diskThickness * (1 - r / config.diskRadius * 0.5));

            x = r * Math.cos(theta);
            z = r * Math.sin(theta);

            positions[i * 3] = x;
            positions[i * 3 + 1] = y;
            positions[i * 3 + 2] = z;

            // Color with Andromeda's warmer tint
            const spectralType = getSpectralType(Math.random());
            const starColor = SPECTRAL_COLORS[spectralType];

            const colorVar = 0.9 + Math.random() * 0.2;
            colors[i * 3] = starColor.r * colorVar * config.colorTint.r;
            colors[i * 3 + 1] = starColor.g * colorVar * config.colorTint.g;
            colors[i * 3 + 2] = starColor.b * colorVar * config.colorTint.b;

            const spectralSizes = { O: 3.5, B: 3.0, A: 2.2, F: 1.8, G: 1.6, K: 1.4, M: 1.1 };
            sizes[i] = spectralSizes[spectralType] * (0.7 + Math.random() * 0.6);

            const spectralBright = { O: 1.8, B: 1.4, A: 1.1, F: 0.9, G: 0.8, K: 0.6, M: 0.45 };
            brightness[i] = spectralBright[spectralType] * (0.5 + Math.random() * 0.4);

            if (inArm) brightness[i] *= 1.2;

            const dist = Math.sqrt(x * x + z * z);
            distances[i] = dist;
            initialAngles[i] = Math.atan2(z, x);
            rotationSpeeds[i] = config.rotationSpeed * (0.8 + Math.random() * 0.4);
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('customColor', new THREE.BufferAttribute(colors, 3));
        geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
        geometry.setAttribute('brightness', new THREE.BufferAttribute(brightness, 1));
        geometry.setAttribute('rotationSpeed', new THREE.BufferAttribute(rotationSpeeds, 1));
        geometry.setAttribute('initialAngle', new THREE.BufferAttribute(initialAngles, 1));
        geometry.setAttribute('distanceFromCenter', new THREE.BufferAttribute(distances, 1));

        const material = new THREE.ShaderMaterial({
            uniforms: {
                time: this.uniforms.time,
                globalBrightness: this.uniforms.globalBrightness,
                speedMultiplier: this.uniforms.speedMultiplier
            },
            vertexShader: starVertexShader,
            fragmentShader: starFragmentShader,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });

        const stars = new THREE.Points(geometry, material);
        this.andromedaGroup.add(stars);
    }

    createAndromedaBulge(config) {
        const count = config.bulgeStars;
        const geometry = new THREE.BufferGeometry();

        const positions = new Float32Array(count * 3);
        const colors = new Float32Array(count * 3);
        const sizes = new Float32Array(count);
        const brightness = new Float32Array(count);
        const rotationSpeeds = new Float32Array(count);
        const initialAngles = new Float32Array(count);
        const distances = new Float32Array(count);

        for (let i = 0; i < count; i++) {
            let r, attempts = 0;
            do {
                r = Math.random() * config.bulgeRadius * 2;
                attempts++;
            } while (Math.random() > bulgeDensity(r, config.bulgeRadius) && attempts < 10);

            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);

            const flattening = 0.55;
            const x = r * Math.sin(phi) * Math.cos(theta);
            const y = r * Math.cos(phi) * flattening;
            const z = r * Math.sin(phi) * Math.sin(theta);

            positions[i * 3] = x;
            positions[i * 3 + 1] = y;
            positions[i * 3 + 2] = z;

            // Older, yellower stars in bulge
            const rand = Math.random();
            let spectralType;
            if (rand < 0.6) spectralType = 'M';
            else if (rand < 0.88) spectralType = 'K';
            else if (rand < 0.96) spectralType = 'G';
            else spectralType = 'F';

            const starColor = SPECTRAL_COLORS[spectralType];

            colors[i * 3] = starColor.r * 1.1 * config.colorTint.r;
            colors[i * 3 + 1] = starColor.g * 0.95 * config.colorTint.g;
            colors[i * 3 + 2] = starColor.b * 0.85 * config.colorTint.b;

            sizes[i] = 1.3 + Math.random() * 1.3;

            const centralBrightness = 1 - r / (config.bulgeRadius * 2);
            brightness[i] = (0.5 + centralBrightness * 0.7) * (0.7 + Math.random() * 0.3);

            const dist = Math.sqrt(x * x + z * z);
            distances[i] = dist;
            initialAngles[i] = Math.atan2(z, x);
            rotationSpeeds[i] = config.rotationSpeed * 1.5 * (0.8 + Math.random() * 0.4);
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('customColor', new THREE.BufferAttribute(colors, 3));
        geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
        geometry.setAttribute('brightness', new THREE.BufferAttribute(brightness, 1));
        geometry.setAttribute('rotationSpeed', new THREE.BufferAttribute(rotationSpeeds, 1));
        geometry.setAttribute('initialAngle', new THREE.BufferAttribute(initialAngles, 1));
        geometry.setAttribute('distanceFromCenter', new THREE.BufferAttribute(distances, 1));

        const material = new THREE.ShaderMaterial({
            uniforms: {
                time: this.uniforms.time,
                globalBrightness: this.uniforms.globalBrightness,
                speedMultiplier: this.uniforms.speedMultiplier
            },
            vertexShader: starVertexShader,
            fragmentShader: starFragmentShader,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });

        const stars = new THREE.Points(geometry, material);
        this.andromedaGroup.add(stars);
    }

    createAndromedaHalo(config) {
        const count = config.haloStars;
        const geometry = new THREE.BufferGeometry();

        const positions = new Float32Array(count * 3);
        const colors = new Float32Array(count * 3);
        const sizes = new Float32Array(count);
        const brightness = new Float32Array(count);
        const rotationSpeeds = new Float32Array(count);
        const initialAngles = new Float32Array(count);
        const distances = new Float32Array(count);

        for (let i = 0; i < count; i++) {
            const r = 25 + Math.pow(Math.random(), 0.3) * 180;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);

            const x = r * Math.sin(phi) * Math.cos(theta);
            const y = r * Math.cos(phi);
            const z = r * Math.sin(phi) * Math.sin(theta);

            positions[i * 3] = x;
            positions[i * 3 + 1] = y;
            positions[i * 3 + 2] = z;

            const rand = Math.random();
            let spectralType;
            if (rand < 0.1) spectralType = 'A';
            else if (rand < 0.2) spectralType = 'F';
            else if (rand < 0.5) spectralType = 'K';
            else spectralType = 'M';

            const starColor = SPECTRAL_COLORS[spectralType];
            colors[i * 3] = starColor.r * config.colorTint.r;
            colors[i * 3 + 1] = starColor.g * config.colorTint.g;
            colors[i * 3 + 2] = starColor.b * config.colorTint.b;

            sizes[i] = 0.9 + Math.random() * 1.2;
            brightness[i] = 0.35 + Math.random() * 0.35;

            const dist = Math.sqrt(x * x + z * z);
            distances[i] = dist;
            initialAngles[i] = Math.atan2(z, x);
            rotationSpeeds[i] = config.rotationSpeed * 0.3 * Math.random();
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('customColor', new THREE.BufferAttribute(colors, 3));
        geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
        geometry.setAttribute('brightness', new THREE.BufferAttribute(brightness, 1));
        geometry.setAttribute('rotationSpeed', new THREE.BufferAttribute(rotationSpeeds, 1));
        geometry.setAttribute('initialAngle', new THREE.BufferAttribute(initialAngles, 1));
        geometry.setAttribute('distanceFromCenter', new THREE.BufferAttribute(distances, 1));

        const material = new THREE.ShaderMaterial({
            uniforms: {
                time: this.uniforms.time,
                globalBrightness: this.uniforms.globalBrightness,
                speedMultiplier: this.uniforms.speedMultiplier
            },
            vertexShader: starVertexShader,
            fragmentShader: starFragmentShader,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });

        const stars = new THREE.Points(geometry, material);
        this.andromedaGroup.add(stars);
    }

    // ============================================================
    // GALAXY MERGER SIMULATION
    // ============================================================

    startMergerSimulation() {
        if (this.mergerState.active || this.cinematicState.active || this.tourState.active) return;

        this.mergerState.active = true;
        this.mergerState.progress = 0;
        this.mergerState.phase = 0;

        // Save camera state
        this.mergerState.savedCameraPos.copy(this.camera.position);
        this.mergerState.savedTarget.copy(this.controls.target);

        // Initialize physics simulation
        const phys = this.mergerState.physics;
        const andromedaStart = this.mergerState.andromedaOriginalPos;

        // Milky Way starts at origin
        phys.milkyWay.pos.set(0, 0, 0);
        phys.milkyWay.vel.set(0, 0, 0);
        phys.milkyWay.tidal = 0;

        // Andromeda starts at its original position with initial velocity toward Milky Way
        phys.andromeda.pos.copy(andromedaStart);
        // Initial velocity - heading toward Milky Way with slight tangential component for realistic orbit
        const dirToMW = new THREE.Vector3().subVectors(phys.milkyWay.pos, phys.andromeda.pos).normalize();
        const tangent = new THREE.Vector3(-dirToMW.z, 0, dirToMW.x).normalize();
        phys.andromeda.vel.copy(dirToMW).multiplyScalar(35).add(tangent.multiplyScalar(12));
        phys.andromeda.tidal = 0;

        // Disable controls
        this.controls.enabled = false;

        // Hide controls panel, show return button
        document.getElementById('controls').classList.add('hidden');
        document.getElementById('btn-return').style.display = 'block';

        // Show journey overlay
        const overlay = document.getElementById('journey-overlay');
        overlay.classList.add('active');
        this.updateMergerUI(this.mergerState.mergerPhases[0]);

        // Move camera to view both galaxies
        this.animateCameraForMerger();
    }

    animateCameraForMerger() {
        const midpoint = new THREE.Vector3(
            this.andromedaConfig.initialPosition.x / 2,
            100,
            this.andromedaConfig.initialPosition.z / 2
        );

        const cameraPos = new THREE.Vector3(
            midpoint.x,
            midpoint.y + 400,
            midpoint.z + 500
        );

        const startPos = this.camera.position.clone();
        const startTarget = this.controls.target.clone();
        const duration = 3000;
        const startTime = performance.now();

        const animate = () => {
            const elapsed = performance.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const t = this.easeInOutCubic(progress);

            this.camera.position.lerpVectors(startPos, cameraPos, t);
            this.controls.target.lerpVectors(startTarget, midpoint, t);
            this.camera.lookAt(this.controls.target);

            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };

        animate();
    }

    updateMergerSimulation(deltaTime) {
        if (!this.mergerState.active) return;

        const state = this.mergerState;
        const phases = state.mergerPhases;

        // Progress through phases
        state.progress += deltaTime;

        // Find current phase
        let phaseStart = 0;
        for (let i = 0; i < state.phase; i++) {
            phaseStart += phases[i].duration;
        }
        const phaseDuration = phases[state.phase].duration;
        const phaseProgress = (state.progress - phaseStart) / phaseDuration;

        // Check phase transition
        if (phaseProgress >= 1 && state.phase < phases.length - 1) {
            state.phase++;
            this.updateMergerUI(phases[state.phase]);
        }

        // Calculate total progress
        const totalDuration = phases.reduce((sum, p) => sum + p.duration, 0);
        const overallProgress = Math.min(state.progress / totalDuration, 1);

        // Animate galaxies based on phase
        this.animateGalaxyMerger(overallProgress, state.phase, phaseProgress);

        // Update camera to follow the action
        this.updateMergerCamera(overallProgress, state.phase);

        // Check completion
        if (overallProgress >= 1) {
            // Loop or hold at end
            state.progress = totalDuration * 0.95; // Hold at nearly complete
        }
    }

    animateGalaxyMerger(overallProgress, phase, phaseProgress) {
        const phys = this.mergerState.physics;
        const dt = 0.016 * phys.timeScale; // Time step (scaled)

        // Calculate gravitational forces between galaxies
        const separation = new THREE.Vector3().subVectors(phys.milkyWay.pos, phys.andromeda.pos);
        const distance = Math.max(separation.length(), 15); // Minimum distance to prevent singularity
        const forceMagnitude = phys.G * phys.milkyWay.mass * phys.andromeda.mass / (distance * distance);

        // Normalized direction
        const forceDir = separation.clone().normalize();

        // Apply forces (F = ma, so a = F/m)
        // Andromeda accelerates toward Milky Way
        const accelAndromeda = forceDir.clone().multiplyScalar(forceMagnitude / phys.andromeda.mass);
        // Milky Way accelerates toward Andromeda (opposite direction)
        const accelMilkyWay = forceDir.clone().multiplyScalar(-forceMagnitude / phys.milkyWay.mass);

        // Add dynamical friction during close passes (simulates dark matter halo interaction)
        if (distance < 150) {
            const friction = 0.003 * (150 - distance) / 150;
            phys.andromeda.vel.multiplyScalar(1 - friction * dt);
            phys.milkyWay.vel.multiplyScalar(1 - friction * dt);
        }

        // Update velocities (Verlet integration step 1)
        phys.andromeda.vel.add(accelAndromeda.multiplyScalar(dt));
        phys.milkyWay.vel.add(accelMilkyWay.multiplyScalar(dt));

        // Update positions
        phys.andromeda.pos.add(phys.andromeda.vel.clone().multiplyScalar(dt));
        phys.milkyWay.pos.add(phys.milkyWay.vel.clone().multiplyScalar(dt));

        // Calculate center of mass for camera tracking
        const totalMass = phys.milkyWay.mass + phys.andromeda.mass;
        phys.centerOfMass.set(0, 0, 0)
            .add(phys.milkyWay.pos.clone().multiplyScalar(phys.milkyWay.mass))
            .add(phys.andromeda.pos.clone().multiplyScalar(phys.andromeda.mass))
            .divideScalar(totalMass);

        // Calculate tidal distortion factor (stronger when closer)
        const tidalStrength = Math.min(1, 50 / distance);
        phys.milkyWay.tidal = tidalStrength;
        phys.andromeda.tidal = tidalStrength;

        // Apply positions to galaxy groups
        // Milky Way group (the main galaxy particles) - we offset camera instead
        // But we do apply rotational distortion
        const mwTidal = phys.milkyWay.tidal;
        if (this.galaxyGroup) {
            // Subtle tidal stretching toward Andromeda
            const stretchDir = new THREE.Vector3().subVectors(phys.andromeda.pos, phys.milkyWay.pos).normalize();
            const stretchAngle = Math.atan2(stretchDir.x, stretchDir.z);
            this.galaxyGroup.rotation.y = stretchAngle * mwTidal * 0.1;
            // Slight vertical distortion
            this.galaxyGroup.scale.y = 1 - mwTidal * 0.15;
        }

        // Apply Andromeda position and distortion
        this.andromedaGroup.position.copy(phys.andromeda.pos);

        // Tidal rotation - Andromeda gets pulled and rotates
        const pullDir = new THREE.Vector3().subVectors(phys.milkyWay.pos, phys.andromeda.pos).normalize();
        const pullAngle = Math.atan2(pullDir.x, pullDir.z);

        // Progressive rotation based on interaction strength
        const aTidal = phys.andromeda.tidal;
        this.andromedaGroup.rotation.y = pullAngle * 0.3 + overallProgress * Math.PI * 0.5;
        this.andromedaGroup.rotation.z = 0.3 + aTidal * 0.4 * Math.sin(overallProgress * Math.PI * 2);
        this.andromedaGroup.rotation.x = this.andromedaConfig.inclination * (1 - aTidal * 0.3);

        // Scale distortion during close approach (tidal stretching)
        const stretchFactor = 1 + aTidal * 0.2;
        this.andromedaGroup.scale.set(stretchFactor, 1 - aTidal * 0.1, stretchFactor);

        // Final merger phase - galaxies coalesce
        if (phase === 5) {
            const t = phaseProgress;
            // Gradually bring both to center of mass
            const blendToCenter = t * t; // Quadratic ease-in

            phys.andromeda.pos.lerp(phys.centerOfMass, blendToCenter * 0.1);
            phys.milkyWay.pos.lerp(phys.centerOfMass, blendToCenter * 0.1);

            // Form elliptical shape
            const ellipticalScale = 1 + t * 0.15;
            this.andromedaGroup.scale.setScalar(ellipticalScale);

            // Reduce velocities (virialize)
            phys.andromeda.vel.multiplyScalar(0.98);
            phys.milkyWay.vel.multiplyScalar(0.98);
        }
    }

    updateMergerCamera(overallProgress, phase) {
        const phys = this.mergerState.physics;
        const centerOfMass = phys.centerOfMass;
        const distance = phys.andromeda.pos.distanceTo(phys.milkyWay.pos);

        // Dynamic camera that follows the action
        let targetCamPos, targetLookAt;

        if (phase <= 1) {
            // Wide view to see both galaxies approaching
            const camDistance = Math.max(500, distance * 0.8);
            targetCamPos = new THREE.Vector3(
                centerOfMass.x + camDistance * 0.3,
                centerOfMass.y + camDistance * 0.6,
                centerOfMass.z + camDistance * 0.8
            );
            targetLookAt = centerOfMass.clone();
        } else if (phase === 2) {
            // Closer dramatic view during first pass
            const camDistance = Math.max(300, distance * 0.6);
            const angle = overallProgress * Math.PI * 0.3;
            targetCamPos = new THREE.Vector3(
                centerOfMass.x + Math.cos(angle) * camDistance * 0.5,
                centerOfMass.y + camDistance * 0.5,
                centerOfMass.z + Math.sin(angle) * camDistance * 0.5 + camDistance * 0.4
            );
            targetLookAt = centerOfMass.clone();
        } else if (phase === 3) {
            // Side view during separation - follow the action
            const camDistance = Math.max(350, distance * 0.7);
            targetCamPos = new THREE.Vector3(
                centerOfMass.x + camDistance * 0.7,
                centerOfMass.y + camDistance * 0.35,
                centerOfMass.z + camDistance * 0.3
            );
            targetLookAt = centerOfMass.clone().add(new THREE.Vector3(0, 20, 0));
        } else if (phase === 4) {
            // Orbiting view during second collision
            const angle = overallProgress * Math.PI * 1.5;
            const camRadius = Math.max(250, distance * 0.8);
            targetCamPos = new THREE.Vector3(
                centerOfMass.x + Math.cos(angle) * camRadius,
                centerOfMass.y + 180 + Math.sin(angle * 2) * 50,
                centerOfMass.z + Math.sin(angle) * camRadius
            );
            targetLookAt = centerOfMass.clone();
        } else {
            // Final merged view - slowly orbit the new elliptical galaxy
            const angle = overallProgress * Math.PI * 0.5 + Math.PI * 0.25;
            targetCamPos = new THREE.Vector3(
                centerOfMass.x + Math.cos(angle) * 220,
                centerOfMass.y + 250,
                centerOfMass.z + Math.sin(angle) * 220
            );
            targetLookAt = centerOfMass.clone();
        }

        // Smooth camera movement - faster tracking during action
        const lerpSpeed = phase >= 2 && phase <= 4 ? 0.035 : 0.025;
        this.camera.position.lerp(targetCamPos, lerpSpeed);
        this.controls.target.lerp(targetLookAt, lerpSpeed);
        this.camera.lookAt(this.controls.target);
    }

    updateMergerUI(phase) {
        const title = document.getElementById('journey-title');
        const sub = document.getElementById('journey-sub');
        const dist = document.getElementById('journey-dist');

        title.classList.remove('visible');
        sub.classList.remove('visible');

        setTimeout(() => {
            title.textContent = phase.title;
            sub.textContent = phase.subtitle;
            dist.textContent = phase.description;

            title.classList.add('visible');
            sub.classList.add('visible');
            dist.classList.add('visible');
        }, 500);
    }

    stopMergerSimulation() {
        if (!this.mergerState.active) return;

        this.mergerState.active = false;

        // Reset Andromeda position and transforms
        this.andromedaGroup.position.copy(this.mergerState.andromedaOriginalPos);
        this.andromedaGroup.rotation.set(this.andromedaConfig.inclination, 0, 0.3);
        this.andromedaGroup.scale.setScalar(1);

        // Reset Milky Way transforms (tidal distortions)
        if (this.galaxyGroup) {
            this.galaxyGroup.rotation.y = 0;
            this.galaxyGroup.scale.set(1, 1, 1);
        }

        // Hide overlay
        document.getElementById('journey-overlay').classList.remove('active');
        document.getElementById('journey-title').classList.remove('visible');
        document.getElementById('journey-sub').classList.remove('visible');
        document.getElementById('journey-dist').classList.remove('visible');

        // Animate camera back
        const startPos = this.camera.position.clone();
        const targetPos = this.mergerState.savedCameraPos;
        const startTarget = this.controls.target.clone();
        const endTarget = this.mergerState.savedTarget;

        const duration = 2000;
        const startTime = performance.now();

        const animateBack = () => {
            const elapsed = performance.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const t = this.easeInOutCubic(progress);

            this.camera.position.lerpVectors(startPos, targetPos, t);
            this.controls.target.lerpVectors(startTarget, endTarget, t);

            if (progress < 1) {
                requestAnimationFrame(animateBack);
            } else {
                this.controls.enabled = true;
                document.getElementById('btn-return').style.display = 'none';
                document.getElementById('controls').classList.remove('hidden');
            }
        };

        animateBack();
    }

    // ============================================================
    // SUPERNOVA SIMULATION
    // ============================================================

    createSupernova() {
        console.log('createSupernova called');
        try {
        const config = this.supernovaState.config;
        console.log('supernova config:', config);

        // Create supernova group (hidden initially)
        this.supernovaGroup = new THREE.Group();
        this.supernovaGroup.position.set(config.position.x, config.position.y, config.position.z);
        this.supernovaGroup.visible = false;

        // Pre-supernova star (red supergiant)
        const starGeometry = new THREE.SphereGeometry(config.starRadius, 64, 64);
        const starMaterial = new THREE.ShaderMaterial({
            uniforms: {
                time: this.uniforms.time,
                pulsePhase: { value: 0 },
                collapseProgress: { value: 0 },
                temperature: { value: 0 }
            },
            vertexShader: supernovaStarVertexShader,
            fragmentShader: supernovaStarFragmentShader,
            transparent: false
        });
        this.supernovaStar = new THREE.Mesh(starGeometry, starMaterial);
        this.supernovaGroup.add(this.supernovaStar);

        // Corona/atmosphere around star
        const coronaGeometry = new THREE.SphereGeometry(config.starRadius * 1.5, 32, 32);
        const coronaMaterial = new THREE.ShaderMaterial({
            uniforms: {
                time: this.uniforms.time,
                intensity: { value: 0.5 },
                scale: { value: 1.3 },
                coronaColor: { value: new THREE.Vector3(config.coronaColor.r, config.coronaColor.g, config.coronaColor.b) }
            },
            vertexShader: supernovaCoronaVertexShader,
            fragmentShader: supernovaCoronaFragmentShader,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            side: THREE.BackSide
        });
        this.supernovaCorona = new THREE.Mesh(coronaGeometry, coronaMaterial);
        this.supernovaGroup.add(this.supernovaCorona);

        // Shockwave sphere (for explosion)
        const shockwaveGeometry = new THREE.SphereGeometry(1, 64, 64);
        const shockwaveMaterial = new THREE.ShaderMaterial({
            uniforms: {
                time: this.uniforms.time,
                explosionProgress: { value: 0 },
                shockwaveRadius: { value: 1 },
                intensity: { value: 0 }
            },
            vertexShader: shockwaveVertexShader,
            fragmentShader: shockwaveFragmentShader,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            side: THREE.DoubleSide
        });
        this.supernovaShockwave = new THREE.Mesh(shockwaveGeometry, shockwaveMaterial);
        this.supernovaShockwave.visible = false;
        this.supernovaGroup.add(this.supernovaShockwave);

        // Debris particles
        this.createSupernovaDebris();

        // Nebula remnant
        const nebulaGeometry = new THREE.SphereGeometry(1, 64, 64);
        const nebulaMaterial = new THREE.ShaderMaterial({
            uniforms: {
                time: this.uniforms.time,
                expansionProgress: { value: 1 },
                nebulaAge: { value: 0 }
            },
            vertexShader: nebulaVertexShader,
            fragmentShader: nebulaFragmentShader,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            side: THREE.DoubleSide
        });
        this.supernovaNebula = new THREE.Mesh(nebulaGeometry, nebulaMaterial);
        this.supernovaNebula.visible = false;
        this.supernovaNebula.scale.setScalar(config.nebulaRadius);
        this.supernovaGroup.add(this.supernovaNebula);

        // Pulsar (post-supernova neutron star)
        const pulsarGeometry = new THREE.PlaneGeometry(30, 30);
        const pulsarMaterial = new THREE.ShaderMaterial({
            uniforms: {
                time: this.uniforms.time,
                pulsePhase: { value: 0 },
                beamIntensity: { value: 0 }
            },
            vertexShader: pulsarVertexShader,
            fragmentShader: pulsarFragmentShader,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            side: THREE.DoubleSide
        });
        this.supernovaPulsar = new THREE.Mesh(pulsarGeometry, pulsarMaterial);
        this.supernovaPulsar.visible = false;
        this.supernovaGroup.add(this.supernovaPulsar);

        // Flash overlay (fullscreen quad for blinding flash effect)
        const flashGeometry = new THREE.PlaneGeometry(2, 2);
        const flashMaterial = new THREE.ShaderMaterial({
            uniforms: {
                flashIntensity: { value: 0 },
                time: this.uniforms.time
            },
            vertexShader: flashVertexShader,
            fragmentShader: flashFragmentShader,
            transparent: true,
            depthTest: false,
            depthWrite: false
        });
        this.supernovaFlash = new THREE.Mesh(flashGeometry, flashMaterial);
        this.supernovaFlash.frustumCulled = false;
        this.supernovaFlash.renderOrder = 9999;
        // Don't add to group - add to scene directly when needed

        this.scene.add(this.supernovaGroup);
        console.log('createSupernova completed successfully');
        } catch (e) {
            console.error('Error in createSupernova:', e);
        }
    }

    createSupernovaDebris() {
        const config = this.supernovaState.config;
        const count = config.debrisCount;

        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(count * 3);
        const sizes = new Float32Array(count);
        const velocities = new Float32Array(count * 3);
        const temps = new Float32Array(count);
        const birthTimes = new Float32Array(count);

        for (let i = 0; i < count; i++) {
            // Start at center (will be animated outward)
            positions[i * 3] = 0;
            positions[i * 3 + 1] = 0;
            positions[i * 3 + 2] = 0;

            // Random outward velocity (spherical)
            const phi = Math.random() * Math.PI * 2;
            const cosTheta = Math.random() * 2 - 1;
            const sinTheta = Math.sqrt(1 - cosTheta * cosTheta);
            const speed = 0.5 + Math.random() * 1.5;

            velocities[i * 3] = sinTheta * Math.cos(phi) * speed;
            velocities[i * 3 + 1] = sinTheta * Math.sin(phi) * speed;
            velocities[i * 3 + 2] = cosTheta * speed;

            // Random temperature (hotter particles near center)
            temps[i] = Math.random();

            sizes[i] = 1 + Math.random() * 3;
            birthTimes[i] = Math.random() * 0.5; // Stagger birth times
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
        geometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3));
        geometry.setAttribute('particleTemp', new THREE.BufferAttribute(temps, 1));
        geometry.setAttribute('birthTime', new THREE.BufferAttribute(birthTimes, 1));

        const material = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0 },
                explosionTime: { value: 0 },
                expansionSpeed: { value: config.debrisSpeed }
            },
            vertexShader: debrisVertexShader,
            fragmentShader: debrisFragmentShader,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });

        this.supernovaDebris = new THREE.Points(geometry, material);
        this.supernovaDebris.visible = false;
        this.supernovaGroup.add(this.supernovaDebris);
    }

    startSupernovaSimulation() {
        console.log('startSupernovaSimulation called');
        console.log('supernovaState:', this.supernovaState);
        console.log('cinematicState:', this.cinematicState);
        console.log('tourState:', this.tourState);
        console.log('mergerState:', this.mergerState);
        if (this.supernovaState.active || this.cinematicState.active || this.tourState.active || this.mergerState.active) {
            console.log('Early return - one of the states is active');
            return;
        }

        this.supernovaState.active = true;
        this.supernovaState.progress = 0;
        this.supernovaState.phase = 0;

        // Reset animation state
        this.supernovaState.starScale = 1.0;
        this.supernovaState.collapseProgress = 0;
        this.supernovaState.explosionProgress = 0;
        this.supernovaState.shockwaveRadius = 1;
        this.supernovaState.flashIntensity = 0;
        this.supernovaState.nebulaAge = 0;
        this.supernovaState.temperature = 0;
        this.supernovaState.pulsarActive = false;

        // Save camera state
        this.supernovaState.savedCameraPos.copy(this.camera.position);
        this.supernovaState.savedTarget.copy(this.controls.target);

        // Show supernova group, reset visibility
        this.supernovaGroup.visible = true;
        this.supernovaStar.visible = true;
        this.supernovaCorona.visible = true;
        this.supernovaShockwave.visible = false;
        this.supernovaDebris.visible = false;
        this.supernovaNebula.visible = false;
        this.supernovaPulsar.visible = false;

        // Reset shader uniforms
        this.supernovaStar.material.uniforms.collapseProgress.value = 0;
        this.supernovaStar.material.uniforms.temperature.value = 0;
        this.supernovaCorona.material.uniforms.intensity.value = 0.5;
        this.supernovaShockwave.material.uniforms.intensity.value = 0;
        this.supernovaDebris.material.uniforms.time.value = 0;
        this.supernovaNebula.material.uniforms.nebulaAge.value = 0;
        this.supernovaPulsar.material.uniforms.beamIntensity.value = 0;

        // Disable controls
        this.controls.enabled = false;

        // Hide controls panel, show return button
        document.getElementById('controls').classList.add('hidden');
        document.getElementById('btn-return').style.display = 'block';

        // Show journey overlay
        const overlay = document.getElementById('journey-overlay');
        overlay.classList.add('active');
        this.updateSupernovaUI(this.supernovaState.supernovaPhases[0]);

        // Animate camera to supernova position
        this.animateCameraToSupernova();
    }

    animateCameraToSupernova() {
        const config = this.supernovaState.config;
        const supernovaPos = new THREE.Vector3(config.position.x, config.position.y, config.position.z);

        // Camera position - approaching the doomed star
        const cameraOffset = new THREE.Vector3(40, 20, 50);
        const targetCamPos = supernovaPos.clone().add(cameraOffset);

        const startPos = this.camera.position.clone();
        const startTarget = this.controls.target.clone();
        const duration = 3000;
        const startTime = performance.now();

        const animate = () => {
            const elapsed = performance.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const t = this.easeInOutCubic(progress);

            this.camera.position.lerpVectors(startPos, targetCamPos, t);
            this.controls.target.lerpVectors(startTarget, supernovaPos, t);
            this.camera.lookAt(this.controls.target);

            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };

        animate();
    }

    updateSupernovaSimulation(deltaTime) {
        if (!this.supernovaState.active) return;

        const state = this.supernovaState;
        const phases = state.supernovaPhases;
        const config = state.config;

        // Progress through phases
        state.progress += deltaTime;

        // Find current phase
        let phaseStart = 0;
        for (let i = 0; i < state.phase; i++) {
            phaseStart += phases[i].duration;
        }
        const phaseDuration = phases[state.phase].duration;
        const phaseProgress = (state.progress - phaseStart) / phaseDuration;

        // Check phase transition
        if (phaseProgress >= 1 && state.phase < phases.length - 1) {
            state.phase++;
            this.updateSupernovaUI(phases[state.phase]);
        }

        const phaseName = phases[state.phase].name;

        // Animate based on current phase
        this.animateSupernova(phaseName, phaseProgress, deltaTime);

        // Update camera for cinematic effect
        this.updateSupernovaCamera(phaseName, phaseProgress);

        // Update audio
        if (this.audioManager.isEnabled) {
            this.audioManager.updateSupernovaAudio(phaseName, phaseProgress);
        }

        // Check completion (loop at aftermath)
        const totalDuration = phases.reduce((sum, p) => sum + p.duration, 0);
        if (state.progress >= totalDuration) {
            // Hold at aftermath phase
            state.progress = totalDuration - 0.1;
        }
    }

    animateSupernova(phaseName, phaseProgress, deltaTime) {
        const state = this.supernovaState;

        switch (phaseName) {
            case 'doomed_star':
                // Pulsating red supergiant
                state.starScale = 1.0 + Math.sin(state.progress * 2) * 0.05;
                this.supernovaStar.scale.setScalar(state.starScale);
                this.supernovaCorona.scale.setScalar(state.starScale * 1.3);
                this.supernovaCorona.material.uniforms.intensity.value = 0.4 + Math.sin(state.progress * 3) * 0.1;
                break;

            case 'instability':
                // Increasing pulsation and heating
                const instability = phaseProgress;
                state.starScale = 1.0 + Math.sin(state.progress * 4) * 0.1 * (1 + instability);
                this.supernovaStar.scale.setScalar(state.starScale);
                this.supernovaCorona.scale.setScalar(state.starScale * 1.3);
                this.supernovaCorona.material.uniforms.intensity.value = 0.5 + instability * 0.3;
                state.temperature = instability * 0.2;
                this.supernovaStar.material.uniforms.temperature.value = state.temperature;
                break;

            case 'collapse':
                // Rapid contraction
                state.collapseProgress = phaseProgress;
                this.supernovaStar.material.uniforms.collapseProgress.value = state.collapseProgress;
                state.starScale = 1.0 - phaseProgress * 0.6;
                this.supernovaStar.scale.setScalar(Math.max(0.1, state.starScale));
                this.supernovaCorona.scale.setScalar(Math.max(0.15, state.starScale * 1.2));
                state.temperature = 0.2 + phaseProgress * 0.5;
                this.supernovaStar.material.uniforms.temperature.value = state.temperature;
                this.supernovaCorona.material.uniforms.intensity.value = 0.8 + phaseProgress * 0.5;
                break;

            case 'bounce':
                // Core bounces - brief but intense
                const bounceT = phaseProgress;
                state.collapseProgress = 0.6 - bounceT * 0.3;
                this.supernovaStar.material.uniforms.collapseProgress.value = Math.max(0, state.collapseProgress);
                state.temperature = 0.7 + bounceT * 0.3;
                this.supernovaStar.material.uniforms.temperature.value = state.temperature;
                // Start building flash
                state.flashIntensity = bounceT * 0.3;
                break;

            case 'explosion':
                // THE SUPERNOVA - blinding flash and shockwave begins
                const explodeT = phaseProgress;

                // Blinding flash
                if (explodeT < 0.3) {
                    state.flashIntensity = Math.min(1.0, explodeT * 4);
                } else {
                    state.flashIntensity = Math.max(0, 1.0 - (explodeT - 0.3) * 1.8);
                }

                // Add flash overlay to scene if intensity > 0
                if (state.flashIntensity > 0.01 && !this.supernovaFlash.parent) {
                    this.scene.add(this.supernovaFlash);
                }
                this.supernovaFlash.material.uniforms.flashIntensity.value = state.flashIntensity;

                // Star expands rapidly then fades
                if (explodeT < 0.2) {
                    state.starScale = 0.4 + explodeT * 15;
                    this.supernovaStar.scale.setScalar(state.starScale);
                    this.supernovaCorona.scale.setScalar(state.starScale * 1.5);
                } else {
                    // Star starts to fade, shockwave takes over
                    this.supernovaStar.visible = explodeT < 0.5;
                    this.supernovaCorona.visible = explodeT < 0.6;
                }

                // Shockwave begins
                if (explodeT > 0.15) {
                    this.supernovaShockwave.visible = true;
                    const shockT = (explodeT - 0.15) / 0.85;
                    state.shockwaveRadius = 5 + shockT * 40;
                    this.supernovaShockwave.material.uniforms.shockwaveRadius.value = state.shockwaveRadius;
                    this.supernovaShockwave.material.uniforms.intensity.value = 1.0 - shockT * 0.3;
                    this.supernovaShockwave.material.uniforms.explosionProgress.value = shockT;
                }

                // Debris starts
                if (explodeT > 0.2) {
                    this.supernovaDebris.visible = true;
                    this.supernovaDebris.material.uniforms.time.value += deltaTime;
                }
                break;

            case 'shockwave':
                // Shockwave expands, debris spreads
                const shockwaveT = phaseProgress;

                // Remove flash
                if (this.supernovaFlash.parent) {
                    this.scene.remove(this.supernovaFlash);
                }
                state.flashIntensity = 0;

                this.supernovaStar.visible = false;
                this.supernovaCorona.visible = false;

                // Shockwave continues expanding
                state.shockwaveRadius = 45 + shockwaveT * 80;
                this.supernovaShockwave.material.uniforms.shockwaveRadius.value = state.shockwaveRadius;
                this.supernovaShockwave.material.uniforms.intensity.value = Math.max(0.1, 0.7 - shockwaveT * 0.6);

                // Debris continues
                this.supernovaDebris.material.uniforms.time.value += deltaTime;
                break;

            case 'nebula_formation':
                // Nebula forms as shockwave fades
                const nebulaT = phaseProgress;

                // Fade shockwave
                this.supernovaShockwave.material.uniforms.intensity.value = Math.max(0, 0.1 - nebulaT * 0.15);
                if (nebulaT > 0.3) {
                    this.supernovaShockwave.visible = false;
                }

                // Show and grow nebula
                this.supernovaNebula.visible = true;
                state.nebulaAge = nebulaT;
                this.supernovaNebula.material.uniforms.nebulaAge.value = state.nebulaAge;

                // Debris fades
                this.supernovaDebris.material.uniforms.time.value += deltaTime;
                break;

            case 'aftermath':
                // Pulsar appears in the center
                const aftermathT = phaseProgress;

                // Nebula continues glowing
                this.supernovaNebula.material.uniforms.nebulaAge.value = 1.0;

                // Pulsar fades in
                if (aftermathT > 0.1) {
                    this.supernovaPulsar.visible = true;
                    const pulsarT = (aftermathT - 0.1) / 0.9;
                    this.supernovaPulsar.material.uniforms.beamIntensity.value = Math.min(1.0, pulsarT * 1.5);
                    // Make pulsar face camera
                    this.supernovaPulsar.lookAt(this.camera.position);
                }
                break;
        }
    }

    updateSupernovaCamera(phaseName, phaseProgress) {
        const config = this.supernovaState.config;
        const supernovaPos = new THREE.Vector3(config.position.x, config.position.y, config.position.z);

        let targetCamPos, targetLookAt;

        switch (phaseName) {
            case 'doomed_star':
            case 'instability':
                // Close-up of the star
                const orbitAngle = this.supernovaState.progress * 0.1;
                targetCamPos = new THREE.Vector3(
                    supernovaPos.x + Math.cos(orbitAngle) * 45,
                    supernovaPos.y + 15,
                    supernovaPos.z + Math.sin(orbitAngle) * 45
                );
                targetLookAt = supernovaPos.clone();
                break;

            case 'collapse':
            case 'bounce':
                // Pull back slightly for drama
                const collapseOrbit = this.supernovaState.progress * 0.15;
                targetCamPos = new THREE.Vector3(
                    supernovaPos.x + Math.cos(collapseOrbit) * 55,
                    supernovaPos.y + 25,
                    supernovaPos.z + Math.sin(collapseOrbit) * 55
                );
                targetLookAt = supernovaPos.clone();
                break;

            case 'explosion':
                // Pull back rapidly during explosion
                const explosionDist = 60 + phaseProgress * 50;
                const explosionAngle = this.supernovaState.progress * 0.08;
                targetCamPos = new THREE.Vector3(
                    supernovaPos.x + Math.cos(explosionAngle) * explosionDist,
                    supernovaPos.y + 30 + phaseProgress * 20,
                    supernovaPos.z + Math.sin(explosionAngle) * explosionDist
                );
                targetLookAt = supernovaPos.clone();
                // Camera shake during explosion
                if (phaseProgress < 0.5) {
                    const shake = (1 - phaseProgress * 2) * 3;
                    targetCamPos.x += (Math.random() - 0.5) * shake;
                    targetCamPos.y += (Math.random() - 0.5) * shake;
                    targetCamPos.z += (Math.random() - 0.5) * shake;
                }
                break;

            case 'shockwave':
                // Continue pulling back to see full expansion
                const shockDist = 120 + phaseProgress * 60;
                const shockAngle = this.supernovaState.progress * 0.06;
                targetCamPos = new THREE.Vector3(
                    supernovaPos.x + Math.cos(shockAngle) * shockDist,
                    supernovaPos.y + 60,
                    supernovaPos.z + Math.sin(shockAngle) * shockDist
                );
                targetLookAt = supernovaPos.clone();
                break;

            case 'nebula_formation':
            case 'aftermath':
                // Slow orbit around the nebula
                const nebulaDist = 180;
                const nebulaAngle = this.supernovaState.progress * 0.04;
                targetCamPos = new THREE.Vector3(
                    supernovaPos.x + Math.cos(nebulaAngle) * nebulaDist,
                    supernovaPos.y + 80 + Math.sin(nebulaAngle * 2) * 20,
                    supernovaPos.z + Math.sin(nebulaAngle) * nebulaDist
                );
                targetLookAt = supernovaPos.clone();
                break;
        }

        // Smooth camera movement
        const lerpSpeed = phaseName === 'explosion' ? 0.08 : 0.03;
        this.camera.position.lerp(targetCamPos, lerpSpeed);
        this.controls.target.lerp(targetLookAt, lerpSpeed);
        this.camera.lookAt(this.controls.target);
    }

    updateSupernovaUI(phase) {
        const title = document.getElementById('journey-title');
        const sub = document.getElementById('journey-sub');
        const dist = document.getElementById('journey-dist');

        title.classList.remove('visible');
        sub.classList.remove('visible');

        setTimeout(() => {
            title.textContent = phase.title;
            sub.textContent = phase.subtitle;
            dist.textContent = phase.description;

            title.classList.add('visible');
            sub.classList.add('visible');
            dist.classList.add('visible');
        }, 300);
    }

    stopSupernovaSimulation() {
        if (!this.supernovaState.active) return;

        this.supernovaState.active = false;

        // Stop supernova audio
        if (this.audioManager.isEnabled) {
            this.audioManager.stopSupernovaAudio();
        }

        // Hide supernova group and all components
        this.supernovaGroup.visible = false;
        this.supernovaStar.visible = false;
        this.supernovaCorona.visible = false;
        this.supernovaShockwave.visible = false;
        this.supernovaDebris.visible = false;
        this.supernovaNebula.visible = false;
        this.supernovaPulsar.visible = false;

        // Remove flash if present
        if (this.supernovaFlash.parent) {
            this.scene.remove(this.supernovaFlash);
        }

        // Hide overlay
        document.getElementById('journey-overlay').classList.remove('active');
        document.getElementById('journey-title').classList.remove('visible');
        document.getElementById('journey-sub').classList.remove('visible');
        document.getElementById('journey-dist').classList.remove('visible');

        // Animate camera back
        const startPos = this.camera.position.clone();
        const targetPos = this.supernovaState.savedCameraPos;
        const startTarget = this.controls.target.clone();
        const endTarget = this.supernovaState.savedTarget;

        const duration = 2000;
        const startTime = performance.now();

        const animateBack = () => {
            const elapsed = performance.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const t = this.easeInOutCubic(progress);

            this.camera.position.lerpVectors(startPos, targetPos, t);
            this.controls.target.lerpVectors(startTarget, endTarget, t);

            if (progress < 1) {
                requestAnimationFrame(animateBack);
            } else {
                this.controls.enabled = true;
                document.getElementById('btn-return').style.display = 'none';
                document.getElementById('controls').classList.remove('hidden');
            }
        };

        animateBack();
    }

    // ============================================================
    // SOLAR SYSTEM
    // ============================================================

    createSolarSystem() {
        // Solar System position in galaxy (Orion Arm, ~26,000 ly from center)
        // In our scale: 26,000 ly = 52 units (1 unit = 500 ly)
        this.solarSystemPosition = new THREE.Vector3(52, 0, 15);

        // Create solar system group (hidden initially)
        this.solarSystem = new THREE.Group();
        this.solarSystem.position.copy(this.solarSystemPosition);
        this.solarSystem.visible = false;
        this.solarSystem.scale.set(0.001, 0.001, 0.001); // Start tiny

        this.planets = [];

        // Create Sun
        this.createSun();

        // Create planets
        this.planetData.forEach(data => this.createPlanet(data));

        // Create orbit lines
        this.createOrbitLines();

        // Create asteroid belt
        this.createAsteroidBelt();

        // Add solar system marker in galaxy view
        this.createSolarSystemMarker();

        this.scene.add(this.solarSystem);

        // Initialize detailed solar system asynchronously
        this.initDetailedSolarSystem();
    }

    async initDetailedSolarSystem() {
        try {
            this.detailedSolarSystem = new SolarSystemDetailed(this.scene, this.camera);
            await this.detailedSolarSystem.init((progress) => {
                console.log(`Loading textures: ${Math.round(progress.overallProgress * 100)}%`);
            });
            // Position at same location as basic solar system
            this.detailedSolarSystem.setPosition(
                this.solarSystemPosition.x,
                this.solarSystemPosition.y,
                this.solarSystemPosition.z
            );
            console.log('Detailed solar system initialized');
        } catch (error) {
            console.error('Failed to initialize detailed solar system:', error);
            this.useDetailedSolarSystem = false;
        }
    }

    createSun() {
        // Sun with animated surface
        const sunGeometry = new THREE.SphereGeometry(1.5, 64, 64);
        const sunMaterial = new THREE.ShaderMaterial({
            uniforms: {
                time: this.uniforms.time
            },
            vertexShader: sunVertexShader,
            fragmentShader: sunFragmentShader,
            transparent: false
        });

        this.sun = new THREE.Mesh(sunGeometry, sunMaterial);
        this.solarSystem.add(this.sun);

        // Solar corona/glow
        const coronaGeometry = new THREE.SphereGeometry(2.5, 32, 32);
        const coronaMaterial = new THREE.ShaderMaterial({
            uniforms: {
                time: this.uniforms.time,
                coreGlow: { value: 1.5 }
            },
            vertexShader: coreVertexShader,
            fragmentShader: coronaFragmentShader,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            side: THREE.BackSide
        });

        const corona = new THREE.Mesh(coronaGeometry, coronaMaterial);
        this.solarSystem.add(corona);

        // Point light from sun
        const sunLight = new THREE.PointLight(0xffffee, 2, 100);
        this.solarSystem.add(sunLight);
    }

    createPlanet(data) {
        const planetGroup = new THREE.Group();

        // Planet sphere
        const geometry = new THREE.SphereGeometry(data.size, 32, 32);
        const material = new THREE.ShaderMaterial({
            uniforms: {
                planetColor: { value: data.color },
                planetColor2: { value: data.color2 },
                hasRings: { value: data.rings ? 1.0 : 0.0 },
                hasAtmosphere: { value: data.atmosphere ? 1.0 : 0.0 },
                time: this.uniforms.time
            },
            vertexShader: planetVertexShader,
            fragmentShader: planetFragmentShader
        });

        const planet = new THREE.Mesh(geometry, material);
        planetGroup.add(planet);

        // Add rings for Saturn
        if (data.rings) {
            const ringGeometry = new THREE.PlaneGeometry(data.size * 4, data.size * 4);
            const ringMaterial = new THREE.ShaderMaterial({
                vertexShader: ringsVertexShader,
                fragmentShader: ringsFragmentShader,
                transparent: true,
                side: THREE.DoubleSide,
                depthWrite: false
            });

            const rings = new THREE.Mesh(ringGeometry, ringMaterial);
            rings.rotation.x = Math.PI * 0.4;
            planetGroup.add(rings);
        }

        // Add moon for Earth
        if (data.name === 'Earth') {
            const moonGeo = new THREE.SphereGeometry(0.1, 16, 16);
            const moonMat = new THREE.MeshStandardMaterial({
                color: 0xaaaaaa,
                roughness: 0.9
            });
            const moon = new THREE.Mesh(moonGeo, moonMat);
            moon.position.set(0.8, 0, 0);
            planetGroup.add(moon);
            planetGroup.moon = moon;
        }

        // Store orbit data
        planetGroup.orbitData = {
            distance: data.distance,
            period: data.period,
            phase: Math.random() * Math.PI * 2
        };

        planetGroup.planetName = data.name;

        // Initial position
        planetGroup.position.x = data.distance;

        this.planets.push(planetGroup);
        this.solarSystem.add(planetGroup);
    }

    createOrbitLines() {
        this.planetData.forEach(data => {
            const curve = new THREE.EllipseCurve(0, 0, data.distance, data.distance, 0, 2 * Math.PI, false, 0);
            const points = curve.getPoints(128);
            const geometry = new THREE.BufferGeometry().setFromPoints(points);

            const material = new THREE.LineBasicMaterial({
                color: 0x334466,
                transparent: true,
                opacity: 0.3
            });

            const orbit = new THREE.Line(geometry, material);
            orbit.rotation.x = Math.PI * 0.5;
            this.solarSystem.add(orbit);
        });
    }

    createAsteroidBelt() {
        const asteroidCount = 2000;
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(asteroidCount * 3);

        for (let i = 0; i < asteroidCount; i++) {
            const r = 10 + Math.random() * 3; // Between Mars and Jupiter
            const theta = Math.random() * Math.PI * 2;
            const y = (Math.random() - 0.5) * 0.5;

            positions[i * 3] = Math.cos(theta) * r;
            positions[i * 3 + 1] = y;
            positions[i * 3 + 2] = Math.sin(theta) * r;
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

        const material = new THREE.PointsMaterial({
            color: 0x888888,
            size: 0.05,
            transparent: true,
            opacity: 0.6
        });

        const asteroids = new THREE.Points(geometry, material);
        this.solarSystem.add(asteroids);
    }

    createSolarSystemMarker() {
        // Yellow marker showing Sun's position in galaxy
        const markerGeo = new THREE.SphereGeometry(1.5, 16, 16);
        const markerMat = new THREE.MeshBasicMaterial({
            color: 0xffff00,
            transparent: true,
            opacity: 0.8
        });

        this.solarMarker = new THREE.Mesh(markerGeo, markerMat);
        this.solarMarker.position.copy(this.solarSystemPosition);

        // Add pulsing glow
        const glowGeo = new THREE.SphereGeometry(3, 16, 16);
        const glowMat = new THREE.ShaderMaterial({
            uniforms: {
                time: this.uniforms.time
            },
            vertexShader: markerVertexShader,
            fragmentShader: markerFragmentShader,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            side: THREE.BackSide
        });

        const glow = new THREE.Mesh(glowGeo, glowMat);
        this.solarMarker.add(glow);

        this.scene.add(this.solarMarker);
    }

    updateSolarSystem() {
        if (!this.solarSystem.visible) return;

        const time = this.uniforms.time.value * 0.5;

        // Update planet positions
        this.planets.forEach(planetGroup => {
            const { distance, period, phase } = planetGroup.orbitData;
            const angle = phase + (time / period) * Math.PI * 2;

            planetGroup.position.x = Math.cos(angle) * distance;
            planetGroup.position.z = Math.sin(angle) * distance;

            // Rotate planet
            planetGroup.children[0].rotation.y += 0.01;

            // Rotate moon if exists
            if (planetGroup.moon) {
                const moonAngle = time * 5;
                planetGroup.moon.position.x = Math.cos(moonAngle) * 0.8;
                planetGroup.moon.position.z = Math.sin(moonAngle) * 0.8;
            }
        });
    }

    // ============================================================
    // CINEMATIC CAMERA SYSTEM
    // ============================================================

    initCinematicSystem() {
        this.cinematicState = {
            active: false,
            progress: 0,
            phase: 0,
            startPosition: new THREE.Vector3(),
            startTarget: new THREE.Vector3(),
            savedCameraPos: new THREE.Vector3(),
            savedTarget: new THREE.Vector3(),
            journeyType: null // 'solar', 'blackhole', or 'tour'
        };

        // Journey phases
        this.solarJourneyPhases = SOLAR_JOURNEY_PHASES;
        this.blackHoleJourneyPhases = BLACK_HOLE_JOURNEY_PHASES;

        // Cinematic tour state - enhanced with sequence system
        this.tourState = {
            active: false,
            time: 0,
            totalTime: 0,
            currentSequenceIndex: 0,
            sequenceProgress: 0,
            savedCameraPos: new THREE.Vector3(),
            savedTarget: new THREE.Vector3(),
            savedFov: 60,
            currentFov: 60,
            currentRoll: 0,
            targetRoll: 0,
            shakeIntensity: 0,
            shakeOffset: new THREE.Vector3(),
            velocity: 0,
            lastPos: new THREE.Vector3()
        };

        // Calculate total tour duration
        this.tourTotalDuration = this.tourSequences.reduce((sum, seq) => sum + seq.duration, 0);
    }

    // ============================================================
    // CINEMATIC AUTO-TOUR MODE (Enhanced with dramatic sequences)
    // ============================================================

    startCinematicTour() {
        if (this.tourState.active || this.cinematicState.active) return;

        // Save current state
        this.tourState.savedCameraPos.copy(this.camera.position);
        this.tourState.savedTarget.copy(this.controls.target);
        this.tourState.savedFov = this.camera.fov;
        this.tourState.active = true;
        this.tourState.time = 0;
        this.tourState.totalTime = 0;
        this.tourState.currentSequenceIndex = 0;
        this.tourState.sequenceProgress = 0;

        // Disable controls
        this.controls.enabled = false;

        // Hide controls, show return button
        document.getElementById('controls').classList.add('hidden');
        document.getElementById('btn-return').style.display = 'block';

        // Show tour info
        const overlay = document.getElementById('journey-overlay');
        overlay.classList.add('active');
        this.updateTourSequenceUI(this.tourSequences[0]);

        // Fade out overlay text after 3 seconds
        setTimeout(() => {
            document.getElementById('journey-title').classList.remove('visible');
            document.getElementById('journey-sub').classList.remove('visible');
        }, 3000);
    }

    updateTourSequenceUI(sequence) {
        document.getElementById('journey-title').textContent = sequence.displayName;
        document.getElementById('journey-sub').textContent = 'Cinematic Galaxy Tour';
        document.getElementById('journey-title').classList.add('visible');
        document.getElementById('journey-sub').classList.add('visible');
        document.getElementById('journey-dist').classList.remove('visible');

        // Update audio mood
        if (this.audioManager && this.audioManager.isEnabled) {
            this.audioManager.setTourSequence(sequence.name);
        }
    }

    updateCinematicTour(deltaTime) {
        if (!this.tourState.active) return;

        // Progress through the tour
        this.tourState.time += deltaTime;
        this.tourState.totalTime += deltaTime;

        // Find current sequence
        let accumulatedTime = 0;
        let currentSeq = null;
        let seqStartTime = 0;

        for (let i = 0; i < this.tourSequences.length; i++) {
            const seq = this.tourSequences[i];
            if (this.tourState.totalTime >= accumulatedTime &&
                this.tourState.totalTime < accumulatedTime + seq.duration) {
                currentSeq = seq;
                seqStartTime = accumulatedTime;
                if (i !== this.tourState.currentSequenceIndex) {
                    this.tourState.currentSequenceIndex = i;
                    this.updateTourSequenceUI(seq);
                    // Brief fade in for sequence name
                    setTimeout(() => {
                        document.getElementById('journey-title').classList.remove('visible');
                        document.getElementById('journey-sub').classList.remove('visible');
                    }, 2500);
                }
                break;
            }
            accumulatedTime += seq.duration;
        }

        // Loop the tour
        if (!currentSeq) {
            this.tourState.totalTime = 0;
            this.tourState.currentSequenceIndex = 0;
            currentSeq = this.tourSequences[0];
            seqStartTime = 0;
            this.updateTourSequenceUI(currentSeq);
        }

        // Calculate progress within current sequence
        const seqProgress = (this.tourState.totalTime - seqStartTime) / currentSeq.duration;

        // Apply speed-based easing for different sequence types
        let easedProgress;
        switch (currentSeq.speed) {
            case 'slow':
                easedProgress = this.easeOutSine(seqProgress);
                break;
            case 'accelerating':
                easedProgress = this.easeInQuad(seqProgress);
                break;
            case 'decelerating':
                easedProgress = this.easeOutQuad(seqProgress);
                break;
            case 'fast':
                easedProgress = this.easeInOutQuad(seqProgress);
                break;
            case 'explosive':
                easedProgress = this.easeOutExpo(seqProgress);
                break;
            case 'slow_dramatic':
                easedProgress = this.easeInOutSine(seqProgress);
                break;
            case 'cruising':
                easedProgress = seqProgress; // Linear for smooth cruising
                break;
            default:
                easedProgress = this.easeInOutCubic(seqProgress);
        }

        // Interpolate camera position through waypoints
        const waypoints = currentSeq.waypoints;
        const { position, target, fov, roll } = this.interpolateWaypoints(waypoints, easedProgress);

        // Calculate velocity for dynamic effects
        const currentVelocity = this.tourState.lastPos.distanceTo(position);
        this.tourState.velocity = this.tourState.velocity * 0.9 + currentVelocity * 0.1;
        this.tourState.lastPos.copy(position);

        // Dynamic lerp factor based on sequence speed
        let lerpFactor;
        switch (currentSeq.speed) {
            case 'fast':
            case 'explosive':
                lerpFactor = 0.12;
                break;
            case 'accelerating':
                lerpFactor = 0.06 + seqProgress * 0.08;
                break;
            case 'decelerating':
                lerpFactor = 0.12 - seqProgress * 0.06;
                break;
            case 'slow':
            case 'slow_dramatic':
                lerpFactor = 0.04;
                break;
            default:
                lerpFactor = 0.08;
        }

        // Calculate camera shake
        this.tourState.shakeIntensity = currentSeq.shake || 0;
        if (this.tourState.shakeIntensity > 0) {
            const shakeAmount = this.tourState.shakeIntensity * (0.5 + this.tourState.velocity * 0.3);
            this.tourState.shakeOffset.set(
                (Math.random() - 0.5) * shakeAmount,
                (Math.random() - 0.5) * shakeAmount * 0.5,
                (Math.random() - 0.5) * shakeAmount
            );
        } else {
            this.tourState.shakeOffset.multiplyScalar(0.9);
        }

        // Apply position with shake
        const targetPos = position.clone().add(this.tourState.shakeOffset);
        this.camera.position.lerp(targetPos, lerpFactor);
        this.controls.target.lerp(target, lerpFactor * 0.8);

        // Animate FOV with velocity boost
        const velocityFovBoost = Math.min(this.tourState.velocity * 3, 8);
        const targetFov = fov + velocityFovBoost;
        this.tourState.currentFov += (targetFov - this.tourState.currentFov) * 0.05;
        this.camera.fov = this.tourState.currentFov;
        this.camera.updateProjectionMatrix();

        // Apply Dutch angle (camera roll)
        this.tourState.targetRoll = roll || 0;
        this.tourState.currentRoll += (this.tourState.targetRoll - this.tourState.currentRoll) * 0.03;

        // Look at target first
        this.camera.lookAt(this.controls.target);

        // Then apply roll by rotating around the forward axis
        if (Math.abs(this.tourState.currentRoll) > 0.1) {
            const rollRad = (this.tourState.currentRoll * Math.PI) / 180;
            this.camera.rotateZ(rollRad);
        }

        // Update audio based on current sequence mood
        if (this.audioManager && this.audioManager.isEnabled) {
            this.audioManager.update(
                this.camera.position,
                this.tourState.velocity * 100,
                currentSeq.name,
                deltaTime
            );
        }
    }

    // Additional easing functions for dramatic effects
    easeOutSine(t) {
        return Math.sin((t * Math.PI) / 2);
    }

    easeInOutSine(t) {
        return -(Math.cos(Math.PI * t) - 1) / 2;
    }

    easeInQuad(t) {
        return t * t;
    }

    easeOutQuad(t) {
        return 1 - (1 - t) * (1 - t);
    }

    easeInOutQuad(t) {
        return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    }

    easeOutExpo(t) {
        return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
    }

    interpolateWaypoints(waypoints, progress) {
        if (waypoints.length === 1) {
            return {
                position: new THREE.Vector3(...waypoints[0].pos),
                target: new THREE.Vector3(...waypoints[0].target),
                fov: waypoints[0].fov,
                roll: waypoints[0].roll || 0
            };
        }

        // Find which segment we're in
        const segmentCount = waypoints.length - 1;
        const scaledProgress = progress * segmentCount;
        const segmentIndex = Math.min(Math.floor(scaledProgress), segmentCount - 1);
        const segmentProgress = scaledProgress - segmentIndex;

        const wp1 = waypoints[segmentIndex];
        const wp2 = waypoints[segmentIndex + 1];

        // Smooth interpolation with easing
        const t = this.easeInOutCubic(segmentProgress);

        // Use Catmull-Rom for smoother curves when we have 3+ waypoints
        let position, target;

        if (waypoints.length >= 3) {
            const wp0 = waypoints[Math.max(0, segmentIndex - 1)];
            const wp3 = waypoints[Math.min(waypoints.length - 1, segmentIndex + 2)];

            position = this.catmullRom(
                new THREE.Vector3(...wp0.pos),
                new THREE.Vector3(...wp1.pos),
                new THREE.Vector3(...wp2.pos),
                new THREE.Vector3(...wp3.pos),
                segmentProgress
            );
            target = this.catmullRom(
                new THREE.Vector3(...wp0.target),
                new THREE.Vector3(...wp1.target),
                new THREE.Vector3(...wp2.target),
                new THREE.Vector3(...wp3.target),
                segmentProgress
            );
        } else {
            position = new THREE.Vector3().lerpVectors(
                new THREE.Vector3(...wp1.pos),
                new THREE.Vector3(...wp2.pos),
                t
            );
            target = new THREE.Vector3().lerpVectors(
                new THREE.Vector3(...wp1.target),
                new THREE.Vector3(...wp2.target),
                t
            );
        }

        const fov = wp1.fov + (wp2.fov - wp1.fov) * t;
        const roll1 = wp1.roll || 0;
        const roll2 = wp2.roll || 0;
        const roll = roll1 + (roll2 - roll1) * t;

        return { position, target, fov, roll };
    }

    catmullRom(p0, p1, p2, p3, t) {
        const t2 = t * t;
        const t3 = t2 * t;

        const v = new THREE.Vector3();
        v.x = 0.5 * ((2 * p1.x) +
            (-p0.x + p2.x) * t +
            (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
            (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3);
        v.y = 0.5 * ((2 * p1.y) +
            (-p0.y + p2.y) * t +
            (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
            (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3);
        v.z = 0.5 * ((2 * p1.z) +
            (-p0.z + p2.z) * t +
            (2 * p0.z - 5 * p1.z + 4 * p2.z - p3.z) * t2 +
            (-p0.z + 3 * p1.z - 3 * p2.z + p3.z) * t3);

        return v;
    }

    easeInOutQuart(t) {
        return t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2;
    }

    easeInOutCubic(t) {
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }

    stopCinematicTour() {
        if (!this.tourState.active) return;

        this.tourState.active = false;

        // Animate back to saved position
        const startPos = this.camera.position.clone();
        const targetPos = this.tourState.savedCameraPos;
        const startTarget = this.controls.target.clone();
        const endTarget = this.tourState.savedTarget;
        const startFov = this.camera.fov;
        const endFov = this.tourState.savedFov;

        const duration = 2000;
        const startTime = performance.now();

        const animateBack = () => {
            const elapsed = performance.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const ease = t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
            const t = ease(progress);

            this.camera.position.lerpVectors(startPos, targetPos, t);
            this.controls.target.lerpVectors(startTarget, endTarget, t);
            this.camera.fov = startFov + (endFov - startFov) * t;
            this.camera.updateProjectionMatrix();

            if (progress < 1) {
                requestAnimationFrame(animateBack);
            } else {
                this.controls.enabled = true;
                document.getElementById('btn-return').style.display = 'none';
                document.getElementById('controls').classList.remove('hidden');
                document.getElementById('journey-overlay').classList.remove('active');
            }
        };

        animateBack();
    }

    // ============================================================
    // PLANET VIEW SYSTEM
    // ============================================================

    setupPlanetClicking() {
        const self = this;

        // Double-click to view planet in detail
        this.renderer.domElement.addEventListener('dblclick', (event) => {
            if (!this.solarSystem.visible || this.planetViewState.active) return;

            self.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
            self.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

            self.raycaster.setFromCamera(self.mouse, self.camera);

            // Check for planet intersections
            const planetMeshes = self.planets.map(p => p.children[0]);
            const intersects = self.raycaster.intersectObjects(planetMeshes);

            if (intersects.length > 0) {
                const clickedMesh = intersects[0].object;
                const planetGroup = clickedMesh.parent;
                const planetName = planetGroup.planetName;

                self.enterPlanetView(planetName, planetGroup);
            }
        });

        // Exit planet button
        const btnExitPlanet = document.getElementById('btn-exit-planet');
        if (btnExitPlanet) {
            btnExitPlanet.addEventListener('click', () => {
                self.exitPlanetView();
            });
        }
    }

    enterPlanetView(planetName, planetGroup) {
        if (this.planetViewState.active) return;

        this.planetViewState.active = true;
        this.planetViewState.planet = planetName;
        this.planetViewState.orbitTime = 0;

        // Save camera state
        this.planetViewState.savedCameraPos.copy(this.camera.position);
        this.planetViewState.savedTarget.copy(this.controls.target);

        // Get planet world position
        const planetWorldPos = new THREE.Vector3();
        planetGroup.getWorldPosition(planetWorldPos);

        // Get detailed planet data
        const detailedData = this.detailedPlanetData[planetName];
        const basicData = this.planetData.find(p => p.name === planetName);

        // Create detailed planet view
        this.createDetailedPlanetView(planetName, detailedData, basicData, planetWorldPos);

        // Update planet info UI
        this.updatePlanetInfoUI(planetName, detailedData);

        // Show planet overlay
        document.getElementById('planet-overlay').classList.add('active');
        document.getElementById('btn-return').style.display = 'none';

        // Disable controls during transition
        this.controls.enabled = false;

        // Animate to planet
        const targetCamPos = planetWorldPos.clone().add(new THREE.Vector3(0, 2, 5));
        this.animateToPlanetView(targetCamPos, planetWorldPos);
    }

    createDetailedPlanetView(planetName, detailedData, basicData, position) {
        // Create a detailed planet group
        this.detailedPlanetGroup = new THREE.Group();
        this.detailedPlanetGroup.position.copy(position);

        const planetSize = basicData.size * 3; // Larger for detail view

        // Main planet sphere with detailed shader
        const planetGeo = new THREE.SphereGeometry(planetSize, 128, 128);
        const planetMat = new THREE.ShaderMaterial({
            uniforms: {
                planetColor1: { value: detailedData.surfaceColors[0] },
                planetColor2: { value: detailedData.surfaceColors[1] },
                sunDirection: { value: new THREE.Vector3(1, 0.3, 0).normalize() },
                time: this.uniforms.time,
                planetType: { value: detailedData.hasBands ? 1.0 : 0.0 },
                hasBands: { value: detailedData.hasBands ? 1.0 : 0.0 },
                hasStorm: { value: detailedData.hasStorm ? 1.0 : 0.0 }
            },
            vertexShader: detailedPlanetVertexShader,
            fragmentShader: detailedPlanetFragmentShader
        });

        const planet = new THREE.Mesh(planetGeo, planetMat);
        this.detailedPlanetGroup.add(planet);

        // Atmosphere if applicable
        if (detailedData.atmosphere) {
            const atmoGeo = new THREE.SphereGeometry(planetSize * 1.1, 64, 64);
            const atmoMat = new THREE.ShaderMaterial({
                uniforms: {
                    atmosphereColor: { value: detailedData.atmosphereColor },
                    sunDirection: { value: new THREE.Vector3(1, 0.3, 0).normalize() },
                    atmosphereDensity: { value: planetName === 'Venus' ? 1.5 : 0.8 }
                },
                vertexShader: atmosphereVertexShader,
                fragmentShader: atmosphereFragmentShader,
                transparent: true,
                blending: THREE.AdditiveBlending,
                depthWrite: false,
                side: THREE.BackSide
            });

            const atmosphere = new THREE.Mesh(atmoGeo, atmoMat);
            this.detailedPlanetGroup.add(atmosphere);
        }

        // Clouds for Earth
        if (detailedData.hasClouds) {
            const cloudGeo = new THREE.SphereGeometry(planetSize * 1.02, 64, 64);
            const cloudMat = new THREE.ShaderMaterial({
                uniforms: {
                    time: this.uniforms.time,
                    sunDirection: { value: new THREE.Vector3(1, 0.3, 0).normalize() },
                    cloudDensity: { value: 0.7 }
                },
                vertexShader: cloudVertexShader,
                fragmentShader: cloudFragmentShader,
                transparent: true,
                depthWrite: false
            });

            const clouds = new THREE.Mesh(cloudGeo, cloudMat);
            this.detailedPlanetGroup.add(clouds);
        }

        // Rings for Saturn, Uranus, Neptune
        if (detailedData.hasRings) {
            const ringGeo = new THREE.PlaneGeometry(planetSize * 5, planetSize * 5);
            const ringMat = new THREE.ShaderMaterial({
                uniforms: {
                    ringColor1: { value: detailedData.ringColors[0] },
                    ringColor2: { value: detailedData.ringColors[1] },
                    sunDirection: { value: new THREE.Vector3(1, 0.3, 0).normalize() },
                    time: this.uniforms.time
                },
                vertexShader: detailedRingsVertexShader,
                fragmentShader: detailedRingsFragmentShader,
                transparent: true,
                side: THREE.DoubleSide,
                depthWrite: false
            });

            const rings = new THREE.Mesh(ringGeo, ringMat);
            rings.rotation.x = Math.PI * 0.4;
            if (planetName === 'Uranus') {
                rings.rotation.x = Math.PI * 0.1; // Uranus is tilted
                rings.rotation.z = Math.PI * 0.4;
            }
            this.detailedPlanetGroup.add(rings);
        }

        this.scene.add(this.detailedPlanetGroup);
        this.planetViewState.detailedPlanetMesh = this.detailedPlanetGroup;
    }

    updatePlanetInfoUI(planetName, detailedData) {
        document.getElementById('planet-name').textContent = planetName;
        document.getElementById('planet-distance').textContent = detailedData.distanceFromSun;
        document.getElementById('planet-diameter').textContent = detailedData.diameter;
        document.getElementById('planet-day').textContent = detailedData.dayLength;
        document.getElementById('planet-year').textContent = detailedData.yearLength;
    }

    animateToPlanetView(targetPos, lookAt) {
        const startPos = this.camera.position.clone();
        const startTarget = this.controls.target.clone();
        const duration = 1500;
        const startTime = performance.now();

        const animate = () => {
            const elapsed = performance.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const t = this.easeInOutCubic(progress);

            this.camera.position.lerpVectors(startPos, targetPos, t);
            this.controls.target.lerpVectors(startTarget, lookAt, t);

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                // Enable limited controls for planet view
                this.controls.enabled = true;
                this.controls.minDistance = 2;
                this.controls.maxDistance = 15;
                this.controls.target.copy(lookAt);
            }
        };

        animate();
    }

    updatePlanetView(deltaTime) {
        if (!this.planetViewState.active) return;

        this.planetViewState.orbitTime += deltaTime * 0.2;

        // Slowly rotate the detailed planet
        if (this.detailedPlanetGroup) {
            this.detailedPlanetGroup.children[0].rotation.y += deltaTime * 0.1;
        }
    }

    exitPlanetView() {
        if (!this.planetViewState.active) return;

        this.planetViewState.active = false;

        // Hide planet overlay
        document.getElementById('planet-overlay').classList.remove('active');

        // Remove detailed planet
        if (this.detailedPlanetGroup) {
            this.scene.remove(this.detailedPlanetGroup);
            this.detailedPlanetGroup = null;
        }

        // Animate camera back
        const startPos = this.camera.position.clone();
        const targetPos = this.planetViewState.savedCameraPos;
        const startTarget = this.controls.target.clone();
        const endTarget = this.planetViewState.savedTarget;

        const duration = 1500;
        const startTime = performance.now();

        const animate = () => {
            const elapsed = performance.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const t = this.easeInOutCubic(progress);

            this.camera.position.lerpVectors(startPos, targetPos, t);
            this.controls.target.lerpVectors(startTarget, endTarget, t);

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                this.controls.minDistance = 5;
                this.controls.maxDistance = 100;
            }
        };

        animate();
    }

    startCinematicJourney(type) {
        if (this.cinematicState.active) return;

        const state = this.cinematicState;
        state.active = true;
        state.progress = 0;
        state.phase = 0;
        state.journeyType = type;

        // Save current camera state
        state.savedCameraPos.copy(this.camera.position);
        state.savedTarget.copy(this.controls.target);
        state.startPosition.copy(this.camera.position);
        state.startTarget.copy(this.controls.target);

        // Disable orbit controls during journey
        this.controls.enabled = false;

        // Show journey overlay
        const overlay = document.getElementById('journey-overlay');
        overlay.classList.add('active');

        // Hide controls panel
        document.getElementById('controls').classList.add('hidden');

        // Update UI for first phase
        const phases = type === 'solar' ? this.solarJourneyPhases : this.blackHoleJourneyPhases;
        this.updateJourneyUI(phases[0]);
    }

    updateCinematicJourney(deltaTime) {
        if (!this.cinematicState.active) return;

        const state = this.cinematicState;
        const phases = state.journeyType === 'solar' ? this.solarJourneyPhases : this.blackHoleJourneyPhases;

        // Update progress
        state.progress += deltaTime;

        // Calculate total duration up to current phase
        let phaseStart = 0;
        for (let i = 0; i < state.phase; i++) {
            phaseStart += phases[i].duration;
        }
        const phaseDuration = phases[state.phase].duration;
        const phaseProgress = (state.progress - phaseStart) / phaseDuration;

        // Check phase transition
        if (phaseProgress >= 1 && state.phase < phases.length - 1) {
            state.phase++;
            this.updateJourneyUI(phases[state.phase]);
        }

        // Calculate camera path based on journey type
        if (state.journeyType === 'solar') {
            this.updateSolarJourney(state, phases, easeInOutCubic);
        } else {
            this.updateBlackHoleJourney(state, phases, easeInOutCubic);
        }

        // Update distance display
        this.updateDistanceDisplay(state);

        // Check if journey complete
        const totalDuration = phases.reduce((sum, p) => sum + p.duration, 0);
        if (state.progress >= totalDuration) {
            this.completeCinematicJourney();
        }
    }

    updateSolarJourney(state, phases, ease) {
        const totalDuration = phases.reduce((sum, p) => sum + p.duration, 0);
        const overallProgress = ease(Math.min(state.progress / totalDuration, 1));

        const targetPos = this.solarSystemPosition.clone();

        // Camera path - smooth transition
        const startPos = state.startPosition;

        // Intermediate waypoints for cinematic effect
        const waypoint1 = new THREE.Vector3(
            startPos.x * 0.5 + targetPos.x * 0.5,
            startPos.y * 0.3 + 100,
            startPos.z * 0.5 + targetPos.z * 0.5
        );

        const waypoint2 = targetPos.clone().add(new THREE.Vector3(0, 30, 50));
        const finalPos = targetPos.clone().add(new THREE.Vector3(0, 15, 35));

        // Bezier-like interpolation
        let cameraPos;
        if (overallProgress < 0.3) {
            const t = overallProgress / 0.3;
            cameraPos = startPos.clone().lerp(waypoint1, ease(t));
        } else if (overallProgress < 0.7) {
            const t = (overallProgress - 0.3) / 0.4;
            cameraPos = waypoint1.clone().lerp(waypoint2, ease(t));
        } else {
            const t = (overallProgress - 0.7) / 0.3;
            cameraPos = waypoint2.clone().lerp(finalPos, ease(t));
        }

        this.camera.position.copy(cameraPos);

        // Target follows smoothly
        const targetLook = state.startTarget.clone().lerp(targetPos, ease(overallProgress));
        this.controls.target.copy(targetLook);
        this.camera.lookAt(targetLook);

        // Scale up solar system as we approach
        if (overallProgress > 0.5) {
            this.solarMarker.visible = false;
            const scaleProgress = (overallProgress - 0.5) / 0.5;
            const scale = 0.001 + ease(scaleProgress) * 0.999;

            // Use detailed solar system if available
            if (this.useDetailedSolarSystem && this.detailedSolarSystem && this.detailedSolarSystem.initialized) {
                this.solarSystem.visible = false; // Hide basic solar system
                this.detailedSolarSystem.show();
                this.detailedSolarSystem.setScale(scale);
            } else {
                this.solarSystem.visible = true;
                this.solarSystem.scale.setScalar(scale);
            }
        }
    }

    updateBlackHoleJourney(state, phases, ease) {
        const totalDuration = phases.reduce((sum, p) => sum + p.duration, 0);
        const overallProgress = ease(Math.min(state.progress / totalDuration, 1));

        const targetPos = new THREE.Vector3(0, 0, 0); // Black hole at center

        const startPos = state.startPosition;
        const waypoint1 = new THREE.Vector3(startPos.x * 0.3, startPos.y * 0.5 + 50, startPos.z * 0.3);
        const waypoint2 = new THREE.Vector3(15, 8, 20);
        const finalPos = new THREE.Vector3(8, 3, 12);

        let cameraPos;
        if (overallProgress < 0.3) {
            const t = overallProgress / 0.3;
            cameraPos = startPos.clone().lerp(waypoint1, ease(t));
        } else if (overallProgress < 0.7) {
            const t = (overallProgress - 0.3) / 0.4;
            cameraPos = waypoint1.clone().lerp(waypoint2, ease(t));
        } else {
            const t = (overallProgress - 0.7) / 0.3;
            cameraPos = waypoint2.clone().lerp(finalPos, ease(t));
        }

        this.camera.position.copy(cameraPos);

        const targetLook = state.startTarget.clone().lerp(targetPos, ease(overallProgress));
        this.controls.target.copy(targetLook);
        this.camera.lookAt(targetLook);
    }

    updateJourneyUI(phase) {
        const title = document.getElementById('journey-title');
        const sub = document.getElementById('journey-sub');

        // Fade out
        title.classList.remove('visible');
        sub.classList.remove('visible');

        setTimeout(() => {
            title.textContent = phase.title;
            sub.textContent = phase.subtitle;

            // Fade in
            title.classList.add('visible');
            sub.classList.add('visible');
        }, 500);
    }

    updateDistanceDisplay(state) {
        const distEl = document.getElementById('journey-dist');

        if (state.journeyType === 'solar') {
            // Calculate approximate distance (26,000 ly journey)
            const totalDuration = this.solarJourneyPhases.reduce((sum, p) => sum + p.duration, 0);
            const remaining = Math.max(0, 26000 * (1 - state.progress / totalDuration));
            distEl.textContent = remaining > 1 ? `${Math.round(remaining).toLocaleString()} ly` : 'Arrived';
        } else {
            // Distance to black hole
            const dist = this.camera.position.length();
            distEl.textContent = dist > 10 ? `${Math.round(dist * 500).toLocaleString()} ly` : 'At center';
        }

        distEl.classList.add('visible');
    }

    completeCinematicJourney() {
        const state = this.cinematicState;
        state.active = false;

        // Hide journey overlay
        const overlay = document.getElementById('journey-overlay');
        overlay.classList.remove('active');
        document.getElementById('journey-title').classList.remove('visible');
        document.getElementById('journey-sub').classList.remove('visible');
        document.getElementById('journey-dist').classList.remove('visible');

        // Re-enable controls with new constraints
        this.controls.enabled = true;

        if (state.journeyType === 'solar') {
            this.controls.minDistance = 5;
            this.controls.maxDistance = 100;
            this.controls.target.copy(this.solarSystemPosition);
        } else {
            this.controls.minDistance = 5;
            this.controls.maxDistance = 50;
            this.controls.target.set(0, 0, 0);
        }

        // Show return button
        document.getElementById('btn-return').style.display = 'block';

        this.controls.update();
    }

    returnToGalaxy() {
        const state = this.cinematicState;

        // Hide solar system
        if (this.solarSystem) {
            this.solarSystem.visible = false;
            this.solarSystem.scale.set(0.001, 0.001, 0.001);
        }
        // Hide detailed solar system
        if (this.detailedSolarSystem) {
            this.detailedSolarSystem.hide();
            this.detailedSolarSystem.setScale(0.001);
        }
        if (this.solarMarker) {
            this.solarMarker.visible = true;
        }

        // Animate camera back
        const startPos = this.camera.position.clone();
        const targetPos = state.savedCameraPos;
        const startTarget = this.controls.target.clone();
        const endTarget = state.savedTarget;

        const duration = 2000;
        const startTime = performance.now();

        const animateReturn = () => {
            const elapsed = performance.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const t = easeInOutCubic(progress);

            this.camera.position.lerpVectors(startPos, targetPos, t);
            this.controls.target.lerpVectors(startTarget, endTarget, t);

            if (progress < 1) {
                requestAnimationFrame(animateReturn);
            } else {
                // Restore control limits
                this.controls.minDistance = 30;
                this.controls.maxDistance = 800;
                this.controls.update();

                // Hide return button
                document.getElementById('btn-return').style.display = 'none';

                // Show controls panel
                document.getElementById('controls').classList.remove('hidden');
            }
        };

        animateReturn();
    }

    setupPostProcessing() {
        // Effect composer for bloom
        this.composer = new EffectComposer(this.renderer);

        const renderPass = new RenderPass(this.scene, this.camera);
        this.composer.addPass(renderPass);

        // Bloom pass for realistic star glow
        const bloomPass = new UnrealBloomPass(
            new THREE.Vector2(window.innerWidth, window.innerHeight),
            0.8,   // Strength
            0.4,   // Radius
            0.2    // Threshold
        );
        this.composer.addPass(bloomPass);
        this.bloomPass = bloomPass;
    }

    onResize() {
        const width = window.innerWidth;
        const height = window.innerHeight;

        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();

        this.renderer.setSize(width, height);
        this.composer.setSize(width, height);
    }

    setupControls() {
        const self = this;

        // Speed control
        const speedSlider = document.getElementById('speed');
        const speedVal = document.getElementById('speed-val');
        speedSlider.addEventListener('input', function() {
            self.speedMultiplier = parseFloat(this.value);
            self.uniforms.speedMultiplier.value = self.speedMultiplier;
            speedVal.textContent = this.value + 'x';
        });

        // Brightness control
        const brightnessSlider = document.getElementById('brightness');
        const brightnessVal = document.getElementById('brightness-val');
        brightnessSlider.addEventListener('input', function() {
            self.uniforms.globalBrightness.value = parseFloat(this.value);
            brightnessVal.textContent = Math.round(this.value * 100) + '%';
        });

        // Bloom control
        const bloomSlider = document.getElementById('bloom');
        const bloomVal = document.getElementById('bloom-val');
        bloomSlider.addEventListener('input', function() {
            self.bloomPass.strength = parseFloat(this.value);
            bloomVal.textContent = this.value;
        });

        // Core glow control
        const coreSlider = document.getElementById('core');
        const coreVal = document.getElementById('core-val');
        coreSlider.addEventListener('input', function() {
            self.uniforms.coreGlow.value = parseFloat(this.value);
            coreVal.textContent = Math.round(this.value * 100) + '%';
        });

        // Time scale control
        const timeSlider = document.getElementById('timescale');
        const timeVal = document.getElementById('time-val');
        timeSlider.addEventListener('input', function() {
            self.timeScale = parseFloat(this.value);
            timeVal.textContent = this.value + 'x';
        });

        // Play/Pause buttons
        const btnPlay = document.getElementById('btn-play');
        const btnPause = document.getElementById('btn-pause');

        btnPlay.addEventListener('click', function() {
            self.isPaused = false;
            btnPlay.classList.add('active');
            btnPause.classList.remove('active');
        });

        btnPause.addEventListener('click', function() {
            self.isPaused = true;
            btnPause.classList.add('active');
            btnPlay.classList.remove('active');
        });

        // Auto-rotate button
        const btnAutorotate = document.getElementById('btn-autorotate');
        btnAutorotate.addEventListener('click', function() {
            self.controls.autoRotate = !self.controls.autoRotate;
            this.classList.toggle('active');
        });

        // Reset view button
        const btnReset = document.getElementById('btn-reset');
        btnReset.addEventListener('click', function() {
            self.camera.position.set(0, 150, 250);
            self.controls.target.set(0, 0, 0);
            self.controls.update();
        });

        // Top view button
        const btnTop = document.getElementById('btn-top');
        btnTop.addEventListener('click', function() {
            self.camera.position.set(0, 350, 0.1);
            self.controls.target.set(0, 0, 0);
            self.controls.update();
        });

        // Side view button
        const btnSide = document.getElementById('btn-side');
        btnSide.addEventListener('click', function() {
            self.camera.position.set(350, 10, 0);
            self.controls.target.set(0, 0, 0);
            self.controls.update();
        });

        // Toggle panel button
        const togglePanel = document.getElementById('toggle-panel');
        const controlsPanel = document.getElementById('controls');
        togglePanel.addEventListener('click', function() {
            controlsPanel.classList.remove('hidden');
        });

        // Close panel with Escape key
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                controlsPanel.classList.add('hidden');
            }
            if (e.key === ' ') {
                e.preventDefault();
                self.isPaused = !self.isPaused;
                if (self.isPaused) {
                    btnPause.classList.add('active');
                    btnPlay.classList.remove('active');
                } else {
                    btnPlay.classList.add('active');
                    btnPause.classList.remove('active');
                }
            }
        });

        // Controls header - toggle compact mode
        const controlsHeader = document.getElementById('controls-header');
        controlsHeader.addEventListener('click', function() {
            controlsPanel.classList.toggle('compact');
        });

        // Cinematic Tour button
        const btnTour = document.getElementById('btn-tour');
        btnTour.addEventListener('click', function() {
            self.startCinematicTour();
        });

        // Compact tour button
        const btnTourCompact = document.getElementById('btn-tour-compact');
        if (btnTourCompact) {
            btnTourCompact.addEventListener('click', function() {
                self.startCinematicTour();
            });
        }

        // Solar System journey button
        const btnSolar = document.getElementById('btn-solar');
        btnSolar.addEventListener('click', function() {
            self.startCinematicJourney('solar');
        });

        // Compact solar button
        const btnSolarCompact = document.getElementById('btn-solar-compact');
        if (btnSolarCompact) {
            btnSolarCompact.addEventListener('click', function() {
                self.startCinematicJourney('solar');
            });
        }

        // Black Hole journey button
        const btnBlackhole = document.getElementById('btn-blackhole');
        btnBlackhole.addEventListener('click', function() {
            self.startCinematicJourney('blackhole');
        });

        // Compact black hole button
        const btnBlackholeCompact = document.getElementById('btn-blackhole-compact');
        if (btnBlackholeCompact) {
            btnBlackholeCompact.addEventListener('click', function() {
                self.startCinematicJourney('blackhole');
            });
        }

        // Return to galaxy button
        const btnReturn = document.getElementById('btn-return');
        btnReturn.addEventListener('click', function() {
            // Check if in tour mode, merger mode, supernova mode, or journey mode
            if (self.tourState.active) {
                self.stopCinematicTour();
            } else if (self.mergerState.active) {
                self.stopMergerSimulation();
            } else if (self.supernovaState.active) {
                self.stopSupernovaSimulation();
            } else {
                self.returnToGalaxy();
            }
        });

        // Galaxy Merger button
        const btnMerger = document.getElementById('btn-merger');
        if (btnMerger) {
            btnMerger.addEventListener('click', function() {
                self.startMergerSimulation();
            });
        }

        // Compact merger button
        const btnMergerCompact = document.getElementById('btn-merger-compact');
        if (btnMergerCompact) {
            btnMergerCompact.addEventListener('click', function() {
                self.startMergerSimulation();
            });
        }

        // Supernova button
        const btnSupernova = document.getElementById('btn-supernova');
        console.log('btn-supernova element:', btnSupernova);
        if (btnSupernova) {
            btnSupernova.addEventListener('click', function() {
                console.log('Supernova button clicked!');
                self.startSupernovaSimulation();
            });
        }

        // Compact supernova button
        const btnSupernovaCompact = document.getElementById('btn-supernova-compact');
        if (btnSupernovaCompact) {
            btnSupernovaCompact.addEventListener('click', function() {
                self.startSupernovaSimulation();
            });
        }

        // Sound toggle button
        const btnSound = document.getElementById('btn-sound');
        const volumeSlider = document.getElementById('volume');
        const volumeVal = document.getElementById('volume-val');
        const soundVolume = document.querySelector('.sound-volume');

        if (btnSound) {
            btnSound.addEventListener('click', async function() {
                if (self.audioManager.isEnabled) {
                    self.audioManager.disable();
                    btnSound.classList.remove('active');
                    btnSound.innerHTML = '🔊 Enable Sound';
                    if (soundVolume) soundVolume.style.display = 'none';
                } else {
                    await self.audioManager.enable();
                    btnSound.classList.add('active');
                    btnSound.innerHTML = '🔇 Mute Sound';
                    if (soundVolume) soundVolume.style.display = 'block';
                }
            });
        }

        // Compact sound button
        const btnSoundCompact = document.getElementById('btn-sound-compact');
        if (btnSoundCompact) {
            btnSoundCompact.addEventListener('click', async function() {
                if (self.audioManager.isEnabled) {
                    self.audioManager.disable();
                    btnSoundCompact.innerHTML = '🔊';
                    btnSoundCompact.classList.remove('active');
                    if (btnSound) {
                        btnSound.classList.remove('active');
                        btnSound.innerHTML = '🔊 Enable Sound';
                    }
                } else {
                    await self.audioManager.enable();
                    btnSoundCompact.innerHTML = '🔇';
                    btnSoundCompact.classList.add('active');
                    if (btnSound) {
                        btnSound.classList.add('active');
                        btnSound.innerHTML = '🔇 Mute Sound';
                    }
                }
            });
        }

        // Volume slider
        if (volumeSlider) {
            volumeSlider.addEventListener('input', function() {
                const vol = parseInt(this.value) / 100;
                self.audioManager.setVolume(vol);
                if (volumeVal) volumeVal.textContent = this.value + '%';
            });
        }
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        const now = performance.now();
        const deltaTime = (now - this.lastFrameTime) / 1000;
        this.lastFrameTime = now;

        // FPS calculation
        this.frameCount++;
        if (now - this.fpsUpdateTime > 500) {
            const fps = Math.round(this.frameCount / ((now - this.fpsUpdateTime) / 1000));
            document.getElementById('fps-val').textContent = fps;
            this.frameCount = 0;
            this.fpsUpdateTime = now;
        }

        // Calculate camera velocity for audio
        this.cameraVelocity = this.camera.position.distanceTo(this.lastCameraPos) / deltaTime;
        this.lastCameraPos.copy(this.camera.position);

        // Update simulation time (unless paused)
        if (!this.isPaused) {
            this.simulationTime += deltaTime * this.timeScale;
        }
        this.uniforms.time.value = this.simulationTime;

        // Update rotation display (degrees)
        const rotationDegrees = Math.round((this.simulationTime * this.speedMultiplier * 0.15 * 180 / Math.PI) % 360);
        document.getElementById('rotation-val').textContent = rotationDegrees + '°';

        // Update cinematic journey if active
        this.updateCinematicJourney(deltaTime);

        // Update cinematic tour if active
        this.updateCinematicTour(deltaTime);

        // Update galaxy merger simulation if active
        this.updateMergerSimulation(deltaTime);

        // Update supernova simulation if active
        this.updateSupernovaSimulation(deltaTime);

        // Update solar system planet orbits
        this.updateSolarSystem();

        // Update detailed solar system if visible
        if (this.detailedSolarSystem && this.detailedSolarSystem.visible) {
            this.detailedSolarSystem.update(this.simulationTime, deltaTime);
        }

        // Update planet view if active
        this.updatePlanetView(deltaTime);

        // Update controls (only if not in cinematic mode, tour mode, merger mode, or supernova mode)
        if (!this.cinematicState.active && !this.tourState.active && !this.planetViewState.active && !this.mergerState.active && !this.supernovaState.active) {
            this.controls.update();
        }

        // Make black hole plane face camera
        if (this.blackHolePlane) {
            this.blackHolePlane.lookAt(this.camera.position);
        }

        // Update audio (if not in tour mode, tour handles its own audio)
        if (this.audioManager.isEnabled && !this.tourState.active) {
            this.audioManager.update(
                this.camera.position,
                this.cameraVelocity,
                null,
                deltaTime
            );
        }

        // Render with post-processing
        this.composer.render();
    }
}
