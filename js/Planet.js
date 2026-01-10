import * as THREE from 'three';

/**
 * Planet configuration data with realistic ratios (compressed for visual appeal)
 */
export const PLANET_CONFIGS = {
    mercury: {
        name: 'Mercury',
        distance: 3,
        size: 0.15,
        period: 0.24,
        rotationPeriod: 58.6,
        axialTilt: 0.034,
        eccentricity: 0.206,
        inclination: 7.0,
        type: 'rocky',
        color: new THREE.Color(0.6, 0.5, 0.4),
        hasAtmosphere: false,
        hasClouds: false,
        hasRings: false,
        moons: [],
        features: ['Heavily cratered surface', 'Caloris Basin'],
        info: {
            diameter: '4,879 km',
            dayLength: '176 Earth days',
            yearLength: '88 Earth days',
            temperature: '-180°C to 430°C',
            gravity: '3.7 m/s²'
        }
    },
    venus: {
        name: 'Venus',
        distance: 4.5,
        size: 0.35,
        period: 0.62,
        rotationPeriod: -243, // Retrograde rotation
        axialTilt: 177.4,
        eccentricity: 0.007,
        inclination: 3.4,
        type: 'rocky',
        color: new THREE.Color(0.9, 0.7, 0.5),
        atmosphereColor: new THREE.Color(1.0, 0.9, 0.6),
        atmosphereDensity: 0.3,
        hasAtmosphere: true,
        hasClouds: false, // Atmosphere is so thick we treat it as surface
        hasRings: false,
        moons: [],
        features: ['Dense sulfuric acid clouds', 'Runaway greenhouse effect'],
        info: {
            diameter: '12,104 km',
            dayLength: '243 Earth days',
            yearLength: '225 Earth days',
            temperature: '465°C',
            gravity: '8.87 m/s²'
        }
    },
    earth: {
        name: 'Earth',
        distance: 6,
        size: 0.38,
        period: 1.0,
        rotationPeriod: 1,
        axialTilt: 23.4,
        eccentricity: 0.017,
        inclination: 0,
        type: 'rocky',
        color: new THREE.Color(0.2, 0.4, 0.8),
        atmosphereColor: new THREE.Color(0.4, 0.6, 1.0),
        atmosphereDensity: 0.15,
        hasAtmosphere: true,
        hasClouds: true,
        hasRings: false,
        moons: [
            { name: 'Moon', distance: 0.8, size: 0.1, color: new THREE.Color(0.7, 0.7, 0.7) }
        ],
        features: ['Blue oceans', 'White clouds', 'City lights at night'],
        info: {
            diameter: '12,742 km',
            dayLength: '24 hours',
            yearLength: '365.25 days',
            temperature: '-89°C to 57°C',
            gravity: '9.8 m/s²'
        }
    },
    mars: {
        name: 'Mars',
        distance: 8,
        size: 0.20,
        period: 1.88,
        rotationPeriod: 1.03,
        axialTilt: 25.2,
        eccentricity: 0.093,
        inclination: 1.9,
        type: 'rocky',
        color: new THREE.Color(0.8, 0.4, 0.2),
        atmosphereColor: new THREE.Color(1.0, 0.8, 0.6),
        atmosphereDensity: 0.05,
        hasAtmosphere: true,
        hasClouds: false,
        hasRings: false,
        moons: [
            { name: 'Phobos', distance: 0.3, size: 0.02, color: new THREE.Color(0.5, 0.4, 0.4) },
            { name: 'Deimos', distance: 0.5, size: 0.015, color: new THREE.Color(0.5, 0.4, 0.4) }
        ],
        features: ['Olympus Mons', 'Valles Marineris', 'Polar ice caps'],
        info: {
            diameter: '6,779 km',
            dayLength: '24.6 hours',
            yearLength: '687 Earth days',
            temperature: '-125°C to 20°C',
            gravity: '3.7 m/s²'
        }
    },
    jupiter: {
        name: 'Jupiter',
        distance: 14,
        size: 1.20,
        period: 11.86,
        rotationPeriod: 0.41,
        axialTilt: 3.1,
        eccentricity: 0.049,
        inclination: 1.3,
        type: 'gas',
        color: new THREE.Color(0.9, 0.8, 0.6),
        color2: new THREE.Color(0.8, 0.5, 0.3),
        hasAtmosphere: false, // Gas giants ARE atmosphere
        hasClouds: false,
        hasRings: false, // Has rings but very faint
        hasBands: true,
        hasStorm: true, // Great Red Spot
        moons: [
            { name: 'Io', distance: 1.8, size: 0.08, color: new THREE.Color(1.0, 0.8, 0.3) },
            { name: 'Europa', distance: 2.2, size: 0.07, color: new THREE.Color(0.8, 0.7, 0.6) },
            { name: 'Ganymede', distance: 2.8, size: 0.12, color: new THREE.Color(0.6, 0.5, 0.5) },
            { name: 'Callisto', distance: 3.5, size: 0.10, color: new THREE.Color(0.4, 0.4, 0.4) }
        ],
        features: ['Great Red Spot', 'Cloud bands', 'Galilean moons'],
        info: {
            diameter: '139,820 km',
            dayLength: '9.9 hours',
            yearLength: '11.86 Earth years',
            temperature: '-145°C',
            gravity: '24.8 m/s²'
        }
    },
    saturn: {
        name: 'Saturn',
        distance: 20,
        size: 1.00,
        period: 29.46,
        rotationPeriod: 0.45,
        axialTilt: 26.7,
        eccentricity: 0.056,
        inclination: 2.5,
        type: 'gas',
        color: new THREE.Color(0.9, 0.8, 0.5),
        color2: new THREE.Color(0.8, 0.7, 0.4),
        hasAtmosphere: false,
        hasClouds: false,
        hasRings: true,
        hasBands: true,
        ringInnerRadius: 1.2,
        ringOuterRadius: 2.3,
        ringColor: new THREE.Color(0.8, 0.7, 0.5),
        moons: [
            { name: 'Titan', distance: 2.5, size: 0.12, color: new THREE.Color(0.9, 0.7, 0.4) },
            { name: 'Enceladus', distance: 1.8, size: 0.04, color: new THREE.Color(1.0, 1.0, 1.0) }
        ],
        features: ['Magnificent ring system', 'Hexagonal polar vortex', 'Titan moon'],
        info: {
            diameter: '116,460 km',
            dayLength: '10.7 hours',
            yearLength: '29.46 Earth years',
            temperature: '-178°C',
            gravity: '10.4 m/s²'
        }
    },
    uranus: {
        name: 'Uranus',
        distance: 28,
        size: 0.60,
        period: 84.01,
        rotationPeriod: -0.72, // Retrograde
        axialTilt: 97.8, // Rolls on its side!
        eccentricity: 0.046,
        inclination: 0.8,
        type: 'ice',
        color: new THREE.Color(0.6, 0.8, 0.9),
        hasAtmosphere: false,
        hasClouds: false,
        hasRings: true, // Faint rings
        hasBands: false,
        ringInnerRadius: 0.8,
        ringOuterRadius: 1.1,
        ringColor: new THREE.Color(0.5, 0.5, 0.6),
        moons: [
            { name: 'Miranda', distance: 1.2, size: 0.03, color: new THREE.Color(0.7, 0.7, 0.7) },
            { name: 'Ariel', distance: 1.5, size: 0.05, color: new THREE.Color(0.8, 0.8, 0.8) }
        ],
        features: ['Extreme axial tilt (98°)', 'Faint ring system', 'Cyan color'],
        info: {
            diameter: '50,724 km',
            dayLength: '17.2 hours',
            yearLength: '84 Earth years',
            temperature: '-224°C',
            gravity: '8.7 m/s²'
        }
    },
    neptune: {
        name: 'Neptune',
        distance: 35,
        size: 0.55,
        period: 164.8,
        rotationPeriod: 0.67,
        axialTilt: 28.3,
        eccentricity: 0.010,
        inclination: 1.8,
        type: 'ice',
        color: new THREE.Color(0.3, 0.4, 0.9),
        hasAtmosphere: false,
        hasClouds: false,
        hasRings: false, // Has very faint rings
        hasBands: true,
        hasStorm: true, // Great Dark Spot
        moons: [
            { name: 'Triton', distance: 1.5, size: 0.08, color: new THREE.Color(0.8, 0.7, 0.7) }
        ],
        features: ['Deep blue color', 'Strongest winds in solar system', 'Great Dark Spot'],
        info: {
            diameter: '49,244 km',
            dayLength: '16.1 hours',
            yearLength: '164.8 Earth years',
            temperature: '-218°C',
            gravity: '11.2 m/s²'
        }
    }
};

