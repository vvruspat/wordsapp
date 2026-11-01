const { withAppDelegate, withPodfile } = require("expo/config-plugins");
const {
	mergeContents,
} = require("@expo/config-plugins/build/utils/generateCode");
const withNitroGoogleSignIn = require("react-native-nitro-google-signin/app.plugin.js");

module.exports = function withGoogleSignIn(config, { iosClientId } = {}) {
	if (iosClientId) {
		config = withNitroGoogleSignIn(config, {
			iosUrlScheme: iosClientId.split(".").reverse().join("."),
		});
	} else {
		// Autolinked GoogleSignIn pods need modular headers before OAuth IDs exist too.
		config = withPodfile(config, (mod) => {
			mod.modResults.contents = mergeContents({
				tag: "react-native-nitro-google-signin-google-pods",
				src: mod.modResults.contents,
				newSrc:
					"  pod 'AppCheckCore', :modular_headers => true\n  pod 'GoogleUtilities', :modular_headers => true\n  pod 'RecaptchaInterop', :modular_headers => true",
				anchor: /use_native_modules/,
				offset: 0,
				comment: "#",
			}).contents;
			return mod;
		});
	}
	return withAppDelegate(config, (mod) => {
		if (mod.modResults.language !== "swift")
			throw new Error("Google sign-in requires the Expo Swift AppDelegate");
		let source = mod.modResults.contents;
		if (!source.includes("import GoogleSignIn"))
			source = `import GoogleSignIn\n${source}`;
		mod.modResults.contents = mergeContents({
			tag: "words-google-signin-url-handler",
			src: source,
			newSrc: `  public override func application(
    _ app: UIApplication,
    open url: URL,
    options: [UIApplication.OpenURLOptionsKey: Any] = [:]
  ) -> Bool {
    if GIDSignIn.sharedInstance.handle(url) { return true }
    return super.application(app, open: url, options: options)
  }`,
			anchor: /class AppDelegate[^\n]*\{/,
			offset: 1,
			comment: "//",
		}).contents;
		// Expo SDK 58 forwards warm and cold scene URLs to AppDelegate overrides.
		return mod;
	});
};
