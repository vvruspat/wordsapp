import { paths } from "../../api";

export type GetUserResponse = paths["/user"]["get"]["responses"]["200"]["content"]["application/json"];
export type GetUserRequest = paths["/user"]["get"]["parameters"]["query"];
