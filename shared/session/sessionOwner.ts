import { Q } from "@nozbe/watermelondb";
import type { components } from "@vvruspat/words-types";
import { jwtDecode } from "jwt-decode";
import { createStore } from "zustand/vanilla";
import database from "@/db/database";
import type User from "@/db/models/User";
import { refreshToken as refresh } from "@/api/auth";
import {
	getAuthTokens,
	setAuthTokens,
	clearAuthTokens,
} from "@/utils/authTokenStorage";
import { persistAuthenticatedUser } from "./persistUser";
import i18n from "@/i18n";
import { logger } from "@/utils/logger";
import { invalidateVocabularyOperations } from "@/shared/vocabulary/vocabularyCoordinator";

type State = {
	user: User | null;
	accessToken: string | null;
	refreshToken: string | null;
	ready: boolean;
	error: unknown;
};
export const sessionStore = createStore<State>(() => ({
	user: null,
	accessToken: null,
	refreshToken: null,
	ready: false,
	error: null,
}));
let generation = 0;
let restore: Promise<void> | null = null;
let observation: { unsubscribe: () => void } | null = null;
let tokenQueue: Promise<unknown> = Promise.resolve();
const serializeTokens = (action: () => Promise<unknown>) => {
	const job = tokenQueue.then(action, action);
	tokenQueue = job.catch(() => {});
	return job;
};
const observeUser = (accessToken: string, epoch: number) => {
	observation?.unsubscribe();
	const userId = jwtDecode<{ sub: number }>(accessToken).sub;
	let languages: string | null = null;
	observation = database
		.get<User>("users")
		.query(Q.where("user_id", userId))
		.observe()
		.subscribe((users) => {
			if (generation !== epoch) return;
			const user = users[0] ?? null;
			const identity = JSON.stringify([
				user?.userId,
				user?.language_learn,
				user?.language_speak,
			]);
			if (languages !== null && languages !== identity)
				invalidateVocabularyOperations();
			languages = identity;
			sessionStore.setState({ user });
			if (user)
				void i18n
					.changeLanguage(user.language_speak)
					.catch((error) =>
						logger.error(
							"Unable to change interface language",
							error,
							"general",
						),
					);
		});
};
export const sessionOwner = {
	getGeneration: () => generation,
	restore() {
		if (restore) return restore;
		const epoch = generation;
		restore = (async () => {
			try {
				const tokens = await getAuthTokens();
				if (generation !== epoch) return;
				if (!tokens) {
					sessionStore.setState({ ready: true });
					return;
				}
				let next = tokens;
				const { exp } = jwtDecode<{ exp: number }>(tokens.accessToken);
				if (exp * 1000 < Date.now() + 7 * 24 * 60 * 60 * 1000) {
					await serializeTokens(() =>
						generation === epoch ? clearAuthTokens() : Promise.resolve(),
					);
					const result = await refresh(tokens.refreshToken);
					if (generation !== epoch) return;
					const accessToken = result.data?.access_token,
						refreshToken = result.data?.refresh_token;
					if (!accessToken || !refreshToken) {
						sessionStore.setState({ ready: true });
						return;
					}
					next = { accessToken, refreshToken };
					await serializeTokens(() =>
						generation === epoch
							? setAuthTokens(accessToken, refreshToken)
							: Promise.resolve(),
					);
				}
				if (generation !== epoch) return;
				sessionStore.setState({ ...next, ready: true, error: null });
				observeUser(next.accessToken, epoch);
			} catch (error) {
				if (generation === epoch) sessionStore.setState({ error, ready: true });
				logger.error("Unable to restore session", error, "auth");
			}
		})();
		return restore;
	},
	retry() {
		restore = null;
		return this.restore();
	},
	async authUser(
		accessToken: string,
		refreshToken: string,
		user: components["schemas"]["UserDto"],
	) {
		const epoch = ++generation;
		observation?.unsubscribe();
		invalidateVocabularyOperations();
		const current = () => epoch === generation;
		await persistAuthenticatedUser(user, current);
		if (!current()) return;
		await serializeTokens(() =>
			current() ? setAuthTokens(accessToken, refreshToken) : Promise.resolve(),
		);
		if (!current()) return;
		sessionStore.setState({
			accessToken,
			refreshToken,
			ready: true,
			error: null,
		});
		observeUser(accessToken, epoch);
		restore = Promise.resolve();
	},
	async logout() {
		generation++;
		observation?.unsubscribe();
		observation = null;
		restore = Promise.resolve();
		invalidateVocabularyOperations();
		sessionStore.setState({
			user: null,
			accessToken: null,
			refreshToken: null,
			ready: true,
			error: null,
		});
		await serializeTokens(clearAuthTokens);
	},
};
