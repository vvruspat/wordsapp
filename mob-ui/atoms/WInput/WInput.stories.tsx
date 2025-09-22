import { type Meta, type StoryObj } from "@storybook/react-native";
import { View } from "react-native";
import { expect, fn, userEvent } from "storybook/test";

import { WInput } from "./WInput";

const onChangeTextMock = fn();

const meta = {
	title: "Atoms/WInput",
	component: WInput,
	decorators: [
		(Story) => (
			<View
				style={{
					flex: 1,
					alignItems: "flex-start",
					justifyContent: "center",
					padding: 16,
				}}
			>
				<Story />
			</View>
		),
	],
	args: {
		onChangeText: onChangeTextMock,
	},
	tags: ["autodocs"],
} satisfies Meta<typeof WInput>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Base: Story = {
	args: {
		testID: "input-base",
		placeholder: "Placeholder",
		label: "Label",
		description: "Any kind of description or error message",
	},
	play: async ({ canvas, args }) => {
		const input = await canvas.findByPlaceholderText(
			args.placeholder ?? "Placeholder",
		);

		await expect(canvas.getByText(args.label ?? "")).toBeVisible();
		await expect(canvas.getByText(args.description ?? "")).toBeVisible();

		await expect(input).toBeVisible();

		await userEvent.type(input, "New value");

		expect(args.onChangeText).toHaveBeenCalledWith("New value");
	},
};

export const WithValueAndClear: Story = {
	args: {
		testID: "input-with-value",
		label: "Input with value",
		showClear: true,
	},
	play: async ({ canvas, args }) => {
		let input = await canvas.findByTestId("input-with-value");

		await userEvent.type(input, "Initial value");

		await expect(input).toBeVisible();

		await userEvent.type(input, " Changed");

		input = await canvas.findByDisplayValue("Initial value Changed");

		await expect(input).toBeVisible();

		const clearButton = await canvas.findByLabelText("Clear input");

		await expect(clearButton).toBeVisible();

		await userEvent.click(clearButton);

		await expect(args.onChangeText).toHaveBeenCalledWith("");
	},
};

export const SecureEntry: Story = {
	args: {
		testID: "input-secure",
		label: "Password",
		secureTextEntry: true,
		secureTextEntrySwitchable: true,
		value: "password123",
	},
	play: async ({ canvas }) => {
		const input = await canvas.findByTestId("input-secure");

		await expect(input).toBeVisible();

		let showPasswordButton = await canvas.findByLabelText("Show password");
		await expect(showPasswordButton).toBeVisible();
		await userEvent.click(showPasswordButton);

		const hidePasswordButton = await canvas.findByLabelText("Hide password");
		await expect(hidePasswordButton).toBeVisible();
		await userEvent.click(hidePasswordButton);

		showPasswordButton = await canvas.findByLabelText("Show password");
		await expect(showPasswordButton).toBeVisible();
	},
};
