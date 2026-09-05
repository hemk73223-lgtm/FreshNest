const userId = localStorage.getItem("userId");

const cartContainer = document.getElementById("cartContainer");

let total = 0;

async function loadCart() {

    if (!userId) {

        alert("Please login first.");

        return;

    }

    cartContainer.innerHTML = "";

    total = 0;

    const snapshot = await db.collection("cart")
        .where("userId", "==", userId)
        .get();

    if (snapshot.empty) {

        cartContainer.innerHTML =
            "<h4>Your cart is empty.</h4>";

        document.getElementById("totalPrice").textContent = "0";

        return;
    }

    for (const doc of snapshot.docs) {

        const cart = doc.data();

console.log(cart);

if (!cart.productId) {

    console.warn("Skipping invalid cart item:", doc.id);

    continue;

}

const productDoc = await db
    .collection("products")
    .doc(cart.productId)
    .get();

        if (!productDoc.exists) continue;

        const product = productDoc.data();

        const price = cart.pricePaid || product.price;
        console.log({
    product: product.name,
    price: price,
    quantity: cart.quantity,
    subtotal: Number(price) * Number(cart.quantity)
});

total += Number(price) * cart.quantity;
    cartContainer.innerHTML += `

<div class="card shadow-sm border-0 rounded-4 mb-4 p-3">

    <div class="row align-items-center">

        <!-- Product Image -->
        <div class="col-md-3 text-center">

            <img
                src="${product.image || 'https://via.placeholder.com/150'}"
                class="img-fluid rounded-3"
                style="
                    width:150px;
                    height:150px;
                    object-fit:contain;
                    background:#fff;
                    padding:10px;
                ">

        </div>

        <!-- Product Details -->
        <div class="col-md-6">

            <h4 class="fw-bold mb-2">
                ${product.name}
            </h4>

            ${
                cart.discount > 0
                ?
                `<span class="badge bg-danger mb-2">
                    🔥 ${cart.discount}% OFF
                </span>`
                :
                ""
            }

            <h3 class="text-success fw-bold">
                ₹${cart.pricePaid || product.price}

                ${
                    cart.discount > 0
                    ?
                    `<small class="text-decoration-line-through text-muted ms-2">
                        ₹${cart.originalPrice}
                    </small>`
                    :
                    ""
                }
            </h3>

            <p class="text-success mb-2">
                📦 In Stock
            </p>

            <p class="text-warning mb-3">
                ⏰ Near Expiry Deal
            </p>

            <div class="d-flex align-items-center">

                <button
                    class="btn btn-outline-danger rounded-circle"
                    onclick="changeQuantity('${doc.id}',-1)">
                    -
                </button>

                <span class="mx-3 fs-5 fw-bold">
                    ${cart.quantity}
                </span>

                <button
                    class="btn btn-outline-success rounded-circle"
                    onclick="changeQuantity('${doc.id}',1)">
                    +
                </button>

            </div>

        </div>

        <!-- Total + Remove -->
        <div class="col-md-3 text-end">

            <h3 class="fw-bold text-success">

                ₹${(cart.pricePaid || product.price) * cart.quantity}

            </h3>

            <button
                class="btn btn-outline-danger mt-3"
                onclick="removeItem('${doc.id}')">

                🗑 Remove

            </button>

        </div>

    </div>

</div>

`;   
    }

console.log("Final Total =", total);
let originalTotal = 0;

snapshot.forEach(doc => {

    const cart = doc.data();

    originalTotal +=
        (cart.originalPrice || cart.pricePaid) * cart.quantity;

});

const discount = originalTotal - total;

document.getElementById("itemsTotal").textContent = originalTotal;

document.getElementById("discountAmount").textContent = discount;

document.getElementById("grandTotal").textContent = total;

document.getElementById("savedAmount").textContent = discount;
}
async function removeItem(id) {

    await db.collection("cart").doc(id).delete();

    loadCart();

}

loadCart();
async function changeQuantity(id, change) {

    const ref = db.collection("cart").doc(id);

    const docSnap = await ref.get();

    if (!docSnap.exists) return;

    const data = docSnap.data();

    const newQty = data.quantity + change;

    if (newQty <= 0) {

        await ref.delete();

    } else {

        await ref.update({
            quantity: newQty
        });

    }

    loadCart();

}