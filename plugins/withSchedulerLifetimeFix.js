const { withPodfileProperties } = require("expo/config-plugins");

// Restore the delegate lifetime protection from RN #56680 for the non-error
// teardown window still documented in #58138. Keep this paired with the patch.
// React 0.88's prebuilt binary cannot use the Scheduler.cpp package patch.
// Compile the patched source on iOS; precompiled Expo modules require the
// prebuilt React core and therefore must be compiled from source as well.
module.exports = function withSchedulerLifetimeFix(config) {
	return withPodfileProperties(config, (mod) => {
		mod.modResults["ios.buildReactNativeFromSource"] = "true";
		mod.modResults.EXPO_USE_PRECOMPILED_MODULES = "false";
		return mod;
	});
};
