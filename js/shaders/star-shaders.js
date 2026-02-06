// Star particle vertex shader with twinkling
export const starVertexShader = `
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

        // Multi-frequency twinkling for realistic scintillation
        float starSeed = initialAngle * 100.0 + distanceFromCenter;
        float twinkleSpeed1 = 1.5 + hash(starSeed) * 3.0;
        float twinkleSpeed2 = 2.8 + hash(starSeed + 3.0) * 2.5;
        float twinklePhase1 = hash(starSeed + 1.0) * 6.28318;
        float twinklePhase2 = hash(starSeed + 2.0) * 6.28318;

        float twinkle = 0.85 + 0.10 * sin(time * twinkleSpeed1 + twinklePhase1);
        twinkle += 0.05 * sin(time * twinkleSpeed2 + twinklePhase2);
        twinkle = mix(1.0, twinkle, min(brightness * 0.5, 1.0));
        vTwinkle = twinkle;

        // Differential rotation: inner stars rotate faster (Keplerian)
        float angularVelocity = rotationSpeed * speedMultiplier / (1.0 + pow(distanceFromCenter * 0.02, 0.5));
        float currentAngle = initialAngle + time * angularVelocity;

        // Apply rotation around Y-axis (galactic pole)
        float cosA = cos(currentAngle);
        float sinA = sin(currentAngle);
        vec3 rotatedPosition = vec3(
            position.x * cosA - position.z * sinA,
            position.y,
            position.x * sinA + position.z * cosA
        );

        vec4 mvPosition = modelViewMatrix * vec4(rotatedPosition, 1.0);

        // Size attenuation with distance, modulated by twinkle
        float sizeAtten = size * twinkle * (280.0 / -mvPosition.z);
        gl_PointSize = clamp(sizeAtten, 0.5, 40.0);

        gl_Position = projectionMatrix * mvPosition;
    }
`;

// Star particle fragment shader with diffraction spikes
export const starFragmentShader = `
    varying vec3 vColor;
    varying float vBrightness;
    varying float vTwinkle;

    void main() {
        vec2 center = gl_PointCoord - vec2(0.5);
        float dist = length(center);

        // Gaussian falloff for natural star appearance
        float intensity = exp(-dist * dist * 8.0);

        // Bright core
        float core = exp(-dist * dist * 32.0) * 0.5;
        intensity += core;

        // Subtle diffraction spikes for bright stars only
        float spike = 0.0;
        if (vBrightness > 0.8) {
            float spikeStrength = (vBrightness - 0.8) * 1.5;
            float hSpike = exp(-abs(center.y) * 28.0) * exp(-abs(center.x) * 3.0);
            float vSpike = exp(-abs(center.x) * 28.0) * exp(-abs(center.y) * 3.0);
            spike = (hSpike + vSpike) * spikeStrength * 0.12;
        }
        intensity += spike;

        // Apply twinkle
        float twinkledBrightness = vBrightness * vTwinkle;

        // Apply color and brightness
        vec3 finalColor = vColor * twinkledBrightness * intensity;

        // Slight bloom halo for brighter stars
        float halo = exp(-dist * dist * 2.0) * twinkledBrightness * 0.1;
        finalColor += vColor * halo;

        // Discard nearly transparent pixels
        if (intensity < 0.01) discard;

        gl_FragColor = vec4(finalColor, intensity * twinkledBrightness);
    }
`;
