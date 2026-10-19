const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const root = path.resolve(__dirname, "..");
const excluded = new Set([
	"node_modules",
	".git",
	"ios",
	"android",
	"graphify-out",
	".expo",
	"tests",
	"stories",
	".rnstorybook",
]);
const files = [];
function scan(dir) {
	for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
		if (excluded.has(entry.name) || entry.name.startsWith(".")) continue;
		const full = path.join(dir, entry.name);
		if (entry.isDirectory()) scan(full);
		else if (/\.tsx?$/.test(entry.name) && !entry.name.endsWith(".d.ts"))
			files.push(full);
	}
}
scan(root);
const graph = new Map();
const errors = [];
const relative = (file) => path.relative(root, file).split(path.sep).join("/");
function resolve(from, name) {
	if (!name.startsWith(".") && !name.startsWith("@/")) return null;
	const base = name.startsWith("@/")
		? path.join(root, name.slice(2))
		: path.resolve(path.dirname(from), name);
	return [
		base,
		`${base}.ts`,
		`${base}.tsx`,
		path.join(base, "index.ts"),
		path.join(base, "index.tsx"),
	].find((candidate) => files.includes(candidate));
}
for (const file of files) {
	const dependencies = [];
	const source = ts.createSourceFile(
		file,
		fs.readFileSync(file, "utf8"),
		ts.ScriptTarget.Latest,
		true,
	);
	const visit = (node) => {
		const literal =
			ts.isImportDeclaration(node) || ts.isExportDeclaration(node)
				? node.moduleSpecifier
				: ts.isImportTypeNode(node) && ts.isLiteralTypeNode(node.argument)
					? node.argument.literal
					: ts.isCallExpression(node) &&
							(node.expression.kind === ts.SyntaxKind.ImportKeyword ||
								node.expression.getText(source) === "require")
						? node.arguments[0]
						: null;
		if (literal && ts.isStringLiteral(literal)) {
			const target = resolve(file, literal.text);
			if (target) {
				dependencies.push(target);
				const from = relative(file),
					to = relative(target);
				const feature = from.match(/^features\/([^/]+)\//)?.[1];
				const other = to.match(/^features\/([^/]+)\//)?.[1];
				if (feature && other && feature !== other)
					errors.push(`${from} imports another feature: ${to}`);
				if (
					/^(shared|db|mob-ui|utils)\//.test(from) &&
					/^(features|app|composition)\//.test(to)
				)
					errors.push(`${from} imports an upper layer: ${to}`);
			}
		}
		ts.forEachChild(node, visit);
	};
	visit(source);
	graph.set(file, dependencies);
}
const active = new Set(),
	done = new Set();
function walk(file, trail) {
	if (active.has(file)) {
		errors.push(
			`Cycle: ${[...trail.slice(trail.indexOf(file)), file].map(relative).join(" -> ")}`,
		);
		return;
	}
	if (done.has(file)) return;
	active.add(file);
	for (const dep of graph.get(file) || []) walk(dep, [...trail, file]);
	active.delete(file);
	done.add(file);
}
for (const file of files) walk(file, []);
if (errors.length) {
	console.error([...new Set(errors)].join("\n"));
	process.exitCode = 1;
} else
	console.log(
		`Architecture checked ${files.length} production modules (imports, reexports, types, cycles).`,
	);
