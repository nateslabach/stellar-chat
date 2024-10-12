import adapter from '@sveltejs/adapter-vercel';
import seqPreprocessor from 'svelte-sequential-preprocessor';
import { sveltePreprocess } from 'svelte-preprocess';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: seqPreprocessor([sveltePreprocess({ postcss: true })]),
	kit: {
		adapter: adapter({
			runtime: 'nodejs20.x',
			external: [
				'path',
				'crypto',
				'fs',
				'events',
				'util',
				'url',
				'stream',
				'mock-aws-s3',
				'os',
				'aws-sdk',
				'nock',
				'assert',
				'path',
				'child_process',
				'node-fetch'
			]
		}),
		csrf: {
			checkOrigin: process.env.NODE_ENV !== 'development'
		},
		serviceWorker: {
			register: false
		},
		alias: {
			$stores: './src/lib/stores',
			$services: './src/lib/services',
			$helpers: './src/lib/helpers',
			$public: './src/lib/helpers/public',
			$components: './src/lib/components'
		}
	}
};

export default config;
