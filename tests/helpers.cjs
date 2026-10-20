const fs = require("node:fs");
const path = require("node:path");
const { createRequire } = require("node:module");
const ts = require("typescript");
const React = require("react");
const renderer = require("react-test-renderer");

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

// Compile app modules with explicit native-boundary substitutes. React and the
// assistant runtime remain real, so asynchronous updates exercise their effects.
function loadSource(relativePath, mocks = {}, cache = new Map()) {
	const filename = path.resolve(__dirname, "..", relativePath);
	if (cache.has(filename)) return cache.get(filename);
	const localRequire = createRequire(filename);
	const source = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
		fileName: filename,
		compilerOptions: {
			module: ts.ModuleKind.CommonJS,
			jsx: ts.JsxEmit.ReactJSX,
			esModuleInterop: true,
			target: ts.ScriptTarget.ES2022,
		},
	}).outputText;
	const module = { exports: {} };
	cache.set(filename, module.exports);
	const resolve = (name) => {
		if (Object.hasOwn(mocks, name)) return mocks[name];
		if (name.startsWith("@/") || name.startsWith(".")) {
			const base = name.startsWith("@/")
				? path.resolve(__dirname, "..", name.slice(2))
				: path.resolve(path.dirname(filename), name);
			const file = [
				base,
				`${base}.ts`,
				`${base}.tsx`,
				path.join(base, "index.ts"),
				path.join(base, "index.tsx"),
			].find((f) => fs.existsSync(f) && fs.statSync(f).isFile());
			if (file)
				return loadSource(
					path.relative(path.resolve(__dirname, ".."), file),
					mocks,
					cache,
				);
		}
		return localRequire(name);
	};
	new Function("require", "module", "exports", source)(
		resolve,
		module,
		module.exports,
	);
	cache.set(filename, module.exports);
	return module.exports;
}

function deferred() {
	let resolve;
	let reject;
	const promise = new Promise((yes, no) => {
		resolve = yes;
		reject = no;
	});
	return { promise, resolve, reject };
}

async function mount(Component, props = {}) {
	let tree;
	await renderer.act(async () => {
		tree = renderer.create(React.createElement(Component, props));
	});
	return tree;
}

const native = {
	View: "View",
	Pressable: "Pressable",
	KeyboardAvoidingView: "KeyboardAvoidingView",
	ActivityIndicator: "ActivityIndicator",
	Platform: { OS: "ios" },
	StyleSheet: { create: (styles) => styles },
};
const { Colors } = loadSource("mob-ui/brand/colors.ts");
const t = (key) => key;
const translation = { useTranslation: () => ({ t }) };
const ui = { WText: "Text", WButton: "Button", WCard: "Card" };
const logger = { error() {}, debug() {} };

module.exports = {
	React,
	act: renderer.act,
	loadSource,
	deferred,
	mount,
	native,
	Colors,
	translation,
	ui,
	logger,
};
