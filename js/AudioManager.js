// ============================================================
// AUDIO MANAGER - Immersive Galaxy Soundscape
// ============================================================
// Procedural audio using Web Audio API
// Mix of relaxing ambient base + epic dramatic moments

export class AudioManager {
    constructor() {
        this.audioContext = null;
        this.masterGain = null;
        this.isEnabled = false;
        this.isInitialized = false;

        // Audio layers
        this.layers = {
            drone: null,      // Deep space drone (40-80Hz)
            pad: null,        // Cosmic pad (200-800Hz)
            shimmer: null,    // Star shimmer (2000-8000Hz)
            blackHole: null,  // Black hole bass (20-50Hz)
            whoosh: null,     // Movement whoosh
            swell: null       // Dramatic swell
        };

        // Layer gains for mixing
        this.layerGains = {};

        // State tracking
        this.currentSequence = null;
        this.cameraVelocity = 0;
        this.distanceToCenter = 0;

        // Volume settings
        this.masterVolume = 0.7;
    }

    // Initialize audio context (must be called after user interaction)
    async init() {
        if (this.isInitialized) return;

        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();

            // Master gain
            this.masterGain = this.audioContext.createGain();
            this.masterGain.gain.value = 0;
            this.masterGain.connect(this.audioContext.destination);

            // Create all layers
            this.createDroneLayer();
            this.createPadLayer();
            this.createShimmerLayer();
            this.createBlackHoleLayer();
            this.createWhooshLayer();
            this.createSwellLayer();

            this.isInitialized = true;
            console.log('AudioManager initialized');
        } catch (e) {
            console.error('Failed to initialize audio:', e);
        }
    }

    // ============================================================
    // BASE AMBIENT LAYERS (Always On)
    // ============================================================

    createDroneLayer() {
        // Deep space drone - low frequency rumble (40-80Hz)
        const oscillator1 = this.audioContext.createOscillator();
        const oscillator2 = this.audioContext.createOscillator();
        const oscillator3 = this.audioContext.createOscillator();

        oscillator1.type = 'sine';
        oscillator1.frequency.value = 45;

        oscillator2.type = 'sine';
        oscillator2.frequency.value = 60;

        oscillator3.type = 'triangle';
        oscillator3.frequency.value = 75;

        // Create gain for this layer
        const layerGain = this.audioContext.createGain();
        layerGain.gain.value = 0.15;

        // Add slow LFO for breathing effect
        const lfo = this.audioContext.createOscillator();
        const lfoGain = this.audioContext.createGain();
        lfo.type = 'sine';
        lfo.frequency.value = 0.08; // Very slow breathing
        lfoGain.gain.value = 0.03;

        lfo.connect(lfoGain);
        lfoGain.connect(layerGain.gain);

        // Low-pass filter for warmth
        const filter = this.audioContext.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 120;
        filter.Q.value = 0.7;

        oscillator1.connect(filter);
        oscillator2.connect(filter);
        oscillator3.connect(filter);
        filter.connect(layerGain);
        layerGain.connect(this.masterGain);

        oscillator1.start();
        oscillator2.start();
        oscillator3.start();
        lfo.start();

        this.layers.drone = { oscillators: [oscillator1, oscillator2, oscillator3], lfo, filter };
        this.layerGains.drone = layerGain;
    }

    createPadLayer() {
        // Cosmic pad - ethereal sustained tones (200-800Hz)
        const baseFreq = 220; // A3
        const oscillators = [];

        // Create multiple detuned oscillators for rich pad sound
        const detunes = [-12, -5, 0, 7, 12, 19]; // Minor chord with extensions

        const layerGain = this.audioContext.createGain();
        layerGain.gain.value = 0.08;

        // Reverb-like effect using delay
        const delay1 = this.audioContext.createDelay();
        const delay2 = this.audioContext.createDelay();
        const delayGain1 = this.audioContext.createGain();
        const delayGain2 = this.audioContext.createGain();

        delay1.delayTime.value = 0.3;
        delay2.delayTime.value = 0.5;
        delayGain1.gain.value = 0.3;
        delayGain2.gain.value = 0.2;

        // Filter for warmth
        const filter = this.audioContext.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 800;
        filter.Q.value = 0.5;

        detunes.forEach((detune, i) => {
            const osc = this.audioContext.createOscillator();
            osc.type = i % 2 === 0 ? 'sine' : 'triangle';
            osc.frequency.value = baseFreq * Math.pow(2, detune / 12);

            // Add slight detuning for chorus effect
            const oscGain = this.audioContext.createGain();
            oscGain.gain.value = 0.15;

            osc.connect(oscGain);
            oscGain.connect(filter);
            osc.start();
            oscillators.push(osc);
        });

        filter.connect(layerGain);
        filter.connect(delay1);
        delay1.connect(delayGain1);
        delayGain1.connect(layerGain);
        delay1.connect(delay2);
        delay2.connect(delayGain2);
        delayGain2.connect(layerGain);

        layerGain.connect(this.masterGain);

        // Slow modulation of filter frequency
        const lfo = this.audioContext.createOscillator();
        const lfoGain = this.audioContext.createGain();
        lfo.type = 'sine';
        lfo.frequency.value = 0.05;
        lfoGain.gain.value = 200;
        lfo.connect(lfoGain);
        lfoGain.connect(filter.frequency);
        lfo.start();

        this.layers.pad = { oscillators, lfo, filter };
        this.layerGains.pad = layerGain;
    }

    createShimmerLayer() {
        // Star shimmer - high frequency sparkles (2000-8000Hz)
        // Uses filtered noise + resonant filters

        const bufferSize = this.audioContext.sampleRate * 2;
        const noiseBuffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
        const output = noiseBuffer.getChannelData(0);

        for (let i = 0; i < bufferSize; i++) {
            output[i] = Math.random() * 2 - 1;
        }

        const noise = this.audioContext.createBufferSource();
        noise.buffer = noiseBuffer;
        noise.loop = true;

        // High-pass filter
        const highPass = this.audioContext.createBiquadFilter();
        highPass.type = 'highpass';
        highPass.frequency.value = 3000;
        highPass.Q.value = 0.5;

        // Resonant filter for bell-like tones
        const resonant = this.audioContext.createBiquadFilter();
        resonant.type = 'bandpass';
        resonant.frequency.value = 5000;
        resonant.Q.value = 15;

        // Modulate resonant frequency
        const lfo = this.audioContext.createOscillator();
        const lfoGain = this.audioContext.createGain();
        lfo.type = 'sine';
        lfo.frequency.value = 0.3;
        lfoGain.gain.value = 2000;
        lfo.connect(lfoGain);
        lfoGain.connect(resonant.frequency);

        const layerGain = this.audioContext.createGain();
        layerGain.gain.value = 0.02;

        noise.connect(highPass);
        highPass.connect(resonant);
        resonant.connect(layerGain);
        layerGain.connect(this.masterGain);

        noise.start();
        lfo.start();

        this.layers.shimmer = { noise, lfo, highPass, resonant };
        this.layerGains.shimmer = layerGain;
    }

    // ============================================================
    // EPIC/DRAMATIC LAYERS (Triggered During Action)
    // ============================================================

    createBlackHoleLayer() {
        // Black hole bass - ultra-low rumble (20-50Hz)
        const oscillator1 = this.audioContext.createOscillator();
        const oscillator2 = this.audioContext.createOscillator();

        oscillator1.type = 'sine';
        oscillator1.frequency.value = 28;

        oscillator2.type = 'sine';
        oscillator2.frequency.value = 42;

        // Distortion for intensity when close
        const distortion = this.audioContext.createWaveShaper();
        distortion.curve = this.makeDistortionCurve(50);
        distortion.oversample = '4x';

        // Low-pass filter
        const filter = this.audioContext.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 80;
        filter.Q.value = 1;

        // Very slow LFO for ominous pulsing
        const lfo = this.audioContext.createOscillator();
        const lfoGain = this.audioContext.createGain();
        lfo.type = 'sine';
        lfo.frequency.value = 0.15;
        lfoGain.gain.value = 10;
        lfo.connect(lfoGain);
        lfoGain.connect(oscillator1.frequency);

        const layerGain = this.audioContext.createGain();
        layerGain.gain.value = 0; // Start silent

        oscillator1.connect(filter);
        oscillator2.connect(filter);
        filter.connect(distortion);
        distortion.connect(layerGain);
        layerGain.connect(this.masterGain);

        oscillator1.start();
        oscillator2.start();
        lfo.start();

        this.layers.blackHole = { oscillators: [oscillator1, oscillator2], lfo, filter, distortion };
        this.layerGains.blackHole = layerGain;
    }

    createWhooshLayer() {
        // Movement whoosh - filtered noise tied to velocity
        const bufferSize = this.audioContext.sampleRate * 2;
        const noiseBuffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
        const output = noiseBuffer.getChannelData(0);

        // Pink noise approximation
        let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
        for (let i = 0; i < bufferSize; i++) {
            const white = Math.random() * 2 - 1;
            b0 = 0.99886 * b0 + white * 0.0555179;
            b1 = 0.99332 * b1 + white * 0.0750759;
            b2 = 0.96900 * b2 + white * 0.1538520;
            b3 = 0.86650 * b3 + white * 0.3104856;
            b4 = 0.55000 * b4 + white * 0.5329522;
            b5 = -0.7616 * b5 - white * 0.0168980;
            output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
            b6 = white * 0.115926;
        }

        const noise = this.audioContext.createBufferSource();
        noise.buffer = noiseBuffer;
        noise.loop = true;

        // Band-pass filter for wind sound
        const filter = this.audioContext.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 800;
        filter.Q.value = 0.8;

        // High-pass to remove rumble
        const highPass = this.audioContext.createBiquadFilter();
        highPass.type = 'highpass';
        highPass.frequency.value = 200;

        const layerGain = this.audioContext.createGain();
        layerGain.gain.value = 0; // Start silent

        noise.connect(filter);
        filter.connect(highPass);
        highPass.connect(layerGain);
        layerGain.connect(this.masterGain);

        noise.start();

        this.layers.whoosh = { noise, filter, highPass };
        this.layerGains.whoosh = layerGain;
    }

    createSwellLayer() {
        // Dramatic swell - rising chord pad for epic moments
        const baseFreq = 110; // A2
        const oscillators = [];

        // Major chord with octave
        const intervals = [0, 7, 12, 16, 19, 24];

        const layerGain = this.audioContext.createGain();
        layerGain.gain.value = 0; // Start silent

        // Filter
        const filter = this.audioContext.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 400;
        filter.Q.value = 1;

        intervals.forEach((interval, i) => {
            const osc = this.audioContext.createOscillator();
            osc.type = 'sawtooth';
            osc.frequency.value = baseFreq * Math.pow(2, interval / 12);

            const oscGain = this.audioContext.createGain();
            oscGain.gain.value = 0.08;

            osc.connect(oscGain);
            oscGain.connect(filter);
            osc.start();
            oscillators.push(osc);
        });

        filter.connect(layerGain);
        layerGain.connect(this.masterGain);

        this.layers.swell = { oscillators, filter };
        this.layerGains.swell = layerGain;
    }

    // ============================================================
    // UTILITY FUNCTIONS
    // ============================================================

    makeDistortionCurve(amount) {
        const k = typeof amount === 'number' ? amount : 50;
        const n_samples = 44100;
        const curve = new Float32Array(n_samples);
        const deg = Math.PI / 180;

        for (let i = 0; i < n_samples; ++i) {
            const x = i * 2 / n_samples - 1;
            curve[i] = (3 + k) * x * 20 * deg / (Math.PI + k * Math.abs(x));
        }
        return curve;
    }

    // ============================================================
    // PUBLIC METHODS
    // ============================================================

    async enable() {
        if (!this.isInitialized) {
            await this.init();
        }

        if (this.audioContext.state === 'suspended') {
            await this.audioContext.resume();
        }

        this.isEnabled = true;

        // Fade in master volume
        this.masterGain.gain.cancelScheduledValues(this.audioContext.currentTime);
        this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, this.audioContext.currentTime);
        this.masterGain.gain.linearRampToValueAtTime(this.masterVolume, this.audioContext.currentTime + 2);

        console.log('Audio enabled');
    }

    disable() {
        if (!this.isInitialized || !this.isEnabled) return;

        this.isEnabled = false;

        // Fade out master volume
        this.masterGain.gain.cancelScheduledValues(this.audioContext.currentTime);
        this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, this.audioContext.currentTime);
        this.masterGain.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + 1);

        console.log('Audio disabled');
    }

    setVolume(value) {
        this.masterVolume = Math.max(0, Math.min(1, value));
        if (this.isEnabled && this.masterGain) {
            this.masterGain.gain.cancelScheduledValues(this.audioContext.currentTime);
            this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, this.audioContext.currentTime);
            this.masterGain.gain.linearRampToValueAtTime(this.masterVolume, this.audioContext.currentTime + 0.1);
        }
    }

    // Update audio based on simulation state
    update(cameraPosition, cameraVelocity, tourSequence = null, deltaTime = 0.016) {
        if (!this.isEnabled || !this.isInitialized) return;

        const time = this.audioContext.currentTime;

        // Calculate distance to galactic center
        this.distanceToCenter = Math.sqrt(
            cameraPosition.x * cameraPosition.x +
            cameraPosition.z * cameraPosition.z
        );

        this.cameraVelocity = cameraVelocity;
        this.currentSequence = tourSequence;

        // ============================================================
        // Update Black Hole Bass (proximity-based)
        // ============================================================
        const blackHoleIntensity = Math.max(0, 1 - this.distanceToCenter / 100);
        const blackHoleTarget = blackHoleIntensity * 0.4;
        this.smoothGain(this.layerGains.blackHole, blackHoleTarget, 0.5);

        // Increase distortion when close
        if (this.layers.blackHole && this.layers.blackHole.distortion) {
            const distAmount = 50 + blackHoleIntensity * 150;
            this.layers.blackHole.distortion.curve = this.makeDistortionCurve(distAmount);
        }

        // ============================================================
        // Update Whoosh (velocity-based)
        // ============================================================
        const whooshIntensity = Math.min(1, cameraVelocity / 5);
        const whooshTarget = whooshIntensity * 0.15;
        this.smoothGain(this.layerGains.whoosh, whooshTarget, 0.3);

        // Adjust whoosh filter based on velocity
        if (this.layers.whoosh && this.layers.whoosh.filter) {
            const targetFreq = 400 + whooshIntensity * 1500;
            this.layers.whoosh.filter.frequency.setTargetAtTime(targetFreq, time, 0.1);
        }

        // ============================================================
        // Update Shimmer (moderate in dense areas)
        // ============================================================
        // More shimmer when in the disk (not too high, not too low)
        const heightFactor = 1 - Math.min(1, Math.abs(cameraPosition.y) / 150);
        const diskFactor = Math.max(0, 1 - this.distanceToCenter / 200);
        const shimmerTarget = 0.02 + heightFactor * diskFactor * 0.04;
        this.smoothGain(this.layerGains.shimmer, shimmerTarget, 1);

        // ============================================================
        // Update Dramatic Swell (sequence-based)
        // ============================================================
        let swellTarget = 0;
        if (tourSequence) {
            // Swell during core approach and pull-back reveal
            if (tourSequence === 'core_approach' || tourSequence === 'pullback_reveal') {
                swellTarget = 0.12;
            } else if (tourSequence === 'black_hole_tease') {
                swellTarget = 0.08;
            }
        }
        this.smoothGain(this.layerGains.swell, swellTarget, 2);

        // Adjust swell filter for rising effect
        if (this.layers.swell && this.layers.swell.filter && swellTarget > 0) {
            const currentFilter = this.layers.swell.filter.frequency.value;
            const targetFilter = 400 + swellTarget * 3000;
            this.layers.swell.filter.frequency.setTargetAtTime(targetFilter, time, 1);
        }
    }

    smoothGain(gainNode, targetValue, smoothTime) {
        if (!gainNode) return;
        const time = this.audioContext.currentTime;
        gainNode.gain.setTargetAtTime(targetValue, time, smoothTime);
    }

    // Set tour sequence for dramatic effects
    setTourSequence(sequenceName) {
        this.currentSequence = sequenceName;
    }

    // ============================================================
    // SUPERNOVA AUDIO EFFECTS
    // ============================================================

    createSupernovaLayers() {
        if (this.supernovaLayers) return; // Already created

        this.supernovaLayers = {};

        // Deep rumble for building tension
        const rumbleOsc1 = this.audioContext.createOscillator();
        const rumbleOsc2 = this.audioContext.createOscillator();
        rumbleOsc1.type = 'sine';
        rumbleOsc1.frequency.value = 30;
        rumbleOsc2.type = 'sine';
        rumbleOsc2.frequency.value = 45;

        const rumbleGain = this.audioContext.createGain();
        rumbleGain.gain.value = 0;

        const rumbleFilter = this.audioContext.createBiquadFilter();
        rumbleFilter.type = 'lowpass';
        rumbleFilter.frequency.value = 100;

        rumbleOsc1.connect(rumbleFilter);
        rumbleOsc2.connect(rumbleFilter);
        rumbleFilter.connect(rumbleGain);
        rumbleGain.connect(this.masterGain);

        rumbleOsc1.start();
        rumbleOsc2.start();

        this.supernovaLayers.rumble = { osc1: rumbleOsc1, osc2: rumbleOsc2, gain: rumbleGain, filter: rumbleFilter };

        // Explosion burst - white noise with envelope
        const burstBuffer = this.audioContext.createBuffer(1, this.audioContext.sampleRate * 3, this.audioContext.sampleRate);
        const burstData = burstBuffer.getChannelData(0);
        for (let i = 0; i < burstData.length; i++) {
            burstData[i] = Math.random() * 2 - 1;
        }

        const burstGain = this.audioContext.createGain();
        burstGain.gain.value = 0;

        const burstFilter = this.audioContext.createBiquadFilter();
        burstFilter.type = 'lowpass';
        burstFilter.frequency.value = 2000;

        burstFilter.connect(burstGain);
        burstGain.connect(this.masterGain);

        this.supernovaLayers.burst = { buffer: burstBuffer, gain: burstGain, filter: burstFilter, source: null };

        // High shimmer for the nebula phase
        const shimmerOscs = [];
        const shimmerGain = this.audioContext.createGain();
        shimmerGain.gain.value = 0;

        [880, 1320, 1760, 2640].forEach(freq => {
            const osc = this.audioContext.createOscillator();
            osc.type = 'sine';
            osc.frequency.value = freq;
            osc.connect(shimmerGain);
            osc.start();
            shimmerOscs.push(osc);
        });

        shimmerGain.connect(this.masterGain);
        this.supernovaLayers.shimmer = { oscs: shimmerOscs, gain: shimmerGain };

        // Pulsar click (periodic sharp sound)
        const pulsarGain = this.audioContext.createGain();
        pulsarGain.gain.value = 0;
        pulsarGain.connect(this.masterGain);
        this.supernovaLayers.pulsar = { gain: pulsarGain, lastClick: 0 };
    }

    updateSupernovaAudio(phase, phaseProgress) {
        if (!this.isEnabled || !this.isInitialized) return;
        if (!this.supernovaLayers) {
            this.createSupernovaLayers();
        }

        const time = this.audioContext.currentTime;
        const layers = this.supernovaLayers;

        switch (phase) {
            case 'doomed_star':
                // Gentle rumble, slowly building
                this.smoothGain(layers.rumble.gain, 0.1 + phaseProgress * 0.1, 0.5);
                break;

            case 'instability':
                // Rumble intensifies
                this.smoothGain(layers.rumble.gain, 0.2 + phaseProgress * 0.15, 0.3);
                // Slight shimmer begins
                this.smoothGain(layers.shimmer.gain, phaseProgress * 0.02, 0.5);
                break;

            case 'collapse':
                // Dramatic increase in rumble, frequency drops
                this.smoothGain(layers.rumble.gain, 0.35 + phaseProgress * 0.25, 0.2);
                layers.rumble.osc1.frequency.setTargetAtTime(30 - phaseProgress * 10, time, 0.2);
                layers.rumble.osc2.frequency.setTargetAtTime(45 - phaseProgress * 15, time, 0.2);
                break;

            case 'bounce':
                // Maximum tension before explosion
                this.smoothGain(layers.rumble.gain, 0.6, 0.1);
                break;

            case 'explosion':
                // BANG! Explosion burst
                if (phaseProgress < 0.1 && !layers.burst.source) {
                    // Trigger explosion sound
                    const source = this.audioContext.createBufferSource();
                    source.buffer = layers.burst.buffer;
                    source.connect(layers.burst.filter);
                    source.start();
                    layers.burst.source = source;

                    // Envelope: fast attack, slow decay
                    layers.burst.gain.gain.setValueAtTime(0, time);
                    layers.burst.gain.gain.linearRampToValueAtTime(0.8, time + 0.05);
                    layers.burst.gain.gain.exponentialRampToValueAtTime(0.01, time + 2.5);
                }

                // Fade rumble during explosion
                this.smoothGain(layers.rumble.gain, 0.4 - phaseProgress * 0.3, 0.5);
                break;

            case 'shockwave':
                // Rumble fades, wind-like sound
                this.smoothGain(layers.rumble.gain, 0.1 - phaseProgress * 0.08, 1);
                // Reset burst source for next time
                layers.burst.source = null;
                break;

            case 'nebula_formation':
                // Ethereal shimmer increases
                this.smoothGain(layers.rumble.gain, 0.02, 1);
                this.smoothGain(layers.shimmer.gain, 0.03 + phaseProgress * 0.04, 1);
                break;

            case 'aftermath':
                // Shimmer continues, pulsar clicks
                this.smoothGain(layers.shimmer.gain, 0.05, 1);
                this.smoothGain(layers.rumble.gain, 0.01, 1);

                // Pulsar periodic click (30 times per second = every 33ms)
                if (phaseProgress > 0.2) {
                    const now = performance.now();
                    if (now - layers.pulsar.lastClick > 33) {
                        // Create click sound
                        const clickOsc = this.audioContext.createOscillator();
                        const clickGain = this.audioContext.createGain();
                        clickOsc.type = 'sine';
                        clickOsc.frequency.value = 1200;
                        clickOsc.connect(clickGain);
                        clickGain.connect(this.masterGain);
                        clickGain.gain.setValueAtTime(0.1, time);
                        clickGain.gain.exponentialRampToValueAtTime(0.001, time + 0.02);
                        clickOsc.start(time);
                        clickOsc.stop(time + 0.03);
                        layers.pulsar.lastClick = now;
                    }
                }
                break;
        }
    }

    stopSupernovaAudio() {
        if (!this.supernovaLayers) return;

        const layers = this.supernovaLayers;
        this.smoothGain(layers.rumble.gain, 0, 0.5);
        this.smoothGain(layers.shimmer.gain, 0, 0.5);
        this.smoothGain(layers.burst.gain, 0, 0.5);
        layers.burst.source = null;
    }
}
