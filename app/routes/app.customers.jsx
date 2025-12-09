import { authenticate } from "../shopify.server";
import { useLoaderData } from "react-router";
import React, { useState } from "react";

export const loader = async ({ request }) => {
  const { admin } = await authenticate.admin(request);

  const response = await admin.graphql(`
    #graphql
    query {
      customers(first: 50, sortKey: CREATED_AT, reverse: true) {
        edges {
          node {
            id
            firstName
            lastName
            email
            phone
          }
        }
      }
    }
  `);

  const json = await response.json();
  return json.data.customers.edges.map((e) => e.node);
};

export default function CustomersPage() {
  const customers = useLoaderData();
  const [openCustomer, setOpenCustomer] = useState(null);
  const [orders, setOrders] = useState({});

  // Fetch orders for a customer
  const loadOrders = async (customerId) => {
    if (orders[customerId]) {
      setOpenCustomer(openCustomer === customerId ? null : customerId);
      return;
    }

    const res = await fetch(`/app/customers/orders?customerId=${customerId}`);
    const json = await res.json();

    setOrders((prev) => ({ ...prev, [customerId]: json }));
    setOpenCustomer(customerId);
  };

  return (
    <div style={{ padding: "20px" }}>
      <h1>All Customers</h1>

      <div style={{ display: "grid", gap: "16px", maxWidth: "600px" }}>
        {customers.map((customer) => (
          <div
            key={customer.id}
            style={{
              padding: "16px",
              border: "1px solid #ddd",
              borderRadius: "8px",
              background: "#fff",
            }}
          >
            <h3>
              {customer.firstName} {customer.lastName}
            </h3>
            <p>
              <strong>Email:</strong> {customer.email}
            </p>
            <p>
              <strong>Phone:</strong> {customer.phone ?? "N/A"}
            </p>

            <button
              onClick={() => loadOrders(customer.id)}
              style={{
                marginTop: "10px",
                padding: "6px 10px",
                borderRadius: "4px",
                background: "#007aff",
                border: "none",
                color: "white",
                cursor: "pointer",
              }}
            >
              {openCustomer === customer.id
                ? "Hide Orders"
                : "View Orders"}
            </button>

            {/* Orders Section */}
            {openCustomer === customer.id && (
              <div
                style={{
                  marginTop: "12px",
                  padding: "12px",
                  background: "#f7f7f7",
                  borderRadius: "6px",
                }}
              >
                <h4>Orders</h4>

                {!orders[customer.id] ? (
                  <p>Loading...</p>
                ) : orders[customer.id].length === 0 ? (
                  <p>No orders found.</p>
                ) : (
                  orders[customer.id].map((order) => (
                    <div
                      key={order.id}
                      style={{
                        padding: "10px",
                        marginBottom: "10px",
                        background: "#fff",
                        borderRadius: "6px",
                        border: "1px solid #ddd",
                      }}
                    >
                      <p>
                        <strong>{order.name}</strong>
                      </p>
                      <p>
                        Total: {order.total} {order.currency}
                      </p>
                      <p>{new Date(order.createdAt).toLocaleString()}</p>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
