import fs from "node:fs";
import { join } from "node:path";
import db from "./db";

async function main() {
	console.log("Start seeding ...");

	const seedFilesPath = join(__dirname, "seed");

	const seedFiles = fs
		.readdirSync(seedFilesPath)
		.filter((file: string) => file.endsWith(".seed.ts"));

	for (const seedFile of seedFiles) {
		const seedFilePath = join(seedFilesPath, seedFile);

		await require(seedFilePath)?.default(db);
	}

	console.log("Seeding finished.");
}

main()
	.then(async () => {
		await db.$disconnect();
	})
	.catch(async (e) => {
		console.error(e);
		await db.$disconnect();
		process.exit(1);
	});
