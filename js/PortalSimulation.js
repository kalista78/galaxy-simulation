/**
 * PortalSimulation.js
 * Cinematic landing page for the Galaxy project.
 * Handles: warp-speed entry, galaxy formation, nebula background,
 *          card preview canvases, and navigation transitions.
 */

import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

// ─── Constants ───────────────────────────────────────────────────────────
const STAR_COUNT = 50000;
const GALAXY_COUNT = 10000;
const NEBULA_COUNT = 3000;
const DUST_COUNT = 800;
const WARP_DURATION = 3.0;       // seconds
const FORMATION_DURATION = 2.5;  // seconds
const PI2 = Math.PI * 2;

// ─── Color palette ───────────────────────────────────────────────────────
const COL_BLUE   = new THREE.Color(0x4488ff);
const COL_PURPLE = new THREE.Color(0x8844ff);
const COL_CYAN   = new THREE.Color(0x44ddff);
const COL_WHITE  = new THREE.Color(0xffffff);
const COL_WARM   = new THREE.Color(0xffaa44);

// ─── Utility ─────────────────────────────────────────────────────────────
function lerp(a, b, t) { return a + (b - a) * t; }
function smoothstep(t) { return t * t * (3 - 2 * t); }
function rand(min, max) { return Math.random() * (max - min) + min; }

// ─── Circular Gaussian ──────────────────────────────────────────────────
function gaussianRandom(mean = 0, stdev = 1) {
    const u1 = Math.random();
    const u2 = Math.random();
    return mean + stdev * Math.sqrt(-2 * Math.log(u1 || 0.0001)) * Math.cos(PI2 * u2);
}


// =========================================================================
//  Main Portal Simulation
// =========================================================================
export class PortalSimulation {
    constructor(canvas) {
        this.canvas = canvas;
        this.clock = new THREE.Clock();
        this.elapsed = 0;
        this.phase = 'warp';  // warp | formation | idle
        this.disposed = false;
        this.introComplete = false;
        this.onIntroComplete = null; // callback

        this._initRenderer();
        this._initScene();
        this._initStars();
        this._initGalaxy();
        this._initNebula();
        this._initDust();
        this._initPostProcessing();
        this._onResize = this._handleResize.bind(this);
        window.addEventListener('resize', this._onResize);
        this._handleResize();
        this._animate();
    }

