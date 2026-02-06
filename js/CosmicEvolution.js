// ============================================================
// COSMIC EVOLUTION - Big Bang to Heat Death Visualization
// ============================================================
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

// ============================================================
// EPOCH DATA
// ============================================================
const EPOCHS = [
    {
        id: 0,
        name: 'The Singularity',
        timeLabel: 't = 0',
        timeSeconds: 0,
        temperature: 1e32,
        tempLabel: '~10\u00b3\u00b2 K',
        description: 'All matter, energy, space and time compressed into an infinitely dense point. The laws of physics as we know them break down.',
        bloomStrength: 3.5,
        bloomRadius: 1.0,
        bloomThreshold: 0.0,
        cameraPos: [0, 0, 8],
        cameraTarget: [0, 0, 0],
        timelinePos: 0.0,
    },
    {
        id: 1,
        name: 'Inflation',
        timeLabel: '10\u207B\u00b3\u00b6 \u2013 10\u207B\u00b3\u00b2 sec',
        timeSeconds: 1e-34,
        temperature: 1e28,
        tempLabel: '~10\u00b2\u2078 K',
        description: 'Spacetime expands exponentially by a factor of 10\u00b2\u2076 in a fraction of a second. Quantum fluctuations are stretched to cosmic scales, seeding future structure.',
        bloomStrength: 3.0,
        bloomRadius: 0.8,
        bloomThreshold: 0.0,
        cameraPos: [0, 0, 30],
        cameraTarget: [0, 0, 0],
        timelinePos: 0.06,
    },
    {
        id: 2,
        name: 'Quark-Gluon Plasma',
        timeLabel: '10\u207B\u00b9\u00b2 seconds',
        timeSeconds: 1e-12,
        temperature: 1e16,
        tempLabel: '~10\u00b9\u2076 K',
        description: 'A super-hot soup of quarks and gluons. Too energetic for protons or neutrons to form. The universe is a roiling sea of fundamental particles.',
        bloomStrength: 2.0,
        bloomRadius: 0.6,
        bloomThreshold: 0.1,
        cameraPos: [0, 3, 35],
        cameraTarget: [0, 0, 0],
        timelinePos: 0.14,
    },
    {
        id: 3,
        name: 'First Atoms',
        timeLabel: '380,000 years',
        timeSeconds: 1.2e13,
        temperature: 3000,
        tempLabel: '~3,000 K',
        description: 'The universe cools enough for electrons to bind with nuclei, forming neutral hydrogen. Photons stream free \u2014 this light is now the Cosmic Microwave Background.',
        bloomStrength: 1.2,
        bloomRadius: 0.5,
        bloomThreshold: 0.2,
        cameraPos: [0, 5, 45],
        cameraTarget: [0, 0, 0],
        timelinePos: 0.24,
    },
    {
        id: 4,
        name: 'The Dark Ages',
        timeLabel: '380,000 \u2013 150 million years',
        timeSeconds: 4.7e15,
        temperature: 60,
        tempLabel: '~60 K',
        description: 'No stars, no light. The universe is filled with neutral hydrogen gas, slowly cooling. Gravity works in darkness, pulling matter into the first dense clumps.',
        bloomStrength: 0.3,
        bloomRadius: 0.3,
        bloomThreshold: 0.6,
        cameraPos: [0, 8, 55],
        cameraTarget: [0, 0, 0],
        timelinePos: 0.34,
    },
    {
        id: 5,
        name: 'First Stars',
        timeLabel: '~150 million years',
        timeSeconds: 4.73e15,
        temperature: 30,
        tempLabel: '~30 K (IGM)',
        description: 'Population III stars ignite \u2014 massive, metal-free behemoths hundreds of times the Sun\u2019s mass. They burn hot and blue, ending the cosmic dark ages and reionizing the universe.',
        bloomStrength: 1.5,
        bloomRadius: 0.5,
        bloomThreshold: 0.15,
        cameraPos: [10, 12, 60],
        cameraTarget: [0, 0, 0],
        timelinePos: 0.42,
    },
    {
        id: 6,
        name: 'First Galaxies',
        timeLabel: '~500 million years',
        timeSeconds: 1.58e16,
        temperature: 20,
        tempLabel: '~20 K (IGM)',
        description: 'Stars cluster into small, irregular proto-galaxies. Gravity gathers the first structures. These building blocks will merge over billions of years into the galaxies we see today.',
        bloomStrength: 1.0,
        bloomRadius: 0.5,
        bloomThreshold: 0.2,
        cameraPos: [15, 20, 70],
        cameraTarget: [0, 0, 0],
        timelinePos: 0.50,
    },
    {
        id: 7,
        name: 'The Cosmic Web',
        timeLabel: '1 \u2013 2 billion years',
        timeSeconds: 4.7e16,
        temperature: 10,
        tempLabel: '~10 K (IGM)',
        description: 'Dark matter filaments weave a vast cosmic web spanning billions of light-years. Galaxies cluster along these filaments, with enormous voids between them.',
        bloomStrength: 0.8,
        bloomRadius: 0.6,
        bloomThreshold: 0.25,
        cameraPos: [0, 40, 100],
        cameraTarget: [0, 0, 0],
        timelinePos: 0.60,
    },
    {
        id: 8,
        name: 'Galaxy Evolution',
        timeLabel: '2 \u2013 10 billion years',
        timeSeconds: 2.5e17,
        temperature: 4,
        tempLabel: '~4 K (CMB)',
        description: 'Galaxies merge, grow, and evolve. Spirals develop grand arms, ellipticals swell from collisions. Star formation peaks around 10 billion years ago \u2014 the cosmic noon.',
        bloomStrength: 1.0,
        bloomRadius: 0.4,
        bloomThreshold: 0.2,
        cameraPos: [20, 15, 50],
        cameraTarget: [0, 0, 0],
        timelinePos: 0.72,
    },
    {
        id: 9,
        name: 'The Present Day',
        timeLabel: '13.8 billion years',
        timeSeconds: 4.35e17,
        temperature: 2.725,
        tempLabel: '2.725 K',
        description: 'The Milky Way: a barred spiral galaxy, 100,000 light-years across, home to 200\u2013400 billion stars. Our Sun is one unremarkable star in the Orion Arm.',
        bloomStrength: 1.2,
        bloomRadius: 0.4,
        bloomThreshold: 0.15,
        cameraPos: [25, 12, 45],
        cameraTarget: [0, 0, 0],
        timelinePos: 0.85,
    },
    {
        id: 10,
        name: 'The Far Future',
        timeLabel: 'Trillions of years',
        timeSeconds: 1e20,
        temperature: 0.0001,
        tempLabel: '~0 K',
        description: 'Stars exhaust their fuel and die. Galaxies drift apart in the accelerating expansion. Red dwarfs are the last to fade. Eventually, only darkness and cold remain \u2014 the heat death of the universe.',
        bloomStrength: 0.15,
        bloomRadius: 0.3,
        bloomThreshold: 0.8,
        cameraPos: [0, 5, 60],
        cameraTarget: [0, 0, 0],
        timelinePos: 1.0,
    },
];

