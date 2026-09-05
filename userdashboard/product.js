// ==============================
// GET PRODUCT ID FROM URL
// ==============================

const params = new URLSearchParams(window.location.search);

const productId = params.get("id");

// ==============================
// LOAD PRODUCT
// ==============================

async function loadProduct() {

    if (!productId) {

        alert("Product not found!");

        return;

    }

    try {

        const doc = await db.collection("products").doc(productId).get();

        if (!doc.exists) {

            alert("Product does not exist!");

            return;

        }

        const product = doc.data();
        document.getElementById("productImage").src = product.image;

        document.getElementById("productName").textContent = product.name;
        
        // Price
document.getElementById("priceContainer").innerHTML = `
    <h2 class="text-success fw-bold">₹${product.price}</h2>
`;

// Stock
document.getElementById("stockContainer").innerHTML = `
    <span class="badge bg-success">
        📦 Stock: ${product.quantity}
    </span>
`;

// Expiry
document.getElementById("expiryContainer").innerHTML = `
    <span class="badge bg-warning text-dark">
        ⏰ Expiry: ${product.expiry}
    </span>
`;
        document.getElementById("productImage").src =
            product.image || "https://via.placeholder.com/500x400?text=FreshNest";
        
        // Connect buttons
document.getElementById("cartBtn").onclick = addToCart;
document.getElementById("buyBtn").onclick = buyNow;    

    }

    catch (error) {

        console.error(error);

    }

}

document.addEventListener("DOMContentLoaded", async function () {

    setupRatingStars();

    const submitButton =
        document.getElementById("submitReviewBtn");

    if (submitButton) {

        submitButton.addEventListener(
            "click",
            submitReview
        );

    }

    await loadProduct();

    await loadReviews();

});

// ===============================
// ADD TO CART
// ===============================

async function addToCart() {

    const userId = localStorage.getItem("userId");

    if (!userId) {

        alert("Please login first.");

        return;

    }

    if (!productId) {

        alert("Invalid Product!");

        return;

    }

    // Get latest product
    const productDoc = await db.collection("products").doc(productId).get();

    if (!productDoc.exists) {

        alert("Product not found!");

        return;

    }

    const product = productDoc.data();

    // Calculate discount
    const today = new Date();
    const expiryDate = new Date(product.expiry);

    const daysLeft = Math.ceil(
        (expiryDate - today) / (1000 * 60 * 60 * 24)
    );

    let discount = 0;

    if (daysLeft > 7)
        discount = 0;
    else if (daysLeft >= 5)
        discount = 10;
    else if (daysLeft >= 3)
        discount = 20;
    else if (daysLeft >= 1)
        discount = 40;
    else if (daysLeft === 0)
        discount = 60;

    const originalPrice = Number(product.price);

    const pricePaid = Math.round(
        originalPrice * (1 - discount / 100)
    );

    // Check existing cart item
    const snapshot = await db.collection("cart")
        .where("userId", "==", userId)
        .where("productId", "==", productId)
        .get();

    if (!snapshot.empty) {

        const doc = snapshot.docs[0];

        await db.collection("cart")
            .doc(doc.id)
            .update({

                quantity: doc.data().quantity + 1

            });

        alert("Quantity Updated!");

        return;

    }

    // Add new cart item
    await db.collection("cart").add({

        userId: userId,

        productId: productId,

        quantity: 1,

        originalPrice: originalPrice,

        pricePaid: pricePaid,

        discount: discount,

        addedAt: firebase.firestore.FieldValue.serverTimestamp()

    });

    alert("Added To Cart!");

}
async function buyNow() {

    const userId = localStorage.getItem("userId");

    if (!userId) {
        alert("Please login first.");
        return;
    }

    const productDoc = await db.collection("products").doc(productId).get();

    if (!productDoc.exists) {
        alert("Product not found.");
        return;
    }

    const product = productDoc.data();

    // Calculate discount
    const today = new Date();
    const expiryDate = new Date(product.expiry);
    const daysLeft = Math.ceil(
        (expiryDate - today) / (1000 * 60 * 60 * 24)
    );

    let discount = 0;

    if (daysLeft > 7) discount = 0;
    else if (daysLeft >= 5) discount = 10;
    else if (daysLeft >= 3) discount = 20;
    else if (daysLeft >= 1) discount = 40;
    else if (daysLeft === 0) discount = 60;

    const originalPrice = Number(product.price);
    const pricePaid = Math.round(originalPrice * (1 - discount / 100));

    localStorage.setItem("buyNowItem", JSON.stringify({
        productId: productId,
        quantity: 1,
        originalPrice: originalPrice,
        pricePaid: pricePaid,
        discount: discount
    }));

    window.location.href = "checkout.html?mode=buyNow";

}
// ======================================================
// REAL PRODUCT RATINGS & REVIEWS
// ======================================================

