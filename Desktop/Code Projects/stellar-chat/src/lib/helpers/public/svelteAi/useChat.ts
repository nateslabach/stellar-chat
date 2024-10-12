import type {
	ChatRequest,
	ChatRequestOptions,
	CreateMessage,
	FetchFunction,
	IdGenerator,
	JSONValue,
	Message,
	UseChatOptions as SharedUseChatOptions
} from '@ai-sdk/ui-utils';
import { callChatApi, generateId as generateIdFunc, processChatStream } from '@ai-sdk/ui-utils';
import { writable, derived, get, type Readable, type Writable } from 'svelte/store';

export type { CreateMessage, Message };

export type UseChatOptions = SharedUseChatOptions & {
	maxToolRoundtrips?: number;
};

export type UseChatHelpers = {
	messages: Readable<Message[]>;
	error: Readable<undefined | Error>;
	append: (
		message: Message | CreateMessage,
		chatRequestOptions?: ChatRequestOptions
	) => Promise<string | null | undefined>;
	reload: (chatRequestOptions?: ChatRequestOptions) => Promise<string | null | undefined>;
	stop: () => void;
	setMessages: (messages: Message[] | ((messages: Message[]) => Message[])) => void;
	input: Writable<string>;
	handleSubmit: (
		event?: { preventDefault?: () => void },
		chatRequestOptions?: ChatRequestOptions
	) => void;
	metadata?: Object;
	isLoading: Readable<boolean | undefined>;
	data: Readable<JSONValue[] | undefined>;
	maxToolRoundtrips?: number;
};

const getStreamedResponse = async (
	api: string,
	chatRequest: ChatRequest,
	mutate: (messages: Message[]) => void,
	mutateStreamData: (data: JSONValue[] | undefined) => void,
	existingData: JSONValue[] | undefined,
	extraMetadata: {
		credentials?: RequestCredentials;
		headers?: Record<string, string> | Headers;
		body?: any;
	},
	previousMessages: Message[],
	abortControllerRef: AbortController | null,
	generateId: IdGenerator,
	streamProtocol: UseChatOptions['streamProtocol'],
	onFinish: UseChatOptions['onFinish'],
	onResponse: ((response: Response) => void | Promise<void>) | undefined,
	onToolCall: UseChatOptions['onToolCall'] | undefined,
	sendExtraMessageFields: boolean | undefined,
	fetch: FetchFunction | undefined,
	keepLastMessageOnError: boolean | undefined
) => {
	mutate(chatRequest.messages);

	const constructedMessagesPayload = sendExtraMessageFields
		? chatRequest.messages
		: chatRequest.messages.map(
				({
					role,
					content,
					name,
					data,
					annotations,
					function_call,
					tool_calls,
					tool_call_id,
					toolInvocations
				}) => ({
					role,
					content,
					...(name !== undefined && { name }),
					...(data !== undefined && { data }),
					...(annotations !== undefined && { annotations }),
					...(toolInvocations !== undefined && { toolInvocations }),
					tool_call_id,
					...(function_call !== undefined && { function_call }),
					...(tool_calls !== undefined && { tool_calls })
				})
			);

	return await callChatApi({
		api,
		body: {
			messages: constructedMessagesPayload,
			data: chatRequest.data,
			...extraMetadata.body,
			...chatRequest.body,
			...(chatRequest.functions !== undefined && {
				functions: chatRequest.functions
			}),
			...(chatRequest.function_call !== undefined && {
				function_call: chatRequest.function_call
			}),
			...(chatRequest.tools !== undefined && {
				tools: chatRequest.tools
			}),
			...(chatRequest.tool_choice !== undefined && {
				tool_choice: chatRequest.tool_choice
			})
		},
		streamProtocol,
		credentials: extraMetadata.credentials,
		headers: {
			...extraMetadata.headers,
			...chatRequest.headers
		},
		abortController: () => abortControllerRef,
		restoreMessagesOnFailure() {
			if (!keepLastMessageOnError) {
				mutate(previousMessages);
			}
		},
		onResponse,
		onUpdate(merged, data) {
			mutate([...chatRequest.messages, ...merged]);
			mutateStreamData([...(existingData || []), ...(data || [])]);
		},
		onFinish,
		generateId,
		onToolCall,
		fetch
	});
};

