const assert = require("node:assert/strict");
const { test } = require("node:test");
const { loadSource, deferred, logger } = require("./helpers.cjs");
test("shared restoration refreshes once and logout prevents late credentials/user observation", async () => {
	const gate = deferred();
	let refreshes = 0,
		writes = 0,
		observations = 0;
	const { sessionOwner, sessionStore } = loadSource(
		"shared/session/sessionOwner.ts",
		{
			"@/db/database": {
				__esModule: true,
				default: {
					get: () => ({
						query: () => ({
							observeWithColumns: () => ({
								subscribe: () => {
									observations++;
									return { unsubscribe() {} };
								},
							}),
						}),
					}),
				},
			},
			"@/api/auth": {
				refreshToken: async () => {
					refreshes++;
					return gate.promise;
				},
			},
			"@/utils/authTokenStorage": {
				getAuthTokens: async () => ({
					accessToken: "expired",
					refreshToken: "refresh",
				}),
				setAuthTokens: async () => {
					writes++;
				},
				clearAuthTokens: async () => {},
			},
			"jwt-decode": { jwtDecode: () => ({ exp: 0, sub: 1 }) },
			"@/shared/vocabulary/vocabularyCoordinator": {
				invalidateVocabularyOperations() {},
			},
			"./persistUser": { persistAuthenticatedUser: async () => {} },
			"@/i18n": {
				__esModule: true,
				default: { changeLanguage: async () => {} },
			},
			"@/utils/logger": { logger },
		},
	);
	const first = sessionOwner.restore(),
		second = sessionOwner.restore();
	assert.equal(first, second);
	await new Promise((resolve) => setImmediate(resolve));
	assert.equal(refreshes, 1);
	await sessionOwner.logout();
	gate.resolve({ data: { access_token: "new", refresh_token: "new" } });
	await first;
	assert.equal(writes, 0);
	assert.equal(observations, 0);
	assert.equal(sessionStore.getState().accessToken, null);
});
