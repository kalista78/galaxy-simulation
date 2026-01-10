// ============================================================
// HIGH-QUALITY PLANET DETAIL SHADERS
// ============================================================

// Detailed planet surface shader with procedural textures
export const detailedPlanetVertexShader = `
    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vPosition;
    varying vec3 vWorldPosition;

    void main() {
        vUv = uv;
        vNormal = normalize(normalMatrix * normal);
        vPosition = position;
        vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
`;

export const detailedPlanetFragmentShader = `
    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vPosition;
    varying vec3 vWorldPosition;

    uniform vec3 planetColor1;
    uniform vec3 planetColor2;
    uniform vec3 sunDirection;
    uniform float time;
    uniform float planetType; // 0=rocky, 1=gas giant, 2=ice giant
    uniform float hasBands;
    uniform float hasStorm;

    // Noise functions
    float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
    }

    float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(
            mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
            mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
            f.y
        );
    }

    float fbm(vec2 p) {
        float f = 0.0;
        f += 0.5 * noise(p); p *= 2.02;
        f += 0.25 * noise(p); p *= 2.03;
        f += 0.125 * noise(p); p *= 2.01;
        f += 0.0625 * noise(p);
        return f / 0.9375;
    }

    // 3D noise
    float noise3D(vec3 p) {
        vec3 i = floor(p);
        vec3 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);

        float n = i.x + i.y * 57.0 + i.z * 113.0;
        return mix(
            mix(
                mix(hash(vec2(n, 0.0)), hash(vec2(n + 1.0, 0.0)), f.x),
                mix(hash(vec2(n + 57.0, 0.0)), hash(vec2(n + 58.0, 0.0)), f.x),
                f.y
            ),
            mix(
                mix(hash(vec2(n + 113.0, 0.0)), hash(vec2(n + 114.0, 0.0)), f.x),
                mix(hash(vec2(n + 170.0, 0.0)), hash(vec2(n + 171.0, 0.0)), f.x),
                f.y
            ),
            f.z
        );
    }

    void main() {
        vec3 normal = normalize(vNormal);
        vec3 sunDir = normalize(sunDirection);

        // Spherical coordinates for texture mapping
        float phi = atan(vPosition.z, vPosition.x);
        float theta = acos(vPosition.y / length(vPosition));
        vec2 sphereUv = vec2(phi / 6.28318 + 0.5, theta / 3.14159);

        vec3 baseColor = mix(planetColor1, planetColor2, 0.5);
        float surfaceDetail = 0.0;

        // Rocky planet surface
        if (planetType < 0.5) {
            // Craters and terrain
            float craters = 0.0;
            for (float i = 1.0; i < 4.0; i++) {
                vec2 craterUv = sphereUv * pow(2.0, i) * 8.0;
                float crater = 1.0 - smoothstep(0.0, 0.3, length(fract(craterUv) - 0.5));
                craters += crater * (0.5 / i);
            }

            float terrain = fbm(sphereUv * 20.0);
            surfaceDetail = terrain * 0.3 + craters * 0.2;
            baseColor = mix(planetColor1, planetColor2, terrain);

            // Add some variation
            baseColor *= 0.85 + surfaceDetail * 0.3;
        }
        // Gas giant bands
        else if (planetType < 1.5) {
            if (hasBands > 0.5) {
                // Horizontal bands
                float bands = sin(sphereUv.y * 30.0 + time * 0.1) * 0.5 + 0.5;
                bands += sin(sphereUv.y * 15.0 - time * 0.05) * 0.3;
                bands += fbm(vec2(sphereUv.x * 5.0 + time * 0.02, sphereUv.y * 20.0)) * 0.4;

                baseColor = mix(planetColor1, planetColor2, bands);

                // Turbulence
                float turb = fbm(sphereUv * 15.0 + time * 0.03);
                baseColor *= 0.9 + turb * 0.2;
            }

            // Great storm (like Jupiter's Great Red Spot)
            if (hasStorm > 0.5) {
                vec2 stormCenter = vec2(0.3, 0.55);
                vec2 stormUv = sphereUv - stormCenter;
                stormUv.x *= 2.0;
                float stormDist = length(stormUv);

                if (stormDist < 0.08) {
                    // Storm swirl
                    float angle = atan(stormUv.y, stormUv.x) + time * 0.5;
                    float swirl = sin(angle * 3.0 + stormDist * 30.0) * 0.5 + 0.5;
                    float stormIntensity = smoothstep(0.08, 0.02, stormDist);
                    baseColor = mix(baseColor, vec3(0.8, 0.3, 0.2), stormIntensity * swirl);
                }
            }
        }
        // Ice giant
        else {
            float icePattern = fbm(sphereUv * 8.0 + time * 0.01);
            if (hasBands > 0.5) {
                float bands = sin(sphereUv.y * 15.0) * 0.5 + 0.5;
                icePattern = mix(icePattern, bands, 0.5);
            }
            baseColor = mix(planetColor1, planetColor2, icePattern);
        }

        // Lighting
        float diffuse = max(dot(normal, sunDir), 0.0);

        // Terminator softening
        float terminator = smoothstep(-0.1, 0.3, diffuse);

        // Ambient light (very dim for realism)
        vec3 ambient = baseColor * 0.08;

        // Final color with day/night
        vec3 dayColor = baseColor * diffuse * 1.2;
        vec3 nightColor = baseColor * 0.02;
        vec3 finalColor = mix(nightColor, dayColor, terminator) + ambient;

        // Rim lighting (atmosphere scatter effect)
        float rim = 1.0 - max(dot(normal, vec3(0.0, 0.0, 1.0)), 0.0);
        rim = pow(rim, 3.0);
        finalColor += baseColor * rim * 0.15;

        gl_FragColor = vec4(finalColor, 1.0);
    }
`;

