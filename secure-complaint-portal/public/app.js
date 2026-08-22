// =====================================================
// REGISTER
// =====================================================

const registerForm = document.getElementById("registerForm");

if (registerForm) {

    registerForm.addEventListener("submit", async (e) => {

        e.preventDefault();

        const name =
            document.getElementById("name").value.trim();

        const email =
            document.getElementById("email").value.trim();

        const password =
            document.getElementById("password").value;

        const message =
            document.getElementById("message");

        message.textContent = "";
        message.className = "";

        try {

            const response = await fetch("/api/register", {

                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    name,
                    email,
                    password
                })

            });

            const data = await response.json();

            if (!response.ok) {

                message.className = "error";

                message.textContent =
                    data.error || "Registration failed.";

                return;
            }

            message.className = "success";

            message.textContent =
                "Account created successfully! Redirecting...";

            setTimeout(() => {

                window.location.href = "login.html";

            }, 1000);

        } catch (error) {

            console.error("Registration error:", error);

            message.className = "error";

            message.textContent =
                "Unable to connect to the server.";

        }

    });

}


// =====================================================
// LOGIN
// =====================================================

const loginForm = document.getElementById("loginForm");

if (loginForm) {

    loginForm.addEventListener("submit", async (e) => {

        e.preventDefault();

        const email =
            document.getElementById("email").value.trim();

        const password =
            document.getElementById("password").value;

        const message =
            document.getElementById("message");

        message.textContent = "";
        message.className = "";


        try {

            const response = await fetch("/api/login", {

                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    email,
                    password
                })

            });


            const data =
                await response.json();


            if (!response.ok) {

                message.className = "error";

                message.textContent =
                    data.error || "Login failed.";

                return;
            }


            message.className = "success";

            message.textContent =
                "Login successful! Redirecting...";


            setTimeout(() => {

                if (data.user.role === "ADMIN") {

                    window.location.href =
                        "admin.html";

                } else {

                    window.location.href =
                        "student.html";

                }

            }, 500);


        } catch (error) {

            console.error(
                "Login error:",
                error
            );

            message.className = "error";

            message.textContent =
                "Unable to connect to the server.";

        }

    });

}


// =====================================================
// STUDENT DASHBOARD
// =====================================================

const complaintForm =
    document.getElementById("complaintForm");


async function loadStudentDashboard() {

    try {

        const response =
            await fetch("/api/me");


        if (!response.ok) {

            window.location.href =
                "login.html";

            return;
        }


        const data =
            await response.json();


        document.getElementById(
            "welcomeText"
        ).textContent =
            `Welcome, ${data.user.name}`;


        // Make sure student cannot access admin page
        if (data.user.role !== "STUDENT") {

            window.location.href =
                "admin.html";

            return;
        }


        loadComplaints();

    } catch (error) {

        console.error(error);

        window.location.href =
            "login.html";

    }

}


// =====================================================
// LOAD MY COMPLAINTS
// =====================================================

async function loadComplaints() {

    const response =
        await fetch("/api/complaints/my");


    if (!response.ok) {

        return;
    }


    const data =
        await response.json();


    const table =
        document.getElementById(
            "complaintsTable"
        );


    table.innerHTML = "";


    if (data.complaints.length === 0) {

        table.innerHTML = `
            <tr>
                <td colspan="4">
                    No complaints submitted yet.
                </td>
            </tr>
        `;

        return;
    }


    data.complaints.forEach((complaint) => {

        const row =
            document.createElement("tr");


        row.innerHTML = `

            <td>
                #${complaint.id}
            </td>

            <td>
                ${escapeHTML(complaint.subject)}
            </td>

            <td>
                <span class="status-badge">
                    ${escapeHTML(complaint.status)}
                </span>
            </td>

            <td>
                ${escapeHTML(complaint.created_at)}
            </td>

        `;


        table.appendChild(row);

    });

}


// =====================================================
// SUBMIT COMPLAINT
// =====================================================

if (complaintForm) {

    complaintForm.addEventListener(
        "submit",
        async (e) => {

            e.preventDefault();


            const subject =
                document.getElementById(
                    "subject"
                ).value.trim();


            const description =
                document.getElementById(
                    "description"
                ).value.trim();


            const message =
                document.getElementById(
                    "complaintMessage"
                );


            try {

                const response =
                    await fetch(
                        "/api/complaints",
                        {

                            method: "POST",

                            headers: {
                                "Content-Type":
                                    "application/json"
                            },

                            body: JSON.stringify({
                                subject,
                                description
                            })

                        }
                    );


                const data =
                    await response.json();


                if (!response.ok) {

                    message.className =
                        "error";

                    message.textContent =
                        data.error;

                    return;
                }


                message.className =
                    "success";

                message.textContent =
                    "Complaint submitted successfully.";


                complaintForm.reset();


                loadComplaints();


            } catch (error) {

                console.error(error);

                message.className =
                    "error";

                message.textContent =
                    "Unable to submit complaint.";

            }

        }
    );

}


// =====================================================
// LOGOUT
// =====================================================

const logoutBtn =
    document.getElementById("logoutBtn");


if (logoutBtn) {

    logoutBtn.addEventListener(
        "click",
        async () => {

            await fetch(
                "/api/logout",
                {
                    method: "POST"
                }
            );


            window.location.href =
                "login.html";

        }
    );

}


// =====================================================
// BASIC OUTPUT SANITIZATION
// =====================================================

