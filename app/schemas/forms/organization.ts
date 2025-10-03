import * as v from 'valibot';

export const organizationFormSchema = v.object({
    name: v.pipe(
        v.string('Organization name is required'),
        v.minLength(1, 'Organization name is required'),
        v.maxLength(100, 'Organization name must be at most 100 characters'),
    ),
    slug: v.optional(v.pipe(
        v.string(),
        v.minLength(3, 'Slug must be at least 3 characters'),
        v.maxLength(50, 'Slug must be at most 50 characters'),
        v.regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens'),
    )),
});

export type OrganizationFormInput = v.InferInput<typeof organizationFormSchema>;
export type OrganizationFormOutput = v.InferOutput<typeof organizationFormSchema>;
