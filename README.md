# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

The dialogue tutor is available in the Dialogues tab. Set
`EXPO_PUBLIC_DIALOGUES_ENABLED=false` to hide it in a public build. It uses
`EXPO_PUBLIC_API_URL` and the existing access token. Dialogue history and
drafts are cached in WatermelonDB; sending and word additions remain disabled
while offline.

1. Install dependencies

   ```bash
   nvm use
   npm ci
   ```

   Node.js 22.23.3 is pinned in `.nvmrc`, CI, and the EAS build profiles.
   The app uses Expo SDK 58 and React Native 0.88. After upgrading native
   dependencies, rebuild your development client with `npm run ios` or
   `npm run android`.

   `patch-package` preserves the local audio playback fix in `expo-audio` and
   adapts WatermelonDB 0.28's iOS installer to React Native 0.88's bridge proxy.

2. Start the app

   ```bash
   npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Code quality

`npm install` and `npm ci` install the Husky Git hooks automatically. Before
each commit, `lint-staged` runs `biome format --write` followed by `biome lint`
on staged files, using the existing `biome.json` configuration. Formatting
changes are included in the commit, and unstaged changes in partially staged
files are preserved. The hook then runs `npm run typecheck` on the entire
TypeScript project without emitting files. Lint and type errors abort the commit.
CI runs lint, regression tests, and typecheck. Type checking uses the native
TypeScript 7 compiler through `@typescript/native`; TypeScript 6 remains installed
for Expo and tools that require its JavaScript compiler API.

- `npm run format` formats the project without applying lint fixes.
- `npm run lint` lints the whole project.
- `npm run typecheck` checks TypeScript types across the whole project.
- `npm test` runs the regression tests.
- `npm run precommit` runs the staged-file checks and typecheck manually.

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
