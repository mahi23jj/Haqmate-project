import { AppError } from "../utils/apperror.js";
export const globalErrorHandler = (err, req, res, next) => {
    console.error("🔥 ERROR:", err);
    // If error is known AppError
    if (err instanceof AppError) {
        return res.status(err.statusCode).json({
            status: "error",
            message: err.message,
        });
    }
    // Unknown error → avoid leaking details
    return res.status(500).json({
        status: "error",
        message: "Something went wrong",
    });
};
//# sourceMappingURL=errorHandler.js.map