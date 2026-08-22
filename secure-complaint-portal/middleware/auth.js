// =====================================================
// AUTHENTICATION MIDDLEWARE
// =====================================================

function requireAuth(req, res, next) {

    if (!req.session.user) {

        return res.status(401).json({
            error: "Authentication required"
        });
    }

    next();
}


// =====================================================
// AUTHORIZATION MIDDLEWARE
// =====================================================

function requireRole(role) {

    return (req, res, next) => {

        if (!req.session.user) {

            return res.status(401).json({
                error: "Authentication required"
            });
        }

        if (req.session.user.role !== role) {

            return res.status(403).json({
                error: "Access denied"
            });
        }

        next();
    };
}


module.exports = {
    requireAuth,
    requireRole
};