function escapeHTML(value) {

    const div =
        document.createElement("div");

    div.textContent = value;

    return div.innerHTML;

}


// Start dashboard

if (
    document.getElementById(
        "complaintForm"
    )
) {

    loadStudentDashboard();

}


// =====================================================
// ADMIN DASHBOARD
// =====================================================

const adminTable =
    document.getElementById("adminComplaintsTable");


async function loadAdminDashboard() {

    try {

        // Check authenticated user

        const meResponse =
            await fetch("/api/me");


        if (!meResponse.ok) {

            window.location.href = "login.html";

            return;
        }


        const meData =
            await meResponse.json();


        // Server-side role check is the real protection.
        // This frontend check only controls the UI.

        if (meData.user.role !== "ADMIN") {

            alert("Access denied. Administrator privileges required.");

            window.location.href = "student.html";

            return;
        }


        document.getElementById(
            "adminName"
        ).textContent =
            meData.user.name;


        await loadAdminComplaints();

        await loadAuditLogs();


    } catch (error) {

        console.error(
            "Admin dashboard error:",
            error
        );

        window.location.href = "login.html";

    }

}


// =====================================================
// LOAD ALL COMPLAINTS
// =====================================================

async function loadAdminComplaints() {

    const response =
        await fetch(
            "/api/admin/complaints"
        );


    if (!response.ok) {

        alert("Unable to load complaints.");

        return;
    }


    const data =
        await response.json();


    const complaints =
        data.complaints;


    // Statistics

    document.getElementById(
        "totalComplaints"
    ).textContent =
        complaints.length;


    document.getElementById(
        "pendingComplaints"
    ).textContent =
        complaints.filter(
            c => c.status === "PENDING"
        ).length;


    document.getElementById(
        "progressComplaints"
    ).textContent =
        complaints.filter(
            c => c.status === "IN_PROGRESS"
        ).length;


    document.getElementById(
        "resolvedComplaints"
    ).textContent =
        complaints.filter(
            c => c.status === "RESOLVED"
        ).length;


    adminTable.innerHTML = "";


    if (complaints.length === 0) {

        adminTable.innerHTML = `
            <tr>
                <td colspan="6">
                    No complaints found.
                </td>
            </tr>
        `;

        return;
    }


    complaints.forEach((complaint) => {

        const row =
            document.createElement("tr");


        row.innerHTML = `

            <td>
                #${complaint.id}
            </td>

            <td>
                ${escapeHTML(complaint.name)}
            </td>

            <td>
                ${escapeHTML(complaint.email)}
            </td>

            <td>
                ${escapeHTML(complaint.subject)}
            </td>

            <td>
                <span class="status-badge">
                    ${escapeHTML(complaint.status)}
                </span>
            </td>

            <td>

                <select
                    class="status-select"
                    data-id="${complaint.id}"
                >

                    <option value="PENDING"
                        ${complaint.status === "PENDING" ? "selected" : ""}>
                        Pending
                    </option>

                    <option value="IN_PROGRESS"
                        ${complaint.status === "IN_PROGRESS" ? "selected" : ""}>
                        In Progress
                    </option>

                    <option value="RESOLVED"
                        ${complaint.status === "RESOLVED" ? "selected" : ""}>
                        Resolved
                    </option>

                    <option value="REJECTED"
                        ${complaint.status === "REJECTED" ? "selected" : ""}>
                        Rejected
                    </option>

                </select>

            </td>

        `;


        adminTable.appendChild(row);

    });


    // Attach status-change handlers

    document
        .querySelectorAll(".status-select")
        .forEach(select => {

            select.addEventListener(
                "change",
                updateComplaintStatus
            );

        });

}


// =====================================================
// UPDATE COMPLAINT STATUS
// =====================================================

async function updateComplaintStatus(e) {

    const complaintId =
        e.target.dataset.id;

    const status =
        e.target.value;


    try {

        const response =
            await fetch(
                `/api/admin/complaints/${complaintId}`,
                {

                    method: "PATCH",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({
                        status
                    })

                }
            );


        const data =
            await response.json();


        if (!response.ok) {

            alert(
                data.error ||
                "Unable to update complaint."
            );

            return;
        }


        await loadAdminComplaints();

        await loadAuditLogs();


    } catch (error) {

        console.error(error);

        alert(
            "Unable to connect to server."
        );

    }

}


// =====================================================
// LOAD AUDIT LOGS
// =====================================================

async function loadAuditLogs() {

    const response =
        await fetch(
            "/api/admin/logs"
        );


    if (!response.ok) {

        return;
    }


    const data =
        await response.json();


    const table =
        document.getElementById(
            "auditLogsTable"
        );


    table.innerHTML = "";


    if (data.logs.length === 0) {

        table.innerHTML = `
            <tr>
                <td colspan="6">
                    No audit events recorded.
                </td>
            </tr>
        `;

        return;
    }


    data.logs.forEach((log) => {

        const row =
            document.createElement("tr");


        row.innerHTML = `

            <td>
                ${escapeHTML(log.timestamp)}
            </td>

            <td>
                ${escapeHTML(log.name || "System")}
            </td>

            <td>
                ${escapeHTML(log.action)}
            </td>

            <td>
                ${escapeHTML(log.resource || "-")}
            </td>

            <td>
                ${escapeHTML(log.status)}
            </td>

            <td>
                ${escapeHTML(log.ip_address || "-")}
            </td>

        `;


        table.appendChild(row);

    });

}


// Start Admin Dashboard

if (adminTable) {

    loadAdminDashboard();

}
