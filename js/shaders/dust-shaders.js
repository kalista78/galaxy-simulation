// Enhanced dust lane vertex shader with subtle turbulence
export const dustVertexShader = `
    attribute float size;
    attribute float opacity;
    attribute float rotationSpeed;
    attribute float initialAngle;
    attribute float distanceFromCenter;

    varying float vOpacity;
    varying float vDistance;
    varying float vSeed;

    uniform float time;
    uniform float speedMultiplier;

    float hash(float n) {
        return fract(sin(n) * 43758.5453123);
    }

    void main() {
        vOpacity = opacity;
        vDistance = distanceFromCenter;
        vSeed = initialAngle * 57.3 + distanceFromCenter * 0.1;

        // Same differential rotation as stars
        float angularVelocity = rotationSpeed * speedMultiplier / (1.0 + pow(distanceFromCenter * 0.02, 0.5));
        float currentAngle = initialAngle + time * angularVelocity;

        float cosA = cos(currentAngle);
        float sinA = sin(currentAngle);
        vec3 rotatedPosition = vec3(
            position.x * cosA - position.z * sinA,
            position.y,
            position.x * sinA + position.z * cosA
        );

        // Very subtle turbulence
        float turbX = sin(time * 0.1 + hash(vSeed) * 6.28) * 0.2;
        float turbZ = cos(time * 0.08 + hash(vSeed + 1.0) * 6.28) * 0.2;
        rotatedPosition.x += turbX;
        rotatedPosition.z += turbZ;

        vec4 mvPosition = modelViewMatrix * vec4(rotatedPosition, 1.0);
        gl_PointSize = size * (200.0 / -mvPosition.z);
        gl_PointSize = clamp(gl_PointSize, 1.0, 40.0);

        gl_Position = projectionMatrix * mvPosition;
    }
`;

// Dust lane fragment shader with organic edges
export const dustFragmentShader = `
    varying float vOpacity;
    varying float vDistance;
    varying float vSeed;

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

    void main() {
        vec2 center = gl_PointCoord - vec2(0.5);
        float dist = length(center);

        // Noise-distorted edges for organic cloud look
        vec2 noiseUV = center * 4.0 + vec2(vSeed, vSeed * 0.7);
        float edgeNoise = noise(noiseUV) * 0.12;
        float distortedDist = dist + edgeNoise;

        float alpha = smoothstep(0.5, 0.0, distortedDist) * vOpacity;

        if (alpha < 0.01) discard;

        // Dark dust with subtle warm variation near center - NO pink
        float warmth = smoothstep(180.0, 15.0, vDistance);
        vec3 dustColor = vec3(0.02, 0.01, 0.005);
        dustColor += vec3(0.03, 0.01, 0.003) * warmth;

        gl_FragColor = vec4(dustColor, alpha);
    }
`;
