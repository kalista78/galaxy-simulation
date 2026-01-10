/**
 * Planet Texture Shaders
 * High-quality shaders for texture-mapped planets
 */

// ============================================================================
// TEXTURED PLANET - With albedo and optional night map
// ============================================================================

export const texturedPlanetVertexShader = `
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vPosition;
varying vec3 vWorldNormal;

void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    vPosition = position;
    vWorldNormal = normalize((modelMatrix * vec4(normal, 0.0)).xyz);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const texturedPlanetFragmentShader = `
uniform sampler2D albedoMap;
uniform sampler2D nightMap;
uniform float hasNightMap;
uniform vec3 sunDirection;
uniform float time;
uniform vec3 planetColor;
uniform float hasBands;
uniform float hasStorm;

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vPosition;
varying vec3 vWorldNormal;

// Simple noise for gas giant bands
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
    float sum = 0.0;
    float amp = 0.5;
    for(int i = 0; i < 4; i++) {
        sum += amp * noise(p);
        p *= 2.0;
        amp *= 0.5;
    }
    return sum;
}

void main() {
    // Sample albedo texture
    vec4 albedo = texture2D(albedoMap, vUv);

    // Calculate lighting
    float NdotL = dot(vWorldNormal, sunDirection);
    float dayFactor = smoothstep(-0.1, 0.2, NdotL);

    // Ambient light
    vec3 ambient = albedo.rgb * 0.15;

    // Diffuse lighting
    float diffuse = max(0.0, NdotL);
    vec3 dayColor = albedo.rgb * (0.3 + 0.7 * diffuse);

    // Night side (if night map available)
    vec3 nightColor = ambient;
    if (hasNightMap > 0.5) {
        vec4 night = texture2D(nightMap, vUv);
        // City lights are emissive
        nightColor = ambient + night.rgb * (1.0 - dayFactor) * 1.5;
    }

    // Blend day and night
    vec3 finalColor = mix(nightColor, dayColor, dayFactor);

    // Add gas giant band animation if applicable
    if (hasBands > 0.5) {
        float latitude = vUv.y;
        float bandNoise = fbm(vec2(vUv.x * 20.0 + time * 0.01, latitude * 15.0));
        float bands = sin(latitude * 30.0 + bandNoise * 2.0) * 0.1;
        finalColor += vec3(bands) * 0.3;
    }

    // Add storm (Great Red Spot style) if applicable
    if (hasStorm > 0.5) {
        vec2 stormCenter = vec2(0.3, 0.6); // Position on planet
        float dist = distance(vUv, stormCenter);
        float stormRadius = 0.08;
        if (dist < stormRadius) {
            // Swirl pattern
            float angle = atan(vUv.y - stormCenter.y, vUv.x - stormCenter.x);
            float swirl = sin(angle * 5.0 + time * 0.5 - dist * 20.0) * 0.5 + 0.5;
            float stormIntensity = smoothstep(stormRadius, 0.0, dist);
            finalColor = mix(finalColor, vec3(0.9, 0.4, 0.2), stormIntensity * 0.6 * swirl);
        }
    }

    // Limb darkening for realism
    float viewAngle = dot(vNormal, vec3(0.0, 0.0, 1.0));
    float limb = pow(max(viewAngle, 0.0), 0.3);
    finalColor *= 0.7 + 0.3 * limb;

    gl_FragColor = vec4(finalColor, 1.0);
}
`;

// ============================================================================
// PROCEDURAL PLANET - Fallback when no texture available
// ============================================================================

export const proceduralPlanetVertexShader = `
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vPosition;
varying vec3 vWorldNormal;

