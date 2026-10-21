const assert = require("node:assert/strict");
const { test } = require("node:test");
const {
	React,
	act,
	loadSource,
	mount,
	native,
	ui,
	translation,
} = require("./helpers.cjs");

test("skip feedback closes once while fading out and accepts a new close after reopening", async () => {
	const animations = [];
	class Value {
		setValue() {}
	}
	const { WordExcerciseCardResultModal: Result } = loadSource(
		"features/training/components/WordExcerciseResult/WordExcerciseCardResult.tsx",
		{
			"react-native": {
				...native,
				Modal: "Modal",
				Animated: {
					Value,
					View: "AnimatedView",
					timing: () => ({}),
					parallel: () => {
						let callback;
						const animation = {
							start: (next) => {
								callback = next;
								animations.push(animation);
							},
							stop: () => callback?.({ finished: false }),
							finish: () => callback?.({ finished: true }),
						};
						return animation;
					},
				},
				Easing: { in: (x) => x, out: (x) => x, ease: (x) => x },
			},
			"@/mob-ui/atoms": ui,
			"react-i18next": translation,
		},
	);
	let closes = 0;
	let show;
	function Screen() {
		const [visible, setVisible] = React.useState(true);
		show = () => setVisible(true);
		return React.createElement(Result, {
			visible,
			word: "gezin",
			translation: "семья",
			onRequestClose: () => {
				closes++;
				setVisible(false);
			},
		});
	}
	const tree = await mount(Screen);
	const close = tree.root.findByType("Button").props.onPress;
	await act(async () => {
		close();
		close();
	});
	assert.equal(closes, 1, "two taps on Continue must not advance two tasks");
	assert.equal(tree.root.findByType("Modal").props.visible, true);
	await act(async () => tree.root.findByType("Modal").props.onRequestClose());
	assert.equal(
		closes,
		1,
		"the still-visible closing modal must ignore further dismissals",
	);
	await act(async () => animations.at(-1).finish());
	assert.equal(tree.root.findByType("Modal").props.visible, false);
	await act(async () => show());
	await act(async () => tree.root.findByType("Button").props.onPress());
	assert.equal(closes, 2);
	await act(async () => tree.unmount());
});
