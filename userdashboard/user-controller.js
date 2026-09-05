let allProducts = [];

// ===============================
// LOAD PRODUCTS
// ===============================

async function loadProducts() {

    const container = document.getElementById("bestSellingProducts");

    container.innerHTML = "";

    try {

        const snapshot = await db.collection("products").get();

        allProducts = [];

        snapshot.forEach((doc) => {

            const product = {
                id: doc.id,
                ...doc.data()
            };

            allProducts.push(product);

        });

        allProducts.sort((a, b) => {
    if (a.priority === true && b.priority !== true) return -1;
    if (a.priority !== true && b.priority === true) return 1;
    return 0;
});

displayProducts(allProducts);

    }

    catch (error) {

        console.error(error);

    }

}

// ===============================
// DISPLAY PRODUCTS
// ===============================

function displayProducts(products) {

    const container = document.getElementById("bestSellingProducts");

    container.innerHTML = "<h2 style='color:red'>Loading...</h2>";

    container.innerHTML = "";

console.log("Displaying", products.length, "products");

products.forEach(product => {

    console.log(product.name);

    container.innerHTML += `

        <div class="col-lg-3 col-md-6">

            <div class="card product-card shadow h-100 ${product.priority === true ? 'priority-product' : ''}">
            ${product.priority === true
    ? `<div class="priority-badge">
        🔥 PRIORITY DEAL
       </div>`
    : ""
}

                <img
                    src="${product.image || 'https://via.placeholder.com/300x220?text=FreshNest'}"
                    class="card-img-top">

                <div class="card-body">

                    <h5>${product.name}</h5>

                    <p class="text-muted">

                        ${product.category}

                    </p>

                    <h4 class="text-success">

                        ₹${product.price}

                    </h4>

                    <p>

                        Stock : ${product.quantity}

                    </p>

                    <button
    class="btn btn-success w-100"
    onclick="viewProduct('${product.id}')">

    View Product

</button>
                </div>

            </div>

        </div>

        `;

    });

}

// ===============================
// SEARCH
// ===============================

document.getElementById("searchBox").addEventListener("keyup", function () {

    const keyword = this.value.toLowerCase();

    const filtered = allProducts.filter(product =>

        product.name.toLowerCase().includes(keyword) ||

        product.category.toLowerCase().includes(keyword)

    );

    displayProducts(filtered);

});

// ===============================
// START
// ===============================

document.addEventListener("DOMContentLoaded", loadProducts);
// ===============================
// VIEW PRODUCT
// ===============================

function viewProduct(productId){

    window.location.href =
        `product.html?id=${productId}`;

}
function filterCategory(category) {

    if (category === "All") {
        displayProducts(allProducts);
        return;
    }

    const filteredProducts = allProducts.filter(product => {

        return product.category &&
            product.category.trim().toLowerCase() ===
            category.trim().toLowerCase();

    });

    console.log(filteredProducts);

    displayProducts(filteredProducts);

}
function goToCategory(category) {

    window.location.href = `products.html?category=${encodeURIComponent(category)}`;

}
function logout() {

    localStorage.removeItem("userId");

    window.location.href = "../index.html";
}

// ===============================
// VISUAL PRODUCT SEARCH
// ===============================

function openVisualSearch() {

    document
        .getElementById("visualSearchInput")
        .click();

}


function handleVisualSearch(event) {

    const file = event.target.files[0];

    if (!file) return;

    const imageURL = URL.createObjectURL(file);

    console.log("Image selected:", file.name);

    identifyVisualProduct(file);

}


async function identifyVisualProduct(file) {

    const container =
        document.getElementById("bestSellingProducts");

    container.innerHTML = `
        <div class="text-center py-5">

            <div class="fs-1">🤖</div>

            <h4>Analyzing your image...</h4>

            <p class="text-muted">
                Please wait while FreshNest searches for matching products.
            </p>

        </div>
    `;


    /*
       TEMPORARY VISUAL SEARCH LOGIC

       We will connect the actual AI vision model
       after the camera/upload interface is working.
    */

    const fileName =
        file.name.toLowerCase();


    let detectedCategory = null;


    if (
        fileName.includes("apple") ||
        fileName.includes("fruit")
    ) {

        detectedCategory = "Fruits";

    }

    else if (
        fileName.includes("chips") ||
        fileName.includes("snack")
    ) {

        detectedCategory = "Snacks";

    }

    else if (
        fileName.includes("milk") ||
        fileName.includes("juice")
    ) {

        detectedCategory = "Liquids";

    }


    setTimeout(() => {

        if (detectedCategory) {

            const results =
                allProducts.filter(product =>

                    product.category &&
                    product.category
                        .toLowerCase() ===
                    detectedCategory.toLowerCase()

                );

            displayProducts(results);

        }

        else {

            displayProducts(allProducts);

        }

    }, 800);

}