/**
 * Planet class - Represents a single planet with all its components
 */
export class Planet {
    constructor(config, textureManager) {
        this.config = config;
        this.textureManager = textureManager;
        this.name = config.name;

        // Three.js group containing all planet components
        this.group = new THREE.Group();
        this.group.name = `planet_${config.name.toLowerCase()}`;

        // Component meshes
        this.surfaceMesh = null;
        this.atmosphereMesh = null;
        this.cloudMesh = null;
        this.ringMesh = null;
        this.moonGroups = [];

        // Orbit state
        this.orbitAngle = Math.random() * Math.PI * 2; // Random starting position
        this.rotationAngle = 0;

        // LOD state
        this.currentLOD = 'medium';

        // Textures
        this.textures = null;

        // Shaders and materials (will be set externally)
        this.surfaceMaterial = null;
        this.atmosphereMaterial = null;
        this.cloudMaterial = null;
        this.ringMaterial = null;
    }

    /**
     * Initialize the planet with textures and geometry
     */
    async init(shaders) {
        // Load textures
        this.textures = await this.textureManager.loadPlanetTextures(this.name);

        // Create surface mesh
        this.createSurface(shaders);

        // Create atmosphere if applicable
        if (this.config.hasAtmosphere) {
            this.createAtmosphere(shaders);
        }

        // Create clouds if applicable
        if (this.config.hasClouds && this.textures?.clouds) {
            this.createClouds(shaders);
        }

        // Create rings if applicable
        if (this.config.hasRings) {
            this.createRings(shaders);
        }

        // Create moons
        if (this.config.moons && this.config.moons.length > 0) {
            this.createMoons();
        }

        // Apply axial tilt
        this.group.rotation.z = THREE.MathUtils.degToRad(this.config.axialTilt);

        return this;
    }

