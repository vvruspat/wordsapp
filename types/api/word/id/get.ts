import { paths } from "../../../api";

export type GetWordByIdResponse = paths["/word/{id}"]["get"]["responses"]["200"]["content"]["application/json"];
export type GetWordByIdRequest = paths["/word/{id}"]["get"]["parameters"]["path"];
