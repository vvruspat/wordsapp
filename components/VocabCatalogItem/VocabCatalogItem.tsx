import { VocabCatalog } from "@repo/types";
import { WCard, WText } from "@/mob-ui";

type VocabCatalogItemProps = VocabCatalog;

export const VocabCatalogItem = (props: VocabCatalogItemProps) => {
	return (
		<WCard
			header={
				<WText mode="primary" size="xl">
					{props.title}
				</WText>
			}
			footer={
				<WText mode="secondary" size="sm">
					Footer
				</WText>
			}
		>
			<WText mode="secondary" size="md">
				{props.description}
			</WText>
		</WCard>
	);
};
