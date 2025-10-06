import { paths } from "../../../api";

export type GetAuthByResetPasswordResponse = paths["/auth/reset-password"]["get"]["responses"]["200"]["content"]["application/json"];
export type GetAuthByResetPasswordRequest = paths["/auth/reset-password"]["get"]["parameters"]["query"];
