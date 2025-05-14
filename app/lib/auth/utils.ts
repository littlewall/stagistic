export const isFormDataRequest = (request: Request): boolean => {
    const contentType = request.headers.get('Content-Type') ?? '';

    return (
        contentType.includes('application/x-www-form-urlencoded') || contentType.includes('multipart/form-data')
    );
};
