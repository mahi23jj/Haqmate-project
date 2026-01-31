export declare class AppError extends Error {
    statusCode: number;
    isOperational: boolean;
    constructor(message: string, statusCode: number, isOperational?: boolean);
}
export declare class NotFoundError extends AppError {
    constructor(message?: string);
}
export declare class ValidationError extends AppError {
    constructor(message?: string);
}
export declare class DatabaseError extends AppError {
    constructor(message?: string);
}
export declare class UnauthorizedError extends AppError {
    constructor(message?: string);
}
//# sourceMappingURL=apperror.d.ts.map