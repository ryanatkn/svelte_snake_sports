<script lang="ts">
	// import Breadcrumbs from '@ryanatkn/fuz/Breadcrumbs.svelte';
	import {base} from '$app/paths';

	import ClasssicSnake from '$lib/sports/classsic/ClasssicSnake.svelte';
	import TitleImage from '$lib/TitleImage.svelte';
	import Footer from '$lib/Footer.svelte';
</script>

<svelte:head>
	<title>svelte🐍snake🐍sports: classsic</title>
</svelte:head>

<TitleImage
	alt="logo for svelte🐍snake🐍sports: classsic, macro photography of an adorable cartoon snake with big eyes next to a red apple on lush green moss in a realistic 3d video game in the style of Tim Burton"
	src="{base}/assets/classsic.webp"
/>

<ClasssicSnake />

<Footer />
