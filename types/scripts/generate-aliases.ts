import fs from "node:fs";
import path from "node:path";

const apiJsonPath = path.resolve(
	__dirname,
	"../../../../apps/api/openapi.json",
);
const outDir = path.resolve(__dirname, "../api");

// Clean up the output directory
if (fs.existsSync(outDir)) {
	try {
		fs.rmSync(outDir, { recursive: true, force: true });
	} catch {
		// fallback for older Node versions
		const rimraf = (p: string) => {
			for (const name of fs.readdirSync(p)) {
				const cur = path.join(p, name);
				const stat = fs.lstatSync(cur);
				if (stat.isDirectory()) rimraf(cur);
				else fs.unlinkSync(cur);
			}
			fs.rmdirSync(p);
		};
		rimraf(outDir);
	}
}
fs.mkdirSync(outDir, { recursive: true });

const spec = JSON.parse(fs.readFileSync(apiJsonPath, "utf-8"));

function writeFileSafely(filePath: string, content: string) {
	fs.mkdirSync(path.dirname(filePath), { recursive: true });
	fs.writeFileSync(filePath, content, "utf-8");
}

function pascalCase(rest: string): string {
	return `${rest
		.toLowerCase()
		.split("-")
		.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
		.join("")}`;
}

// keep track of generated files per directory so we can emit index.ts re-exports
const exportsByDir = new Map<string, Set<string>>();

for (const [route, methods] of Object.entries(spec.paths)) {
	const cleanRoute =
		route.replace(/^\//, "").replace(/(\{([a-zA-Z]+)\})/g, "$2") || "root";

	for (const [method] of Object.entries(methods)) {
		const filePath = path.join(outDir, cleanRoute, `${method}.ts`);
		const dirPath = path.dirname(filePath);
		const typeNameBase = `${pascalCase(method)}${cleanRoute.split("/").map(pascalCase).join("By")}`;

		// record this file for later index.ts generation
		if (!exportsByDir.has(dirPath)) exportsByDir.set(dirPath, new Set());
		exportsByDir.get(dirPath).add(method);

		let content = `import { paths } from "../${cleanRoute
			.split("/")
			.map(() => "../")
			.join("")}api";\n\n`;

		if (methods[method].responses[200]) {
			content += `export type ${typeNameBase}Response = paths["${route}"]["${method}"]["responses"]["200"]["content"]["application/json"];\n`;
		} else if (methods[method].responses[201]) {
			content += `export type ${typeNameBase}Response = paths["${route}"]["${method}"]["responses"]["201"]["content"]["application/json"];\n`;
		} else if (methods[method].responses[204]) {
			content += `export type ${typeNameBase}Response = paths["${route}"]["${method}"]["responses"]["204"]["content"]["application/json"];\n`;
		}

		console.log(
			"Body: ",
			methods[method].requestBody,
			"Query:",
			methods[method].parameters,
		);

		let requestContent = "";
		let requestContentType = "";

		if (methods[method].requestBody) {
			requestContent += `export type ${typeNameBase}Request = paths["${route}"]["${method}"]["requestBody"]["content"]["application/json"];\n`;
		} else if (methods[method].parameters) {
			requestContent += `export type ${typeNameBase}Request = `;

			if (methods[method].parameters.findIndex((p) => p.in === "path") > -1) {
				requestContentType += `paths["${route}"]["${method}"]["parameters"]["path"]`;
			}

			if (methods[method].parameters.findIndex((p) => p.in === "query") > -1) {
				if (
					methods[method].parameters.findIndex((p1) => p1.in === "path") > -1
				) {
					requestContentType += " & ";
				}
				requestContentType += `paths["${route}"]["${method}"]["parameters"]["query"]`;
			}
			requestContent += `${requestContentType};\n`;
		}

		if (requestContentType) {
			content += requestContent;
		}

		writeFileSafely(filePath, content);
	}
}

// emit index.ts files that re-export all method modules in each directory
const entries = Array.from(exportsByDir.entries());

for (const [dir, filesSet] of entries) {
	const innerDirs = Array.from(entries).filter(
		([d]) => d.startsWith(dir) && d !== dir,
	);

	const files = Array.from(filesSet).sort();

	let indexContent = "";
	for (const f of files) {
		indexContent += `export * from "./${f}";\n`;
	}

	for (const [innerDir] of innerDirs) {
		const relativePath = path.relative(dir, innerDir);
		indexContent += `export * from "./${relativePath}";\n`;
	}

	// also export a default barrel if needed (optional)
	writeFileSafely(path.join(dir, "index.ts"), indexContent);
}

// Generate index.ts for every subfolder (including intermediate parents)
const allDirs = new Set<string>();
for (const dir of exportsByDir.keys()) {
	let cur = dir;
	while (true) {
		if (!cur.startsWith(outDir)) break;
		allDirs.add(cur);
		if (cur === outDir) break;
		cur = path.dirname(cur);
	}
}
allDirs.add(outDir); // ensure root is present

const dirsArray = Array.from(allDirs).sort();

for (const dir of dirsArray) {
	const filesSet = exportsByDir.get(dir) ?? new Set<string>();
	const files = Array.from(filesSet).sort();

	let indexContent = "";
	for (const f of files) {
		indexContent += `export * from "./${f}";\n`;
	}

	// immediate child directories
	const childDirs = dirsArray.filter(
		(d) => d !== dir && path.dirname(d) === dir,
	);
	for (const child of childDirs) {
		const rel = path.relative(dir, child).replace(/\\/g, "/");
		if (!rel) continue;
		indexContent += `export * from "./${rel}";\n`;
	}

	writeFileSafely(path.join(dir, "index.ts"), indexContent);
}
