// ==========================================
// FRESHNEST PROFILE
// ==========================================


// Get logged-in user

const userId =
    localStorage.getItem("userId");


// ==========================================
// CHECK LOGIN
// ==========================================

if (!userId) {

    alert("Please login first.");

    window.location.href =
        "../siginin/index.html";

}


// ==========================================
// LOAD PROFILE
// ==========================================

async function loadProfile() {

    try {

        const userDoc =
            await db
                .collection("users")
                .doc(userId)
                .get();


        if (!userDoc.exists) {

            showMessage(
                "User profile not found.",
                "danger"
            );

            return;

        }


        const user =
            userDoc.data();


        // Username

        document.getElementById(
            "username"
        ).value =
            user.username || "";


        // Phone

        document.getElementById(
            "phone"
        ).value =
            user.phone || "";


        // Address

        document.getElementById(
            "street"
        ).value =
            user.street || "";


        // Landmark

        document.getElementById(
            "landmark"
        ).value =
            user.landmark || "";


        // District

        document.getElementById(
            "district"
        ).value =
            user.district || "";

    }

    catch (error) {

        console.error(
            "PROFILE LOAD ERROR:",
            error
        );

        showMessage(
            "Unable to load your profile.",
            "danger"
        );

    }

}


// ==========================================
// SAVE PROFILE
// ==========================================

async function saveProfile(event) {

    event.preventDefault();


    const username =
        document.getElementById(
            "username"
        ).value.trim();


    const street =
        document.getElementById(
            "street"
        ).value.trim();


    const landmark =
        document.getElementById(
            "landmark"
        ).value.trim();


    const district =
        document.getElementById(
            "district"
        ).value.trim();


    if (!username) {

        showMessage(
            "Please enter your username.",
            "warning"
        );

        return;

    }


    try {


        await db
            .collection("users")
            .doc(userId)
            .update({

                username: username,

                street: street,

                landmark: landmark,

                district: district

            });


        // Update local storage too

        localStorage.setItem(
            "username",
            username
        );


        localStorage.setItem(
            "userName",
            username
        );


        showMessage(
            "✅ Profile updated successfully!",
            "success"
        );

    }

    catch (error) {

        console.error(
            "PROFILE SAVE ERROR:",
            error
        );


        showMessage(
            "Unable to save profile.",
            "danger"
        );

    }

}


// ==========================================
// MESSAGE
// ==========================================

function showMessage(
    message,
    type
) {

    const box =
        document.getElementById(
            "profileMessage"
        );


    box.className =
        `alert alert-${type}`;


    box.textContent =
        message;

}


// ==========================================
// FORM EVENT
// ==========================================

document
    .getElementById("profileForm")
    .addEventListener(
        "submit",
        saveProfile
    );


// ==========================================
// LOAD
// ==========================================

document.addEventListener(
    "DOMContentLoaded",
    loadProfile
);