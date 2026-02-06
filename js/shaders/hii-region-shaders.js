// ============================================================
// HII Region / Emission Nebula Shaders
// Pink/magenta hydrogen-alpha emission + blue reflection nebulae
// These create the iconic colorful clouds along spiral arms
// ============================================================

export const hiiVertexShader = `
    attribute float size;
    attribute float opacity;
    attribute vec3 nebulaColor;
    attribute float rotationSpeed;
    attribute float initialAngle;
    attribute float distanceFromCenter;
    attribute float turbulence;

    varying float vOpacity;
    varying vec3 vNebulaColor;
    varying float vDistance;
    varying float vTurbulence;
    varying float vSize;

    uniform float time;
    uniform float speedMultiplier;
    uniform float globalBrightness;

    void main() {
        vOpacity = opacity * globalBrightness;
        vNebulaColor = nebulaColor;
        vDistance = distanceFromCenter;
        vTurbulence = turbulence;
        vSize = size;

        // Differential rotation matching stars
        float angularVelocity = rotationSpeed * speedMultiplier / (1.0 + pow(distanceFromCenter * 0.02, 0.5));
        float currentAngle = initialAngle + time * angularVelocity;

        float cosA = cos(currentAngle);
        float sinA = sin(currentAngle);
        vec3 rotatedPosition = vec3(
            position.x * cosA - position.z * sinA,
            position.y,
            position.x * sinA + position.z * cosA
        );

        // Subtle breathing / pulsation
        float breathe = 1.0 + sin(time * 0.3 + turbulence * 6.28) * 0.05;

        vec4 mvPosition = modelViewMatrix * vec4(rotatedPosition, 1.0);
        gl_PointSize = size * breathe * (180.0 / -mvPosition.z);
        gl_PointSize = clamp(gl_PointSize, 1.0, 35.0);

        gl_Position = projectionMatrix * mvPosition;
    }
`;

export const hiiFragmentShader = `
    varying float vOpacity;
    varying vec3 vNebulaColor;
    varying float vDistance;
    varying float vTurbulence;
    varying float vSize;

    uniform float time;

    // Simplex-like noise for organic cloud shapes
    float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
    }

    float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);

        float a = hash(i);
        float b = hash(i + vec2(1.0, 0.0));
        float c = hash(i + vec2(0.0, 1.0));
        float d = hash(i + vec2(1.0, 1.0));

        return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
    }

    float fbm(vec2 p) {
        float f = 0.0;
        f += 0.5 * noise(p); p *= 2.07;
        f += 0.25 * noise(p); p *= 2.03;
        f += 0.125 * noise(p); p *= 2.01;
        f += 0.0625 * noise(p);
        return f / 0.9375;
    }

    void main() {
        vec2 uv = gl_PointCoord - vec2(0.5);
        float dist = length(uv);

        // Organic cloud shape using fbm noise
        vec2 noiseUV = uv * 3.0 + vec2(vTurbulence * 10.0, vTurbulence * 7.3);
        float cloudNoise = fbm(noiseUV + time * 0.02);
        float cloudNoise2 = fbm(noiseUV * 1.5 + vec2(50.0) - time * 0.015);

        // Combine noise for organic shape
        float cloudShape = cloudNoise * 0.6 + cloudNoise2 * 0.4;

        // Soft radial falloff with noise distortion
        float distortedDist = dist + (cloudShape - 0.5) * 0.12;
        float alpha = smoothstep(0.5, 0.1, distortedDist) * vOpacity;

        // Subtle inner glow (much reduced)
        float innerGlow = exp(-distortedDist * distortedDist * 8.0) * 0.15;

        // Color: base nebula color with subtle noise variation
        vec3 color = vNebulaColor;
        color += vec3(0.04, -0.01, 0.02) * (cloudNoise - 0.5);

        // Very subtle bright core hint
        vec3 coreColor = vec3(1.0, 0.95, 0.85);
        color = mix(color, coreColor, innerGlow * 0.5);

        // Final alpha - keep it subtle
        float finalAlpha = alpha + innerGlow * 0.1;
        finalAlpha *= cloudShape * 0.4 + 0.6;

        if (finalAlpha < 0.003) discard;

        gl_FragColor = vec4(color, finalAlpha);
    }
`;

