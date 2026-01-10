import * as THREE from 'three';

/**
 * PlanetTextureManager - Handles loading, caching, and management of planet textures
 * Supports progressive loading and LOD texture swapping
 */
export class PlanetTextureManager {
    constructor() {
        this.loader = new THREE.TextureLoader();
        this.loadedTextures = new Map();
        this.loadingPromises = new Map();
        this.onProgressCallbacks = [];

        // Texture configuration per planet
        this.textureConfig = {
            sun: {
                albedo: 'textures/planets/sun/sun.jpg',
                resolution: '2k'
            },
            mercury: {
                albedo: 'textures/planets/mercury/mercury.jpg',
                resolution: '2k'
            },
            venus: {
                albedo: 'textures/planets/venus/venus_atmosphere.jpg',
                resolution: '4k'
            },
            earth: {
                albedo: 'textures/planets/earth/earth_daymap.jpg',
                night: 'textures/planets/earth/earth_nightmap.jpg',
                clouds: 'textures/planets/earth/earth_clouds.jpg',
                resolution: '2k'
            },
            mars: {
                albedo: 'textures/planets/mars/mars.jpg',
                resolution: '2k'
            },
            jupiter: {
                albedo: 'textures/planets/jupiter/jupiter.jpg',
                resolution: '2k'
            },
            saturn: {
                albedo: 'textures/planets/saturn/saturn.jpg',
                ring: 'textures/planets/saturn/saturn_ring.png',
                resolution: '2k'
            },
            uranus: {
                albedo: 'textures/planets/uranus/uranus.jpg',
                resolution: '2k'
            },
            neptune: {
                albedo: 'textures/planets/neptune/neptune.jpg',
                resolution: '2k'
            }
        };

        // Track loading progress
        this.totalTextures = 0;
        this.loadedCount = 0;
    }

    /**
     * Add a progress callback
     */
    onProgress(callback) {
        this.onProgressCallbacks.push(callback);
    }

    /**
     * Notify progress callbacks
     */
    notifyProgress(planet, textureType, progress) {
        const overallProgress = this.loadedCount / this.totalTextures;
        this.onProgressCallbacks.forEach(cb => cb({
            planet,
            textureType,
            progress,
            overallProgress,
            loadedCount: this.loadedCount,
            totalTextures: this.totalTextures
        }));
    }

    /**
     * Load a single texture with caching
     */
    loadTexture(path) {
        // Check cache first
        if (this.loadedTextures.has(path)) {
            return Promise.resolve(this.loadedTextures.get(path));
        }

        // Check if already loading
        if (this.loadingPromises.has(path)) {
            return this.loadingPromises.get(path);
        }

        // Start new load
        const promise = new Promise((resolve, reject) => {
            this.loader.load(
                path,
                (texture) => {
                    // Configure texture settings
                    texture.wrapS = THREE.RepeatWrapping;
                    texture.wrapT = THREE.ClampToEdgeWrapping;
                    texture.minFilter = THREE.LinearMipmapLinearFilter;
                    texture.magFilter = THREE.LinearFilter;
                    texture.anisotropy = 4;
                    texture.colorSpace = THREE.SRGBColorSpace;

                    // Cache and resolve
                    this.loadedTextures.set(path, texture);
                    this.loadingPromises.delete(path);
                    this.loadedCount++;
                    resolve(texture);
                },
                (progress) => {
                    // Progress callback
                    const percent = progress.total > 0 ? progress.loaded / progress.total : 0;
                    this.notifyProgress(null, null, percent);
                },
                (error) => {
                    console.error(`Failed to load texture: ${path}`, error);
                    this.loadingPromises.delete(path);
                    reject(error);
                }
            );
        });

        this.loadingPromises.set(path, promise);
        return promise;
    }

    /**
     * Load all textures for a specific planet
     */
    async loadPlanetTextures(planetName) {
        const config = this.textureConfig[planetName.toLowerCase()];
        if (!config) {
            console.warn(`No texture config for planet: ${planetName}`);
            return null;
        }

        const textures = {};
        const promises = [];

        // Load all configured textures for this planet
        for (const [key, path] of Object.entries(config)) {
            if (key === 'resolution') continue;

            promises.push(
                this.loadTexture(path)
                    .then(texture => {
                        textures[key] = texture;
                        this.notifyProgress(planetName, key, 1);
                    })
                    .catch(err => {
                        console.warn(`Could not load ${key} texture for ${planetName}`);
                        textures[key] = null;
                    })
            );
        }

        await Promise.all(promises);
        return textures;
    }

    /**
     * Preload essential textures (Sun + placeholder for all planets)
     */
    async preloadEssential() {
        // Count total textures
        this.totalTextures = 0;
        for (const config of Object.values(this.textureConfig)) {
            this.totalTextures += Object.keys(config).filter(k => k !== 'resolution').length;
        }

        this.notifyProgress(null, null, 0);

        // Load Sun first (always visible)
        await this.loadPlanetTextures('sun');

        // Load Earth (user's home planet - high priority)
        await this.loadPlanetTextures('earth');

        return true;
    }

    /**
     * Load all planet textures
     */
    async loadAllTextures() {
        const planets = Object.keys(this.textureConfig);

        // Count total
        this.totalTextures = 0;
        for (const config of Object.values(this.textureConfig)) {
            this.totalTextures += Object.keys(config).filter(k => k !== 'resolution').length;
        }

        // Load in priority order
        const priority = ['sun', 'earth', 'saturn', 'jupiter', 'mars', 'venus', 'neptune', 'uranus', 'mercury'];

        for (const planet of priority) {
            await this.loadPlanetTextures(planet);
        }

        return this.loadedTextures;
    }

    /**
     * Get loaded textures for a planet
     */
    getTextures(planetName) {
        const config = this.textureConfig[planetName.toLowerCase()];
        if (!config) return null;

        const textures = {};
        for (const [key, path] of Object.entries(config)) {
            if (key === 'resolution') continue;
            textures[key] = this.loadedTextures.get(path) || null;
        }

        return textures;
    }

    /**
     * Check if planet textures are loaded
     */
    isLoaded(planetName) {
        const config = this.textureConfig[planetName.toLowerCase()];
        if (!config) return false;

        for (const [key, path] of Object.entries(config)) {
            if (key === 'resolution') continue;
            if (!this.loadedTextures.has(path)) return false;
        }

        return true;
    }

    /**
     * Dispose of textures to free memory
     */
    dispose(planetName = null) {
        if (planetName) {
            const config = this.textureConfig[planetName.toLowerCase()];
            if (config) {
                for (const [key, path] of Object.entries(config)) {
                    if (key === 'resolution') continue;
                    const texture = this.loadedTextures.get(path);
                    if (texture) {
                        texture.dispose();
                        this.loadedTextures.delete(path);
                    }
                }
            }
        } else {
            // Dispose all
            for (const texture of this.loadedTextures.values()) {
                texture.dispose();
            }
            this.loadedTextures.clear();
        }
    }
}