    // ─── Renderer ────────────────────────────────────────────────────────
    _initRenderer() {
        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            antialias: false,
            alpha: false,
            powerPreference: 'high-performance'
        });
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.setClearColor(0x000000, 1);
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.0;
    }

    // ─── Scene & Camera ──────────────────────────────────────────────────
    _initScene() {
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, 1, 0.1, 2000);
        this.camera.position.set(0, 0, 5);
        this.camera.lookAt(0, 0, 0);
    }

    // ─── Star Field (warp streaks) ───────────────────────────────────────
    _initStars() {
        const positions = new Float32Array(STAR_COUNT * 3);
        const colors = new Float32Array(STAR_COUNT * 3);
        const sizes = new Float32Array(STAR_COUNT);
        const velocities = new Float32Array(STAR_COUNT * 3); // stored for warp
        const targetPositions = new Float32Array(STAR_COUNT * 3); // galaxy targets

        for (let i = 0; i < STAR_COUNT; i++) {
            const i3 = i * 3;
            // Place stars in a cylinder around camera for warp
            const angle = Math.random() * PI2;
            const radius = rand(0.5, 40);
            positions[i3]     = Math.cos(angle) * radius;
            positions[i3 + 1] = Math.sin(angle) * radius;
            positions[i3 + 2] = rand(-200, 200);

            // Warp velocity (mostly Z towards camera)
            velocities[i3]     = 0;
            velocities[i3 + 1] = 0;
            velocities[i3 + 2] = rand(30, 120);

            // Color
            const t = Math.random();
            const col = new THREE.Color();
            if (t < 0.5) col.lerpColors(COL_WHITE, COL_CYAN, t * 2);
            else col.lerpColors(COL_CYAN, COL_BLUE, (t - 0.5) * 2);
            colors[i3]     = col.r;
            colors[i3 + 1] = col.g;
            colors[i3 + 2] = col.b;

            sizes[i] = rand(0.8, 3.0);

            // Galaxy target (will be set properly in _initGalaxy)
            targetPositions[i3] = 0;
            targetPositions[i3 + 1] = 0;
            targetPositions[i3 + 2] = 0;
        }

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

        const material = new THREE.ShaderMaterial({
            uniforms: {
                uTime: { value: 0 },
                uPhase: { value: 0 },       // 0 = warp, 1 = galaxy
                uWarpStretch: { value: 1.0 },
                uPixelRatio: { value: this.renderer.getPixelRatio() },
                uOpacity: { value: 1.0 }
            },
            vertexShader: `
                attribute float size;
                varying vec3 vColor;
                varying float vAlpha;
                uniform float uTime;
                uniform float uPhase;
                uniform float uWarpStretch;
                uniform float uPixelRatio;

                void main() {
                    vColor = color;
                    vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
                    float dist = length(mvPos.xyz);
                    float pointSize = size * uPixelRatio * (150.0 / dist);

                    // During warp, stretch points based on Z velocity
                    if (uPhase < 0.5) {
                        pointSize *= mix(1.0, 2.5, uWarpStretch);
                    }

                    gl_PointSize = clamp(pointSize, 0.5, 20.0);
                    gl_Position = projectionMatrix * mvPos;

                    // Fade based on distance
                    vAlpha = smoothstep(800.0, 200.0, dist) * smoothstep(0.0, 2.0, dist);
                }
            `,
            fragmentShader: `
                varying vec3 vColor;
                varying float vAlpha;
                uniform float uOpacity;
                uniform float uPhase;

                void main() {
                    vec2 uv = gl_PointCoord - 0.5;
                    float d = length(uv);
                    if (d > 0.5) discard;

                    float alpha = smoothstep(0.5, 0.0, d);
                    // Brighter core during warp
                    float core = smoothstep(0.15, 0.0, d);
                    vec3 col = vColor + core * 0.6;

                    gl_FragColor = vec4(col, alpha * vAlpha * uOpacity);
                }
            `,
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
            vertexColors: true
        });

        this.stars = new THREE.Points(geometry, material);
        this.scene.add(this.stars);

        // Store for later use
        this.starVelocities = velocities;
        this.starTargetPositions = targetPositions;
        this.starOriginalPositions = new Float32Array(positions);
    }

    // ─── Galaxy Target Positions ─────────────────────────────────────────
    _initGalaxy() {
        const targets = this.starTargetPositions;
        const arms = 4;
        const armSpread = 0.5;

        for (let i = 0; i < STAR_COUNT; i++) {
            const i3 = i * 3;
            let x, y, z;

            if (i < GALAXY_COUNT) {
                // Logarithmic spiral galaxy
                const armIndex = i % arms;
                const armAngle = (armIndex / arms) * PI2;
                const t = Math.pow(Math.random(), 0.6);
                const radius = t * 60;
                const angle = armAngle + Math.log(1 + radius * 0.2) * 2.5;

                // Spread within arm
                const spreadX = gaussianRandom(0, armSpread * (0.3 + t * 0.7));
                const spreadY = gaussianRandom(0, 0.15 * (1 - t * 0.5));
                const spreadZ = gaussianRandom(0, armSpread * (0.3 + t * 0.7));

                x = Math.cos(angle) * radius + spreadX;
                y = spreadY;
                z = Math.sin(angle) * radius + spreadZ;
            } else {
                // Background stars: sphere distribution
                const phi = Math.random() * PI2;
                const costheta = 2 * Math.random() - 1;
                const sintheta = Math.sqrt(1 - costheta * costheta);
                const r = rand(80, 400);
                x = r * sintheta * Math.cos(phi);
                y = r * sintheta * Math.sin(phi);
                z = r * costheta;
            }

            targets[i3]     = x;
            targets[i3 + 1] = y;
            targets[i3 + 2] = z;
        }

        // Update colors for galaxy stars (warm core, blue arms)
        const colors = this.stars.geometry.attributes.color.array;
        for (let i = 0; i < GALAXY_COUNT; i++) {
            const i3 = i * 3;
            const radius = Math.sqrt(
                targets[i3] * targets[i3] +
                targets[i3 + 1] * targets[i3 + 1] +
                targets[i3 + 2] * targets[i3 + 2]
            );
            const t = Math.min(radius / 60, 1);
            const col = new THREE.Color();

            if (t < 0.15) {
                col.lerpColors(COL_WHITE, COL_WARM, t / 0.15);
            } else if (t < 0.5) {
                col.lerpColors(COL_WARM, COL_BLUE, (t - 0.15) / 0.35);
            } else {
                col.lerpColors(COL_BLUE, COL_PURPLE, (t - 0.5) / 0.5);
            }

            // Store as target colors (will blend during formation)
            this._galaxyColors = this._galaxyColors || new Float32Array(GALAXY_COUNT * 3);
            this._galaxyColors[i3]     = col.r;
            this._galaxyColors[i3 + 1] = col.g;
            this._galaxyColors[i3 + 2] = col.b;
        }
    }

    // ─── Nebula Background ───────────────────────────────────────────────
    _initNebula() {
        const positions = new Float32Array(NEBULA_COUNT * 3);
        const colors = new Float32Array(NEBULA_COUNT * 3);
        const sizes = new Float32Array(NEBULA_COUNT);

        const nebulaCenters = [
            { x: -80, y: 30, z: -150, color: COL_PURPLE },
            { x: 100, y: -20, z: -180, color: COL_BLUE },
            { x: -30, y: -50, z: -120, color: COL_CYAN },
            { x: 60, y: 60, z: -200, color: new THREE.Color(0xff4488) },
        ];

        for (let i = 0; i < NEBULA_COUNT; i++) {
            const i3 = i * 3;
            const center = nebulaCenters[i % nebulaCenters.length];
            const spread = 50;

            positions[i3]     = center.x + gaussianRandom(0, spread);
            positions[i3 + 1] = center.y + gaussianRandom(0, spread);
            positions[i3 + 2] = center.z + gaussianRandom(0, spread * 0.5);

            const jitter = rand(0.7, 1.0);
            colors[i3]     = center.color.r * jitter;
            colors[i3 + 1] = center.color.g * jitter;
            colors[i3 + 2] = center.color.b * jitter;

            sizes[i] = rand(20, 80);
        }

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

        const material = new THREE.ShaderMaterial({
            uniforms: {
                uTime: { value: 0 },
                uPixelRatio: { value: this.renderer.getPixelRatio() }
            },
            vertexShader: `
                attribute float size;
                varying vec3 vColor;
                varying float vAlpha;
                uniform float uPixelRatio;
                uniform float uTime;

                void main() {
                    vColor = color;
                    vec3 pos = position;
                    pos.x += sin(uTime * 0.1 + position.z * 0.01) * 3.0;
                    pos.y += cos(uTime * 0.08 + position.x * 0.01) * 2.0;

                    vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);
                    float dist = length(mvPos.xyz);
                    gl_PointSize = size * uPixelRatio * (200.0 / dist);
                    gl_PointSize = clamp(gl_PointSize, 1.0, 100.0);
                    gl_Position = projectionMatrix * mvPos;

                    vAlpha = smoothstep(500.0, 100.0, dist);
                }
            `,
            fragmentShader: `
                varying vec3 vColor;
                varying float vAlpha;

                void main() {
                    vec2 uv = gl_PointCoord - 0.5;
                    float d = length(uv);
                    if (d > 0.5) discard;

                    float alpha = smoothstep(0.5, 0.15, d);
                    alpha *= alpha * 0.12;

                    gl_FragColor = vec4(vColor, alpha * vAlpha);
                }
            `,
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
            vertexColors: true
        });

        this.nebula = new THREE.Points(geometry, material);
        this.scene.add(this.nebula);
    }

    // ─── Floating Dust ───────────────────────────────────────────────────
    _initDust() {
        const positions = new Float32Array(DUST_COUNT * 3);
        const sizes = new Float32Array(DUST_COUNT);

        for (let i = 0; i < DUST_COUNT; i++) {
            const i3 = i * 3;
            positions[i3]     = rand(-100, 100);
            positions[i3 + 1] = rand(-60, 60);
            positions[i3 + 2] = rand(-50, 50);
            sizes[i] = rand(1.0, 4.0);
        }

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

        const material = new THREE.ShaderMaterial({
            uniforms: {
                uTime: { value: 0 },
                uPixelRatio: { value: this.renderer.getPixelRatio() }
            },
            vertexShader: `
                attribute float size;
                varying float vAlpha;
                uniform float uTime;
                uniform float uPixelRatio;

                void main() {
                    vec3 pos = position;
                    pos.x += sin(uTime * 0.3 + position.y * 0.1) * 2.0;
                    pos.y += cos(uTime * 0.2 + position.x * 0.08) * 1.5;
                    pos.z += sin(uTime * 0.15 + position.x * 0.05) * 1.0;

                    vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);
                    float dist = length(mvPos.xyz);
                    gl_PointSize = size * uPixelRatio * (80.0 / dist);
                    gl_PointSize = clamp(gl_PointSize, 0.5, 8.0);
                    gl_Position = projectionMatrix * mvPos;

                    vAlpha = smoothstep(200.0, 20.0, dist) * 0.4;
                }
            `,
            fragmentShader: `
                varying float vAlpha;

                void main() {
                    vec2 uv = gl_PointCoord - 0.5;
                    float d = length(uv);
                    if (d > 0.5) discard;

                    float alpha = smoothstep(0.5, 0.0, d);
                    gl_FragColor = vec4(0.7, 0.8, 1.0, alpha * vAlpha);
                }
            `,
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending
        });

        this.dust = new THREE.Points(geometry, material);
        this.scene.add(this.dust);
    }

    // ─── Post Processing ─────────────────────────────────────────────────
    _initPostProcessing() {
        const size = this.renderer.getSize(new THREE.Vector2());
        this.composer = new EffectComposer(this.renderer);
        this.composer.addPass(new RenderPass(this.scene, this.camera));

        this.bloomPass = new UnrealBloomPass(
            new THREE.Vector2(size.x, size.y),
            1.2,   // strength
            0.6,   // radius
            0.3    // threshold
        );
        this.composer.addPass(this.bloomPass);
    }

    // ─── Resize ──────────────────────────────────────────────────────────
    _handleResize() {
        if (this.disposed) return;
        const w = window.innerWidth;
        const h = window.innerHeight;
        this.camera.aspect = w / h;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(w, h);
        this.composer.setSize(w, h);

        const pr = this.renderer.getPixelRatio();
        this.stars.material.uniforms.uPixelRatio.value = pr;
        this.nebula.material.uniforms.uPixelRatio.value = pr;
        this.dust.material.uniforms.uPixelRatio.value = pr;
    }

    // ─── Animation Loop ──────────────────────────────────────────────────
    _animate() {
        if (this.disposed) return;
        requestAnimationFrame(() => this._animate());

        const delta = Math.min(this.clock.getDelta(), 0.05);
        this.elapsed += delta;
        const t = this.elapsed;

        // Update uniforms
        this.stars.material.uniforms.uTime.value = t;
        this.nebula.material.uniforms.uTime.value = t;
        this.dust.material.uniforms.uTime.value = t;

        if (this.phase === 'warp') {
            this._updateWarp(delta, t);
        } else if (this.phase === 'formation') {
            this._updateFormation(delta, t);
        } else {
            this._updateIdle(delta, t);
        }

        this.composer.render();
    }

    // ─── Warp Phase ──────────────────────────────────────────────────────
    _updateWarp(delta, t) {
        if (t >= WARP_DURATION) {
            this.phase = 'formation';
            this.formationStart = t;
            // Snap camera
            this.stars.material.uniforms.uPhase.value = 0.5;
            return;
        }

        const progress = t / WARP_DURATION;
        const accel = smoothstep(Math.min(progress * 2, 1)); // Accelerate first half
        const stretch = accel * (1 - smoothstep(Math.max(0, progress - 0.8) * 5));

        this.stars.material.uniforms.uWarpStretch.value = stretch;

        // Move stars toward camera
        const pos = this.stars.geometry.attributes.position.array;
        for (let i = 0; i < STAR_COUNT; i++) {
            const i3 = i * 3;
            pos[i3 + 2] += this.starVelocities[i3 + 2] * delta * accel;

            // Wrap stars that pass camera
            if (pos[i3 + 2] > 10) {
                pos[i3 + 2] = -200 + Math.random() * 20;
                const angle = Math.random() * PI2;
                const radius = rand(0.5, 40);
                pos[i3]     = Math.cos(angle) * radius;
                pos[i3 + 1] = Math.sin(angle) * radius;
            }
        }
        this.stars.geometry.attributes.position.needsUpdate = true;

        // Bloom ramps up during warp
        this.bloomPass.strength = lerp(0.8, 2.5, accel);

        // Slight camera shake
        const shake = accel * 0.05;
        this.camera.position.x = (Math.random() - 0.5) * shake;
        this.camera.position.y = (Math.random() - 0.5) * shake;
    }

    // ─── Formation Phase ─────────────────────────────────────────────────
    _updateFormation(delta, t) {
        const progress = Math.min((t - this.formationStart) / FORMATION_DURATION, 1);
        const ease = smoothstep(progress);

        this.stars.material.uniforms.uPhase.value = 0.5 + ease * 0.5;
        this.stars.material.uniforms.uWarpStretch.value = 1 - ease;

        const pos = this.stars.geometry.attributes.position.array;
        const colors = this.stars.geometry.attributes.color.array;

        for (let i = 0; i < STAR_COUNT; i++) {
            const i3 = i * 3;

            // Lerp position to galaxy target
            pos[i3]     = lerp(pos[i3],     this.starTargetPositions[i3],     ease * 0.08);
            pos[i3 + 1] = lerp(pos[i3 + 1], this.starTargetPositions[i3 + 1], ease * 0.08);
            pos[i3 + 2] = lerp(pos[i3 + 2], this.starTargetPositions[i3 + 2], ease * 0.08);

            // Blend colors for galaxy stars
            if (i < GALAXY_COUNT && this._galaxyColors) {
                colors[i3]     = lerp(colors[i3],     this._galaxyColors[i3],     ease * 0.05);
                colors[i3 + 1] = lerp(colors[i3 + 1], this._galaxyColors[i3 + 1], ease * 0.05);
                colors[i3 + 2] = lerp(colors[i3 + 2], this._galaxyColors[i3 + 2], ease * 0.05);
            }
        }

        this.stars.geometry.attributes.position.needsUpdate = true;
        this.stars.geometry.attributes.color.needsUpdate = true;

        // Pull camera back to view galaxy
        this.camera.position.z = lerp(this.camera.position.z, 80, ease * 0.04);
        this.camera.position.x = lerp(this.camera.position.x, 0, 0.1);
        this.camera.position.y = lerp(this.camera.position.y, 30, ease * 0.04);
        this.camera.lookAt(0, 0, 0);

        // Ease bloom back
        this.bloomPass.strength = lerp(this.bloomPass.strength, 1.2, 0.03);

        if (progress >= 1) {
            this.phase = 'idle';
            if (!this.introComplete) {
                this.introComplete = true;
                if (this.onIntroComplete) this.onIntroComplete();
            }
        }
    }

    // ─── Idle Phase (galaxy slowly rotates) ──────────────────────────────
    _updateIdle(delta, t) {
        // Slow galaxy rotation
        this.stars.rotation.y += delta * 0.04;
        this.nebula.rotation.y += delta * 0.01;

        // Gentle camera orbit
        const camAngle = t * 0.015;
        const camRadius = 85;
        const camHeight = 30 + Math.sin(t * 0.08) * 5;
        this.camera.position.x = lerp(this.camera.position.x, Math.sin(camAngle) * camRadius, 0.01);
        this.camera.position.z = lerp(this.camera.position.z, Math.cos(camAngle) * camRadius, 0.01);
        this.camera.position.y = lerp(this.camera.position.y, camHeight, 0.01);
        this.camera.lookAt(0, 0, 0);

        // Breathe bloom
        this.bloomPass.strength = 1.0 + Math.sin(t * 0.3) * 0.15;
    }

    // ─── Skip to idle ────────────────────────────────────────────────────
    skipIntro() {
        if (this.phase === 'idle') return;

        // Instantly move stars to galaxy positions
        const pos = this.stars.geometry.attributes.position.array;
        const colors = this.stars.geometry.attributes.color.array;
        for (let i = 0; i < STAR_COUNT; i++) {
            const i3 = i * 3;
            pos[i3]     = this.starTargetPositions[i3];
            pos[i3 + 1] = this.starTargetPositions[i3 + 1];
            pos[i3 + 2] = this.starTargetPositions[i3 + 2];

            if (i < GALAXY_COUNT && this._galaxyColors) {
                colors[i3]     = this._galaxyColors[i3];
                colors[i3 + 1] = this._galaxyColors[i3 + 1];
                colors[i3 + 2] = this._galaxyColors[i3 + 2];
            }
        }
        this.stars.geometry.attributes.position.needsUpdate = true;
        this.stars.geometry.attributes.color.needsUpdate = true;
        this.stars.material.uniforms.uPhase.value = 1.0;
        this.stars.material.uniforms.uWarpStretch.value = 0;

        this.camera.position.set(0, 30, 80);
        this.camera.lookAt(0, 0, 0);
        this.bloomPass.strength = 1.2;
        this.phase = 'idle';

        if (!this.introComplete) {
            this.introComplete = true;
            if (this.onIntroComplete) this.onIntroComplete();
        }
    }

    // ─── Trigger warp-out effect (for card click) ────────────────────────
    triggerWarpOut() {
        this.bloomPass.strength = 3.0;
        this.stars.material.uniforms.uOpacity.value = 2.0;
    }

    // ─── Cleanup ─────────────────────────────────────────────────────────
    dispose() {
        this.disposed = true;
        window.removeEventListener('resize', this._onResize);
        this.renderer.dispose();
        this.composer.dispose();
    }
}


