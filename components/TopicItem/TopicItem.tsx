import Topic from "@/db/models/Topic";
import { WCard, WText } from "@/mob-ui";
import { Colors } from "@/mob-ui/brand/colors";
import { Pressable } from "react-native";

type TopicItemProps = Pick<Topic, "title"> & {
	selected: boolean;
	onPress: () => void;
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
				<WText mode="primary" size="xl" align="left">
					{props.title}
				</WText>
			</WCard>
		</Pressable>
	);
};
