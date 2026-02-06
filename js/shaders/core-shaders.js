// Core glow vertex shader
export const coreVertexShader = `
    varying vec3 vPosition;

    void main() {
        vPosition = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
`;

// Core glow fragment shader with subtle volumetric texture
export const coreFragmentShader = `
    varying vec3 vPosition;
    uniform float time;
    uniform float coreGlow;

    // Simple noise for volumetric texture
    float hash3D(vec3 p) {
        return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453123);
    }

    float noise3D(vec3 p) {
        vec3 i = floor(p);
        vec3 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);

        float a = hash3D(i);
        float b = hash3D(i + vec3(1.0, 0.0, 0.0));
        float c = hash3D(i + vec3(0.0, 1.0, 0.0));
        float d = hash3D(i + vec3(1.0, 1.0, 0.0));
        float e = hash3D(i + vec3(0.0, 0.0, 1.0));
        float f2 = hash3D(i + vec3(1.0, 0.0, 1.0));
        float g = hash3D(i + vec3(0.0, 1.0, 1.0));
        float h = hash3D(i + vec3(1.0, 1.0, 1.0));

        return mix(
            mix(mix(a, b, f.x), mix(c, d, f.x), f.y),
            mix(mix(e, f2, f.x), mix(g, h, f.x), f.y),
            f.z
        );
    }

    float fbm(vec3 p) {
        float f = 0.0;
        float amp = 0.5;
        float freq = 1.0;
        for (int i = 0; i < 4; i++) {
            f += amp * noise3D(p * freq);
            freq *= 2.03;
            amp *= 0.5;
        }
        return f / 0.9375;
    }

    void main() {
        float dist = length(vPosition);

        // Full glow - original falloff for rich brightness
        float glow1 = exp(-dist * 0.15) * 0.8;
        float glow2 = exp(-dist * 0.08) * 0.4;
        float glow3 = exp(-dist * 0.04) * 0.2;

        float totalGlow = (glow1 + glow2 + glow3) * coreGlow;

        // Subtle volumetric noise texture - modulates glow, doesn't add to it
        vec3 noiseCoord = vPosition * 0.06 + vec3(time * 0.015, time * 0.01, time * 0.008);
        float volumetric = fbm(noiseCoord);
        float cloudDetail = volumetric * 0.15 + 0.85;
        totalGlow *= cloudDetail;

        // Warm golden core colors - rich and saturated, NOT white
        vec3 innerColor = vec3(1.0, 0.93, 0.72);   // Warm gold center
        vec3 midColor = vec3(1.0, 0.78, 0.42);     // Rich golden
        vec3 outerColor = vec3(0.8, 0.5, 0.18);    // Deep amber
        vec3 deepOuter = vec3(0.35, 0.15, 0.05);   // Warm dark brown

        float t = smoothstep(0.0, 25.0, dist);
        vec3 color = mix(innerColor, midColor, t);
        color = mix(color, outerColor, smoothstep(10.0, 45.0, dist));
        color = mix(color, deepOuter, smoothstep(35.0, 65.0, dist));

        // Subtle warm noise color variation
        color += vec3(0.05, 0.025, 0.0) * volumetric * glow1;

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

        // Subtle solar prominence-like tendrils
        float angle = atan(vPosition.z, vPosition.x);
        float tendril = sin(angle * 6.0 + time * 0.8) * 0.5 + 0.5;
        tendril *= exp(-dist * 0.5);
        glow += tendril * 0.08 * coreGlow;

        vec3 color = vec3(1.0, 0.9, 0.5) * glow;
        // Slight warm tint at edges
        color += vec3(0.15, 0.03, 0.0) * tendril * 0.2;

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

        // Subtle color shift between gold and cyan
        vec3 color = mix(vec3(1.0, 0.9, 0.3), vec3(0.3, 0.8, 1.0), pulse * 0.3);

        gl_FragColor = vec4(color, fresnel * pulse * 0.5);
    }
`;
