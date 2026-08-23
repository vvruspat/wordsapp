import FontAwesome5 from "@expo/vector-icons/FontAwesome5";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { DialogueCorrection } from "@/api/dialogues";
import { WText } from "@/mob-ui";
import { Colors } from "@/mob-ui/brand/colors";

type CorrectionRange = {
	start: number;
	end: number;
	correction: DialogueCorrection;
};

type PhraseSegment = {
	key: string;
	text: string;
	correction?: DialogueCorrection;
};

const isRenderableCorrection = (
	correction: DialogueCorrection | null | undefined,
): correction is DialogueCorrection =>
	Boolean(
		correction?.id &&
			correction.original?.trim() &&
			correction.corrected?.trim(),
	);

const correctionRanges = (
	originalText: string,
	corrections: DialogueCorrection[],
) => {
	const normalized = originalText.toLocaleLowerCase();
	const candidates = corrections
		.map((correction) => {
			const original = correction.original.trim();
			const start = normalized.indexOf(original.toLocaleLowerCase());
			return start < 0
				? null
				: { start, end: start + original.length, correction };
		})
		.filter((range): range is CorrectionRange => Boolean(range))
		.sort((left, right) => left.start - right.start || right.end - left.end);

	const ranges: CorrectionRange[] = [];
	for (const candidate of candidates) {
		const previous = ranges.at(-1);
		if (!previous || candidate.start >= previous.end) ranges.push(candidate);
	}
	return ranges;
};

const phraseSegments = (
	originalText: string,
	ranges: CorrectionRange[],
	corrected: boolean,
) => {
	const segments: PhraseSegment[] = [];
	let cursor = 0;
	for (const range of ranges) {
		if (range.start > cursor) {
			segments.push({
				key: `plain-${cursor}`,
				text: originalText.slice(cursor, range.start),
			});
		}
		segments.push({
			key: `${corrected ? "corrected" : "original"}-${range.correction.id}`,
			text: corrected
				? range.correction.corrected
				: originalText.slice(range.start, range.end),
			correction: range.correction,
		});
		cursor = range.end;
	}
	if (cursor < originalText.length) {
		segments.push({
			key: `plain-${cursor}`,
			text: originalText.slice(cursor),
		});
	}
	return segments;
};

const PhraseLine = ({
	segments,
	corrected,
	onOpenBranch,
}: {
	segments: PhraseSegment[];
	corrected: boolean;
	onOpenBranch: (id: string) => void;
}) => (
	<View style={styles.phraseLine}>
		<WText style={corrected ? styles.plus : styles.minus}>
			{corrected ? "+" : "−"}
		</WText>
		<Text style={styles.phrase}>
			{segments.map((segment) => (
				<Text
					key={segment.key}
					onPress={
						corrected && segment.correction
							? () => onOpenBranch(segment.correction?.id ?? "")
							: undefined
					}
					style={
						segment.correction
							? corrected
								? styles.correctedText
								: styles.originalText
							: undefined
					}
				>
					{segment.text}
				</Text>
			))}
		</Text>
	</View>
);

export const CorrectionCard = ({
	corrections,
	originalText,
	onOpenBranch,
}: {
	corrections: DialogueCorrection[];
	originalText: string;
	onOpenBranch: (id: string) => void;
}) => {
	const [expanded, setExpanded] = useState(false);
	const { t } = useTranslation();
	const renderableCorrections = useMemo(
		() => corrections.filter(isRenderableCorrection),
		[corrections],
	);
	const ranges = useMemo(
		() => correctionRanges(originalText, renderableCorrections),
		[originalText, renderableCorrections],
	);
	const originalSegments = useMemo(
		() => phraseSegments(originalText, ranges, false),
		[originalText, ranges],
	);
	const correctedSegments = useMemo(
		() => phraseSegments(originalText, ranges, true),
		[originalText, ranges],
	);
	const typeLabels = [
		...new Set(
			renderableCorrections.map((correction) =>
				correction.type === "typo"
					? t("dialogue_correction_typo")
					: correction.type === "grammar"
						? t("dialogue_correction_grammar")
						: t("dialogue_correction_vocabulary"),
			),
		),
	];

	return (
		<View style={styles.card}>
			<Pressable
				style={styles.header}
				onPress={() => setExpanded((value) => !value)}
			>
				<View style={styles.label}>
					<FontAwesome5 name="magic" color={Colors.accents.orange} size={12} />
					<WText
						size="xs"
						weight="semibold"
						style={{ color: Colors.accents.orange }}
					>
						{typeLabels.join(" · ")}
					</WText>
				</View>
				<FontAwesome5
					name={expanded ? "chevron-up" : "chevron-down"}
					color={Colors.greys.grey5}
					size={12}
				/>
			</Pressable>

			<View style={styles.diff}>
				<PhraseLine
					segments={originalSegments}
					corrected={false}
					onOpenBranch={onOpenBranch}
				/>
				<PhraseLine
					segments={correctedSegments}
					corrected
					onOpenBranch={onOpenBranch}
				/>
			</View>

			{expanded ? (
				<View style={styles.explanations}>
					{renderableCorrections.map((correction) => (
						<View key={correction.id} style={styles.explanation}>
							<WText size="sm" mode="secondary" wrap>
								{correction.short_explanation}
							</WText>
							<Pressable onPress={() => onOpenBranch(correction.id)}>
								<WText
									size="sm"
									weight="semibold"
									style={{ color: Colors.primary.base }}
								>
									{t("dialogue_explain_rule")} →
								</WText>
							</Pressable>
						</View>
					))}
				</View>
			) : null}
		</View>
	);
};

const styles = StyleSheet.create({
	card: {
		backgroundColor: Colors.dark.dark2,
		borderColor: Colors.dark.dark4,
		borderWidth: 1,
		borderRadius: 16,
		padding: 14,
		gap: 12,
		marginTop: 8,
	},
	header: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
	},
	label: { flexDirection: "row", alignItems: "center", gap: 8, flex: 1 },
	diff: { gap: 8 },
	phraseLine: { flexDirection: "row", gap: 8, alignItems: "flex-start" },
	phrase: {
		flex: 1,
		color: Colors.greys.white,
		fontSize: 15,
		lineHeight: 22,
	},
	minus: { color: Colors.accents.red, width: 10 },
	plus: { color: Colors.primary.base, width: 10 },
	originalText: {
		color: Colors.accents.red,
		backgroundColor: "rgba(239, 68, 68, 0.12)",
		textDecorationLine: "line-through",
	},
	correctedText: {
		color: Colors.primary.base,
		backgroundColor: "rgba(183, 255, 31, 0.12)",
		fontWeight: "600",
	},
	explanations: { gap: 12, paddingTop: 2 },
	explanation: {
		gap: 8,
		paddingTop: 10,
		borderTopColor: Colors.dark.dark4,
		borderTopWidth: 1,
	},
});
