const esbuild = require("esbuild");

esbuild.build({
    entryPoints: ["src/index.ts"],
    bundle: true,
    sourcemap: false,
    minify: true,
    outfile: "dist/index.js",
    platform: "node",
    target: "node20",
    format: "cjs",
}).catch(() => process.exit(1));