import { paths } from "../../api";

export type GetTrainingResponse = paths["/training"]["get"]["responses"]["200"]["content"]["application/json"];
export type GetTrainingRequest = paths["/training"]["get"]["parameters"]["query"];
