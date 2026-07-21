import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

import {
    createMutationEnvelope,
    LOCAL_ACTOR_PLACEHOLDER,
    LOCAL_DEVICE_PLACEHOLDER,
    parseMutationEnvelope,
    serializeMutationEnvelope,
} from './mutationEnvelope';

describe('mutation envelope', () => {
    it('round-trips stable identity and domain payload fields', () => {
        const envelope = createMutationEnvelope({
            operationId: 'operation-1',
            operationType: 'music.update',
            entityKey: 'music:music-1',
            scriptId: 'script-1',
            occurredAt: 123,
            payload: {title: 'Overture'},
        });

        expect(parseMutationEnvelope(serializeMutationEnvelope(envelope))).toEqual({
            version: 1,
            operationId: 'operation-1',
            operationType: 'music.update',
            entityKey: 'music:music-1',
            scriptId: 'script-1',
            actorId: LOCAL_ACTOR_PLACEHOLDER,
            deviceId: LOCAL_DEVICE_PLACEHOLDER,
            occurredAt: 123,
            payload: {title: 'Overture'},
        });
    });

    it('rejects unknown envelope versions', () => {
        expect(() => parseMutationEnvelope('{"version":2}'))
            .toThrow('Unsupported mutation envelope');
    });
});
