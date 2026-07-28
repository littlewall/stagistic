export const MUTATION_ENVELOPE_VERSION = 1;
export const LOCAL_ACTOR_PLACEHOLDER = 'local-actor';
export const LOCAL_DEVICE_PLACEHOLDER = 'local-device';

export interface MutationEnvelope<TPayload = unknown> {
    version: typeof MUTATION_ENVELOPE_VERSION,
    operationId: string,
    operationType: string,
    entityKey: string,
    scriptId: string,
    actorId: string,
    deviceId: string,
    occurredAt: number,
    payload: TPayload,
}

interface CreateMutationEnvelopeInput<TPayload> {
    operationId: string,
    operationType: string,
    entityKey: string,
    scriptId: string,
    occurredAt: number,
    payload: TPayload,
    actorId?: string,
    deviceId?: string,
}

export const createMutationEnvelope = <TPayload>({
    operationId,
    operationType,
    entityKey,
    scriptId,
    occurredAt,
    payload,
    actorId = LOCAL_ACTOR_PLACEHOLDER,
    deviceId = LOCAL_DEVICE_PLACEHOLDER,
}: CreateMutationEnvelopeInput<TPayload>): MutationEnvelope<TPayload> => ({
    version: MUTATION_ENVELOPE_VERSION,
    operationId,
    operationType,
    entityKey,
    scriptId,
    actorId,
    deviceId,
    occurredAt,
    payload,
});

export const serializeMutationEnvelope = (envelope: MutationEnvelope) => {
    return JSON.stringify(envelope);
};

export const parseMutationEnvelope = (serialized: string): MutationEnvelope => {
    const value = JSON.parse(serialized) as Partial<MutationEnvelope>;

    if (
        value.version !== MUTATION_ENVELOPE_VERSION
        || typeof value.operationId !== 'string'
        || typeof value.operationType !== 'string'
        || typeof value.entityKey !== 'string'
        || typeof value.scriptId !== 'string'
        || typeof value.actorId !== 'string'
        || typeof value.deviceId !== 'string'
        || typeof value.occurredAt !== 'number'
    ) {
        throw new Error('Unsupported mutation envelope');
    }

    return value as MutationEnvelope;
};
