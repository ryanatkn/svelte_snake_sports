<script lang="ts">
	import {writable} from 'svelte/store';
	import {randomInt} from '@feltcoop/felt/util/random.js';
	import {browser} from '$app/env';
	import {ENTITY_DEFAULT_WIDTH, ENTITY_DEFAULT_HEIGHT, Entity, type Direction} from './Entity';

	const MOVEMENT_COMMAND_QUEUE_SIZE = 4; // how many inputs a player can queue up at once

	interface Position {
		x: number;
		y: number;
	}

	// TODO BLOCK writable stores or no?

	export let mapWidth = writable(16); // tile count x
	export let mapHeight = writable(16); // tile count y
	export let tickDuration = writable(200); // ms per tick
	export let tickTimer = writable(0); // current tick timer
	export let score = writable(0); // how many apples have been eaten
	export let highScore = writable((browser && Number(localStorage.getItem('game.highScore'))) || 0);
	export let tiles = writable<Entity[]>([]);
	export let apples = writable<Entity[]>([]);
	export let snakeMovementDirection = writable<Direction>('up'); // same type as items in `input.movementCommands`
	export let snakeSegments = writable<Entity[]>([]);
	export let movementCommandQueue = writable<Direction[]>([]); // queue of inputs, ('up'|'down'|'left'|'right')[]

	/**
	 * Sets up the initial state for a game.
	 */
	export const init = (): void => {
		$tickDuration = 120;
		$tickTimer = 0;
		$score = 0;
		$highScore = (browser && Number(localStorage.getItem('game.highScore'))) || 0; // clearly bad code to not be DRY - this whole module smells
		$movementCommandQueue = ['up'];

		// Create the tiles.
		const nextTiles: Entity[] = [];
		for (let x = 0; x < $mapWidth; x++) {
			for (let y = 0; y < $mapWidth; y++) {
				nextTiles.push(new Entity(x, y));
			}
		}
		$tiles = nextTiles;

		// Create some apples, but preserve current identities if convenient.
		$apples = [new Entity(1, 3), new Entity(7, 2), new Entity(5, 9)];

		// Create the initial snake.
		$snakeMovementDirection = 'up';
		$snakeSegments = [
			new Entity(4, 4),
			new Entity(4, 5),
			new Entity(5, 5),
			new Entity(5, 6),
			new Entity(5, 7),
		];
	};

	/**
	 * Finds the first entity at the given location. Ignores tile entities.
	 * This would be more generic if the game handled entities generically,
	 * but because of the small scope of this project I chose to a more explicit,
	 * less flexible data structure.
	 */
	const findEntityAt = (x: number, y: number): Entity | void => {
		for (const a of $apples) {
			if (a.isAt(x, y)) {
				return a;
			}
		}
		for (const s of $snakeSegments) {
			if (s.isAt(x, y)) {
				return s;
			}
		}
	};

	/**
	 * Returns {x, y} for a random empty tile on the game map.
	 */
	const getRandomEmptyLocation = (): Position => {
		let position;
		while (!position || findEntityAt(position.x, position.y)) {
			position = getRandomLocation();
		}
		return position;
	};

	/**
	 * Gets a random position on the game map.
	 */
	const getRandomLocation = (): Position => {
		return {
			x: randomInt(0, $mapWidth - 1),
			y: randomInt(0, $mapHeight - 1),
		};
	};

	/**
	 * Registers a movement input command to be processed by the game as a queue.
	 * Newer commands bump off older ones off the front.
	 */
	const inputMovementCommand = (movementCommand: Direction): void => {
		input.movementCommands.push(movementCommand);
		while (input.movementCommands.length > MOVEMENT_COMMAND_QUEUE_SIZE) {
			input.movementCommands.shift();
		}
	};

	/**
	 * Get the height of the map in pixels.
	 * TODO is a good candidate for MobX computed properties.
	 */
	$: mapHeightPx = $mapHeight * ENTITY_DEFAULT_HEIGHT;

	/**
	 * Get the width of the map in pixels.
	 * TODO is a good candidate for MobX computed properties.
	 */
	$: mapWidthPx = $mapWidth * ENTITY_DEFAULT_WIDTH;

	/**
	 * Sets the current score for the game, saving the best ever back to local storage.
	 */
	const setScore = (value: number): void => {
		score = value;
		if (score > highScore) {
			highScore = score;
			if (browser) localStorage.setItem('game.highScore', highScore + ''); // TODO could be more automated, easy with mobx
		}
	};

	/**
	 * Mutates the game by executing one full turn and handles all state changes that result.
	 * The game may be in a temporarily illegal state at any time during this function,
	 * like snake segments on top of other segments,
	 * but it is expected to be in a fully valid state before and after the function.
	 * Any potentially illegal states need to be checked and reconciled before the function ends.
	 */
	function tick(): void {
		// Updates state like `game.snake.movementDirection` based on user input
		updateInput();

		// Update entities
		moveSnake(game.snake, game.snake.movementDirection);

		// Check for collision events and handle all possible game state changes.
		checkSnakeOutOfBounds();
		checkSnakeEatSelf();
		checkSnakeEatApple();
	}

	/**
	 * Update the snake's movement direction with the next input direction, if any.
	 */
	function updateInput(): void {
		const movementCommand = game.input.movementCommands.shift();
		if (movementCommand) {
			game.snake.movementDirection = movementCommand;
		}
	}

	/**
	 * Moves the snake in the given direction.
	 */
	function moveSnake(snake: SnakeGame['snake'], movementCommand: Direction): void {
		const head = snake.segments[0];

		// Move the head first, because our algorithm reads the previous positions
		// of the preceding segments to move them to, so this works.
		head.moveDir(movementCommand);

		// Make the body follow the head
		for (let i = 1; i < snake.segments.length; i++) {
			const prevSegment = snake.segments[i - 1];
			const currSegment = snake.segments[i];
			currSegment.moveTo(prevSegment.prevX, prevSegment.prevY);
		}
	}

	/**
	 * We only need to check the head of the snake to see if the whole thing is in bounds
	 * because of the game's movement rules.
	 */
	function checkSnakeOutOfBounds(): void {
		if (snake.segments[0].isOutOfBounds(mapWidth, mapHeight)) {
			killSnake();
		}
	}

	/**
	 * As the quickest possible thing, just reset the game state when the player dies.
	 */
	function killSnake(): void {
		init();
	}

	/**
	 * Checks if the snake eats itself. If so, kill it.
	 */
	function checkSnakeEatSelf(): void {
		const snakeHead = snake.segments[0];
		for (const segment of snake.segments) {
			if (segment !== snakeHead && segment.isCollidingWith(snakeHead)) {
				return killSnake();
			}
		}
	}

	/**
	 * Check if the snake eats an apple. If so, update the game state to handle it.
	 */
	function checkSnakeEatApple(): void {
		const snakeHead = snake.segments[0];
		for (const apple of apples) {
			if (snakeHead.isCollidingWith(apple)) {
				return eatApple(apple);
			}
		}
	}

	/**
	 * Has the snake eat an apple, removing the apple and growing the snake.
	 */
	function eatApple(apple: Entity): void {
		// Increase the score!
		setScore(score + 1);

		// Remove the apple.
		apples.splice(apples.indexOf(apple), 1);

		// Create a new end tail segment that looks like the current end of the snake.
		const endTailSegment = snakeSegments.at(-1)!;
		const newEndTailSegment = endTailSegment.clone();

		// Position the new end tail segment at the previous position of the current end of the snake.
		newEndTailSegment.moveTo(endTailSegment.prevX, endTailSegment.prevY);
		snakeSegments.push(newEndTailSegment);
		spawnApple();
	}

	/**
	 * Creates an apple on a random empty square.
	 */
	function spawnApple(): void {
		const {x, y} = getRandomEmptyLocation();
		const apple = new Entity(x, y);
		game.apples.push(apple);
	}

	const updateKeyDown = (key: string): void => {
		switch (key) {
			case 'ArrowUp':
				inputMovementCommand('up');
				break;
			case 'ArrowDown':
				inputMovementCommand('down');
				break;
			case 'ArrowLeft':
				inputMovementCommand('left');
				break;
			case 'ArrowRight':
				inputMovementCommand('right');
				break;
			default:
				break;
		}
	};
</script>

<svelte:body
	on:keydown={(e) => {
		updateKeyDown(e.key);
	}} />

<slot name="renderer" />