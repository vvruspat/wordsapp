import { paths } from "../../../api";

export type GetWordsTranslationByIdResponse = paths["/words-translation/{id}"]["get"]["responses"]["200"]["content"]["application/json"];
export type GetWordsTranslationByIdRequest = paths["/words-translation/{id}"]["get"]["parameters"]["path"];