    /**
     * Create the planet surface
     */
    createSurface(shaders) {
        const geometry = new THREE.SphereGeometry(this.config.size, 64, 64);

        // Determine which shader to use based on planet type and textures
        if (this.textures?.albedo) {
            // Use texture-based shader
            this.surfaceMaterial = new THREE.ShaderMaterial({
                uniforms: {
                    albedoMap: { value: this.textures.albedo },
                    nightMap: { value: this.textures.night || null },
                    hasNightMap: { value: this.textures.night ? 1.0 : 0.0 },
                    sunDirection: { value: new THREE.Vector3(1, 0, 0) },
                    time: { value: 0 },
                    planetColor: { value: this.config.color },
                    hasBands: { value: this.config.hasBands ? 1.0 : 0.0 },
                    hasStorm: { value: this.config.hasStorm ? 1.0 : 0.0 }
                },
                vertexShader: shaders.texturedPlanetVertex,
                fragmentShader: shaders.texturedPlanetFragment,
                transparent: false
            });
        } else {
            // Fallback to procedural shader
            this.surfaceMaterial = new THREE.ShaderMaterial({
                uniforms: {
                    time: { value: 0 },
                    sunDirection: { value: new THREE.Vector3(1, 0, 0) },
                    planetColor1: { value: this.config.color },
                    planetColor2: { value: this.config.color2 || this.config.color },
                    planetType: { value: this.config.type === 'gas' ? 1 : (this.config.type === 'ice' ? 2 : 0) },
                    hasBands: { value: this.config.hasBands ? 1.0 : 0.0 },
                    hasStorm: { value: this.config.hasStorm ? 1.0 : 0.0 }
                },
                vertexShader: shaders.proceduralPlanetVertex,
                fragmentShader: shaders.proceduralPlanetFragment,
                transparent: false
            });
        }

        this.surfaceMesh = new THREE.Mesh(geometry, this.surfaceMaterial);
        this.surfaceMesh.name = `${this.name}_surface`;
        this.group.add(this.surfaceMesh);
    }

