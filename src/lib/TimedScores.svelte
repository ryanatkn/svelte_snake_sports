<script lang="ts">
	import type {Writable} from 'svelte/store';

	import Score from '$lib/Score.svelte';

	// TODO rename this module

	export let applesEaten: number;
	export let applesToWin: number;
	export let currentTime: number;
	export let bestTime: number | null;
	export let rendererWidth: Writable<number>;

	const APPLE_SIZE = 16;

	// TODO pull from a memoized object cache, using the same lazy cloning pattern -- you'd have to memoize by the several deps
	$: apples = Array.from({length: applesEaten}, (_, i) => {
		const pct = (i + 1) / applesToWin;
		const xOffset = APPLE_SIZE;
		const halfRendererWidth = $rendererWidth / 2;
		return {
			id: i,
			// alternate spawning one left and right
			x:
				i % 2 === 0
					? pct * halfRendererWidth - xOffset
					: (1 - pct) * halfRendererWidth - xOffset + halfRendererWidth,
			y: 0,
			width: APPLE_SIZE,
			height: APPLE_SIZE,
			scale: 0.62 + 0.38 * Math.cos(i * 0.1),
			eaten: applesEaten > i,
		};
	});

	$: currentTimeSeconds = Math.floor(currentTime / 1000);
	$: bestTimeSeconds = bestTime !== null ? Math.floor(bestTime / 1000) : null;
	$: bestTimeMs = bestTime !== null ? Math.round(bestTime) : null;
</script>

<div class="progress">
	<div class="apples" style:width="{$rendererWidth}px">
		{#each apples as apple (apple.id)}
			<div
				class="apple-wrapper"
				style:transform="translate3d({apple.x}px, {apple.y}px, 0) scale3d({apple.scale},
				{apple.scale}, 1)"
			>
				<div
					class="apple"
					class:eaten={apple.eaten}
					style:width="{apple.width}px"
					style:height="{apple.height}px"
				/>
			</div>
		{/each}
	</div>
	<div class="box row">
		<div
			class="time"
			title="{currentTimeSeconds} second{currentTimeSeconds === 1 ? ' has' : 's have'} elapsed"
		>
			{currentTimeSeconds}s
		</div>
		<div class="count">
			<Score
				title="{applesEaten} of {applesToWin} apples eaten"
				progressKey={applesEaten === 0 ? undefined : applesEaten}
			>
				<div>{applesEaten}/{applesToWin}</div>
			</Score>
		</div>
		{#if bestTimeSeconds !== null}
			<div class="time" title="best time is {bestTimeMs}ms">{bestTimeSeconds}s</div>
		{/if}
	</div>
</div>

<style>
	.progress {
		display: flex;
		align-items: center;
		justify-content: center;
		flex-direction: column;
		font-size: var(--size_xl3);
		width: calc(var(--map_width) * 1px);
	}

	.count {
		display: flex;
		align-items: center;
		padding: 0 var(--space_lg);
	}

	.time {
		padding: var(--space_xl);
		font-weight: 600;
	}

	.apples {
		width: 100%;
		position: relative;
		display: flex;
		padding-top: var(--space_xl);
	}
	.apple-wrapper {
		position: absolute;
		left: 0;
		top: 0;
	}
	.apple {
		animation: pop-in 0.33s cubic-bezier(0.26, 0.41, 0.6, 2.32);
	}
	.apple.eaten {
		opacity: 1;
	}
</style>
