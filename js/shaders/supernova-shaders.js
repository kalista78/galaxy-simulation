// ============================================================
// SUPERNOVA SHADERS - Hyper-realistic stellar explosion
// ============================================================

// ============================================================
// PRE-SUPERNOVA RED SUPERGIANT STAR
// ============================================================
export const supernovaStarVertexShader = `
    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vPosition;

    uniform float time;
    uniform float pulsePhase;
    uniform float collapseProgress;

    void main() {
        vUv = uv;
        vNormal = normalize(normalMatrix * normal);
        vPosition = position;

        // Pulsation effect
        float pulse = sin(time * 2.0 + pulsePhase) * 0.05;
        // Collapse effect - contracts the star
        float collapse = 1.0 - collapseProgress * 0.7;

        vec3 pos = position * (1.0 + pulse) * collapse;

        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
`;

export const supernovaStarFragmentShader = `
    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vPosition;

    uniform float time;
    uniform float collapseProgress;
    uniform float temperature; // 0 = red supergiant, 1 = white hot

    // Noise functions for surface convection
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

        // Spherical UV mapping
        float phi = atan(vPosition.z, vPosition.x);
        float theta = acos(vPosition.y / length(vPosition));
        vec2 sphereUv = vec2(phi / 6.28318 + 0.5, theta / 3.14159);

        // Animated convection cells
        vec2 convectionUv = sphereUv * 8.0;
        convectionUv.x += time * 0.1;
        float convection = fbm(convectionUv + time * 0.05);

        // Granulation pattern
        float granules = fbm(sphereUv * 25.0 + time * 0.02);
        granules = pow(granules, 0.8);

        // Base color - red supergiant
        vec3 coolColor = vec3(1.0, 0.2, 0.05);  // Deep red
        vec3 hotColor = vec3(1.0, 0.6, 0.2);     // Orange-yellow
        vec3 whiteHot = vec3(1.0, 0.95, 0.9);    // White hot
        vec3 blueWhite = vec3(0.8, 0.9, 1.0);    // Blue-white

        // Mix colors based on convection (hot cells rise)
        vec3 baseColor = mix(coolColor, hotColor, convection * 0.7 + granules * 0.3);

        // Temperature increase during collapse
        baseColor = mix(baseColor, whiteHot, temperature * 0.7);
        baseColor = mix(baseColor, blueWhite, max(0.0, temperature - 0.8) * 5.0);

        // Limb darkening
        float viewAngle = dot(normal, vec3(0.0, 0.0, 1.0));
        float limbDarkening = pow(max(viewAngle, 0.0), 0.4);

        // Add bright spots (convection cell peaks)
        float brightSpots = smoothstep(0.6, 0.8, convection);
        baseColor += brightSpots * vec3(0.3, 0.2, 0.1) * (1.0 - temperature);

        // Corona glow at edges
        float corona = pow(1.0 - limbDarkening, 2.0);
        baseColor += corona * vec3(1.0, 0.4, 0.1) * 0.3;

        // Collapse intensification
        float collapseGlow = collapseProgress * 2.0;
        baseColor *= 1.0 + collapseGlow;

        vec3 finalColor = baseColor * (0.6 + limbDarkening * 0.4);

        gl_FragColor = vec4(finalColor, 1.0);
    }
`;

// ============================================================
// SUPERNOVA EXPLOSION SHOCKWAVE
// ============================================================
export const shockwaveVertexShader = `
    varying vec2 vUv;
    varying vec3 vPosition;
    varying vec3 vNormal;

    uniform float explosionProgress;
    uniform float shockwaveRadius;

    void main() {
        vUv = uv;
        vNormal = normalize(normalMatrix * normal);
        vPosition = position;

        // Expand the shockwave
        vec3 pos = position * shockwaveRadius;

        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
`;

