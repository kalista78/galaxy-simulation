/**
 * NebulaExplorer.js
 * Breathtaking nebula visualization using Three.js with custom GLSL shaders.
 * Supports 6 nebulae: Orion, Eagle, Crab, Ring, Helix, Carina
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

// ============================================================
//  SHADER CODE
// ============================================================

const nebulaGasVertexShader = `
    attribute float size;
    attribute vec3 customColor;
    attribute float opacity;
    attribute float phase;
    attribute float turbulence;
    attribute float layer;

    varying vec3 vColor;
    varying float vOpacity;
    varying float vDist;
    varying float vLayer;

    uniform float time;
    uniform float filterMode; // 0=visual, 1=halpha, 2=oiii

    // Simplex-like noise function
    vec3 mod289(vec3 x) { return x - floor(x * (1.0/289.0)) * 289.0; }
    vec4 mod289(vec4 x) { return x - floor(x * (1.0/289.0)) * 289.0; }
    vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
    vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

    float snoise(vec3 v) {
        const vec2 C = vec2(1.0/6.0, 1.0/3.0);
        const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
        vec3 i  = floor(v + dot(v, C.yyy));
        vec3 x0 = v - i + dot(i, C.xxx);
        vec3 g = step(x0.yzx, x0.xyz);
        vec3 l = 1.0 - g;
        vec3 i1 = min(g.xyz, l.zxy);
        vec3 i2 = max(g.xyz, l.zxy);
        vec3 x1 = x0 - i1 + C.xxx;
        vec3 x2 = x0 - i2 + C.yyy;
        vec3 x3 = x0 - D.yyy;
        i = mod289(i);
        vec4 p = permute(permute(permute(
            i.z + vec4(0.0, i1.z, i2.z, 1.0))
          + i.y + vec4(0.0, i1.y, i2.y, 1.0))
          + i.x + vec4(0.0, i1.x, i2.x, 1.0));
        float n_ = 0.142857142857;
        vec3 ns = n_ * D.wyz - D.xzx;
        vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
        vec4 x_ = floor(j * ns.z);
        vec4 y_ = floor(j - 7.0 * x_);
        vec4 x  = x_ * ns.x + ns.yyyy;
        vec4 y  = y_ * ns.x + ns.yyyy;
        vec4 h  = 1.0 - abs(x) - abs(y);
        vec4 b0 = vec4(x.xy, y.xy);
        vec4 b1 = vec4(x.zw, y.zw);
        vec4 s0 = floor(b0)*2.0 + 1.0;
        vec4 s1 = floor(b1)*2.0 + 1.0;
        vec4 sh = -step(h, vec4(0.0));
        vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
        vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
        vec3 p0 = vec3(a0.xy, h.x);
        vec3 p1 = vec3(a0.zw, h.y);
        vec3 p2 = vec3(a1.xy, h.z);
        vec3 p3 = vec3(a1.zw, h.w);
        vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
        p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
        vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
        m = m * m;
        return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
    }

    void main() {
        // Animated noise displacement
        float t = time * 0.05;
        float noiseScale = turbulence * 0.8;
        vec3 noisePos = position * 0.02 + vec3(t * 0.3, t * 0.2, t * 0.15);
        float n1 = snoise(noisePos) * noiseScale;
        float n2 = snoise(noisePos * 2.1 + 100.0) * noiseScale * 0.5;
        float n3 = snoise(noisePos * 4.3 + 200.0) * noiseScale * 0.25;
        float totalNoise = n1 + n2 + n3;

        vec3 displaced = position + normal * totalNoise;

        // Gentle breathing motion
        float breathe = sin(time * 0.15 + phase) * 0.3 + 1.0;
        displaced *= breathe;

        // Slow swirl
        float angle = time * 0.02 * (0.5 + layer * 0.5);
        float cosA = cos(angle);
        float sinA = sin(angle);
        vec3 swirled = vec3(
            displaced.x * cosA - displaced.z * sinA,
            displaced.y,
            displaced.x * sinA + displaced.z * cosA
        );

        vec4 mvPosition = modelViewMatrix * vec4(swirled, 1.0);
        float dist = length(mvPosition.xyz);
        vDist = dist;
        vLayer = layer;

        // Size with distance attenuation
        float sizeAtten = size * (400.0 / max(dist, 1.0));
        gl_PointSize = clamp(sizeAtten * breathe, 1.0, 120.0);

        // Color mapping based on filter
        vec3 col = customColor;
        if (filterMode > 0.5 && filterMode < 1.5) {
            // H-alpha: shift everything toward deep red
            float lum = dot(col, vec3(0.299, 0.587, 0.114));
            col = mix(vec3(0.8, 0.05, 0.02), vec3(1.0, 0.3, 0.15), lum);
        } else if (filterMode > 1.5) {
            // OIII: shift toward teal/cyan
            float lum = dot(col, vec3(0.299, 0.587, 0.114));
            col = mix(vec3(0.0, 0.3, 0.35), vec3(0.2, 0.9, 0.8), lum);
        }

        vColor = col;
        vOpacity = opacity;

        gl_Position = projectionMatrix * mvPosition;
    }
`;

const nebulaGasFragmentShader = `
    varying vec3 vColor;
    varying float vOpacity;
    varying float vDist;
    varying float vLayer;

    uniform float time;

    void main() {
        vec2 center = gl_PointCoord - vec2(0.5);
        float dist = length(center);

        // Soft volumetric gaussian falloff
        float gauss = exp(-dist * dist * 6.0);
        // Softer outer glow
        float glow = exp(-dist * dist * 2.5) * 0.3;
        // Fresnel-like edge brightening for gas cloud effect
        float edge = smoothstep(0.5, 0.35, dist) * 0.15;
        float fresnel = pow(1.0 - smoothstep(0.0, 0.5, dist), 0.5) * 0.1;

        float alpha = (gauss + glow + edge + fresnel) * vOpacity;

        // Emission-like color boost
        vec3 emissive = vColor * (1.0 + gauss * 0.8);

        // Slight time-based color shift for vibrancy
        float shift = sin(time * 0.1 + vDist * 0.01) * 0.05;
        emissive += shift;

        gl_FragColor = vec4(emissive, alpha);
        if (alpha < 0.001) discard;
    }
`;

const dustVertexShader = `
    attribute float size;
    attribute float opacity;
    attribute float phase;

    varying float vOpacity;

    uniform float time;

    void main() {
        float breathe = sin(time * 0.1 + phase) * 0.15 + 1.0;
        vec3 pos = position * breathe;

        vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
        float sizeAtten = size * (300.0 / max(length(mvPosition.xyz), 1.0));
        gl_PointSize = clamp(sizeAtten, 1.0, 80.0);

        vOpacity = opacity;
        gl_Position = projectionMatrix * mvPosition;
    }
`;

const dustFragmentShader = `
    varying float vOpacity;

    void main() {
        vec2 center = gl_PointCoord - vec2(0.5);
        float dist = length(center);
        // Dark absorbing dust
        float alpha = exp(-dist * dist * 4.0) * vOpacity;
        // Very dark brown/black
        gl_FragColor = vec4(0.01, 0.005, 0.0, alpha);
        if (alpha < 0.001) discard;
    }
`;

const filamentVertexShader = `
    attribute float size;
    attribute vec3 customColor;
    attribute float opacity;
    attribute float phase;

    varying vec3 vColor;
    varying float vOpacity;

    uniform float time;
    uniform float filterMode;

    void main() {
        float wave = sin(time * 0.2 + phase * 6.28) * 0.5;
        vec3 pos = position;
        pos.x += wave * 0.3;
        pos.z += cos(time * 0.15 + phase * 3.14) * 0.3;

        vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
        float sizeAtten = size * (250.0 / max(length(mvPosition.xyz), 1.0));
        gl_PointSize = clamp(sizeAtten, 0.5, 40.0);

        vec3 col = customColor;
        if (filterMode > 0.5 && filterMode < 1.5) {
            float lum = dot(col, vec3(0.299, 0.587, 0.114));
            col = mix(vec3(0.7, 0.04, 0.02), vec3(1.0, 0.25, 0.1), lum);
        } else if (filterMode > 1.5) {
            float lum = dot(col, vec3(0.299, 0.587, 0.114));
            col = mix(vec3(0.0, 0.25, 0.3), vec3(0.15, 0.85, 0.7), lum);
        }

        vColor = col;
        vOpacity = opacity;
        gl_Position = projectionMatrix * mvPosition;
    }
`;

const filamentFragmentShader = `
    varying vec3 vColor;
    varying float vOpacity;

    void main() {
        vec2 center = gl_PointCoord - vec2(0.5);
        float dist = length(center);
        // Elongated, streaky appearance
        float alpha = exp(-dist * dist * 10.0) * vOpacity;
        vec3 emissive = vColor * (1.0 + exp(-dist * dist * 20.0) * 0.5);
        gl_FragColor = vec4(emissive, alpha);
        if (alpha < 0.001) discard;
    }
`;

const starFieldVertexShader = `
    attribute float size;
    attribute vec3 customColor;
    attribute float brightness;

    varying vec3 vColor;
    varying float vBrightness;

    void main() {
        vColor = customColor;
        vBrightness = brightness;

        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        float sizeAtten = size * (200.0 / max(-mvPosition.z, 1.0));
        gl_PointSize = clamp(sizeAtten, 0.5, 6.0);

        gl_Position = projectionMatrix * mvPosition;
    }
`;

const starFieldFragmentShader = `
    varying vec3 vColor;
    varying float vBrightness;

    void main() {
        vec2 center = gl_PointCoord - vec2(0.5);
        float dist = length(center);
        float core = exp(-dist * dist * 32.0);
        float glow = exp(-dist * dist * 8.0) * 0.3;
        float alpha = (core + glow) * vBrightness;
        gl_FragColor = vec4(vColor * (1.0 + core * 0.5), alpha);
        if (alpha < 0.005) discard;
    }
`;

const embeddedStarVertexShader = `
    attribute float size;
    attribute vec3 customColor;
    attribute float brightness;
    attribute float flicker;

    varying vec3 vColor;
    varying float vBrightness;

    uniform float time;

    void main() {
        vColor = customColor;
        float f = sin(time * 2.0 + flicker * 6.28) * 0.15 + 1.0;
        vBrightness = brightness * f;

        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        float sizeAtten = size * (350.0 / max(-mvPosition.z, 1.0)) * f;
        gl_PointSize = clamp(sizeAtten, 1.0, 35.0);

        gl_Position = projectionMatrix * mvPosition;
    }
`;

const embeddedStarFragmentShader = `
    varying vec3 vColor;
    varying float vBrightness;

    void main() {
        vec2 center = gl_PointCoord - vec2(0.5);
        float dist = length(center);
        float core = exp(-dist * dist * 40.0);
        float inner = exp(-dist * dist * 12.0) * 0.6;
        float outer = exp(-dist * dist * 3.0) * 0.2;
        float alpha = (core + inner + outer) * vBrightness;
        vec3 col = vColor * (1.0 + core * 2.0);
        gl_FragColor = vec4(col, alpha);
        if (alpha < 0.005) discard;
    }
`;


// ============================================================
//  NEBULA DATA
// ============================================================

const NEBULA_DATA = {
    orion: {
        name: 'Orion Nebula',
        designation: 'M42 / NGC 1976',
        type: 'Emission Nebula',
        distance: '1,344 ly',
        size: '24 ly',
        description: 'A massive stellar nursery where hundreds of new stars are being born. The brightest diffuse nebula visible to the naked eye, illuminated by the young Trapezium star cluster at its core.',
        cameraPos: new THREE.Vector3(0, 15, 60),
        colors: {
            primary: [0.85, 0.25, 0.45],    // Pink-red
            secondary: [0.6, 0.15, 0.55],    // Purple
            tertiary: [0.95, 0.55, 0.35],    // Orange
            accent: [0.3, 0.35, 0.7],        // Blue
        },
        shape: 'diffuse',
        particleCount: 45000,
        filamentCount: 8000,
        dustCount: 6000,
        starCount: 200,
        spread: 40,
        coreIntensity: 1.2,
    },
    eagle: {
        name: 'Eagle Nebula',
        designation: 'M16 / NGC 6611',
        type: 'Emission Nebula',
        distance: '7,000 ly',
        size: '70 x 55 ly',
        description: 'Home to the iconic Pillars of Creation -- towering columns of gas and dust where new stars are forming. One of the most photographed objects in deep space.',
        cameraPos: new THREE.Vector3(0, 20, 70),
        colors: {
            primary: [0.2, 0.6, 0.45],      // Green-teal
            secondary: [0.15, 0.45, 0.7],    // Blue
            tertiary: [0.5, 0.7, 0.3],       // Yellow-green
            accent: [0.9, 0.8, 0.4],         // Gold tips
        },
        shape: 'pillars',
        particleCount: 42000,
        filamentCount: 10000,
        dustCount: 8000,
        starCount: 150,
        spread: 50,
        coreIntensity: 0.9,
    },
    crab: {
        name: 'Crab Nebula',
        designation: 'M1 / NGC 1952',
        type: 'Supernova Remnant',
        distance: '6,500 ly',
        size: '11 ly',
        description: 'The remains of a massive star that exploded as a supernova in 1054 AD. At its heart lies a rapidly spinning neutron star (pulsar) emitting beams of radiation 30 times per second.',
        cameraPos: new THREE.Vector3(0, 10, 45),
        colors: {
            primary: [0.3, 0.5, 0.9],        // Blue
            secondary: [0.8, 0.85, 1.0],      // White-blue
            tertiary: [0.9, 0.5, 0.2],        // Orange shell
            accent: [0.95, 0.3, 0.3],         // Red filaments
        },
        shape: 'remnant',
        particleCount: 40000,
        filamentCount: 12000,
        dustCount: 3000,
        starCount: 80,
        spread: 30,
        coreIntensity: 1.5,
    },
    ring: {
        name: 'Ring Nebula',
        designation: 'M57 / NGC 6720',
        type: 'Planetary Nebula',
        distance: '2,283 ly',
        size: '1.3 ly',
        description: 'A shell of glowing gas expelled by a dying sun-like star. The central white dwarf illuminates the expanding ring, creating a celestial jewel of concentric color bands.',
        cameraPos: new THREE.Vector3(0, 25, 50),
        colors: {
            primary: [0.2, 0.7, 0.5],        // Green
            secondary: [0.3, 0.4, 0.85],      // Blue
            tertiary: [0.85, 0.25, 0.2],      // Red outer
            accent: [0.9, 0.85, 0.4],         // Yellow
        },
        shape: 'ring',
        particleCount: 35000,
        filamentCount: 6000,
        dustCount: 2000,
        starCount: 60,
        spread: 25,
        coreIntensity: 1.0,
    },
    helix: {
        name: 'Helix Nebula',
        designation: 'NGC 7293',
        type: 'Planetary Nebula',
        distance: '655 ly',
        size: '5.7 ly',
        description: 'Known as the "Eye of God," this is one of the closest and largest planetary nebulae. Its complex structure of concentric shells and radial streamers creates a hauntingly beautiful appearance.',
        cameraPos: new THREE.Vector3(0, 15, 55),
        colors: {
            primary: [0.2, 0.65, 0.75],      // Cyan
            secondary: [0.85, 0.3, 0.25],     // Red outer
            tertiary: [0.3, 0.8, 0.5],        // Green
            accent: [0.9, 0.7, 0.2],          // Gold center
        },
        shape: 'helix',
        particleCount: 40000,
        filamentCount: 9000,
        dustCount: 4000,
        starCount: 100,
        spread: 35,
        coreIntensity: 1.1,
    },
    carina: {
        name: 'Carina Nebula',
        designation: 'NGC 3372',
        type: 'Emission Nebula',
        distance: '8,500 ly',
        size: '460 ly',
        description: 'One of the largest and brightest nebulae in the sky, home to several of the most massive and luminous stars known. Its dramatic dust pillars and star-forming regions rival the Eagle Nebula.',
        cameraPos: new THREE.Vector3(0, 20, 80),
        colors: {
            primary: [0.9, 0.5, 0.2],        // Orange
            secondary: [0.7, 0.15, 0.35],     // Deep red
            tertiary: [0.95, 0.75, 0.3],      // Gold
            accent: [0.4, 0.3, 0.7],          // Purple
        },
        shape: 'massive',
        particleCount: 50000,
        filamentCount: 12000,
        dustCount: 8000,
        starCount: 250,
        spread: 60,
        coreIntensity: 1.3,
    }
};


// ============================================================
//  NEBULA EXPLORER CLASS
// ============================================================

export class NebulaExplorer {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.composer = null;
        this.controls = null;
        this.clock = new THREE.Clock();

        this.currentNebula = null;
        this.nebulaGroup = null;
        this.backgroundStars = null;
        this.nebulaCache = {};

        this.filterMode = 0; // 0=visual, 1=halpha, 2=oiii
        this.showProtostars = true;
        this.isTransitioning = false;
        this.uniforms = {};

        this.init();
    }

    init() {
        this.setupRenderer();
        this.setupScene();
        this.setupCamera();
        this.setupControls();
        this.setupPostprocessing();
        this.createBackgroundStars();
        this.setupUI();
        this.animate();

        // Load first nebula
        this.selectNebula('orion');

        window.addEventListener('resize', () => this.onResize());
    }

    setupRenderer() {
        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: false,
            powerPreference: 'high-performance'
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.setClearColor(0x000000, 1);
        this.renderer.sortObjects = true;
        document.body.appendChild(this.renderer.domElement);
    }

    setupScene() {
        this.scene = new THREE.Scene();
        // Subtle ambient
        const ambient = new THREE.AmbientLight(0x111122, 0.3);
        this.scene.add(ambient);
    }

    setupCamera() {
        this.camera = new THREE.PerspectiveCamera(
            60,
            window.innerWidth / window.innerHeight,
            0.1,
            5000
        );
        this.camera.position.set(0, 15, 60);
    }

    setupControls() {
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.06;
        this.controls.rotateSpeed = 0.5;
        this.controls.zoomSpeed = 0.8;
        this.controls.minDistance = 10;
        this.controls.maxDistance = 200;
        this.controls.autoRotate = true;
        this.controls.autoRotateSpeed = 0.15;
    }

    setupPostprocessing() {
        this.composer = new EffectComposer(this.renderer);
        const renderPass = new RenderPass(this.scene, this.camera);
        this.composer.addPass(renderPass);

        this.bloomPass = new UnrealBloomPass(
            new THREE.Vector2(window.innerWidth, window.innerHeight),
            1.2,   // strength
            0.6,   // radius
            0.15   // threshold
        );
        this.composer.addPass(this.bloomPass);
    }

    // ----------------------------------------------------------
    //  BACKGROUND STARS
    // ----------------------------------------------------------

    createBackgroundStars() {
        const count = 15000;
        const positions = new Float32Array(count * 3);
        const colors = new Float32Array(count * 3);
        const sizes = new Float32Array(count);
        const brightness = new Float32Array(count);

        for (let i = 0; i < count; i++) {
            const i3 = i * 3;
            // Spherical distribution
            const r = 300 + Math.random() * 1200;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            positions[i3]     = r * Math.sin(phi) * Math.cos(theta);
            positions[i3 + 1] = r * Math.sin(phi) * Math.sin(theta);
            positions[i3 + 2] = r * Math.cos(phi);

            // Star colors: mostly white/blue-white with some warm
            const temp = Math.random();
            if (temp < 0.6) {
                // White
                colors[i3] = 0.9 + Math.random() * 0.1;
                colors[i3 + 1] = 0.9 + Math.random() * 0.1;
                colors[i3 + 2] = 1.0;
            } else if (temp < 0.8) {
                // Blue-white
                colors[i3] = 0.7 + Math.random() * 0.2;
                colors[i3 + 1] = 0.8 + Math.random() * 0.15;
                colors[i3 + 2] = 1.0;
            } else if (temp < 0.9) {
                // Yellow
                colors[i3] = 1.0;
                colors[i3 + 1] = 0.9 + Math.random() * 0.1;
                colors[i3 + 2] = 0.6 + Math.random() * 0.2;
            } else {
                // Red
                colors[i3] = 1.0;
                colors[i3 + 1] = 0.5 + Math.random() * 0.3;
                colors[i3 + 2] = 0.3 + Math.random() * 0.2;
            }

            sizes[i] = 0.5 + Math.random() * 2.0;
            brightness[i] = 0.3 + Math.random() * 0.7;
        }

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('customColor', new THREE.BufferAttribute(colors, 3));
        geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
        geometry.setAttribute('brightness', new THREE.BufferAttribute(brightness, 1));

        const material = new THREE.ShaderMaterial({
            vertexShader: starFieldVertexShader,
            fragmentShader: starFieldFragmentShader,
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
        });

        this.backgroundStars = new THREE.Points(geometry, material);
        this.scene.add(this.backgroundStars);
    }

    // ----------------------------------------------------------
    //  NEBULA GENERATION
    // ----------------------------------------------------------

    generateNebula(key) {
        const data = NEBULA_DATA[key];
        if (!data) return null;

        const group = new THREE.Group();
        group.userData.key = key;

        // Shared uniforms
        const sharedUniforms = {
            time: { value: 0 },
            filterMode: { value: this.filterMode },
        };

        // ---- BASE GAS CLOUD ----
        const gasSystem = this.createGasCloud(data, sharedUniforms);
        group.add(gasSystem);

        // ---- DUST LANES ----
        const dustSystem = this.createDustLanes(data, sharedUniforms);
        group.add(dustSystem);

        // ---- FILAMENTS ----
        const filamentSystem = this.createFilaments(data, sharedUniforms);
        group.add(filamentSystem);

        // ---- EMBEDDED STARS (protostars) ----
        const starSystem = this.createEmbeddedStars(data, sharedUniforms);
        starSystem.userData.isProtostar = true;
        group.add(starSystem);

        // ---- CORE POINT LIGHT ----
        const coreLight = new THREE.PointLight(
            new THREE.Color(data.colors.accent[0], data.colors.accent[1], data.colors.accent[2]),
            data.coreIntensity * 2,
            data.spread * 3
        );
        coreLight.position.set(0, 0, 0);
        group.add(coreLight);

        // Store uniforms reference
        group.userData.uniforms = sharedUniforms;
        group.userData.data = data;

        return group;
    }

    createGasCloud(data, sharedUniforms) {
        const count = data.particleCount;
        const positions = new Float32Array(count * 3);
        const normals = new Float32Array(count * 3);
        const colors = new Float32Array(count * 3);
        const sizes = new Float32Array(count);
        const opacities = new Float32Array(count);
        const phases = new Float32Array(count);
        const turbulences = new Float32Array(count);
        const layers = new Float32Array(count);

        const spread = data.spread;
        const c = data.colors;

        for (let i = 0; i < count; i++) {
            const i3 = i * 3;
            let x, y, z;

            // Shape-dependent distribution
            switch (data.shape) {
                case 'ring': {
                    const ringR = spread * 0.5;
                    const tubeR = spread * 0.18;
                    const angle = Math.random() * Math.PI * 2;
                    const tubeAngle = Math.random() * Math.PI * 2;
                    const rOffset = (Math.random() - 0.5) * tubeR * 2;
                    x = (ringR + tubeR * Math.cos(tubeAngle) + rOffset) * Math.cos(angle);
                    z = (ringR + tubeR * Math.cos(tubeAngle) + rOffset) * Math.sin(angle);
                    y = tubeR * Math.sin(tubeAngle) * 0.6 + (Math.random() - 0.5) * 3;
                    // Extra particles in center for visual depth
                    if (i < count * 0.1) {
                        const cr = Math.random() * ringR * 0.4;
                        const ca = Math.random() * Math.PI * 2;
                        x = cr * Math.cos(ca);
                        z = cr * Math.sin(ca);
                        y = (Math.random() - 0.5) * 2;
                    }
                    break;
                }
                case 'helix': {
                    // Double-ring helix structure with streamers
                    const helR = spread * 0.5;
                    const helTube = spread * 0.2;
                    const a = Math.random() * Math.PI * 2;
                    const ta = Math.random() * Math.PI * 2;
                    const layer = i < count * 0.5 ? 0 : 1;
                    const tilt = layer === 0 ? 0 : 0.5;
                    x = (helR + helTube * Math.cos(ta)) * Math.cos(a);
                    z = (helR + helTube * Math.cos(ta)) * Math.sin(a);
                    y = helTube * Math.sin(ta) * 0.7 + tilt * Math.sin(a) * helR * 0.3;
                    // Radial streamers
                    if (i > count * 0.85) {
                        const sa = Math.random() * Math.PI * 2;
                        const sr = Math.random() * spread * 0.7;
                        x = sr * Math.cos(sa);
                        z = sr * Math.sin(sa);
                        y = (Math.random() - 0.5) * 6;
                    }
                    x += (Math.random() - 0.5) * 4;
                    z += (Math.random() - 0.5) * 4;
                    break;
                }
                case 'pillars': {
                    // Pillar structures + surrounding gas
                    if (i < count * 0.35) {
                        // Pillar 1
                        const p1x = -spread * 0.15;
                        const p1z = 0;
                        const height = Math.random() * spread * 0.7;
                        x = p1x + (Math.random() - 0.5) * 6;
                        z = p1z + (Math.random() - 0.5) * 5;
                        y = height - spread * 0.15;
                    } else if (i < count * 0.55) {
                        // Pillar 2
                        const p2x = spread * 0.1;
                        const p2z = spread * 0.05;
                        const height = Math.random() * spread * 0.55;
                        x = p2x + (Math.random() - 0.5) * 5;
                        z = p2z + (Math.random() - 0.5) * 4;
                        y = height - spread * 0.12;
                    } else if (i < count * 0.7) {
                        // Pillar 3
                        const p3x = spread * 0.25;
                        const p3z = -spread * 0.08;
                        const height = Math.random() * spread * 0.4;
                        x = p3x + (Math.random() - 0.5) * 4;
                        z = p3z + (Math.random() - 0.5) * 3.5;
                        y = height - spread * 0.1;
                    } else {
                        // Surrounding gas
                        const r = Math.pow(Math.random(), 0.5) * spread;
                        const theta = Math.random() * Math.PI * 2;
                        x = r * Math.cos(theta) + (Math.random() - 0.5) * 10;
                        z = r * Math.sin(theta) * 0.6;
                        y = (Math.random() - 0.5) * spread * 0.6 + spread * 0.15;
                    }
                    break;
                }
                case 'remnant': {
                    // Supernova remnant: expanding shell with filaments
                    const shellR = spread * 0.45;
                    const phi = Math.acos(2 * Math.random() - 1);
                    const theta = Math.random() * Math.PI * 2;
                    const rVariation = shellR * (0.8 + Math.random() * 0.4);
                    // Inner synchrotron region
                    if (i < count * 0.3) {
                        const ir = Math.pow(Math.random(), 0.7) * shellR * 0.7;
                        x = ir * Math.sin(phi) * Math.cos(theta);
                        y = ir * Math.sin(phi) * Math.sin(theta) * 0.85;
                        z = ir * Math.cos(phi);
                    } else {
                        // Shell
                        x = rVariation * Math.sin(phi) * Math.cos(theta);
                        y = rVariation * Math.sin(phi) * Math.sin(theta) * 0.85;
                        z = rVariation * Math.cos(phi);
                    }
                    // Add irregularity
                    x += (Math.random() - 0.5) * 3;
                    y += (Math.random() - 0.5) * 3;
                    z += (Math.random() - 0.5) * 3;
                    break;
                }
                case 'massive': {
                    // Large star-forming region with multiple centers
                    const centerIdx = Math.floor(Math.random() * 4);
                    const centers = [
                        [0, 0, 0],
                        [-spread * 0.3, spread * 0.1, spread * 0.15],
                        [spread * 0.35, -spread * 0.05, -spread * 0.1],
                        [spread * 0.1, spread * 0.2, -spread * 0.25],
                    ];
                    const cx = centers[centerIdx][0];
                    const cy = centers[centerIdx][1];
                    const cz = centers[centerIdx][2];
                    const r = Math.pow(Math.random(), 0.6) * spread * 0.5;
                    const theta = Math.random() * Math.PI * 2;
                    const phi = Math.acos(2 * Math.random() - 1);
                    x = cx + r * Math.sin(phi) * Math.cos(theta);
                    y = cy + r * Math.sin(phi) * Math.sin(theta) * 0.5;
                    z = cz + r * Math.cos(phi);
                    // Dust pillar structures
                    if (i > count * 0.85) {
                        const px = (Math.random() - 0.5) * spread;
                        const pz = (Math.random() - 0.5) * spread * 0.5;
                        const ph = Math.random() * spread * 0.4;
                        x = px + (Math.random() - 0.5) * 5;
                        z = pz + (Math.random() - 0.5) * 4;
                        y = ph - spread * 0.1;
                    }
                    break;
                }
                default: { // 'diffuse'
                    // Classic emission nebula: Gaussian core + extended wings
                    const r = Math.pow(Math.random(), 0.5) * spread;
                    const theta = Math.random() * Math.PI * 2;
                    const phi = Math.acos(2 * Math.random() - 1);
                    x = r * Math.sin(phi) * Math.cos(theta);
                    y = r * Math.sin(phi) * Math.sin(theta) * 0.5;
                    z = r * Math.cos(phi) * 0.7;
                    // Core concentration
                    if (i < count * 0.3) {
                        x *= 0.3;
                        y *= 0.3;
                        z *= 0.3;
                    }
                    break;
                }
            }

            positions[i3] = x;
            positions[i3 + 1] = y;
            positions[i3 + 2] = z;

            // Normal pointing outward (for noise displacement direction)
            const len = Math.sqrt(x * x + y * y + z * z) || 1;
            normals[i3] = x / len;
            normals[i3 + 1] = y / len;
            normals[i3 + 2] = z / len;

            // Color: blend between nebula palette based on distance from center
            const distNorm = Math.min(Math.sqrt(x * x + y * y + z * z) / spread, 1.0);
            const colorChoice = Math.random();
            let cr, cg, cb;
            if (colorChoice < 0.35) {
                cr = c.primary[0]; cg = c.primary[1]; cb = c.primary[2];
            } else if (colorChoice < 0.6) {
                cr = c.secondary[0]; cg = c.secondary[1]; cb = c.secondary[2];
            } else if (colorChoice < 0.8) {
                cr = c.tertiary[0]; cg = c.tertiary[1]; cb = c.tertiary[2];
            } else {
                cr = c.accent[0]; cg = c.accent[1]; cb = c.accent[2];
            }
            // Fade toward edges
            const fade = 1.0 - distNorm * 0.5;
            colors[i3] = cr * fade;
            colors[i3 + 1] = cg * fade;
            colors[i3 + 2] = cb * fade;

            // Size: smaller at core, larger at edges for volumetric look
            sizes[i] = 4.0 + Math.random() * 8.0 + distNorm * 6.0;

            // Opacity: denser at core
            opacities[i] = Math.max(0.02, (1.0 - distNorm * 0.8) * (0.08 + Math.random() * 0.12));

            phases[i] = Math.random() * Math.PI * 2;
            turbulences[i] = 0.5 + Math.random() * 2.0;
            layers[i] = Math.random();
        }

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
        geometry.setAttribute('customColor', new THREE.BufferAttribute(colors, 3));
        geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
        geometry.setAttribute('opacity', new THREE.BufferAttribute(opacities, 1));
        geometry.setAttribute('phase', new THREE.BufferAttribute(phases, 1));
        geometry.setAttribute('turbulence', new THREE.BufferAttribute(turbulences, 1));
        geometry.setAttribute('layer', new THREE.BufferAttribute(layers, 1));

        const material = new THREE.ShaderMaterial({
            uniforms: sharedUniforms,
            vertexShader: nebulaGasVertexShader,
            fragmentShader: nebulaGasFragmentShader,
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
        });

        return new THREE.Points(geometry, material);
    }

    createDustLanes(data, sharedUniforms) {
        const count = data.dustCount;
        const positions = new Float32Array(count * 3);
        const sizes = new Float32Array(count);
        const opacities = new Float32Array(count);
        const phases = new Float32Array(count);

        const spread = data.spread;

        for (let i = 0; i < count; i++) {
            const i3 = i * 3;
            // Dust concentrated in bands/lanes
            const r = Math.pow(Math.random(), 0.4) * spread * 0.7;
            const theta = Math.random() * Math.PI * 2;
            // Flatten dust into disk-like lanes
            positions[i3] = r * Math.cos(theta) + (Math.random() - 0.5) * 5;
            positions[i3 + 1] = (Math.random() - 0.5) * spread * 0.15;
            positions[i3 + 2] = r * Math.sin(theta) * 0.6 + (Math.random() - 0.5) * 4;

            sizes[i] = 6.0 + Math.random() * 12.0;
            opacities[i] = 0.15 + Math.random() * 0.25;
            phases[i] = Math.random() * Math.PI * 2;
        }

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
        geometry.setAttribute('opacity', new THREE.BufferAttribute(opacities, 1));
        geometry.setAttribute('phase', new THREE.BufferAttribute(phases, 1));

        const material = new THREE.ShaderMaterial({
            uniforms: { time: sharedUniforms.time },
            vertexShader: dustVertexShader,
            fragmentShader: dustFragmentShader,
            transparent: true,
            depthWrite: false,
            blending: THREE.NormalBlending,
        });

        return new THREE.Points(geometry, material);
    }

    createFilaments(data, sharedUniforms) {
        const count = data.filamentCount;
        const positions = new Float32Array(count * 3);
        const colors = new Float32Array(count * 3);
        const sizes = new Float32Array(count);
        const opacities = new Float32Array(count);
        const phases = new Float32Array(count);

        const spread = data.spread;
        const c = data.colors;

        // Create several filament "lines"
        const numFilaments = 15 + Math.floor(Math.random() * 10);
        const particlesPerFilament = Math.floor(count / numFilaments);

        for (let f = 0; f < numFilaments; f++) {
            // Random starting point
            const startX = (Math.random() - 0.5) * spread * 0.8;
            const startY = (Math.random() - 0.5) * spread * 0.4;
            const startZ = (Math.random() - 0.5) * spread * 0.6;

            // Random direction
            const dx = (Math.random() - 0.5) * 2;
            const dy = (Math.random() - 0.5) * 1;
            const dz = (Math.random() - 0.5) * 1.5;
            const len = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;
            const ndx = dx / len;
            const ndy = dy / len;
            const ndz = dz / len;

            // Filament color: slightly shifted from primary
            const fColor = Math.random() < 0.5 ? c.primary : c.accent;

            for (let p = 0; p < particlesPerFilament; p++) {
                const idx = f * particlesPerFilament + p;
                if (idx >= count) break;
                const i3 = idx * 3;
                const t = (p / particlesPerFilament) * spread * 0.5;
                // Add curvature
                const curve = Math.sin(t * 0.3) * 3;

                positions[i3]     = startX + ndx * t + (Math.random() - 0.5) * 1.5 + curve * ndz;
                positions[i3 + 1] = startY + ndy * t + (Math.random() - 0.5) * 1.0;
                positions[i3 + 2] = startZ + ndz * t + (Math.random() - 0.5) * 1.5 - curve * ndx;

                const bright = 0.7 + Math.random() * 0.3;
                colors[i3]     = fColor[0] * bright;
                colors[i3 + 1] = fColor[1] * bright;
                colors[i3 + 2] = fColor[2] * bright;

                sizes[idx] = 1.5 + Math.random() * 3.5;
                opacities[idx] = 0.15 + Math.random() * 0.2;
                phases[idx] = Math.random();
            }
        }

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('customColor', new THREE.BufferAttribute(colors, 3));
        geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
        geometry.setAttribute('opacity', new THREE.BufferAttribute(opacities, 1));
        geometry.setAttribute('phase', new THREE.BufferAttribute(phases, 1));

        const material = new THREE.ShaderMaterial({
            uniforms: sharedUniforms,
            vertexShader: filamentVertexShader,
            fragmentShader: filamentFragmentShader,
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
        });

        return new THREE.Points(geometry, material);
    }

    createEmbeddedStars(data, sharedUniforms) {
        const count = data.starCount;
        const positions = new Float32Array(count * 3);
        const colors = new Float32Array(count * 3);
        const sizes = new Float32Array(count);
        const brightness = new Float32Array(count);
        const flickers = new Float32Array(count);

        const spread = data.spread;

        for (let i = 0; i < count; i++) {
            const i3 = i * 3;
            // Stars concentrated in the denser regions
            const r = Math.pow(Math.random(), 0.8) * spread * 0.6;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            positions[i3]     = r * Math.sin(phi) * Math.cos(theta);
            positions[i3 + 1] = r * Math.sin(phi) * Math.sin(theta) * 0.5;
            positions[i3 + 2] = r * Math.cos(phi) * 0.7;

            // Hot young stars: blue-white to white
            const temp = Math.random();
            if (temp < 0.4) {
                // Hot blue
                colors[i3] = 0.6 + Math.random() * 0.2;
                colors[i3 + 1] = 0.7 + Math.random() * 0.2;
                colors[i3 + 2] = 1.0;
            } else if (temp < 0.7) {
                // White
                colors[i3] = 0.95;
                colors[i3 + 1] = 0.95;
                colors[i3 + 2] = 1.0;
            } else if (temp < 0.85) {
                // Yellow
                colors[i3] = 1.0;
                colors[i3 + 1] = 0.9;
                colors[i3 + 2] = 0.5;
            } else {
                // Red (T Tauri stars)
                colors[i3] = 1.0;
                colors[i3 + 1] = 0.4;
                colors[i3 + 2] = 0.2;
            }

            sizes[i] = 2.0 + Math.random() * 5.0;
            brightness[i] = 0.5 + Math.random() * 0.5;
            flickers[i] = Math.random();
        }

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('customColor', new THREE.BufferAttribute(colors, 3));
        geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
        geometry.setAttribute('brightness', new THREE.BufferAttribute(brightness, 1));
        geometry.setAttribute('flicker', new THREE.BufferAttribute(flickers, 1));

        const material = new THREE.ShaderMaterial({
            uniforms: { time: sharedUniforms.time },
            vertexShader: embeddedStarVertexShader,
            fragmentShader: embeddedStarFragmentShader,
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
        });

        return new THREE.Points(geometry, material);
    }

    // ----------------------------------------------------------
    //  NEBULA SELECTION & TRANSITIONS
    // ----------------------------------------------------------

    async selectNebula(key) {
        if (this.isTransitioning) return;
        if (this.currentNebula === key) return;

        this.isTransitioning = true;
        const data = NEBULA_DATA[key];
        const overlay = document.getElementById('transition-overlay');
        const loadingOverlay = document.getElementById('loading-overlay');
        const loadingName = document.querySelector('.loader-nebula-name');
        const infoPanel = document.getElementById('info-panel');

        // Update loading text
        if (loadingName) loadingName.textContent = data.name;

        // Show transition if not first load
        if (this.currentNebula) {
            overlay.classList.add('active');
            infoPanel.classList.add('hidden');
            await this.sleep(800);
        } else {
            // First load: show loading overlay
            if (loadingOverlay) loadingOverlay.classList.remove('hidden');
        }

        // Remove old nebula
        if (this.nebulaGroup) {
            this.scene.remove(this.nebulaGroup);
        }

        // Generate or retrieve from cache
        if (!this.nebulaCache[key]) {
            // Small delay for UI responsiveness
            await this.sleep(50);
            this.nebulaCache[key] = this.generateNebula(key);
        }

        this.nebulaGroup = this.nebulaCache[key];
        this.scene.add(this.nebulaGroup);
        this.currentNebula = key;
        this.uniforms = this.nebulaGroup.userData.uniforms;

        // Update filter mode on the new nebula
        if (this.uniforms.filterMode) {
            this.uniforms.filterMode.value = this.filterMode;
        }

        // Update protostar visibility
        this.updateProtostarVisibility();

        // Camera transition
        const targetPos = data.cameraPos.clone();
        await this.animateCamera(targetPos, new THREE.Vector3(0, 0, 0), 1200);

        // Update UI
        this.updateInfoPanel(data);
        this.updateActiveThumb(key);

        // Fade in
        if (this.currentNebula) {
            overlay.classList.remove('active');
        }

        // Hide loading overlay
        if (loadingOverlay) {
            loadingOverlay.classList.add('hidden');
        }

        infoPanel.classList.remove('hidden');

        await this.sleep(300);
        this.isTransitioning = false;
    }

    animateCamera(targetPos, lookAt, duration) {
        return new Promise(resolve => {
            const startPos = this.camera.position.clone();
            const startTarget = this.controls.target.clone();
            const startTime = performance.now();

            const tick = () => {
                const elapsed = performance.now() - startTime;
                const t = Math.min(elapsed / duration, 1.0);
                // Ease in-out cubic
                const ease = t < 0.5
                    ? 4 * t * t * t
                    : 1 - Math.pow(-2 * t + 2, 3) / 2;

                this.camera.position.lerpVectors(startPos, targetPos, ease);
                this.controls.target.lerpVectors(startTarget, lookAt, ease);
                this.controls.update();

                if (t < 1.0) {
                    requestAnimationFrame(tick);
                } else {
                    resolve();
                }
            };
            tick();
        });
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // ----------------------------------------------------------
    //  UI SETUP & UPDATES
    // ----------------------------------------------------------

    setupUI() {
        // Nebula selector thumbs
        document.querySelectorAll('.nebula-thumb').forEach(thumb => {
            thumb.addEventListener('click', () => {
                const key = thumb.dataset.nebula;
                this.selectNebula(key);
            });
        });

        // Filter buttons
        document.querySelectorAll('.btn-filter').forEach(btn => {
            btn.addEventListener('click', () => {
                const filter = btn.dataset.filter;
                let mode = 0;
                if (filter === 'halpha') mode = 1;
                else if (filter === 'oiii') mode = 2;
                this.setFilter(mode);

                // Update active states
                document.querySelectorAll('.btn-filter').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });
        });

        // Star formation toggle
        const starToggle = document.getElementById('toggle-stars');
        if (starToggle) {
            starToggle.addEventListener('click', () => {
                this.showProtostars = !this.showProtostars;
                starToggle.classList.toggle('active', this.showProtostars);
                this.updateProtostarVisibility();
            });
            // Set initial state
            starToggle.classList.add('active');
        }

        // Bloom slider
        const bloomSlider = document.getElementById('bloom-intensity');
        const bloomVal = document.getElementById('bloom-val');
        if (bloomSlider) {
            bloomSlider.addEventListener('input', () => {
                const v = parseFloat(bloomSlider.value);
                this.bloomPass.strength = v;
                if (bloomVal) bloomVal.textContent = v.toFixed(1);
            });
        }

        // Auto-rotate toggle
        const rotateToggle = document.getElementById('toggle-rotate');
        if (rotateToggle) {
            rotateToggle.addEventListener('click', () => {
                this.controls.autoRotate = !this.controls.autoRotate;
                rotateToggle.classList.toggle('active', this.controls.autoRotate);
            });
            rotateToggle.classList.add('active');
        }

        // Reset view button
        const resetBtn = document.getElementById('btn-reset');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                if (this.currentNebula) {
                    const data = NEBULA_DATA[this.currentNebula];
                    this.animateCamera(data.cameraPos.clone(), new THREE.Vector3(0, 0, 0), 800);
                }
            });
        }
    }

    setFilter(mode) {
        this.filterMode = mode;
        if (this.uniforms && this.uniforms.filterMode) {
            this.uniforms.filterMode.value = mode;
        }
    }

    updateProtostarVisibility() {
        if (!this.nebulaGroup) return;
        this.nebulaGroup.children.forEach(child => {
            if (child.userData && child.userData.isProtostar) {
                child.visible = this.showProtostars;
            }
        });
    }

    updateInfoPanel(data) {
        const nameEl = document.getElementById('info-name');
        const desigEl = document.getElementById('info-designation');
        const typeEl = document.getElementById('info-type');
        const distEl = document.getElementById('info-distance');
        const sizeEl = document.getElementById('info-size');
        const descEl = document.getElementById('info-description');

        if (nameEl) nameEl.textContent = data.name;
        if (desigEl) desigEl.textContent = data.designation;
        if (typeEl) typeEl.textContent = data.type;
        if (distEl) distEl.textContent = data.distance;
        if (sizeEl) sizeEl.textContent = data.size;
        if (descEl) descEl.textContent = data.description;
    }

    updateActiveThumb(key) {
        document.querySelectorAll('.nebula-thumb').forEach(t => {
            t.classList.toggle('active', t.dataset.nebula === key);
        });
    }

    // ----------------------------------------------------------
    //  ANIMATION LOOP
    // ----------------------------------------------------------

    animate() {
        requestAnimationFrame(() => this.animate());

        const elapsed = this.clock.getElapsedTime();

        // Update nebula uniforms
        if (this.uniforms && this.uniforms.time) {
            this.uniforms.time.value = elapsed;
        }

        // Slow background star rotation
        if (this.backgroundStars) {
            this.backgroundStars.rotation.y = elapsed * 0.002;
            this.backgroundStars.rotation.x = Math.sin(elapsed * 0.001) * 0.02;
        }

        this.controls.update();
        this.composer.render();

        // FPS counter
        this.updateFPS();
    }

    updateFPS() {
        if (!this._fpsTime) {
            this._fpsTime = performance.now();
            this._fpsCount = 0;
        }
        this._fpsCount++;
        const now = performance.now();
        if (now - this._fpsTime >= 1000) {
            const fps = Math.round(this._fpsCount * 1000 / (now - this._fpsTime));
            const fpsEl = document.getElementById('fps');
            if (fpsEl) fpsEl.textContent = fps + ' FPS';
            this._fpsTime = now;
            this._fpsCount = 0;
        }
    }

    // ----------------------------------------------------------
    //  RESIZE
    // ----------------------------------------------------------

    onResize() {
        const w = window.innerWidth;
        const h = window.innerHeight;
        this.camera.aspect = w / h;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(w, h);
        this.composer.setSize(w, h);
        this.bloomPass.resolution.set(w, h);
    }
}