let selectedRating = 0;


// ======================================================
// STAR CLICK
// ======================================================

function setupRatingStars() {

    const stars =
        document.querySelectorAll(
            "#ratingStars span"
        );

    stars.forEach(star => {

        star.addEventListener(
            "click",
            function () {

                selectedRating =
                    Number(
                        this.dataset.rating
                    );

                updateRatingStars();

            }
        );

    });

}


// ======================================================
// UPDATE STARS
// ======================================================

function updateRatingStars() {

    const stars =
        document.querySelectorAll(
            "#ratingStars span"
        );

    stars.forEach(star => {

        const value =
            Number(
                star.dataset.rating
            );

        if (value <= selectedRating) {

            star.textContent = "★";

            star.style.color = "#ffc107";

        } else {

            star.textContent = "☆";

            star.style.color = "#777";

        }

    });

}


// ======================================================
// SUBMIT REVIEW
// ======================================================

async function submitReview() {

    const userId =
        localStorage.getItem("userId");


    if (!userId) {

        alert(
            "Please login first to submit a review."
        );

        return;

    }


    if (!productId) {

        alert("Invalid product.");

        return;

    }


    if (
        selectedRating < 1 ||
        selectedRating > 5
    ) {

        alert(
            "Please select a rating from 1 to 5 stars."
        );

        return;

    }


    const reviewInput =
        document.getElementById(
            "reviewText"
        );


    const reviewText =
        reviewInput.value.trim();


    if (!reviewText) {

        alert(
            "Please write a review."
        );

        reviewInput.focus();

        return;

    }


    try {

        // Get current user

        const userDoc =
            await db
                .collection("users")
                .doc(userId)
                .get();


        const user =
            userDoc.exists
                ? userDoc.data()
                : {};


        const username =
            user.username ||
            localStorage.getItem("username") ||
            localStorage.getItem("userName") ||
            "User";


        // Get current product

        const productDoc =
            await db
                .collection("products")
                .doc(productId)
                .get();


        if (!productDoc.exists) {

            alert(
                "Product not found."
            );

            return;

        }


        const product =
            productDoc.data();


        // Check whether this user already reviewed it

        const existingReviews =
            await db
                .collection("reviews")
                .where(
                    "productId",
                    "==",
                    productId
                )
                .get();


        let alreadyReviewed = false;


        existingReviews.forEach(
            doc => {

                const review =
                    doc.data();


                if (
                    review.userId ===
                    userId
                ) {

                    alreadyReviewed = true;

                }

            }
        );


        if (alreadyReviewed) {

            alert(
                "You have already reviewed this product."
            );

            return;

        }


        // ==========================================
        // THIS SAVES THE REAL REVIEW TO FIREBASE
        // ==========================================

        await db
            .collection("reviews")
            .add({

                productId:
                    productId,

                productName:
                    product.name ||
                    "Product",

                userId:
                    userId,

                username:
                    username,

                rating:
                    selectedRating,

                review:
                    reviewText,

                createdAt:
                    firebase.firestore
                        .FieldValue
                        .serverTimestamp()

            });


        alert(
            "⭐ Review submitted successfully!"
        );


        // Clear form

        selectedRating = 0;

        updateRatingStars();

        reviewInput.value = "";


        // Reload actual Firebase reviews

        await loadReviews();

    }

    catch (error) {

        console.error(
            "SUBMIT REVIEW ERROR:",
            error
        );

        alert(
            "Unable to submit review."
        );

    }

}


