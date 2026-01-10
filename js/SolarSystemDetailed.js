import * as THREE from 'three';
import { Planet, PLANET_CONFIGS } from './Planet.js';
import { PlanetTextureManager } from './PlanetTextureManager.js';
import {
    texturedPlanetVertexShader, texturedPlanetFragmentShader,
    proceduralPlanetVertexShader, proceduralPlanetFragmentShader,
    atmosphereVertexShader, atmosphereFragmentShader,
    cloudVertexShader, cloudFragmentShader,
    ringVertexShader, ringFragmentShader,
    sunVertexShader, sunFragmentShader,
    sunCoronaVertexShader, sunCoronaFragmentShader
} from './shaders/planet-texture-shaders.js';

/**
 * SolarSystemDetailed - Complete textured solar system simulation
 */
export class SolarSystemDetailed {
    constructor(scene, camera) {
        this.scene = scene;
        this.camera = camera;

        // Main group containing entire solar system
        this.group = new THREE.Group();
        this.group.name = 'detailed_solar_system';

        // Texture manager
        this.textureManager = new PlanetTextureManager();

        // Sun components
        this.sun = null;
        this.sunCorona = null;
        this.sunLight = null;

        // Planets
        this.planets = new Map();

        // Orbit lines
        this.orbitLines = [];

        // Asteroid belt
        this.asteroidBelt = null;

        // Background stars (local to solar system view)
        this.backgroundStars = null;

        // Shader collection for planets
        this.shaders = {
            texturedPlanetVertex: texturedPlanetVertexShader,
            texturedPlanetFragment: texturedPlanetFragmentShader,
            proceduralPlanetVertex: proceduralPlanetVertexShader,
            proceduralPlanetFragment: proceduralPlanetFragmentShader,
            atmosphereVertex: atmosphereVertexShader,
            atmosphereFragment: atmosphereFragmentShader,
            cloudVertex: cloudVertexShader,
            cloudFragment: cloudFragmentShader,
            ringVertex: ringVertexShader,
            ringFragment: ringFragmentShader
        };

        // Time uniform for animations
        this.uniforms = {
            time: { value: 0 }
        };

        // State
        this.initialized = false;
        this.visible = false;

        // Loading progress callbacks
        this.onLoadProgress = null;
    }

    /**
     * Initialize the entire solar system
     */
    async init(progressCallback = null) {
        if (this.initialized) return this;

        this.onLoadProgress = progressCallback;

        // Set up texture loading progress
        this.textureManager.onProgress((info) => {
            if (this.onLoadProgress) {
                this.onLoadProgress(info);
            }
        });

        // Load all textures first
        await this.textureManager.loadAllTextures();

        // Create the sun
        await this.createSun();

        // Create all planets
        await this.createPlanets();

        // Create orbit lines
        this.createOrbitLines();

        // Create asteroid belt
        this.createAsteroidBelt();

        // Create background stars
        this.createBackgroundStars();

        // Add to scene
        this.scene.add(this.group);

        // Initially hidden
        this.group.visible = false;

        this.initialized = true;
        return this;
    }

    /**
     * Create the Sun with corona effect
     */
    async createSun() {
        const sunGroup = new THREE.Group();
        sunGroup.name = 'sun_group';

        // Sun surface
        const sunGeometry = new THREE.SphereGeometry(1.5, 64, 64);
        const sunTextures = this.textureManager.getTextures('sun');

        const sunMaterial = new THREE.ShaderMaterial({
            uniforms: {
                albedoMap: { value: sunTextures?.albedo || null },
                time: this.uniforms.time
            },
            vertexShader: sunVertexShader,
            fragmentShader: sunFragmentShader
        });

        this.sun = new THREE.Mesh(sunGeometry, sunMaterial);
        this.sun.name = 'sun';
        sunGroup.add(this.sun);

        // Sun corona (glow effect)
        const coronaGeometry = new THREE.SphereGeometry(2.2, 32, 32);
        const coronaMaterial = new THREE.ShaderMaterial({
            uniforms: {
                time: this.uniforms.time
            },
            vertexShader: sunCoronaVertexShader,
            fragmentShader: sunCoronaFragmentShader,
            transparent: true,
            side: THREE.BackSide,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });

        this.sunCorona = new THREE.Mesh(coronaGeometry, coronaMaterial);
        this.sunCorona.name = 'sun_corona';
        sunGroup.add(this.sunCorona);

        // Sun light source
        this.sunLight = new THREE.PointLight(0xffffff, 2.0, 100);
        this.sunLight.position.set(0, 0, 0);
        sunGroup.add(this.sunLight);

        // Ambient light for overall visibility
        const ambientLight = new THREE.AmbientLight(0x404040, 0.3);
        sunGroup.add(ambientLight);

        this.group.add(sunGroup);
    }

