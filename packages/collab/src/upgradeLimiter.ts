/*
 * Limits new collab WebSockets per client IP. Hocuspocus' Throttle counts every
 * attached doc (three per script, a whole library in the background), which
 * would ban normal clients, and keys by an empty string without a proxy header.
 * One socket carries all docs of a client, so sockets are what to limit.
 */
export const createUpgradeLimiter = ({max = 30, windowMs = 60_000}: {max?: number, windowMs?: number} = {}) => {
    const hits = new Map<string, number[]>();

    return {
        /** False when `ip` opened more than `max` sockets within `windowMs`. */
        allow: (ip: string, now = Date.now()) => {
            const recent = (hits.get(ip) ?? []).filter(at => at > now - windowMs);

            recent.push(now);
            hits.set(ip, recent);

            if (hits.size > 10_000) {
                for (const [key, times] of hits) {
                    if (times.every(at => at <= now - windowMs)) {
                        hits.delete(key);
                    }
                }
            }

            return recent.length <= max;
        },
    };
};

/** Client IP as seen by the proxy in front of the server (Caddy sets X-Forwarded-For). */
export const clientIpOf = (headers: Headers) => headers.get('x-forwarded-for')?.split(',')[0]?.trim() || headers.get('x-real-ip') || 'unknown';