// ======================================================
// LOAD REVIEWS
// ======================================================

async function loadReviews() {

    const container =
        document.getElementById(
            "reviewsContainer"
        );


    if (!container || !productId) {

        return;

    }


    try {

        const snapshot =
            await db
                .collection("reviews")
                .where(
                    "productId",
                    "==",
                    productId
                )
                .get();


        const reviews = [];


        snapshot.forEach(
            doc => {

                reviews.push({

                    id: doc.id,

                    ...doc.data()

                });

            }
        );


        // Newest first

        reviews.sort(
            (a, b) => {

                const dateA =
                    a.createdAt &&
                    a.createdAt.toDate
                        ? a.createdAt
                            .toDate()
                            .getTime()
                        : 0;


                const dateB =
                    b.createdAt &&
                    b.createdAt.toDate
                        ? b.createdAt
                            .toDate()
                            .getTime()
                        : 0;


                return dateB - dateA;

            }
        );


        // Update average

        updateAverageRating(
            reviews
        );


        // No reviews

        if (reviews.length === 0) {

            container.innerHTML = `

                <div class="alert alert-light border">

                    No reviews yet.

                    Be the first to review
                    this product! ⭐

                </div>

            `;

            return;

        }


        // Display reviews

        container.innerHTML =
            reviews.map(
                review => {

                    const rating =
                        Math.max(
                            0,
                            Math.min(
                                5,
                                Number(
                                    review.rating
                                ) || 0
                            )
                        );


                    const stars =
                        "★".repeat(
                            rating
                        ) +
                        "☆".repeat(
                            5 - rating
                        );


                    const username =
                        review.username ||
                        "User";


                    const text =
                        review.review ||
                        "";


                    let dateText = "";


                    if (
                        review.createdAt &&
                        review.createdAt.toDate
                    ) {

                        dateText =
                            review.createdAt
                                .toDate()
                                .toLocaleDateString(
                                    "en-IN"
                                );

                    }


                    return `

                        <div
                            class="card border-0 shadow-sm mb-3 p-3">

                            <div
                                class="d-flex justify-content-between">

                                <strong>

                                    👤 ${username}

                                </strong>

                                <small
                                    class="text-muted">

                                    ${dateText}

                                </small>

                            </div>


                            <div
                                class="text-warning fs-5 mt-1">

                                ${stars}

                            </div>


                            <p class="mb-0 mt-2">

                                ${text}

                            </p>

                        </div>

                    `;

                }
            ).join("");

    }

    catch (error) {

        console.error(
            "LOAD REVIEWS ERROR:",
            error
        );


        container.innerHTML = `

            <div class="alert alert-danger">

                Unable to load reviews.

            </div>

        `;

    }

}


// ======================================================
// CALCULATE AVERAGE RATING
// ======================================================

function updateAverageRating(
    reviews
) {

    const averageElement =
        document.getElementById(
            "averageRating"
        );


    const countElement =
        document.getElementById(
            "reviewCount"
        );


    if (
        !averageElement ||
        !countElement
    ) {

        return;

    }


    if (reviews.length === 0) {

        averageElement.textContent =
            "⭐ 0.0";

        countElement.textContent =
            "0 Ratings & Reviews";

        return;

    }


    const total =
        reviews.reduce(
            (
                sum,
                review
            ) => {

                return sum +
                    (
                        Number(
                            review.rating
                        ) || 0
                    );

            },
            0
        );


    const average =
        total / reviews.length;


    averageElement.textContent =
        `⭐ ${average.toFixed(1)}`;


    countElement.textContent =
        `${reviews.length} Ratings & Reviews`;

}