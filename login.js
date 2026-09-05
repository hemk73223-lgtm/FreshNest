"use strict";
// =========================
// Toast
// =========================
function showToast(message, icon = "fa-circle-check") {

    const toast = document.getElementById("toast");

    toast.innerHTML = `
        <i class="fa-solid ${icon}"></i>
        <span>${message}</span>
    `;

    toast.classList.add("show");

    setTimeout(() => {

        toast.classList.remove("show");

    }, 3000);

}
// -----------------------------
// Live Date & Time
// -----------------------------
function updateDateTime() {

    const now = new Date();

    const date = now.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric"
    });

    const time = now.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
    });

    document.getElementById("liveDateText").textContent = date;
    document.getElementById("liveTimeText").textContent = time;

}

updateDateTime();

setInterval(updateDateTime, 1000);
// =============================
// LOGIN BUTTON
// =============================

document.getElementById("loginBtn").addEventListener("click", async function () {

    const username = document.getElementById("username").value.trim();

    const password = document.getElementById("password").value.trim();

    
// -----------------------
// ADMIN LOGIN
// -----------------------

if (username === "admin" && password === "admin123") {

    showToast("Welcome Admin!");

    document
        .getElementById("loadingOverlay")
        .classList.add("show");

    setTimeout(() => {

        window.location.href = "../admin/index.html";

    }, 1500);

    return;
}
    
// -----------------------
// USER LOGIN
// -----------------------

try {

    const snapshot = await db.collection("users").get();

    let userFound = false;

    snapshot.forEach((doc) => {

        const data = doc.data();

        console.log(data);

        if (
            data.username === username &&
            data.password === password
        ) {

            userFound = true;

            localStorage.setItem("userId", doc.id);
            localStorage.setItem("username", data.username);

        }

    });

    if (userFound) {

        showToast("Login Successful!");

        document
            .getElementById("loadingOverlay")
            .classList.add("show");

        setTimeout(() => {

            window.location.href = "../userdashboard/index.html";

        }, 1500);

    } else {

        showToast(
            "Invalid Username or Password",
            "fa-circle-xmark"
        );

    }

} catch (error) {

    console.error(error);

    showToast(
        "Login Failed!",
        "fa-circle-xmark"
    );

}
});
// =========================
// Show / Hide Password
// =========================

document
.getElementById("togglePassword")

.addEventListener("click", function () {

    const password =
        document.getElementById("password");

    const icon =
        this.querySelector("i");

    if (password.type === "password") {

        password.type = "text";

        icon.classList.replace(
            "fa-eye",
            "fa-eye-slash"
        );

    } else {

        password.type = "password";

        icon.classList.replace(
            "fa-eye-slash",
            "fa-eye"
        );

    }

});