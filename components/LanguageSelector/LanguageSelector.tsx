import { LANGUAGES } from "@/constants/languages";
import { WText } from "@/mob-ui";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
	FlatList,
	ListRenderItemInfo,
	StyleSheet,
	TextInput,
	TouchableOpacity,
	View,
} from "react-native";
import CountryFlag from "react-native-country-flag";

type LanguageItem = (typeof LANGUAGES)[number];

export type LanguageSelectorProps = {
	onSelect: (isoCode: LanguageItem["isoCode"]) => void;
	initialSelectedIso?: LanguageItem["isoCode"];
	placeholder?: string;
};

export const LanguageSelector = ({
	onSelect,
	initialSelectedIso,
}: LanguageSelectorProps) => {
	const [query, setQuery] = useState("");
	const [selectedIso, setSelectedIso] = useState<string | undefined>(
		initialSelectedIso,
	);

	const { t } = useTranslation();

	const filtered = useMemo(() => {
		const q = query.trim().toLowerCase();
		if (!q) return LANGUAGES;
		return LANGUAGES.filter(
			(l) =>
				l.name.toLowerCase().includes(q) ||
				l.isoCode.toLowerCase().includes(q) ||
				l.countryCode.toLowerCase().includes(q),
		);
	}, [query]);

	function handleSelect(item: LanguageItem) {
		setSelectedIso(item.isoCode);
		onSelect(item.isoCode);
	}

	function renderItem({ item }: ListRenderItemInfo<LanguageItem>) {
		const isSelected = item.isoCode === selectedIso;
		return (
			<TouchableOpacity
				style={[styles.item, isSelected && styles.itemSelected]}
				onPress={() => handleSelect(item)}
				accessibilityRole="button"
				accessibilityState={{ selected: isSelected }}
			>
				<View style={styles.flagContainer}>
					<CountryFlag isoCode={item.countryCode} size={28} />
				</View>
				<View style={styles.textContainer}>
					<WText style={styles.name}>{t(item.name)}</WText>
				</View>
			</TouchableOpacity>
		);
	}

	return (
		<View style={styles.container}>
			<TextInput
				value={query}
				onChangeText={setQuery}
				placeholder={t("search_language_placeholder")}
				style={styles.search}
				clearButtonMode="while-editing"
				accessibilityLabel={t("search_language_a11y_label")}
			/>

			<FlatList
				data={filtered}
				keyExtractor={(item) => item.isoCode}
				renderItem={renderItem}
				keyboardShouldPersistTaps="handled"
				ListEmptyComponent={
					<View style={styles.empty}>
						<WText style={styles.emptyText}>
							{t("search_language_not_found")}
						</WText>
					</View>
				}
			/>
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		width: "100%",
	},
	search: {
		height: 44,
		borderColor: "#ddd",
		borderWidth: 1,
		borderRadius: 8,
		paddingHorizontal: 12,
		marginBottom: 8,
	},
	item: {
		flexDirection: "row",
		alignItems: "center",
		paddingVertical: 10,
		paddingHorizontal: 8,
		borderBottomColor: "#f0f0f0",
		borderBottomWidth: 1,
	},
	itemSelected: {
		backgroundColor: "#eef6ff",
	},
	flagContainer: {
		width: 36,
		alignItems: "center",
		justifyContent: "center",
	},
	textContainer: {
		marginLeft: 12,
		flex: 1,
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
	},
	name: {
		fontSize: 16,
		color: "#111",
	},
	iso: {
		fontSize: 13,
		color: "#666",
	},
	empty: {
		padding: 20,
		alignItems: "center",
	},
	emptyText: {
		color: "#777",
	},
});
