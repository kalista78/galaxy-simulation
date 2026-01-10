// Solar System shaders

// Sun vertex shader
export const sunVertexShader = `
    varying vec3 vNormal;
    varying vec3 vPosition;

    void main() {
        vNormal = normalize(normalMatrix * normal);
        vPosition = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
`;

export const sunFragmentShader = `
    varying vec3 vNormal;
    varying vec3 vPosition;
    uniform float time;

    // Noise functions for solar surface
    float hash(vec3 p) {
        return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453);
    }

    float noise3D(vec3 p) {
        vec3 i = floor(p);
        vec3 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);

        return mix(
            mix(mix(hash(i), hash(i + vec3(1,0,0)), f.x),
                mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
            mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x),
                mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y),
            f.z
        );
    }

    float fbm3D(vec3 p) {
        float f = 0.0;
        f += 0.5 * noise3D(p); p *= 2.02;
        f += 0.25 * noise3D(p); p *= 2.03;
        f += 0.125 * noise3D(p); p *= 2.01;
        f += 0.0625 * noise3D(p);
        return f / 0.9375;
    }

    void main() {
        vec3 pos = normalize(vPosition);

        // Animated solar surface
        float n = fbm3D(pos * 5.0 + time * 0.1);
        float n2 = fbm3D(pos * 10.0 - time * 0.15);

        // Solar granulation
        float granules = fbm3D(pos * 20.0 + time * 0.05) * 0.3;

        // Sunspots (darker regions)
        float spots = smoothstep(0.6, 0.7, fbm3D(pos * 3.0 + time * 0.02));

        // Base solar colors
        vec3 coreColor = vec3(1.0, 1.0, 0.9);
        vec3 surfaceColor = vec3(1.0, 0.85, 0.4);
        vec3 limbColor = vec3(1.0, 0.5, 0.2);
        vec3 spotColor = vec3(0.6, 0.3, 0.1);

        // Limb darkening
        float fresnel = pow(1.0 - abs(dot(vNormal, vec3(0.0, 0.0, 1.0))), 1.5);

        vec3 color = mix(surfaceColor, coreColor, n * 0.5);
        color = mix(color, limbColor, fresnel * 0.6);
        color += granules * vec3(0.2, 0.1, 0.0);
        color = mix(color, spotColor, spots * 0.5);

        // Emission intensity
        float intensity = 1.2 + n2 * 0.3;

        gl_FragColor = vec4(color * intensity, 1.0);
    }
`;

// Planet shader
export const planetVertexShader = `
    varying vec3 vNormal;
    varying vec2 vUv;

    void main() {
        vNormal = normalize(normalMatrix * normal);
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
`;

export const planetFragmentShader = `
    varying vec3 vNormal;
    varying vec2 vUv;
    uniform vec3 planetColor;
    uniform vec3 planetColor2;
    uniform float hasRings;
    uniform float hasAtmosphere;
    uniform float time;

    void main() {
        // Basic lighting
        vec3 lightDir = normalize(vec3(-1.0, 0.3, 0.5));
        float diff = max(dot(vNormal, lightDir), 0.0);
        float ambient = 0.15;

        // Color variation based on latitude
        float lat = vUv.y;
        vec3 color = mix(planetColor, planetColor2, sin(lat * 3.14159 * 4.0) * 0.5 + 0.5);

        // Atmosphere glow
        if (hasAtmosphere > 0.5) {
            float fresnel = pow(1.0 - abs(dot(vNormal, vec3(0.0, 0.0, 1.0))), 2.0);
            color += vec3(0.3, 0.5, 1.0) * fresnel * 0.4;
        }

        // Apply lighting
        color *= (ambient + diff * 0.85);

        gl_FragColor = vec4(color, 1.0);
    }
`;

// Saturn rings shader
export const ringsVertexShader = `
    varying vec2 vUv;

    void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
`;

export const ringsFragmentShader = `
    varying vec2 vUv;

    void main() {
        vec2 center = vUv - 0.5;
        float dist = length(center) * 2.0;

        // Ring structure
        float ring1 = smoothstep(0.4, 0.42, dist) * smoothstep(0.65, 0.63, dist);
        float ring2 = smoothstep(0.68, 0.7, dist) * smoothstep(0.85, 0.83, dist);
        float ring3 = smoothstep(0.87, 0.88, dist) * smoothstep(0.95, 0.94, dist);

        // Cassini Division
        float cassini = 1.0 - smoothstep(0.62, 0.64, dist) * smoothstep(0.7, 0.68, dist) * 0.8;

        float rings = (ring1 + ring2 * 0.7 + ring3 * 0.5) * cassini;

        // Color variation
        vec3 ringColor = mix(vec3(0.85, 0.75, 0.6), vec3(0.7, 0.65, 0.55), dist);

        // Density variation
        float density = 0.6 + sin(dist * 100.0) * 0.2;

        if (rings < 0.1) discard;

        gl_FragColor = vec4(ringColor, rings * density * 0.8);
    }
`;
