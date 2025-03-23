import { URLSearchParams } from "node:url";
import { safePromise } from "@scraper/safe";

import FaucetBase from "../FaucetBase.ts";

import {
	needsCsrfToken,
	needsInit,
	needsLogin,
	needsPageReady,
} from "@scraper/decorators";
import getOtp from "@scraper/otp";

type TAjaxRequestParams = Record<string, string> | string | URLSearchParams;

type TCurrentAddressAndBalance = {
	profile_withdraw_address: string;
	balance: string;
	manual_withdraw_fee: string;
	instant_withdraw_fee: string;
};

type TAccountCookie = Record<
	"btc_address" | "password" | "fbtc_userid" | "fbtc_session",
	string
>;

type TCfType = "free_play" | "signup_form";

type TCfTypeSelectors = Record<TCfType, string>;

export default class FreeBitco extends FaucetBase {
	private csrfToken: string | undefined;

	hasCsrfToken() {
		return !!this.csrfToken;
	}

	public getFingerprintMd5 = async (): Promise<string> =>
		await this.app.getJsValue<string>("$.fingerprint()", {
			err: '"$.fingerprint()" fingerprint not found',
		});

	public getFingerprintT = async (): Promise<string> =>
		await safePromise<string>(
			this.hero.executeJs(() => {
				// @ts-ignore
				if (window.Fingerprint === undefined) {
					return undefined;
				}
				// @ts-ignore
				const t = new Fingerprint({
					canvas: !0,
					screen_resolution: !0,
					ie_activex: !0,
				});

				return t.get();
			}),
		);

	@needsCsrfToken()
	async ajaxPostRequest(
		url: string,
		bodyParams: TAjaxRequestParams,
	): Promise<string> {
		return new Promise<string>(async (resolve, reject) => {
			const params = new URLSearchParams(bodyParams);

			if (!params.has("csrf_token")) {
				params.set("csrf_token", this.csrfToken as string);
			}

			const response = await this.app.fetch(url, {
				method: "POST",
				headers: {
					"content-type": "application/x-www-form-urlencoded; charset=UTF-8",
					"x-csrf-token": this.csrfToken as string,
					"x-requested-with": "XMLHttpRequest",
				},
				body: params.toString(),
			});

			const responseStatusCode = await response.status;
			const responseStatusText = await response.statusText;

			if (responseStatusCode > 200) {
				reject(responseStatusText);
				return;
			}

			const text = await safePromise(response.text());
			resolve(text);
		});
	}

	@needsCsrfToken()
	async ajaxGetRequest<T = string>(
		url: string,
		bodyParams: TAjaxRequestParams,
	): Promise<T> {
		return new Promise<T>(async (resolve, reject) => {
			const params = new URLSearchParams(bodyParams);

			if (!params.has("csrf_token")) {
				params.set("csrf_token", this.csrfToken as string);
			}

			// Remove a trailing slash from a URL
			url = url.replace(/\/$/, "");

			const response = await this.app.fetch(`${url}/?${params.toString()}`, {
				method: "GET",
				headers: {
					"x-requested-with": "XMLHttpRequest",
					"x-csrf-token": this.csrfToken as string,
				},
			});

			const isOk = await response.ok;
			const statusCode = await response.status;
			const statusText = await response.statusText;
			const _url = await response.url;

			if (!isOk) {
				reject(
					`HTTP error: status text => ${statusText};\n status code => ${statusCode}\n url => ${_url}`,
				);

				return;
			}

			const contentType = await response.headers.get("content-type");

			try {
				const res: T = contentType?.includes("application/json")
					? await response.json()
					: await response.text().then((string) => string.trim());

				resolve(res);
			} catch (error) {
				reject(`Failed to parse response: ${error.message}`);
			}
		});
	}

	async getCurrentAddressAndBalance(): Promise<TCurrentAddressAndBalance> {
		return new Promise(async (resolve, reject) => {
			try {
				const response = await this.ajaxGetRequest<string>("/", {
					op: "get_current_address_and_balance",
				});

				const [status, ...data] = response.split(":");

				if (status !== "s") {
					reject(data[0]);
					return;
				}

				const [
					profile_withdraw_address,
					balance,
					manual_withdraw_fee,
					instant_withdraw_fee,
				] = data;

				resolve({
					profile_withdraw_address,
					balance,
					manual_withdraw_fee,
					instant_withdraw_fee,
				});
			} catch (error) {
				reject(error);
			}
		});
	}

