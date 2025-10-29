import { paths } from "../../../api";

export type GetTrainingByIdResponse = paths["/training/{id}"]["get"]["responses"]["200"]["content"]["application/json"];
export type GetTrainingByIdRequest = paths["/training/{id}"]["get"]["parameters"]["path"];
