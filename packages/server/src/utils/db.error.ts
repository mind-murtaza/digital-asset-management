function dbError(code: string, message: string, status = 500, cause?: any): any {
    const err: any = new Error(message);
    err.code = code;
    err.status = status;
    if (cause?.code === 11000) {
        err.code = 'DUPLICATE_KEY_ERROR';
        err.status = 409;
    }
    if (cause?.name === 'MongoNetworkError' || cause?.name === 'MongoServerSelectionError') {
        err.code = 'CONNECTION_ERROR';
        err.status = 503;
    }
    return err;
}

export default dbError;
