import { Console, Effect } from "effect";

const task1 = Effect.gen(function* () {
	console.log("task 1");
	yield* Effect.addFinalizer(() => Console.log("finalizer after task 1"));
});

const task2 = Effect.gen(function* () {
	console.log("task 2");
	yield* Effect.addFinalizer(() => Console.log("finalizer after task 2"));
});

const program = Effect.gen(function* () {
	// The scopes of both tasks are merged into one
	yield* task1;
	yield* task2;
});

Effect.runPromise(Effect.scoped(program));
/*
Output:
task 1
task 2
finalizer after task 2
finalizer after task 1
*/
