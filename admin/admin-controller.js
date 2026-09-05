console.log("Admin Controller Loaded");
let editingProductId = null;

window.addEventListener("DOMContentLoaded", () => {

    const saveBtn = document.getElementById("saveProduct");

    if (saveBtn) {
        saveBtn.addEventListener("click", saveProduct);
    }
   const exportExcelBtn = document.getElementById("exportExcelBtn");

if (exportExcelBtn) {
    exportExcelBtn.addEventListener("click", exportToExcel);
}
const exportPdfBtn = document.getElementById("exportPdfBtn");

if (exportPdfBtn) {
    exportPdfBtn.addEventListener("click", exportToPDF);
}
    loadInventory();
    loadDashboardStats();
    loadCategoryChart();
    loadOrders();

});
async function uploadImageToCloudinary(file){

    const formData = new FormData();

    formData.append("file", file);

    formData.append("upload_preset", "freshnest");

    const response = await fetch(
        "https://api.cloudinary.com/v1_1/lzgi8hrf/image/upload",
        {
            method: "POST",
            body: formData
        }
    );

    const data = await response.json();

    return data.secure_url;

}
async function saveProduct(e) {

    e.preventDefault();

    console.log("Button clicked");
const imageFile =
document.getElementById("productImage").files[0];

let imageUrl = "";

if(imageFile){

    showToast("Uploading Image...");

    imageUrl = await uploadImageToCloudinary(imageFile);

}
    const product = {

    name: document.getElementById("productName").value.trim(),

    category: document.getElementById("category").value,

    price: Number(document.getElementById("price").value),

    quantity: Number(document.getElementById("quantity").value),

    mfgDate: document.getElementById("mfgDate").value,

    expiry: document.getElementById("expiry").value,

    image: imageUrl,

    createdAt: new Date(),

    status: "Active"

};
    console.log("Editing ID:", editingProductId);
    if (editingProductId) {

     await updateProduct(editingProductId, product);

await addActivity(
    "Updated Product",
    product.name
);


showToast("✏️ Product Updated Successfully!");
    console.log("Clearing form...");
     editingProductId = null;
// Clear the form
document.getElementById("productName").value = "";
document.getElementById("category").selectedIndex = 0;
document.getElementById("price").value = "";
document.getElementById("quantity").value = "";
document.getElementById("mfgDate").value = "";
document.getElementById("expiry").value = "";
document.getElementById("productImage").value = "";

const preview = document.getElementById("imagePreview");

preview.src = "";
preview.style.display = "none";

updateProductPreview();
console.log("Updating Preview...");
console.log(document.getElementById("productName").value);
// Refresh preview

    } else {

         await addProduct(product);

await addActivity(
    "Added Product",
    product.name
);


showToast("✅ Product Added Successfully!");
}
// Clear the form
document.getElementById("productName").value = "";
document.getElementById("category").selectedIndex = 0;
document.getElementById("price").value = "";
document.getElementById("quantity").value = "";
document.getElementById("mfgDate").value = "";
document.getElementById("expiry").value = "";
document.getElementById("productImage").value = "";

const preview = document.getElementById("imagePreview");

preview.src = "";
preview.style.display = "none";

// Refresh preview

    document.getElementById("saveProduct").textContent = "Add Product";
    await loadInventory();
    await loadDashboardStats();
    await renderCategoryList();
    loadInventory();
    
document.getElementById("saveProduct").textContent = "Add Product";

editingProductId = null;




}

