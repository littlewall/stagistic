/*
 * The ladder is not a convention if nothing enforces it.
 *
 * The demand is "no absolute lengths", not "no units": px, rem and em are what
 * tokens.css exists to carry, while %, vw and ch are a different tool with no
 * ladder to violate. Expressing it as an allowed-list is what keeps
 * clamp(var(--space-sm), 1vw, var(--space-lg)) legal while padding: 5px is not.
 *
 * The rule reads inside calc(), which is deliberate: a raw 2px in
 * calc(var(--space-md) + 2px) is still an invented value.
 *
 * Hairline widths, focus rings, shadows and durations are absent from the list
 * on purpose — border-width: 1px and outline-offset: 2px are physical, not
 * ladder steps.
 */
const RELATIVE = [
    '%',
    'vw',
    'vh',
    'svh',
    'dvh',
    'svw',
    'dvw',
    'ch',
    'fr',
];

/*
 * `inset` without its longhands would be a hole you could drive through, so the
 * four physical offsets are covered too. They re-invent as readily as padding
 * does: top: 13px is the same mistake in a different property.
 */
const LADDER_RULES = {
    'declaration-property-unit-allowed-list': {
        '/^padding/': RELATIVE,
        '/^margin/': RELATIVE,
        '/gap$/': RELATIVE,
        'font-size': RELATIVE,
        'border-radius': RELATIVE,
        '/^(inset|top|right|bottom|left)$/': RELATIVE,
    },
    'color-no-hex': true,
};

/*
 * Scoped to the two packages whose ladder compliance was measured. The editor
 * canvas sizes against a printed page rather than the UI ladder, and the
 * landing site keeps its own type scale; extending the guards to either is a
 * separate decision with its own migration, not a side effect of this one.
 */
export default {
    overrides: [
        {
            files: ['packages/ui/**/*.css', 'packages/app-routes/**/*.css'],
            rules: LADDER_RULES,
        },
    ],
};
