<script>
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<script src="https://www.google.com/jsapi"></script>
</svelte:head>

{@render children()}