    /**
     * Create all planets
     */
    async createPlanets() {
        const planetNames = ['mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'];

        for (const name of planetNames) {
            const config = PLANET_CONFIGS[name];
            if (!config) continue;

            const planet = new Planet(config, this.textureManager);
            await planet.init(this.shaders);

            this.planets.set(name, planet);
            this.group.add(planet.group);
        }
    }

    /**
     * Create orbit visualization lines
     */
    createOrbitLines() {
        const orbitMaterial = new THREE.LineBasicMaterial({
            color: 0x444466,
            transparent: true,
            opacity: 0.3
        });

        for (const [name, planet] of this.planets) {
            const config = planet.config;
            const a = config.distance; // Semi-major axis
            const e = config.eccentricity;
            const b = a * Math.sqrt(1 - e * e); // Semi-minor axis

            // Create ellipse
            const points = [];
            const segments = 128;
            for (let i = 0; i <= segments; i++) {
                const theta = (i / segments) * Math.PI * 2;
                const r = a * (1 - e * e) / (1 + e * Math.cos(theta));
                const x = r * Math.cos(theta);
                const z = r * Math.sin(theta);
                const y = z * Math.sin(THREE.MathUtils.degToRad(config.inclination));
                points.push(new THREE.Vector3(x, y * 0.1, z)); // Reduce y for visibility
            }

            const orbitGeometry = new THREE.BufferGeometry().setFromPoints(points);
            const orbitLine = new THREE.Line(orbitGeometry, orbitMaterial);
            orbitLine.name = `orbit_${name}`;
            this.orbitLines.push(orbitLine);
            this.group.add(orbitLine);
        }
    }

    /**
     * Create asteroid belt between Mars and Jupiter
     */
    createAsteroidBelt() {
        const asteroidCount = 5000;
        const innerRadius = 9;
        const outerRadius = 13;

        const positions = new Float32Array(asteroidCount * 3);
        const sizes = new Float32Array(asteroidCount);

        for (let i = 0; i < asteroidCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const radius = innerRadius + Math.random() * (outerRadius - innerRadius);
            const height = (Math.random() - 0.5) * 0.5;

            positions[i * 3] = Math.cos(angle) * radius;
            positions[i * 3 + 1] = height;
            positions[i * 3 + 2] = Math.sin(angle) * radius;

            sizes[i] = 0.01 + Math.random() * 0.03;
        }

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

        const material = new THREE.PointsMaterial({
            color: 0x888888,
            size: 0.02,
            sizeAttenuation: true,
            transparent: true,
            opacity: 0.6
        });

        this.asteroidBelt = new THREE.Points(geometry, material);
        this.asteroidBelt.name = 'asteroid_belt';
        this.group.add(this.asteroidBelt);
    }

    /**
     * Create background stars for solar system view
     */
    createBackgroundStars() {
        const starCount = 10000;
        const positions = new Float32Array(starCount * 3);
        const colors = new Float32Array(starCount * 3);
        const sizes = new Float32Array(starCount);

        for (let i = 0; i < starCount; i++) {
            // Distribute on a sphere far away
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            const radius = 500;

            positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
            positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
            positions[i * 3 + 2] = radius * Math.cos(phi);

            // Random star color (white to slightly blue/orange)
            const colorType = Math.random();
            if (colorType < 0.7) {
                // White
                colors[i * 3] = 1.0;
                colors[i * 3 + 1] = 1.0;
                colors[i * 3 + 2] = 1.0;
            } else if (colorType < 0.85) {
                // Slight blue
                colors[i * 3] = 0.8;
                colors[i * 3 + 1] = 0.9;
                colors[i * 3 + 2] = 1.0;
            } else {
                // Slight orange
                colors[i * 3] = 1.0;
                colors[i * 3 + 1] = 0.9;
                colors[i * 3 + 2] = 0.7;
            }

            sizes[i] = 0.5 + Math.random() * 1.5;
        }

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

        const material = new THREE.PointsMaterial({
            size: 1,
            sizeAttenuation: true,
            vertexColors: true,
            transparent: true,
            opacity: 0.8
        });

        this.backgroundStars = new THREE.Points(geometry, material);
        this.backgroundStars.name = 'background_stars';
        this.group.add(this.backgroundStars);
    }

