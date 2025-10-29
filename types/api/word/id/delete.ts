import { paths } from "../../../api";

export type DeleteWordByIdResponse = paths["/word/{id}"]["delete"]["responses"]["200"]["content"]["application/json"];