export const shockwaveFragmentShader = `
    varying vec2 vUv;
    varying vec3 vPosition;
    varying vec3 vNormal;

    uniform float time;
    uniform float explosionProgress;
    uniform float shockwaveRadius;
    uniform float intensity;

    float hash(vec3 p) {
        p = fract(p * vec3(443.897, 441.423, 437.195));
        p += dot(p, p.yxz + 19.19);
        return fract((p.x + p.y) * p.z);
    }

    void main() {
        vec3 normal = normalize(vNormal);

        // Distance from center
        float dist = length(vPosition) / shockwaveRadius;

        // Shockwave ring effect
        float ringWidth = 0.15;
        float ring = smoothstep(1.0 - ringWidth, 1.0 - ringWidth * 0.5, dist) *
                     smoothstep(1.0, 1.0 - ringWidth * 0.3, dist);

        // Inner glow
        float innerGlow = smoothstep(0.8, 0.0, dist);

        // Turbulence in the shockwave
        float turb = hash(vPosition * 5.0 + time) * 0.3;

        // Color gradient - hot core to cooler edges
        vec3 coreColor = vec3(1.0, 1.0, 0.95);      // White hot center
        vec3 midColor = vec3(1.0, 0.7, 0.3);        // Orange
        vec3 outerColor = vec3(1.0, 0.3, 0.1);      // Red
        vec3 shockColor = vec3(0.5, 0.7, 1.0);      // Blue shock front

        vec3 color = mix(coreColor, midColor, dist);
        color = mix(color, outerColor, smoothstep(0.3, 0.8, dist));
        color = mix(color, shockColor, ring * 0.7);

        // Intensity
        float alpha = (innerGlow * 0.8 + ring * 1.5) * intensity;
        alpha *= (1.0 + turb);

        // Fade at edges
        float edgeFade = 1.0 - smoothstep(0.9, 1.0, dist);
        alpha *= edgeFade;

        // Fresnel for rim lighting on the sphere
        float fresnel = pow(1.0 - max(dot(normal, vec3(0.0, 0.0, 1.0)), 0.0), 2.0);
        color += fresnel * shockColor * 0.5;

        gl_FragColor = vec4(color, alpha);
    }
`;

// ============================================================
// SUPERNOVA DEBRIS/EJECTA PARTICLES
// ============================================================
export const debrisVertexShader = `
    attribute float size;
    attribute vec3 velocity;
    attribute float particleTemp;
    attribute float birthTime;

    varying float vTemp;
    varying float vLife;
    varying float vSize;

    uniform float time;
    uniform float explosionTime;
    uniform float expansionSpeed;

    void main() {
        float age = time - birthTime;
        float life = max(0.0, min(age / 15.0, 1.0));
        vLife = life;
        vTemp = particleTemp * (1.0 - life * 0.5);

        // Expand outward from center
        vec3 pos = position + velocity * age * expansionSpeed;

        // Add some turbulence
        pos += sin(pos * 2.0 + time) * 0.5 * (1.0 - life);

        vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);

        // Size decreases with distance and age
        float distanceFade = 300.0 / length(mvPosition.xyz);
        vSize = size * distanceFade * (1.0 - life * 0.3);

        gl_PointSize = vSize;
        gl_Position = projectionMatrix * mvPosition;
    }
`;

export const debrisFragmentShader = `
    varying float vTemp;
    varying float vLife;
    varying float vSize;

    void main() {
        // Circular particle
        vec2 center = gl_PointCoord - 0.5;
        float dist = length(center) * 2.0;
        if (dist > 1.0) discard;

        // Soft edge
        float alpha = smoothstep(1.0, 0.3, dist);

        // Temperature-based color
        vec3 hotColor = vec3(1.0, 1.0, 0.9);    // White
        vec3 warmColor = vec3(1.0, 0.6, 0.2);   // Orange
        vec3 coolColor = vec3(0.8, 0.2, 0.1);   // Red
        vec3 coldColor = vec3(0.3, 0.1, 0.05);  // Dark red

        vec3 color;
        if (vTemp > 0.7) {
            color = mix(warmColor, hotColor, (vTemp - 0.7) / 0.3);
        } else if (vTemp > 0.4) {
            color = mix(coolColor, warmColor, (vTemp - 0.4) / 0.3);
        } else {
            color = mix(coldColor, coolColor, vTemp / 0.4);
        }

        // Fade with life
        alpha *= 1.0 - vLife * 0.7;

        // Glow effect for hot particles
        if (vTemp > 0.6) {
            alpha *= 1.5;
            color *= 1.3;
        }

        gl_FragColor = vec4(color, alpha);
    }
`;