async function loadInventory() {

    const tbody = document.getElementById("inventoryTableBody");

    if (!tbody) return;

    tbody.innerHTML = "";

    const products = await getProducts();

    products.forEach(product => {

        tbody.innerHTML += `
            <tr>
                <td>${product.name}</td>
                <td>${product.category}</td>
                <td>${product.quantity}</td>
                <td>₹${product.price}</td>
                <td>${product.expiry}</td>
            </tr>
        `;

    });

}
async function loadDashboardStats() {

    const products = await getProducts();

    let totalProducts = products.length;
    let expiringSoon = 0;
    let expired = 0;
    let warehouseValue = 0;

    const today = new Date();

    products.forEach(product => {

        warehouseValue += (product.price || 0) * (product.quantity || 0);

        if (product.expiry) {

            const expiryDate = new Date(product.expiry);

            const diffDays = Math.ceil(
                (expiryDate - today) / (1000 * 60 * 60 * 24)
            );

            if (diffDays < 0) {

                expired++;

            } else if (diffDays <= 7) {

                expiringSoon++;

            }
        }

    });

    document.getElementById("statTotalProducts").textContent = totalProducts;
    document.getElementById("statExpiringSoon").textContent = expiringSoon;
    document.getElementById("statExpiredProducts").textContent = expired;
    document.getElementById("statWarehouseValue").textContent = "₹" + warehouseValue;

}
async function loadCategoryChart() {

    const products = await getProducts();

    const categories = {};

    products.forEach(product => {

        if (!categories[product.category]) {
            categories[product.category] = 0;
        }

        categories[product.category]++;

    });

    const labels = Object.keys(categories);
    const data = Object.values(categories);

    const ctx = document.getElementById("categoryPie");

    if (!ctx) return;

    if (window.categoryChart) {
        window.categoryChart.destroy();
    }

    window.categoryChart = new Chart(ctx, {

        type: "pie",

        data: {

            labels: labels,

            datasets: [{

                data: data,

                backgroundColor: [
                    "#3B82F6",
                    "#10B981",
                    "#F59E0B",
                    "#EF4444",
                    "#8B5CF6",
                    "#310f10"
                ]

            }]

        }

    });

}
document.addEventListener("DOMContentLoaded", () => {

    const search = document.getElementById("inventorySearch");
    const filter = document.getElementById("inventoryCategoryFilter");


    if(search){
        search.addEventListener("input", renderInventoryTable);
    }


    if(filter){
        filter.addEventListener("change", renderInventoryTable);
    }

});
async function exportToExcel() {
    alert("Excel button clicked");
    const products = await getProducts();

    const data = products.map(product => ({
        "Product Name": product.name,
        "Category": product.category,
        "Quantity": product.quantity,
        "Price": product.price,
        "Manufacturing Date": product.mfgDate,
        "Expiry Date": product.expiry,
        "Status": product.status
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);

    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(workbook, worksheet, "Inventory");

    XLSX.writeFile(workbook, "Warehouse_Inventory.xlsx");

await addActivity(
    "Exported Excel",
    "Warehouse Inventory"
);


showToast("📊 Inventory exported successfully!");

}
async function exportToPDF() {
    alert("PDF button clicked");
    const { jsPDF } = window.jspdf;

    const doc = new jsPDF();

    const products = await getProducts();

    // Title
    doc.setFontSize(18);
    doc.text("Warehouse Inventory Report", 14, 18);

    // Date
    doc.setFontSize(11);
    doc.text("Generated: " + new Date().toLocaleString(), 14, 28);

    // Table
    const tableData = products.map(product => [
        product.name,
        product.category,
        product.quantity,
        "₹" + product.price,
        product.mfgDate,
        product.expiry,
        product.status
    ]);

    doc.autoTable({
        startY: 35,
        head: [[
            "Product",
            "Category",
            "Qty",
            "Price",
            "Mfg Date",
            "Expiry",
            "Status"
        ]],
        body: tableData,
        theme: "grid",
        headStyles: {
            fillColor: [41, 128, 185]
        }
    });

    doc.save("Warehouse_Inventory_Report.pdf");

await addActivity(
    "Exported PDF",
    "Warehouse Inventory"
);


showToast("📄 PDF exported successfully!");
 
}
async function loadOrders() {
    console.log("Loading orders...");

    const tbody = document.getElementById("ordersTableBody");

    if (!tbody) return;

    tbody.innerHTML = "";

    const orders = await getOrders();
    console.log(orders);

    for (const order of orders) {

    if (!order.items) {
        console.log("Skipping old order:", order.id);
        continue;
    }

    for (const item of order.items) {

            let productCategory = "-";

            try {

                const productDoc = await db
                    .collection("products")
                    .doc(item.productId)
                    .get();

                if (productDoc.exists) {
                    productCategory = productDoc.data().category;
                }

            } catch (e) {}

            tbody.innerHTML += `
                <tr>

                    <td>${order.userName || "Customer"}</td>

                    <td>${item.name}</td>

                    <td>${productCategory}</td>

                    <td>${item.quantity}</td>

                    <td>₹${item.price}</td>

                    <td>

                        <span class="badge bg-warning">

                            ${order.status}

                        </span>

                    </td>

                    <td>

                        <select
                            onchange="changeOrderStatus('${order.id}', this.value)">

                            <option ${order.status=="pending"?"selected":""} value="pending">
                                Pending
                            </option>

                            <option ${order.status=="shipped"?"selected":""} value="shipped">
                                Shipped
                            </option>

                            <option ${order.status=="delivered"?"selected":""} value="delivered">
                                Delivered
                            </option>

                        </select>

                    </td>

                </tr>
            `;

        }

    }

}
async function changeOrderStatus(id,status){

    await updateOrderStatus(id,status);

    loadOrders();

}