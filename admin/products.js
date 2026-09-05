/* ============================================
   PRODUCTS.JS — FreshNest
   Handles all Firestore operations for the "products" collection.
   Requires firebase-config.js to be loaded first.
   ============================================ */

const productsRef = db.collection("products");

/* ------------------------------------------
   ADMIN FUNCTIONS
------------------------------------------ */

// Add a new product
// product = { name, category, price, quantity, expiry }  (expiry as "YYYY-MM-DD")
function addProduct(product) {
 return productsRef.add({

    name: product.name,

    category: product.category,

    price: Number(product.price),

    quantity: Number(product.quantity),

    mfgDate: product.mfgDate,

    expiry: product.expiry,

    image: product.image,

    status: product.status,

    createdAt: firebase.firestore.FieldValue.serverTimestamp()

})
    .then((docRef) => {
      console.log("Product added with ID:", docRef.id);
      return docRef.id;
    })
    .catch((error) => {
      console.error("Error adding product:", error);
      throw error;
    });
}

// Update an existing product (pass only the fields you want to change)
function updateProduct(productId, updatedData) {
  return productsRef
    .doc(productId)
    .update(updatedData)
    .then(() => {
      console.log("Product updated:", productId);
    })
    .catch((error) => {
      console.error("Error updating product:", error);
      throw error;
    });
}

// Delete a product
function deleteProduct(productId) {
  return productsRef
    .doc(productId)
    .delete()
    .then(() => {
      console.log("Product deleted:", productId);
    })
    .catch((error) => {
      console.error("Error deleting product:", error);
      throw error;
    });
}

/* ------------------------------------------
   SHARED FUNCTIONS (ADMIN + USER)
------------------------------------------ */

// Fetch all products
function getProducts() {
  return productsRef
    .orderBy("createdAt", "desc")
    .get()
    .then((snapshot) => {
      const products = [];
      snapshot.forEach((doc) => {
        products.push({ id: doc.id, ...doc.data() });
      });
      return products;
    })
    .catch((error) => {
      console.error("Error fetching products:", error);
      throw error;
    });
}

// Filter: products by category (e.g. "Fruits", "Vegetables", "Liquids")
function getProductsByCategory(category) {
  return productsRef
    .where("category", "==", category)
    .get()
    .then((snapshot) => {
      const products = [];
      snapshot.forEach((doc) => {
        products.push({ id: doc.id, ...doc.data() });
      });
      return products;
    })
    .catch((error) => {
      console.error("Error fetching products by category:", error);
      throw error;
    });
}

// Filter: expiring soon (0 to 3 days remaining, not yet expired)
function getExpiringSoonProducts() {
  return getProducts().then((products) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return products.filter((product) => {
      const expiryDate = new Date(product.expiry);
      const diffDays = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));
      return diffDays >= 0 && diffDays <= 3;
    });
  });
}

// Filter: already expired products
function getExpiredProducts() {
  return getProducts().then((products) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return products.filter((product) => {
      const expiryDate = new Date(product.expiry);
      return expiryDate < today;
    });
  });
}

/* ------------------------------------------
   DASHBOARD HELPERS (for admin stats + pie chart)
------------------------------------------ */

// Total warehouse value = sum of (price * quantity) across all products
function getTotalWarehouseValue() {
  return getProducts().then((products) => {
    return products.reduce((total, p) => total + p.price * p.quantity, 0);
  });
}

// Category-wise quantity totals — feed this directly into Chart.js
function getCategoryTotals() {
  return getProducts().then((products) => {
    const totals = {};
    products.forEach((p) => {
      totals[p.category] = (totals[p.category] || 0) + p.quantity;
    });
    return totals; // e.g. { Fruits: 20, Vegetables: 15, Liquids: 10 }
  });
}