// ============================================================
// SUPERNOVA REMNANT NEBULA
// ============================================================
export const nebulaVertexShader = `
    varying vec2 vUv;
    varying vec3 vPosition;
    varying vec3 vNormal;

    uniform float expansionProgress;

    void main() {
        vUv = uv;
        vNormal = normalize(normalMatrix * normal);
        vPosition = position;

        vec3 pos = position * expansionProgress;

        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
`;

export const nebulaFragmentShader = `
    varying vec2 vUv;
    varying vec3 vPosition;
    varying vec3 vNormal;

    uniform float time;
    uniform float expansionProgress;
    uniform float nebulaAge;

    float hash(vec3 p) {
        p = fract(p * vec3(443.897, 441.423, 437.195));
        p += dot(p, p.yxz + 19.19);
        return fract((p.x + p.y) * p.z);
    }

    float noise(vec3 p) {
        vec3 i = floor(p);
        vec3 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);

        return mix(
            mix(
                mix(hash(i), hash(i + vec3(1,0,0)), f.x),
                mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x),
                f.y
            ),
            mix(
                mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x),
                mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x),
                f.y
            ),
            f.z
        );
    }

    float fbm(vec3 p) {
        float f = 0.0;
        f += 0.5 * noise(p); p *= 2.01;
        f += 0.25 * noise(p); p *= 2.02;
        f += 0.125 * noise(p); p *= 2.03;
        f += 0.0625 * noise(p);
        return f / 0.9375;
    }

    void main() {
        vec3 normal = normalize(vNormal);
        vec3 pos = vPosition / expansionProgress;

        // Distance from center
        float dist = length(pos);

        // Nebula density using 3D noise
        float density = fbm(pos * 3.0 + time * 0.05);
        density *= fbm(pos * 5.0 - time * 0.03);

        // Shell structure
        float shellDist = abs(dist - 0.7);
        float shell = smoothstep(0.3, 0.0, shellDist);
        density *= shell * 2.0;

        // Filament structures
        float filaments = fbm(pos * 8.0);
        filaments = pow(filaments, 2.0);
        density += filaments * shell * 0.5;

        // Color based on composition (emission nebula colors)
        vec3 hydrogenColor = vec3(0.9, 0.2, 0.3);   // H-alpha red
        vec3 oxygenColor = vec3(0.2, 0.8, 0.6);     // OIII teal
        vec3 sulfurColor = vec3(1.0, 0.4, 0.2);     // SII orange
        vec3 nitrogenColor = vec3(0.8, 0.3, 0.5);   // NII pink

        // Mix colors based on position and noise
        float colorMix = fbm(pos * 4.0 + vec3(time * 0.02, 0.0, 0.0));
        vec3 color = mix(hydrogenColor, oxygenColor, colorMix);
        color = mix(color, sulfurColor, fbm(pos * 6.0) * 0.5);
        color = mix(color, nitrogenColor, filaments * 0.3);

        // Brightness variation
        color *= 0.8 + density * 0.5;

        // Edge glow (limb brightening for nebula)
        float fresnel = pow(1.0 - abs(dot(normal, vec3(0.0, 0.0, 1.0))), 1.5);
        color += fresnel * hydrogenColor * 0.3;

        // Alpha based on density
        float alpha = density * 0.6 * (1.0 - dist * 0.3);
        alpha = clamp(alpha, 0.0, 0.8);

        // Fade in as nebula ages
        alpha *= smoothstep(0.0, 0.3, nebulaAge);

        gl_FragColor = vec4(color, alpha);
    }
`;

// ============================================================
// PULSAR / NEUTRON STAR (Spinning beams)
// ============================================================
export const pulsarVertexShader = `
    varying vec2 vUv;
    varying vec3 vPosition;

    void main() {
        vUv = uv;
        vPosition = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
`;

