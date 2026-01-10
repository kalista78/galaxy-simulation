// Dust lane vertex shader
export const dustVertexShader = `
    attribute float size;
    attribute float opacity;
    attribute float rotationSpeed;
    attribute float initialAngle;
    attribute float distanceFromCenter;

    varying float vOpacity;

    uniform float time;
    uniform float speedMultiplier;

    void main() {
        vOpacity = opacity;

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

        vec4 mvPosition = modelViewMatrix * vec4(rotatedPosition, 1.0);
        gl_PointSize = size * (200.0 / -mvPosition.z);
        gl_PointSize = clamp(gl_PointSize, 1.0, 40.0);

        gl_Position = projectionMatrix * mvPosition;
    }
`;

// Dust lane fragment shader (absorption effect)
export const dustFragmentShader = `
    varying float vOpacity;

    void main() {
        vec2 center = gl_PointCoord - vec2(0.5);
        float dist = length(center);

        // Soft circular falloff
        float alpha = smoothstep(0.5, 0.0, dist) * vOpacity;

        if (alpha < 0.01) discard;

        // Dark brown/black dust color
        gl_FragColor = vec4(0.02, 0.01, 0.005, alpha);
    }
`;
