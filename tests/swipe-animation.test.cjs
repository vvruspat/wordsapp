const assert = require("node:assert/strict");
const { test } = require("node:test");
const { act, loadSource, mount } = require("./helpers.cjs");

function setup() {
	const animations = [];
	class Value {
		constructor(value) {
			this.value = value;
		}
		setValue(value) {
			this.value = value;
		}
	}
	const group = (items) => {
		let callback;
		const animation = {
			start(next) {
				callback = next;
				animations.push(animation);
			},
			finish(finished = true) {
				if (finished)
					for (const item of items) item.value.setValue(item.toValue);
				callback?.({ finished });
			},
			stop() {
				animation.finish(false);
			},
		};
		return animation;
	};
	const { useSwipeAnimation } = loadSource("shared/ui/useSwipeAnimation.ts", {
		"react-native": {
			Animated: {
				Value,
				timing: (value, { toValue }) => ({ value, toValue }),
				parallel: group,
				stagger: (_delay, items) => group(items),
			},
			Easing: { in: (x) => x, out: (x) => x, ease: (x) => x },
			useWindowDimensions: () => ({ width: 400 }),
		},
	});
	let hook;
	function Screen() {
		hook = useSwipeAnimation(2);
		return null;
	}
	return {
		Screen,
		animations,
		get hook() {
			return hook;
		},
	};
}

test("duplicate completion during exit and loading advances only one task", async () => {
	const app = setup();
	const tree = await mount(app.Screen);
	let loads = 0;
	const load = () => loads++;
	app.hook.swipeOut(load);
	app.hook.swipeOut(load);
	assert.equal(app.animations.length, 1);
	app.animations[0].finish();
	app.hook.swipeOut(load);
	assert.equal(loads, 1);
	app.hook.notifyContentChanged();
	assert.equal(app.animations.length, 2);
	app.animations[1].finish();
	assert.equal(app.hook.translateX.value, 0);
	assert.ok(app.hook.buttonAnims.every((value) => value.value === 0));
	app.hook.swipeOut(load);
	app.animations[2].finish();
	assert.equal(loads, 2, "a later intentional completion must still advance");
	await act(async () => tree.unmount());
});

test("a fast answer during entrance advances and ignores the cancelled entrance callback", async () => {
	const app = setup();
	const tree = await mount(app.Screen);
	let loads = 0;
	const load = () => {
		loads++;
		app.hook.notifyContentChanged();
	};
	app.hook.swipeOut(load);
	app.animations[0].finish();
	app.hook.swipeOut(load);
	app.animations[1].finish(false);
	app.animations[2].finish();
	app.animations[3].finish();
	assert.equal(loads, 2);
	assert.equal(app.hook.translateX.value, 0);
	await act(async () => tree.unmount());
});

test("content arriving before the native exit callback still brings the prompt back", async () => {
	const app = setup();
	const tree = await mount(app.Screen);
	let loads = 0;
	app.hook.swipeOut(() => loads++);
	app.hook.notifyContentChanged();
	app.animations[0].finish();
	assert.equal(loads, 1);
	assert.equal(
		app.animations.length,
		2,
		"the early content notification must not be lost",
	);
	app.animations[1].finish();
	assert.equal(app.hook.translateX.value, 0);
	await act(async () => tree.unmount());
});

test("an interrupted entrance settles the prompt and answer buttons on screen", async () => {
	const app = setup();
	const tree = await mount(app.Screen);
	app.hook.swipeOut(() => app.hook.notifyContentChanged());
	app.animations[0].finish(false);
	app.animations[1].finish(false);
	assert.equal(app.hook.translateX.value, 0);
	assert.ok(app.hook.buttonAnims.every((value) => value.value === 0));
	await act(async () => tree.unmount());
});

test("unmount cancels an exit and ignores a late native callback", async () => {
	const app = setup();
	const tree = await mount(app.Screen);
	let loads = 0;
	app.hook.swipeOut(() => loads++);
	await act(async () => tree.unmount());
	app.animations[0].finish();
	assert.equal(loads, 0);
});
