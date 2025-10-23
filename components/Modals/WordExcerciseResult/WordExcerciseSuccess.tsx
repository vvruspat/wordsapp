import { WButton, WCard, WText } from "@/mob-ui";
import { useTranslation } from "react-i18next";
import { Modal, type ModalProps } from "react-native";
import { ThumbsUpIcon } from "./assets/ThumbsUpIcon";

export type WordExcerciseSuccessModalProps = ModalProps;

export const WordExcerciseSuccessModal = ({
	onRequestClose,
	...modalProps
}: WordExcerciseSuccessModalProps) => {
	const { t } = useTranslation();

	return (
		<Modal
			animationType="slide"
			{...modalProps}
			onRequestClose={onRequestClose}
		>
			<WCard>
				<ThumbsUpIcon />
				<WText>Well done!</WText>
				<WText>You have completed the exercise successfully.</WText>
				<WButton mode="green" onPress={onRequestClose}>
					{t("button_continue")}
				</WButton>
			</WCard>
		</Modal>
	);
};
