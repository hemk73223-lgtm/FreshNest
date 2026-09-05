// ==========================================
// LOAD REAL RATING FOR A PRODUCT
// ==========================================

async function getProductRating(productId) {

    try {

        const snapshot = await db
            .collection("reviews")
            .where("productId", "==", productId)
            .get();

        if (snapshot.empty) {

            return {
                average: 0,
                count: 0
            };

        }

        let total = 0;

        snapshot.forEach(doc => {

            const review = doc.data();

            total += Number(review.rating || 0);

        });

        const average =
            total / snapshot.size;

        return {

            average: Number(average.toFixed(1)),

            count: snapshot.size

        };

    }

    catch (error) {

        console.error(
            "Rating error:",
            error
        );

        return {
            average: 0,
            count: 0
        };

    }

}

let allProducts = [];

// Read category from URL
const params = new URLSearchParams(window.location.search);
const selectedCategory = params.get("category") || "All";

// Load products
async function loadProducts() {

    try {

        const snapshot = await db.collection("products").get();

        allProducts = [];

        snapshot.forEach((doc) => {


            allProducts.push({
                id: doc.id,
                ...doc.data()
            });

        });
        allProducts.sort((a, b) => {

    if (a.priority === true && b.priority !== true) {
        return -1;
    }

    if (a.priority !== true && b.priority === true) {
        return 1;
    }

    return 0;

});

        document.getElementById("pageTitle").textContent =
            selectedCategory === "All"
                ? "All Products"
                : selectedCategory;

        filterProducts();

    }

    catch (error) {

        console.error(error);

    }

}

// Filter products
function filterProducts() {

    let filtered = allProducts;

    if (selectedCategory !== "All") {

        filtered = allProducts.filter(product =>
            product.category &&
            product.category.toLowerCase() === selectedCategory.toLowerCase()
        );

    }

    displayProducts(filtered);

}