// ============================================================
// SHADER LIBRARY
// ============================================================

// --- Singularity ---
const singularityVert = `
    uniform float uTime;
    uniform float uPulse;
    varying vec2 vUv;
    varying float vIntensity;
    void main() {
        vUv = uv;
        float pulse = 1.0 + 0.15 * sin(uTime * 3.0) + 0.08 * sin(uTime * 7.3);
        vIntensity = pulse;
        vec3 pos = position * pulse;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
`;
const singularityFrag = `
    uniform float uTime;
    varying vec2 vUv;
    varying float vIntensity;
    void main() {
        vec2 c = vUv - 0.5;
        float d = length(c);
        float core = exp(-d * d * 80.0) * 3.0;
        float glow = exp(-d * d * 8.0) * 1.2;
        float rays = exp(-d * d * 3.0) * 0.4;
        float flicker = 1.0 + 0.15 * sin(uTime * 5.0 + d * 20.0);
        float ring = exp(-pow(d - 0.12, 2.0) * 600.0) * 0.8 * sin(uTime * 2.0 + 3.14);
        float intensity = (core + glow + rays + ring) * flicker * vIntensity;
        vec3 col = vec3(1.0, 0.98, 0.95) * core +
                   vec3(1.0, 0.9, 0.7) * glow +
                   vec3(0.8, 0.7, 1.0) * rays;
        gl_FragColor = vec4(col * intensity, intensity);
    }
`;

// --- Generic particle shaders ---
const particleVert = `
    attribute float aSize;
    attribute vec3 aColor;
    attribute float aAlpha;
    uniform float uTime;
    uniform float uPixelRatio;
    uniform float uSizeScale;
    varying vec3 vColor;
    varying float vAlpha;
    void main() {
        vColor = aColor;
        vAlpha = aAlpha;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = aSize * uSizeScale * uPixelRatio * (300.0 / -mv.z);
        gl_PointSize = clamp(gl_PointSize, 0.5, 80.0);
        gl_Position = projectionMatrix * mv;
    }
`;

const particleFrag = `
    varying vec3 vColor;
    varying float vAlpha;
    void main() {
        vec2 c = gl_PointCoord - 0.5;
        float d = length(c);
        float intensity = exp(-d * d * 8.0);
        float core = exp(-d * d * 32.0) * 0.5;
        intensity += core;
        if (intensity < 0.01) discard;
        gl_FragColor = vec4(vColor * intensity, intensity * vAlpha);
    }
`;

// --- Cosmic web filament shader ---
const filamentVert = `
    attribute float aIntensity;
    varying float vI;
    void main() {
        vI = aIntensity;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mv;
    }
`;
const filamentFrag = `
    varying float vI;
    uniform vec3 uColor;
    void main() {
        gl_FragColor = vec4(uColor * vI, vI * 0.6);
    }
`;

// --- Spiral galaxy disk shader ---
const galaxyDiskVert = `
    attribute float aSize;
    attribute vec3 aColor;
    attribute float aAngle;
    attribute float aRadius;
    attribute float aBrightness;
    uniform float uTime;
    uniform float uPixelRatio;
    varying vec3 vColor;
    varying float vBright;
    void main() {
        vColor = aColor;
        vBright = aBrightness;
        float angle = aAngle + uTime * 0.3 / (1.0 + aRadius * 0.05);
        float r = aRadius;
        vec3 pos = vec3(cos(angle) * r, position.y, sin(angle) * r);
        vec4 mv = modelViewMatrix * vec4(pos, 1.0);
        gl_PointSize = aSize * uPixelRatio * (300.0 / -mv.z);
        gl_PointSize = clamp(gl_PointSize, 0.5, 50.0);
        gl_Position = projectionMatrix * mv;
    }
`;
const galaxyDiskFrag = `
    varying vec3 vColor;
    varying float vBright;
    void main() {
        vec2 c = gl_PointCoord - 0.5;
        float d = length(c);
        float intensity = exp(-d * d * 8.0);
        float core = exp(-d * d * 32.0) * 0.4;
        intensity += core;
        if (intensity < 0.01) discard;
        gl_FragColor = vec4(vColor * intensity * vBright, intensity * vBright);
    }
`;


// ============================================================
// MAIN CLASS
// ============================================================
export class CosmicEvolution {
    constructor() {
        this.currentEpoch = 0;
        this.targetEpoch = 0;
        this.epochProgress = 0;       // 0-1 progress within current epoch
        this.transitionProgress = 1;   // 1 = fully arrived
        this.isPlaying = false;
        this.playSpeed = 1.0;
        this.time = 0;
        this.epochMeshes = [];         // array of groups, one per epoch
        this.particleSystems = [];

        this._initScene();
        this._initPostProcessing();
        this._buildAllEpochs();
        this._initUI();
        this._initKeyboard();
        this._showEpoch(0, true);
        this._hideLoading();
        this._animate();
    }

    // ----------------------------------------------------------
    // SCENE SETUP
    // ----------------------------------------------------------
    _initScene() {
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.0;
        document.getElementById('canvas-container').appendChild(this.renderer.domElement);

        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x000000);

