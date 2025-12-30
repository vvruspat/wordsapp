import { useExcerciseStore } from "@/hooks/useExcerciseStore";
import { WButton, WCard, WText } from "@/mob-ui";
import { Colors } from "@/mob-ui/brand/colors";
import { getBiggestWordLength } from "@/utils/getBiggestWordLength";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Modal, type ModalProps, View } from "react-native";
import { ThumbsUpIcon } from "./assets/ThumbsUpIcon";

export type WordExcerciseSuccessModalProps = ModalProps;

export const WordExcerciseSuccessModal = ({
	onRequestClose,
	...modalProps
}: WordExcerciseSuccessModalProps) => {
	const { t } = useTranslation();
	const { currentWord, currentTranslation } = useExcerciseStore();

	const wordLength = getBiggestWordLength(currentWord?.word || "");
	const translationLength = getBiggestWordLength(
		currentTranslation?.translation || "",
	);

	const maxLength = Math.max(wordLength, translationLength);

	const fontSize = useMemo(() => {
		if (maxLength <= 10) {
			return "xl";
		} else if (maxLength <= 14) {
			return "lg";
		} else if (maxLength <= 18) {
			return "md";
		} else {
			return "sm";
		}
	}, [maxLength]);

	return (
		<Modal
			animationType="slide"
			{...modalProps}
			transparent={true}
			onRequestClose={onRequestClose}
		>
			<View
				style={{
					flex: 1,
					flexDirection: "column",
					justifyContent: "flex-end",
					backgroundColor: Colors.dark.black60,
				}}
			>
				<View style={{ flex: 1 }} />
				<WCard
					style={{
						flex: 0,
						gap: 32,
						borderColor: Colors.greys.grey9,
						borderWidth: 1,
						borderBottomWidth: 0,
						backdropFilter: "blur(6px)",
						paddingBottom: 48,
					}}
				>
					<View
						style={{
							position: "absolute",
							top: -80,
							right: 0,
							shadowColor: Colors.accents.green,
							shadowOpacity: 0.8,
							shadowRadius: 20,
						}}
					>
						<ThumbsUpIcon />
					</View>
					<WText mode="primary" size="3xl">
						{t("excelent")}
					</WText>
					<View
						style={{
							flexDirection: "row",
							justifyContent: "center",
							alignItems: "stretch",
							gap: 32,
							borderRadius: 16,
							padding: 16,
							backgroundColor: Colors.dark.dark1,
						}}
					>
						<View
							style={{
								flexDirection: "column",
								alignItems: "flex-start",
								justifyContent: "center",
								gap: 8,
								maxWidth: "40%",
							}}
						>
							<WText
								mode="tertiary"
								size="sm"
								align="center"
								style={{
									textAlign: "center",
									width: "100%",
								}}
							>
								{t("word")}
							</WText>
							<WText
								mode="primary"
								size={fontSize}
								weight="bold"
								wrap
								style={{
									textAlign: "center",
								}}
							>
								{currentWord?.word}
							</WText>
						</View>
						<View
							style={{
								flexDirection: "column",
								alignItems: "flex-start",
								justifyContent: "center",
								gap: 8,
								maxWidth: "40%",
							}}
						>
							<WText
								mode="tertiary"
								size="sm"
								align="center"
								style={{ textAlign: "center", width: "100%" }}
							>
								{t("translation")}
							</WText>
							<WText
								mode="primary"
								size={fontSize}
								weight="bold"
								wrap
								style={{
									textAlign: "center",
								}}
							>
								{currentTranslation?.translation}
							</WText>
						</View>
					</View>
					<WButton mode="green" onPress={onRequestClose}>
						<WText>{t("button_continue")}</WText>
					</WButton>
				</WCard>
			</View>
		</Modal>
	);
};
