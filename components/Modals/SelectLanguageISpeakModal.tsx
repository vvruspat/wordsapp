import { LanguageSelector } from "@/components/LanguageSelector";
import { LanguageItem } from "@/constants/languages";
import { Modal } from "react-native";

export type SelectLanguageISpeakModalProps = {
	visible: boolean;
	languageValue: LanguageItem["isoCode"];
	onClose: () => void;
	onSelect: (isoCode: LanguageItem["isoCode"]) => void;
};

export default function SelectLanguageISpeakModal({
	visible,
	languageValue,
	onClose,
	onSelect,
}: SelectLanguageISpeakModalProps) {
	return (
		<Modal visible={visible} onRequestClose={onClose} animationType="slide">
			<LanguageSelector
				initialSelectedIso={languageValue}
				onSelect={onSelect}
			/>
		</Modal>
	);
}