// Open Star Cluster (OB Association) vertex shader
export const clusterVertexShader = `
    attribute float size;
    attribute vec3 customColor;
    attribute float brightness;
    attribute float rotationSpeed;
    attribute float initialAngle;
    attribute float distanceFromCenter;

    varying vec3 vColor;
    varying float vBrightness;
    varying float vTwinkle;

    uniform float time;
    uniform float globalBrightness;
    uniform float speedMultiplier;

    float hash(float n) {
        return fract(sin(n) * 43758.5453123);
    }

    void main() {
        vColor = customColor;
        vBrightness = brightness * globalBrightness;

        // Scintillation (atmospheric-like twinkling)
        float starSeed = initialAngle * 100.0 + distanceFromCenter;
        float twinkleSpeed = 2.0 + hash(starSeed) * 4.0;
        float twinklePhase = hash(starSeed + 1.0) * 6.28318;
        float twinkle = 0.8 + 0.2 * sin(time * twinkleSpeed + twinklePhase);
        twinkle *= 0.9 + 0.1 * sin(time * twinkleSpeed * 1.7 + twinklePhase * 2.0);
        vTwinkle = twinkle;

        // Differential rotation
        float angularVelocity = rotationSpeed * speedMultiplier / (1.0 + pow(distanceFromCenter * 0.02, 0.5));
        float currentAngle = initialAngle + time * angularVelocity;

        float cosA = cos(currentAngle);
        float sinA = sin(currentAngle);
        vec3 rotatedPosition = vec3(
            position.x * cosA - position.z * sinA,
            position.y,
            position.x * sinA + position.z * cosA
        );

        vec4 mvPosition = modelViewMatrix * vec4(rotatedPosition, 1.0);

        float sizeAtten = size * twinkle * (220.0 / -mvPosition.z);
        gl_PointSize = clamp(sizeAtten, 0.5, 35.0);

        gl_Position = projectionMatrix * mvPosition;
    }
`;

export const clusterFragmentShader = `
    varying vec3 vColor;
    varying float vBrightness;
    varying float vTwinkle;

    void main() {
        vec2 center = gl_PointCoord - vec2(0.5);
        float dist = length(center);

        // Airy disk approximation for cluster stars
        float intensity = exp(-dist * dist * 14.0);

        // Core
        float core = exp(-dist * dist * 50.0) * 0.3;
        intensity += core;

        // Subtle diffraction spikes
        float spikeStrength = vBrightness * 0.1;
        float angle = atan(center.y, center.x);

        // 6-fold symmetry spikes
        float spike6 = pow(abs(cos(angle * 3.0)), 40.0) * exp(-dist * 4.0) * spikeStrength;
        // 4-fold fainter spikes (secondary diffraction)
        float spike4 = pow(abs(cos(angle * 2.0 + 0.3)), 50.0) * exp(-dist * 5.0) * spikeStrength * 0.4;
        intensity += spike6 + spike4;

        // Bloom halo
        float halo = exp(-dist * dist * 4.0) * vBrightness * 0.06;
        intensity += halo;

        float twinkledBrightness = vBrightness * vTwinkle;
        vec3 finalColor = vColor * twinkledBrightness * intensity;

        // Slight color boost at core
        finalColor += vec3(0.06, 0.05, 0.08) * core * twinkledBrightness;

        if (intensity < 0.008) discard;

        gl_FragColor = vec4(finalColor, intensity * twinkledBrightness);
    }
`;

// Vignette + Film Grain post-processing shader
export const vignetteVertexShader = `
    varying vec2 vUv;
    void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
`;

export const vignetteFragmentShader = `
    uniform sampler2D tDiffuse;
    uniform float vignetteStrength;
    uniform float grainStrength;
    uniform float time;
    uniform float chromaticStrength;
    uniform vec2 resolution;

    varying vec2 vUv;

    // Film grain noise
    float rand(vec2 co) {
        return fract(sin(dot(co.xy, vec2(12.9898, 78.233))) * 43758.5453);
    }

    void main() {
        vec2 uv = vUv;

        // Subtle chromatic aberration from center
        float chromaDist = length(uv - 0.5) * chromaticStrength;
        vec2 chromaDir = normalize(uv - 0.5) * chromaDist;

        float r = texture2D(tDiffuse, uv + chromaDir * 0.003).r;
        float g = texture2D(tDiffuse, uv).g;
        float b = texture2D(tDiffuse, uv - chromaDir * 0.003).b;

        vec3 color = vec3(r, g, b);

        // Vignette - darken edges for cinematic framing
        float vignette = 1.0 - smoothstep(0.3, 0.85, length(uv - 0.5));
        vignette = mix(1.0, vignette, vignetteStrength);
        color *= vignette;

        // Very subtle film grain for organic feel
        float grain = rand(uv * resolution + vec2(time * 100.0)) * 2.0 - 1.0;
        color += grain * grainStrength * (1.0 - vignette * 0.5); // More grain at edges

        gl_FragColor = vec4(color, 1.0);
    }
`;