	@needsInit()
	@needsPageReady()
	async login(): Promise<void> {
		if (this.isLoggedIn) {
			console.log("login ok", { isLoggedIn: this.isLoggedIn });
			return;
		}

		const params: TAjaxRequestParams = {
			op: "login_new",
			btc_address: this.user.username,
			password: this.user.password,
		};

		if (this.user.tfa_secret) {
			params.tfa_code = getOtp(this.user.tfa_secret);
		}

		const loginStatus = await this.ajaxPostRequest("/", params);

		console.log({ loginStatus });

		const [status, ...loginData] = loginStatus?.split(":");

		if (status !== "s") {
			console.log("login failed");

			throw new Error(loginData[0]);
		}

		const [btc_address, password, fbtc_userid, fbtc_session] = loginData;

		await this.initAccountCookie({
			btc_address,
			password,
			fbtc_userid,
			fbtc_session,
		});
	}

	get baseUrl() {
		return "https://freebitco.in/?op=home";
	}

	async initFaucet(): Promise<void> {
		await this.init(
			{
				showChrome: true,
				showDevtools: true,
				sessionPersistence: false,
			},
			this.user.cookies,
		);

		await this.app.goto(this.baseUrl);

		const hasInitCookie = await this.app.getCookie("init");

		if (typeof hasInitCookie === "undefined") {
			const hideCookiesList: string[] = [
				"mine_btc",
				"earn_btc",
				"push",
				"free_wof_spins",
				"premium_membership",
				"rp_for_wof",
			];

			for (const cookie of hideCookiesList) {
				const name = `hide_${cookie}_msg`;

				await this.app.setCookie(name, "1", {
					secure: true,
				});
			}

			await this.app.setCookie("cookieconsent_dismissed", "1", {
				secure: true,
			});

			await this.app.setCookie("init", "1", {
				secure: true,
			});

			await this.app.reload();
		}

		const csrfTokenCookie = await this.app.getCookie("csrf_token");

		if (csrfTokenCookie) {
			this.csrfToken = csrfTokenCookie.value;
		}

		const btc_address = await this.app.getCookie("btc_address");

		if (btc_address) {
			this.isLoggedIn = true;
			console.log({ btc_address, isLoggedIn: this.isLoggedIn });

			return;
		}

		return;
	}

	@needsInit()
	@needsPageReady()
	async signup(referrer: string | undefined = undefined) {
		const fingerprint = await this.getFingerprintMd5();

		const cf_captcha_response = await this.getTurnstileResponse("signup_form");

		const params: TAjaxRequestParams = {
			op: "signup_new",
			password: this.user.password,
			email: this.user.username,
			fingerprint,
			captcha_type: "77",
			cf_captcha_response,
		};

		if (referrer) {
			params.referrer = referrer;
		}

		const signupStatus = await this.ajaxPostRequest("/", params);

		const [status, ...signupData] = signupStatus?.split(":");

		console.log({ status, signupData, params });

		if (status === "e") {
			const isEmailExists =
				signupData?.at(1) && signupData[1] === "email_exists";

			const error = isEmailExists ? signupData[0] : signupData[0];

			throw new Error(error);
		}

		const [btc_address, password, fbtc_userid, fbtc_session] = signupData;

		await this.initAccountCookie({
			btc_address,
			password,
			fbtc_userid,
			fbtc_session,
		});
	}

	@needsInit()
	@needsPageReady()
	async getTurnstileResponse<T extends string>(type: TCfType): Promise<T> {
		return new Promise<T>(async (resolve, reject) => {
			const selectors: TCfTypeSelectors = {
				free_play: "#freeplay_form_cf_turnstile",
				signup_form: "#signup_form_cf_turnstile",
			};

			if (!selectors.hasOwnProperty(type)) {
				reject(new Error(`invalid cf type: ${type}`));

				return;
			}

			await this.handleTurnstileChallenge();

			const value = await this.app.getInputValue<T>(
				`${selectors[type]} [name='cf-turnstile-response']`,
			);

			resolve(value);
		});
	}

