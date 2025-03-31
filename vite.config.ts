import { defineConfig } from 'vite';

export default defineConfig({
    publicDir: 'src/assets', // Specify the assets directory
    build: {
        outDir: 'dist', // Ensure assets are copied to the dist directory
    },
    optimizeDeps: {
        exclude: ['@babylonjs/havok', '@babylonjs/core/Culling/ray'],
    },
});
