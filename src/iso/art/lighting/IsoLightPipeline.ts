import Phaser from 'phaser';
import { POINT_LIGHT_HEIGHT } from '../../../config/visual';
import type { Vec3 } from './viewSpace';

/** Pipeline key world sprites use (see lit()). */
export const ISO_LIGHT_PIPELINE = 'IsoLight2D';

/**
 * Phaser's Light2D shader with two changes for the isometric world:
 *  1. a directional sun (view-space direction + colour) on top of the
 *     ambient term, so flat ground is lit by sun height, not by the
 *     distance to some far point light;
 *  2. point lights reconstruct the world offset on the iso ground plane
 *     (screen dy ↔ depth × 2) and sit POINT_LIGHT_HEIGHT above their
 *     ground point, giving elliptical pools that light walls facing them.
 * Normals are in view space (x right, y up, z to viewer); see viewSpace.ts.
 */
const FRAG = `
#define SHADER_NAME ISO_LIGHT_FS
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

struct Light { vec2 position; vec3 color; float intensity; float radius; };
const int kMaxLights = %LIGHT_COUNT%;
const float kHeight = ${POINT_LIGHT_HEIGHT.toFixed(1)};

uniform vec4 uCamera;
uniform sampler2D uMainSampler;
uniform sampler2D uNormSampler;
uniform vec3 uAmbientLightColor;
uniform Light uLights[kMaxLights];
uniform mat3 uInverseRotationMatrix;
uniform int uLightCount;
uniform vec3 uSunDir;
uniform vec3 uSunColor;

varying vec2 outTexCoord;
varying float outTexId;
varying float outTintEffect;
varying vec4 outTint;

void main ()
{
    vec4 texel = vec4(outTint.bgr * outTint.a, outTint.a);
    vec4 texture = texture2D(uMainSampler, outTexCoord);
    vec4 color = texture * texel;
    if (outTintEffect == 1.0) {
        color.rgb = mix(texture.rgb, outTint.bgr * outTint.a, texture.a);
    } else if (outTintEffect == 2.0) {
        color = texel;
    }

    vec3 n = normalize(uInverseRotationMatrix * (texture2D(uNormSampler, outTexCoord).rgb * 2.0 - 1.0));
    vec3 light = uAmbientLightColor + uSunColor * max(dot(n, uSunDir), 0.0);

    for (int i = 0; i < kMaxLights; ++i) {
        if (i < uLightCount) {
            Light l = uLights[i];
            vec2 d = (l.position - gl_FragCoord.xy) / uCamera.w;
            float depth = -2.0 * d.y;
            float dist = length(vec2(d.x, depth));
            float att = clamp(1.0 - dist / l.radius, 0.0, 1.0);
            att *= att;
            vec3 L = normalize(vec3(d.x, d.y + 0.866 * kHeight, 0.866 * depth + 0.5 * kHeight));
            float diff = max(dot(n, L), 0.0) * 0.75 + 0.25;
            light += l.color * (l.intensity * att * diff);
        }
    }
    gl_FragColor = vec4(color.rgb * light, color.a);
}
`;

interface SunUniforms {
  dir: Vec3;
  color: Vec3;
}

const sunByScene = new WeakMap<Phaser.Scene, SunUniforms>();

/** Sets the sun the pipeline uses while rendering `scene`. */
export function setSceneSun(scene: Phaser.Scene, dir: Vec3, color: Vec3): void {
  sunByScene.set(scene, { dir, color });
}

/** Rotations below this are ignored for normals (tree sway) to keep batches. */
const ROTATION_EPS = 0.12;

export class IsoLightPipeline extends Phaser.Renderer.WebGL.Pipelines.LightPipeline {
  private flip = 1;
  private normalKey = '';

  /** Phaser's PipelineManager constructs config pipelines with the Game. */
  constructor(game: Phaser.Game) {
    super({ game, fragShader: FRAG, name: ISO_LIGHT_PIPELINE });
  }

  override onRender(scene: Phaser.Scene, camera: Phaser.Cameras.Scene2D.Camera): void {
    super.onRender(scene, camera);
    const sun = sunByScene.get(scene);
    const d = sun?.dir ?? [0, 0.866, 0.5];
    const c = sun?.color ?? [0, 0, 0];
    this.set3f('uSunDir', d[0], d[1], d[2]);
    this.set3f('uSunColor', c[0], c[1], c[2]);
    this.normalKey = '';
  }

  override setGameObject(gameObject: Phaser.GameObjects.GameObject, frame?: Phaser.Textures.Frame): number {
    this.flip = (gameObject as Partial<Phaser.GameObjects.Components.Flip>).flipX ? -1 : 1;
    return super.setGameObject(gameObject, frame);
  }

  /** Same as Light2D but folds horizontal flip into the normal matrix. */
  override setNormalMapRotation(rotation: number): void {
    const rot = Math.abs(rotation) < ROTATION_EPS ? 0 : rotation;
    const key = `${rot}|${this.flip}`;
    if (key === this.normalKey && this.vertexCount > 0) return;
    if (this.vertexCount > 0) this.flush();
    // Field exists on Phaser's LightPipeline but is missing from its typings.
    const m = (this as unknown as { inverseRotationMatrix: Float32Array }).inverseRotationMatrix;
    const c = Math.cos(-rot);
    const s = Math.sin(-rot);
    m[0] = c * this.flip;
    m[1] = s * this.flip;
    m[3] = -s;
    m[4] = c;
    this.setMatrix3fv('uInverseRotationMatrix', false, m);
    this.normalKey = key;
  }
}
