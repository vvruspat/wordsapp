import { paths } from "../../api";

export type GetLearningResponse = paths["/learning"]["get"]["responses"]["200"]["content"]["application/json"];
export type GetLearningRequest = paths["/learning"]["get"]["parameters"]["query"];
