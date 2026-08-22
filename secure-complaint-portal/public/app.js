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