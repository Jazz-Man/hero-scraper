import type IViewport from "@ulixee/unblocked-specification/agent/browser/IViewport";
import { Data, Effect } from "effect";
import { FingerprintGenerator } from "fingerprint-generator";

export class FingerprintError extends Data.TaggedError("FingerprintError")<{
	message: unknown;
}> {}

export class FingerprintService extends Effect.Service<FingerprintService>()(
	"FingerprintService",
	{
		effect: Effect.gen(function* () {
			const getFingerprint = () =>
				Effect.gen(function* () {
					const fingerprint = yield* Effect.try({
						try: () =>
							new FingerprintGenerator({
								mockWebRTC: true,
								browsers: ["chrome"],
								operatingSystems: ["macos"],
								devices: ["desktop"],
								httpVersion: "2",
							}).getFingerprint().fingerprint,

						catch: (message) => new FingerprintError({ message }),
					});

					const { navigator, screen } = fingerprint;

					const viewport: IViewport = {
						positionX: screen.pageXOffset,
						positionY: screen.pageYOffset,
						height: screen.height,
						width: screen.width,
						screenWidth: screen.availWidth,
						screenHeight: screen.availHeight,
						colorDepth: screen.colorDepth,
						deviceScaleFactor: screen.devicePixelRatio,
						isDefault: true,
					};

					return { navigator, screen, viewport };
				});

			return { getFingerprint } as const;
		}),
		accessors: true,
	},
) {}
