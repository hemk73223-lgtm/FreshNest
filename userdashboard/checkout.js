const userId = localStorage.getItem("userId");

const dbRef = db;

let total = 0;
let cartItems = [];

document.addEventListener("DOMContentLoaded", () => {

    loadAddress();

    loadCart();
    
    document
        .getElementById("placeOrderBtn")
        .addEventListener("click", placeOrder);

});

// =========================
// LOAD USER ADDRESS
// =========================

async function loadAddress() {

    const doc = await dbRef
        .collection("users")
        .doc(userId)
        .get();

    if (!doc.exists) return;

    const user = doc.data();

    document.getElementById("deliveryAddress").innerHTML = `

        <strong>${user.username}</strong><br>

        ${user.street}<br>

        ${user.landmark}<br>

        ${user.district} - ${user.pincode}<br>

        ${user.state}, ${user.country}

    `;

}

// =========================
// LOAD CART
// =========================


async function loadCart() {

    total = 0;
    cartItems = [];

    const container = document.getElementById("checkoutItems");
    container.innerHTML = "";

    // -----------------------
    // BUY NOW
    // -----------------------
    const params = new URLSearchParams(window.location.search);
    const mode = params.get("mode");

    if (mode === "buyNow") {

        const item = JSON.parse(localStorage.getItem("buyNowItem"));

        if (!item) {
            alert("Buy Now item not found.");
            return;
        }

        const productDoc = await db.collection("products")
            .doc(item.productId)
            .get();

        if (!productDoc.exists) {
            alert("Product not found.");
            return;
        }

        const product = productDoc.data();

        total = item.pricePaid * item.quantity;

        cartItems.push({
            productId: item.productId,
            name: product.name,
            price: item.pricePaid,
            quantity: item.quantity
        });

        container.innerHTML = `
            <div class="d-flex justify-content-between mb-2">
                <span>${product.name} × ${item.quantity}</span>
                <strong>₹${total}</strong>
            </div>
        `;

        document.getElementById("checkoutTotal").textContent = total;

        return;
    }

    // -----------------------
    // NORMAL CART
    // -----------------------

    const snapshot = await db.collection("cart")
        .where("userId", "==", userId)
        .get();

    for (const doc of snapshot.docs) {

        const cart = doc.data();

        const productDoc = await db.collection("products")
            .doc(cart.productId)
            .get();

        if (!productDoc.exists) continue;

        const product = productDoc.data();

        const price = cart.pricePaid || product.price;

        const subtotal = price * cart.quantity;

        total += subtotal;

        cartItems.push({
            productId: cart.productId,
            name: product.name,
            price: price,
            quantity: cart.quantity
        });

        container.innerHTML += `
            <div class="d-flex justify-content-between mb-2">
                <span>${product.name} × ${cart.quantity}</span>
                <strong>₹${subtotal}</strong>
            </div>
        `;
    }

    document.getElementById("checkoutTotal").textContent = total;
}
async function placeOrder() {

    if (cartItems.length === 0) {

        alert("Your cart is empty.");
        return;

    }

    const paymentMethod =
        document.querySelector(
            'input[name="payment"]:checked'
        ).value;

    try {

        // Get current user
        const userDoc = await db
            .collection("users")
            .doc(userId)
            .get();

        if (!userDoc.exists) {

            alert("User account not found.");
            return;

        }

        const user = userDoc.data();

        // =====================================
        // CHECK STOCK
        // =====================================

        for (const item of cartItems) {

            const productRef =
                db.collection("products")
                .doc(item.productId);

            const productDoc =
                await productRef.get();

            if (!productDoc.exists) continue;

            const product = productDoc.data();

            const currentStock =
                Number(product.quantity || 0);

            const orderedQty =
                Number(item.quantity || 0);

            if (orderedQty > currentStock) {

                alert(
                    `${product.name} has only ${currentStock} item(s) left in stock.`
                );

                return;

            }

        }

        // =====================================
        // REDUCE STOCK
        // =====================================

        for (const item of cartItems) {

            const productRef =
                db.collection("products")
                .doc(item.productId);

            const productDoc =
                await productRef.get();

            if (!productDoc.exists) continue;

            const product = productDoc.data();

            const currentStock =
                Number(product.quantity || 0);

            const orderedQty =
                Number(item.quantity || 0);

            await productRef.update({

                quantity: currentStock - orderedQty

            });

        }

       // =====================================
// CREATE UNDERSTANDABLE ORDER ID
// =====================================

const now = new Date();

const year = now.getFullYear();

const month =
    String(now.getMonth() + 1).padStart(2, "0");

const day =
    String(now.getDate()).padStart(2, "0");

const hours =
    String(now.getHours()).padStart(2, "0");

const minutes =
    String(now.getMinutes()).padStart(2, "0");

const seconds =
    String(now.getSeconds()).padStart(2, "0");

// Example:
// FN-20260823-143215

const readableOrderId =
    `FN-${year}${month}${day}-${hours}${minutes}${seconds}`;

console.log(
    "FreshNest Order ID:",
    readableOrderId
);

        // =====================================
        // SAVE ORDER
        // =====================================

        await db.collection("orders").add({

            // Human-readable order ID
            orderId: readableOrderId,

            // User information
            userId: userId,

            userName: user.username,

            phone: user.phone,

            address:
                user.street + ", " +
                user.landmark + ", " +
                user.district,

            // Products
            items: cartItems,

            // Payment
            total: total,

            paymentMethod: paymentMethod,

            // Status
            status: "pending",

            // Date
            orderedAt:
                firebase.firestore.FieldValue.serverTimestamp()

        });

        // =====================================
        // CLEAR CART
        // =====================================

        const snapshot =
            await db
            .collection("cart")
            .where("userId", "==", userId)
            .get();

        const batch = db.batch();

        snapshot.forEach(doc => {

            batch.delete(doc.ref);

        });

        await batch.commit();

        alert(
            `🎉 Order Placed Successfully!\n\nOrder ID: ${readableOrderId}`
        );

        localStorage.removeItem("buyNowItem");

        window.location.href =
            "ordersuccess.html";

    }

    catch (error) {

        console.error(
            "Order placement error:",
            error  
        );

        alert(
            "Unable to place order. Please try again."
        );

    }

}s