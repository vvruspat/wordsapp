import { paths } from "../../../api";

export type GetUserByIdResponse = paths["/user/{id}"]["get"]["responses"]["200"]["content"]["application/json"];
export type GetUserByIdRequest = paths["/user/{id}"]["get"]["parameters"]["path"];
