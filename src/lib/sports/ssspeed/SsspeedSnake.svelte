<script lang="ts">
	import {writable, type Writable} from 'svelte/store';
	import {base} from '$app/paths';

	import SnakeGame from '$lib/SnakeGame.svelte';
	import Gamespace from '$lib/Gamespace.svelte';
	import DomRenderer from '$lib/renderers/dom/DomRenderer.svelte';
	import {createClock, setClock} from '$lib/clock';
	import Settings from '$lib/Settings.svelte';
	import Stats from '$lib/Stats.svelte';
	import {toDefaultGameState} from '$lib/SnakeGameState';
	import {initGameState, spawnApples, updateSnakeGameState} from '$lib/updateSnakeGameState';
	import Ticker from '$lib/Ticker.svelte';
	import StageControls from '$lib/StageControls.svelte';
	import TimedScores from '$lib/TimedScores.svelte';
	import ReadyInstructions from '$lib/sports/ssspeed/ReadyInstructions.svelte';
	import WinInstructions from '$lib/sports/ssspeed/WinInstructions.svelte';
	import TextBurst from '$lib/TextBurst.svelte';
	import ScaledSnakeRenderer from '$lib/ScaledSnakeRenderer.svelte';
	import ControlsInstructions from '$lib/ControlsInstructions.svelte';
	import {setCurrentTickDuration} from '$lib/SnakeGame';
	import GameAudio from '$lib/GameAudio.svelte';
	import Dimensions from '$lib/Dimensions.svelte';
	import {assertNumber, getFromStorage, setInStorage} from '$lib/storage';

	const storageKey = 'ssspeed_high_score';
	const clock = setClock(createClock({running: true}));
	const dimensions = writable({width: 0, height: 0});

	export let game: SnakeGame | undefined = undefined;
	export let audio: GameAudio | undefined = undefined;

	// TODO refactor all of this, lots of copypaste
	export let pointerDown = false;
	export let pointerX: number | undefined = undefined;
	export let pointerY: number | undefined = undefined;
	let snakeX: number;
	let snakeY: number;
	$: if (game && pointerDown && pointerX !== undefined && pointerY !== undefined) {
		if (applesEaten === 0) game.start(); // TODO hacky
		game.handlePointerInput(snakeX, snakeY, pointerX, pointerY);
	}

	let showSettings = false;

	$: state = game?.state;
	$: mapWidth = $state?.mapWidth;
	$: mapHeight = $state?.mapHeight;
	$: events = game?.events;
	$: status = game?.status;

	// TODO refactor with the other impls
	// TODO maybe these shouldn't be stores? or maybe the tick logic should be extracted to a single store/object?
	export const baseTickDuration = writable(Math.round(1000 / 6)); // the starting tick duration, may be modified by gameplay
	export const currentTickDuration = setCurrentTickDuration(writable($baseTickDuration));
	export const tickDurationDecay = writable(0.5);
	export const tickDurationMin = writable(17);
	export const tickDurationMax = writable(2000);

	let rendererWidth: Writable<number> | undefined;
	let autoAspectRatio: Writable<boolean> | undefined;
	let aspectRatio: Writable<number> | undefined;

	let applesEaten = 0;
	let applesEatenSinceCollision = 0;
	const APPLES_EATEN_TO_WIN = 66; // sixxty six applesss

	const restart = (): void => {
		if (!game) return;
		game.reset();
		game.start();
	};

	let currentTime = 0;
	$: if ($status === 'playing') currentTime += $clock.dt;

	const bestTime = writable(getFromStorage(storageKey, assertNumber) ?? null);

	const tick = (): boolean => {
		if (!game || !$state || !$events || $status !== 'playing') {
			return false;
		}

		// TODO maybe serialize input state as param instead of `game`?
		$state = updateSnakeGameState($state, game);

		for (const event of $events) {
			switch (event.name) {
				case 'eat_apple': {
					applesEaten++;
					applesEatenSinceCollision++;
					$currentTickDuration *= $tickDurationDecay ** (1 / applesEatenSinceCollision ** 1.7);
					break;
				}
				case 'snake_collide_self':
				case 'snake_collide_bounds': {
					// TODO maybe display some damaged status?
					$currentTickDuration = $baseTickDuration;
					applesEatenSinceCollision = 0;
					game.resetMovementCommands();
					break;
				}
			}
		}

		if (applesEaten >= APPLES_EATEN_TO_WIN) {
			game.end('win');
			// TODO maybe an event instead? maybe like classsic,
			// don't set the high score immediately like this, wait til it's over
			if (!$bestTime || currentTime < $bestTime) {
				$bestTime = Math.round(currentTime);
				setInStorage(storageKey, $bestTime);
			}
		}

		return true;
	};