// =========================================================================
//  Card Preview - small animated particle canvas for each nav card
// =========================================================================
export class CardPreview {
    constructor(canvas, themeIndex) {
        this.canvas = canvas;
        this.theme = themeIndex;
        this.clock = new THREE.Clock();
        this.disposed = false;
        this.hovered = false;
        this.speed = 1;

        this._init();
        this._animate();
    }

    _init() {
        const w = this.canvas.clientWidth || 300;
        const h = this.canvas.clientHeight || 120;

        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            antialias: false,
            alpha: true
        });
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
        this.renderer.setSize(w, h);
        this.renderer.setClearColor(0x000000, 0);

        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(60, w / h, 0.1, 200);
        this.camera.position.z = 20;

        const count = 600;
        const positions = new Float32Array(count * 3);
        const colors = new Float32Array(count * 3);
        const sizes = new Float32Array(count);

        // Themed colors
        const themes = [
            [COL_BLUE, COL_CYAN, COL_WHITE],             // Milky Way
            [COL_PURPLE, new THREE.Color(0xff4488), COL_CYAN], // Nebula
            [COL_WARM, COL_BLUE, COL_WHITE],               // Evolution
            [COL_CYAN, COL_BLUE, COL_PURPLE],              // Gravity
            [COL_WHITE, COL_CYAN, COL_BLUE],               // Universe Scale
            [COL_WARM, COL_PURPLE, COL_BLUE],              // Classic
        ];

        const palette = themes[this.theme % themes.length];

        for (let i = 0; i < count; i++) {
            const i3 = i * 3;

            if (this.theme === 0 || this.theme === 5) {
                // Spiral
                const arm = i % 3;
                const armAngle = (arm / 3) * PI2;
                const t = Math.random();
                const r = t * 12;
                const a = armAngle + t * 4;
                positions[i3]     = Math.cos(a) * r + gaussianRandom(0, 0.4);
                positions[i3 + 1] = gaussianRandom(0, 0.2);
                positions[i3 + 2] = Math.sin(a) * r + gaussianRandom(0, 0.4);
            } else if (this.theme === 1) {
                // Nebula cloud
                const cx = (Math.random() - 0.5) * 4;
                const cy = (Math.random() - 0.5) * 2;
                positions[i3]     = cx + gaussianRandom(0, 4);
                positions[i3 + 1] = cy + gaussianRandom(0, 3);
                positions[i3 + 2] = gaussianRandom(0, 3);
            } else if (this.theme === 2) {
                // Expanding sphere
                const phi = Math.random() * PI2;
                const costh = 2 * Math.random() - 1;
                const sinth = Math.sqrt(1 - costh * costh);
                const r = rand(2, 10);
                positions[i3]     = r * sinth * Math.cos(phi);
                positions[i3 + 1] = r * sinth * Math.sin(phi);
                positions[i3 + 2] = r * costh;
            } else if (this.theme === 3) {
                // Orbiting bodies
                const orbit = rand(3, 12);
                const angle = Math.random() * PI2;
                positions[i3]     = Math.cos(angle) * orbit;
                positions[i3 + 1] = (Math.random() - 0.5) * 2;
                positions[i3 + 2] = Math.sin(angle) * orbit;
            } else {
                // Random field
                positions[i3]     = (Math.random() - 0.5) * 24;
                positions[i3 + 1] = (Math.random() - 0.5) * 14;
                positions[i3 + 2] = (Math.random() - 0.5) * 14;
            }

            const col = palette[Math.floor(Math.random() * palette.length)].clone();
            col.multiplyScalar(rand(0.6, 1.2));
            colors[i3]     = col.r;
            colors[i3 + 1] = col.g;
            colors[i3 + 2] = col.b;

            sizes[i] = rand(1.5, 4.0);
        }

        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

        const mat = new THREE.ShaderMaterial({
            uniforms: {
                uTime: { value: 0 },
                uPixelRatio: { value: this.renderer.getPixelRatio() }
            },
            vertexShader: `
                attribute float size;
                varying vec3 vColor;
                varying float vAlpha;
                uniform float uTime;
                uniform float uPixelRatio;

                void main() {
                    vColor = color;
                    vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
                    float dist = length(mvPos.xyz);
                    gl_PointSize = size * uPixelRatio * (40.0 / dist);
                    gl_PointSize = clamp(gl_PointSize, 0.5, 12.0);
                    gl_Position = projectionMatrix * mvPos;
                    vAlpha = smoothstep(60.0, 5.0, dist);
                }
            `,
            fragmentShader: `
                varying vec3 vColor;
                varying float vAlpha;

                void main() {
                    vec2 uv = gl_PointCoord - 0.5;
                    float d = length(uv);
                    if (d > 0.5) discard;
                    float alpha = smoothstep(0.5, 0.0, d);
                    float core = smoothstep(0.12, 0.0, d) * 0.5;
                    gl_FragColor = vec4(vColor + core, alpha * vAlpha * 0.8);
                }
            `,
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
            vertexColors: true
        });

        this.points = new THREE.Points(geo, mat);
        this.scene.add(this.points);
    }

    setHovered(val) {
        this.hovered = val;
    }

    _animate() {
        if (this.disposed) return;
        requestAnimationFrame(() => this._animate());

        const delta = this.clock.getDelta();
        const targetSpeed = this.hovered ? 3.0 : 1.0;
        this.speed = lerp(this.speed, targetSpeed, 0.05);

        this.points.material.uniforms.uTime.value += delta * this.speed;
        this.points.rotation.y += delta * 0.15 * this.speed;

        if (this.theme === 2) {
            this.points.rotation.x += delta * 0.05 * this.speed;
        }

        this.renderer.render(this.scene, this.camera);
    }

    dispose() {
        this.disposed = true;
        this.renderer.dispose();
    }
}
