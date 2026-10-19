import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert } from "react-native";
import { createReport } from "@/api/report";

import { logger } from "@/utils/logger";
type ReportType = "word" | "translation" | "audio";
export function useReport(wordId: number) {
	const { t } = useTranslation();
	const [modalVisible, setModalVisible] = useState(false);

	const closeModal = useCallback(() => {
		setModalVisible(false);
	}, []);

	const submitReport = useCallback(
		async (type: ReportType) => {
			try {
				const result = await createReport({ word: wordId, type });
				if (result.status === "success") {
					closeModal();
					Alert.alert(t("report_success"));
				} else {
					Alert.alert(t("report_error"));
				}
			} catch (error) {
				logger.error("Unable to submit report", error, "general");
				Alert.alert(t("report_error"));
			}
		},
		[wordId, t, closeModal],
	);

	const handlePress = useCallback(() => {
		setModalVisible(true);
	}, []);

	const reportOptions: { label: string; type: ReportType }[] = [
		{ label: t("report_word"), type: "word" },
		{ label: t("report_translation"), type: "translation" },
		{ label: t("report_audio"), type: "audio" },
	];

	return {
		t,
		modalVisible,
		closeModal,
		submitReport,
		handlePress,
		reportOptions,
	};
}
