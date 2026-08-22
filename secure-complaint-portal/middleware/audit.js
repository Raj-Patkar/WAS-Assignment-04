function logAudit(db, req, action, resource, status) {

    const userId = req.session.user
        ? req.session.user.id
        : null;

    const ipAddress =
        req.ip ||
        req.headers["x-forwarded-for"] ||
        "unknown";

    db.run(
        `
        INSERT INTO audit_logs
        (user_id, action, resource, status, ip_address)
        VALUES (?, ?, ?, ?, ?)
        `,
        [
            userId,
            action,
            resource || null,
            status,
            ipAddress
        ],
        (err) => {

            if (err) {
                console.error(
                    "Audit logging failed:",
                    err.message
                );
            }
        }
    );
}


module.exports = {
    logAudit
};