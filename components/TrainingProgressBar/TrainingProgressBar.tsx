import { ExerciseContext } from "@/context/ExerciseContext";
import { Colors } from "@/mob-ui/brand/colors";
import { useContext } from "react";
import { View } from "react-native";

type TrainingProgressBarProps = {
	successCount?: number;
	failureCount?: number;
	totalCount?: number;
	backgroundColor?: string;
};

export function TrainingProgressBar({
	successCount: providedSuccessCount,
	failureCount: providedFailureCount,
	totalCount: providedTotalCount,
	backgroundColor = Colors.dark.dark3,
}: TrainingProgressBarProps) {
	const {
		sessionStats: {
			successCount: contextSuccessCount,
			failureCount: contextFailureCount,
			totalCount: contextTotalCount,
		},
	} = useContext(ExerciseContext);

	const successCount = providedSuccessCount ?? contextSuccessCount;
	const failureCount = providedFailureCount ?? contextFailureCount;
	const totalCount = providedTotalCount ?? contextTotalCount;

	const remainder = Math.max(0, totalCount - successCount - failureCount);

	return (
		<View
			style={{
				flexDirection: "row",
				height: 6,
				borderRadius: 3,
				borderWidth: 1,
				borderColor: backgroundColor,
				overflow: "hidden",
				width: "100%",
				backgroundColor,
			}}
		>
			{successCount > 0 && (
				<View
					style={{ flex: successCount, backgroundColor: Colors.accents.green }}
				/>
			)}
			{failureCount > 0 && (
				<View
					style={{ flex: failureCount, backgroundColor: Colors.accents.red }}
				/>
			)}
			{remainder > 0 && <View style={{ flex: remainder }} />}
			{totalCount === 0 && <View style={{ flex: 1 }} />}
		</View>
	);
}
