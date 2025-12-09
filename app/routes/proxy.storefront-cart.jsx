// app/routes/proxy.storefront-cart.jsx
import { authenticate } from "../shopify.server";
import prisma from "../db.server";
import { createStorefrontApiClient } from "@shopify/storefront-api-client";

export async function action({ request }) {
  if (request.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  // Get storefront access token from DB
  const storefrontToken = await prisma.storefrontToken.findUnique({
    where: { shop },
  });
  console.log(storefrontToken)
  if (!storefrontToken) {
    return new Response(JSON.stringify({ error: "No Storefront token found" }), {
      status: 500,
    });
  }

  // Init Storefront client
  const storefront = createStorefrontApiClient({
    storeDomain: shop,
    apiVersion: "2025-01",
    publicAccessToken: storefrontToken.token,
  });
  console.log(storefront);
  
  const body = await request.json();
  const { action, cartId, lines } = body;

  // -------------------------------------------------
  // 1️⃣ CREATE CART
  // -------------------------------------------------
  if (action === "create") {
    const mutation = `
      mutation CartCreate {
        cartCreate {
          cart {
            id
          }
          userErrors {
            message
          }
        }
      }
    `;

    const result = await storefront.request(mutation);
    console.log(result);
    
    return Response.json({
      cartId: result?.data?.cartCreate?.cart?.id || null,
      errors: result?.data?.cartCreate?.userErrors || [],
    });
  }

  // -------------------------------------------------
  // 2️⃣ ADD LINES TO CART
  // -------------------------------------------------
  if (action === "add") {
    if (!cartId || !lines) {
      return Response.json({ error: "cartId and lines are required" }, { status: 400 });
    }

    const mutation = `
      mutation CartLinesAdd($cartId: ID!, $lines: [CartLineInput!]!) {
        cartLinesAdd(cartId: $cartId, lines: $lines) {
          cart {
            id
            lines(first: 20) {
              edges {
                node {
                  id
                  quantity
                  merchandise {
                    ... on ProductVariant {
                      id
                      title
                      price {
                        amount
                      }
                      product {
                        title
                        featuredImage {
                          url
                        }
                      }
                    }
                  }
                }
              }
            }
          }
          userErrors {
            message
          }
        }
      }
    `;

    const result = await storefront.request(mutation, {
      variables: { cartId, lines },
    });

    return Response.json({
      cart: result?.data?.cartLinesAdd?.cart,
      errors: result?.data?.cartLinesAdd?.userErrors || [],
    });
  }

  // -------------------------------------------------
  // 3️⃣ GET CART CONTENTS
  // -------------------------------------------------
  if (action === "get") {
    if (!cartId) {
      return Response.json({ error: "cartId required" }, { status: 400 });
    }

    const query = `
      query GetCart($cartId: ID!) {
        cart(id: $cartId) {
          id
          checkoutUrl
          totalQuantity
          lines(first: 20) {
            edges {
              node {
                id
                quantity
                merchandise {
                  ... on ProductVariant {
                    id
                    title
                    price { amount }
                    product {
                      title
                      featuredImage { url }
                    }
                  }
                }
              }
            }
          }
        }
      }
    `;

    const result = await storefront.request(query, {
      variables: { cartId },
    });

    return Response.json(result?.data?.cart || null);
  }

  return Response.json({ error: "Invalid Action" }, { status: 400 });
}
