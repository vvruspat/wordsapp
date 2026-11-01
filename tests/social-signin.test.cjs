const assert = require("node:assert/strict");
const { test } = require("node:test");
const {
	act,
	loadSource,
	deferred,
	mount,
	native,
	translation,
} = require("./helpers.cjs");

const session = {
	access_token: "api-access",
	refresh_token: "api-refresh",
	user: { id: 7, email: "test@example.com", onboarded: true },
};

async function setup(overrides = {}, kind = "SocialSignIn") {
	let generation = 0;
	const calls = {
		challenges: [],
		credentials: [],
		exchanges: [],
		auth: [],
		routes: [],
	};
	const mocks = {
		"react-native": native,
		"react-i18next": translation,
		"@/shared/session/sessionOwner": {
			sessionOwner: { getGeneration: () => generation },
		},
		"@/shared/session/useSession": {
			useSessionUser: () => ({
				authUser: async (...args) => {
					calls.auth.push(args);
					return true;
				},
			}),
		},
		"expo-router": {
			useRouter: () => ({
				replace: (route) => calls.routes.push(route),
				push: (route) => calls.routes.push(route),
			}),
		},
		"@/shared/localization/useApiError": {
			useApiError: () => ({ getErrorMessage: (value) => value }),
		},
		"@/api/auth": {
			requestSocialChallenge: async (provider) => {
				calls.challenges.push(provider);
				return {
					status: "success",
					data: { challenge_id: "challenge", nonce: "nonce" },
				};
			},
			signInSocial: async (body) => {
				calls.exchanges.push(body);
				return { status: "success", data: session };
			},
			requestTmpPassword: async () => ({ status: "success" }),
			...overrides.api,
		},
		"../services/socialProviders": {
			requestProviderCredential:
				overrides.credential ??
				(async (...args) => {
					calls.credentials.push(args);
					return { id_token: "provider-token" };
				}),
		},
	};
	const exports = loadSource(`features/account/hooks/use${kind}.ts`, mocks);
	const { useAccountOperation } = loadSource(
		"features/account/hooks/useAccountOperation.ts",
		mocks,
	);
	let value;
	function Probe() {
		const begin = useAccountOperation();
		value = exports[`use${kind}`](begin);
		return null;
	}
	const tree = await mount(Probe);
	return {
		calls,
		tree,
		get value() {
			return value;
		},
		logout() {
			generation++;
		},
	};
}

for (const provider of ["apple", "google"]) {
	test(`${provider} exchanges credentials for the existing API session`, async () => {
		const s = await setup();
		await act(async () => s.value.signIn(provider));
		assert.deepEqual(s.calls.exchanges, [
			{ provider, challenge_id: "challenge", id_token: "provider-token" },
		]);
		assert.deepEqual(s.calls.auth, [
			[session.access_token, session.refresh_token, session.user],
		]);
		assert.deepEqual(s.calls.routes, ["/authorized/learning"]);
		assert.equal(s.value.pendingProvider, null);
		await act(async () => s.tree.unmount());
	});
}

test("new social accounts enter onboarding", async () => {
	const s = await setup({
		api: {
			signInSocial: async () => ({
				status: "success",
				data: { ...session, user: { ...session.user, onboarded: false } },
			}),
		},
	});
	await act(async () => s.value.signIn("apple"));
	assert.deepEqual(s.calls.routes, ["/onboarding"]);
	await act(async () => s.tree.unmount());
});

test("provider cancellation keeps the form usable without an error or API exchange", async () => {
	const s = await setup({ credential: async () => null });
	await act(async () => s.value.signIn("apple"));
	assert.equal(s.calls.exchanges.length, 0);
	assert.equal(s.value.error, undefined);
	assert.equal(s.value.pendingProvider, null);
	await act(async () => s.tree.unmount());
});

for (const boundary of ["challenge", "provider", "exchange"]) {
	for (const invalidate of ["logout", "unmount"]) {
		test(`${invalidate} during ${boundary} discards stale sign-in results`, async () => {
			const gate = deferred();
			const s = await setup({
				api:
					boundary === "challenge"
						? { requestSocialChallenge: () => gate.promise }
						: boundary === "exchange"
							? { signInSocial: () => gate.promise }
							: {},
				...(boundary === "provider" ? { credential: () => gate.promise } : {}),
			});
			let pending;
			await act(async () => {
				pending = s.value.signIn("google");
			});
			if (invalidate === "logout") s.logout();
			else await act(async () => s.tree.unmount());
			await act(async () => {
				gate.resolve(
					boundary === "provider"
						? { id_token: "old" }
						: {
								status: "success",
								data:
									boundary === "challenge"
										? { challenge_id: "old", nonce: "old" }
										: session,
							},
				);
				await pending;
			});
			assert.equal(s.calls.auth.length, 0);
			assert.equal(s.calls.routes.length, 0);
			if (boundary !== "exchange") assert.equal(s.calls.exchanges.length, 0);
			if (invalidate !== "unmount") await act(async () => s.tree.unmount());
		});
	}
}

