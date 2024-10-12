<script lang="ts">
	import '../app.pcss';
	import Fonts from '$components/Fonts.svelte';
	let { children } = $props();
</script>
{@render children()}


<Fonts />