    /**
     * Create atmosphere shell
     */
    createAtmosphere(shaders) {
        const geometry = new THREE.SphereGeometry(this.config.size * 1.02, 48, 48);

        this.atmosphereMaterial = new THREE.ShaderMaterial({
            uniforms: {
                atmosphereColor: { value: this.config.atmosphereColor || new THREE.Color(0.4, 0.6, 1.0) },
                density: { value: this.config.atmosphereDensity || 0.15 },
                sunDirection: { value: new THREE.Vector3(1, 0, 0) }
            },
            vertexShader: shaders.atmosphereVertex,
            fragmentShader: shaders.atmosphereFragment,
            transparent: true,
            side: THREE.BackSide,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });

        this.atmosphereMesh = new THREE.Mesh(geometry, this.atmosphereMaterial);
        this.atmosphereMesh.name = `${this.name}_atmosphere`;
        this.group.add(this.atmosphereMesh);
    }

    /**
     * Create cloud layer (for Earth)
     */
    createClouds(shaders) {
        const geometry = new THREE.SphereGeometry(this.config.size * 1.01, 48, 48);

        this.cloudMaterial = new THREE.ShaderMaterial({
            uniforms: {
                cloudMap: { value: this.textures.clouds },
                sunDirection: { value: new THREE.Vector3(1, 0, 0) },
                time: { value: 0 }
            },
            vertexShader: shaders.cloudVertex,
            fragmentShader: shaders.cloudFragment,
            transparent: true,
            depthWrite: false
        });

        this.cloudMesh = new THREE.Mesh(geometry, this.cloudMaterial);
        this.cloudMesh.name = `${this.name}_clouds`;
        this.group.add(this.cloudMesh);
    }

    /**
     * Create ring system (for Saturn, Uranus)
     */
    createRings(shaders) {
        const innerRadius = this.config.size * (this.config.ringInnerRadius || 1.2);
        const outerRadius = this.config.size * (this.config.ringOuterRadius || 2.3);

        const geometry = new THREE.RingGeometry(innerRadius, outerRadius, 128);

        // Fix UV mapping for ring texture
        const pos = geometry.attributes.position;
        const uv = geometry.attributes.uv;
        for (let i = 0; i < pos.count; i++) {
            const x = pos.getX(i);
            const y = pos.getY(i);
            const dist = Math.sqrt(x * x + y * y);
            // Map distance to 0-1 range for texture
            const u = (dist - innerRadius) / (outerRadius - innerRadius);
            uv.setXY(i, u, 0.5);
        }

        // Get ring texture if available
        const ringTexture = this.textures?.ring || null;

        this.ringMaterial = new THREE.ShaderMaterial({
            uniforms: {
                ringMap: { value: ringTexture },
                hasRingMap: { value: ringTexture ? 1.0 : 0.0 },
                ringColor: { value: this.config.ringColor || new THREE.Color(0.8, 0.7, 0.5) },
                sunDirection: { value: new THREE.Vector3(1, 0, 0) },
                planetRadius: { value: this.config.size },
                innerRadius: { value: innerRadius },
                outerRadius: { value: outerRadius }
            },
            vertexShader: shaders.ringVertex,
            fragmentShader: shaders.ringFragment,
            transparent: true,
            side: THREE.DoubleSide,
            depthWrite: false
        });

        this.ringMesh = new THREE.Mesh(geometry, this.ringMaterial);
        this.ringMesh.rotation.x = Math.PI / 2; // Lay flat
        this.ringMesh.name = `${this.name}_rings`;
        this.group.add(this.ringMesh);
    }

    /**
     * Create moons
     */
    createMoons() {
        for (const moonConfig of this.config.moons) {
            const moonGroup = new THREE.Group();
            moonGroup.name = `moon_${moonConfig.name}`;

            const geometry = new THREE.SphereGeometry(moonConfig.size, 32, 32);
            const material = new THREE.MeshStandardMaterial({
                color: moonConfig.color,
                roughness: 0.8,
                metalness: 0.1
            });

            const moonMesh = new THREE.Mesh(geometry, material);
            moonMesh.position.x = moonConfig.distance;
            moonGroup.add(moonMesh);

            // Store moon data for animation
            moonGroup.userData = {
                ...moonConfig,
                orbitAngle: Math.random() * Math.PI * 2
            };

            this.moonGroups.push(moonGroup);
            this.group.add(moonGroup);
        }
    }

