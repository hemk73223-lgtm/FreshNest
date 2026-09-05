const userId = localStorage.getItem("userId");

const container =
document.getElementById("ordersContainer");

loadOrders();

async function loadOrders(){

    const snapshot = await db.collection("orders")
        .where("userId","==",userId)
        .orderBy("orderedAt","desc")
        .get();

    if(snapshot.empty){

        container.innerHTML=`

        <div class="alert alert-info">

        No orders found.

        </div>

        `;

        return;

    }

    container.innerHTML="";

    snapshot.forEach(doc=>{

        const order=doc.data();

        let itemsHTML="";

        order.items.forEach(item=>{

            itemsHTML+=`

            <li>

            ${item.name}

            × ${item.quantity}

            - ₹${item.price}

            </li>

            `;

        });

       let statusColor = "bg-warning";

if (order.status === "delivered") {

    statusColor = "bg-success";

}
else if (order.status === "shipped") {

    statusColor = "bg-primary";

}
else if (order.status === "packed") {

    statusColor = "bg-info";

}

let orderedDate = "";

if (order.orderedAt) {

    orderedDate =
        order.orderedAt.toDate().toLocaleString();

}

container.innerHTML += `

<div class="card shadow border-0 rounded-4 mb-4">

<div class="card-body">

<h5 class="fw-bold">

📦 Order #${order.orderId || doc.id.substring(0,8)}

</h5>

<hr>

${order.items.map(item=>`

<div class="d-flex justify-content-between align-items-center mb-3">

<div>

<h6 class="mb-1">

${item.name}

</h6>

<small class="text-muted">

Quantity : ${item.quantity}

</small>

</div>

<div>

<strong>

₹${item.price}

</strong>

</div>

</div>

`).join("")}

<hr>

<div class="row">

<div class="col-md-6">

<p>

💳 Payment

<br>

<strong>

${order.paymentMethod}

</strong>

</p>

</div>

<div class="col-md-6">

<p>

📅 Ordered On

<br>

<strong>

${orderedDate}

</strong>

</p>

</div>

</div>

<hr>

<div class="d-flex justify-content-between align-items-center">

<h5>

Total

₹${order.total}

</h5>

<span class="badge ${statusColor} fs-6">

${order.status.toUpperCase()}

</span>

</div>

</div>

</div>

`;
    });

}