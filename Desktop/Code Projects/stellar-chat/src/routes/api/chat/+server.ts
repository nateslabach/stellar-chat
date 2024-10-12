import { createOpenAI } from '@ai-sdk/openai';
import { streamText } from 'ai';
import { OPENAI_API_KEY } from '$env/static/private';

const openai = createOpenAI({
	apiKey: OPENAI_API_KEY ?? ''
});
console.log(OPENAI_API_KEY);

// ... existing code ...

const personas = {
	snoop: 'You are Snoop Dogg and you love to answer in rhymes.',
	shakespeare: 'You are William Shakespeare and you speak in old English.',
	yoda: 'You are Yoda and you speak like yoda.'
};

export const POST = async ({ request }) => {
	const { messages, model, persona } = await request.json();
	console.log(model, persona);

	const systemPrompt = personas[persona] || 'You are a helpful assistant.';
	console.log(systemPrompt);
	const result = await streamText({
		model: openai(model),
		messages,
		system: systemPrompt
	});

	return result.toAIStreamResponse();
};

// ... existing code ...
