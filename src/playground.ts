import Hero from "@ulixee/hero/lib/Hero";

(async () => {
	const hero = new Hero({
		showChrome: false,
		disableMitm: false,
		connectionToCore: {
			host: "ws://localhost:1818",
		},
	});
	await hero.goto("https://ulixee.org/docs/hero/plugins/core-plugins");
	await hero.activeTab.on("resource", async (resource) => {
		console.log(resource);
	});
	console.log(hero, hero.tabs, hero.activeTab);
	await hero.waitForPaintingStable();
	// await hero.waitForLoad(LocationStatus.AllContentLoaded);
	await hero.reload();
	await hero.close();
})();
