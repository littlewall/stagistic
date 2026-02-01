const bytesToHex = (bytes: Uint8Array) => {
    const hex: string[] = [];

    for (const byte of bytes) {
        hex.push(byte.toString(16).padStart(2, '0'));
    }

    return hex.join('');
};

export const uuidv7 = () => {
    const bytes = new Uint8Array(16);

    crypto.getRandomValues(bytes);

    const now = BigInt(Date.now());

    bytes[0] = Number((now >> 40n) & 0xffn);
    bytes[1] = Number((now >> 32n) & 0xffn);
    bytes[2] = Number((now >> 24n) & 0xffn);
    bytes[3] = Number((now >> 16n) & 0xffn);
    bytes[4] = Number((now >> 8n) & 0xffn);
    bytes[5] = Number(now & 0xffn);

    bytes[6] = (bytes[6] & 0x0f) | 0x70;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;

    const hex = bytesToHex(bytes);

    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
};