// ===============================
// FRESHNEST AI ASSISTANT
// ===============================

function openAIAssistant() {

    const assistant = document.getElementById("aiAssistant");

    assistant.style.display = "flex";

    document.getElementById("aiInput").focus();
}


function closeAIAssistant() {

    document.getElementById("aiAssistant").style.display = "none";

}


function addAIMessage(message, type) {

    const messages = document.getElementById("aiMessages");

    const div = document.createElement("div");

    div.className = `ai-message ${type}`;

    div.innerHTML = message;

    messages.appendChild(div);

    messages.scrollTop = messages.scrollHeight;

}


async function askAI() {

    const input = document.getElementById("aiInput");

    const question = input.value.trim();

    if (!question) return;

    addAIMessage(question, "user");

    input.value = "";

    addAIMessage("🤔 Let me check the products...", "bot");

    try {

        // Make sure products are loaded
        if (!allProducts || allProducts.length === 0) {

            await loadProducts();

        }

        const answer = generateProductRecommendation(question);

        const messages = document.getElementById("aiMessages");

        // Remove "thinking" message
        messages.lastElementChild.remove();

        addAIMessage(answer, "bot");

    }

    catch (error) {

        console.error("AI Error:", error);

        const messages = document.getElementById("aiMessages");

        messages.lastElementChild.remove();

        addAIMessage(
            "❌ Sorry, I couldn't process that request.",
            "bot"
        );

    }
}
function generateProductRecommendation(question) {

    const q = question.toLowerCase();

    let results = [...allProducts];


    // ==========================
    // CATEGORY DETECTION
    // ==========================

    const categories = [
        "fruits",
        "vegetables",
        "bakery",
        "groceries",
        "snacks",
        "liquids"
    ];

    const category = categories.find(c => q.includes(c));

    if (category) {

        results = results.filter(product =>
            product.category &&
            product.category.toLowerCase() === category
        );

    }
// ==========================
// PRODUCT NAME DETECTION
// ==========================

const matchedProduct = allProducts.find(product =>
    product.name &&
    q.includes(product.name.toLowerCase())
);

if (matchedProduct) {

    results = results.filter(product =>
        product.id === matchedProduct.id
    );

}

    // ==========================
    // PRICE DETECTION
    // ==========================

    const priceMatch = q.match(
        /(?:under|below|less than|within)\s*₹?\s*(\d+)/
    );

    if (priceMatch) {

        const maxPrice = Number(priceMatch[1]);

        results = results.filter(product =>
            Number(product.price) <= maxPrice
        );

    }


    // ==========================
    // CHEAP PRODUCTS
    // ==========================

    if (
        q.includes("cheap") ||
        q.includes("cheapest") ||
        q.includes("low price")
    ) {

        results.sort(
            (a, b) => Number(a.price) - Number(b.price)
        );

    }


    // ==========================
    // AVAILABLE PRODUCTS
    // ==========================

    results = results.filter(product =>
        Number(product.quantity || 0) > 0
    );


    // ==========================
    // NO RESULTS
    // ==========================

    if (results.length === 0) {

        return `
            😔 I couldn't find a product matching your request.
            <br><br>
            Try asking:
            <br>
            • "Show me snacks"
            <br>
            • "Products under ₹50"
            <br>
            • "Cheap fruits"
        `;

    }


    // ==========================
    // LIMIT RESULTS
    // ==========================

   


    let html = `
        😊 I found these products for you:
        <br><br>
    `;


    results.forEach(product => {

        html += `
            <div style="
                padding:10px;
                margin-bottom:8px;
                border:1px solid #ddd;
                border-radius:10px;
                background:white;
            ">

                <strong>${product.name}</strong>

                <br>

                <span style="color:#198754;">
                    ₹${product.price}
                </span>

                <br>

                <small>
                    ${product.category}
                    · Stock: ${product.quantity}
                </small>

                <br><br>

                <button
                    onclick="viewProduct('${product.id}')"
                    style="
                        border:none;
                        background:#198754;
                        color:white;
                        padding:6px 12px;
                        border-radius:6px;
                        cursor:pointer;
                    "
                >
                    View Product
                </button>

            </div>
        `;

    });


    return html;

}
