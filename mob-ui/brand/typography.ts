const baseSize = 17;

const sizes = {
	xs: baseSize * 0.75,
	sm: baseSize * 0.875,
	md: baseSize,
	lg: baseSize * 1.125,
	xl: baseSize * 1.25,
	"2xl": baseSize * 1.5,
	"3xl": baseSize * 1.875,
	"4xl": baseSize * 2.25,
	"5xl": baseSize * 3,
	"6xl": baseSize * 4,
};

export const typography = {
	fontFamily: {
		heading: "SFProText_700Bold",
		body: "SFProText_400Regular",
	},
	fontSize: {
		xs: sizes.xs,
		sm: sizes.sm,
		md: sizes.md,
		lg: sizes.lg,
		xl: sizes.xl,
		"2xl": sizes["2xl"],
		"3xl": sizes["3xl"],
		"4xl": sizes["4xl"],
		"5xl": sizes["5xl"],
		"6xl": sizes["6xl"],
	},
	lineHeight: {
		xs: sizes.xs * 1.5,
		sm: sizes.sm * 1.5,
		md: sizes.md * 1.5,
		lg: sizes.lg * 1.5,
		xl: sizes.xl * 1.5,
		"2xl": sizes["2xl"] * 1.5,
		"3xl": sizes["3xl"] * 1.5,
		"4xl": sizes["4xl"] * 1.5,
		"5xl": sizes["5xl"] * 1.5,
		"6xl": sizes["6xl"] * 1.5,
	},
} as const;
