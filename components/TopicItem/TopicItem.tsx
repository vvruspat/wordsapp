import { Pressable, View } from "react-native";
import Topic from "@/db/models/Topic";
import { WCard, WText } from "@/mob-ui";
import { Colors } from "@/mob-ui/brand/colors";

type TopicItemProps = Pick<Topic, "title"> & {
	selected: boolean;
	onPress: () => void;
	learnedCount?: number;
	totalCount?: number;
	translatedTitle?: string;
	greenScore?: number;
	yellowScore?: number;
};

export const TopicItem = (props: TopicItemProps) => {
	const total = props.totalCount ?? 0;
	const green = props.greenScore ?? 0;
	const yellow = props.yellowScore ?? 0;
	const showChart = total > 0;

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
					<View style={{ flex: 1 }}>
						<WText mode="primary" size="xl" align="left">
							{props.title}
						</WText>
						{props.translatedTitle && (
							<WText mode="secondary" size="sm" align="left">
								{props.translatedTitle}
							</WText>
						)}
					</View>
					{props.totalCount !== undefined && (
						<WText
							mode="secondary"
							size="md"
							align="right"
							style={{ flexShrink: 0, marginLeft: 8 }}
						>
							{props.learnedCount ?? 0}/{props.totalCount}
						</WText>
					)}
				</View>
				{showChart && (
					<View
						style={{
							flexDirection: "row",
							height: 4,
							borderRadius: 2,
							overflow: "hidden",
							marginTop: 10,
						}}
					>
						{green > 0 && (
							<View
								style={{
									flex: green,
									backgroundColor: Colors.accents.green,
								}}
							/>
						)}
						{yellow > 0 && (
							<View
								style={{
									flex: yellow,
									backgroundColor: Colors.backgrounds.yellow,
								}}
							/>
						)}
						<View
							style={{
								flex: Math.max(total - green - yellow, 0),
								backgroundColor: Colors.greys.grey4,
							}}
						/>
					</View>
				)}
			</WCard>
		</Pressable>
	);
};
