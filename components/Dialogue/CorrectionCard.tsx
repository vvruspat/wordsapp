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

const positionedTokens = (text: string) =>
	[...text.matchAll(/\p{L}+(?:[-'’]\p{L}+)*|\p{N}+|[^\p{L}\p{N}\s]+/gu)].map(
		(match) => ({
			value: match[0],
			normalized: match[0].toLocaleLowerCase(),
			start: match.index,
			end: match.index + match[0].length,
		}),
	);

const correctedPhraseSegments = (
	originalText: string,
	correctedText: string,
	corrections: DialogueCorrection[],
) => {
	const original = positionedTokens(originalText);
	const corrected = positionedTokens(correctedText);
	if (corrected.length === 0) {
		return [{ key: "corrected-empty", text: correctedText }];
	}

	const lengths = Array.from(
		{ length: original.length + 1 },
		() => new Uint16Array(corrected.length + 1),
	);
	for (let left = original.length - 1; left >= 0; left -= 1) {
		for (let right = corrected.length - 1; right >= 0; right -= 1) {
			lengths[left][right] =
				original[left].normalized === corrected[right].normalized
					? lengths[left + 1][right + 1] + 1
					: Math.max(lengths[left + 1][right], lengths[left][right + 1]);
		}
	}

	const unchanged = new Set<number>();
	let left = 0;
	let right = 0;
	while (left < original.length && right < corrected.length) {
		if (original[left].normalized === corrected[right].normalized) {
			unchanged.add(right);
			left += 1;
			right += 1;
		} else if (lengths[left + 1][right] >= lengths[left][right + 1]) {
			left += 1;
		} else {
			right += 1;
		}
	}

	const changedRuns: Array<{ start: number; end: number }> = [];
	for (let index = 0; index < corrected.length; index += 1) {
		if (unchanged.has(index)) continue;
		const start = index;
		while (index + 1 < corrected.length && !unchanged.has(index + 1)) {
			index += 1;
		}
		changedRuns.push({ start, end: index });
	}
	if (changedRuns.length === 0) {
		return [{ key: "corrected-plain", text: correctedText }];
	}

	const segments: PhraseSegment[] = [];
	let cursor = 0;
	for (const [index, run] of changedRuns.entries()) {
		const start = corrected[run.start].start;
		const end = corrected[run.end].end;
		if (start > cursor) {
			segments.push({
				key: `corrected-plain-${cursor}`,
				text: correctedText.slice(cursor, start),
			});
		}
		segments.push({
			key: `corrected-change-${start}`,
			text: correctedText.slice(start, end),
			correction: corrections[Math.min(index, corrections.length - 1)],
		});
		cursor = end;
	}
	if (cursor < correctedText.length) {
		segments.push({
			key: `corrected-plain-${cursor}`,
			text: correctedText.slice(cursor),
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
	correctedText,
	onOpenBranch,
}: {
	corrections: DialogueCorrection[];
	originalText: string;
	correctedText?: string;
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
		() =>
			correctedText
				? correctedPhraseSegments(
						originalText,
						correctedText,
						renderableCorrections,
					)
				: phraseSegments(originalText, ranges, true),
		[correctedText, originalText, ranges, renderableCorrections],
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
