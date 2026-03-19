import { defineConfig } from 'vite';
import legacy from '@vitejs/plugin-legacy';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
	base: '/display/',
	build: {
		outDir: '../dist/display',
		emptyOutDir: true,
	},
	plugins: [
		legacy({ targets: ['chrome >= 84'] }), // Cast browser target
		tailwindcss(),
	],
	server: {
		host: '127.0.0.1',
		port: 5173,
		strictPort: true,
		hmr: {
			path: '/display/',
		},
		proxy: {
			'/api': 'http://localhost:3004',
		},
	},
});
