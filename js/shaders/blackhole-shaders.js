// Enhanced Sagittarius A* black hole vertex shader
export const blackHoleVertexShader = `
    varying vec2 vUv;
    varying vec3 vPosition;
    void main() {
        vUv = uv;
        vPosition = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
`;

export const blackHoleFragmentShader = `
    varying vec2 vUv;
    uniform float time;

    #define PI 3.14159265359

    // Noise function for turbulence
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
        vec2 center = vUv - 0.5;
        float dist = length(center);
        float angle = atan(center.y, center.x);

        // Schwarzschild radius (event horizon) - LARGER for dramatic effect
        float rs = 0.12;
        float photonSphereR = rs * 1.5;
        float iscoR = rs * 3.0; // Innermost stable circular orbit

        // Event horizon - ABSOLUTE black with sharp edge
        float eventHorizon = smoothstep(rs, rs * 0.7, dist);

        // Shadow region - the black hole "shadow" is larger than event horizon
        float shadowRadius = rs * 2.6; // Photon capture radius
        float shadow = smoothstep(shadowRadius, rs * 0.9, dist);

        // Thin, bright photon ring at the edge of shadow
        float photonRing = exp(-pow((dist - rs * 1.3) * 40.0, 2.0)) * 2.0;
        // Secondary photon ring (light orbiting multiple times)
        float secondaryRing = exp(-pow((dist - rs * 1.15) * 60.0, 2.0)) * 0.8;

        // Accretion disk with rotation - pushed further out
        float diskAngle = angle + time * 0.25;

        // Disk is viewed at an angle - creates asymmetric appearance
        float viewAngle = 0.3; // Tilt angle
        float diskY = center.y / cos(viewAngle);
        float diskProfile = exp(-pow(diskY / 0.08, 2.0));

        // Disk only exists outside the ISCO
        float diskStart = iscoR * 1.2;
        float diskEnd = rs * 10.0;

        // Spiral arms in the accretion disk
        float spiralArms = sin(diskAngle * 4.0 - dist * 15.0 + time * 1.5) * 0.5 + 0.5;
        float turbulence = fbm(vec2(diskAngle * 3.0, dist * 8.0) + time * 0.3);

        // Disk intensity - concentrated in a ring, not center glow
        float diskIntensity = smoothstep(diskStart, diskStart + 0.05, dist) *
                              smoothstep(diskEnd, diskStart + 0.1, dist) *
                              diskProfile;
        diskIntensity *= (0.5 + spiralArms * 0.3 + turbulence * 0.2);

        // Strong Doppler beaming - approaching side much brighter
        float doppler = 1.0 + 0.6 * sin(diskAngle + PI * 0.5);
        diskIntensity *= doppler;

        // Gravitational lensing - light bends around the black hole
        // Creates the "halo" effect behind the black hole
        float lensingRing = exp(-pow((dist - rs * 2.5) * 15.0, 2.0)) * 0.4;
        lensingRing *= (0.7 + 0.3 * sin(angle * 2.0 + time * 0.5));

        // Color composition - more dramatic contrast
        vec3 photonColor = vec3(1.0, 0.98, 0.95); // Bright white
        vec3 hotDiskColor = vec3(1.0, 0.6, 0.15); // Hot orange
        vec3 warmDiskColor = vec3(1.0, 0.4, 0.1); // Deep orange
        vec3 coolDiskColor = vec3(0.6, 0.2, 0.05); // Dark red-orange

        // Temperature gradient - hotter closer to black hole
        float tempGradient = smoothstep(diskEnd, diskStart, dist);
        vec3 diskColor = mix(coolDiskColor, hotDiskColor, tempGradient);

        // Redshift on receding side
        float redshiftFactor = 0.5 + 0.5 * sin(diskAngle - PI * 0.5);
        diskColor = mix(diskColor, diskColor * vec3(1.0, 0.7, 0.5), redshiftFactor * 0.3);

        // Combine all elements
        vec3 color = vec3(0.0);

        // Gravitational lensing halo (distant background light bent around)
        color += vec3(0.4, 0.5, 0.7) * lensingRing;

        // Accretion disk
        color += diskColor * diskIntensity * 1.8;

        // Bright photon rings at the edge of shadow
        color += photonColor * photonRing;
        color += photonColor * vec3(0.9, 0.95, 1.0) * secondaryRing;

        // Apply shadow/event horizon mask - everything inside is BLACK
        color *= (1.0 - shadow);

        // Very subtle ambient glow from heated gas (NOT in center)
        float ambientGlow = exp(-dist * 2.0) * 0.05 * (1.0 - shadow);
        color += vec3(0.8, 0.4, 0.2) * ambientGlow;

        // Alpha calculation
        float alpha = diskIntensity + photonRing + secondaryRing + lensingRing;
        alpha = max(alpha, shadow); // Shadow is fully opaque
        alpha = clamp(alpha, 0.0, 1.0);

        // Ensure center is absolutely black
        if (dist < rs) {
            color = vec3(0.0);
            alpha = 1.0;
        }

        gl_FragColor = vec4(color, alpha);
    }
`;

// Accretion disk particle shader
export const accretionVertexShader = `
    attribute float size;
    attribute float orbitRadius;
    attribute float orbitSpeed;
    attribute float orbitPhase;
    attribute float particleTemp;

    varying float vTemp;
    varying float vAlpha;

    uniform float time;

    void main() {
        vTemp = particleTemp;

        // Keplerian orbit - closer particles move faster
        float angle = orbitPhase + time * orbitSpeed;

        // Slight vertical oscillation
        float vertOsc = sin(angle * 3.0 + orbitPhase * 5.0) * 0.02 * orbitRadius;

        vec3 pos = vec3(
            cos(angle) * orbitRadius,
            vertOsc,
            sin(angle) * orbitRadius
        );

        vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);

        // Size attenuation
        gl_PointSize = size * (100.0 / -mvPosition.z);
        gl_PointSize = clamp(gl_PointSize, 1.0, 20.0);

        // Fade out at edges
        vAlpha = smoothstep(0.5, 3.0, orbitRadius) * smoothstep(8.0, 5.0, orbitRadius);

        gl_Position = projectionMatrix * mvPosition;
    }
`;

export const accretionFragmentShader = `
    varying float vTemp;
    varying float vAlpha;

    void main() {
        vec2 center = gl_PointCoord - 0.5;
        float dist = length(center);

        // Soft particle
        float intensity = exp(-dist * dist * 8.0);

        // Temperature-based color (black body radiation)
        vec3 hotColor = vec3(1.0, 0.9, 0.7);
        vec3 warmColor = vec3(1.0, 0.6, 0.2);
        vec3 coolColor = vec3(0.8, 0.3, 0.1);

        vec3 color = mix(coolColor, warmColor, vTemp);
        color = mix(color, hotColor, vTemp * vTemp);

        if (intensity < 0.01) discard;

        gl_FragColor = vec4(color * intensity * 2.0, intensity * vAlpha);
    }
`;
