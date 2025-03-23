import type IViewport from "@ulixee/unblocked-specification/agent/browser/IViewport";
import {
	FingerprintGenerator,
	type NavigatorFingerprint,
	type ScreenFingerprint,
} from "fingerprint-generator";

export type THeroFingerprint = {
	navigator: NavigatorFingerprint;
	screen: ScreenFingerprint;
	viewport: IViewport;
};

export default async function getFingerprint(): Promise<THeroFingerprint> {
	return new Promise<THeroFingerprint>((resolve, reject) => {
		try {
			const fingerprint = new FingerprintGenerator({
				mockWebRTC: true,
				browsers: ["chrome"],
				operatingSystems: ["macos"],
				devices: ["desktop"],
				httpVersion: "2",
			}).getFingerprint().fingerprint;

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

			resolve({ navigator, screen, viewport });
		} catch (e) {
			reject(e);
		}
	});
}
