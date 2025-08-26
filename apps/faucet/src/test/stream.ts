import { Console, Effect, Stream } from "effect";

// Creating a single-valued stream from a scoped resource
const stream = Stream.scoped(
	Effect.acquireUseRelease(
		Console.log("acquire"),
		() => Console.log("use"),
		() => Console.log("release"),
	),
);

Effect.runPromise(Stream.runCollect(stream)).then(console.log);
/*
Output:
acquire
use
release
{ _id: 'Chunk', values: [ undefined ] }
*/
