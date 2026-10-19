const assert = require("node:assert/strict");
const { test } = require("node:test");
const {
	React,
	act,
	loadSource,
	deferred,
	mount,
	translation,
} = require("./helpers.cjs");
for (const kind of ["SignIn", "Verify"]) {
	test(`${kind} ignores a pending auth response after logout and blocks duplicate submission`, async () => {
		let generation = 0,
			authCalls = 0,
			apiCalls = 0,
			navigations = 0,
			value;
		const gate = deferred();
		const api = async () => {
			apiCalls++;
			return gate.promise;
		};
		const hook = loadSource(`features/account/hooks/use${kind}.ts`, {
			"@/shared/session/sessionOwner": {
				sessionOwner: { getGeneration: () => generation },
			},
			"@/shared/session/useSession": {
				useSessionUser: () => ({
					authUser: async () => {
						authCalls++;
						return true;
					},
				}),
			},
			"@/api/auth": {
				signIn: api,
				verifyEmail: api,
				requestTmpPassword: api,
				resendVerificationEmail: api,
			},
			"@/shared/localization/useApiError": {
				useApiError: () => ({ getErrorMessage: (x) => x }),
			},
			"react-i18next": translation,
			"expo-router": {
				useRouter: () => ({
					replace() {
						navigations++;
					},
				}),
				useLocalSearchParams: () => ({ email: "test@example.com" }),
			},
		});
		function Probe() {
			value = hook[`use${kind}`]();
			return null;
		}
		const tree = await mount(Probe);
		const submit = () =>
			kind === "SignIn"
				? value.handleSignInClick()
				: value.onCodeChangeHandler("1234");
		let pending;
		await act(async () => {
			pending = submit();
			void submit();
		});
		assert.equal(apiCalls, 1);
		generation++;
		await act(async () =>
			gate.resolve({
				status: "success",
				data: {
					access_token: "new",
					refresh_token: "new",
					user: { id: 1, onboarded: true },
				},
			}),
		);
		await pending;
		assert.equal(authCalls, 0);
		assert.equal(navigations, 0);
		await act(async () => tree.unmount());
	});
}
test("the same mutable user model rebuilds vocabulary operations for both languages", async () => {
	const user = { userId: 1, language_learn: "nl", language_speak: "en" };
	const identities = [];
	let value;
	const { useVocabularySync } = loadSource(
		"shared/vocabulary/useVocabularySync.ts",
		{
			"@/shared/session/useSession": { useSessionUser: () => ({ user }) },
			"@/shared/vocabulary/vocabularyCoordinator": {
				createVocabularyOperations: (input) => {
					identities.push(input);
					return input;
				},
			},
		},
	);
	function Probe() {
		value = useVocabularySync();
		return null;
	}
	const tree = await mount(Probe);
	assert.equal(value.language_speak, "en");
	user.language_speak = "ru";
	await act(async () => tree.update(React.createElement(Probe)));
	assert.equal(value.language_speak, "ru");
	assert.equal(identities.length, 2);
	await act(async () => tree.unmount());
});
