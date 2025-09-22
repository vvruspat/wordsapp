import { type Meta, type StoryObj } from "@storybook/react-native";
import { Text, View } from "react-native";
import { expect, fn } from "storybook/test";

import { WButton } from "./WButton";

const mockPress = fn();

const meta = {
	title: "Atoms/WButton",
	component: WButton,
	decorators: [
		(Story) => (
			<View style={{ flex: 1, alignItems: "flex-start" }}>
				<Story />
			</View>
		),
	],
	args: {
		onPress: mockPress,
	},
	play: async ({ canvas, userEvent }) => {
		const text = await canvas.getByText(/.*Button/);

		expect(text).toBeInTheDocument();

		const button = await canvas.getByTestId(/.*-button/);

		await userEvent.click(button);

		expect(mockPress).toBeCalledTimes(1);
	},

	tags: ["autodocs"],
} satisfies Meta<typeof WButton>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Primary: Story = {
	args: {
		testID: "primary-button",
		mode: "primary",
		children: <Text>Primary Button</Text>,
	},
};

export const Secondary: Story = {
	args: {
		testID: "secondary-button",
		mode: "secondary",
		children: <Text>Secondary Button</Text>,
	},
};

export const Tertiary: Story = {
	args: {
		testID: "tertiary-button",
		mode: "tertiary",
		children: <Text>Tertiary Button</Text>,
	},
};

export const Red: Story = {
	args: {
		testID: "red-button",
		mode: "red",
		children: <Text>Red Button</Text>,
	},
};

export const Green: Story = {
	args: {
		testID: "green-button",
		mode: "green",
		children: <Text>Green Button</Text>,
	},
};

export const Purple: Story = {
	args: {
		testID: "purple-button",
		mode: "purple",
		children: <Text>Purple Button</Text>,
	},
};

export const Dark: Story = {
	args: {
		testID: "dark-button",
		mode: "dark",
		children: <Text>Dark Button</Text>,
	},
};
