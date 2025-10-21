import { useSessionUser } from "@/hooks/useSession";
import { WText } from "@/mob-ui";
import { $fetch } from "@/utils/fetch";
import { useRouter } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { FlatList, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { styles } from "../../general.styles";

const DATA = [
	{
		id: "verify_email",
		title: "Verify Email",
	},
	{
		id: "second",
		title: "Second Item",
	},
	{
		id: "third",
		title: "Third Item",
	},
];

type ItemProps = {
	id: string;
	title: string;
	onPress?: (id: string) => void;
};

const Item = ({ id, title, onPress }: ItemProps) => (
	<Pressable onPress={() => onPress?.(id)}>
		<WText mode="primary">{title}</WText>
	</Pressable>
);

export default function Profile() {
	const { t } = useTranslation();
	const router = useRouter();
	const currentUser = useSessionUser();
	const [error, setError] = useState<string>();

	const onVerifyEmailPressed = async () => {
		const { user } = currentUser || {};
		const email = user?.email;

		alert(`Email ${email}`);

		if (!email) return;

		try {
			await $fetch("/auth/verify-email/resend", "post", {
				body: { email },
			});

			alert(`Verification code sent to ${email}`);

			router.push({
				pathname: "/verify",
				params: { email },
			});
		} catch (e) {
			setError((e as Error).message);
		}
	};

	const onItemPressed = async (id: string) => {
		switch (id) {
			case "verify_email":
				alert("Navigating to Verify Email screen");
				await onVerifyEmailPressed();
				break;
			default:
				break;
		}
	};

	return (
		<SafeAreaView mode="padding" style={styles.page}>
			<WText mode="primary" size="2xl">
				{t("profile_title")}
			</WText>

			{error && <WText mode="primary">{error}</WText>}

			<FlatList
				data={DATA}
				renderItem={({ item }) => (
					<Item title={item.title} id={item.id} onPress={onItemPressed} />
				)}
				keyExtractor={(item) => item.id}
			/>
		</SafeAreaView>
	);
}
