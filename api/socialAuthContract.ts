import type { components } from "@vvruspat/words-types";
import type { SocialProvider } from "@/shared/session/socialAuth";

// Additive contract for words/apps/api until the next words-types release.
export type SocialChallenge = { challenge_id: string; nonce: string };
export type SocialSignInRequest = {
	provider: SocialProvider;
	challenge_id: string;
	id_token: string;
	name?: string;
};

type Post<Body, Response> = {
	post: {
		requestBody: { content: { "application/json": Body } };
		responses: { 200: { content: { "application/json": Response } } };
	};
};

export type SocialAuthPaths = {
	"/auth/social/challenge": Post<{ provider: SocialProvider }, SocialChallenge>;
	"/auth/social/signin": Post<
		SocialSignInRequest,
		{
			access_token: string;
			refresh_token: string;
			user: components["schemas"]["UserDto"];
		}
	>;
};
