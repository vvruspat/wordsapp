import { type Meta, type StoryObj } from "@storybook/react-native";
import { View } from "react-native";
import { expect, fn, userEvent } from "storybook/test";

import { WCharInput } from "./WCharInput";

const onChangeTextMock = fn();

const meta = {
	title: "Molecules/WCharInput",
	component: WCharInput,
	decorators: [
		(Story) => (
			<View style={{ flex: 1, alignItems: "flex-start" }}>
				<Story />
			</View>
		),
	],

	tags: ["autodocs"],
} satisfies Meta<typeof WCharInput>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Base: Story = {
	argTypes: {
		length: {
			control: { type: "number" },
		},
		secureTextEntry: {
			control: { type: "boolean" },
			options: [true, false],
			defaultValue: false,
		},
		status: {
			control: { type: "radio" },
			options: ["default", "error", "success"],
			defaultValue: "default",
		},
	},
	args: {
		length: 4,
		onChangeText: onChangeTextMock,
	},
	play: async ({ canvas }) => {
		const inputs = await canvas.findAllByTestId(/pin-input/);
		expect(inputs.length).toBe(4);

		await userEvent.click(inputs[0]);
		await userEvent.type(inputs[0], "1");
		expect(onChangeTextMock).toHaveBeenCalledWith("1");

		await userEvent.type(inputs[1], "2");
		expect(onChangeTextMock).toHaveBeenCalledWith("12");

		await userEvent.type(inputs[2], "3");
		expect(onChangeTextMock).toHaveBeenCalledWith("123");

		await userEvent.type(inputs[3], "4");
		expect(onChangeTextMock).toHaveBeenCalledWith("1234");

		await userEvent.click(inputs[3]);
		await userEvent.keyboard("{backspace}");
		expect(onChangeTextMock).toHaveBeenCalledWith("123");

		await userEvent.click(inputs[2]);
		await userEvent.keyboard("{backspace}");
		expect(onChangeTextMock).toHaveBeenCalledWith("12");

		await userEvent.click(inputs[1]);
		await userEvent.keyboard("{backspace}");
		expect(onChangeTextMock).toHaveBeenCalledWith("1");

		await userEvent.click(inputs[0]);
		await userEvent.keyboard("{backspace}");
		expect(onChangeTextMock).toHaveBeenCalledWith("");

		await userEvent.click(inputs[0]);
		await userEvent.type(inputs[0], "5678");
		expect(onChangeTextMock).toHaveBeenCalledWith("5678");
	},
};
