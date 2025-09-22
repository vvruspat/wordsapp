import { useEffect, useRef, useState } from "react";
import { Pressable, TextInput, TextInputProps, View } from "react-native";
import { WInputProps, WText } from "@/mob-ui/atoms";
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

	useEffect(() => {
		if (inputRef.current) {
			inputRef.current.focus();
		}
	}, []);

	useEffect(() => {
		onChangeText?.(val);
	}, [val, onChangeText]);

	const handleTextChange = (text: string) => {
		setVal(text.slice(0, length));
	};

	return (
		<View style={{ flexDirection: "row", gap: 8 }}>
			{[...Array(length)].map((_, index) => (
				<Pressable
					// biome-ignore lint/suspicious/noArrayIndexKey: there is no unique id here
					key={index}
					testID={`pin-input-${index}`}
					onPress={() => {
						if (inputRef.current) {
							inputRef.current.focus();
						}
					}}
					style={[
						wInputStyles.inputRow,
						styles.inputRow,
						val[index] !== undefined
							? wInputStyles.inputRowSuccess
							: wInputStyles.inputRowDefault,
						status === "error" && wInputStyles.inputRowError,
					]}
				>
					<WText size="4xl" weight="bold" mode="primary" uppercase>
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
