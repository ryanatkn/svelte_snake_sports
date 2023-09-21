import type {UserConfig} from 'vite';
import {sveltekit} from '@sveltejs/kit/vite';

const config: UserConfig = {
	plugins: [sveltekit()],
	ssr: {noExternal: ['@feltjs/felt-ui']},
};

export default config;
