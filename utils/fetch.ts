import Config from "react-native-config";
import type { paths as Paths } from "../types";

const server = Config.API_SERVER;

type ValidUrl = keyof Paths;
type ValidMethod<U extends ValidUrl> = keyof Paths[U];

type RequestBody<
	U extends ValidUrl,
	M extends ValidMethod<U>,
> = Paths[U][M] extends {
	requestBody: { content: { "application/json": infer Body } };
}
	? Body
	: undefined;

type QueryParams<
	U extends ValidUrl,
	M extends ValidMethod<U>,
> = Paths[U][M] extends { parameters: { query: infer Q } } ? Q : undefined;

type JsonResponse<
	U extends ValidUrl,
	M extends ValidMethod<U>,
> = Paths[U][M] extends { responses: infer R }
	? R extends { [code: number]: { content: { "application/json": infer Res } } }
		? Res
		: never
	: never;

export const $fetch = async <U extends ValidUrl, M extends ValidMethod<U>>(
	url: U,
	method: M,
	options: {
		headers?: Record<string, string>;
		body?: RequestBody<U, M>;
		query?: QueryParams<U, M>;
	},
): Promise<JsonResponse<U, M>> => {
	const { body, query, headers } = options;

	if (!server) {
		throw new Error("API_SERVER is not defined");
	}

	const queryString = query
		? `?${new URLSearchParams(query as Record<string, string>).toString()}`
		: "";

	const res = await fetch(`${server}${url}${queryString}`, {
		method: method as string,
		headers: {
			"Content-Type": "application/json",
			...(headers ?? {}),
		},
		body: body ? JSON.stringify(body) : undefined,
	});

	if (!res.ok) throw new Error(`Error: ${res.status}`);

	try {
		return await res.json();
	} catch (error) {
		console.warn(
			"Failed to parse JSON response, returning empty object:",
			error,
		);
		return {} as JsonResponse<U, M>;
	}
};