for (const kind of ["SignIn", "SignUp"]) {
	test(`${kind} serializes social providers and email submission and allows retry`, async () => {
		const gate = deferred();
		let challengeCalls = 0;
		const s = await setup(
			{
				api: {
					requestSocialChallenge: async () => {
						challengeCalls++;
						return gate.promise;
					},
				},
			},
			kind,
		);
		let pending;
		await act(async () => {
			pending = s.value.handleSocialSignIn("apple");
			void s.value.handleSocialSignIn("google");
			void s.value.handleContinueClick();
		});
		assert.equal(challengeCalls, 1);
		assert.equal(s.value.isBusy, true);
		await act(async () => {
			gate.resolve({ status: "error", error: { status: 503 } });
			await pending;
		});
		assert.equal(s.value.isBusy, false);
		assert.equal(s.value.error, "social_sign_in_error");
		await act(async () => s.value.handleContinueClick());
		assert.equal(s.value.error, undefined);
		assert.equal(
			kind === "SignIn" ? s.value.stage : s.calls.routes[0].pathname,
			kind === "SignIn" ? "password" : "/verify",
		);
		await act(async () => s.tree.unmount());
	});
}

test("incomplete sessions and network failures never authenticate", async () => {
	for (const response of [
		{ status: "success", data: { access_token: "partial" } },
		{ status: "error", error: { status: 500 } },
	]) {
		const s = await setup({ api: { signInSocial: async () => response } });
		await act(async () => s.value.signIn("apple"));
		assert.equal(s.calls.auth.length, 0);
		assert.equal(s.value.error, "social_sign_in_error");
		await act(async () => s.tree.unmount());
	}
});

test("unsafe automatic account linking directs users to email sign-in", async () => {
	const s = await setup({
		api: {
			signInSocial: async () => ({ status: "error", error: { status: 409 } }),
		},
	});
	await act(async () => s.value.signIn("google"));
	assert.equal(s.value.error, "social_sign_in_use_email");
	assert.equal(s.calls.auth.length, 0);
	await act(async () => s.tree.unmount());
});

test("auth HTTP logging never records passwords, provider tokens, nonces or response bodies", async () => {
	const logs = [];
	const { $fetch } = loadSource("utils/fetch.ts", {
		"./authTokenStorage": { getAccessToken: async () => "old-session" },
		"./logger": {
			logger: Object.fromEntries(
				["info", "warn", "error"].map((level) => [
					level,
					(...args) => logs.push(args),
				]),
			),
		},
	});
	const saved = global.fetch;
	const requests = [];
	global.fetch = async (url, options) => {
		requests.push({ url, options });
		return {
			ok: false,
			status: 401,
			text: async () =>
				JSON.stringify({ message: "invalid", token: "response-secret" }),
		};
	};
	try {
		await $fetch("/auth/social/signin", "post", {
			body: {
				provider: "apple",
				id_token: "provider-secret",
				challenge_id: "nonce-secret",
			},
			noAuth: true,
		});
		await $fetch("/auth/signin", "post", {
			body: { email: "test@example.com", password: "password-secret" },
		});
		assert.equal(requests[0].options.headers.Authorization, undefined);
		assert.match(requests[0].options.body, /provider-secret/);
		for (const secret of [
			"provider-secret",
			"response-secret",
			"nonce-secret",
			"password-secret",
		])
			assert.equal(JSON.stringify(logs).includes(secret), false);
	} finally {
		global.fetch = saved;
	}
});

test("native Apple and Google SDKs receive the server-issued nonce", async () => {
	const savedWeb = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
	const savedIos = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
	process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID = "web-client-id";
	process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID = "ios-client-id";
	let appleOptions, googleOptions;
	const { requestProviderCredential } = loadSource(
		"features/account/services/socialProviders.ts",
		{
			"react-native": native,
			"expo-apple-authentication": {
				AppleAuthenticationScope: { FULL_NAME: 0, EMAIL: 1 },
				signInAsync: async (options) => {
					appleOptions = options;
					return {
						identityToken: "apple-token",
						state: options.state,
						fullName: { givenName: "First", familyName: "Last" },
					};
				},
			},
			"react-native-nitro-google-signin": {
				GoogleOneTapSignIn: {
					configure: (options) => {
						googleOptions = options;
					},
					presentExplicitSignIn: async () => ({
						type: "success",
						data: { idToken: "google-token" },
					}),
				},
				isSuccessResponse: (response) => response.type === "success",
				isCancelledResponse: (response) => response.type === "cancelled",
			},
		},
	);
	try {
		const challenge = { challenge_id: "challenge-id", nonce: "server-nonce" };
		assert.deepEqual(await requestProviderCredential("apple", challenge), {
			id_token: "apple-token",
			name: "First Last",
		});
		assert.equal(appleOptions.nonce, challenge.nonce);
		assert.equal(appleOptions.state, challenge.challenge_id);
		assert.deepEqual(await requestProviderCredential("google", challenge), {
			id_token: "google-token",
		});
		assert.equal(googleOptions.nonce, challenge.nonce);
		assert.equal(googleOptions.webClientId, "web-client-id");
		assert.equal(googleOptions.offlineAccess, false);
	} finally {
		if (savedWeb === undefined)
			delete process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
		else process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID = savedWeb;
		if (savedIos === undefined)
			delete process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
		else process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID = savedIos;
	}
});
