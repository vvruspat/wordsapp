import { paths } from "../../../api";

export type GetLearningByIdResponse = paths["/learning/{id}"]["get"]["responses"]["200"]["content"]["application/json"];
export type GetLearningByIdRequest = paths["/learning/{id}"]["get"]["parameters"]["path"];