    /**
     * Update the solar system animation
     */
    update(time, deltaTime) {
        if (!this.initialized || !this.visible) return;

        // Update time uniform
        this.uniforms.time.value = time;

        // Sun position (always at origin)
        const sunPosition = new THREE.Vector3(0, 0, 0);

        // Update each planet
        for (const planet of this.planets.values()) {
            planet.update(time, deltaTime, sunPosition);
        }

        // Slowly rotate asteroid belt
        if (this.asteroidBelt) {
            this.asteroidBelt.rotation.y += deltaTime * 0.01;
        }
    }

    /**
     * Show the solar system
     */
    show() {
        this.visible = true;
        this.group.visible = true;
    }

    /**
     * Hide the solar system
     */
    hide() {
        this.visible = false;
        this.group.visible = false;
    }

    /**
     * Get a planet by name
     */
    getPlanet(name) {
        return this.planets.get(name.toLowerCase());
    }

    /**
     * Get planet world position
     */
    getPlanetPosition(name) {
        const planet = this.getPlanet(name);
        if (!planet) return null;
        return planet.getWorldPosition();
    }

    /**
     * Get camera position for viewing entire solar system
     */
    getOverviewCameraPosition() {
        return new THREE.Vector3(0, 30, 50);
    }

    /**
     * Get camera position for viewing a specific planet
     */
    getPlanetViewCameraPosition(planetName) {
        const planet = this.getPlanet(planetName);
        if (!planet) return null;

        const planetPos = planet.getWorldPosition();
        const viewDistance = planet.config.size * 4 + 2;

        // Position camera looking at planet from slight angle
        return new THREE.Vector3(
            planetPos.x + viewDistance * 0.8,
            planetPos.y + viewDistance * 0.3,
            planetPos.z + viewDistance * 0.8
        );
    }

    /**
     * Get list of planet names
     */
    getPlanetNames() {
        return Array.from(this.planets.keys());
    }

    /**
     * Get planet info for UI display
     */
    getPlanetInfo(name) {
        const config = PLANET_CONFIGS[name.toLowerCase()];
        if (!config) return null;

        return {
            name: config.name,
            info: config.info,
            features: config.features,
            moons: config.moons.map(m => m.name)
        };
    }

    /**
     * Set position of entire solar system group (for galaxy integration)
     */
    setPosition(x, y, z) {
        this.group.position.set(x, y, z);
    }

    /**
     * Set scale of entire solar system
     */
    setScale(scale) {
        this.group.scale.setScalar(scale);
    }

    /**
     * Toggle orbit line visibility
     */
    setOrbitLinesVisible(visible) {
        for (const line of this.orbitLines) {
            line.visible = visible;
        }
    }

    /**
     * Dispose of all resources
     */
    dispose() {
        // Dispose planets
        for (const planet of this.planets.values()) {
            planet.dispose();
        }
        this.planets.clear();

        // Dispose sun
        if (this.sun) {
            this.sun.geometry.dispose();
            this.sun.material.dispose();
        }
        if (this.sunCorona) {
            this.sunCorona.geometry.dispose();
            this.sunCorona.material.dispose();
        }

        // Dispose orbit lines
        for (const line of this.orbitLines) {
            line.geometry.dispose();
            line.material.dispose();
        }

        // Dispose asteroid belt
        if (this.asteroidBelt) {
            this.asteroidBelt.geometry.dispose();
            this.asteroidBelt.material.dispose();
        }

        // Dispose background stars
        if (this.backgroundStars) {
            this.backgroundStars.geometry.dispose();
            this.backgroundStars.material.dispose();
        }

        // Dispose textures
        this.textureManager.dispose();

        // Remove from scene
        this.scene.remove(this.group);

        this.initialized = false;
    }
}
