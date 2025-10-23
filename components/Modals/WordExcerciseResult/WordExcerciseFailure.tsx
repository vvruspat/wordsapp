import { WButton, WCard, WText } from "@/mob-ui";
import { useTranslation } from "react-i18next";
import { Modal, type ModalProps } from "react-native";
import { SadSmileIcon } from "./assets/SadSmileIcon";

export type WordExcerciseFailureModalProps = ModalProps;

export const WordExcerciseFailureModal = ({
	onRequestClose,
	...modalProps
}: WordExcerciseFailureModalProps) => {
	const { t } = useTranslation();

	return (
		<Modal animationType="slide" {...modalProps} presentationStyle="pageSheet">
			<WCard>
				<SadSmileIcon />
				<WText>You failed</WText>
				<WText>
					Unfortunately, you did not complete the exercise successfully.
				</WText>
				<WButton mode="red" onPress={onRequestClose}>
					{t("button_continue")}
				</WButton>
			</WCard>
		</Modal>
	);
};
