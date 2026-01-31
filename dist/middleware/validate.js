export const validate = (schema) => (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
        return res.status(400).json({
            status: "fail",
            errors: result.error.format(),
        });
    }
    req.body = result.data;
    next();
};
//# sourceMappingURL=validate.js.map