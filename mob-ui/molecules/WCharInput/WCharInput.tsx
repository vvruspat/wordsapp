import { ExerciseContext } from "@/context/ExerciseContext";
import { WInputProps, WText } from "@/mob-ui/atoms";
import { useCallback, useContext, useEffect, useRef, useState } from "react";
import { Pressable, TextInput, TextInputProps, View } from "react-native";
import { styles as wInputStyles } from "../../atoms/WInput/WInput.styles";
import { styles } from "./WCharInput.styles";

export interface WCharInputProps extends TextInputProps {
	length: number;
	status?: WInputProps["status"];
}

export const WCharInput = ({
	length = 4,
	onChangeText,
	status = "default",
	secureTextEntry,
	defaultValue,
	...inputProps
}: WCharInputProps) => {
	const [val, setVal] = useState(defaultValue ?? "");
	const inputRef = useRef<TextInput>(null);

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
		onChangeText?.(val);
	}, [val, onChangeText]);

	const handleTextChange = (text: string) => {
		setVal(text.slice(0, length));
	};

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
				<Pressable
					// biome-ignore lint/suspicious/noArrayIndexKey: there is no unique id here
					key={index}
					testID={`pin-input-${index}`}
					onPress={() => {
						if (typeof inputRef === "object" && inputRef?.current) {
							inputRef.current.focus();
						}
					}}
					style={[
						wInputStyles.inputRow,
						styles.inputRow,
						length >= 6 && styles.inputRowSmall,
						val[index] !== undefined
							? wInputStyles.inputRowSuccess
							: wInputStyles.inputRowDefault,
						status === "error" && wInputStyles.inputRowError,
					]}
				>
					<WText
						size={length >= 6 ? "xl" : "4xl"}
						weight="bold"
						mode="primary"
						uppercase
					>
						{secureTextEntry ? "•" : (val[index] ?? "")}
					</WText>
				</Pressable>
			))}

			<TextInput
				onChangeText={handleTextChange}
				autoFocus
				maxLength={length}
				style={styles.input}
				ref={inputRef}
				{...inputProps}
			/>
		</View>
	);
};
