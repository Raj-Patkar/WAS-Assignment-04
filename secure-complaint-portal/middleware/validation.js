// =====================================================
// INPUT VALIDATION
// =====================================================

function validateRegistration(req, res, next) {

    const { name, email, password } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({
            error: "All fields are required"
        });
    }

    if (name.length < 2 || name.length > 50) {
        return res.status(400).json({
            error: "Invalid name"
        });
    }

    if (password.length < 8) {
        return res.status(400).json({
            error: "Password must be at least 8 characters"
        });
    }

    const emailRegex =
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
        return res.status(400).json({
            error: "Invalid email address"
        });
    }

    next();
}


// =====================================================
// COMPLAINT VALIDATION
// =====================================================

function validateComplaint(req, res, next) {

    const { subject, description } = req.body;

    if (!subject || !description) {
        return res.status(400).json({
            error: "Subject and description are required"
        });
    }

    if (subject.length < 3 || subject.length > 100) {
        return res.status(400).json({
            error: "Subject must be between 3 and 100 characters"
        });
    }

    if (description.length < 10 || description.length > 1000) {
        return res.status(400).json({
            error: "Description must be between 10 and 1000 characters"
        });
    }

    next();
}


module.exports = {
    validateRegistration,
    validateComplaint
};