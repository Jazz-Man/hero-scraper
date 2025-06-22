import {
	getUserListWithCookies,
	updateSignupUserCookies,
} from "@scraper/prisma";
import Worker from "threads/dist/worker/index";
// import { Pool, Worker, spawn } from "threads";
import type { TWorkerResult } from "./@types";
import type { TAppSignup } from "./workers/app-signup.ts";

const pool = Pool(() => spawn(new Worker("./workers/app-signup")), {
	name: "app-signup",
});

const userList = await getUserListWithCookies(10);

for (const user of userList) {
	const task = pool.queue(
		async (appSignup: TAppSignup) => await appSignup(user),
	);

	task
		.then(async (result: TWorkerResult) => {
			console.log({ username: result.username });

			await updateSignupUserCookies(result.username, result.cookies);
		})
		.catch((e: Error) => {
			console.error(e.toString());
		});
}

await pool.completed(true);
await pool.terminate();