        this.camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 5000);
        this.camera.position.set(0, 0, 8);

        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.06;
        this.controls.minDistance = 2;
        this.controls.maxDistance = 300;
        this.controls.enablePan = false;

        window.addEventListener('resize', () => this._onResize());

        // Clock
        this.clock = new THREE.Clock();
    }

    _onResize() {
        const w = window.innerWidth, h = window.innerHeight;
        this.camera.aspect = w / h;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(w, h);
        this.composer.setSize(w, h);
    }

    // ----------------------------------------------------------
    // POST-PROCESSING
    // ----------------------------------------------------------
    _initPostProcessing() {
        this.composer = new EffectComposer(this.renderer);
        this.renderPass = new RenderPass(this.scene, this.camera);
        this.composer.addPass(this.renderPass);

        this.bloomPass = new UnrealBloomPass(
            new THREE.Vector2(window.innerWidth, window.innerHeight),
            3.5, 1.0, 0.0
        );
        this.composer.addPass(this.bloomPass);
    }

    _setBloom(strength, radius, threshold) {
        this.bloomPass.strength = strength;
        this.bloomPass.radius = radius;
        this.bloomPass.threshold = threshold;
    }

    // ----------------------------------------------------------
    // BUILD EPOCH VISUALS
    // ----------------------------------------------------------
    _buildAllEpochs() {
        for (let i = 0; i <= 10; i++) {
            const group = new THREE.Group();
            group.visible = false;
            this.scene.add(group);
            this.epochMeshes.push(group);
        }

        this._buildSingularity();    // 0
        this._buildInflation();       // 1
        this._buildQuarkGluon();      // 2
        this._buildFirstAtoms();      // 3
        this._buildDarkAges();        // 4
        this._buildFirstStars();      // 5
        this._buildFirstGalaxies();   // 6
        this._buildCosmicWeb();       // 7
        this._buildGalaxyEvolution(); // 8
        this._buildPresentDay();      // 9
        this._buildFarFuture();       // 10
    }

    // --- 0: SINGULARITY ---
    _buildSingularity() {
        const g = this.epochMeshes[0];
        // Central bright point
        const plane = new THREE.PlaneGeometry(3, 3);
        this.singularityMat = new THREE.ShaderMaterial({
            vertexShader: singularityVert,
            fragmentShader: singularityFrag,
            uniforms: {
                uTime: { value: 0 },
                uPulse: { value: 1 },
            },
            transparent: true,
            depthWrite: false,
            side: THREE.DoubleSide,
            blending: THREE.AdditiveBlending,
        });
        const mesh = new THREE.Mesh(plane, this.singularityMat);
        g.add(mesh);
        // Also add a second plane rotated 90 degrees for depth
        const mesh2 = new THREE.Mesh(plane.clone(), this.singularityMat);
        mesh2.rotation.y = Math.PI / 2;
        g.add(mesh2);
    }

    // --- 1: INFLATION ---
    _buildInflation() {
        const g = this.epochMeshes[1];
        const count = 80000;
        const positions = new Float32Array(count * 3);
        const colors = new Float32Array(count * 3);
        const sizes = new Float32Array(count);
        const alphas = new Float32Array(count);

        for (let i = 0; i < count; i++) {
            // Particles start clustered at center, expand outward
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            const r = Math.pow(Math.random(), 0.3) * 20;
            positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
            positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
            positions[i * 3 + 2] = r * Math.cos(phi);

            // Quantum fluctuation color variations
            const heat = 0.7 + Math.random() * 0.3;
            colors[i * 3] = heat;
            colors[i * 3 + 1] = heat * (0.85 + Math.random() * 0.15);
            colors[i * 3 + 2] = heat * (0.7 + Math.random() * 0.3);

            sizes[i] = 1.0 + Math.random() * 3.0;
            alphas[i] = 0.3 + Math.random() * 0.7;
        }

        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geo.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));
        geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
        geo.setAttribute('aAlpha', new THREE.BufferAttribute(alphas, 1));

        this.inflationMat = new THREE.ShaderMaterial({
            vertexShader: particleVert,
            fragmentShader: particleFrag,
            uniforms: {
                uTime: { value: 0 },
                uPixelRatio: { value: this.renderer.getPixelRatio() },
                uSizeScale: { value: 1.0 },
            },
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
        });

        const points = new THREE.Points(geo, this.inflationMat);
        g.add(points);
        this._inflationPositionsOrig = positions.slice();
        this._inflationPoints = points;
    }

    // --- 2: QUARK-GLUON PLASMA ---
    _buildQuarkGluon() {
        const g = this.epochMeshes[2];
        const count = 120000;
        const positions = new Float32Array(count * 3);
        const colors = new Float32Array(count * 3);
        const sizes = new Float32Array(count);
        const alphas = new Float32Array(count);
        this._qgpVelocities = new Float32Array(count * 3);

        for (let i = 0; i < count; i++) {
            const r = Math.pow(Math.random(), 0.5) * 25;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
            positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
            positions[i * 3 + 2] = r * Math.cos(phi);

            // White-hot to orange
            const t = Math.random();
            colors[i * 3] = 1.0;
            colors[i * 3 + 1] = 0.6 + t * 0.4;
            colors[i * 3 + 2] = 0.3 + t * 0.7;

            sizes[i] = 0.5 + Math.random() * 1.5;
            alphas[i] = 0.4 + Math.random() * 0.6;

            // Brownian velocity
            this._qgpVelocities[i * 3] = (Math.random() - 0.5) * 0.3;
            this._qgpVelocities[i * 3 + 1] = (Math.random() - 0.5) * 0.3;
            this._qgpVelocities[i * 3 + 2] = (Math.random() - 0.5) * 0.3;
        }

        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geo.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));
        geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
        geo.setAttribute('aAlpha', new THREE.BufferAttribute(alphas, 1));

        this._qgpMat = new THREE.ShaderMaterial({
            vertexShader: particleVert,
            fragmentShader: particleFrag,
            uniforms: {
                uTime: { value: 0 },
                uPixelRatio: { value: this.renderer.getPixelRatio() },
                uSizeScale: { value: 1.0 },
            },
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
        });

        const points = new THREE.Points(geo, this._qgpMat);
        g.add(points);
        this._qgpPoints = points;
    }

    // --- 3: FIRST ATOMS ---
    _buildFirstAtoms() {
        const g = this.epochMeshes[3];
        const count = 80000;
        const positions = new Float32Array(count * 3);
        const colors = new Float32Array(count * 3);
        const sizes = new Float32Array(count);
        const alphas = new Float32Array(count);
        this._atomVelocities = new Float32Array(count * 3);

        for (let i = 0; i < count; i++) {
            const r = Math.pow(Math.random(), 0.4) * 30;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
            positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
            positions[i * 3 + 2] = r * Math.cos(phi);

            // Orange to red, cooling
            const t = Math.random();
            colors[i * 3] = 0.9 + t * 0.1;
            colors[i * 3 + 1] = 0.25 + t * 0.35;
            colors[i * 3 + 2] = 0.05 + t * 0.15;

            sizes[i] = 0.8 + Math.random() * 2.0;
            alphas[i] = 0.3 + Math.random() * 0.5;

            this._atomVelocities[i * 3] = (Math.random() - 0.5) * 0.06;
            this._atomVelocities[i * 3 + 1] = (Math.random() - 0.5) * 0.06;
            this._atomVelocities[i * 3 + 2] = (Math.random() - 0.5) * 0.06;
        }

        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geo.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));
        geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
        geo.setAttribute('aAlpha', new THREE.BufferAttribute(alphas, 1));

        this._atomMat = new THREE.ShaderMaterial({
            vertexShader: particleVert,
            fragmentShader: particleFrag,
            uniforms: {
                uTime: { value: 0 },
                uPixelRatio: { value: this.renderer.getPixelRatio() },
                uSizeScale: { value: 1.0 },
            },
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
        });

        const points = new THREE.Points(geo, this._atomMat);
        g.add(points);
        this._atomPoints = points;
    }

    // --- 4: DARK AGES ---
    _buildDarkAges() {
        const g = this.epochMeshes[4];
        const count = 50000;
        const positions = new Float32Array(count * 3);
        const colors = new Float32Array(count * 3);
        const sizes = new Float32Array(count);
        const alphas = new Float32Array(count);

        for (let i = 0; i < count; i++) {
            const r = Math.pow(Math.random(), 0.35) * 40;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
            positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
            positions[i * 3 + 2] = r * Math.cos(phi);

            // Very dim, dark reddish-brown
            const t = Math.random();
            colors[i * 3] = 0.08 + t * 0.06;
            colors[i * 3 + 1] = 0.03 + t * 0.03;
            colors[i * 3 + 2] = 0.04 + t * 0.04;

            sizes[i] = 1.0 + Math.random() * 2.5;
            alphas[i] = 0.1 + Math.random() * 0.2;
        }

        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geo.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));
        geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
        geo.setAttribute('aAlpha', new THREE.BufferAttribute(alphas, 1));

        this._darkMat = new THREE.ShaderMaterial({
            vertexShader: particleVert,
            fragmentShader: particleFrag,
            uniforms: {
                uTime: { value: 0 },
                uPixelRatio: { value: this.renderer.getPixelRatio() },
                uSizeScale: { value: 1.0 },
            },
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
        });

        const points = new THREE.Points(geo, this._darkMat);
        g.add(points);
        this._darkPoints = points;
    }

    // --- 5: FIRST STARS ---
    _buildFirstStars() {
        const g = this.epochMeshes[5];
        // Background dim gas
        const bgCount = 30000;
        const bgPos = new Float32Array(bgCount * 3);
        const bgCol = new Float32Array(bgCount * 3);
        const bgSize = new Float32Array(bgCount);
        const bgAlpha = new Float32Array(bgCount);

        for (let i = 0; i < bgCount; i++) {
            const r = Math.pow(Math.random(), 0.35) * 50;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            bgPos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
            bgPos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
            bgPos[i * 3 + 2] = r * Math.cos(phi);
            bgCol[i * 3] = 0.06;
            bgCol[i * 3 + 1] = 0.03;
            bgCol[i * 3 + 2] = 0.05;
            bgSize[i] = 1.0 + Math.random() * 2.0;
            bgAlpha[i] = 0.08 + Math.random() * 0.12;
        }

        const bgGeo = new THREE.BufferGeometry();
        bgGeo.setAttribute('position', new THREE.BufferAttribute(bgPos, 3));
        bgGeo.setAttribute('aColor', new THREE.BufferAttribute(bgCol, 3));
        bgGeo.setAttribute('aSize', new THREE.BufferAttribute(bgSize, 1));
        bgGeo.setAttribute('aAlpha', new THREE.BufferAttribute(bgAlpha, 1));

        const bgMat = new THREE.ShaderMaterial({
            vertexShader: particleVert,
            fragmentShader: particleFrag,
            uniforms: {
                uTime: { value: 0 },
                uPixelRatio: { value: this.renderer.getPixelRatio() },
                uSizeScale: { value: 1.0 },
            },
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
        });
        g.add(new THREE.Points(bgGeo, bgMat));

        // Stars that "ignite"
        const starCount = 50;
        this._firstStarsData = [];
        for (let i = 0; i < starCount; i++) {
            const r = 5 + Math.random() * 40;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            const x = r * Math.sin(phi) * Math.cos(theta);
            const y = r * Math.sin(phi) * Math.sin(theta);
            const z = r * Math.cos(phi);

            const starGeo = new THREE.PlaneGeometry(2.5 + Math.random() * 3, 2.5 + Math.random() * 3);
            const starMat = new THREE.ShaderMaterial({
                vertexShader: `
                    varying vec2 vUv;
                    void main() {
                        vUv = uv;
                        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                    }
                `,
                fragmentShader: `
                    uniform float uBrightness;
                    uniform float uTime;
                    varying vec2 vUv;
                    void main() {
                        vec2 c = vUv - 0.5;
                        float d = length(c);
                        float core = exp(-d * d * 60.0) * 2.0 * uBrightness;
                        float glow = exp(-d * d * 6.0) * 0.8 * uBrightness;
                        float rays = exp(-d * d * 1.5) * 0.2 * uBrightness;
                        float flick = 1.0 + 0.05 * sin(uTime * 3.0 + d * 10.0);
                        float i = (core + glow + rays) * flick;
                        vec3 col = vec3(0.7, 0.8, 1.0) * core +
                                   vec3(0.5, 0.6, 1.0) * glow +
                                   vec3(0.3, 0.4, 0.9) * rays;
                        if (i < 0.005) discard;
                        gl_FragColor = vec4(col, i);
                    }
                `,
                uniforms: {
                    uBrightness: { value: 0 },
                    uTime: { value: 0 },
                },
                transparent: true,
                depthWrite: false,
                side: THREE.DoubleSide,
                blending: THREE.AdditiveBlending,
            });

            const mesh = new THREE.Mesh(starGeo, starMat);
            mesh.position.set(x, y, z);
            mesh.lookAt(this.camera.position);
            g.add(mesh);

            this._firstStarsData.push({
                mesh,
                mat: starMat,
                igniteTime: 0.1 + (i / starCount) * 0.8 + Math.random() * 0.1,
                brightness: 0,
            });
        }
    }

    // --- 6: FIRST GALAXIES ---
    _buildFirstGalaxies() {
        const g = this.epochMeshes[6];
        const clusterCount = 8;
        this._protoGalaxies = [];

        for (let c = 0; c < clusterCount; c++) {
            // Random center position
            const cx = (Math.random() - 0.5) * 60;
            const cy = (Math.random() - 0.5) * 40;
            const cz = (Math.random() - 0.5) * 60;
            const starCount = 4000 + Math.floor(Math.random() * 6000);

            const positions = new Float32Array(starCount * 3);
            const colors = new Float32Array(starCount * 3);
            const sizes = new Float32Array(starCount);
            const alphas = new Float32Array(starCount);

            for (let i = 0; i < starCount; i++) {
                // Irregular distribution around center
                const r = Math.pow(Math.random(), 0.6) * (5 + Math.random() * 8);
                const theta = Math.random() * Math.PI * 2;
                const phi = Math.acos(2 * Math.random() - 1);
                positions[i * 3] = cx + r * Math.sin(phi) * Math.cos(theta);
                positions[i * 3 + 1] = cy + r * Math.sin(phi) * Math.sin(theta) * 0.5;
                positions[i * 3 + 2] = cz + r * Math.cos(phi);

                const t = Math.random();
                // Mix of blue stars and warm gas
                if (t < 0.3) {
                    colors[i * 3] = 0.5 + Math.random() * 0.3;
                    colors[i * 3 + 1] = 0.6 + Math.random() * 0.3;
                    colors[i * 3 + 2] = 1.0;
                } else {
                    colors[i * 3] = 0.8 + Math.random() * 0.2;
                    colors[i * 3 + 1] = 0.5 + Math.random() * 0.3;
                    colors[i * 3 + 2] = 0.2 + Math.random() * 0.3;
                }

                sizes[i] = 0.5 + Math.random() * 2.0;
                alphas[i] = 0.3 + Math.random() * 0.7;
            }

            const geo = new THREE.BufferGeometry();
            geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
            geo.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));
            geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
            geo.setAttribute('aAlpha', new THREE.BufferAttribute(alphas, 1));

            const mat = new THREE.ShaderMaterial({
                vertexShader: particleVert,
                fragmentShader: particleFrag,
                uniforms: {
                    uTime: { value: 0 },
                    uPixelRatio: { value: this.renderer.getPixelRatio() },
                    uSizeScale: { value: 1.0 },
                },
                transparent: true,
                depthWrite: false,
                blending: THREE.AdditiveBlending,
            });

            const points = new THREE.Points(geo, mat);
            g.add(points);
            this._protoGalaxies.push({ points, mat });
        }
    }

    // --- 7: COSMIC WEB ---
    _buildCosmicWeb() {
        const g = this.epochMeshes[7];

        // Generate web nodes
        const nodeCount = 200;
        const nodes = [];
        for (let i = 0; i < nodeCount; i++) {
            nodes.push(new THREE.Vector3(
                (Math.random() - 0.5) * 160,
                (Math.random() - 0.5) * 100,
                (Math.random() - 0.5) * 160
            ));
        }

        // Connect nearby nodes with filaments
        const filamentPositions = [];
        const filamentIntensities = [];
        const connectionThreshold = 40;

        for (let i = 0; i < nodeCount; i++) {
            for (let j = i + 1; j < nodeCount; j++) {
                const dist = nodes[i].distanceTo(nodes[j]);
                if (dist < connectionThreshold && Math.random() < 0.4) {
                    // Subdivide the line for a curved filament
                    const steps = 12;
                    for (let s = 0; s < steps; s++) {
                        const t1 = s / steps;
                        const t2 = (s + 1) / steps;
                        const p1 = new THREE.Vector3().lerpVectors(nodes[i], nodes[j], t1);
                        const p2 = new THREE.Vector3().lerpVectors(nodes[i], nodes[j], t2);
                        // Add some sag / noise
                        const sag = Math.sin(t1 * Math.PI) * (3 + Math.random() * 5);
                        p1.y += sag * (Math.random() - 0.5);
                        p1.x += sag * (Math.random() - 0.5) * 0.5;
                        const sag2 = Math.sin(t2 * Math.PI) * (3 + Math.random() * 5);
                        p2.y += sag2 * (Math.random() - 0.5);
                        p2.x += sag2 * (Math.random() - 0.5) * 0.5;

                        filamentPositions.push(p1.x, p1.y, p1.z, p2.x, p2.y, p2.z);
                        // Intensity fades toward middle of filament
                        const edgeFade = 1.0 - Math.sin(t1 * Math.PI) * 0.3;
                        filamentIntensities.push(edgeFade, edgeFade);
                    }
                }
            }
        }

        const fGeo = new THREE.BufferGeometry();
        fGeo.setAttribute('position', new THREE.Float32BufferAttribute(filamentPositions, 3));
        fGeo.setAttribute('aIntensity', new THREE.Float32BufferAttribute(filamentIntensities, 1));

        this._cosmicWebMat = new THREE.ShaderMaterial({
            vertexShader: filamentVert,
            fragmentShader: filamentFrag,
            uniforms: {
                uColor: { value: new THREE.Color(0.2, 0.35, 0.8) },
            },
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
        });

        const lines = new THREE.LineSegments(fGeo, this._cosmicWebMat);
        g.add(lines);

        // Add galaxy dots at nodes
        const nPos = new Float32Array(nodeCount * 3);
        const nCol = new Float32Array(nodeCount * 3);
        const nSize = new Float32Array(nodeCount);
        const nAlpha = new Float32Array(nodeCount);

        for (let i = 0; i < nodeCount; i++) {
            nPos[i * 3] = nodes[i].x;
            nPos[i * 3 + 1] = nodes[i].y;
            nPos[i * 3 + 2] = nodes[i].z;
            nCol[i * 3] = 0.6 + Math.random() * 0.4;
            nCol[i * 3 + 1] = 0.5 + Math.random() * 0.3;
            nCol[i * 3 + 2] = 0.8 + Math.random() * 0.2;
            nSize[i] = 2.0 + Math.random() * 4.0;
            nAlpha[i] = 0.6 + Math.random() * 0.4;
        }

        const nGeo = new THREE.BufferGeometry();
        nGeo.setAttribute('position', new THREE.BufferAttribute(nPos, 3));
        nGeo.setAttribute('aColor', new THREE.BufferAttribute(nCol, 3));
        nGeo.setAttribute('aSize', new THREE.BufferAttribute(nSize, 1));
        nGeo.setAttribute('aAlpha', new THREE.BufferAttribute(nAlpha, 1));

        const nMat = new THREE.ShaderMaterial({
            vertexShader: particleVert,
            fragmentShader: particleFrag,
            uniforms: {
                uTime: { value: 0 },
                uPixelRatio: { value: this.renderer.getPixelRatio() },
                uSizeScale: { value: 1.0 },
            },
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
        });

        g.add(new THREE.Points(nGeo, nMat));
    }

    // --- 8: GALAXY EVOLUTION (spiral forming) ---
    _buildGalaxyEvolution() {
        const g = this.epochMeshes[8];
        const count = 100000;
        const positions = new Float32Array(count * 3);
        const colors = new Float32Array(count * 3);
        const sizes = new Float32Array(count);
        const angles = new Float32Array(count);
        const radii = new Float32Array(count);
        const brights = new Float32Array(count);

        const arms = 2;
        const armAngle = Math.PI * 2 / arms;
        const twist = 3.0;

        for (let i = 0; i < count; i++) {
            const armIdx = i % arms;
            const r = Math.pow(Math.random(), 0.5) * 30;
            const baseAngle = armIdx * armAngle + r * twist * 0.04;
            const scatter = (Math.random() - 0.5) * (0.5 + r * 0.04);
            const angle = baseAngle + scatter;

            const height = (Math.random() - 0.5) * (1.0 + Math.exp(-r * 0.1) * 3.0);

            positions[i * 3] = Math.cos(angle) * r;
            positions[i * 3 + 1] = height;
            positions[i * 3 + 2] = Math.sin(angle) * r;

            angles[i] = angle;
            radii[i] = r;

            // Bulge: warm yellow. Arms: blueish
            const inBulge = r < 5;
            if (inBulge) {
                colors[i * 3] = 1.0;
                colors[i * 3 + 1] = 0.85 + Math.random() * 0.1;
                colors[i * 3 + 2] = 0.5 + Math.random() * 0.2;
                brights[i] = 0.6 + Math.random() * 0.4;
            } else {
                const t = Math.random();
                if (t < 0.4) {
                    // Young blue
                    colors[i * 3] = 0.5 + Math.random() * 0.2;
                    colors[i * 3 + 1] = 0.6 + Math.random() * 0.2;
                    colors[i * 3 + 2] = 1.0;
                } else if (t < 0.7) {
                    // White
                    colors[i * 3] = 0.9;
                    colors[i * 3 + 1] = 0.9;
                    colors[i * 3 + 2] = 0.95;
                } else {
                    // Red / orange
                    colors[i * 3] = 1.0;
                    colors[i * 3 + 1] = 0.5 + Math.random() * 0.3;
                    colors[i * 3 + 2] = 0.2 + Math.random() * 0.2;
                }
                brights[i] = 0.3 + Math.random() * 0.5;
            }

            sizes[i] = inBulge ? (1.5 + Math.random() * 2.0) : (0.5 + Math.random() * 1.5);
        }

        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geo.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));
        geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
        geo.setAttribute('aAngle', new THREE.BufferAttribute(angles, 1));
        geo.setAttribute('aRadius', new THREE.BufferAttribute(radii, 1));
        geo.setAttribute('aBrightness', new THREE.BufferAttribute(brights, 1));

        this._galaxyEvoMat = new THREE.ShaderMaterial({
            vertexShader: galaxyDiskVert,
            fragmentShader: galaxyDiskFrag,
            uniforms: {
                uTime: { value: 0 },
                uPixelRatio: { value: this.renderer.getPixelRatio() },
            },
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
        });

        const points = new THREE.Points(geo, this._galaxyEvoMat);
        g.add(points);
    }

    // --- 9: PRESENT DAY (Milky Way) ---
    _buildPresentDay() {
        const g = this.epochMeshes[9];
        const count = 150000;
        const positions = new Float32Array(count * 3);
        const colors = new Float32Array(count * 3);
        const sizes = new Float32Array(count);
        const angles = new Float32Array(count);
        const radii = new Float32Array(count);
        const brights = new Float32Array(count);

        const arms = 4;
        const armAngle = Math.PI * 2 / arms;
        const twist = 2.8;

        for (let i = 0; i < count; i++) {
            const armIdx = i % arms;
            const r = Math.pow(Math.random(), 0.55) * 35;
            const baseAngle = armIdx * armAngle + r * twist * 0.035;
            const scatter = (Math.random() - 0.5) * (0.3 + r * 0.025);
            const angle = baseAngle + scatter;
            const height = (Math.random() - 0.5) * (0.5 + Math.exp(-r * 0.12) * 2.0);

            positions[i * 3] = Math.cos(angle) * r;
            positions[i * 3 + 1] = height;
            positions[i * 3 + 2] = Math.sin(angle) * r;

            angles[i] = angle;
            radii[i] = r;

            const inBulge = r < 4;
            if (inBulge) {
                colors[i * 3] = 1.0;
                colors[i * 3 + 1] = 0.9;
                colors[i * 3 + 2] = 0.6;
                brights[i] = 0.7 + Math.random() * 0.3;
            } else {
                const t = Math.random();
                if (t < 0.35) {
                    colors[i * 3] = 0.5 + Math.random() * 0.2;
                    colors[i * 3 + 1] = 0.65 + Math.random() * 0.2;
                    colors[i * 3 + 2] = 1.0;
                } else if (t < 0.65) {
                    colors[i * 3] = 0.95;
                    colors[i * 3 + 1] = 0.93;
                    colors[i * 3 + 2] = 1.0;
                } else {
                    colors[i * 3] = 1.0;
                    colors[i * 3 + 1] = 0.6 + Math.random() * 0.2;
                    colors[i * 3 + 2] = 0.3 + Math.random() * 0.2;
                }
                brights[i] = 0.25 + Math.random() * 0.5;
            }

            sizes[i] = inBulge ? (1.2 + Math.random() * 1.8) : (0.4 + Math.random() * 1.2);
        }

        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geo.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));
        geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
        geo.setAttribute('aAngle', new THREE.BufferAttribute(angles, 1));
        geo.setAttribute('aRadius', new THREE.BufferAttribute(radii, 1));
        geo.setAttribute('aBrightness', new THREE.BufferAttribute(brights, 1));

        this._presentDayMat = new THREE.ShaderMaterial({
            vertexShader: galaxyDiskVert,
            fragmentShader: galaxyDiskFrag,
            uniforms: {
                uTime: { value: 0 },
                uPixelRatio: { value: this.renderer.getPixelRatio() },
            },
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
        });

        g.add(new THREE.Points(geo, this._presentDayMat));
    }

    // --- 10: FAR FUTURE ---
    _buildFarFuture() {
        const g = this.epochMeshes[10];
        const count = 15000;
        const positions = new Float32Array(count * 3);
        const colors = new Float32Array(count * 3);
        const sizes = new Float32Array(count);
        const alphas = new Float32Array(count);

        for (let i = 0; i < count; i++) {
            const r = Math.pow(Math.random(), 0.3) * 50;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
            positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
            positions[i * 3 + 2] = r * Math.cos(phi);

            // Dying red dwarfs and fading embers
            const t = Math.random();
            if (t < 0.15) {
                // Last red dwarfs
                colors[i * 3] = 0.6 + Math.random() * 0.3;
                colors[i * 3 + 1] = 0.1 + Math.random() * 0.1;
                colors[i * 3 + 2] = 0.05;
                alphas[i] = 0.15 + Math.random() * 0.25;
            } else {
                // White dwarfs cooling to black
                const dim = Math.random() * 0.08;
                colors[i * 3] = dim;
                colors[i * 3 + 1] = dim;
                colors[i * 3 + 2] = dim * 1.2;
                alphas[i] = 0.02 + Math.random() * 0.08;
            }

            sizes[i] = 0.5 + Math.random() * 1.5;
        }

        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geo.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));
        geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
        geo.setAttribute('aAlpha', new THREE.BufferAttribute(alphas, 1));

        this._futureMat = new THREE.ShaderMaterial({
            vertexShader: particleVert,
            fragmentShader: particleFrag,
            uniforms: {
                uTime: { value: 0 },
                uPixelRatio: { value: this.renderer.getPixelRatio() },
                uSizeScale: { value: 1.0 },
            },
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
        });

        g.add(new THREE.Points(geo, this._futureMat));
    }

    // ----------------------------------------------------------
    // SHOW / TRANSITION EPOCHS
    // ----------------------------------------------------------
    _showEpoch(index, instant = false) {
        if (index < 0 || index > 10) return;
        const prev = this.currentEpoch;
        this.currentEpoch = index;
        this.targetEpoch = index;
        this.epochProgress = 0;
        this._epochStartTime = this.time;

        // Fade out all epoch groups, fade in current
        for (let i = 0; i <= 10; i++) {
            this.epochMeshes[i].visible = (i === index);
        }

        // Update bloom
        const ep = EPOCHS[index];
        this._setBloom(ep.bloomStrength, ep.bloomRadius, ep.bloomThreshold);

        // Camera transition
        const duration = instant ? 0 : 2.0;
        this._cameraTransition = {
            startPos: this.camera.position.clone(),
            endPos: new THREE.Vector3(...ep.cameraPos),
            startTarget: this.controls.target.clone(),
            endTarget: new THREE.Vector3(...ep.cameraTarget),
            startTime: this.time,
            duration,
        };

        // Update UI
        this._updateInfoPanel(index);
        this._updateTimelineMarkers(index);
        this._showEpochTitle(index);

        // "You Are Here" for present day
        const youEl = document.getElementById('you-are-here');
        if (index === 9) {
            setTimeout(() => youEl.classList.add('visible'), 1500);
        } else {
            youEl.classList.remove('visible');
        }

        // Reset first-stars brightness when entering epoch 5
        if (index === 5 && this._firstStarsData) {
            this._firstStarsData.forEach(s => s.brightness = 0);
        }
    }

    _showEpochTitle(index) {
        const overlay = document.getElementById('epoch-title-overlay');
        const titleEl = overlay.querySelector('.big-title');
        const subEl = overlay.querySelector('.big-subtitle');
        const ep = EPOCHS[index];

        titleEl.textContent = ep.name;
        subEl.textContent = ep.timeLabel;
        overlay.classList.add('visible');

        clearTimeout(this._titleTimeout);
        this._titleTimeout = setTimeout(() => {
            overlay.classList.remove('visible');
        }, 3000);
    }

    // ----------------------------------------------------------
    // UI SETUP
    // ----------------------------------------------------------
    _initUI() {
        // Timeline markers
        const track = document.getElementById('timeline-track');
        EPOCHS.forEach((ep, i) => {
            const marker = document.createElement('div');
            marker.className = 'epoch-marker';
            marker.style.left = (ep.timelinePos * 100) + '%';
            marker.dataset.epoch = i;

            const label = document.createElement('div');
            label.className = 'epoch-marker-label';
            label.textContent = ep.name;
            marker.appendChild(label);

            marker.addEventListener('click', (e) => {
                e.stopPropagation();
                this._showEpoch(i);
            });

            track.appendChild(marker);
        });

        // Track click for scrubbing
        track.addEventListener('click', (e) => {
            const rect = track.getBoundingClientRect();
            const pct = (e.clientX - rect.left) / rect.width;
            // Find nearest epoch
            let nearest = 0;
            let minDist = 1;
            EPOCHS.forEach((ep, i) => {
                const d = Math.abs(ep.timelinePos - pct);
                if (d < minDist) { minDist = d; nearest = i; }
            });
            this._showEpoch(nearest);
        });

        // Play/pause button
        const playBtn = document.getElementById('btn-play-pause');
        playBtn.addEventListener('click', () => this._togglePlay());

        // Speed slider
        const speedSlider = document.getElementById('speed-slider');
        const speedVal = document.getElementById('speed-val');
        speedSlider.addEventListener('input', () => {
            this.playSpeed = parseFloat(speedSlider.value);
            speedVal.textContent = this.playSpeed.toFixed(1) + 'x';
        });
    }

    _togglePlay() {
        this.isPlaying = !this.isPlaying;
        const btn = document.getElementById('btn-play-pause');
        btn.innerHTML = this.isPlaying
            ? '<svg width="12" height="14" viewBox="0 0 12 14"><rect x="1" y="1" width="3" height="12" fill="white"/><rect x="8" y="1" width="3" height="12" fill="white"/></svg>'
            : '<svg width="12" height="14" viewBox="0 0 12 14"><polygon points="2,1 11,7 2,13" fill="white"/></svg>';
    }

    _updateInfoPanel(index) {
        const ep = EPOCHS[index];
        document.querySelector('#info-panel .epoch-number').textContent = `EPOCH ${index + 1} OF 11`;
        document.querySelector('#info-panel .epoch-name').textContent = ep.name;
        document.getElementById('stat-time').innerHTML = ep.timeLabel;
        document.getElementById('stat-temp').innerHTML = ep.tempLabel;
        document.querySelector('#info-panel .epoch-description').textContent = ep.description;
    }

    _updateTimelineMarkers(index) {
        const markers = document.querySelectorAll('.epoch-marker');
        markers.forEach((m, i) => {
            m.classList.toggle('active', i === index);
        });

        const ep = EPOCHS[index];
        const progress = document.getElementById('timeline-progress');
        const cursor = document.getElementById('timeline-cursor');
        progress.style.width = (ep.timelinePos * 100) + '%';
        cursor.style.left = (ep.timelinePos * 100) + '%';

        // Time display
        document.getElementById('cosmic-time-display').textContent = `Cosmic Time: ${ep.timeLabel}`;
        document.getElementById('temperature-display').textContent = `T = ${ep.tempLabel}`;
    }

    _initKeyboard() {
        window.addEventListener('keydown', (e) => {
            switch (e.code) {
                case 'Space':
                    e.preventDefault();
                    this._togglePlay();
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    this._showEpoch(Math.min(this.currentEpoch + 1, 10));
                    break;
                case 'ArrowLeft':
                    e.preventDefault();
                    this._showEpoch(Math.max(this.currentEpoch - 1, 0));
                    break;
                case 'Digit1': case 'Numpad1': this._showEpoch(0); break;
                case 'Digit2': case 'Numpad2': this._showEpoch(1); break;
                case 'Digit3': case 'Numpad3': this._showEpoch(2); break;
                case 'Digit4': case 'Numpad4': this._showEpoch(3); break;
                case 'Digit5': case 'Numpad5': this._showEpoch(4); break;
                case 'Digit6': case 'Numpad6': this._showEpoch(5); break;
                case 'Digit7': case 'Numpad7': this._showEpoch(6); break;
                case 'Digit8': case 'Numpad8': this._showEpoch(7); break;
                case 'Digit9': case 'Numpad9': this._showEpoch(8); break;
                case 'Digit0': case 'Numpad0': this._showEpoch(9); break;
                case 'Minus': this._showEpoch(10); break;
            }
        });
    }

    // ----------------------------------------------------------
    // HIDE LOADING SCREEN
    // ----------------------------------------------------------
    _hideLoading() {
        const loadEl = document.getElementById('loading-screen');
        const fill = loadEl.querySelector('.loading-bar-fill');
        fill.style.width = '100%';
        setTimeout(() => {
            loadEl.classList.add('fade-out');
            setTimeout(() => loadEl.style.display = 'none', 1200);
        }, 600);
    }

    // ----------------------------------------------------------
    // ANIMATION LOOP
    // ----------------------------------------------------------
    _animate() {
        requestAnimationFrame(() => this._animate());

        const delta = this.clock.getDelta();
        const clampedDelta = Math.min(delta, 0.05);
        this.time += clampedDelta;

        // Auto-advance
        if (this.isPlaying) {
            this.epochProgress += clampedDelta * 0.08 * this.playSpeed;
            if (this.epochProgress >= 1.0) {
                this.epochProgress = 0;
                if (this.currentEpoch < 10) {
                    this._showEpoch(this.currentEpoch + 1);
                } else {
                    this.isPlaying = false;
                    this._togglePlay();
                }
            }
        }

        // Camera transition
        if (this._cameraTransition) {
            const ct = this._cameraTransition;
            if (ct.duration === 0) {
                this.camera.position.copy(ct.endPos);
                this.controls.target.copy(ct.endTarget);
                this._cameraTransition = null;
            } else {
                let t = (this.time - ct.startTime) / ct.duration;
                t = Math.min(t, 1.0);
                // Ease in-out
                t = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
                this.camera.position.lerpVectors(ct.startPos, ct.endPos, t);
                this.controls.target.lerpVectors(ct.startTarget, ct.endTarget, t);
                if (t >= 1.0) this._cameraTransition = null;
            }
        }

        this.controls.update();

        // Update epoch-specific animations
        this._updateEpoch(clampedDelta);

        this.composer.render();
    }

    // ----------------------------------------------------------
    // PER-EPOCH UPDATES
    // ----------------------------------------------------------
    _updateEpoch(dt) {
        const idx = this.currentEpoch;

        // 0: Singularity pulse
        if (idx === 0 && this.singularityMat) {
            this.singularityMat.uniforms.uTime.value = this.time;
        }

        // 1: Inflation expansion
        if (idx === 1 && this._inflationPoints) {
            this.inflationMat.uniforms.uTime.value = this.time;
            // Animate particles expanding from center
            const positions = this._inflationPoints.geometry.attributes.position.array;
            const orig = this._inflationPositionsOrig;
            const scale = 0.2 + this.epochProgress * 0.8;
            // Add pulsing quantum fluctuation
            const t = this.time;
            for (let i = 0; i < positions.length; i += 3) {
                const ox = orig[i], oy = orig[i + 1], oz = orig[i + 2];
                const r = Math.sqrt(ox * ox + oy * oy + oz * oz);
                const noise = Math.sin(ox * 0.5 + t * 2) * Math.cos(oy * 0.5 + t * 1.5) * 0.5;
                positions[i] = ox * scale + noise * scale;
                positions[i + 1] = oy * scale + noise * scale * 0.5;
                positions[i + 2] = oz * scale + noise * scale;
            }
            this._inflationPoints.geometry.attributes.position.needsUpdate = true;
        }

        // 2: Quark-Gluon Plasma brownian motion
        if (idx === 2 && this._qgpPoints) {
            this._qgpMat.uniforms.uTime.value = this.time;
            const positions = this._qgpPoints.geometry.attributes.position.array;
            const vel = this._qgpVelocities;
            for (let i = 0; i < positions.length; i += 3) {
                // Brownian kicks
                vel[i] += (Math.random() - 0.5) * 0.6 * dt;
                vel[i + 1] += (Math.random() - 0.5) * 0.6 * dt;
                vel[i + 2] += (Math.random() - 0.5) * 0.6 * dt;
                // Damping
                vel[i] *= 0.99;
                vel[i + 1] *= 0.99;
                vel[i + 2] *= 0.99;
                // Containment
                const r = Math.sqrt(positions[i] ** 2 + positions[i + 1] ** 2 + positions[i + 2] ** 2);
                if (r > 25) {
                    vel[i] -= positions[i] * 0.001;
                    vel[i + 1] -= positions[i + 1] * 0.001;
                    vel[i + 2] -= positions[i + 2] * 0.001;
                }
                positions[i] += vel[i];
                positions[i + 1] += vel[i + 1];
                positions[i + 2] += vel[i + 2];
            }
            this._qgpPoints.geometry.attributes.position.needsUpdate = true;
        }

        // 3: First Atoms - slow down, cluster
        if (idx === 3 && this._atomPoints) {
            this._atomMat.uniforms.uTime.value = this.time;
            const positions = this._atomPoints.geometry.attributes.position.array;
            const vel = this._atomVelocities;
            for (let i = 0; i < positions.length; i += 3) {
                vel[i] *= 0.998;
                vel[i + 1] *= 0.998;
                vel[i + 2] *= 0.998;
                positions[i] += vel[i];
                positions[i + 1] += vel[i + 1];
                positions[i + 2] += vel[i + 2];
            }
            this._atomPoints.geometry.attributes.position.needsUpdate = true;

            // Fade colors from orange toward dark as epoch progresses
            const cols = this._atomPoints.geometry.attributes.aColor.array;
            const fade = Math.max(0, 1.0 - this.epochProgress * 0.6);
            for (let i = 0; i < cols.length; i++) {
                cols[i] *= (1.0 - dt * 0.1);
                if (cols[i] < 0.02) cols[i] = 0.02;
            }
            this._atomPoints.geometry.attributes.aColor.needsUpdate = true;
        }

        // 4: Dark Ages - subtle density fluctuations
        if (idx === 4 && this._darkPoints) {
            this._darkMat.uniforms.uTime.value = this.time;
            const alphas = this._darkPoints.geometry.attributes.aAlpha.array;
            for (let i = 0; i < alphas.length; i++) {
                const pos = this._darkPoints.geometry.attributes.position.array;
                const x = pos[i * 3], y = pos[i * 3 + 1];
                const flicker = 0.12 + 0.08 * Math.sin(x * 0.1 + this.time * 0.5) * Math.cos(y * 0.1 + this.time * 0.3);
                alphas[i] = flicker;
            }
            this._darkPoints.geometry.attributes.aAlpha.needsUpdate = true;
        }

        // 5: First Stars igniting
        if (idx === 5 && this._firstStarsData) {
            const progress = this.epochProgress;
            this._firstStarsData.forEach(star => {
                star.mat.uniforms.uTime.value = this.time;
                if (progress >= star.igniteTime && star.brightness < 1.0) {
                    star.brightness = Math.min(star.brightness + dt * 2.5, 1.0);
                }
                star.mat.uniforms.uBrightness.value = star.brightness;
                // Billboard toward camera
                star.mesh.quaternion.copy(this.camera.quaternion);
            });
        }

        // 6: First Galaxies
        if (idx === 6 && this._protoGalaxies) {
            this._protoGalaxies.forEach(pg => {
                pg.mat.uniforms.uTime.value = this.time;
            });
        }

        // 8: Galaxy Evolution rotation
        if (idx === 8 && this._galaxyEvoMat) {
            this._galaxyEvoMat.uniforms.uTime.value = this.time;
        }

        // 9: Present Day rotation
        if (idx === 9 && this._presentDayMat) {
            this._presentDayMat.uniforms.uTime.value = this.time;
        }

        // 10: Far Future - slow fade
        if (idx === 10 && this._futureMat) {
            this._futureMat.uniforms.uTime.value = this.time;
            // Gradually dim remaining stars
            const alphas = this.epochMeshes[10].children[0].geometry.attributes.aAlpha.array;
            const fadeFactor = 1.0 - this.epochProgress * 0.7;
            for (let i = 0; i < alphas.length; i++) {
                alphas[i] = Math.max(0.001, alphas[i] * (1.0 - dt * 0.02));
            }
            this.epochMeshes[10].children[0].geometry.attributes.aAlpha.needsUpdate = true;
        }
    }
}
