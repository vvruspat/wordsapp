import { paths } from "../../api";

export type GetWordResponse = paths["/word"]["get"]["responses"]["200"]["content"]["application/json"];
export type GetWordRequest = paths["/word"]["get"]["parameters"]["query"];
