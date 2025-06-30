// import { Context, Effect, Layer } from "effect";
// import { FingerprintService } from "../services/Fingerprint";

// class HeroConfig extends Context.Tag("HeroConfig")<
// 	HeroConfig,
// 	{
// 		readonly getConfig: Effect.Effect<{
// 			readonly logLevel: string;
// 			readonly connection: string;
// 		}>;
// 	}
// >() {}

// const HeroConfigLive = Layer.succeed(HeroConfig, {
// 	getConfig: Effect.succeed({
// 		logLevel: "INFO",
// 		connection: "mysql://username:password@hostname:port/database_name",
// 	}),
// });

// class HeroLogger extends Context.Tag("HeroLogger")<
// 	HeroLogger,
// 	{ readonly log: (message: string) => Effect.Effect<void> }
// >() {}

// const HeroLoggerLive = Layer.effect(
// 	HeroLogger,
// 	Effect.gen(function* () {
// 		const config = yield* HeroConfig;
// 		const fingerprint = yield* FingerprintService.getFingerprint();
// 		return {
// 			log: (message) =>
// 				Effect.gen(function* () {
// 					const { logLevel } = yield* config.getConfig;

// 					console.log(`[${logLevel}] ${message}`, fingerprint);
// 				}),
// 		};
// 	}),
// );

// class HeroDatabase extends Context.Tag("HeroDatabase")<
// 	HeroDatabase,
// 	{ readonly query: (sql: string) => Effect.Effect<unknown> }
// >() {}

// const HeroDatabaseLive = Layer.effect(
// 	HeroDatabase,
// 	Effect.gen(function* () {
// 		const config = yield* HeroConfig;
// 		return {
// 			query: (sql: string) =>
// 				Effect.gen(function* () {
// 					const { connection } = yield* config.getConfig;
// 					return { result: `Results from ${connection}` };
// 				}),
// 		};
// 	}),
// );

// const HeroAppConfigLive = Layer.merge(
// 	HeroConfigLive,
// 	FingerprintService.Default,
// );

// const HeroMainLive = HeroDatabaseLive.pipe(
// 	Layer.provide(HeroAppConfigLive),
// 	Layer.provide(HeroConfigLive),
// );

// const program = Effect.gen(function* () {
// 	const database = yield* HeroDatabase;
// 	const result = yield* database.query("SELECT * FROM users");
// 	return result;
// });

// const runnable = Effect.provide(program, HeroMainLive);

// Effect.runPromise(runnable).then(console.log);

import { Context, Effect, Ref } from "effect";

// Create a Tag for our state
class MyState extends Context.Tag("MyState")<
	MyState,
	Ref.Ref<{ state: number }>
>() {}

// Subprogram 1: Increment the state value twice
const subprogram1 = Effect.gen(function* () {
	const state = yield* MyState;
	yield* Ref.update(state, (myState) => ({
		state: myState.state + 1,
	}));
	yield* Ref.update(state, (myState) => ({ state: myState.state + 1 }));
});

// Subprogram 2: Decrement the state value and then increment it
const subprogram2 = Effect.gen(function* () {
	const state = yield* MyState;
	yield* Ref.update(state, (myState) => ({ state: myState.state - 1 }));
	yield* Ref.update(state, (myState) => ({ state: myState.state + 1 }));
});

// Subprogram 3: Read and log the current value of the state
const subprogram3 = Effect.gen(function* () {
	const state = yield* MyState;
	const value = yield* Ref.get(state);
	console.log("MyState has a value of: ", value);
});

// Compose subprograms 1, 2, and 3 to create the main program
const program = Effect.gen(function* () {
	yield* subprogram1;
	yield* subprogram2;
	yield* subprogram3;
});

// Create a Ref instance with an initial value of 0
const initialState = Ref.make({ state: 0 });

// Provide the Ref as a service
const runnable = program.pipe(
	Effect.provideServiceEffect(MyState, initialState),
);

// Run the program and observe the output
Effect.runPromise(runnable);
/*
Output:
MyState has a value of 2.
*/
