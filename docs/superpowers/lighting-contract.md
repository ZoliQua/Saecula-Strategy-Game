## Lighting contract (how later tasks use it)
1. **Albedo + normal map.**
   - Paint with IsoPainter, finish with `painter.result()`, which returns `LitArt {canvas, normal, volume, glows}`. Register with `registerLitArt` in textures.ts, which attaches the normal map and stores `BUILDING_LIGHT[key]`.
   - For free-form art, call `normalMapFor(canvas, null, FOLIAGE_DERIVE | ROCK_DERIVE | UNIT_DERIVE)`, then `attachNormalMap(scene, key, normal)`.
   - Team variants: `shareNormalMap(scene, baseKey, variantKey)`.
   - Directly painted uprights can call `painter.normalCylinder(x, y, w, h)`.
   - Any custom normal: `painter.normals.fill(pts, slopeNormal(...) | N_LEFT | N_RIGHT | N_UP)`.
2. **Pipeline**: call `lit(gameObject)` on every world sprite. It is a no-op when lighting is off or the renderer isn't WebGL. Leave UI, fog, particles, glows and shadows unlit.
3. **Lights** (through `LightManager.of(scene)`):
   - Persistent: `addLight({x, y, color, radius, intensity, flicker})`. x/y is the ground point under the light, and the light height is the global `POINT_LIGHT_HEIGHT`. Returns `handle.setPosition` / `setEnabled` / `remove`.
   - Flash: `flash(x, y, color, radius, durationMs, intensity?)`, pooled and capped.
   - Building-anchored torches: add an entry to `BUILDING_LIGHTS`.
4. **Shadows**:
   - Upright casters: `registerShadowSilhouette(scene, baseKey)` when the texture is created, then `LightManager.of(scene).attachCaster(sprite, baseKey)`. This returns a detach function.
   - Buildings: `attachBuilding({sprite, type, footprint, volume, glows, isComplete, heightScale})`. Volumes and glows come automatically from IsoPainter boxes, roofs and windows.
5. **Toggle**: `LIGHTING_ENABLED = false` in `config/visual.ts` restores the old look: no normals, shadows, glows, lights or baked-shade change. The only difference left is the wider painter canvas margin, which isn't visible.

## Texture memory (measured in the game scene, 64×64 map)
- **Total albedo canvases**: 111.8 MB. Of that:
  - about 64 MB is a 5232×3216 canvas, almost certainly the `TileSprite`'s internal canvas for the cloud layer (it existed before this task);
  - about 32 MB is the 8 terrain chunks (also existing).
- **Added by this task**:
  - normal maps 9.5 MB, measured by real image size; team variants share them and terrain shares one 4×4 map;
  - shadow silhouettes about 1 MB;
  - wider painter margins about 10% on building albedo, around 1 MB.
- Estimate on 96×96: terrain about 72 MB, clouds about 110 MB. That is about 190 MB in total, still under 256 MB, but the margin is tight.

- Task 19 amendment: unit and painted-building normal maps are generated at half resolution; unit shadow sheets quarter size (texture memory budget).
- Task 19 amendment (fix round 1): `registerLitArt` trims every painted building / wall / Wonder / site canvas to its content (empty top rows and equal side margins; height kept even) and offsets the texture-px data (`glows`, `volume`) by the crop. Front-corner-relative data (`lights`, `smoke`) is unchanged. A painter that adds new texture-px data must add it to `trimLitArt`. Terrain chunks stream (`ChunkStreamer`): a chunk's texture key can be full, `~half`, or absent; never cache a chunk texture key.

## M4 amendments (binding for M5 art tasks)

- **Unit team masks are half resolution.** The mask texture (`teamMaskKey(key)`) is a quarter of the albedo's pixels, but its frames and UVs are computed against the *albedo's* size: `UnitArt.ts` `create(art.maskKey, sheet.mask, sheet.albedo.width, sheet.albedo.height)`, then `frames(mask, 1)`. Dirty-frame uploads in `refresh` (same file) use divisor 2 for the mask (and the normal map); the albedo uses 1, the unit shadow `UNIT_SHADOW_DOWNSCALE`. A new unit texture or mask must follow the same rule: never create a mask at full size against the albedo's frames, and never size its frames against its own (smaller) dimensions, or team colour comes from the wrong region. The renderer must be WebGL (`type: Phaser.WEBGL`); the Canvas fallback cuts the half-size mask with full-size rectangles.
- **Building shadows and AO are rock-cut.** `CastShadows.ts` draws every building shadow/AO hull into one Graphics (`hulls`) masked by an inverted `GeometryMask` (`rockCut`, `setInvertAlpha(true)`) fed by `TileMap.rockFootprints()` (`src/map/rockFootprints.ts`; wired in `GameScene.ts`: `lighting.shadows?.setRock(tileMap.rockFootprints())`). Shadows are projected onto the ground plane and must stay off raised plateaus. Any new shadow or AO path for buildings must go through this mask (draw into `hulls`, or apply `rockCut`); a shadow drawn outside it brings back the plateau-shadow bug.
