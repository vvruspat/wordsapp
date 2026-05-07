import { useCallback, useContext, useEffect, useRef, useState } from "react";
import {
	Animated,
	Easing,
	Pressable,
	Text,
	TextInput,
	TextInputProps,
	View,
} from "react-native";
import { ExerciseContext } from "@/context/ExerciseContext";
import { WInputProps } from "@/mob-ui/atoms";
import { styles as wInputStyles } from "../../atoms/WInput/WInput.styles";
import { inputCellMetrics, styles } from "./WCharInput.styles";

const MAX_CELLS = 20;
const TYPEWRITER_DELAY = 80;
const CELL_STAGGER = 60;
const CELL_DURATION = 140;

export interface WCharInputProps extends TextInputProps {
	length: number;
	status?: WInputProps["status"];
	/** When true, cells appear one by one (typewriter effect) on mount */
	animateIn?: boolean;
	/** Controls only cell display casing; onChangeText always receives raw input */
	displayUppercase?: boolean;
}

export const WCharInput = ({
	length = 4,
	onChangeText,
	status = "default",
	secureTextEntry,
	defaultValue,
	animateIn = false,
	displayUppercase = true,
	...inputProps
}: WCharInputProps) => {
	const [val, setVal] = useState(defaultValue ?? "");
	const inputRef = useRef<TextInput>(null);
	const onChangeTextRef = useRef(onChangeText);
	const isMounted = useRef(false);
	useEffect(() => {
		onChangeTextRef.current = onChangeText;
	});

	const cellAnims = useRef(
		Array.from(
			{ length: MAX_CELLS },
			() => new Animated.Value(animateIn ? 0 : 1),
		),
	).current;

	// biome-ignore lint/correctness/useExhaustiveDependencies: intentionally runs once on mount
	useEffect(() => {
		if (!animateIn) return;
		Animated.sequence([
			Animated.delay(TYPEWRITER_DELAY),
			Animated.stagger(
				CELL_STAGGER,
				cellAnims.slice(0, length).map((anim) =>
					Animated.timing(anim, {
						toValue: 1,
						duration: CELL_DURATION,
						useNativeDriver: true,
						easing: Easing.out(Easing.ease),
					}),
				),
			),
		]).start();
	}, []);

	const { addCompleteListener, removeCompleteListener } =
		useContext(ExerciseContext);

	const reset = useCallback(() => {
		setVal("");
		inputRef.current?.clear();
		inputRef.current?.focus();
	}, []);

	const onExerciseComplete = useCallback(async () => {
		reset();
	}, [reset]);

	useEffect(() => {
		addCompleteListener(onExerciseComplete);
		return () => removeCompleteListener(onExerciseComplete);
	}, [addCompleteListener, removeCompleteListener, onExerciseComplete]);

	useEffect(() => {
		if (typeof inputRef === "object" && inputRef?.current) {
			inputRef.current.focus?.();
		}
	}, []);

	useEffect(() => {
		if (!isMounted.current) {
			isMounted.current = true;
			return;
		}
		onChangeTextRef.current?.(val);
	}, [val]);

	const handleTextChange = (text: string) => {
		setVal(text.slice(0, length));
	};

	const isCompact = length >= 6;
	const cellTextStyle = isCompact ? styles.inputTextSmall : styles.inputText;
	const cellTextSize = isCompact
		? inputCellMetrics.small.fontSize
		: inputCellMetrics.default.fontSize;

	return (
		<View
			style={{
				flexDirection: "row",
				gap: 8,
				justifyContent: "center",
				alignItems: "center",
				flexWrap: "wrap",
			}}
		>
			{[...Array(length)].map((_, index) => (
				<Animated.View
					// biome-ignore lint/suspicious/noArrayIndexKey: there is no unique id here
					key={index}
					style={{ opacity: cellAnims[index] }}
				>
					<Pressable
						testID={`pin-input-${index}`}
						onPress={() => {
							if (typeof inputRef === "object" && inputRef?.current) {
								inputRef.current.focus();
							}
						}}
						style={[
							wInputStyles.inputRow,
							styles.inputRow,
							isCompact && styles.inputRowSmall,
							val[index] !== undefined
								? wInputStyles.inputRowSuccess
								: wInputStyles.inputRowDefault,
							status === "error" && wInputStyles.inputRowError,
						]}
					>
						<Text
							allowFontScaling={false}
							numberOfLines={1}
							style={[
								styles.inputTextBase,
								cellTextStyle,
								{ fontSize: cellTextSize },
								displayUppercase && styles.inputTextUppercase,
							]}
						>
							{secureTextEntry ? "•" : (val[index] ?? "")}
						</Text>
					</Pressable>
				</Animated.View>
			))}

			<TextInput
				onChangeText={handleTextChange}
				autoFocus
				maxLength={length}
				autoCapitalize="none"
				autoCorrect={false}
				autoComplete="off"
				importantForAutofill="no"
				spellCheck={false}
				textContentType="none"
				style={styles.input}
				ref={inputRef}
				{...inputProps}
			/>
		</View>
	);
};
