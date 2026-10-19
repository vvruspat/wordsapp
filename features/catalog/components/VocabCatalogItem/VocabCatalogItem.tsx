import { Pressable } from "react-native";
import VocabCatalog from "@/db/models/VocabCatalog";
import { WCard, WText } from "@/mob-ui";
import { Colors } from "@/mob-ui/brand/colors";

type VocabCatalogItemProps = Pick<VocabCatalog, "title"> & {
	selected: boolean;
	onPress: () => void;
};

export const VocabCatalogItem = (props: VocabCatalogItemProps) => {
	return (
		<Pressable onPress={props.onPress}>
			<WCard
				style={{
					borderWidth: 2,
					borderColor: props.selected ? Colors.greys.white : Colors.transparent,
				}}
			>
				<WText mode="primary" size="xl" align="center">
					{props.title}
				</WText>
			</WCard>
		</Pressable>
	);
};
