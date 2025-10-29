import { paths } from "../../api";

export type GetTopicResponse = paths["/topic"]["get"]["responses"]["200"]["content"]["application/json"];
export type GetTopicRequest = paths["/topic"]["get"]["parameters"]["query"];
