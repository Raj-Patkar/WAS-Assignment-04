require("dotenv").config();

const express = require("express");
const session = require("express-session");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const bcrypt = require("bcrypt");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const {
    requireAuth,
    requireRole
} = require("./middleware/auth");

const {
    validateRegistration,
    validateComplaint
} = require("./middleware/validation");

const {
    logAudit
} = require("./middleware/audit");

const app = express();
const PORT = process.env.PORT || 3000;

// =====================================================
// DATABASE
// =====================================================

const db = new sqlite3.Database("./database/database.db", (err) => {
    if (err) {
        console.error("Database connection failed:", err.message);
    } else {
        console.log("Connected to SQLite database.");
    }
});

// Create tables
db.serialize(() => {

    // Users table
    db.run(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'STUDENT',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Complaints table
    db.run(`
        CREATE TABLE IF NOT EXISTS complaints (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            subject TEXT NOT NULL,
            description TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'PENDING',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

            FOREIGN KEY (user_id)
            REFERENCES users(id)
        )
    `);

    // Audit logs
    db.run(`
        CREATE TABLE IF NOT EXISTS audit_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            action TEXT NOT NULL,
            resource TEXT,
            status TEXT NOT NULL,
            ip_address TEXT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,

            FOREIGN KEY (user_id)
            REFERENCES users(id)
        )
    `);

    console.log("Database tables initialized.");
});




function createDefaultAdmin() {

    const adminEmail =
        process.env.ADMIN_EMAIL || "admin@secureportal.com";

    const adminPassword =
        process.env.ADMIN_PASSWORD || "Admin@12345";

    db.get(
        "SELECT id FROM users WHERE email = ?",
        [adminEmail],
        async (err, user) => {

            if (err) {
                console.error("Admin check failed:", err);
                return;
            }

            // Admin already exists
            if (user) {
                return;
            }

            try {

                const passwordHash =
                    await bcrypt.hash(adminPassword, 12);

                db.run(
                    `
                    INSERT INTO users
                    (name, email, password_hash, role)
                    VALUES (?, ?, ?, ?)
                    `,
                    [
                        "System Administrator",
                        adminEmail,
                        passwordHash,
                        "ADMIN"
                    ],
                    (err) => {

                        if (err) {
                            console.error(
                                "Admin creation failed:",
                                err
                            );
                            return;
                        }

                        console.log(
                            "Default admin account created."
                        );
                    }
                );

            } catch (error) {

                console.error(
                    "Admin password hashing failed:",
                    error
                );

            }
        }
    );
}


createDefaultAdmin();
// =====================================================
// SECURITY CONFIGURATION
// =====================================================

app.use(helmet());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.set("trust proxy", 1);
// Session configuration
app.use(
    session({
        secret: process.env.SESSION_SECRET,
        resave: false,
        saveUninitialized: false,

        cookie: {
            httpOnly: true,
            sameSite: "lax",
            secure: false,
            maxAge: 30 * 60 * 1000
        }
    })
);

// Login rate limiter
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: {
        error: "Too many login attempts. Please try again later."
    }
});

app.use("/api/login", loginLimiter);

// Serve frontend
app.use(express.static(path.join(__dirname, "public")));

// =====================================================
// TEST ROUTE
// =====================================================

app.get("/api/test", (req, res) => {

    res.json({
        message: "Secure Complaint Portal API is running",

        security: {
            helmet: true,
            sessions: true,
            rateLimiting: true,
            passwordHashing: true,
            auditLogging: true
        }
    });
});


// =====================================================
// REGISTER
// =====================================================

app.post(
    "/api/register",
    validateRegistration,
    async (req, res) => {

        const { name, email, password } = req.body;

        try {

            // Check if user already exists
            db.get(
                "SELECT id FROM users WHERE email = ?",
                [email],
                async (err, existingUser) => {

                    if (err) {
                        console.error(err);

                        return res.status(500).json({
                            error: "Something went wrong"
                        });
                    }

                    if (existingUser) {

                        return res.status(409).json({
                            error: "Email already registered"
                        });
                    }

                    // Hash password
                    const passwordHash =
                        await bcrypt.hash(password, 12);

                    db.run(
                        `
                        INSERT INTO users
                        (name, email, password_hash, role)
                        VALUES (?, ?, ?, 'STUDENT')
                        `,
                        [name, email, passwordHash],
                        function (err) {

                            if (err) {

                                console.error(err);

                                return res.status(500).json({
                                    error: "Unable to create account"
                                });
                            }

                            logAudit(
                                db,
                                req,
                                "USER_REGISTERED",
                                `User ${this.lastID}`,
                                "SUCCESS"
                            );

                            res.status(201).json({
                                message:
                                    "Registration successful"
                            });
                        }
                    );
                }
            );

        } catch (error) {

            console.error(error);

            res.status(500).json({
                error: "Something went wrong"
            });
        }
    }
);


