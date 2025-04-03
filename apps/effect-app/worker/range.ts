import { BunRuntime, BunWorkerRunner } from "@effect/platform-bun";
import * as Runner from "@effect/platform/WorkerRunner";
import { Chunk, Effect, Layer, Stream, type StreamEmit } from "effect";

const events = [1, 2, 3, 4];

const WorkerLive = Effect.gen(function* () {
	yield* Runner.make((n: number) => {
		const emails = Array.from(
			{ length: n },
			() => `super-secure-pa$$word-${n}-${Date.now()}-${Math.random()}`,
		);

		const stream = Stream.async(
			(emit: StreamEmit.Emit<never, never, number, void>) => {
				events.forEach((n) => {
					setTimeout(() => {
						emit(Effect.succeed(Chunk.of(n)));
					}, 100 * n);
				});
			},
		);

		// return await Bun.password.hash(password);
		// return Stream.tick("100 millis");
		// return asyncStream;
		return stream;
		// return Stream.range(0, n);
	});
	// yield* Runner.make((n: number) => Stream.range(0, n));
	yield* Effect.log("worker started");
	yield* Effect.addFinalizer(() => Effect.log("worker closed"));
}).pipe(Layer.scopedDiscard, Layer.provide(BunWorkerRunner.layer));

BunRuntime.runMain(Runner.launch(WorkerLive));
