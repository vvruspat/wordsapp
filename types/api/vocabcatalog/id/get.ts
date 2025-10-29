import { paths } from "../../../api";

export type GetVocabcatalogByIdResponse = paths["/vocabcatalog/{id}"]["get"]["responses"]["200"]["content"]["application/json"];
export type GetVocabcatalogByIdRequest = paths["/vocabcatalog/{id}"]["get"]["parameters"]["path"];
