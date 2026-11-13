# Social Media Content Engine graphics

The pipeline graphic is drawn from a first-party template and the existing CAPITAL-AI palette. Its labels use the bundled Plus Jakarta Sans Regular font under SIL OFL 1.1. See [font license](../../public/fonts/OFL.txt). No photos, logos, model output or third-party image bytes are part of this PNG. Use the draft's asset hash and applicable channel authorization for distribution.

The draft renderer uses unmodified [resvg-wasm 2.6.2](https://www.npmjs.com/package/@resvg/resvg-wasm/v/2.6.2), MPL-2.0, as a pinned development dependency. The upstream source is [v2.6.2](https://github.com/thx/resvg-js/tree/9ca058462ac529120c8cc84ddcd6fef644cc5406), and the [MPL text](resvg-wasm-2.6.2-MPL-2.0.txt) is preserved here. The wasm binary stays in the generation environment. Generated image drafts contain pixels and do not ship the wasm binary. Reassess component notices and corresponding source if the binary itself is distributed.

The renderer receives the template and local font, palette and wasm bytes. It has no network fetch or externally supplied SVG entry point. Each draft package has its own PNG SHA-256 and CADS asset identity. Editorial and channel approval remain separate.
