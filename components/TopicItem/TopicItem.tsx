import { Pressable, View } from "react-native";
import Topic from "@/db/models/Topic";
import { WCard, WText } from "@/mob-ui";
import { Colors } from "@/mob-ui/brand/colors";

type TopicItemProps = Pick<Topic, "title"> & {
	selected: boolean;
	onPress: () => void;
	totalCount?: number;
	greenCount?: number;
	yellowCount?: number;
};

const PROGRESS_BAR_HEIGHT = 4;
const PROGRESS_BAR_RADIUS = 2;

export const TopicItem = (props: TopicItemProps) => {
	const { totalCount, greenCount = 0, yellowCount = 0 } = props;
	const greyCount =
		totalCount !== undefined
			? Math.max(0, totalCount - greenCount - yellowCount)
			: undefined;

	const showBar = totalCount !== undefined && totalCount > 0;

	return (
		<Pressable onPress={props.onPress}>
			<WCard
				style={{
					boxSizing: "border-box",
					borderWidth: 2,
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
					{totalCount !== undefined && (
						<WText
							mode="secondary"
							size="md"
							align="right"
							style={{ flexShrink: 0, marginLeft: 8 }}
						>
							{greenCount + yellowCount}/{totalCount}
						</WText>
					)}
				</View>
				{showBar && (
					<View
						style={{
							flexDirection: "row",
							height: PROGRESS_BAR_HEIGHT,
							borderRadius: PROGRESS_BAR_RADIUS,
							overflow: "hidden",
							marginTop: 8,
						}}
					>
						{greenCount > 0 && (
							<View
								style={{
									flex: greenCount,
									backgroundColor: Colors.accents.green,
								}}
							/>
						)}
						{yellowCount > 0 && (
							<View
								style={{
									flex: yellowCount,
									backgroundColor: Colors.backgrounds.yellow,
								}}
							/>
						)}
						{(greyCount ?? 0) > 0 && (
							<View
								style={{
									flex: greyCount,
									backgroundColor: Colors.greys.grey4,
								}}
							/>
						)}
					</View>
				)}
			</WCard>
		</Pressable>
	);
};
