import {spawnSync} from 'node:child_process';
import {setTimeout as delay} from 'node:timers/promises';

/** Track descendants across their own process groups while the private CLI is alive. */
export const superviseTree = child => {
    const known = new Map();
    let inspectionError = null;
    let ownGroup = null;
    const table = () => {
        const result = spawnSync('ps', [
            '-A',
            '-o',
            'pid=,ppid=,pgid=,stat=',
        ], {encoding: 'utf8', maxBuffer: 8 * 1024 * 1024});

        if (result.error || result.status !== 0) {
            inspectionError = `Cannot inspect worker descendants: ${result.error?.message ?? result.stderr}`;

            return [];
        }

        return result.stdout.trim().split('\n').map(line => {
            const [
                pid,
                parent,
                group,
                status,
            ] = line.trim().split(/\s+/);

            return {
                pid: Number(pid),
                parent: Number(parent),
                group: Number(group),
                status,
            };
        });
    };
    const capture = () => {
        const rows = table();

        ownGroup = rows.find(row => row.pid === process.pid)?.group ?? ownGroup;

        const live = new Set(rows.map(row => row.pid));

        for (const pid of known.keys()) if (!live.has(pid)) known.delete(pid);

        let changed = true;

        while (changed) {
            changed = false;
            for (const row of rows) {
                const owned = row.pid === child.pid || row.parent === child.pid || known.has(row.parent) || known.has(row.pid) || row.group === child.pid;

                if (row.pid !== process.pid && owned) {
                    if (!known.has(row.pid)) changed = true;

                    known.set(row.pid, row);
                }
            }
        }

        return rows;
    };
    const signal = (pid, name) => {
        try {
            process.kill(pid, name);
        } catch (error) {
            // macOS can briefly report EPERM for an exiting process; final process inspection decides whether cleanup succeeded.
            if (!['ESRCH', 'EPERM'].includes(error.code)) inspectionError = error.message;
        }
    };
    const kill = () => {
        if (!child.pid) return;

        capture();

        const groups = new Set([child.pid, ...[...known.values()].map(row => row.group)]);

        for (const group of groups) if (group > 1 && group !== ownGroup) signal(-group, 'SIGKILL');

        for (const pid of known.keys()) if (pid > 1 && pid !== process.pid) signal(pid, 'SIGKILL');
    };
    const timer = setInterval(() => {
        if (child.pid) capture();
    }, 200);

    timer.unref();

    return {
        capture,
        kill,
        interrupt() {
            capture();

            if (child.pid) signal(child.pid, 'SIGTERM');
        },
        async finish() {
            clearInterval(timer);
            kill();
            for (let attempt = 0; attempt < 10; attempt++) {
                const rows = capture();
                const alive = rows.filter(row => known.has(row.pid) && !row.status?.startsWith('Z'));

                if (alive.length === 0) return {killError: inspectionError, workerPids: [...known.keys()]};

                kill();
                await delay(30);
            }

            return {killError: inspectionError ?? 'Worker descendants are still alive; keep the lock', workerPids: [...known.keys()]};
        },
    };
};