// Volumetric atmosphere shader (Rayleigh scattering approximation)
export const atmosphereVertexShader = `
    varying vec3 vNormal;
    varying vec3 vPosition;

    void main() {
        vNormal = normalize(normalMatrix * normal);
        vPosition = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
`;

export const atmosphereFragmentShader = `
    varying vec3 vNormal;
    varying vec3 vPosition;

    uniform vec3 atmosphereColor;
    uniform vec3 sunDirection;
    uniform float atmosphereDensity;

    void main() {
        vec3 normal = normalize(vNormal);
        vec3 sunDir = normalize(sunDirection);

        // View direction (assuming camera at z+)
        vec3 viewDir = normalize(-vPosition);

        // Fresnel-like rim effect
        float rim = 1.0 - max(dot(normal, viewDir), 0.0);
        rim = pow(rim, 2.0);

        // Sunlight scattering
        float sunScatter = max(dot(normal, sunDir), 0.0);
        sunScatter = pow(sunScatter, 0.5);

        // Atmosphere glow
        float glow = rim * (0.5 + sunScatter * 0.5);

        // Color with atmospheric scattering
        vec3 scatterColor = atmosphereColor;

        // Add some warmth on the sun-facing side
        scatterColor = mix(scatterColor, scatterColor * vec3(1.2, 1.1, 1.0), sunScatter * 0.3);

        float alpha = glow * atmosphereDensity;
        alpha = clamp(alpha, 0.0, 0.8);

        gl_FragColor = vec4(scatterColor, alpha);
    }
`;

// Cloud layer shader
export const cloudVertexShader = `
    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vPosition;

    void main() {
        vUv = uv;
        vNormal = normalize(normalMatrix * normal);
        vPosition = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
`;

export const cloudFragmentShader = `
    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vPosition;

    uniform float time;
    uniform vec3 sunDirection;
    uniform float cloudDensity;

    float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
    }

    float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(
            mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
            mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
            f.y
        );
    }

    float fbm(vec2 p) {
        float f = 0.0;
        f += 0.5 * noise(p); p *= 2.02;
        f += 0.25 * noise(p); p *= 2.03;
        f += 0.125 * noise(p); p *= 2.01;
        f += 0.0625 * noise(p);
        return f / 0.9375;
    }

    void main() {
        vec3 normal = normalize(vNormal);
        vec3 sunDir = normalize(sunDirection);

        // Spherical UV mapping
        float phi = atan(vPosition.z, vPosition.x);
        float theta = acos(vPosition.y / length(vPosition));
        vec2 sphereUv = vec2(phi / 6.28318 + 0.5, theta / 3.14159);

        // Animated cloud pattern
        vec2 cloudUv = sphereUv * 8.0;
        cloudUv.x += time * 0.02; // Cloud rotation

        float clouds = fbm(cloudUv);
        clouds = smoothstep(0.4, 0.7, clouds);

        // Cloud wisps
        float wisps = fbm(cloudUv * 2.0 + time * 0.01);
        clouds = max(clouds, wisps * 0.5);

        // Lighting
        float diffuse = max(dot(normal, sunDir), 0.0);
        float terminator = smoothstep(-0.1, 0.3, diffuse);

        // Cloud color (white, slightly blue in shadow)
        vec3 cloudColor = vec3(1.0);
        vec3 shadowColor = vec3(0.7, 0.75, 0.85);

        vec3 finalColor = mix(shadowColor * 0.3, cloudColor, terminator);

        // Transparency based on cloud density and lighting
        float alpha = clouds * cloudDensity * (0.5 + terminator * 0.5);

        gl_FragColor = vec4(finalColor, alpha);
    }
`;