    /**
     * Update planet position and rotation
     */
    update(time, deltaTime, sunPosition = new THREE.Vector3(0, 0, 0)) {
        // Update orbital position
        const orbitalSpeed = (2 * Math.PI) / (this.config.period * 365); // Radians per day
        this.orbitAngle += orbitalSpeed * deltaTime * 10; // Speed up for visibility

        // Calculate elliptical orbit position
        const e = this.config.eccentricity;
        const a = this.config.distance;
        const r = a * (1 - e * e) / (1 + e * Math.cos(this.orbitAngle));

        this.group.position.x = r * Math.cos(this.orbitAngle);
        this.group.position.z = r * Math.sin(this.orbitAngle);

        // Apply orbital inclination
        const inclinationRad = THREE.MathUtils.degToRad(this.config.inclination);
        this.group.position.y = Math.sin(this.orbitAngle) * r * Math.sin(inclinationRad);

        // Update planet rotation
        const rotationSpeed = (2 * Math.PI) / (Math.abs(this.config.rotationPeriod) * 24); // Radians per hour
        const direction = this.config.rotationPeriod < 0 ? -1 : 1;
        this.rotationAngle += direction * rotationSpeed * deltaTime * 100;

        if (this.surfaceMesh) {
            this.surfaceMesh.rotation.y = this.rotationAngle;
        }

        // Update cloud rotation (slightly different speed)
        if (this.cloudMesh) {
            this.cloudMesh.rotation.y = this.rotationAngle * 1.1;
        }

        // Update sun direction for lighting
        const sunDir = sunPosition.clone().sub(this.group.position).normalize();
        if (this.surfaceMaterial) {
            this.surfaceMaterial.uniforms.sunDirection.value.copy(sunDir);
            this.surfaceMaterial.uniforms.time.value = time;
        }
        if (this.atmosphereMaterial) {
            this.atmosphereMaterial.uniforms.sunDirection.value.copy(sunDir);
        }
        if (this.cloudMaterial) {
            this.cloudMaterial.uniforms.sunDirection.value.copy(sunDir);
            this.cloudMaterial.uniforms.time.value = time;
        }
        if (this.ringMaterial) {
            this.ringMaterial.uniforms.sunDirection.value.copy(sunDir);
        }

        // Update moons
        for (const moonGroup of this.moonGroups) {
            const moonData = moonGroup.userData;
            moonData.orbitAngle += deltaTime * 2; // Moon orbital speed
            const moon = moonGroup.children[0];
            if (moon) {
                moon.position.x = Math.cos(moonData.orbitAngle) * moonData.distance;
                moon.position.z = Math.sin(moonData.orbitAngle) * moonData.distance;
            }
        }
    }

    /**
     * Get world position of the planet
     */
    getWorldPosition() {
        const pos = new THREE.Vector3();
        this.group.getWorldPosition(pos);
        return pos;
    }

    /**
     * Set visibility
     */
    setVisible(visible) {
        this.group.visible = visible;
    }

    /**
     * Dispose of resources
     */
    dispose() {
        if (this.surfaceMesh) {
            this.surfaceMesh.geometry.dispose();
            this.surfaceMaterial?.dispose();
        }
        if (this.atmosphereMesh) {
            this.atmosphereMesh.geometry.dispose();
            this.atmosphereMaterial?.dispose();
        }
        if (this.cloudMesh) {
            this.cloudMesh.geometry.dispose();
            this.cloudMaterial?.dispose();
        }
        if (this.ringMesh) {
            this.ringMesh.geometry.dispose();
            this.ringMaterial?.dispose();
        }
        for (const moonGroup of this.moonGroups) {
            moonGroup.children.forEach(child => {
                if (child.geometry) child.geometry.dispose();
                if (child.material) child.material.dispose();
            });
        }
    }
}