void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    vPosition = position;
    vWorldNormal = normalize((modelMatrix * vec4(normal, 0.0)).xyz);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const proceduralPlanetFragmentShader = `
uniform float time;
uniform vec3 sunDirection;
uniform vec3 planetColor1;
uniform vec3 planetColor2;
uniform float planetType; // 0 = rocky, 1 = gas, 2 = ice
uniform float hasBands;
uniform float hasStorm;

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vPosition;
varying vec3 vWorldNormal;

// Noise functions
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

float fbm(vec2 p, int octaves) {
    float sum = 0.0;
    float amp = 0.5;
    for(int i = 0; i < 6; i++) {
        if(i >= octaves) break;
        sum += amp * noise(p);
        p *= 2.0;
        amp *= 0.5;
    }
    return sum;
}

void main() {
    // Calculate spherical coordinates
    float phi = atan(vPosition.z, vPosition.x);
    float theta = acos(vPosition.y / length(vPosition));
    vec2 sphereUv = vec2(phi / 6.28318 + 0.5, theta / 3.14159);

    vec3 baseColor;

    if (planetType < 0.5) {
        // Rocky planet - terrain-like
        float terrain = fbm(sphereUv * 10.0, 5);
        float craters = fbm(sphereUv * 30.0 + 100.0, 3);
        baseColor = mix(planetColor1, planetColor2, terrain);
        // Add crater shadows
        baseColor *= 0.8 + 0.2 * craters;
    } else if (planetType < 1.5) {
        // Gas giant - bands and storms
        float latitude = sphereUv.y;
        float bandNoise = fbm(vec2(sphereUv.x * 15.0 + time * 0.02, latitude * 8.0), 4);
        float bands = sin(latitude * 25.0 + bandNoise * 3.0) * 0.5 + 0.5;
        baseColor = mix(planetColor1, planetColor2, bands);

        // Add turbulence
        float turb = fbm(sphereUv * 20.0 + time * 0.01, 3);
        baseColor += vec3(turb * 0.1);
    } else {
        // Ice giant - subtle banding
        float latitude = sphereUv.y;
        float subtle = fbm(vec2(sphereUv.x * 8.0, latitude * 4.0), 3);
        baseColor = mix(planetColor1, planetColor2, subtle * 0.3 + 0.5);
    }

    // Add storm if applicable
    if (hasStorm > 0.5) {
        vec2 stormCenter = vec2(0.35, 0.55);
        float dist = distance(sphereUv, stormCenter);
        float stormRadius = 0.06;
        if (dist < stormRadius) {
            float angle = atan(sphereUv.y - stormCenter.y, sphereUv.x - stormCenter.x);
            float swirl = sin(angle * 6.0 + time * 0.3 - dist * 25.0) * 0.5 + 0.5;
            float intensity = smoothstep(stormRadius, 0.0, dist);
            vec3 stormColor = planetType < 1.5 ? vec3(0.9, 0.4, 0.2) : vec3(0.3, 0.3, 0.5);
            baseColor = mix(baseColor, stormColor, intensity * 0.5 * swirl);
        }
    }

    // Lighting
    float NdotL = dot(vWorldNormal, sunDirection);
    float diffuse = max(0.0, NdotL);
    vec3 ambient = baseColor * 0.2;
    vec3 litColor = ambient + baseColor * diffuse * 0.8;

    // Limb darkening
    float viewAngle = dot(vNormal, vec3(0.0, 0.0, 1.0));
    float limb = pow(max(viewAngle, 0.0), 0.4);
    litColor *= 0.7 + 0.3 * limb;

    gl_FragColor = vec4(litColor, 1.0);
}
`;

// ============================================================================
// ATMOSPHERE - Fresnel-based glow
// ============================================================================

export const atmosphereVertexShader = `
varying vec3 vNormal;
varying vec3 vPosition;
varying vec3 vWorldPosition;

void main() {
    vNormal = normalize(normalMatrix * normal);
    vPosition = position;
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPos.xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const atmosphereFragmentShader = `
uniform vec3 atmosphereColor;
uniform float density;
uniform vec3 sunDirection;

varying vec3 vNormal;
varying vec3 vPosition;
varying vec3 vWorldPosition;

void main() {
    vec3 viewDir = normalize(cameraPosition - vWorldPosition);
    float fresnel = pow(1.0 - abs(dot(vNormal, viewDir)), 3.0);

    // Sun-facing side is brighter
    float sunFacing = dot(normalize(vWorldPosition), sunDirection);
    float sunGlow = smoothstep(-0.5, 0.5, sunFacing) * 0.5 + 0.5;

    vec3 finalColor = atmosphereColor * fresnel * sunGlow;
    float alpha = fresnel * density * sunGlow;

    gl_FragColor = vec4(finalColor, alpha);
}
`;

// ============================================================================
// CLOUDS - Earth cloud layer
// ============================================================================

export const cloudVertexShader = `
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vWorldNormal;

void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    vWorldNormal = normalize((modelMatrix * vec4(normal, 0.0)).xyz);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const cloudFragmentShader = `
uniform sampler2D cloudMap;
uniform vec3 sunDirection;
uniform float time;

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vWorldNormal;

void main() {
    // Animate cloud UV slowly
    vec2 animatedUv = vUv;
    animatedUv.x += time * 0.001; // Slow drift

    vec4 cloudTex = texture2D(cloudMap, animatedUv);

    // Lighting
    float NdotL = dot(vWorldNormal, sunDirection);
    float diffuse = max(0.2, NdotL * 0.5 + 0.5);

    vec3 cloudColor = vec3(1.0) * diffuse;
    float alpha = cloudTex.r * 0.7; // Use red channel as alpha

    gl_FragColor = vec4(cloudColor, alpha);
}
`;

// ============================================================================
// RINGS - Saturn-style ring system
// ============================================================================

export const ringVertexShader = `
varying vec2 vUv;
varying vec3 vPosition;
varying vec3 vWorldPosition;

void main() {
    vUv = uv;
    vPosition = position;
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPos.xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const ringFragmentShader = `
uniform sampler2D ringMap;
uniform float hasRingMap;
uniform vec3 ringColor;
uniform vec3 sunDirection;
uniform float planetRadius;
uniform float innerRadius;
uniform float outerRadius;

