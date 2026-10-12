/** The few Deno APIs the server uses (typechecked by tsc, run by Deno). */
declare namespace Deno {
    const env: {toObject(): Record<string, string>};
    function serve(
        options: {port: number, hostname?: string, onListen?: (address: {port: number}) => void},
        handler: (request: Request) => Response | Promise<Response>,
    ): {shutdown(): Promise<void>};
    function addSignalListener(signal: 'SIGTERM' | 'SIGINT', handler: () => void): void;
    function exit(code?: number): never;
}
