export class AppError extends Error {
    statusCode;
    isOperational;
    constructor(message, statusCode, isOperational = true) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = isOperational;
        Error.captureStackTrace(this, this.constructor);
    }
}
export class NotFoundError extends AppError {
    constructor(message = "Resource not found") {
        super(message, 404);
    }
}
export class ValidationError extends AppError {
    constructor(message = "Validation failed") {
        super(message, 400);
    }
}
export class DatabaseError extends AppError {
    constructor(message = "Internate Server Error") {
        super(message, 500, false);
    }
}
export class UnauthorizedError extends AppError {
    constructor(message = "Unauthorized") {
        super(message, 401);
    }
}
//# sourceMappingURL=apperror.js.map