<script lang="ts">
	import { useChat, type Message } from '$public/svelteAi';
	import { marked } from 'marked';
	import autoAnimate from '@formkit/auto-animate';
	import { tick } from 'svelte';
	import { selectedModel, selectedPersona } from '$lib/stores';

	const defaultMessages: Message[] = [
		{
			id: '0',
			role: 'assistant',
			content: `Hey there! 🌟 How's it going Nate?`
		}
	];

	const { input, handleSubmit, messages, isLoading, stop } = $derived(
		useChat({
			initialMessages: defaultMessages,
			body: { model: $selectedModel, persona: $selectedPersona }
		})
	);

	let textareaElement: any;
	let viewport: any;

	// Adjust the height of the textarea based on its content
	function autoResize() {
		textareaElement.style.height = 'auto';
		textareaElement.style.height = textareaElement.scrollHeight + 'px';
	}

	// Handle enter key press to submit the form
	function handleKeyDown(event: KeyboardEvent) {
		if (event.key === 'Enter' && !event.shiftKey) {
			event.preventDefault();
			handleSubmit();
		}
	}

	$effect.pre(() => {
		$messages;

		const autoscroll =
			viewport && viewport.offsetHeight + viewport.scrollTop > viewport.scrollHeight - 50;

		if (autoscroll) {
			tick().then(() => {
				viewport.scrollTo(0, viewport.scrollHeight);
			});
		}
	});
</script>

{#snippet chatInput()}
	<div class="mx-auto px-4 sm:px-6 lg:px-8 w-full">
		<div class="flex justify-between items-center mb-3 pt-2">
			<div>
				<select bind:value={$selectedModel} class="mr-2 p-2 border rounded">
					<option value="gpt-4o">gpt-4o</option>
					<option value="gpt-3.5-turbo">gpt-3.5-turbo</option>
					<option value="gpt-4o-mini">gpt-4o-mini</option>
				</select>
				<select bind:value={$selectedPersona} class="mr-2 p-2 border rounded">
					<option value="snoop">Snoop Dogg</option>
					<option value="shakespeare">Shakespeare</option>
					<option value="yoda">Yoda</option>
				</select>
			</div>
			<button
				onclick={() => {
					$messages = [...defaultMessages];
				}}
				type="button"
				class="inline-flex justify-center items-center gap-x-2 rounded-lg font-medium text-gray-800 hover:text-primary focus:outline-none focus:text-primary text-xs sm:text-sm"
			>
				<svg
					class="shrink-0 size-4"
					xmlns="http://www.w3.org/2000/svg"
					width="24"
					height="24"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"><path d="M5 12h14" /><path d="M12 5v14" /></svg
				>
				New chat
			</button>

			{#if $isLoading}
				<button
					onclick={() => {
						stop();
					}}
					type="button"
					class="py-1.5 px-2 inline-flex items-center gap-x-2 text-xs font-medium rounded-lg border border-gray-200 bg-white text-gray-800 shadow-sm hover:bg-gray-50 focus:outline-none focus:bg-gray-50 disabled:opacity-50 disabled:pointer-events-none"
				>
					<svg
						class="size-3 text-secondary"
						xmlns="http://www.w3.org/2000/svg"
						width="16"
						height="16"
						fill="currentColor"
						viewBox="0 0 16 16"
					>
						<path
							d="M5 3.5h6A1.5 1.5 0 0 1 12.5 5v6a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 11V5A1.5 1.5 0 0 1 5 3.5z"
						/>
					</svg>
					Stop generating
				</button>
			{/if}
		</div>

		<!-- Input -->
		<form onsubmit={handleSubmit} class="relative w-full">
			<textarea
				oninput={autoResize}
				onkeydown={handleKeyDown}
				bind:this={textareaElement}
				bind:value={$input}
				class="py-3 px-4 pr-10 block w-full h-auto border-gray-200 rounded-lg text-sm focus:border-primary focus:ring-primary focus:outline-none resize-none overflow-hidden"
				placeholder="Ask me anything..."
				rows="1"
			></textarea>

			<!-- Toolbar -->
			<div class="absolute right-2 bottom-1.5 flex items-center space-x-2">
				<!-- Mic Button -->
				<!-- <button
					type="button"
					class="inline-flex shrink-0 justify-center items-center size-8 rounded-lg text-gray-500 hover:bg-gray-100 focus:z-10 focus:outline-none focus:bg-gray-100"
				>
					<svg
						class="shrink-0 size-4"
						xmlns="http://www.w3.org/2000/svg"
						width="24"
						height="24"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
						><rect width="18" height="18" x="3" y="3" rx="2" /><line
							x1="9"
							x2="15"
							y1="15"
							y2="9"
						/></svg
					>
				</button> -->
				<!-- End Mic Button -->

				<!-- Send Button -->
				<button
					type="submit"
					class="inline-flex shrink-0 justify-center items-center size-8 rounded-lg text-white bg-primary sm:hover:bg-secondary focus:z-10 focus:outline-none focus:bg-primary"
				>
					<svg
						class="shrink-0 size-4"
						xmlns="http://www.w3.org/2000/svg"
						width="24"
						height="24"
						fill="currentColor"
						viewBox="0 0 16 16"
					>
						<path
							d="M15.964.686a.5.5 0 0 0-.65-.65L.767 5.855H.766l-.452.18a.5.5 0 0 0-.082.887l.41.26.001.002 4.995 3.178 3.178 4.995.002.002.26.41a.5.5 0 0 0 .886-.083l6-15Zm-1.833 1.89L6.637 10.07l-.215-.338a.5.5 0 0 0-.154-.154l-.338-.215 7.494-7.494 1.178-.471-.47 1.178Z"
						/>
					</svg>
				</button>
				<!-- End Send Button -->
			</div>
			<!-- End Toolbar -->
		</form>
		<!-- End Input -->
	</div>
	<!-- End Textarea -->
{/snippet}

{#snippet chatThread()}
	<div bind:this={viewport} class="flex-1 overflow-y-auto p-4 pb-4 sm:p-6">
		<ul use:autoAnimate class="space-y-2">
			{#each $messages as message}
				{#if !message?.toolInvocations}
					{#if message.role === 'user'}
						<li class="flex justify-end">
							<div
								class="mb-2 p-3 sm:p-4 rounded-lg bg-primary text-white max-w-xs sm:max-w-md lg:max-w-lg xl:max-w-2xl break-words prose-sm sm:prose-base"
							>
								{@html message.content}
							</div>
						</li>
					{:else}
						<li class="flex justify-start w-full">
							<div
								class="mb-2 p-3 sm:p-4 rounded-lg bg-gray-200 text-black max-w-none w-full sm:max-w-md lg:max-w-lg xl:max-w-2xl break-words prose-sm sm:prose-base overflow-hidden"
							>
								{@html marked.parse(message.content)}
							</div>
						</li>
					{/if}
				{/if}
			{/each}
		</ul>
	</div>
{/snippet}

{#if $messages}
	<!-- {#if $chatType === 'general'}
		{@render chatThread()}
		{@render chatInput()}
	{:else if $chatType === 'incident'} -->
	<div class="flex flex-col h-full overscroll-contain">
		{@render chatThread()}
		{@render chatInput()}
	</div>
	<!-- {/if} -->
{/if}

<style>
	/* Adding custom styles for Tailwind */
	.textarea-no-focus-outline:focus {
		border: none;
		outline: none;
		box-shadow: none;
	}
	textarea {
		font-size: 16px; /* Ensure the font size is 16px to prevent zoom */
		resize: none; /* Prevent resizing of textarea by the user */
	}
</style>