// =====================================================
// LOGIN
// =====================================================

app.post("/api/login", async (req, res) => {

    const { email, password } = req.body;

    if (!email || !password) {

        return res.status(400).json({
            error: "Email and password are required"
        });
    }

    db.get(
        "SELECT * FROM users WHERE email = ?",
        [email],
        async (err, user) => {

            if (err) {

                console.error(err);

                return res.status(500).json({
                    error: "Something went wrong"
                });
            }

            if (!user) {

                logAudit(
                    db,
                    req,
                    "LOGIN_FAILED",
                    email,
                    "FAILED"
                );

                return res.status(401).json({
                    error: "Invalid credentials"
                });
            }

            const passwordMatch =
                await bcrypt.compare(
                    password,
                    user.password_hash
                );

            if (!passwordMatch) {

                logAudit(
                    db,
                    req,
                    "LOGIN_FAILED",
                    email,
                    "FAILED"
                );

                return res.status(401).json({
                    error: "Invalid credentials"
                });
            }

            // Regenerate session after successful login
            req.session.regenerate((sessionError) => {

                if (sessionError) {

                    console.error(sessionError);

                    return res.status(500).json({
                        error: "Unable to create session"
                    });
                }

                req.session.user = {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    role: user.role
                };

                logAudit(
                    db,
                    req,
                    "LOGIN_SUCCESS",
                    `User ${user.id}`,
                    "SUCCESS"
                );

                res.json({
                    message: "Login successful",
                    user: req.session.user
                });
            });
        }
    );
});


// =====================================================
// LOGOUT
// =====================================================

app.post("/api/logout", requireAuth, (req, res) => {

    const userId = req.session.user.id;

    logAudit(
        db,
        req,
        "LOGOUT",
        `User ${userId}`,
        "SUCCESS"
    );

    req.session.destroy((err) => {

        if (err) {

            console.error(err);

            return res.status(500).json({
                error: "Unable to logout"
            });
        }

        res.clearCookie("connect.sid");

        res.json({
            message: "Logout successful"
        });
    });
});
// =====================================================
// CURRENT USER
// =====================================================

app.get("/api/me", requireAuth, (req, res) => {

    res.json({
        user: req.session.user
    });
});


// =====================================================
// CREATE COMPLAINT
// =====================================================

app.post(
    "/api/complaints",
    requireAuth,
    validateComplaint,
    (req, res) => {

        const { subject, description } = req.body;
        const userId = req.session.user.id;

        db.run(
            `
            INSERT INTO complaints
            (user_id, subject, description)
            VALUES (?, ?, ?)
            `,
            [userId, subject, description],
            function (err) {

                if (err) {

                    console.error(err);

                    return res.status(500).json({
                        error: "Unable to submit complaint"
                    });
                }

                const complaintId = this.lastID;

                logAudit(
                    db,
                    req,
                    "COMPLAINT_CREATED",
                    `Complaint ${complaintId}`,
                    "SUCCESS"
                );

                res.status(201).json({
                    message: "Complaint submitted successfully",
                    complaintId
                });
            }
        );
    }
);


// =====================================================
// GET MY COMPLAINTS
// =====================================================

app.get(
    "/api/complaints/my",
    requireAuth,
    (req, res) => {

        const userId = req.session.user.id;

        db.all(
            `
            SELECT
                id,
                subject,
                description,
                status,
                created_at
            FROM complaints
            WHERE user_id = ?
            ORDER BY created_at DESC
            `,
            [userId],
            (err, complaints) => {

                if (err) {

                    console.error(err);

                    return res.status(500).json({
                        error: "Unable to retrieve complaints"
                    });
                }

                res.json({
                    complaints
                });
            }
        );
    }
);

// =====================================================
// GET SINGLE COMPLAINT
// =====================================================

