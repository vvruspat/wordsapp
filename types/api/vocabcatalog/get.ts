import { paths } from "../../api";

export type GetVocabcatalogResponse = paths["/vocabcatalog"]["get"]["responses"]["200"]["content"]["application/json"];
export type GetVocabcatalogRequest = paths["/vocabcatalog"]["get"]["parameters"]["query"];
