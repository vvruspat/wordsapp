import { useExcerciseStore } from "@/hooks/useExcerciseStore";
import { WButton, WCard, WText } from "@/mob-ui";
import { Colors } from "@/mob-ui/brand/colors";
import { getBiggestWordLength } from "@/utils/getBiggestWordLength";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Modal, type ModalProps, View } from "react-native";
import { SadSmileIcon } from "./assets/SadSmileIcon";

export type WordExcerciseFailureModalProps = ModalProps;

export const WordExcerciseFailureModal = ({
	onRequestClose,
	...modalProps
}: WordExcerciseFailureModalProps) => {
	const { t } = useTranslation();
	const { currentPairs } = useExcerciseStore();

	const currentPair = currentPairs[0];
	const currentWord = currentPair?.word;
	const currentTranslation = currentPair?.translation;
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
							shadowColor: Colors.accents.red,
							shadowOpacity: 0.8,
							shadowRadius: 20,
						}}
					>
						<SadSmileIcon />
					</View>
					<WText mode="primary" size="3xl">
						{t("sad_mistake")}
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
								alignItems: "center",
								justifyContent: "center",
								gap: 8,
							}}
						>
							<WText mode="tertiary" size="sm">
								{t("word")}
							</WText>
							<WText mode="primary" size={fontSize} weight="bold">
								{currentWord?.word}
							</WText>
						</View>
						<View
							style={{
								flexDirection: "column",
								alignItems: "center",
								justifyContent: "center",
								gap: 8,
							}}
						>
							<WText mode="tertiary" size="sm">
								{t("translation")}
							</WText>
							<WText mode="primary" size={fontSize} weight="bold">
								{currentTranslation?.translation}
							</WText>
						</View>
					</View>
					<WButton mode="red" onPress={onRequestClose}>
						<WText>{t("button_continue")}</WText>
					</WButton>
				</WCard>
			</View>
		</Modal>
	);
};
