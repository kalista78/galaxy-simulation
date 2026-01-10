// Star particle vertex shader
export const starVertexShader = `
    attribute float size;
    attribute vec3 customColor;
    attribute float brightness;
    attribute float rotationSpeed;
    attribute float initialAngle;
    attribute float distanceFromCenter;

    varying vec3 vColor;
    varying float vBrightness;

    uniform float time;
    uniform float globalBrightness;
    uniform float speedMultiplier;

    void main() {
        vColor = customColor;
        vBrightness = brightness * globalBrightness;

        // Differential rotation: inner stars rotate faster (Keplerian)
        // ω ∝ r^(-1.5) for Keplerian, but we use a softer falloff for visual effect
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

        // Size attenuation with distance
        float sizeAtten = size * (300.0 / -mvPosition.z);
        gl_PointSize = clamp(sizeAtten, 0.5, 50.0);

        gl_Position = projectionMatrix * mvPosition;
    }
`;

// Star particle fragment shader with Gaussian falloff
export const starFragmentShader = `
    varying vec3 vColor;
    varying float vBrightness;

    void main() {
        // Calculate distance from center of point sprite
        vec2 center = gl_PointCoord - vec2(0.5);
        float dist = length(center);

        // Gaussian falloff for natural star appearance
        float intensity = exp(-dist * dist * 8.0);

        // Add bright core
        float core = exp(-dist * dist * 32.0) * 0.5;
        intensity += core;

        // Apply color and brightness
        vec3 finalColor = vColor * vBrightness * intensity;

        // Add slight bloom halo for brighter stars
        float halo = exp(-dist * dist * 2.0) * vBrightness * 0.1;
        finalColor += vColor * halo;

        // Discard nearly transparent pixels
        if (intensity < 0.01) discard;

        gl_FragColor = vec4(finalColor, intensity * vBrightness);
    }
`;
