import { useContext, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { View } from "react-native";
import { MatchWordCard } from "@/components/MatchWordCard/MatchWordCard";
import { TrainingAppWrapper } from "@/components/TrainingAppWrapper";
import { BackgroundContext } from "@/context/BackgroundContext";
import { Colors } from "@/mob-ui/brand/colors";
import { shuffleArray } from "@/utils";

type WordTranslation = { word: string; translation: string };

const data: WordTranslation[] = [
	{ word: "Hello", translation: "Hola" },
	{ word: "Goodbye", translation: "Adiós" },
	{ word: "Please", translation: "Por favor" },
	{ word: "Thank you", translation: "Gracias" },
	{ word: "Yes", translation: "Sí" },
	{ word: "No", translation: "No" },
];

export default function MatchWords() {
	const [selectedWord, setSelectedWord] = useState<string | null>(null);
	const [selectedTranslation, setSelectedTranslation] = useState<string | null>(
		null,
	);
	const [burnedPairs, setBurnedPairs] = useState<WordTranslation[]>([]);

	const { setColor, setOpacity } = useContext(BackgroundContext);
	const { t } = useTranslation();

	useEffect(() => {
		setColor(Colors.backgrounds.pink);
		setOpacity(1);

		return () => {
			setOpacity(0.3);
		};
	}, [setColor, setOpacity]);

	const shuffledData = useMemo(() => shuffleArray(data), []);

	const handleWordSelect = (word: string) => {
		if (!selectedTranslation) {
			setSelectedWord(word === selectedWord ? null : word);
		} else {
			const pair = data.find((item) => item.word === word);

			if (pair?.translation === selectedTranslation) {
				// Correct match
				setSelectedWord(null);
				setSelectedTranslation(null);
				setBurnedPairs((prev) => [...prev, pair]);
			} else {
				// Incorrect match
				setSelectedWord(null);
			}
		}
	};

	const handleTranslationSelect = (translation: string) => {
		if (!selectedWord) {
			setSelectedTranslation(
				translation === selectedTranslation ? null : translation,
			);
		} else {
			const pair = data.find((item) => item.translation === translation);

			if (pair?.word === selectedWord) {
				// Correct match
				setSelectedWord(null);
				setSelectedTranslation(null);
				setBurnedPairs((prev) => [...prev, pair]);
			} else {
				// Incorrect match
				setSelectedTranslation(null);
			}
		}
	};

	return (
		<TrainingAppWrapper title={t("app_match_words_header")}>
			<View
				style={{
					flex: 1,
					flexDirection: "row",
					gap: 16,
					justifyContent: "space-between",
					marginTop: 32,
				}}
			>
				<View style={{ flex: 1, gap: 16 }}>
					{data.map((item) => (
						<MatchWordCard
							key={item.word}
							text={item.word}
							onPress={() => handleWordSelect(item.word)}
							state={
								burnedPairs.some((pair) => pair.word === item.word)
									? "correct"
									: selectedWord === item.word
										? "selected"
										: "default"
							}
						/>
					))}
				</View>

				<View style={{ flex: 1, gap: 16 }}>
					{shuffledData.map((item) => (
						<MatchWordCard
							key={item.word}
							text={item.translation}
							onPress={() => handleTranslationSelect(item.translation)}
							state={
								burnedPairs.some(
									(pair) => pair.translation === item.translation,
								)
									? "correct"
									: selectedTranslation === item.translation
										? "selected"
										: "default"
							}
						/>
					))}
				</View>
			</View>
		</TrainingAppWrapper>
	);
}
