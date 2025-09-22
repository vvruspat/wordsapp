import { type Meta, type StoryObj } from "@storybook/react-native";
import { View } from "react-native";
import { expect } from "storybook/test";

import { WText } from "./WText";

const meta = {
	title: "Atoms/WText",
	component: WText,
	decorators: [
		(Story) => (
			<View style={{ flex: 1, alignItems: "flex-start" }}>
				<Story />
			</View>
		),
	],

	tags: ["autodocs"],
} satisfies Meta<typeof WText>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Base: Story = {
	argTypes: {
		mode: {
			control: { type: "radio" },
			options: ["primary", "secondary", "tertiary"],
		},
		size: {
			control: { type: "radio" },
			options: ["sm", "md", "lg"],
		},
		weight: {
			control: { type: "radio" },
			options: ["regular", "bold", "semibold", "light", "thin"],
		},
		uppercase: {
			control: { type: "boolean" },
			defaultValue: false,
		},
	},
	args: {
		testID: "text-base",
		children: "This is a text",
		mode: "primary",
		size: "md",
		weight: "regular",
		uppercase: false,
	},
	play: async ({ canvas }) => {
		const text = await canvas.getByTestId("text-base");
		expect(text).toBeTruthy();

		const byText = await canvas.getByText("This is a text");
		expect(byText).toBeTruthy();
	},
};
