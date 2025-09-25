import { LanguageSelector } from "@/components/LanguageSelector";
import { LanguageItem } from "@/constants/languages";
import { Modal } from "react-native";

export type SelectLanguageToLearnModalProps = {
	visible: boolean;
	languageValue: LanguageItem["isoCode"];
	onClose: () => void;
	onSelect: (isoCode: LanguageItem["isoCode"]) => void;
};

export default function SelectLanguageToLearnModal({
	visible,
	languageValue,
	onClose,
	onSelect,
}: SelectLanguageToLearnModalProps) {
	return (
		<Modal visible={visible} onRequestClose={onClose} animationType="slide">
			<LanguageSelector
				initialSelectedIso={languageValue}
				onSelect={onSelect}
			/>
		</Modal>
	);
}
