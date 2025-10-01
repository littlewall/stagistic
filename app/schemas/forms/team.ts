import {
    minLength,
    object,
    pipe,
    string,
} from 'valibot';

export const teamNameSchema = pipe(string('Team name is required'), minLength(2, 'Team name is too short'));

export const teamFormSchema = object({
    name: teamNameSchema,
});
