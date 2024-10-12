import { writable, type Writable } from 'svelte/store';
export const selectedModel: Writable<string> = writable('gpt-4o');
export const selectedPersona: Writable<string> = writable('snoop');