// Display products
function displayProducts(products) {

    const container = document.getElementById("productContainer");

    container.innerHTML = "";

    if (products.length === 0) {

        container.innerHTML += `

<div class="col-lg-3 col-md-4 col-sm-6 mb-4">

<div class="card product-card h-100">

    <div class="discount-badge">

        🔥 ${discount}% OFF

    </div>

    <img src="${product.image}" class="card-img-top product-image">

    <div class="card-body d-flex flex-column">

        <h5 class="product-title">

            ${product.name}

        </h5>

        <div class="mb-2">

            <span class="text-warning">

                ★★★★☆

            </span>

            <small class="text-muted">(4.5)</small>

        </div>

        <div>

            <span class="new-price">

                ₹${discountPrice}

            </span>

            <span class="old-price">

                ₹${product.price}

            </span>

        </div>

        <small class="stock-text">

            ${product.quantity>5
                ? "🟢 In Stock"
                : "⚠ Only "+product.quantity+" left"}

        </small>

        <div class="mt-auto">

            <button class="btn btn-success w-100 mb-2"
                onclick="addToCart('${product.id}')">

                🛒 Add to Cart

            </button>

            <button class="btn btn-warning w-100"

                onclick="buyNow('${product.id}')">

                ⚡ Buy Now

            </button>

        </div>

    </div>

</div>

</div>

`;

        return;
    }

    products.forEach(product => {
        const today = new Date();

const expiryDate = new Date(product.expiry);

const diffTime = expiryDate.getTime() - today.getTime();

const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

let expiryText = "";
let expiryColor = "";
let badgeText = "";
let badgeClass = "";

if (daysLeft < 0) {

    badgeText = "❌ Expired";
    badgeClass = "bg-danger";

}
else if (daysLeft <= 7) {

    badgeText = "🔥 Near Expiry";
    badgeClass = "bg-warning text-dark";

}
else {

    badgeText = "✅ Fresh";
    badgeClass = "bg-success";

}

if (daysLeft < 0) {

    expiryText = "❌ Expired";
    expiryColor = "text-danger";

} else if (daysLeft === 0) {

    expiryText = "⚠️ Expires Today";
    expiryColor = "text-warning";

} else {

    expiryText = `⏰ Expires in ${daysLeft} day${daysLeft > 1 ? "s" : ""}`;
    expiryColor = "text-success";

}
let discount = 0;

if (daysLeft > 7) {

    discount = 0;

}
else if (daysLeft >= 5) {

    discount = 10;

}
else if (daysLeft >= 3) {

    discount = 20;

}
else if (daysLeft >= 1) {

    discount = 40;

}
else if (daysLeft === 0) {

    discount = 60;

}

const originalPrice = Number(product.price);

const discountedPrice =
Math.round(originalPrice * (1 - discount / 100));

        container.innerHTML += `

        <div class="col-lg-3 col-md-4 col-sm-6">

            <div class="card product-card h-100 border-0">

                <div class="position-relative">

    <img
        src="${product.image || 'https://picsum.photos/300/220'}"
        class="card-img-top product-img">

    <span class="badge ${badgeClass} position-absolute top-0 start-0 m-2">
        ${badgeText}
    </span>

</div>

<div class="card-body d-flex flex-column">

    <small class="text-muted">

        ${product.category}

    </small>

    <h5 class="product-title mt-2">

        ${product.name}

    </h5>

    <div class="mb-2">

        ⭐⭐⭐⭐☆

        <small class="text-muted">

            (4.5)

        </small>

    </div>

    ${
        discount > 0 ?

        `

        <span class="discount-pill">

            🔥 ${discount}% OFF

        </span>

        <div>

            <span class="new-price">

                ₹${discountedPrice}

            </span>

            <span class="old-price">

                ₹${originalPrice}

            </span>

        </div>

        `

        :

        `

        <div>

            <span class="new-price">

                ₹${originalPrice}

            </span>

        </div>

        `
    }

    <small class="stock-text">

        ${
            product.quantity>5
            ?

            "🟢 In Stock"

            :

            "⚠ Only "+product.quantity+" left"

        }

    </small>

    <small class="${expiryColor} fw-bold mb-3">

        ${expiryText}

    </small>

    <div class="mt-auto">

        <button
            class="btn btn-success w-100 mb-2"

            onclick="addToCart('${product.id}')">

            🛒 Add to Cart

        </button>

        <button
            class="btn btn-warning w-100 mb-2"

            onclick="buyNow('${product.id}')">

            ⚡ Buy Now

        </button>

        <button
            class="btn btn-outline-success w-100"

            onclick="viewProduct('${product.id}')">

            👁 View Details

        </button>

    </div>

</div>
            </div>

        </div>

        `;

    });

}

// Open product page
function viewProduct(id) {

    window.location.href = `product.html?id=${id}`;

}

document.addEventListener("DOMContentLoaded", loadProducts);
async function addToCart(productId){

    const userId = localStorage.getItem("userId");
    // Get product details
const productDoc = await db.collection("products").doc(productId).get();

const product = productDoc.data();

// Calculate discount
const today = new Date();
const expiryDate = new Date(product.expiry);
const daysLeft = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));

let discount = 0;

if (daysLeft > 7) {
    discount = 0;
} else if (daysLeft >= 5) {
    discount = 10;
} else if (daysLeft >= 3) {
    discount = 20;
} else if (daysLeft >= 1) {
    discount = 40;
} else if (daysLeft === 0) {
    discount = 60;
}

const originalPrice = Number(product.price);

const finalPrice = Math.round(
    originalPrice * (1 - discount / 100)
);

    if(!userId){

        alert("Please login first.");

        return;

    }

    const snapshot = await db.collection("cart")
        .where("userId","==",userId)
        .where("productId","==",productId)
        .get();

    if(!snapshot.empty){

        const doc = snapshot.docs[0];

        await db.collection("cart")
            .doc(doc.id)
            .update({

                quantity:doc.data().quantity+1

            });

        alert("Quantity Updated!");

        return;

    }

    await db.collection("cart").add({

    userId: userId,

    productId: productId,

    quantity: 1,

    originalPrice: originalPrice,

    pricePaid: finalPrice,

    discount: discount,

    addedAt: firebase.firestore.FieldValue.serverTimestamp()

});

    alert("Added To Cart!");

}