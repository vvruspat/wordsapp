const { getSentryExpoConfig } = require("@sentry/react-native/metro");
const { withAui } = require("@assistant-ui/metro");

const config = getSentryExpoConfig(__dirname);

module.exports = withAui(config);
