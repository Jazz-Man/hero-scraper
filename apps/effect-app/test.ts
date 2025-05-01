import { Effect, Random } from "effect";

// Method 1: Using Random.shuffle
const myArray = [1, 2, 3, 4, 5];
const shuffleEffect = Random.shuffle(myArray);

// To run the effect and get the shuffled array
const runShuffled = Effect.runSync(shuffleEffect);
console.log(runShuffled); // A randomly shuffled version of the original array

// Method 2: Using pipe syntax for composition
const shuffledArrayEffect = Effect.succeed([1, 2, 3, 4, 5]).pipe(
	Effect.flatMap(Random.shuffle),
);

// Run it
const result = Effect.runSync(shuffledArrayEffect);
console.log(result); // Shuffled array
