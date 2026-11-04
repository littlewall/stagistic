const recordSession = (state, id) => {
    if (!id) return;

    if (state.sessionId && state.sessionId !== id) throw new Error('OpenCode returned a different session ID');

    if (!(/^ses_[a-zA-Z0-9_-]+$/).test(id)) throw new Error('OpenCode returned an invalid session ID');

    state.sessionId = id;
};

/** Parse OpenCode JSONL, accepting only a final assistant response from a completed step. */
export const createEventReader = expectedSession => {
    let pending = '';
    let messageId;
    const parts = new Map();
    const state = {
        sessionId: expectedSession ?? null,
        completed: false,
        error: null,
        output: '',
    };
    const line = value => {
        if (!value.trim() || state.error) return;

        try {
            const event = JSON.parse(value);

            recordSession(state, event.sessionID);

            const part = event.part ?? {};

            if (event.type === 'error') state.error = event.error?.data?.message ?? event.error?.message ?? 'OpenCode error';

            if (event.type === 'step_start') {
                state.completed = false;

                if (messageId !== part.messageID) parts.clear();

                messageId = part.messageID;
            }

            if (event.type === 'text' && typeof part.text === 'string') {
                if (part.messageID && messageId !== part.messageID) parts.clear();

                messageId = part.messageID ?? messageId;
                parts.set(part.id ?? 'text', part.text.slice(0, 65_536));
            }

            if (event.type === 'step_finish') state.completed = part.reason === 'stop';

            state.output = [...parts.values()].join('\n').slice(0, 65_536);
        } catch (error) {
            state.error = `Invalid OpenCode JSON event: ${error.message}`;
        }
    };

    return {
        state,
        feed(chunk) {
            if (state.error) return;

            pending += chunk;

            let end;

            while ((end = pending.indexOf('\n')) !== -1) {
                line(pending.slice(0, end));
                pending = pending.slice(end + 1);
            }

            if (pending.length > 1_048_576) state.error = 'OpenCode JSON event exceeds 1 MiB; see raw log';
        },
        finish() {
            line(pending);

            return state;
        },
    };
};