varying vec2 vUv;
varying vec3 vPosition;
varying vec3 vWorldPosition;

void main() {
    // Calculate distance from center for ring position
    float dist = length(vPosition.xy);
    float ringPos = (dist - innerRadius) / (outerRadius - innerRadius);

    vec3 finalColor;
    float alpha;

    if (hasRingMap > 0.5) {
        // Use ring texture
        vec4 ringTex = texture2D(ringMap, vec2(ringPos, 0.5));
        finalColor = ringTex.rgb;
        alpha = ringTex.a;
    } else {
        // Procedural rings
        // Create multiple ring bands
        float band1 = smoothstep(0.0, 0.1, ringPos) * smoothstep(0.35, 0.25, ringPos); // C ring
        float band2 = smoothstep(0.35, 0.4, ringPos) * smoothstep(0.7, 0.65, ringPos);  // B ring
        float band3 = smoothstep(0.75, 0.8, ringPos) * smoothstep(1.0, 0.95, ringPos);  // A ring

        // Cassini Division (gap between A and B rings)
        float cassini = 1.0 - smoothstep(0.68, 0.7, ringPos) * smoothstep(0.77, 0.75, ringPos);

        float density = (band1 * 0.4 + band2 * 0.9 + band3 * 0.7) * cassini;

        // Add fine structure variation
        float fineStructure = sin(ringPos * 200.0) * 0.1 + 0.9;
        density *= fineStructure;

        finalColor = ringColor;
        alpha = density * 0.8;
    }

    // Check for planet shadow
    vec3 toSun = normalize(sunDirection);
    vec3 ringWorldPos = vWorldPosition;

    // Simple shadow calculation
    float shadowCheck = dot(normalize(ringWorldPos), toSun);
    if (shadowCheck < 0.0 && length(ringWorldPos.xz) < planetRadius * 1.1) {
        alpha *= 0.3; // In shadow
    }

    // Lighting
    float lightFactor = 0.5 + 0.5 * max(0.0, dot(vec3(0.0, 1.0, 0.0), sunDirection));
    finalColor *= lightFactor;

    gl_FragColor = vec4(finalColor, alpha);
}
`;

// ============================================================================
// SUN - Animated solar surface
// ============================================================================

export const sunVertexShader = `
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vPosition;

void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    vPosition = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const sunFragmentShader = `
uniform sampler2D albedoMap;
uniform float time;

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vPosition;

// Noise for surface animation
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
    float sum = 0.0;
    float amp = 0.5;
    for(int i = 0; i < 4; i++) {
        sum += amp * noise(p);
        p *= 2.0;
        amp *= 0.5;
    }
    return sum;
}

void main() {
    // Sample sun texture
    vec4 sunTex = texture2D(albedoMap, vUv);

    // Animate surface with noise
    vec2 animUv = vUv + time * 0.005;
    float turbulence = fbm(animUv * 8.0) * 0.2;

    // Base solar color
    vec3 baseColor = sunTex.rgb;

    // Add animated brightness variation (granulation)
    float granulation = fbm(vUv * 30.0 + time * 0.02);
    baseColor += vec3(0.2, 0.1, 0.0) * granulation;

    // Add sunspots (darker regions)
    float spots = fbm(vUv * 5.0 + time * 0.001);
    if (spots < 0.3) {
        baseColor *= 0.7 + spots;
    }

    // Limb darkening
    float viewAngle = dot(vNormal, vec3(0.0, 0.0, 1.0));
    float limb = pow(max(viewAngle, 0.0), 0.4);
    baseColor *= 0.6 + 0.4 * limb;

    // Emissive glow
    baseColor *= 1.5;

    gl_FragColor = vec4(baseColor, 1.0);
}
`;

// ============================================================================
// SUN CORONA - Glow effect around the sun
// ============================================================================

export const sunCoronaVertexShader = `
varying vec3 vNormal;
varying vec3 vPosition;

void main() {
    vNormal = normalize(normalMatrix * normal);
    vPosition = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const sunCoronaFragmentShader = `
uniform float time;

varying vec3 vNormal;
varying vec3 vPosition;

void main() {
    float viewAngle = dot(vNormal, vec3(0.0, 0.0, 1.0));
    float fresnel = pow(1.0 - abs(viewAngle), 2.0);

    // Corona color gradient (orange to yellow)
    vec3 innerColor = vec3(1.0, 0.8, 0.3);
    vec3 outerColor = vec3(1.0, 0.4, 0.1);
    vec3 coronaColor = mix(innerColor, outerColor, fresnel);

    // Animated intensity
    float pulse = sin(time * 0.5) * 0.1 + 0.9;

    float alpha = fresnel * 0.6 * pulse;

    gl_FragColor = vec4(coronaColor, alpha);
}
`;
