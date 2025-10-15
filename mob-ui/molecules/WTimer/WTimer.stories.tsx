import { type Meta, type StoryObj } from "@storybook/react-native";
import { View } from "react-native";
import { expect, fn, waitFor } from "storybook/test";

import { WTimer } from "./WTimer";

const onCompleteMock = fn();

const meta = {
	title: "Molecules/WTimer",
	component: WTimer,
	decorators: [
		(Story) => (
			<View style={{ flex: 1, alignItems: "flex-start" }}>
				<Story />
			</View>
		),
	],

	tags: ["autodocs"],
} satisfies Meta<typeof WTimer>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Base: Story = {
	argTypes: {
		duration: {
			control: { type: "number" },
			defaultValue: 60,
		},
		startTime: {
			control: { type: "number" },
			defaultValue: 0,
		},
		isCountingUp: {
			control: { type: "boolean" },
			options: [true, false],
			defaultValue: false,
		},
	},
	args: {
		duration: 60,
		startTime: 0,
		isCountingUp: false,
		mode: "primary",
		onComplete: onCompleteMock,
	},
	play: async ({ canvas }) => {
		const timer = await canvas.findByText("0:00");
		expect(timer).toBeTruthy();

		waitFor(() => expect(onCompleteMock).toHaveBeenCalled(), { timeout: 70 });
	},
};
