import { paths } from "../../../api";

export type DeleteUserByIdResponse = paths["/user/{id}"]["delete"]["responses"]["200"]["content"]["application/json"];