let uniqueId = 0;

const store: Record<string, Message[] | undefined> = {};

function isAssistantMessageWithCompletedToolCalls(message: Message) {
	return (
		message.role === 'assistant' &&
		message.toolInvocations &&
		message.toolInvocations.length > 0 &&
		message.toolInvocations.every((toolInvocation) => 'result' in toolInvocation)
	);
}

function countTrailingAssistantMessages(messages: Message[]) {
	let count = 0;
	for (let i = messages.length - 1; i >= 0; i--) {
		if (messages[i].role === 'assistant') {
			count++;
		} else {
			break;
		}
	}

	return count;
}

export function useChat({
	api = '/api/chat',
	id,
	initialMessages = [],
	initialInput = '',
	sendExtraMessageFields,
	experimental_onFunctionCall,
	experimental_onToolCall,
	streamMode,
	streamProtocol,
	onResponse,
	onFinish,
	onError,
	onToolCall,
	credentials,
	headers,
	body,
	generateId = generateIdFunc,
	fetch,
	keepLastMessageOnError = false,
	maxToolRoundtrips = 0
}: UseChatOptions = {}): UseChatHelpers & {
	addToolResult: ({ toolCallId, result }: { toolCallId: string; result: any }) => void;
} {
	if (streamMode) {
		streamProtocol ??= streamMode === 'text' ? 'text' : undefined;
	}

	const chatId = id || `chat-${uniqueId++}`;

	const key = `${api}|${chatId}`;

	const data = writable<Message[]>(initialMessages);
	const streamData = writable<JSONValue[] | undefined>(undefined);
	const loading = writable<boolean>(false);
	const error = writable<undefined | Error>(undefined);

	const mutate = (newData: Message[]) => {
		store[key] = newData;
		data.set(newData);
	};

	const messages = data as Writable<Message[]>;

	let abortController: AbortController | null = null;

	const extraMetadata = {
		credentials,
		headers,
		body
	};

	async function triggerRequest(chatRequest: ChatRequest) {
		const messagesSnapshot = get(messages);
		const messageCount = messagesSnapshot.length;

		try {
			error.set(undefined);
			loading.set(true);
			abortController = new AbortController();

			await processChatStream({
				getStreamedResponse: () =>
					getStreamedResponse(
						api,
						chatRequest,
						mutate,
						(data) => {
							streamData.set(data);
						},
						get(streamData),
						extraMetadata,
						get(messages),
						abortController,
						generateId,
						streamProtocol,
						onFinish,
						onResponse,
						onToolCall,
						sendExtraMessageFields,
						fetch,
						keepLastMessageOnError
					),
				experimental_onFunctionCall,
				experimental_onToolCall,
				updateChatRequest: (chatRequestParam) => {
					chatRequest = chatRequestParam;
				},
				getCurrentMessages: () => get(messages)
			});

			abortController = null;
		} catch (err) {
			if ((err as any).name === 'AbortError') {
				abortController = null;
				return null;
			}

			if (onError && err instanceof Error) {
				onError(err);
			}

			error.set(err as Error);
		} finally {
			loading.set(false);
		}

		const newMessagesSnapshot = get(messages);
		const lastMessage = newMessagesSnapshot[newMessagesSnapshot.length - 1];

		if (
			newMessagesSnapshot.length > messageCount &&
			lastMessage != null &&
			maxToolRoundtrips > 0 &&
			isAssistantMessageWithCompletedToolCalls(lastMessage) &&
			countTrailingAssistantMessages(newMessagesSnapshot) <= maxToolRoundtrips
		) {
			await triggerRequest({ messages: newMessagesSnapshot });
		}
	}

	const append: UseChatHelpers['append'] = async (
		message: Message | CreateMessage,
		{
			options,
			functions,
			function_call,
			tools,
			tool_choice,
			data,
			headers,
			body
		}: ChatRequestOptions = {}
	) => {
		if (!message.id) {
			message.id = generateId();
		}

		const requestOptions = {
			headers: headers ?? options?.headers,
			body: body ?? options?.body
		};

		const chatRequest: ChatRequest = {
			messages: get(messages).concat(message as Message),
			options: requestOptions,
			headers: requestOptions.headers,
			body: requestOptions.body,
			data,
			...(functions !== undefined && { functions }),
			...(function_call !== undefined && { function_call }),
			...(tools !== undefined && { tools }),
			...(tool_choice !== undefined && { tool_choice })
		};
		return triggerRequest(chatRequest);
	};

	const reload: UseChatHelpers['reload'] = async ({
		options,
		functions,
		function_call,
		tools,
		tool_choice,
		data,
		headers,
		body
	}: ChatRequestOptions = {}) => {
		const messagesSnapshot = get(messages);
		if (messagesSnapshot.length === 0) return null;

		const requestOptions = {
			headers: headers ?? options?.headers,
			body: body ?? options?.body
		};

		const lastMessage = messagesSnapshot.at(-1);
		if (lastMessage?.role === 'assistant') {
			const chatRequest: ChatRequest = {
				messages: messagesSnapshot.slice(0, -1),
				options: requestOptions,
				headers: requestOptions.headers,
				body: requestOptions.body,
				data,
				...(functions !== undefined && { functions }),
				...(function_call !== undefined && { function_call }),
				...(tools !== undefined && { tools }),
				...(tool_choice !== undefined && { tool_choice })
			};

			return triggerRequest(chatRequest);
		}

		const chatRequest: ChatRequest = {
			messages: messagesSnapshot,
			options: requestOptions,
			headers: requestOptions.headers,
			body: requestOptions.body,
			data
		};

		return triggerRequest(chatRequest);
	};

	const stop = () => {
		if (abortController) {
			abortController.abort();
			abortController = null;
		}
	};

	const setMessages = (messagesArg: Message[] | ((messages: Message[]) => Message[])) => {
		if (typeof messagesArg === 'function') {
			messagesArg = messagesArg(get(messages));
		}

		mutate(messagesArg);
	};

	const input = writable(initialInput);

	const handleSubmit = (
		event?: { preventDefault?: () => void },
		options: ChatRequestOptions = {}
	) => {
		event?.preventDefault?.();
		const inputValue = get(input);

		if (!inputValue && !options.allowEmptySubmit) return;

		const requestOptions = {
			headers: options.headers ?? options.options?.headers,
			body: options.body ?? options.options?.body
		};

		const chatRequest: ChatRequest = {
			messages:
				!inputValue && options.allowEmptySubmit
					? get(messages)
					: get(messages).concat({
							id: generateId(),
							content: inputValue,
							role: 'user',
							createdAt: new Date()
						} as Message),
			options: requestOptions,
			body: requestOptions.body,
			headers: requestOptions.headers,
			data: options.data
		};

		triggerRequest(chatRequest);

		input.set('');
	};

	const isLoading = derived([loading], ([$loading]) => {
		return $loading;
	});

	const addToolResult = ({ toolCallId, result }: { toolCallId: string; result: any }) => {
		const messagesSnapshot = get(messages) ?? [];
		const updatedMessages = messagesSnapshot.map((message, index, arr) =>
			index === arr.length - 1 && message.role === 'assistant' && message.toolInvocations
				? {
						...message,
						toolInvocations: message.toolInvocations.map((toolInvocation) =>
							toolInvocation.toolCallId === toolCallId
								? { ...toolInvocation, result }
								: toolInvocation
						)
					}
				: message
		);

		messages.set(updatedMessages);

		const lastMessage = updatedMessages[updatedMessages.length - 1];

		if (isAssistantMessageWithCompletedToolCalls(lastMessage)) {
			triggerRequest({ messages: updatedMessages });
		}
	};

	return {
		messages,
		error,
		append,
		reload,
		stop,
		setMessages,
		input,
		handleSubmit,
		isLoading,
		data: streamData,
		addToolResult
	};
}
