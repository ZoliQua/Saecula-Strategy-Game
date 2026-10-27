import { EDGE_MIN, EDGE_SPAN } from './surfaceMask';

/**
 * Fragment shader of the animated terrain surface (TerrainSurface): water
 * (depth tint, scrolling normal-mapped ripples lit by the sun, specular
 * glints, moving shore foam) and the cast shadows of cliff plateaus,
 * both reading the packed surface mask (see surfaceMask.ts):
 *   R = rock edge field, G = plateau height on rock / water depth elsewhere, B = water coverage.
 * Pixels that show rock (a plateau top or face, found by marching the
 * view diagonal like cliffRelief.marchRelief) are left untouched.
 */
export const TERRAIN_SURFACE_FRAG = `
precision highp float;

uniform vec2 resolution;
uniform sampler2D iChannel0;
uniform float uTime;
uniform vec2 uOrigin;
uniform vec2 uGrid;
uniform float uRes;
uniform float uMaxH;
uniform vec3 uSunDir;
/** Sun mirrored to the far side of the scene: the sun is mostly behind the camera, and glints need it in front. */
uniform vec3 uGlintDir;
uniform vec3 uSunColor;
uniform vec3 uAmbient;
uniform vec4 uShadow;
uniform vec2 uLayers;
/** 0 when the scene is unlit (lighting toggle off): no plateau shadows, glints or sparkle. */
uniform float uLit;

varying vec2 fragCoord;

const float EDGE_MIN = ${EDGE_MIN.toFixed(4)};
const float EDGE_SPAN = ${EDGE_SPAN.toFixed(4)};

vec2 groundOf(vec2 w) {
  float a = w.x / 32.0;
  float b = w.y / 16.0;
  return vec2(a + b, b - a) * 0.5;
}

vec4 maskAt(vec2 t) {
  vec2 g = (t + 0.5) * uRes + 0.5;
  return texture2D(iChannel0, g / uGrid);
}

float edgeOf(vec4 m) { return m.r * EDGE_SPAN + EDGE_MIN; }

/** True when the pixel at world w shows rock (marches the view diagonal from the plateau height down). */
bool showsRock(vec2 w) {
  for (int k = 0; k < 34; k++) {
    float h = uMaxH - float(k) * 2.0;
    if (h < 0.0) break;
    vec4 m = maskAt(groundOf(w + vec2(0.0, h)));
    if (edgeOf(m) > 0.5 && h <= m.g * uMaxH + 1.0) return true;
  }
  return false;
}

/** 0..1 shadow of the plateaus on ground point w (march towards the sun along the shadow vector, jittered against banding). */
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

float rockShadow(vec2 w, float jitter) {
  float shade = 0.0;
  for (int k = 0; k < 22; k++) {
    float h = (float(k) + jitter) * (uMaxH / 22.0);
    vec4 m = maskAt(groundOf(w - h * uShadow.xy));
    float rock = smoothstep(0.44, 0.6, edgeOf(m));
    float above = smoothstep(-3.0, 3.0, m.g * uMaxH - h);
    shade = max(shade, rock * above);
  }
  return shade;
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}

/** Ripple height gradient on the ground plane (p in tiles). */
vec2 rippleSlope(vec2 p, float t) {
  vec2 g = vec2(0.0);
  vec2 d1 = normalize(vec2(1.0, 0.35));
  vec2 d2 = normalize(vec2(-0.45, 1.0));
  vec2 d3 = normalize(vec2(0.8, -0.6));
  g += d1 * cos(dot(p, d1) * 5.1 + t * 1.7) * 0.11;
  g += d2 * cos(dot(p, d2) * 7.3 + t * 2.3) * 0.08;
  g += d3 * cos(dot(p, d3) * 12.7 - t * 3.1) * 0.05;
  vec2 q = p * 3.0 + vec2(t * 0.25, t * 0.18);
  float n0 = noise(q);
  g += vec2(noise(q + vec2(0.4, 0.0)) - n0, noise(q + vec2(0.0, 0.4)) - n0) * 0.9;
  return g;
}

/** Ground-plane vector (tile axes u, v, up) to view space (see viewSpace.ts tileToView). */
vec3 toView(vec3 t) {
  float s = 0.70710678;
  float right = (t.x - t.y) * s;
  float towards = (t.x + t.y) * s;
  return vec3(right, -0.5 * towards + 0.8660254 * t.z, 0.8660254 * towards + 0.5 * t.z);
}

void main() {
  vec2 w = uOrigin + vec2(fragCoord.x, resolution.y - fragCoord.y);
  vec2 p = groundOf(w);
  vec4 m = maskAt(p);
  float cover = uLayers.y * smoothstep(0.42, 0.62, m.b);
  bool nearRock = false;
  if (uLayers.x > 0.5) {
    // Any rock on the view diagonal or along the shadow ray? Otherwise skip the marches.
    float e = max(edgeOf(m), edgeOf(maskAt(groundOf(w + vec2(0.0, uMaxH)))));
    for (int k = 1; k <= 6; k++) e = max(e, edgeOf(maskAt(groundOf(w - (float(k) / 6.0) * uMaxH * uShadow.xy))));
    nearRock = e > 0.05;
  }
  if (cover < 0.004 && !nearRock) discard;
  if (nearRock && showsRock(w)) discard;
  float shadow = nearRock && uLit > 0.5 ? rockShadow(w, hash(floor(w))) * uShadow.z : 0.0;

  if (cover < 0.004) {
    if (shadow < 0.004) discard;
    gl_FragColor = vec4(vec3(0.024, 0.04, 0.063) * shadow, shadow);
    return;
  }

  float t = uTime;
  float depth = m.g;
  vec2 slope = rippleSlope(p, t) * (0.35 + 0.65 * smoothstep(0.0, 0.5, depth));
  vec3 n = normalize(toView(vec3(-slope, 1.0)));
  vec3 shallow = vec3(0.24, 0.52, 0.55);
  vec3 deep = vec3(0.05, 0.2, 0.33);
  vec3 col = mix(shallow, deep, smoothstep(0.0, 1.0, depth));
  // Sand and weed showing through the shallows.
  col = mix(col, vec3(0.45, 0.48, 0.36), (1.0 - smoothstep(0.0, 0.25, depth)) * 0.35);
  float diffuse = max(dot(n, uSunDir), 0.0);
  vec3 light = uAmbient + uSunColor * diffuse;
  col *= light;
  // Sky reflection brightens grazing ripples a little.
  float fres = pow(1.0 - max(n.z, 0.0), 3.0);
  col += (uAmbient * vec3(0.45, 0.55, 0.7) + uSunColor * 0.25) * fres * 0.6;
  // Sun glints: sharp specular, sparkling with fine noise.
  vec3 r = reflect(-uGlintDir, n);
  float spec = pow(max(r.z, 0.0), 48.0);
  float sparkle = pow(max(r.z, 0.0), 70.0) * smoothstep(0.86, 0.95, noise(p * 24.0 + vec2(t * 1.6, -t * 1.1)));
  col += uSunColor * (spec * 0.22 + sparkle * 2.6) * uLit;
  // Shore foam: soft lacy bands rolling in towards the shore, and a thin wet line at the edge.
  float shore = 1.0 - smoothstep(0.0, 0.3, depth);
  float lace = noise(p * 7.0 + vec2(t * 0.35, -t * 0.2)) * 0.6 + noise(p * 17.0 - vec2(t * 0.5, 0.0)) * 0.4;
  float wave = sin(depth * 34.0 - t * 1.9 + noise(p * 1.5) * 5.0) * 0.5 + 0.5;
  float foam = shore * smoothstep(0.55, 1.0, wave) * smoothstep(0.35, 0.75, lace) * 0.7;
  foam = max(foam, (1.0 - smoothstep(0.0, 0.05, depth)) * (0.35 + 0.35 * lace));
  col = mix(col, (uAmbient + uSunColor * 0.8) * vec3(0.95, 0.98, 1.0), foam);
  col *= 1.0 - shadow * 0.75;
  float alpha = cover * mix(0.88, 0.97, depth);
  gl_FragColor = vec4(col * alpha, alpha);
}
`;
