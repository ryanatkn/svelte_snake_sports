<script lang="ts">
	import {writable, type Writable} from 'svelte/store';
	import {base} from '$app/paths';

	import SnakeGame from '$lib/SnakeGame.svelte';
	import Gamespace from '$lib/Gamespace.svelte';
	import DomRenderer from '$lib/renderers/dom/DomRenderer.svelte';
	import {createClock, setClock} from '$lib/clock';
	import Settings from '$lib/Settings.svelte';
	import Stats from '$lib/Stats.svelte';
	import {toDefaultGameState, type SnakeGameState} from '$lib/SnakeGameState';
	import {initGameState, spawnRandomTrail, updateSnakeGameState} from '$lib/updateSnakeGameState';
	import Ticker from '$lib/Ticker.svelte';
	import StageControls from '$lib/StageControls.svelte';
	import EatenOrTimedScores from '$lib/EatenOrTimedScores.svelte';
	import ReadyInstructions from '$lib/sports/trailsss/ReadyInstructions.svelte';
	import WinInstructions from '$lib/sports/trailsss/WinInstructions.svelte';
	import TextBurst from '$lib/TextBurst.svelte';
	import ScaledSnakeRenderer from '$lib/ScaledSnakeRenderer.svelte';
	import ControlsInstructions from '$lib/ControlsInstructions.svelte';
	import {setCurrentTickDuration, type ISnakeGame} from '$lib/SnakeGame';
	import GameAudio from '$lib/GameAudio.svelte';
	import Dimensions from '$lib/Dimensions.svelte';
	import {assertObject, getFromStorage, setInStorage} from '$lib/storage';

	const storageKey = 'trailsss_high_score';
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
	export const baseTickDuration = writable(Math.round(1000 / 2)); // the starting tick duration, may be modified by gameplay
	export const currentTickDuration = setCurrentTickDuration(writable($baseTickDuration));
	export const tickDurationDecay = writable(0.985);
	export const tickDurationMin = writable(17);
	export const tickDurationMax = writable(2000);

	let rendererWidth: Writable<number> | undefined;
	let autoAspectRatio: Writable<boolean> | undefined;
	let aspectRatio: Writable<number> | undefined;

	let applesEaten = 0; // maybe should be `currentApplesEaten`, or `currentTime` should be `time`
	let applesEatenStreak = 0;
	let applelessTurns = 0;
	const APPLES_EATEN_TO_WIN = 66; // sixxty six applesss

	const restart = (): void => {
		if (!game) return;
		game.reset();
		game.start();
	};

	let currentTime = 0;
	$: if ($status === 'playing') currentTime += $clock.dt;

	interface EatenOrTimedHighscores {
		time: number | null;
		applesEaten: number | null;
	}
	const assertEatenOrTimedHighscores = (value: any): asserts value is EatenOrTimedHighscores => {
		assertObject(value);
		// TODO zod?
	};

	const highscores = writable(
		getFromStorage<EatenOrTimedHighscores>(storageKey, assertEatenOrTimedHighscores) ?? {
			time: null,
			applesEaten: null,
		},
	);

	const tick = (): boolean => {
		if (!game || !$state || !$events || $status !== 'playing') {
			return false;
		}

		// TODO maybe serialize input state as param instead of `game`?
		$state = updateSnakeGameState($state, game);

		let ateApple = false;

		for (const event of $events) {
			switch (event.name) {
				case 'eat_apple': {
					applesEaten++;
					applesEatenStreak++;
					ateApple = true;
					break;
				}
			}
		}

		if (!ateApple) {
			applesEatenStreak = 0;
			applelessTurns++;
			game.resetMovementCommands();
		}

		if (applesEaten >= APPLES_EATEN_TO_WIN) {
			if (applelessTurns) {
				game.end('win');
			} // else the user has played flawlessly, so continue until they make a mistake or run out of tiles.

			// Update highscores.
			const time = Math.round(currentTime);
			if (!$highscores.time || time <= $highscores.time) {
				$highscores = {...$highscores, time};
				setInStorage(storageKey, $highscores); // TODO enhanced store enables removing this line
			}
			if (
				applesEaten > APPLES_EATEN_TO_WIN &&
				(!$highscores.applesEaten || applesEaten >= $highscores.applesEaten)
			) {
				$highscores = {...$highscores, applesEaten};
				setInStorage(storageKey, $highscores); // TODO enhanced store enables removing this line
			}
		}

		$currentTickDuration = Math.max(
			$tickDurationMin,
			Math.min(
				$tickDurationMax,
				Math.round($baseTickDuration * $tickDurationDecay ** applesEatenStreak),
			),
		);

		return true;
	};

	const TRAIL_LENGTH = 3; // TODO expose as setting for users to modify

	// TODO hacky, the `game` may be undefined because `toInitialState` is called before `game` is available
	const spawnApples = (state: SnakeGameState, game: ISnakeGame | undefined): void => {
		// TODO was a computed property but we needed it to synchronously update during `game.reset()`
		const trailLength =
			applelessTurns === 0
				? Math.min(TRAIL_LENGTH, APPLES_EATEN_TO_WIN)
				: Math.min(TRAIL_LENGTH, APPLES_EATEN_TO_WIN - applesEaten - 1);
		const spawned = spawnRandomTrail(state, game, trailLength);
		// As a failsafe, if we can't spawn anything and there's no apples left, end the game.
		if (!spawned && !state.apples.length) {
			game?.end('win');
		}
	};
</script>

<Dimensions {dimensions} />

<div
	class="TrailsssSnake"
	class:game-win={$status === 'win'}
	class:game-ready={$status === 'ready'}
>
	<SnakeGame
		bind:this={game}
		{storageKey}
		{tick}
		onReset={() => {
			$currentTickDuration = $baseTickDuration;
			currentTime = 0;
			applesEaten = 0;
			applesEatenStreak = 0;
			applelessTurns = 0;
		}}
		toInitialState={() => {
			const state = initGameState(toDefaultGameState({mapWidth, mapHeight}));
			// spawn the apples
			state.apples.length = 0;
			spawnApples(state, game);
			return state;
		}}
		{spawnApples}
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
					<ReadyInstructions {highscores} applesToWin={APPLES_EATEN_TO_WIN} />
				{:else if $status === 'win'}
					<WinInstructions
						{highscores}
						time={currentTime}
						{applesEaten}
						applesToWin={APPLES_EATEN_TO_WIN}
						{restart}
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
				<div class="box row">
					<Ticker {clock} tickDuration={currentTickDuration} {tick} />
					<EatenOrTimedScores
						{applesEaten}
						highestApplesEaten={$highscores.applesEaten}
						applesToWin={APPLES_EATEN_TO_WIN}
						{currentTime}
						bestTime={$highscores.time}
						{rendererWidth}
					/>
				</div>
				<StageControls {clock} {tick} {game} />
				<section class="panel" style:padding="var(--space_xl)">
					<ControlsInstructions />
				</section>
				<section class="box prose">
					<p>
						<a href="https://www.serpentsoundstudios.com/">Alexander Nakarada</a> -
						<a href="{base}/assets/Alexander_Nakarada__Horde_of_Geese.mp3">Horde of Geese</a>
					</p>
					<GameAudio
						song="{base}/assets/Alexander_Nakarada__Horde_of_Geese.mp3"
						bind:this={audio}
					/>
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
	.TrailsssSnake {
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
