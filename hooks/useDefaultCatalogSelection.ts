import { useEffect, useRef } from "react";
import { userSettingsRepository } from "@/db/repositories/userSettings.repository";
import { vocabcatalogRepository } from "@/db/repositories/vocabcatalog.repository";
import { logger } from "@/utils/logger";
import { useExcerciseStore } from "./useExcerciseStore";

export const useDefaultCatalogSelection = (
	userId?: number,
	learningLanguage?: string,
) => {
	const { currentCatalogs, setCurrentCatalogs, _hasHydrated } =
		useExcerciseStore();
	const previousLanguage = useRef(learningLanguage);

	useEffect(() => {
		if (!userId || !_hasHydrated || !useExcerciseStore.getState()._hasHydrated)
			return;
		void userSettingsRepository
			.set(
				userId.toString(),
				"selected_catalogs",
				JSON.stringify(currentCatalogs),
			)
			.catch((error) =>
				logger.error("Failed to persist catalog selection", error, "db"),
			);
	}, [currentCatalogs, userId, _hasHydrated]);

	useEffect(() => {
		if (
			!userId ||
			!learningLanguage ||
			!_hasHydrated ||
			!useExcerciseStore.getState()._hasHydrated
		)
			return;

		let active = true;
		let unsubscribe: (() => void) | undefined;
		const settingsKey = `catalog_defaults:${learningLanguage}`;
		const languageChanged =
			previousLanguage.current !== undefined &&
			previousLanguage.current !== learningLanguage;

		const initialize = async () => {
			const savedDefaults = await userSettingsRepository.get(
				userId.toString(),
				settingsKey,
			);
			if (!active) return;
			let initialized = !languageChanged && savedDefaults !== null;
			const initializedMyWordsIds = new Set<number>(
				!languageChanged && savedDefaults ? JSON.parse(savedDefaults) : [],
			);
			let persistence = Promise.resolve();
			const subscription = vocabcatalogRepository
				.observeByLanguage(learningLanguage)
				.subscribe((catalogs) => {
					if (!active || catalogs.length === 0) return;
					previousLanguage.current = learningLanguage;
					const myWordsIds = catalogs
						.filter(
							(catalog) =>
								catalog.owner === userId &&
								catalog.title.trim().toLowerCase() === "my words",
						)
						.map((catalog) => catalog.remoteId);
					const newMyWordsIds = myWordsIds.filter(
						(id) => !initializedMyWordsIds.has(id),
					);
					if (initialized && newMyWordsIds.length === 0) return;

					const selectedIds = useExcerciseStore.getState().currentCatalogs;
					const levelIds = catalogs
						.filter(
							(catalog) => catalog.title === "A1" || catalog.title === "A2",
						)
						.map((catalog) => catalog.remoteId);
					const defaults = [...levelIds, ...myWordsIds];
					let nextIds = [...new Set([...selectedIds, ...newMyWordsIds])];
					if (!initialized && selectedIds.length === 0) {
						nextIds =
							defaults.length > 0
								? [...new Set(defaults)]
								: [
										[...catalogs].sort((a, b) =>
											a.title.localeCompare(b.title),
										)[0].remoteId,
									];
					}
					setCurrentCatalogs(nextIds);
					initialized = true;
					for (const id of myWordsIds) initializedMyWordsIds.add(id);
					const initializedIds = [...initializedMyWordsIds];

					// Save selection before its marker so a restart cannot skip the default.
					persistence = persistence
						.then(async () => {
							if (!active) return;
							await userSettingsRepository.set(
								userId.toString(),
								"selected_catalogs",
								JSON.stringify(useExcerciseStore.getState().currentCatalogs),
							);
							await userSettingsRepository.set(
								userId.toString(),
								settingsKey,
								JSON.stringify(initializedIds),
							);
						})
						.catch((error) =>
							logger.error("Failed to persist catalog defaults", error, "db"),
						);
				});
			unsubscribe = () => subscription.unsubscribe();
		};

		void initialize().catch((error) =>
			logger.error("Failed to initialize catalog defaults", error, "db"),
		);
		return () => {
			active = false;
			unsubscribe?.();
		};
	}, [userId, learningLanguage, _hasHydrated, setCurrentCatalogs]);
};