app.get(
    "/api/complaints/:id",
    requireAuth,
    (req, res) => {

        const complaintId = req.params.id;
        const userId = req.session.user.id;

        // Validate ID
        if (!/^\d+$/.test(complaintId)) {

            return res.status(400).json({
                error: "Invalid complaint ID"
            });
        }

        db.get(
            `
            SELECT
                id,
                user_id,
                subject,
                description,
                status,
                created_at
            FROM complaints
            WHERE id = ?
            `,
            [complaintId],
            (err, complaint) => {

                if (err) {

                    console.error(err);

                    return res.status(500).json({
                        error: "Unable to retrieve complaint"
                    });
                }

                if (!complaint) {

                    return res.status(404).json({
                        error: "Complaint not found"
                    });
                }

                // ==========================================
                // AUTHORIZATION / IDOR PROTECTION
                // ==========================================

                if (
                    complaint.user_id !== userId &&
                    req.session.user.role !== "ADMIN"
                ) {

                    logAudit(
                        db,
                        req,
                        "COMPLAINT_ACCESS_DENIED",
                        `Complaint ${complaintId}`,
                        "DENIED"
                    );

                    return res.status(403).json({
                        error: "Access denied"
                    });
                }

                logAudit(
                    db,
                    req,
                    "COMPLAINT_VIEWED",
                    `Complaint ${complaintId}`,
                    "SUCCESS"
                );

                res.json({
                    complaint
                });
            }
        );
    }
);


// =====================================================
// ADMIN - VIEW ALL COMPLAINTS
// =====================================================

app.get(
    "/api/admin/complaints",
    requireRole("ADMIN"),
    (req, res) => {

        db.all(
            `
            SELECT
                complaints.id,
                complaints.subject,
                complaints.description,
                complaints.status,
                complaints.created_at,
                users.name,
                users.email
            FROM complaints
            JOIN users
            ON complaints.user_id = users.id
            ORDER BY complaints.created_at DESC
            `,
            [],
            (err, complaints) => {

                if (err) {

                    console.error(err);

                    return res.status(500).json({
                        error: "Unable to retrieve complaints"
                    });
                }

                res.json({
                    complaints
                });
            }
        );
    }
);



// =====================================================
// ADMIN - UPDATE COMPLAINT STATUS
// =====================================================

app.patch(
    "/api/admin/complaints/:id",
    requireRole("ADMIN"),
    (req, res) => {

        const complaintId = req.params.id;
        const { status } = req.body;

        const allowedStatuses = [
            "PENDING",
            "IN_PROGRESS",
            "RESOLVED",
            "REJECTED"
        ];

        if (!/^\d+$/.test(complaintId)) {

            return res.status(400).json({
                error: "Invalid complaint ID"
            });
        }

        if (!allowedStatuses.includes(status)) {

            return res.status(400).json({
                error: "Invalid status"
            });
        }

        db.run(
            `
            UPDATE complaints
            SET status = ?
            WHERE id = ?
            `,
            [status, complaintId],
            function (err) {

                if (err) {

                    console.error(err);

                    return res.status(500).json({
                        error: "Unable to update complaint"
                    });
                }

                if (this.changes === 0) {

                    return res.status(404).json({
                        error: "Complaint not found"
                    });
                }

                logAudit(
                    db,
                    req,
                    "COMPLAINT_STATUS_UPDATED",
                    `Complaint ${complaintId}`,
                    "SUCCESS"
                );

                res.json({
                    message: "Complaint status updated"
                });
            }
        );
    }
);

// =====================================================
// ADMIN - SECURITY AUDIT LOGS
// =====================================================

app.get(
    "/api/admin/logs",
    requireRole("ADMIN"),
    (req, res) => {

        db.all(
            `
            SELECT
                audit_logs.id,
                audit_logs.action,
                audit_logs.resource,
                audit_logs.status,
                audit_logs.ip_address,
                audit_logs.timestamp,
                users.name,
                users.email
            FROM audit_logs
            LEFT JOIN users
            ON audit_logs.user_id = users.id
            ORDER BY audit_logs.timestamp DESC
            LIMIT 100
            `,
            [],
            (err, logs) => {

                if (err) {

                    console.error(err);

                    return res.status(500).json({
                        error: "Unable to retrieve audit logs"
                    });
                }

                res.json({
                    logs
                });
            }
        );
    }
);

// =====================================================
// START SERVER
// =====================================================

app.listen(PORT, "0.0.0.0", () => {
    console.log(`
========================================
 Secure Complaint Management Portal
========================================
 Server running on port ${PORT}
========================================
`);
});