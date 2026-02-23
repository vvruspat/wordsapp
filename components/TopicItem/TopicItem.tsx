import Topic from "@/db/models/Topic";
import { WCard, WText } from "@/mob-ui";
import { Colors } from "@/mob-ui/brand/colors";
import { Pressable, View } from "react-native";

type TopicItemProps = Pick<Topic, "title"> & {
	selected: boolean;
	onPress: () => void;
	learnedCount?: number;
	totalCount?: number;
};

export const TopicItem = (props: TopicItemProps) => {
	return (
		<Pressable onPress={props.onPress}>
			<WCard
				style={{
					borderWidth: props.selected ? 2 : 0,
					borderColor: props.selected ? Colors.greys.white : Colors.transparent,
				}}
			>
				<View
					style={{
						flexDirection: "row",
						alignItems: "center",
						justifyContent: "space-between",
					}}
				>
					<WText mode="primary" size="xl" align="left" style={{ flex: 1 }}>
						{props.title}
					</WText>
					{props.totalCount !== undefined && (
						<WText mode="secondary" size="md" align="right" style={{ flexShrink: 0, marginLeft: 8 }}>
							{props.learnedCount ?? 0}/{props.totalCount}
						</WText>
					)}
				</View>
			</WCard>
		</Pressable>
	);
};
