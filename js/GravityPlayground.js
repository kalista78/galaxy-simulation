/**
 * GravityPlayground.js
 * N-Body Gravity Simulation with Barnes-Hut optimization,
 * Velocity Verlet integration, collision merging, trails,
 * gravity field visualization, and rich visual effects.
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

// ============================================================
// CONSTANTS
// ============================================================

const BODY_TYPES = {
    star: {
        baseMass: 800,
        baseRadius: 2.5,
        color: new THREE.Color(1.0, 0.95, 0.7),
        glowColor: new THREE.Color(1.0, 0.85, 0.4),
        emissive: 2.0,
        trailWidth: 1.5
    },
    planet: {
        baseMass: 40,
        baseRadius: 1.2,
        color: new THREE.Color(0.4, 0.7, 1.0),
        glowColor: null,
        emissive: 0.3,
        trailWidth: 1.0
    },
    blackhole: {
        baseMass: 5000,
        baseRadius: 2.0,
        color: new THREE.Color(0.05, 0.0, 0.1),
        glowColor: new THREE.Color(0.6, 0.2, 1.0),
        emissive: 0.1,
        trailWidth: 2.0
    },
    asteroid: {
        baseMass: 2,
        baseRadius: 0.3,
        color: new THREE.Color(0.6, 0.55, 0.5),
        glowColor: null,
        emissive: 0.0,
        trailWidth: 0.5
    },
    gasparticle: {
        baseMass: 1,
        baseRadius: 0.25,
        color: new THREE.Color(1.0, 0.5, 0.7),
        glowColor: null,
        emissive: 0.2,
        trailWidth: 0.4
    }
};

const PLANET_COLORS = [
    new THREE.Color(0.3, 0.6, 1.0),
    new THREE.Color(0.9, 0.4, 0.2),
    new THREE.Color(0.2, 0.8, 0.5),
    new THREE.Color(0.8, 0.7, 0.3),
    new THREE.Color(0.7, 0.3, 0.8),
    new THREE.Color(0.3, 0.9, 0.9),
    new THREE.Color(1.0, 0.6, 0.7)
];

const TRAIL_LENGTH = 200;
const SOFTENING = 2.0;
const SOFTENING_SQ = SOFTENING * SOFTENING;
const MAX_BODIES = 1200;
const ROCHE_FACTOR = 2.5;
const COLLISION_DEBRIS_COUNT = 12;

// ============================================================
// BODY CLASS
// ============================================================

class Body {
    constructor(type, mass, position, velocity, id) {
        this.type = type;
        this.mass = mass;
        this.pos = position.clone();
        this.vel = velocity.clone();
        this.acc = new THREE.Vector3();
        this.id = id;
        this.alive = true;
        this.age = 0;

        const td = BODY_TYPES[type] || BODY_TYPES.planet;
        this.radius = td.baseRadius * Math.pow(mass / td.baseMass, 0.33);
        this.radius = Math.max(0.15, Math.min(this.radius, 12));

        // Color with slight variation for planets
        if (type === 'planet') {
            this.color = PLANET_COLORS[Math.floor(Math.random() * PLANET_COLORS.length)].clone();
        } else {
            this.color = td.color.clone();
        }

        // Trail
        this.trail = [];
        this.trailDirty = true;
    }

    speed() {
        return this.vel.length();
    }

    kineticEnergy() {
        return 0.5 * this.mass * this.vel.lengthSq();
    }
}

// ============================================================
// BARNES-HUT OCTREE
// ============================================================

class OctreeNode {
    constructor(center, halfSize) {
        this.center = center;
        this.halfSize = halfSize;
        this.mass = 0;
        this.com = new THREE.Vector3(); // center of mass
        this.body = null;   // leaf body
        this.children = null; // 8 children
        this.isLeaf = true;
        this.bodyCount = 0;
    }

    insert(body) {
        if (this.bodyCount === 0) {
            this.body = body;
            this.mass = body.mass;
            this.com.copy(body.pos).multiplyScalar(body.mass);
            this.bodyCount = 1;
            return;
        }

        if (this.isLeaf) {
            this._subdivide();
            // re-insert existing body
            if (this.body) {
                this._insertChild(this.body);
                this.body = null;
            }
            this.isLeaf = false;
        }

        this._insertChild(body);
        // update mass and com
        this.com.addScaledVector(body.pos, body.mass);
        this.mass += body.mass;
        this.bodyCount++;
    }

    _subdivide() {
        this.children = new Array(8);
        const hs = this.halfSize * 0.5;
        for (let i = 0; i < 8; i++) {
            const offset = new THREE.Vector3(
                (i & 1) ? hs : -hs,
                (i & 2) ? hs : -hs,
                (i & 4) ? hs : -hs
            );
            this.children[i] = new OctreeNode(
                this.center.clone().add(offset), hs
            );
        }
    }

    _octant(pos) {
        let idx = 0;
        if (pos.x > this.center.x) idx |= 1;
        if (pos.y > this.center.y) idx |= 2;
        if (pos.z > this.center.z) idx |= 4;
        return idx;
    }

    _insertChild(body) {
        const idx = this._octant(body.pos);
        this.children[idx].insert(body);
    }

    finalize() {
        if (this.mass > 0) {
            this.com.divideScalar(this.mass);
        }
        if (this.children) {
            for (let i = 0; i < 8; i++) {
                this.children[i].finalize();
            }
        }
    }

    computeForce(body, G, theta, acc) {
        if (this.bodyCount === 0) return;

        const dx = this.com.x - body.pos.x;
        const dy = this.com.y - body.pos.y;
        const dz = this.com.z - body.pos.z;
        const distSq = dx * dx + dy * dy + dz * dz + SOFTENING_SQ;
        const dist = Math.sqrt(distSq);

        if (this.isLeaf) {
            if (this.body && this.body !== body && this.body.alive) {
                const F = G * this.mass / (distSq * dist);
                acc.x += F * dx;
                acc.y += F * dy;
                acc.z += F * dz;
            }
            return;
        }

        const size = this.halfSize * 2;
        if (size / dist < theta) {
            const F = G * this.mass / (distSq * dist);
            acc.x += F * dx;
            acc.y += F * dy;
            acc.z += F * dz;
            return;
        }

        for (let i = 0; i < 8; i++) {
            this.children[i].computeForce(body, G, theta, acc);
        }
    }
}

// ============================================================
// SHADERS
// ============================================================

const bodyVertexShader = `
    attribute float aSize;
    attribute vec3 aColor;
    attribute float aEmissive;
    attribute float aType;
    varying vec3 vColor;
    varying float vEmissive;
    varying float vType;

    void main() {
        vColor = aColor;
        vEmissive = aEmissive;
        vType = aType;
        vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = aSize * (300.0 / -mvPos.z);
        gl_PointSize = clamp(gl_PointSize, 1.0, 80.0);
        gl_Position = projectionMatrix * mvPos;
    }
`;

const bodyFragmentShader = `
    varying vec3 vColor;
    varying float vEmissive;
    varying float vType;

    void main() {
        vec2 uv = gl_PointCoord - vec2(0.5);
        float d = length(uv);

        // Discard outside circle
        if (d > 0.5) discard;

        float alpha = 1.0;
        vec3 col = vColor;

        if (vType < 0.5) {
            // Star: bright center with glow
            float core = smoothstep(0.35, 0.0, d);
            float glow = exp(-d * 4.0) * 0.6;
            col = mix(col, vec3(1.0), core * 0.5);
            alpha = core + glow;
            col *= (1.0 + vEmissive);
        } else if (vType < 1.5) {
            // Planet: solid sphere with shading
            float shade = 1.0 - smoothstep(0.0, 0.5, d);
            float highlight = smoothstep(0.35, 0.15, d) * 0.3;
            col = col * shade + vec3(highlight);
            alpha = smoothstep(0.5, 0.4, d);
        } else if (vType < 2.5) {
            // Black hole: dark center, bright accretion ring
            float ring = exp(-pow((d - 0.3) * 8.0, 2.0)) * 2.0;
            float dark = smoothstep(0.2, 0.0, d);
            float outerGlow = exp(-d * 3.0) * 0.4;
            col = mix(vec3(0.6, 0.2, 1.0), vec3(1.0, 0.5, 0.2), ring);
            col *= (ring + outerGlow);
            col = mix(col, vec3(0.0), dark);
            alpha = ring + outerGlow + dark * 0.8;
            alpha = clamp(alpha, 0.0, 1.0);
        } else if (vType < 3.5) {
            // Asteroid: rough sphere
            float shade = 1.0 - smoothstep(0.0, 0.5, d);
            col = col * shade;
            alpha = smoothstep(0.5, 0.35, d);
        } else {
            // Gas particle: soft blob
            float glow = exp(-d * 3.0);
            col = col * glow;
            alpha = glow * 0.7;
        }

        gl_FragColor = vec4(col, alpha);
    }
`;

const trailVertexShader = `
    attribute vec3 aTrailColor;
    attribute float aTrailAlpha;
    varying vec3 vTrailColor;
    varying float vTrailAlpha;

    void main() {
        vTrailColor = aTrailColor;
        vTrailAlpha = aTrailAlpha;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
`;

const trailFragmentShader = `
    varying vec3 vTrailColor;
    varying float vTrailAlpha;

    void main() {
        gl_FragColor = vec4(vTrailColor, vTrailAlpha);
    }
`;

const gridFieldVertexShader = `
    attribute float aDisplacement;
    varying float vDisp;
    varying vec2 vUv;

    void main() {
        vDisp = aDisplacement;
        vUv = uv;
        vec3 pos = position;
        pos.y += aDisplacement;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
`;

const gridFieldFragmentShader = `
    varying float vDisp;
    varying vec2 vUv;

    void main() {
        float intensity = abs(vDisp) * 0.05;
        intensity = clamp(intensity, 0.0, 1.0);
        vec3 col = mix(
            vec3(0.1, 0.2, 0.4),
            vec3(0.4, 0.6, 1.0),
            intensity
        );
        float alpha = 0.15 + intensity * 0.6;
        gl_FragColor = vec4(col, alpha);
    }
`;

// Accretion disk shader
const accretionVertexShader = `
    uniform float uTime;
    varying vec2 vUv;
    varying float vAlpha;

    void main() {
        vUv = uv;
        vec3 pos = position;
        // Rotate with time
        float angle = uTime * 2.0;
        float c = cos(angle);
        float s = sin(angle);
        pos.xz = mat2(c, s, -s, c) * pos.xz;
        vAlpha = 1.0;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
`;

const accretionFragmentShader = `
    varying vec2 vUv;
    varying float vAlpha;
    uniform float uTime;

    void main() {
        vec2 center = vUv - 0.5;
        float dist = length(center);
        float angle = atan(center.y, center.x);

        // Ring shape
        float ring = exp(-pow((dist - 0.35) * 8.0, 2.0));
        ring += exp(-pow((dist - 0.28) * 10.0, 2.0)) * 0.5;

        // Swirl pattern
        float swirl = sin(angle * 3.0 + uTime * 4.0 + dist * 20.0) * 0.5 + 0.5;

        vec3 innerCol = vec3(1.0, 0.6, 0.2);
        vec3 outerCol = vec3(0.5, 0.2, 0.8);
        vec3 col = mix(outerCol, innerCol, smoothstep(0.4, 0.2, dist));
        col *= ring * (0.6 + swirl * 0.4);

        float alpha = ring * 0.8 * (0.5 + swirl * 0.5);
        alpha *= smoothstep(0.48, 0.4, dist); // fade outer edge
        alpha *= smoothstep(0.1, 0.18, dist); // fade inner edge

        gl_FragColor = vec4(col, alpha);
    }
`;

// ============================================================
// COLLISION PARTICLES
// ============================================================

class CollisionEffect {
    constructor(scene, position, color, mass) {
        this.scene = scene;
        this.life = 1.0;
        this.decay = 0.02;

        const count = COLLISION_DEBRIS_COUNT + Math.floor(mass * 0.02);
        const clamped = Math.min(count, 50);
        const geo = new THREE.BufferGeometry();
        const positions = new Float32Array(clamped * 3);
        const velocities = [];

        for (let i = 0; i < clamped; i++) {
            positions[i * 3] = position.x;
            positions[i * 3 + 1] = position.y;
            positions[i * 3 + 2] = position.z;
            velocities.push(new THREE.Vector3(
                (Math.random() - 0.5) * 3,
                (Math.random() - 0.5) * 3,
                (Math.random() - 0.5) * 3
            ));
        }

        geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

        const mat = new THREE.PointsMaterial({
            color: color,
            size: 1.2,
            transparent: true,
            opacity: 1.0,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            sizeAttenuation: true
        });

        this.points = new THREE.Points(geo, mat);
        this.velocities = velocities;
        this.posAttr = geo.attributes.position;
        scene.add(this.points);
    }

    update() {
        this.life -= this.decay;
        if (this.life <= 0) {
            this.dispose();
            return false;
        }

        const arr = this.posAttr.array;
        for (let i = 0; i < this.velocities.length; i++) {
            arr[i * 3] += this.velocities[i].x;
            arr[i * 3 + 1] += this.velocities[i].y;
            arr[i * 3 + 2] += this.velocities[i].z;
            this.velocities[i].multiplyScalar(0.96);
        }
        this.posAttr.needsUpdate = true;
        this.points.material.opacity = this.life;
        return true;
    }

    dispose() {
        this.scene.remove(this.points);
        this.points.geometry.dispose();
        this.points.material.dispose();
    }
}

// ============================================================
// MAIN CLASS
// ============================================================

export class GravityPlayground {
    constructor() {
        this.bodies = [];
        this.nextId = 0;
        this.G = 1.0;
        this.timeScale = 1.0;
        this.dt = 0.15;
        this.paused = false;
        this.theta = 0.7; // Barnes-Hut opening angle

        // Interaction state
        this.selectedTool = 'star';
        this.selectedBody = null;
        this.isPlacing = false;
        this.placingStart = null;
        this.placingPos = null;
        this.placingMass = 0;
        this.isDragging = false;
        this.mouseDownTime = 0;

        // Toggles
        this.showTrails = true;
        this.showGravityField = false;
        this.showGrid = true;
        this.followBody = null;
        this.followCOM = false;
        this.is2D = false;

        // Collision effects
        this.collisionEffects = [];

        // Performance
        this.clock = new THREE.Clock();
        this.frameCount = 0;
        this.fpsTime = 0;
        this.fps = 60;

        // Accretion disks
        this.accretionDisks = [];

        // Orbit prediction
        this.orbitLine = null;

        this._init();
    }

    _init() {
        // Renderer
        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: false,
            powerPreference: 'high-performance'
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.setClearColor(0x000510);
        this.renderer.sortObjects = false;
        document.body.appendChild(this.renderer.domElement);

        // Scene
        this.scene = new THREE.Scene();
        this.scene.fog = new THREE.FogExp2(0x000510, 0.0008);

        // Camera
        this.camera = new THREE.PerspectiveCamera(
            60, window.innerWidth / window.innerHeight, 0.1, 10000
        );
        this.camera.position.set(0, 120, 200);
        this.camera.lookAt(0, 0, 0);

        // Controls
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.08;
        this.controls.rotateSpeed = 0.5;
        this.controls.zoomSpeed = 1.2;
        this.controls.minDistance = 10;
        this.controls.maxDistance = 2000;

        // Post-processing
        this.composer = new EffectComposer(this.renderer);
        this.renderPass = new RenderPass(this.scene, this.camera);
        this.composer.addPass(this.renderPass);

        this.bloomPass = new UnrealBloomPass(
            new THREE.Vector2(window.innerWidth, window.innerHeight),
            0.8, 0.4, 0.85
        );
        this.composer.addPass(this.bloomPass);

        // Raycaster
        this.raycaster = new THREE.Raycaster();
        this.raycaster.params.Points.threshold = 3;
        this.mouse = new THREE.Vector2();
        this.placePlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

        // Build visual elements
        this._createStarfield();
        this._createBodyPoints();
        this._createTrailSystem();
        this._createGrid();
        this._createGravityField();
        this._createVelocityArrow();
        this._createMassIndicator();
        this._createCOMIndicator();
        this._createOrbitLine();

        // Events
        this._bindEvents();
        this._bindUI();

        // Start
        this._animate();
    }

    // ========================================================
    // VISUAL SETUP
    // ========================================================

    _createStarfield() {
        const count = 3000;
        const positions = new Float32Array(count * 3);
        for (let i = 0; i < count; i++) {
            const r = 800 + Math.random() * 1500;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
            positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
            positions[i * 3 + 2] = r * Math.cos(phi);
        }
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        const mat = new THREE.PointsMaterial({
            color: 0xffffff,
            size: 0.5,
            transparent: true,
            opacity: 0.5,
            depthWrite: false,
            sizeAttenuation: true
        });
        this.scene.add(new THREE.Points(geo, mat));
    }

    _createBodyPoints() {
        const max = MAX_BODIES;
        this.bodyPositions = new Float32Array(max * 3);
        this.bodySizes = new Float32Array(max);
        this.bodyColors = new Float32Array(max * 3);
        this.bodyEmissive = new Float32Array(max);
        this.bodyTypeAttr = new Float32Array(max);

        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(this.bodyPositions, 3));
        geo.setAttribute('aSize', new THREE.BufferAttribute(this.bodySizes, 1));
        geo.setAttribute('aColor', new THREE.BufferAttribute(this.bodyColors, 3));
        geo.setAttribute('aEmissive', new THREE.BufferAttribute(this.bodyEmissive, 1));
        geo.setAttribute('aType', new THREE.BufferAttribute(this.bodyTypeAttr, 1));

        const mat = new THREE.ShaderMaterial({
            vertexShader: bodyVertexShader,
            fragmentShader: bodyFragmentShader,
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending
        });

        this.bodyPoints = new THREE.Points(geo, mat);
        this.bodyGeo = geo;
        this.scene.add(this.bodyPoints);
    }

    _createTrailSystem() {
        const maxVerts = MAX_BODIES * TRAIL_LENGTH;
        this.trailPositions = new Float32Array(maxVerts * 3);
        this.trailColors = new Float32Array(maxVerts * 3);
        this.trailAlphas = new Float32Array(maxVerts);

        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(this.trailPositions, 3));
        geo.setAttribute('aTrailColor', new THREE.BufferAttribute(this.trailColors, 3));
        geo.setAttribute('aTrailAlpha', new THREE.BufferAttribute(this.trailAlphas, 1));

        const mat = new THREE.ShaderMaterial({
            vertexShader: trailVertexShader,
            fragmentShader: trailFragmentShader,
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending
        });

        this.trailMesh = new THREE.Points(geo, mat);
        this.trailGeo = geo;
        this.scene.add(this.trailMesh);
    }

    _createGrid() {
        const size = 400;
        const divisions = 40;
        this.gridHelper = new THREE.GridHelper(size, divisions,
            new THREE.Color(0.1, 0.15, 0.3),
            new THREE.Color(0.05, 0.08, 0.15)
        );
        this.gridHelper.material.transparent = true;
        this.gridHelper.material.opacity = 0.3;
        this.gridHelper.material.depthWrite = false;
        this.scene.add(this.gridHelper);
    }

    _createGravityField() {
        const res = 40;
        const size = 300;
        const geo = new THREE.PlaneGeometry(size, size, res, res);
        geo.rotateX(-Math.PI / 2);

        this.gravFieldDisp = new Float32Array((res + 1) * (res + 1));
        geo.setAttribute('aDisplacement', new THREE.BufferAttribute(this.gravFieldDisp, 1));

        const mat = new THREE.ShaderMaterial({
            vertexShader: gridFieldVertexShader,
            fragmentShader: gridFieldFragmentShader,
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
            wireframe: true
        });

        this.gravFieldMesh = new THREE.Mesh(geo, mat);
        this.gravFieldMesh.visible = false;
        this.gravFieldGeo = geo;
        this.gravFieldRes = res;
        this.gravFieldSize = size;
        this.scene.add(this.gravFieldMesh);
    }

    _createVelocityArrow() {
        this.velArrowGroup = new THREE.Group();
        this.scene.add(this.velArrowGroup);

        // Shaft
        const shaftGeo = new THREE.CylinderGeometry(0.3, 0.3, 1, 8);
        shaftGeo.rotateZ(Math.PI / 2);
        const shaftMat = new THREE.MeshBasicMaterial({
            color: 0x44ff88,
            transparent: true,
            opacity: 0.8
        });
        this.velArrowShaft = new THREE.Mesh(shaftGeo, shaftMat);
        this.velArrowGroup.add(this.velArrowShaft);

        // Head
        const headGeo = new THREE.ConeGeometry(0.8, 2, 8);
        headGeo.rotateZ(-Math.PI / 2);
        const headMat = new THREE.MeshBasicMaterial({
            color: 0x44ff88,
            transparent: true,
            opacity: 0.8
        });
        this.velArrowHead = new THREE.Mesh(headGeo, headMat);
        this.velArrowGroup.add(this.velArrowHead);

        this.velArrowGroup.visible = false;
    }

    _createMassIndicator() {
        const geo = new THREE.RingGeometry(1, 1.15, 48);
        const mat = new THREE.MeshBasicMaterial({
            color: 0x7db4ff,
            transparent: true,
            opacity: 0.6,
            side: THREE.DoubleSide,
            depthWrite: false
        });
        this.massRing = new THREE.Mesh(geo, mat);
        this.massRing.rotation.x = -Math.PI / 2;
        this.massRing.visible = false;
        this.scene.add(this.massRing);
    }

    _createCOMIndicator() {
        const geo = new THREE.OctahedronGeometry(1.2, 0);
        const mat = new THREE.MeshBasicMaterial({
            color: 0x44aaff,
            transparent: true,
            opacity: 0.3,
            wireframe: true,
            depthWrite: false
        });
        this.comMarker = new THREE.Mesh(geo, mat);
        this.scene.add(this.comMarker);
    }

    _createOrbitLine() {
        const max = 500;
        const positions = new Float32Array(max * 3);
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geo.setDrawRange(0, 0);

        const mat = new THREE.LineBasicMaterial({
            color: 0x88ccff,
            transparent: true,
            opacity: 0.4,
            depthWrite: false
        });
        this.orbitLine = new THREE.Line(geo, mat);
        this.orbitLineGeo = geo;
        this.scene.add(this.orbitLine);
    }

    // ========================================================
    // ACCRETION DISK MANAGEMENT
    // ========================================================

    _addAccretionDisk(body) {
        const size = body.radius * 5;
        const geo = new THREE.PlaneGeometry(size, size, 1, 1);
        geo.rotateX(-Math.PI / 2);
        const mat = new THREE.ShaderMaterial({
            vertexShader: accretionVertexShader,
            fragmentShader: accretionFragmentShader,
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
            side: THREE.DoubleSide,
            uniforms: {
                uTime: { value: 0 }
            }
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.copy(body.pos);
        this.scene.add(mesh);
        this.accretionDisks.push({ mesh, bodyId: body.id, mat });
    }

    _removeAccretionDisk(bodyId) {
        const idx = this.accretionDisks.findIndex(d => d.bodyId === bodyId);
        if (idx >= 0) {
            const d = this.accretionDisks[idx];
            this.scene.remove(d.mesh);
            d.mesh.geometry.dispose();
            d.mat.dispose();
            this.accretionDisks.splice(idx, 1);
        }
    }

    // ========================================================
    // BODY MANAGEMENT
    // ========================================================

    addBody(type, mass, position, velocity) {
        if (this.bodies.length >= MAX_BODIES) return null;

        const body = new Body(type, mass, position, velocity || new THREE.Vector3(), this.nextId++);
        this.bodies.push(body);

        if (type === 'blackhole') {
            this._addAccretionDisk(body);
        }

        return body;
    }

    removeBody(body) {
        body.alive = false;
        this._removeAccretionDisk(body.id);
        if (this.selectedBody === body) {
            this.selectedBody = null;
            this._updateInfoPanel();
        }
        if (this.followBody === body) {
            this.followBody = null;
        }
    }

    clearAll() {
        for (const b of this.bodies) {
            this._removeAccretionDisk(b.id);
        }
        this.bodies = [];
        this.selectedBody = null;
        this.followBody = null;
        this._updateInfoPanel();
        // Clear collision effects
        for (const e of this.collisionEffects) e.dispose();
        this.collisionEffects = [];
        // Clear orbit prediction
        this.orbitLineGeo.setDrawRange(0, 0);
    }

    // ========================================================
    // PHYSICS
    // ========================================================

    _buildTree() {
        // Find bounding box
        let maxCoord = 100;
        for (const b of this.bodies) {
            if (!b.alive) continue;
            maxCoord = Math.max(maxCoord,
                Math.abs(b.pos.x), Math.abs(b.pos.y), Math.abs(b.pos.z));
        }
        const halfSize = maxCoord * 1.5;
        const root = new OctreeNode(new THREE.Vector3(0, 0, 0), halfSize);

        for (const b of this.bodies) {
            if (!b.alive) continue;
            root.insert(b);
        }
        root.finalize();
        return root;
    }

    _computeAccelerations() {
        const n = this.bodies.length;
        const G = this.G;

        if (n <= 0) return;

        // Zero accelerations
        for (let i = 0; i < n; i++) {
            if (!this.bodies[i].alive) continue;
            this.bodies[i].acc.set(0, 0, 0);
        }

        if (n > 500) {
            // Barnes-Hut
            const tree = this._buildTree();
            for (let i = 0; i < n; i++) {
                const b = this.bodies[i];
                if (!b.alive) continue;
                tree.computeForce(b, G, this.theta, b.acc);
            }
        } else {
            // Direct sum
            for (let i = 0; i < n; i++) {
                const bi = this.bodies[i];
                if (!bi.alive) continue;
                for (let j = i + 1; j < n; j++) {
                    const bj = this.bodies[j];
                    if (!bj.alive) continue;

                    const dx = bj.pos.x - bi.pos.x;
                    const dy = bj.pos.y - bi.pos.y;
                    const dz = bj.pos.z - bi.pos.z;
                    const distSq = dx * dx + dy * dy + dz * dz + SOFTENING_SQ;
                    const dist = Math.sqrt(distSq);
                    const invDist3 = G / (distSq * dist);

                    const fx = dx * invDist3;
                    const fy = dy * invDist3;
                    const fz = dz * invDist3;

                    bi.acc.x += fx * bj.mass;
                    bi.acc.y += fy * bj.mass;
                    bi.acc.z += fz * bj.mass;

                    bj.acc.x -= fx * bi.mass;
                    bj.acc.y -= fy * bi.mass;
                    bj.acc.z -= fz * bi.mass;
                }
            }
        }
    }

    _velocityVerletStep(dt) {
        // Half-step velocity
        for (const b of this.bodies) {
            if (!b.alive) continue;
            b.vel.x += b.acc.x * dt * 0.5;
            b.vel.y += b.acc.y * dt * 0.5;
            b.vel.z += b.acc.z * dt * 0.5;

            // Update position
            b.pos.x += b.vel.x * dt;
            b.pos.y += b.vel.y * dt;
            b.pos.z += b.vel.z * dt;
        }

        // Recompute accelerations at new positions
        this._computeAccelerations();

        // Second half-step velocity
        for (const b of this.bodies) {
            if (!b.alive) continue;
            b.vel.x += b.acc.x * dt * 0.5;
            b.vel.y += b.acc.y * dt * 0.5;
            b.vel.z += b.acc.z * dt * 0.5;
        }
    }

    _handleCollisions() {
        const n = this.bodies.length;
        const mergeList = [];

        for (let i = 0; i < n; i++) {
            const bi = this.bodies[i];
            if (!bi.alive) continue;

            for (let j = i + 1; j < n; j++) {
                const bj = this.bodies[j];
                if (!bj.alive) continue;

                const dx = bj.pos.x - bi.pos.x;
                const dy = bj.pos.y - bi.pos.y;
                const dz = bj.pos.z - bi.pos.z;
                const distSq = dx * dx + dy * dy + dz * dz;
                const minDist = bi.radius + bj.radius;

                if (distSq < minDist * minDist) {
                    mergeList.push([i, j]);
                }
            }
        }

        for (const [i, j] of mergeList) {
            const bi = this.bodies[i];
            const bj = this.bodies[j];
            if (!bi.alive || !bj.alive) continue;

            // Larger body absorbs smaller
            const [big, small] = bi.mass >= bj.mass ? [bi, bj] : [bj, bi];

            // Collision effect
            const midPos = big.pos.clone().add(small.pos).multiplyScalar(0.5);
            const effectColor = big.color.clone().lerp(new THREE.Color(1, 0.8, 0.3), 0.5);
            this.collisionEffects.push(
                new CollisionEffect(this.scene, midPos, effectColor, big.mass + small.mass)
            );

            // Conserve momentum
            const totalMass = big.mass + small.mass;
            big.vel.x = (big.vel.x * big.mass + small.vel.x * small.mass) / totalMass;
            big.vel.y = (big.vel.y * big.mass + small.vel.y * small.mass) / totalMass;
            big.vel.z = (big.vel.z * big.mass + small.vel.z * small.mass) / totalMass;

            // Weighted position
            big.pos.x = (big.pos.x * big.mass + small.pos.x * small.mass) / totalMass;
            big.pos.y = (big.pos.y * big.mass + small.pos.y * small.mass) / totalMass;
            big.pos.z = (big.pos.z * big.mass + small.pos.z * small.mass) / totalMass;

            big.mass = totalMass;
            const td = BODY_TYPES[big.type] || BODY_TYPES.planet;
            big.radius = td.baseRadius * Math.pow(big.mass / td.baseMass, 0.33);
            big.radius = Math.max(0.15, Math.min(big.radius, 12));

            this.removeBody(small);
        }
    }

    _handleRocheLimits() {
        const toBreak = [];

        for (const b of this.bodies) {
            if (!b.alive) continue;
            if (b.type === 'blackhole') continue; // black holes don't break

            for (const other of this.bodies) {
                if (other === b || !other.alive) continue;
                if (other.mass < b.mass * 10) continue; // needs much larger body

                const dx = other.pos.x - b.pos.x;
                const dy = other.pos.y - b.pos.y;
                const dz = other.pos.z - b.pos.z;
                const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

                const rocheLimit = other.radius * ROCHE_FACTOR * Math.pow(other.mass / b.mass, 1 / 3);

                if (dist < rocheLimit && b.mass > 5) {
                    toBreak.push(b);
                    break;
                }
            }
        }

        for (const b of toBreak) {
            if (!b.alive) continue;
            // Break into debris
            const pieces = Math.min(8, Math.max(3, Math.floor(b.mass / 5)));
            const pieceMass = b.mass / pieces;

            for (let i = 0; i < pieces; i++) {
                const offset = new THREE.Vector3(
                    (Math.random() - 0.5) * b.radius * 3,
                    (Math.random() - 0.5) * b.radius * 3,
                    (Math.random() - 0.5) * b.radius * 3
                );
                const velOffset = new THREE.Vector3(
                    (Math.random() - 0.5) * 1.5,
                    (Math.random() - 0.5) * 1.5,
                    (Math.random() - 0.5) * 1.5
                );
                this.addBody('asteroid', pieceMass,
                    b.pos.clone().add(offset),
                    b.vel.clone().add(velOffset)
                );
            }

            // Collision effect at breakup
            this.collisionEffects.push(
                new CollisionEffect(this.scene, b.pos.clone(),
                    new THREE.Color(1, 0.6, 0.3), b.mass)
            );

            this.removeBody(b);
        }
    }

    _updateTrails() {
        for (const b of this.bodies) {
            if (!b.alive) continue;
            b.trail.push(b.pos.clone());
            if (b.trail.length > TRAIL_LENGTH) {
                b.trail.shift();
            }
            b.trailDirty = true;
        }
    }

    _computeEnergy() {
        let KE = 0;
        let PE = 0;
        const alive = this.bodies.filter(b => b.alive);
        const n = alive.length;

        for (let i = 0; i < n; i++) {
            KE += alive[i].kineticEnergy();
            for (let j = i + 1; j < n; j++) {
                const dist = alive[i].pos.distanceTo(alive[j].pos);
                if (dist > 0.01) {
                    PE -= this.G * alive[i].mass * alive[j].mass / dist;
                }
            }
        }
        return { KE, PE, total: KE + PE };
    }

    _computeCOM() {
        let totalMass = 0;
        const com = new THREE.Vector3();
        for (const b of this.bodies) {
            if (!b.alive) continue;
            com.addScaledVector(b.pos, b.mass);
            totalMass += b.mass;
        }
        if (totalMass > 0) com.divideScalar(totalMass);
        return com;
    }

    _physicsStep() {
        if (this.paused) return;

        const dt = this.dt * this.timeScale;
        // Initial acceleration
        this._computeAccelerations();
        this._velocityVerletStep(dt);
        this._handleCollisions();
        this._handleRocheLimits();
        this._updateTrails();

        // Age bodies
        for (const b of this.bodies) {
            if (b.alive) b.age += dt;
        }

        // Clean dead bodies
        this.bodies = this.bodies.filter(b => b.alive);
    }

    // ========================================================
    // RENDERING
    // ========================================================

    _updateBodyVisuals() {
        const alive = this.bodies.filter(b => b.alive);
        const n = alive.length;

        for (let i = 0; i < n; i++) {
            const b = alive[i];
            const i3 = i * 3;

            this.bodyPositions[i3] = b.pos.x;
            this.bodyPositions[i3 + 1] = b.pos.y;
            this.bodyPositions[i3 + 2] = b.pos.z;

            this.bodySizes[i] = b.radius * 2.5;

            this.bodyColors[i3] = b.color.r;
            this.bodyColors[i3 + 1] = b.color.g;
            this.bodyColors[i3 + 2] = b.color.b;

            const td = BODY_TYPES[b.type] || BODY_TYPES.planet;
            this.bodyEmissive[i] = td.emissive;

            // Type encoding: star=0, planet=1, blackhole=2, asteroid=3, gasparticle=4
            const typeMap = { star: 0, planet: 1, blackhole: 2, asteroid: 3, gasparticle: 4 };
            this.bodyTypeAttr[i] = typeMap[b.type] || 1;
        }

        // Zero out unused
        for (let i = n; i < MAX_BODIES; i++) {
            this.bodySizes[i] = 0;
        }

        this.bodyGeo.attributes.position.needsUpdate = true;
        this.bodyGeo.attributes.aSize.needsUpdate = true;
        this.bodyGeo.attributes.aColor.needsUpdate = true;
        this.bodyGeo.attributes.aEmissive.needsUpdate = true;
        this.bodyGeo.attributes.aType.needsUpdate = true;
        this.bodyGeo.setDrawRange(0, n);
    }

    _updateTrailVisuals() {
        if (!this.showTrails) {
            this.trailGeo.setDrawRange(0, 0);
            return;
        }

        const alive = this.bodies.filter(b => b.alive);
        let vertIdx = 0;

        for (const b of alive) {
            const trail = b.trail;
            for (let t = 0; t < trail.length; t++) {
                if (vertIdx >= MAX_BODIES * TRAIL_LENGTH) break;

                const p = trail[t];
                const i3 = vertIdx * 3;

                this.trailPositions[i3] = p.x;
                this.trailPositions[i3 + 1] = p.y;
                this.trailPositions[i3 + 2] = p.z;

                // Color based on velocity at that point (approximate from position deltas)
                const alpha = (t / trail.length) * 0.5;

                // Use body speed for color gradient: slow=blue, fast=red
                const speed = b.speed();
                const speedNorm = Math.min(speed / 5, 1);
                const r = speedNorm;
                const g = 0.2 + (1 - speedNorm) * 0.3;
                const bCol = 1 - speedNorm;

                this.trailColors[i3] = r;
                this.trailColors[i3 + 1] = g;
                this.trailColors[i3 + 2] = bCol;
                this.trailAlphas[vertIdx] = alpha;

                vertIdx++;
            }
        }

        // Zero remaining
        for (let i = vertIdx; i < vertIdx + 10 && i < MAX_BODIES * TRAIL_LENGTH; i++) {
            this.trailAlphas[i] = 0;
        }

        this.trailGeo.attributes.position.needsUpdate = true;
        this.trailGeo.attributes.aTrailColor.needsUpdate = true;
        this.trailGeo.attributes.aTrailAlpha.needsUpdate = true;
        this.trailGeo.setDrawRange(0, vertIdx);
    }

    _updateGravityField() {
        if (!this.showGravityField) {
            this.gravFieldMesh.visible = false;
            return;
        }
        this.gravFieldMesh.visible = true;

        const res = this.gravFieldRes;
        const size = this.gravFieldSize;
        const alive = this.bodies.filter(b => b.alive);
        const posAttr = this.gravFieldGeo.attributes.position;
        const dispAttr = this.gravFieldGeo.attributes.aDisplacement;

        for (let i = 0; i <= res; i++) {
            for (let j = 0; j <= res; j++) {
                const idx = i * (res + 1) + j;
                const wx = (j / res - 0.5) * size;
                const wz = (i / res - 0.5) * size;

                let disp = 0;
                for (const b of alive) {
                    const dx = b.pos.x - wx;
                    const dz = b.pos.z - wz;
                    const distSq = dx * dx + dz * dz + 10;
                    disp -= b.mass / distSq * this.G * 20;
                }

                disp = Math.max(disp, -50);
                this.gravFieldDisp[idx] = disp;

                // Update actual Y position
                posAttr.array[idx * 3 + 1] = disp;
            }
        }

        posAttr.needsUpdate = true;
        dispAttr.needsUpdate = true;
    }

    _updateAccretionDisks(time) {
        for (const d of this.accretionDisks) {
            const body = this.bodies.find(b => b.id === d.bodyId && b.alive);
            if (body) {
                d.mesh.position.copy(body.pos);
                d.mat.uniforms.uTime.value = time;
                // Face camera
                d.mesh.lookAt(this.camera.position);
            } else {
                this._removeAccretionDisk(d.bodyId);
                break; // list modified, exit
            }
        }
    }

    _updateCOM() {
        const com = this._computeCOM();
        this.comMarker.position.copy(com);
        this.comMarker.rotation.y += 0.01;
        this.comMarker.rotation.x += 0.005;

        if (this.followCOM) {
            this.controls.target.lerp(com, 0.05);
        }

        if (this.followBody && this.followBody.alive) {
            this.controls.target.lerp(this.followBody.pos, 0.1);
        }
    }

    _updateOrbitPrediction() {
        if (!this.selectedBody || !this.selectedBody.alive) {
            this.orbitLineGeo.setDrawRange(0, 0);
            return;
        }

        const b = this.selectedBody;
        const steps = 300;
        const dt = this.dt * 0.5;
        let px = b.pos.x, py = b.pos.y, pz = b.pos.z;
        let vx = b.vel.x, vy = b.vel.y, vz = b.vel.z;

        const posArr = this.orbitLineGeo.attributes.position.array;
        const alive = this.bodies.filter(bb => bb.alive && bb !== b);

        for (let s = 0; s < steps; s++) {
            posArr[s * 3] = px;
            posArr[s * 3 + 1] = py;
            posArr[s * 3 + 2] = pz;

            // Compute acceleration from other bodies
            let ax = 0, ay = 0, az = 0;
            for (const other of alive) {
                const dx = other.pos.x - px;
                const dy = other.pos.y - py;
                const dz = other.pos.z - pz;
                const distSq = dx * dx + dy * dy + dz * dz + SOFTENING_SQ;
                const dist = Math.sqrt(distSq);
                const F = this.G * other.mass / (distSq * dist);
                ax += F * dx;
                ay += F * dy;
                az += F * dz;
            }

            vx += ax * dt;
            vy += ay * dt;
            vz += az * dt;
            px += vx * dt;
            py += vy * dt;
            pz += vz * dt;
        }

        this.orbitLineGeo.attributes.position.needsUpdate = true;
        this.orbitLineGeo.setDrawRange(0, steps);
    }

    _updateCollisionEffects() {
        this.collisionEffects = this.collisionEffects.filter(e => e.update());
    }

    // ========================================================
    // INTERACTION
    // ========================================================

    _getWorldPosition(event) {
        const rect = this.renderer.domElement.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersection = new THREE.Vector3();
        this.raycaster.ray.intersectPlane(this.placePlane, intersection);
        return intersection;
    }

    _trySelectBody(event) {
        const rect = this.renderer.domElement.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        this.raycaster.setFromCamera(this.mouse, this.camera);

        // Test intersection with body positions
        const alive = this.bodies.filter(b => b.alive);
        let closest = null;
        let closestDist = Infinity;

        for (const b of alive) {
            const screenPos = b.pos.clone().project(this.camera);
            const dx = screenPos.x - this.mouse.x;
            const dy = screenPos.y - this.mouse.y;
            const sd = Math.sqrt(dx * dx + dy * dy);

            // Pick threshold based on body size
            const threshold = 0.03 + b.radius * 0.005;
            if (sd < threshold && sd < closestDist) {
                closestDist = sd;
                closest = b;
            }
        }

        return closest;
    }

    _onMouseDown(event) {
        if (event.button !== 0) return;
        if (event.target !== this.renderer.domElement) return;

        // Try selecting a body first
        const selected = this._trySelectBody(event);
        if (selected) {
            this.selectedBody = selected;
            this._updateInfoPanel();
            this._updateOrbitPrediction();
            return;
        }

        // Start placement
        this.isPlacing = true;
        this.isDragging = false;
        this.mouseDownTime = performance.now();
        this.placingStart = this._getWorldPosition(event);
        this.placingPos = this.placingStart.clone();
        this.placingMass = 0;
        this.controls.enabled = false;

        // Show mass ring
        this.massRing.visible = true;
        this.massRing.position.copy(this.placingStart);
        this.massRing.scale.setScalar(1);
    }

    _onMouseMove(event) {
        if (!this.isPlacing) return;

        const worldPos = this._getWorldPosition(event);
        const dist = worldPos.distanceTo(this.placingStart);

        if (dist > 2) {
            this.isDragging = true;
        }

        if (this.isDragging) {
            // Show velocity arrow
            this.velArrowGroup.visible = true;
            const dir = new THREE.Vector3().subVectors(this.placingStart, worldPos);
            const len = dir.length();
            dir.normalize();

            const arrowPos = this.placingStart.clone();
            this.velArrowGroup.position.copy(arrowPos);
            this.velArrowGroup.lookAt(arrowPos.clone().add(dir));

            const shaftLen = Math.max(len * 0.8, 0.1);
            this.velArrowShaft.scale.set(1, 1, shaftLen);
            this.velArrowShaft.position.set(shaftLen * 0.5, 0, 0);
            this.velArrowHead.position.set(shaftLen, 0, 0);

            // Color based on velocity magnitude
            const speedCol = new THREE.Color().setHSL(0.3 - len * 0.005, 0.8, 0.5);
            this.velArrowShaft.material.color.copy(speedCol);
            this.velArrowHead.material.color.copy(speedCol);
        }

        // Grow mass indicator while holding
        if (!this.isDragging) {
            const holdTime = (performance.now() - this.mouseDownTime) / 1000;
            const td = BODY_TYPES[this.selectedTool] || BODY_TYPES.star;
            const massMultiplier = 1 + holdTime * 2;
            this.placingMass = td.baseMass * massMultiplier;

            const scale = Math.pow(massMultiplier, 0.33) * 3;
            this.massRing.scale.setScalar(scale);
        }
    }

    _onMouseUp(event) {
        if (!this.isPlacing) return;

        this.isPlacing = false;
        this.controls.enabled = true;
        this.massRing.visible = false;
        this.velArrowGroup.visible = false;

        const holdTime = (performance.now() - this.mouseDownTime) / 1000;
        const td = BODY_TYPES[this.selectedTool] || BODY_TYPES.star;

        if (this.selectedTool === 'asteroids') {
            // Spawn asteroid field
            const count = 50;
            for (let i = 0; i < count; i++) {
                const offset = new THREE.Vector3(
                    (Math.random() - 0.5) * 20,
                    (Math.random() - 0.5) * 5,
                    (Math.random() - 0.5) * 20
                );
                const vel = new THREE.Vector3(
                    (Math.random() - 0.5) * 0.5,
                    (Math.random() - 0.5) * 0.2,
                    (Math.random() - 0.5) * 0.5
                );
                this.addBody('asteroid',
                    BODY_TYPES.asteroid.baseMass * (0.5 + Math.random()),
                    this.placingStart.clone().add(offset),
                    vel
                );
            }
        } else if (this.selectedTool === 'gascloud') {
            // Spawn gas cloud
            const count = 100;
            for (let i = 0; i < count; i++) {
                const angle = Math.random() * Math.PI * 2;
                const r = Math.random() * 15;
                const offset = new THREE.Vector3(
                    Math.cos(angle) * r,
                    (Math.random() - 0.5) * 4,
                    Math.sin(angle) * r
                );
                const vel = new THREE.Vector3(
                    -Math.sin(angle) * 0.3 + (Math.random() - 0.5) * 0.2,
                    (Math.random() - 0.5) * 0.1,
                    Math.cos(angle) * 0.3 + (Math.random() - 0.5) * 0.2
                );
                const c = new THREE.Color().setHSL(
                    0.85 + Math.random() * 0.15, 0.6, 0.5 + Math.random() * 0.2
                );
                const body = this.addBody('gasparticle',
                    BODY_TYPES.gasparticle.baseMass * (0.5 + Math.random()),
                    this.placingStart.clone().add(offset),
                    vel
                );
                if (body) body.color = c;
            }
        } else {
            // Single body
            const massMultiplier = 1 + holdTime * 2;
            const mass = td.baseMass * massMultiplier;

            let velocity = new THREE.Vector3();
            if (this.isDragging) {
                const worldPos = this._getWorldPosition(event);
                velocity = this.placingStart.clone().sub(worldPos).multiplyScalar(0.15);
            }

            if (this.is2D) {
                velocity.y = 0;
                this.placingStart.y = 0;
            }

            this.addBody(this.selectedTool, mass, this.placingStart, velocity);
        }

        // Deselect
        this.selectedBody = null;
        this._updateInfoPanel();
    }

    _onKeyDown(event) {
        switch (event.key) {
            case ' ':
                event.preventDefault();
                this.paused = !this.paused;
                this._updatePlayPauseUI();
                break;
            case 'Delete':
            case 'Backspace':
                if (this.selectedBody) {
                    this.removeBody(this.selectedBody);
                }
                break;
            case 'c':
                this.followCOM = !this.followCOM;
                this.followBody = null;
                break;
            case 'f':
                if (this.selectedBody) {
                    this.followBody = this.selectedBody;
                    this.followCOM = false;
                }
                break;
            case 't':
                this.showTrails = !this.showTrails;
                document.getElementById('toggle-trails').checked = this.showTrails;
                break;
            case 'g':
                this.showGravityField = !this.showGravityField;
                document.getElementById('toggle-gravfield').checked = this.showGravityField;
                break;
            case '1': this._selectTool('star'); break;
            case '2': this._selectTool('planet'); break;
            case '3': this._selectTool('blackhole'); break;
            case '4': this._selectTool('asteroids'); break;
            case '5': this._selectTool('gascloud'); break;
        }
    }

    _selectTool(tool) {
        this.selectedTool = tool;
        document.querySelectorAll('.tool-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tool === tool);
        });
    }

    // ========================================================
    // UI UPDATES
    // ========================================================

    _updateInfoPanel() {
        const panel = document.getElementById('info-panel');
        if (!this.selectedBody || !this.selectedBody.alive) {
            panel.classList.remove('visible');
            return;
        }

        panel.classList.add('visible');
        const b = this.selectedBody;

        document.getElementById('info-type').textContent = b.type.toUpperCase();
        document.getElementById('info-mass').textContent = b.mass.toFixed(1);
        document.getElementById('info-speed').textContent = b.speed().toFixed(2);
        document.getElementById('info-pos').textContent =
            `${b.pos.x.toFixed(0)}, ${b.pos.y.toFixed(0)}, ${b.pos.z.toFixed(0)}`;
        document.getElementById('info-ke').textContent = b.kineticEnergy().toFixed(0);
    }

    _updateStatsUI() {
        const alive = this.bodies.filter(b => b.alive);
        document.getElementById('stat-bodies').textContent = alive.length;

        // Energy (compute less frequently)
        if (this.frameCount % 15 === 0 && alive.length < 300) {
            const energy = this._computeEnergy();
            document.getElementById('stat-energy').textContent = energy.total.toFixed(0);
        }
    }

    _updatePlayPauseUI() {
        const playBtn = document.getElementById('btn-play');
        const pauseBtn = document.getElementById('btn-pause');
        if (this.paused) {
            playBtn.classList.remove('active');
            pauseBtn.classList.add('active');
        } else {
            playBtn.classList.add('active');
            pauseBtn.classList.remove('active');
        }
    }

    _updateBottomInfo() {
        const alive = this.bodies.filter(b => b.alive);
        document.getElementById('bottom-bodies').textContent = alive.length;
        document.getElementById('bottom-fps').textContent = this.fps;
        document.getElementById('bottom-time').textContent = this.timeScale.toFixed(1) + 'x';
    }

    // ========================================================
    // PRESETS
    // ========================================================

    loadPreset(name) {
        this.clearAll();
        this.paused = false;
        this._updatePlayPauseUI();

        switch (name) {
            case 'binary':
                this._presetBinaryStars();
                break;
            case 'solar':
                this._presetSolarSystem();
                break;
            case 'figure8':
                this._presetFigureEight();
                break;
            case 'galaxycollision':
                this._presetGalaxyCollision();
                break;
            case 'lagrange':
                this._presetLagrangePoints();
                break;
            case 'random':
                this._presetRandomChaos();
                break;
        }
    }

    _presetBinaryStars() {
        const d = 25;
        const v = Math.sqrt(this.G * 800 / (4 * d));
        this.addBody('star', 800, new THREE.Vector3(-d, 0, 0), new THREE.Vector3(0, 0, v));
        this.addBody('star', 800, new THREE.Vector3(d, 0, 0), new THREE.Vector3(0, 0, -v));
    }

    _presetSolarSystem() {
        // Central star
        this.addBody('star', 3000, new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, 0));

        // Planets at various distances
        const planets = [
            { dist: 25, mass: 20 },
            { dist: 40, mass: 40 },
            { dist: 60, mass: 80 },
            { dist: 85, mass: 60 }
        ];

        for (const p of planets) {
            const angle = Math.random() * Math.PI * 2;
            const v = Math.sqrt(this.G * 3000 / p.dist);
            const pos = new THREE.Vector3(
                Math.cos(angle) * p.dist, 0,
                Math.sin(angle) * p.dist
            );
            const vel = new THREE.Vector3(
                -Math.sin(angle) * v, 0,
                Math.cos(angle) * v
            );
            this.addBody('planet', p.mass, pos, vel);
        }
    }

    _presetFigureEight() {
        // Famous three-body figure-8 solution (Chenciner-Montgomery)
        const scale = 30;
        const mass = 400;
        const vx = 0.347111 * 4;
        const vy = 0.532728 * 4;

        this.addBody('star', mass,
            new THREE.Vector3(-0.97 * scale, 0, 0.243 * scale),
            new THREE.Vector3(vx, 0, vy));
        this.addBody('star', mass,
            new THREE.Vector3(0.97 * scale, 0, -0.243 * scale),
            new THREE.Vector3(vx, 0, vy));
        this.addBody('star', mass,
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(-2 * vx, 0, -2 * vy));
    }

    _presetGalaxyCollision() {
        const createCluster = (cx, cz, vx, vz, count, centralMass) => {
            // Central black hole
            this.addBody('blackhole', centralMass,
                new THREE.Vector3(cx, 0, cz),
                new THREE.Vector3(vx, 0, vz));

            for (let i = 0; i < count; i++) {
                const angle = Math.random() * Math.PI * 2;
                const r = 10 + Math.random() * 50;
                const orbitalV = Math.sqrt(this.G * centralMass / r) * (0.8 + Math.random() * 0.4);

                const px = cx + Math.cos(angle) * r;
                const pz = cz + Math.sin(angle) * r;
                const py = (Math.random() - 0.5) * 5;

                const velx = vx + (-Math.sin(angle) * orbitalV);
                const velz = vz + (Math.cos(angle) * orbitalV);

                this.addBody('planet', 2 + Math.random() * 8,
                    new THREE.Vector3(px, py, pz),
                    new THREE.Vector3(velx, 0, velz));
            }
        };

        createCluster(-80, 0, 0.4, 0.1, 150, 3000);
        createCluster(80, 20, -0.4, -0.1, 150, 3000);
    }

    _presetLagrangePoints() {
        const starMass = 3000;
        const planetMass = 100;
        const d = 60;
        const orbitalV = Math.sqrt(this.G * starMass / d);

        // Star
        this.addBody('star', starMass, new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, 0));

        // Planet
        this.addBody('planet', planetMass,
            new THREE.Vector3(d, 0, 0),
            new THREE.Vector3(0, 0, orbitalV));

        // L4 and L5 (Trojan points - 60 degrees ahead and behind)
        const angle60 = Math.PI / 3;
        const testMass = 3;

        // L4 (60 degrees ahead)
        const l4Angle = angle60;
        this.addBody('asteroid', testMass,
            new THREE.Vector3(Math.cos(l4Angle) * d, 0, Math.sin(l4Angle) * d),
            new THREE.Vector3(-Math.sin(l4Angle) * orbitalV, 0, Math.cos(l4Angle) * orbitalV));

        // L5 (60 degrees behind)
        const l5Angle = -angle60;
        this.addBody('asteroid', testMass,
            new THREE.Vector3(Math.cos(l5Angle) * d, 0, Math.sin(l5Angle) * d),
            new THREE.Vector3(-Math.sin(l5Angle) * orbitalV, 0, Math.cos(l5Angle) * orbitalV));

        // L1 (between star and planet)
        const l1d = d * 0.85;
        const l1v = Math.sqrt(this.G * starMass / l1d);
        this.addBody('asteroid', testMass,
            new THREE.Vector3(l1d, 0, 0),
            new THREE.Vector3(0, 0, l1v));

        // L2 (beyond planet)
        const l2d = d * 1.15;
        const l2v = Math.sqrt(this.G * starMass / l2d);
        this.addBody('asteroid', testMass,
            new THREE.Vector3(l2d, 0, 0),
            new THREE.Vector3(0, 0, l2v));

        // L3 (opposite side)
        const l3v = Math.sqrt(this.G * starMass / d);
        this.addBody('asteroid', testMass,
            new THREE.Vector3(-d, 0, 0),
            new THREE.Vector3(0, 0, -l3v));

        // Extra test particles near L4 and L5
        for (let i = 0; i < 8; i++) {
            const aOffset = (Math.random() - 0.5) * 0.15;
            const rOffset = (Math.random() - 0.5) * 4;
            for (const base of [l4Angle, l5Angle]) {
                const a = base + aOffset;
                const r = d + rOffset;
                const v = Math.sqrt(this.G * starMass / r);
                this.addBody('asteroid', testMass * 0.5,
                    new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r),
                    new THREE.Vector3(-Math.sin(a) * v, 0, Math.cos(a) * v));
            }
        }
    }

    _presetRandomChaos() {
        for (let i = 0; i < 100; i++) {
            const angle = Math.random() * Math.PI * 2;
            const r = 10 + Math.random() * 80;
            const pos = new THREE.Vector3(
                Math.cos(angle) * r,
                (Math.random() - 0.5) * 20,
                Math.sin(angle) * r
            );
            const vel = new THREE.Vector3(
                (Math.random() - 0.5) * 2,
                (Math.random() - 0.5) * 0.5,
                (Math.random() - 0.5) * 2
            );

            const types = ['star', 'planet', 'planet', 'planet', 'asteroid'];
            const type = types[Math.floor(Math.random() * types.length)];
            const td = BODY_TYPES[type];
            const mass = td.baseMass * (0.3 + Math.random() * 1.5);

            this.addBody(type, mass, pos, vel);
        }
    }

    // ========================================================
    // EVENT BINDING
    // ========================================================

    _bindEvents() {
        const canvas = this.renderer.domElement;

        canvas.addEventListener('mousedown', (e) => this._onMouseDown(e));
        window.addEventListener('mousemove', (e) => this._onMouseMove(e));
        window.addEventListener('mouseup', (e) => this._onMouseUp(e));
        window.addEventListener('keydown', (e) => this._onKeyDown(e));

        window.addEventListener('resize', () => {
            const w = window.innerWidth;
            const h = window.innerHeight;
            this.camera.aspect = w / h;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(w, h);
            this.composer.setSize(w, h);
            this.bloomPass.resolution.set(w, h);
        });

        // Prevent context menu on canvas
        canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    }

    _bindUI() {
        // Tool buttons
        document.querySelectorAll('.tool-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this._selectTool(btn.dataset.tool);
            });
        });

        // G slider
        const gSlider = document.getElementById('slider-g');
        const gVal = document.getElementById('val-g');
        gSlider.addEventListener('input', () => {
            this.G = parseFloat(gSlider.value);
            gVal.textContent = this.G.toFixed(2);
        });

        // Time slider
        const timeSlider = document.getElementById('slider-time');
        const timeVal = document.getElementById('val-time');
        timeSlider.addEventListener('input', () => {
            this.timeScale = parseFloat(timeSlider.value);
            timeVal.textContent = this.timeScale.toFixed(1) + 'x';
        });

        // Toggles
        document.getElementById('toggle-trails').addEventListener('change', (e) => {
            this.showTrails = e.target.checked;
        });
        document.getElementById('toggle-gravfield').addEventListener('change', (e) => {
            this.showGravityField = e.target.checked;
        });
        document.getElementById('toggle-grid').addEventListener('change', (e) => {
            this.showGrid = e.target.checked;
            this.gridHelper.visible = this.showGrid;
        });
        document.getElementById('toggle-2d').addEventListener('change', (e) => {
            this.is2D = e.target.checked;
            if (this.is2D) {
                this.camera.position.set(0, 200, 0.1);
                this.controls.maxPolarAngle = 0.01;
                this.controls.minPolarAngle = 0.01;
            } else {
                this.controls.maxPolarAngle = Math.PI;
                this.controls.minPolarAngle = 0;
            }
        });

        // Play/Pause/Reset
        document.getElementById('btn-play').addEventListener('click', () => {
            this.paused = false;
            this._updatePlayPauseUI();
        });
        document.getElementById('btn-pause').addEventListener('click', () => {
            this.paused = true;
            this._updatePlayPauseUI();
        });
        document.getElementById('btn-reset').addEventListener('click', () => {
            this.clearAll();
        });

        // Preset selector
        document.getElementById('preset-select').addEventListener('change', (e) => {
            if (e.target.value) {
                this.loadPreset(e.target.value);
                e.target.value = '';
            }
        });

        // Camera follow buttons
        document.getElementById('btn-follow-body').addEventListener('click', () => {
            if (this.selectedBody) {
                this.followBody = this.selectedBody;
                this.followCOM = false;
            }
        });
        document.getElementById('btn-follow-com').addEventListener('click', () => {
            this.followCOM = !this.followCOM;
            this.followBody = null;
        });

        // Follow selected (info panel button)
        document.getElementById('btn-follow-selected').addEventListener('click', () => {
            if (this.selectedBody) {
                this.followBody = this.selectedBody;
                this.followCOM = false;
            }
        });

        // Delete selected
        document.getElementById('btn-delete-body').addEventListener('click', () => {
            if (this.selectedBody) {
                this.removeBody(this.selectedBody);
            }
        });
    }

    // ========================================================
    // MAIN LOOP
    // ========================================================

    _animate() {
        requestAnimationFrame(() => this._animate());

        const delta = this.clock.getDelta();
        const time = this.clock.getElapsedTime();

        // FPS
        this.frameCount++;
        this.fpsTime += delta;
        if (this.fpsTime >= 0.5) {
            this.fps = Math.round(this.frameCount / this.fpsTime);
            this.frameCount = 0;
            this.fpsTime = 0;
        }

        // Physics
        this._physicsStep();

        // Update visuals
        this._updateBodyVisuals();
        this._updateTrailVisuals();
        this._updateGravityField();
        this._updateAccretionDisks(time);
        this._updateCollisionEffects();
        this._updateCOM();
        this._updateOrbitPrediction();

        // Update UI
        this._updateStatsUI();
        this._updateBottomInfo();
        if (this.selectedBody) this._updateInfoPanel();

        // Controls
        this.controls.update();

        // Grid visibility
        this.gridHelper.visible = this.showGrid;

        // Render
        this.composer.render();
    }
}
