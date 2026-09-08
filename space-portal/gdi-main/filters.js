/**
 * GDI — Global Defense Intelligence
 * Post-Processing Visual Filters (GLSL)
 *
 * Each filter is a Cesium.PostProcessStage with a custom fragment shader.
 * The shaders operate on the rendered scene framebuffer.
 */

const GDI_FILTERS = {

    // ── CRT Monitor Effect ──────────────────────────────────────────
    CRT: {
        name: 'gdi_crt',
        source: `
            uniform sampler2D colorTexture;
            in vec2 v_textureCoordinates;

            // Screen curvature
            vec2 curveUV(vec2 uv) {
                uv = uv * 2.0 - 1.0;
                vec2 offset = abs(uv.yx) / vec2(6.0, 4.0);
                uv = uv + uv * offset * offset;
                uv = uv * 0.5 + 0.5;
                return uv;
            }

            void main() {
                vec2 uv = curveUV(v_textureCoordinates);

                // Out-of-bounds → black
                if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
                    out_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
                    return;
                }

                // Chromatic aberration
                float aberration = 0.002;
                float r = texture(colorTexture, vec2(uv.x + aberration, uv.y)).r;
                float g = texture(colorTexture, uv).g;
                float b = texture(colorTexture, vec2(uv.x - aberration, uv.y)).b;
                vec3 col = vec3(r, g, b);

                // Scanlines
                float scanline = sin(uv.y * 800.0) * 0.08;
                col -= scanline;

                // Phosphor glow — boost slightly
                col *= 1.15;

                // Subtle flicker
                float flicker = 1.0 - 0.02 * sin(czm_frameNumber * 0.3);
                col *= flicker;

                // Vignette
                float vignette = uv.x * uv.y * (1.0 - uv.x) * (1.0 - uv.y);
                vignette = clamp(pow(16.0 * vignette, 0.3), 0.0, 1.0);
                col *= vignette;

                // Slight green tint (old CRT phosphor)
                col *= vec3(0.95, 1.05, 0.95);

                out_FragColor = vec4(col, 1.0);
            }
        `,
    },

    // ── Night Vision Goggles ────────────────────────────────────────
    NVG: {
        name: 'gdi_nvg',
        source: `
            uniform sampler2D colorTexture;
            in vec2 v_textureCoordinates;

            // Pseudo-random noise
            float rand(vec2 co) {
                return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453);
            }

            void main() {
                vec2 uv = v_textureCoordinates;
                vec3 col = texture(colorTexture, uv).rgb;

                // Convert to luminance
                float lum = dot(col, vec3(0.299, 0.587, 0.114));

                // Boost contrast
                lum = pow(lum, 0.8);
                lum = clamp(lum * 1.5, 0.0, 1.0);

                // Apply green phosphor color (#00ff41)
                vec3 nvg = vec3(0.0, lum, lum * 0.255);

                // Bloom on bright areas
                float bloom = smoothstep(0.5, 1.0, lum) * 0.3;
                nvg += vec3(0.0, bloom, bloom * 0.255);

                // Film grain (animated)
                float noise = rand(uv + fract(czm_frameNumber * 0.01)) * 0.12;
                nvg += vec3(0.0, noise * 0.8, noise * 0.2);

                // Circular vignette (goggle aperture)
                vec2 center = uv - 0.5;
                float dist = length(center);
                float vig = 1.0 - smoothstep(0.3, 0.7, dist);
                nvg *= vig;

                out_FragColor = vec4(nvg, 1.0);
            }
        `,
    },

    // ── FLIR / Thermal Imaging ──────────────────────────────────────
    FLIR: {
        name: 'gdi_flir',
        source: `
            uniform sampler2D colorTexture;
            in vec2 v_textureCoordinates;

            // Thermal palette: black → blue → purple → red → orange → yellow → white
            vec3 thermalPalette(float t) {
                // 7-stop gradient
                vec3 c;
                if (t < 0.15) {
                    c = mix(vec3(0.0), vec3(0.0, 0.0, 0.5), t / 0.15);
                } else if (t < 0.3) {
                    c = mix(vec3(0.0, 0.0, 0.5), vec3(0.5, 0.0, 0.5), (t - 0.15) / 0.15);
                } else if (t < 0.45) {
                    c = mix(vec3(0.5, 0.0, 0.5), vec3(0.8, 0.0, 0.0), (t - 0.3) / 0.15);
                } else if (t < 0.6) {
                    c = mix(vec3(0.8, 0.0, 0.0), vec3(1.0, 0.4, 0.0), (t - 0.45) / 0.15);
                } else if (t < 0.8) {
                    c = mix(vec3(1.0, 0.4, 0.0), vec3(1.0, 1.0, 0.0), (t - 0.6) / 0.2);
                } else {
                    c = mix(vec3(1.0, 1.0, 0.0), vec3(1.0), (t - 0.8) / 0.2);
                }
                return c;
            }

            void main() {
                vec2 uv = v_textureCoordinates;
                vec3 col = texture(colorTexture, uv).rgb;

                // Luminance
                float lum = dot(col, vec3(0.299, 0.587, 0.114));

                // Edge enhancement via Sobel-like kernel
                float texelW = 1.0 / 1920.0;
                float texelH = 1.0 / 1080.0;

                float lumL = dot(texture(colorTexture, uv + vec2(-texelW, 0.0)).rgb, vec3(0.299, 0.587, 0.114));
                float lumR = dot(texture(colorTexture, uv + vec2( texelW, 0.0)).rgb, vec3(0.299, 0.587, 0.114));
                float lumU = dot(texture(colorTexture, uv + vec2(0.0,  texelH)).rgb, vec3(0.299, 0.587, 0.114));
                float lumD = dot(texture(colorTexture, uv + vec2(0.0, -texelH)).rgb, vec3(0.299, 0.587, 0.114));

                float edge = abs(lumL - lumR) + abs(lumU - lumD);
                edge = clamp(edge * 3.0, 0.0, 0.3);

                // Map to thermal
                float thermal = clamp(lum + edge, 0.0, 1.0);
                vec3 finalColor = thermalPalette(thermal);

                out_FragColor = vec4(finalColor, 1.0);
            }
        `,
    },
};


/**
 * FilterManager — applies/removes post-processing stages on a Cesium viewer.
 */
class FilterManager {

    constructor(viewer) {
        this.viewer = viewer;
        this._activeStage = null;
        this._activeName = 'NORMAL';
    }

    /**
     * Apply a named filter: 'CRT', 'NVG', 'FLIR', or 'NORMAL' (removes all).
     */
    apply(filterName) {
        // Remove current
        this._remove();

        if (filterName === 'NORMAL') {
            this._activeName = 'NORMAL';
            return;
        }

        const def = GDI_FILTERS[filterName];
        if (!def) {
            console.warn(`[FILTER] Unknown filter: ${filterName}`);
            return;
        }

        try {
            this._activeStage = this.viewer.scene.postProcessStages.add(
                new Cesium.PostProcessStage({
                    name: def.name,
                    fragmentShader: def.source,
                })
            );
            this._activeName = filterName;
            console.log(`[FILTER] Applied: ${filterName}`);
        } catch (e) {
            console.error(`[FILTER] Failed to apply ${filterName}:`, e);
        }
    }

    _remove() {
        if (this._activeStage) {
            try {
                this.viewer.scene.postProcessStages.remove(this._activeStage);
            } catch (e) {
                // already removed
            }
            this._activeStage = null;
        }
    }

    get active() {
        return this._activeName;
    }

    destroy() {
        this._remove();
    }
}
