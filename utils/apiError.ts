class ApiError extends Error {
    statusCode: number;
    success: boolean;
    message: string;
    constructor(
        statusCode: number,
        message: string = "Internal server error",
        stack: string = ""
    ) {
        super(message);
        this.statusCode = statusCode;
        this.success = false;
        this.message = message;

        if (stack) {
            this.stack = stack;
        } else {
            Error.captureStackTrace(this, this.constructor);
        }
    }
}

export default ApiError