export const pulsarFragmentShader = `
    varying vec2 vUv;
    varying vec3 vPosition;

    uniform float time;
    uniform float pulsePhase;
    uniform float beamIntensity;

    void main() {
        vec2 center = vUv - 0.5;
        float dist = length(center);
        float angle = atan(center.y, center.x);

        // Spinning beam
        float beamAngle = time * 10.0; // Fast rotation
        float beam1 = smoothstep(0.15, 0.0, abs(mod(angle - beamAngle + 3.14159, 6.28318) - 3.14159));
        float beam2 = smoothstep(0.15, 0.0, abs(mod(angle - beamAngle + 6.28318, 6.28318) - 3.14159));

        // Beam shape - narrower at center, wider at edges
        float beamShape = smoothstep(0.0, 0.4, dist) * smoothstep(0.6, 0.2, dist);
        float beam = (beam1 + beam2) * beamShape * beamIntensity;

        // Central neutron star glow
        float coreGlow = smoothstep(0.15, 0.0, dist);
        float corePulse = 0.8 + 0.2 * sin(time * 30.0); // Rapid pulsation
        coreGlow *= corePulse;

        // Magnetosphere glow
        float magnetosphere = smoothstep(0.5, 0.1, dist) * 0.3;

        // Colors
        vec3 beamColor = vec3(0.5, 0.8, 1.0);      // Blue-white beam
        vec3 coreColor = vec3(0.9, 0.95, 1.0);     // White-blue core
        vec3 magnetoColor = vec3(0.3, 0.5, 0.8);   // Blue magnetosphere

        vec3 color = beamColor * beam;
        color += coreColor * coreGlow;
        color += magnetoColor * magnetosphere;

        float alpha = beam * 0.8 + coreGlow + magnetosphere;

        gl_FragColor = vec4(color, alpha);
    }
`;

// ============================================================
// EXPLOSION FLASH (Screen-filling bright flash)
// ============================================================
export const flashVertexShader = `
    varying vec2 vUv;

    void main() {
        vUv = uv;
        gl_Position = vec4(position.xy, 0.0, 1.0);
    }
`;

export const flashFragmentShader = `
    varying vec2 vUv;

    uniform float flashIntensity;
    uniform float time;

    void main() {
        vec2 center = vUv - 0.5;
        float dist = length(center);

        // Radial gradient from center
        float gradient = 1.0 - dist * 1.5;
        gradient = max(gradient, 0.0);

        // Flash color - starts white, fades to warm
        vec3 whiteFlash = vec3(1.0, 1.0, 1.0);
        vec3 warmFlash = vec3(1.0, 0.9, 0.7);
        vec3 color = mix(warmFlash, whiteFlash, flashIntensity);

        float alpha = gradient * flashIntensity;

        gl_FragColor = vec4(color, alpha);
    }
`;

// ============================================================
// CORONA / STELLAR ATMOSPHERE
// ============================================================
export const coronaVertexShader = `
    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vPosition;

    uniform float scale;

    void main() {
        vUv = uv;
        vNormal = normalize(normalMatrix * normal);
        vPosition = position;

        vec3 pos = position * scale;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
`;

export const coronaFragmentShader = `
    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vPosition;

    uniform float time;
    uniform float intensity;
    uniform vec3 coronaColor;

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

    void main() {
        vec3 normal = normalize(vNormal);

        // Fresnel for edge glow
        float fresnel = pow(1.0 - max(dot(normal, vec3(0.0, 0.0, 1.0)), 0.0), 2.0);

        // Spherical coordinates for noise
        float phi = atan(vPosition.z, vPosition.x);
        float theta = acos(vPosition.y / length(vPosition));
        vec2 sphereUv = vec2(phi / 6.28318 + 0.5, theta / 3.14159);

        // Animated corona wisps
        float wisps = noise(sphereUv * 6.0 + time * 0.2);
        wisps += noise(sphereUv * 12.0 - time * 0.15) * 0.5;

        // Prominence-like structures
        float prominences = pow(noise(sphereUv * 3.0 + time * 0.05), 3.0);

        vec3 color = coronaColor;
        color *= 1.0 + wisps * 0.5 + prominences * 0.3;

        float alpha = fresnel * intensity * (0.5 + wisps * 0.3);
        alpha = clamp(alpha, 0.0, 0.9);

        gl_FragColor = vec4(color, alpha);
    }
`;
