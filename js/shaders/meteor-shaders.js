// Shooting star / Meteor shower vertex shader
export const meteorVertexShader = `
    attribute float size;
    attribute vec3 velocity;
    attribute float life;
    attribute float maxLife;
    attribute vec3 meteorColor;
    attribute float trailLength;

    varying vec3 vColor;
    varying float vLife;
    varying float vIntensity;

    uniform float time;

    void main() {
        float lifeRatio = life / maxLife;
        vLife = lifeRatio;
        vColor = meteorColor;

        // Intensity peaks in the middle of life, fades at start and end
        vIntensity = sin(lifeRatio * 3.14159) * 1.5;

        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);

        // Size varies with life - grows then shrinks
        float dynamicSize = size * vIntensity;
        gl_PointSize = dynamicSize * (400.0 / -mvPosition.z);
        gl_PointSize = clamp(gl_PointSize, 1.0, 80.0);

        gl_Position = projectionMatrix * mvPosition;
    }
`;

// Shooting star fragment shader with elongated trail effect
export const meteorFragmentShader = `
    varying vec3 vColor;
    varying float vLife;
    varying float vIntensity;

    void main() {
        vec2 center = gl_PointCoord - vec2(0.5);
        float dist = length(center);

        // Hot white core
        float core = exp(-dist * dist * 40.0);
        // Softer colored glow
        float glow = exp(-dist * dist * 8.0);

        vec3 coreColor = vec3(1.0, 1.0, 1.0);
        vec3 finalColor = mix(vColor * glow, coreColor * core, core);
        float alpha = (core + glow * 0.5) * vIntensity;

        if (alpha < 0.01) discard;

        gl_FragColor = vec4(finalColor, alpha);
    }
`;

// Meteor trail vertex shader (line-based trails)
export const meteorTrailVertexShader = `
    attribute float alpha;
    attribute vec3 trailColor;

    varying float vAlpha;
    varying vec3 vTrailColor;

    void main() {
        vAlpha = alpha;
        vTrailColor = trailColor;

        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mvPosition;
    }
`;

export const meteorTrailFragmentShader = `
    varying float vAlpha;
    varying vec3 vTrailColor;

    void main() {
        if (vAlpha < 0.01) discard;
        gl_FragColor = vec4(vTrailColor, vAlpha * 0.8);
    }
`;

// Deep field background galaxy vertex shader
export const deepFieldVertexShader = `
    attribute float size;
    attribute vec3 galaxyColor;
    attribute float galaxyType;
    attribute float galaxyAngle;

    varying vec3 vColor;
    varying float vType;
    varying float vAngle;

    uniform float time;

    void main() {
        vColor = galaxyColor;
        vType = galaxyType;
        vAngle = galaxyAngle;

        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);

        gl_PointSize = size * (600.0 / -mvPosition.z);
        gl_PointSize = clamp(gl_PointSize, 2.0, 40.0);

        gl_Position = projectionMatrix * mvPosition;
    }
`;

// Deep field background galaxy fragment shader - renders tiny galaxy shapes
export const deepFieldFragmentShader = `
    varying vec3 vColor;
    varying float vType;
    varying float vAngle;

    void main() {
        vec2 uv = gl_PointCoord - vec2(0.5);

        // Rotate UV for galaxy orientation
        float c = cos(vAngle);
        float s = sin(vAngle);
        vec2 rotUV = vec2(uv.x * c - uv.y * s, uv.x * s + uv.y * c);

        float intensity = 0.0;

        if (vType < 0.33) {
            // Spiral galaxy - elongated with bright core
            float r = length(rotUV);
            float angle = atan(rotUV.y, rotUV.x);

            // Core
            intensity = exp(-r * r * 30.0) * 1.5;

            // Spiral arms (2 arms)
            float spiral = sin(angle * 2.0 + r * 15.0) * 0.5 + 0.5;
            float disk = exp(-r * r * 12.0);
            // Flatten vertically for disk
            float diskShape = exp(-rotUV.y * rotUV.y * 60.0);
            intensity += spiral * disk * diskShape * 0.6;

        } else if (vType < 0.66) {
            // Elliptical galaxy - smooth blob
            float r = length(rotUV * vec2(1.0, 1.5));
            intensity = exp(-r * r * 20.0);

        } else {
            // Irregular galaxy - noisy blob
            float r = length(rotUV);
            intensity = exp(-r * r * 15.0);
            // Add some noise variation
            float noise = sin(rotUV.x * 30.0) * sin(rotUV.y * 30.0) * 0.3;
            intensity *= (1.0 + noise);
        }

        if (intensity < 0.01) discard;

        // Add warm core glow
        float coreGlow = exp(-length(uv) * length(uv) * 50.0) * 0.3;
        vec3 coreColor = vColor * 1.3 + vec3(0.1, 0.05, 0.0);

        vec3 finalColor = mix(vColor * intensity, coreColor, coreGlow);

        gl_FragColor = vec4(finalColor, intensity * 0.7);
    }
`;
