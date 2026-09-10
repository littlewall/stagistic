/*
 * The Routes Carry No CSS Rule asks every surviving route module to open with
 * one line saying why it is singular. That was a convention nothing tested,
 * which is the same failure mode as the token ladder before the guards.
 */
import {globSync, readFileSync} from 'node:fs';

const files = globSync('packages/app-routes/src/**/*.module.css');
const offenders = files.filter(file => !readFileSync(file, 'utf8').trimStart().startsWith('/*'));

if (offenders.length > 0) {
    console.error('Route CSS modules must open with a comment saying why they are singular:');
    offenders.forEach(file => console.error(`  ${file}`));
    process.exit(1);
}

console.log(`${files.length} route CSS modules, all justified.`);