	@needsLogin()
	async freePlay() {
		const timeRemainingExists = await this.app.isVisible(
			"#free_play_tab #wait",
		);

		if (timeRemainingExists) {
			console.log({ timeRemainingExists });
			return;
		}

		const playBtn = await this.app.queryElement("#free_play_form_button", {
			waitForVisible: true,
		});

		await this.hero.interact({
			scroll: playBtn,
		});

		const fingerprint = await this.getFingerprintMd5();

		if (!fingerprint) {
			throw new Error("fingerprint not found");
		}

		const fingerprint2 = await this.getFingerprintT();

		if (!fingerprint2) {
			throw new Error("fingerprint2 not found");
		}

		const op = await this.app.getInputValue<string>("#free_play_op");

		const client_seed =
			await this.app.getInputValue<string>("#next_client_seed");

		const pwc = await this.app.getInputValue<string>("#pwc_input");

		const cf_captcha_response = await this.getTurnstileResponse("free_play");

		const params: TAjaxRequestParams = {
			op,
			fingerprint,
			client_seed,
			pwc,
			fingerprint2,
			cf_captcha_response,
		};

		console.log(params);

		// const playStatus = await this.postRequest('/', params);
		//
		// console.log({ playStatus, params });
		//
		// const [status, ...respData] = playStatus?.split(':') || [];
		//
		// if (status === 'e') {
		//   // Помилка
		//   const [errorCode, errorMessage, ...errorDetails] = respData;
		//
		//   await this.reload();
		//
		//   throw new Error(errorMessage);
		// }
		//
		// // Успішна відповідь
		// const [
		//   rollResult, // t[1]: Результат ролу
		//   balanceBTC, // t[2]: Баланс у BTC
		//   winnings, // t[3]: Виграші (наприклад, у сатошах)
		//   lastPlayTime, // t[4]: Час останньої гри
		//   balanceUSD, // t[5]: Баланс у USD
		//   nextServerSeedHash, // t[6]: Хеш наступного серверного сіда
		//   clientSeed, // t[11]: Клієнтський сид
		//   nonce, // t[12]: Нонс
		//   prevServerSeed, // t[9]: Попередній серверний сид
		//   prevServerSeedHash, // t[10]: Хеш попереднього серверного сіда
		//   prevRoll, // t[1]: Попередній рол
		//   lotteryTickets, // t[13]: Лотерейні квитки
		//   rewardPoints, // t[14]: Очки нагороди
		//   spinsWon, // t[15]: Кількість WOF спінів
		//   tokensWon, // t[20]: FUN токени
		//   ...rest // Інші додаткові дані
		// ] = respData;
		//
		// await this.setCookie('last_play', lastPlayTime, {
		//   secure: true
		// });
		//
		// await this.reload();
		//
		// const result = {
		//   rollResult,
		//   balanceBTC,
		//   winnings,
		//   lastPlayTime, // Додано пропущене значення
		//   balanceUSD,
		//   nextServerSeedHash,
		//   clientSeed,
		//   nonce,
		//   prevServerSeed,
		//   prevServerSeedHash,
		//   prevRoll,
		//   lotteryTickets,
		//   rewardPoints,
		//   spinsWon,
		//   tokensWon,
		//   additionalData: rest
		// };
		//
		// console.log({ result }, 'freePlay');
	}

	private async initAccountCookie(cookie: TAccountCookie) {
		await this.app.setCookie("btc_address", cookie.btc_address, {
			secure: true,
		});

		await this.app.setCookie("password", cookie.password, {
			secure: true,
		});
		//
		await this.app.setCookie("fbtc_userid", cookie.fbtc_userid, {
			secure: true,
		});

		await this.app.setCookie("fbtc_session", cookie.fbtc_session, {
			secure: true,
		});

		await this.app.setCookie("have_account", "1", {
			secure: true,
		});

		await this.hero.executeJs(() => {
			// @ts-ignore
			modifyCookiesForSubdomains();
		});

		this.isLoggedIn = true;

		await this.app.goto(this.baseUrl);
	}
}
