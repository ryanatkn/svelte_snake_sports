<script lang="ts">
	import type {Clock} from '$lib/clock';
	import ClockControls from '$lib/ClockControls.svelte';
	import DirectionalControls from '$lib/DirectionalControls.svelte';
	import MovementCommandQueue from '$lib/MovementCommandQueue.svelte';
	import Hotkeys from '$lib/Hotkeys.svelte';
	import type SnakeGame from '$lib/SnakeGame.svelte';
	import {askToClearLocalStorage} from '$lib/storage';

	export let clock: Clock;
	export let tick: () => void;
	export let game: SnakeGame;

	$: ({
		movementCommandQueue,
		enqueueMovementCommand,
		MOVEMENT_COMMAND_QUEUE_SIZE,
		status,
		setMovementCommand,
		start,
		reset,
	} = game);
	$: currentCommand = $movementCommandQueue?.[0];
</script>

<div class="controls panel">
	<div class="box row">
		<DirectionalControls
			selectedDirection={currentCommand}
			select={(d) => enqueueMovementCommand(d)}
		/>
		{#if movementCommandQueue}
			<div class="p_md">
				<MovementCommandQueue {movementCommandQueue} queueSize={MOVEMENT_COMMAND_QUEUE_SIZE} />
			</div>
		{/if}
	</div>
	<div class="box row">
		<button title="[r] restart game" class="icon-button" on:click={reset}>⏮</button>
		<ClockControls {clock} />
		<button title="[1] next turn" class="icon-button" on:click={tick}>⏩</button>
	</div>
</div>

<Hotkeys
	onKeydown={(key, ctrlKey, altKey, shiftKey) => {
		if (ctrlKey || altKey) return false;
		switch (key) {
			case '`': {
				clock.toggle();
				return true;
			}
			case '1': {
				tick();
				return true;
			}
			case '2': {
				tick();
				tick();
				return true;
			}
			case '0': {
				askToClearLocalStorage(game.storageKey);
				return true;
			}
			case '3': {
				for (let i = 0; i < 10; i++) tick();
				return true;
			}
			case 'g':
			case 'r': {
				reset();
				return true;
			}
			case 'ArrowUp':
			case 'w':
			case 'k':
			case 'W':
			case 'K': {
				if ($status === 'win' || $status === 'fail' || ($status === 'ready' && !start())) {
					return true;
				}
				if (shiftKey) {
					setMovementCommand('up');
					tick();
				} else {
					enqueueMovementCommand('up');
				}
				return true;
			}
			case 'ArrowDown':
			case 's':
			case 'j':
			case 'S':
			case 'J': {
				if ($status === 'win' || $status === 'fail' || ($status === 'ready' && !start())) {
					return true;
				}
				if (shiftKey) {
					setMovementCommand('down');
					tick();
				} else {
					enqueueMovementCommand('down');
				}
				return true;
			}
			case 'ArrowLeft':
			case 'a':
			case 'h':
			case 'A':
			case 'H': {
				if ($status === 'win' || $status === 'fail' || ($status === 'ready' && !start())) {
					return true;
				}
				if (shiftKey) {
					setMovementCommand('left');
					tick();
				} else {
					enqueueMovementCommand('left');
				}
				return true;
			}
			case 'ArrowRight':
			case 'd':
			case 'l':
			case 'D':
			case 'L': {
				if ($status === 'win' || $status === 'fail' || ($status === 'ready' && !start())) {
					return true;
				}
				if (shiftKey) {
					setMovementCommand('right');
					tick();
				} else {
					enqueueMovementCommand('right');
				}
				return true;
			}
		}
		return false;
	}}
/>

<style>
	.controls {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: center;
		padding: var(--space_md);
		margin-bottom: var(--space_xl2);
	}
</style>
