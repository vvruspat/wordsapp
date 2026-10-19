// Avoid importing BottomTabBar directly to prevent react-navigation context
// mismatches with expo-router's bundled navigation packages.

import { Language } from "@vvruspat/words-types";
import Constants from "expo-constants";
import { useRouter } from "expo-router";
import { useEffect, useRef } from "react";
import { userSettingsRepository } from "@/db/repositories/userSettings.repository";
import { useDefaultCatalogSelection } from "@/hooks/useDefaultCatalogSelection";
import { useExcerciseStore } from "@/hooks/useExcerciseStore";
import { useSessionUser } from "@/hooks/useSession";
import { useVocabularyStore } from "@/hooks/useVocabularyStore";
import { useVocabularySync } from "@/hooks/useVocabularySync";

import { logger } from "@/utils/logger";
export function useAuthorizedLifecycle() {
	const router = useRouter();
	const { syncVocabulary, downloadMissingAudio } = useVocabularySync();
	const { user } = useSessionUser();

	useEffect(() => {
		if (user && !user.onboarded && !user.name) {
			router.replace("/onboarding");
		}
	}, [user, router]);
	const { isSyncing, isAudioDownloading } = useVocabularyStore();
	const {
		setCurrentCatalogs,
		setCurrentTopics,
		setHasHydrated,
		setTopicsInitialized,
		_hasHydrated,
	} = useExcerciseStore();
	const lastSyncedLanguageRef = useRef<string | null>(null);
	const lastLanguageLearnRef = useRef<string | null>(null);

	// Reset catalog/topic selection when the learning language changes
	useEffect(() => {
		if (!user?.userId || !user.language_learn) return;

		const prevLanguage = lastLanguageLearnRef.current;
		lastLanguageLearnRef.current = user.language_learn;

		if (prevLanguage !== null && prevLanguage !== user.language_learn) {
			const userId = user.userId.toString();
			setCurrentCatalogs([]);
			setCurrentTopics([]);
			setTopicsInitialized(false);
			setHasHydrated(false);
			Promise.all([
				userSettingsRepository.set(
					userId,
					"selected_catalogs",
					JSON.stringify([]),
				),
				userSettingsRepository.set(
					userId,
					"selected_topics",
					JSON.stringify([]),
				),
			]).catch(() => {});
		}
	}, [
		user?.userId,
		user?.language_learn,
		setCurrentCatalogs,
		setCurrentTopics,
		setTopicsInitialized,
		setHasHydrated,
	]);

	useEffect(() => {
		if (!user?.userId || _hasHydrated) return;

		const userId = user.userId.toString();

		let active = true;
		(async () => {
			const [savedCatalogs, savedTopics] = await Promise.all([
				userSettingsRepository.get(userId, "selected_catalogs"),
				userSettingsRepository.get(userId, "selected_topics"),
			]);

			if (!active) return;
			if (savedCatalogs) {
				setCurrentCatalogs(JSON.parse(savedCatalogs));
			}
			if (savedTopics) {
				const parsedTopics = JSON.parse(savedTopics);
				setCurrentTopics(parsedTopics);
				setTopicsInitialized(
					Array.isArray(parsedTopics) && parsedTopics.length > 0,
				);
			}

			setHasHydrated(true);
		})().catch((error) =>
			logger.error("Unable to restore selection", error, "db"),
		);
		return () => {
			active = false;
		};
	}, [
		user?.userId,
		_hasHydrated,
		setCurrentCatalogs,
		setCurrentTopics,
		setHasHydrated,
		setTopicsInitialized,
	]);

	useDefaultCatalogSelection(user?.userId, user?.language_learn);

	useEffect(() => {
		if (!user?.email_verified) {
			lastSyncedLanguageRef.current = null;
			return;
		}

		const server = Constants.expoConfig?.extra?.API_SERVER as
			| string
			| undefined;
		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), 2500);

		const checkOnlineAndSync = async () => {
			if (isSyncing || lastSyncedLanguageRef.current === user.language_learn) {
				return;
			}

			if (!server) {
				lastSyncedLanguageRef.current = user.language_learn;
				syncVocabulary(user.language_learn as Language);
				return;
			}

			try {
				const res = await fetch(server, {
					method: "GET",
					signal: controller.signal,
				});
				if (res) {
					lastSyncedLanguageRef.current = user.language_learn;
					syncVocabulary(user.language_learn as Language);
				}
			} catch {
				// Offline or server unreachable: skip sync for this run.
			} finally {
				clearTimeout(timeoutId);
			}
		};

		checkOnlineAndSync();

		return () => {
			clearTimeout(timeoutId);
			controller.abort();
		};
	}, [syncVocabulary, user, isSyncing]);

	useEffect(() => {
		if (
			!user?.email_verified ||
			!user.language_learn ||
			isSyncing ||
			isAudioDownloading ||
			lastSyncedLanguageRef.current !== user.language_learn
		) {
			return;
		}

		void downloadMissingAudio(user.language_learn as Language);
	}, [
		downloadMissingAudio,
		isAudioDownloading,
		isSyncing,
		user?.email_verified,
		user?.language_learn,
	]);
}