// Enhanced Saturn-style ring shader
export const detailedRingsVertexShader = `
    varying vec2 vUv;
    varying vec3 vPosition;
    varying vec3 vNormal;

    void main() {
        vUv = uv;
        vNormal = normalize(normalMatrix * normal);
        vPosition = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
`;

export const detailedRingsFragmentShader = `
    varying vec2 vUv;
    varying vec3 vPosition;
    varying vec3 vNormal;

    uniform vec3 ringColor1;
    uniform vec3 ringColor2;
    uniform vec3 sunDirection;
    uniform float time;

    float hash(float n) {
        return fract(sin(n) * 43758.5453);
    }

    void main() {
        vec2 center = vUv - 0.5;
        float dist = length(center) * 2.0;
        float angle = atan(center.y, center.x);

        // Ring boundaries
        float innerRadius = 0.35;
        float outerRadius = 0.95;

        // Outside ring area = transparent
        if (dist < innerRadius || dist > outerRadius) {
            discard;
        }

        // Ring bands with gaps
        float ringParam = (dist - innerRadius) / (outerRadius - innerRadius);

        // Multiple ring bands with different densities
        float bands = 0.0;

        // A ring (brightest)
        float aRing = smoothstep(0.0, 0.02, ringParam) * smoothstep(0.35, 0.33, ringParam);
        bands += aRing * 0.9;

        // Cassini Division (gap)
        float cassini = smoothstep(0.33, 0.35, ringParam) * smoothstep(0.42, 0.40, ringParam);
        bands *= (1.0 - cassini * 0.9);

        // B ring (dense)
        float bRing = smoothstep(0.40, 0.42, ringParam) * smoothstep(0.65, 0.63, ringParam);
        bands += bRing * 0.85;

        // C ring (faint inner ring)
        float cRing = smoothstep(0.65, 0.67, ringParam) * smoothstep(1.0, 0.98, ringParam);
        bands += cRing * 0.3;

        // Fine structure
        float fineLines = sin(ringParam * 200.0) * 0.5 + 0.5;
        fineLines *= sin(ringParam * 80.0 + angle * 0.5) * 0.5 + 0.5;
        bands *= 0.7 + fineLines * 0.3;

        // Particle clumps
        float clumps = hash(floor(angle * 50.0) + floor(ringParam * 100.0));
        bands *= 0.8 + clumps * 0.4;

        // Color variation
        vec3 ringColor = mix(ringColor1, ringColor2, ringParam);

        // Slight color variation
        ringColor *= 0.9 + hash(floor(ringParam * 50.0)) * 0.2;

        // Lighting from sun
        vec3 sunDir = normalize(sunDirection);
        float sunlight = max(dot(vec3(0.0, 1.0, 0.0), sunDir), 0.0);
        sunlight = 0.5 + sunlight * 0.5;

        // Shadow from planet (approximation)
        float shadowAngle = atan(sunDir.z, sunDir.x);
        float angleDiff = abs(angle - shadowAngle);
        angleDiff = min(angleDiff, 6.28318 - angleDiff);
        float inShadow = smoothstep(0.3, 0.5, angleDiff);

        vec3 finalColor = ringColor * bands * sunlight * (0.3 + inShadow * 0.7);

        float alpha = bands * 0.9;

        gl_FragColor = vec4(finalColor, alpha);
    }
`;
