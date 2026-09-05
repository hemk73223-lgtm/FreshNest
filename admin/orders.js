/* ============================================
   ORDERS.JS — FreshNest
   Handles all Firestore operations for the "orders" collection.
   Requires firebase-config.js to be loaded first.
   ============================================ */

const ordersRef = db.collection("orders");

/* ------------------------------------------
   USER FUNCTION
------------------------------------------ */

// Place a new order
// order = { userName, items: [{ productId, name, price, quantity }], total }
function placeOrder(order) {
  return ordersRef
    .add({
      userName: order.userName,
      items: order.items,
      total: Number(order.total),
      status: "pending",
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    })
    .then((docRef) => {
      console.log("Order placed with ID:", docRef.id);
      return docRef.id;
    })
    .catch((error) => {
      console.error("Error placing order:", error);
      throw error;
    });
}

/* ------------------------------------------
   ADMIN FUNCTIONS
------------------------------------------ */

// Fetch all orders
function getOrders() {
  return ordersRef
    .get()
    .then((snapshot) => {

      const orders = [];

      snapshot.forEach((doc) => {

        orders.push({
          id: doc.id,
          ...doc.data()
        });

      });

      return orders;

    })
    .catch((error) => {

      console.error("Error fetching orders:", error);

      throw error;

    });
}

// Update order status: "pending" | "shipped" | "delivered"
function updateOrderStatus(orderId, newStatus) {
  const validStatuses = ["pending", "shipped", "delivered"];
  if (!validStatuses.includes(newStatus)) {
    return Promise.reject(new Error("Invalid status value: " + newStatus));
  }

  return ordersRef
    .doc(orderId)
    .update({ status: newStatus })
    .then(() => {
      console.log("Order status updated:", orderId, "->", newStatus);
    })
    .catch((error) => {
      console.error("Error updating order status:", error);
      throw error;
    });
}