</script>

<Dimensions {dimensions} />

<div class="SsspeedSnake" class:game-win={$status === 'win'} class:game-ready={$status === 'ready'}>
	<SnakeGame
		bind:this={game}
		{storageKey}
		toInitialState={() => initGameState(toDefaultGameState({mapWidth, mapHeight}))}
		{tick}
		onReset={() => {
			$currentTickDuration = $baseTickDuration;
			currentTime = 0;
			applesEaten = 0;
			applesEatenSinceCollision = 0;
		}}
		spawnApples={(state, game) => {
			if (state.apples.length + applesEaten + 1 < APPLES_EATEN_TO_WIN) {
				return spawnApples(state, game);
			}
		}}
	/>
	{#if game}
		<Gamespace bind:pointerDown bind:pointerX bind:pointerY>
			<!-- TODO `marginBottom={100}` is hardcoding the scores height -->
			<ScaledSnakeRenderer
				{dimensions}
				marginBottom={100}
				bind:rendererWidth
				bind:autoAspectRatio
				bind:aspectRatio
				let:worldWidth
				let:worldHeight
			>
				<DomRenderer {game} width={worldWidth} height={worldHeight} bind:snakeX bind:snakeY />
			</ScaledSnakeRenderer>
			<svelte:fragment slot="overlay">
				{#if applesEaten === 0}
					<ReadyInstructions {bestTime} applesToWin={APPLES_EATEN_TO_WIN} />
				{:else if $status === 'win'}
					<WinInstructions
						{restart}
						time={currentTime}
						{bestTime}
						applesToWin={APPLES_EATEN_TO_WIN}
					>
						<div class="text-burst-wrapper">
							<TextBurst count={50} items={['🐍', '🐍', '🌸', '🌺']} hueRotationMax={360} />
						</div>
					</WinInstructions>
				{/if}
			</svelte:fragment>
		</Gamespace>
		{#if rendererWidth && autoAspectRatio && aspectRatio}
			<div class="info">
				<Ticker {clock} tickDuration={currentTickDuration} {tick} />
				<TimedScores
					{applesEaten}
					applesToWin={APPLES_EATEN_TO_WIN}
					{currentTime}
					bestTime={$bestTime}
					{rendererWidth}
				/>
				<StageControls {clock} {tick} {game} />
				<section class="panel" style:padding="var(--space_xl)">
					<ControlsInstructions />
				</section>
				<section class="box prose">
					<p>
						<a href="https://www.serpentsoundstudios.com/">Alexander Nakarada</a> -
						<a href="{base}/assets/Alexander_Nakarada__Lurking_Sloth.mp3">Lurking Sloth</a>
					</p>
					<GameAudio song="{base}/assets/Alexander_Nakarada__Lurking_Sloth.mp3" bind:this={audio} />
				</section>
				<section class="box">
					<button on:click={() => (showSettings = !showSettings)}
						>{#if showSettings}stash settings{:else}show settings{/if}</button
					>
					{#if showSettings}
						<Stats {game} tickDuration={currentTickDuration} />
						<Settings
							{game}
							{baseTickDuration}
							{tickDurationMin}
							{tickDurationMax}
							{tickDurationDecay}
							{autoAspectRatio}
							{aspectRatio}
						/>
					{/if}
				</section>
			</div>
		{/if}
	{/if}
</div>

<style>
	.SsspeedSnake {
		display: flex;
		justify-content: center;
		flex-direction: column;
		align-items: center;
	}
	section {
		padding-top: var(--space_xl5);
	}
	.text-burst-wrapper {
		font-size: var(--size_xl5);
		position: absolute;
		/* TODO hacky positioning */
		left: 6rem;
		top: 2rem;
		width: 0;
		height: 0;
	}
	/* TODO better name for this? */
	.info {
		position: relative;
		display: flex;
		flex-direction: column;
		align-items: center;
	}
</style>
