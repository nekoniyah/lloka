import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import obfuscator from 'vite-plugin-javascript-obfuscator'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react(), 
tailwindcss(), obfuscator({
    options: {
      compact: true,
      controlFlowFlattening: true,
      deadCodeInjection: true,
      identifierNamesGenerator: 'hexadecimal',
      renameGlobals: true,
      selfDefending: true,
      stringArray: true,
      stringArrayEncoding: ['base64'],
      stringArrayThreshold: 0.75
    }
  })],
  base: './',
	resolve: {
		alias: {
			'@components': path.resolve(__dirname, './src/components'),
      '@contexts': path.resolve(__dirname, './src/contexts'),
			'@hooks': path.resolve(__dirname, './src/hooks'),
			'@lib': path.resolve(__dirname, './src/lib/'),
      '@pages': path.resolve(__dirname, './src/pages/'),
		}
	},
  build: {
    outDir: '../backend/public/',
    emptyOutDir: true,
    minify: 'terser',
    terserOptions: {
      compress: {
        passes: 3,
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log'],
        unsafe: true,
        unsafe_arrows: true,
        unsafe_methods: true,
      },
      mangle: {
        toplevel: true,
      },
      format: {
        comments: false,
      },
    },
    rolldownOptions: {
      output: {
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: 'assets/[ext]/[name]-[hash].[ext]',
      }
    },
    modulePreload: true,
    sourcemap: false,
  }
})