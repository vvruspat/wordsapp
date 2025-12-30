import { Colors } from "@/mob-ui/brand/colors";
import type { Training } from "@repo/types";
import type React from "react";

export const apps = {
  true_or_false: {
    titleColor: Colors.dark.black,
    backgroundColor: "#F9A1FF",
    descriptionColor: Colors.dark.dark1,
  },
  choose_translation: {
    titleColor: Colors.dark.black,
    backgroundColor: "#8FDAFF",
    descriptionColor: Colors.dark.dark1,
  },
  type_translation: {
    titleColor: Colors.dark.black,
    backgroundColor: "#FFA83E",
    descriptionColor: Colors.dark.dark1,
  },
  match_words: {
    titleColor: Colors.dark.black,
    backgroundColor: "#C6F432",
    descriptionColor: Colors.dark.dark1,
  },
  listening_practice: {
    titleColor: Colors.dark.black,
    backgroundColor: "#B394FD",
    descriptionColor: Colors.dark.dark1,
  },
} as const;

export type LearningTrainingName = keyof typeof apps;

export type LearningCatalogItem = Training & {
  name: LearningTrainingName;
  component: React.ComponentType;
};

export type { apps as learningAppStyles };
