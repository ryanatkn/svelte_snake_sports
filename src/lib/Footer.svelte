<script lang="ts">
	import {base} from '$app/paths';
	import {page} from '$app/stores';
	import {strip_end} from '@ryanatkn/belt/string.js';
</script>

<footer class="box width_sm">
	<div class="panel p_md prose">
		<p>
			<a href="https://github.com/ryanatkn/svelte-snake-sports">ssource code & creditss on GitHub</a
			>
		</p>
		<p>
			music by Alexander Nakarada
			<br />
			<a href="https://creativecommons.org/licenses/by/4.0/">CC-BY-4.0</a> ∙
			<a href="https://www.serpentsoundstudios.com/">serpentsoundstudios.com</a>
		</p>
		<p>
			generated images by <a href="https://wikipedia.org/wiki/DALL-E">DALL-E</a>
		</p>
		{#if strip_end($page.url.pathname, '/') !== base}
			<p>
				<a href={base || '/'} class="back-link"
					>go back home<br />
					<div class="snake">🐍</div></a
				>
			</p>
		{/if}
	</div>
	<!-- TODO fix -->
	<!-- <div class="p_xl"> -->
	<!-- <Breadcrumbs basePath={base}>🐍</Breadcrumbs> -->
	<!-- </div> -->
</footer>

<style>
	footer {
		position: relative; /* hacky, needed so the game's Surface doesn't overlap it */
		text-align: center;
	}
	.back-link {
		display: flex;
		align-items: center;
		justify-content: center;
		flex-direction: column;
	}
	.snake {
		font-size: var(--size_xl5);
	}
</style>
