import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import type { StorybookConfig } from "@storybook/react-native-web-vite";

const require = createRequire(import.meta.url);

function getAbsolutePath(value: string) {
	return dirname(require.resolve(join(value, "package.json")));
}

const config: StorybookConfig = {
	stories: [
		"../mob-ui/**/*.mdx",
		"../mob-ui/**/*.stories.@(js|jsx|mjs|ts|tsx)",
	],
	framework: {
		name: getAbsolutePath("@storybook/react-native-web-vite"),
		options: {},
	},

	viteFinal: async (conf) => ({
		...conf,
		resolve: {
			alias: {
				// Your React Native Web alias
				"react-native": "react-native-web",
			},
		},
		plugins: [
			// Ensure this is added here
			...(conf.plugins ?? []),
		],
		build: {
			...conf.build,
			commonjsOptions: { transformMixedEsModules: true },
		},
	}),
};
export default config;
