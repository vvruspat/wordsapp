export const Colors = {
	primary: {
		base: "#C6F432",
		active: "#9EC328",
		disabled: "#637A19",
	},
	greys: {
		whiteAlpha60: "rgba(255, 255, 255, 0.6)",
		white: "#FFFFFF",
		grey1: "#F1F2F4",
		grey2: "#E0E2E6",
		grey3: "#D2D5DA",
		grey4: "#30343B",
		grey5: "#A0A5B1",
		grey6: "#7E8695",
		grey7: "#636A79",
		grey8: "#494F5A",
		grey9: "#32363E",
		grey10: "#1C1E22",
	},
	accents: {
		pink: "#F9A1FF",
		orange: "#FA8E3E",
		blue: "#8FDAFF",
		purple: "#B394FD",
		green: "#3DA000",
		red: "#D54334",
	},
	dark: {
		black: "#000000",
		black60: "rgba(0, 0, 0, 0.6)",
		dark1: "#1C1E22",
		dark2: "#25272D",
		dark3: "#30343B",
		dark4: "#3C4049",
	},

	backgrounds: {
		primaryBackground: "#101114",
		secondaryBackground: "#3F4040",
		purple: "#CA7FE8",
		blue: "#5F8FF7",
		green: "#3DA000",
		red: "#D53434",
		cyan: "#6EC5BF",
		yellow: "#E5C30B",
		orange: "#F58C32",
		pink: "#E26FF5",
	},

	transparent: "transparent" as const,
} as const;

export type ColorPalette = typeof Colors;
