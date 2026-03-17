import { defineConfig } from 'vite';
import legacy from '@vitejs/plugin-legacy';

export default defineConfig({
	base: '/display/',
	build: {
		outDir: '../dist/display',
		emptyOutDir: true,
	},
	plugins: [
		legacy({ targets: ['chrome >= 84'] }), // Cast browser target
	],
	server: {
		proxy: {
			'/api': 'http://localhost:3004',
		},
	},
});
