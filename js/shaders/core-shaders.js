// Core glow vertex shader
export const coreVertexShader = `
    varying vec3 vPosition;

    void main() {
        vPosition = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
`;

// Core glow fragment shader with volumetric effect
export const coreFragmentShader = `
    varying vec3 vPosition;
    uniform float time;
    uniform float coreGlow;

    void main() {
        float dist = length(vPosition);

        // Multiple layers of glow for volumetric effect
        float glow1 = exp(-dist * 0.15) * 0.8;
        float glow2 = exp(-dist * 0.08) * 0.4;
        float glow3 = exp(-dist * 0.04) * 0.2;

        float totalGlow = (glow1 + glow2 + glow3) * coreGlow;

        // Warm golden-white core color gradient
        vec3 innerColor = vec3(1.0, 0.98, 0.9);    // White-gold
        vec3 midColor = vec3(1.0, 0.85, 0.5);      // Golden
        vec3 outerColor = vec3(0.8, 0.5, 0.2);     // Orange-brown

        float t = smoothstep(0.0, 30.0, dist);
        vec3 color = mix(innerColor, midColor, t);
        color = mix(color, outerColor, smoothstep(10.0, 50.0, dist));

        // Subtle pulsing
        float pulse = 1.0 + sin(time * 0.5) * 0.02;

        gl_FragColor = vec4(color * totalGlow * pulse, totalGlow);
    }
`;

// Solar corona shader (simplified version for solar system)
export const coronaFragmentShader = `
    varying vec3 vPosition;
    uniform float time;
    uniform float coreGlow;

    void main() {
        float dist = length(vPosition);
        float glow = exp(-dist * 0.8) * coreGlow;
        vec3 color = vec3(1.0, 0.9, 0.5) * glow;
        gl_FragColor = vec4(color, glow * 0.6);
    }
`;

// Solar marker glow shader
export const markerVertexShader = `
    varying vec3 vNormal;
    void main() {
        vNormal = normal;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
`;

export const markerFragmentShader = `
    varying vec3 vNormal;
    uniform float time;
    void main() {
        float pulse = 0.5 + 0.5 * sin(time * 2.0);
        float fresnel = pow(1.0 - abs(dot(vNormal, vec3(0.0, 0.0, 1.0))), 2.0);
        gl_FragColor = vec4(1.0, 0.9, 0.3, fresnel * pulse * 0.5);
    }
`;
