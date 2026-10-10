# JaJa 3D Character — Asset & Rendering Provenance
Status: SOURCE_IMPLEMENTED / VISUAL_OWNER_REVIEW_PENDING / BROWSER_E2E_NOT_PROVEN
Date: 2026-10-10

## Origin and ownership
- `scripts/generate-jaja-3d.mjs` is a standalone, deterministic glTF 2.0 geometry generator created for the CAPITAL-AI project. It uses only custom primitive sphere geometry, glTF nodes and local PBR material colors. No downloaded 3D model, motion capture, texture, video or voice file is embedded.
- The shape is a **stylized geometric interpretation** of the owner's approved Grok-generated JaJa 2D brand character at `public/assets/jaja-avatar-transparent.webp`. It is not a byte conversion or exact mesh reconstruction of the owner's private Grok video.
- Brand identity remains proprietary to CAPITAL-AI. Third-party rights / similarity to pre-existing fictional characters and the owner's xAI/Grok generation terms need owner legal review before brand licensing or further commercialization. Do not present generated geometry as third-party licensed or as a perfect match to the image.
- Underlying Three.js runtime (version 0.184.0) and DefinitelyTyped declarations (0.184.1) use MIT; their rights are separate from the model/branding. No paid external service is added.

## Runtime contract
- The reproducible GLB is generated as `public/assets/jaja-figure.glb` by the existing `npm run build` script; versioned generator source is the stable provenance artifact. No checked-in opaque binary is required.
- `src/components/JaJa3DAvatar.tsx` loads the GLB via first-party same-origin `/assets/jaja-figure.glb`, with transparent WebGL2 canvas and named head/arm/ear articulation; user drag/arrow keys rotate the root. No third-party APIs, calls or secrets.
- Fallback: the approved WebP for failures or reduced motion; existing SVG/label remains for completely unavailable media. Reduced motion suppresses GPU animation; browser visibility and viewport visibility stop the loop.
- The existing HeroBuddy chat, local answers, user navigation and backend permissions remain separate from rendering.

## Acceptance evidence (not yet completed)
1. `Docker Security Gate` and `Domain Governance` succeed on exact head SHA.
2. `npm ci`, TS/noEmit, GLB Node contract tests and Vite build succeed.
3. Render web production serves both images at HTTP 200 and correct Content-Type, shows the GLB with WebGL2; no new audio/permissions.
4. Mobile portrait, keyboard, touch drag, screen reader and reduced-motion regression QA.
5. Visual Owner review of body shape, colors, silhouette and branding; this generated low-poly model is deliberately a prototype, not a high-fidelity artistic sculpt.

## Performance and cost boundaries
- Static GLB without textures and optional lazily-loaded renderer keep network dependency local; bundle sizes and FPS must be measured in the browser. GPU, CI, CDN/storage and network cost may rise; no new Cloud/GPU service, billable inference or external provider activation has been performed.
