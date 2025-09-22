import React, {
	forwardRef,
	useEffect,
	useImperativeHandle,
	useRef,
	useState,
} from "react";
import {
	Animated,
	Easing,
	NativeSyntheticEvent,
	TextInput,
	TextInputFocusEventData,
	TextInputProps,
	TextStyle,
	TouchableOpacity,
	View,
	ViewStyle,
} from "react-native";
import { typography } from "@/mob-ui/brand/typography";
import { WText, WTextProps } from "../WText";
import { ClearIcon } from "./icons/ClearIcon";
import { EyeCloseIcon } from "./icons/EyeCloseIcon";
import { EyeOpenIcon } from "./icons/EyeOpenIcon";
import { styles } from "./WInput.styles";

export interface WInputProps extends TextInputProps {
	label?: string;
	status?: "default" | "error" | "success";
	description?: string;
	containerStyle?: ViewStyle;
	inputRowStyle?: ViewStyle;
	inputStyle?: TextStyle;
	before?: React.ReactNode;
	after?: React.ReactNode;
	showClear?: boolean;
	focused?: boolean;
	secureTextEntrySwitchable?: boolean;
	fullWidth?: boolean;
	textProps?: WTextProps;
}

export const WInput = forwardRef<TextInput, WInputProps>((props, ref) => {
	const {
		label,
		status = "default",
		containerStyle,
		inputRowStyle,
		inputStyle,
		before,
		after,
		showClear = true,
		secureTextEntry,
		secureTextEntrySwitchable = true,
		description,
		value,
		defaultValue,
		fullWidth = true,
		focused = false,
		onChangeText,
		textProps,
		...rest
	} = props;

	const internalRef = useRef<TextInput | null>(null);
	useImperativeHandle(ref, () => internalRef.current as TextInput);

	const [isSecure, setIsSecure] = useState<boolean>(!!secureTextEntry);
	const [internalValue, setInternalValue] = useState(
		defaultValue ?? value ?? "",
	);

	useEffect(() => {
		if (value !== undefined) {
			setInternalValue(value);
		}
	}, [value]);

	const anim = useRef(new Animated.Value(0)).current; // 0 = unfocused, 1 = focused

	const shadowOpacity = anim.interpolate({
		inputRange: [0, 1],
		outputRange: [0, 1],
	});

	const shadowRadius = anim.interpolate({
		inputRange: [0, 1],
		outputRange: [0, 4],
	});

	const elevation = anim.interpolate({
		inputRange: [0, 1],
		outputRange: [0, 4],
	});

	const styleMode = (status.charAt(0).toUpperCase() + status.slice(1)) as
		| "Default"
		| "Error"
		| "Success";

	const fontSize = textProps?.size
		? typography.fontSize[textProps.size]
		: typography.fontSize.md;

	const handleClear = () => {
		handleTextChange("");
		internalRef.current?.focus();
	};

	const handleTextChange = (text: string) => {
		onChangeText?.(text);
		if (value === undefined) {
			setInternalValue(text);
		}
	};

	const handleInputFocus = (
		e: NativeSyntheticEvent<TextInputFocusEventData>,
	) => {
		Animated.timing(anim, {
			toValue: 1,
			duration: 200,
			easing: Easing.inOut(Easing.ease),
			useNativeDriver: false,
		}).start();
		rest.onFocus?.(e);
	};

	const handleInputBlur = (
		e: NativeSyntheticEvent<TextInputFocusEventData>,
	) => {
		Animated.timing(anim, {
			toValue: 0,
			duration: 200,
			easing: Easing.inOut(Easing.ease),
			useNativeDriver: false,
		}).start();
		rest.onBlur?.(e);
	};

	useEffect(() => {
		if (focused) {
			internalRef.current?.focus();
		} else {
			internalRef.current?.blur();
		}
	}, [focused]);

	useEffect(() => {
		if (!secureTextEntrySwitchable) {
			setIsSecure(!!secureTextEntry);
		}
	}, [secureTextEntry, secureTextEntrySwitchable]);

	return (
		<View
			style={[styles.wrapper, fullWidth && styles.fullWidth, containerStyle]}
		>
			{label ? (
				<WText mode="primary" size="sm" style={styles.label}>
					{label}
				</WText>
			) : null}

			<Animated.View
				style={[
					styles.inputRow,
					styles[`inputRow${styleMode}`],
					{
						shadowOpacity,
						shadowRadius,
						elevation,
					},
					inputRowStyle,
				]}
			>
				{before ? <View style={styles.left}>{before}</View> : null}

				<TextInput
					ref={internalRef}
					allowFontScaling={false}
					style={[
						styles.input,
						styles[`${textProps?.mode ?? "primary"}`],
						styles[`${textProps?.weight ?? "regular"}`],
						{
							fontSize,
						},
						inputStyle,
					]}
					placeholderTextColor={styles.inputRowPlaceholder.color}
					secureTextEntry={isSecure}
					value={value}
					defaultValue={defaultValue}
					onChangeText={handleTextChange}
					onFocus={handleInputFocus}
					onBlur={handleInputBlur}
					underlineColorAndroid="transparent"
					{...rest}
				/>

				{showClear && internalValue && (
					<TouchableOpacity
						onPress={handleClear}
						style={styles.actionButton}
						accessibilityLabel="Clear input"
					>
						<ClearIcon fill={styles.inputRow.color} />
					</TouchableOpacity>
				)}

				{secureTextEntry && secureTextEntrySwitchable && (
					<TouchableOpacity
						onPress={() => setIsSecure((s) => !s)}
						style={styles.actionButton}
						accessibilityLabel={isSecure ? "Show password" : "Hide password"}
					>
						{isSecure ? (
							<EyeOpenIcon fill={styles.inputRow.color} />
						) : (
							<EyeCloseIcon fill={styles.inputRow.color} />
						)}
					</TouchableOpacity>
				)}

				{after ? <View style={styles.right}>{after}</View> : null}
			</Animated.View>

			{description ? (
				<WText
					size="xs"
					mode="tertiary"
					style={[styles.description, styles[`description${styleMode}`]]}
				>
					{description}
				</WText>
			) : null}
		</View>
	);
});

export default WInput;
