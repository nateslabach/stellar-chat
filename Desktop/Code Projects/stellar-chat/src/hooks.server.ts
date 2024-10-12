import { sequence } from '@sveltejs/kit/hooks';
import { type Handle } from '@sveltejs/kit';

const first: Handle = async ({ event, resolve }) => {
	
	
	return resolve(event);
};

const resolveEvent: Handle = async ({ event, resolve }) => {
	const response = await resolve(event, {
		preload: ({ type }) => ['js', 'css'].includes(type)
	});
	return response;
};

export const handle = sequence(first, resolveEvent);
