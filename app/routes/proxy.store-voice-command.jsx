import { authenticate } from "../shopify.server";
import prisma from "../db.server";

// -----------------------------
// Gemini: natural language → Shopify query
// -----------------------------
async function convertToAIQuery(userText) {
  const apiKey = process.env.GEMINI_API_KEY;

  console.log("🤖 [Gemini] convertToAIQuery called with:", userText);

  if (!apiKey) {
    console.log("⚠️ [Gemini] No GEMINI_API_KEY, fallback to title search");
    return `title:*${userText}*`;
  }

  try {
    const payload = {
      contents: [
        {
          parts: [
            {
              text: `Convert this user voice input into a Shopify product search query.

USER: "${userText}"

Rules:
1. Use Shopify search fields ONLY:
- title:*<term>*
- tag:*<term>*
- price:<value
- price:>value
- price:>=value
- price:<=value

2. Interpret price logic:
- "under", "below", "less than" → price:<number
- "over", "above", more than → price:>number
- "between X and Y" → price:>=X price:<=Y

3. Colors → tag:*color*
4. Product types → title:*type*

Return ONLY query.
`,
            },
          ],
        },
      ],
      generationConfig: { temperature: 0.1 },
    };

    console.log("🤖 [Gemini] Request payload:", payload);

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );

    if (!response.ok) {
      const txt = await response.text();
      console.log("❌ [Gemini] HTTP error:", response.status, txt.slice(0, 200));
      return `title:*${userText}*`;
    }

    const data = await response.json();
    console.log("🤖 [Gemini] Raw response:", data);

    let aiQuery =
      data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ||
      `title:*${userText}*`;

    console.log("🤖 [Gemini] Raw output text:", aiQuery);

    aiQuery = aiQuery
      .replace(/^\/search\?q=/, "")
      .replace(/"/g, "")
      .replace(/'/g, "")
      .trim();

    if (!aiQuery || aiQuery.length < 3) {
      console.log("⚠️ [Gemini] Query too short, fallback:", aiQuery);
      return `title:*${userText}*`;
    }

    console.log("✅ [Gemini] Final query:", aiQuery);
    return aiQuery;
  } catch (err) {
    console.error("💥 [Gemini] Error:", err?.message || err);
    return `title:*${userText}*`;
  }
}

// -----------------------------
// Storefront API helper
// -----------------------------
async function storefrontRequest(shop, storefrontToken, query, variables = {}) {
  const storeDomain = shop.replace(/^https?:\/\//, "");

  console.log("🌐 [Storefront] Request →", {
    storeDomain,
    hasToken: !!storefrontToken?.token,
    variables,
  });

  const response = await fetch(
    `https://${storeDomain}/api/2025-01/graphql.json`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Storefront-Access-Token": storefrontToken.token,
      },
      body: JSON.stringify({ query, variables }),
    }
  );

  const text = await response.text();

  if (!response.ok) {
    console.error(
      `💥 [Storefront] HTTP ${response.status}:`,
      text.slice(0, 300)
    );
    throw new Error(
      `Storefront API [${response.status}]: ${text.slice(0, 200)}`
    );
  }

  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch (e) {
    console.error("💥 [Storefront] JSON parse error:", e, "body:", text);
    throw new Error("Storefront JSON parse error");
  }

  console.log("✅ [Storefront] Response keys:", Object.keys(json || {}));
  return json;
}

// -----------------------------
// Loader – health check
// -----------------------------
export async function loader() {
  console.log("🩺 [Voice] Loader health check hit");
  return new Response("Voice proxy OK", { status: 200 });
}

// -----------------------------
// ACTION – /apps/store-voice-command
// -----------------------------
export async function action({ request }) {
  if (request.method !== "POST") {
    console.warn("⚠️ [Voice] Non-POST method:", request.method);
    return new Response("Method not allowed", { status: 405 });
  }

  let body = null;
  let shop = null;

  try {
    console.log("🔥 [Voice] Incoming request…");

    const authResult = await authenticate.public.appProxy(request);
    const session = authResult.session;
    shop = session.shop;
    console.log("🔐 [Voice] Authenticated for shop:", shop);

    body = await request.json();
    console.log("📥 [Voice] Raw body:", body);

    const { search, action: actionType, variantId, quantity = 1 } = body;

    console.log("📥 [Voice] Parsed payload:", {
      actionType,
      search: search?.slice?.(0, 80),
      variantId,
      quantity,
      shop,
    });

    const storefrontToken = await prisma.storefrontToken.findUnique({
      where: { shop },
    });

    if (!storefrontToken?.token) {
      console.error("❌ [Voice] NO STOREFRONT TOKEN for:", shop);
      return new Response(
        JSON.stringify({
          error: "Storefront token missing. Reinstall app.",
          products: [],
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    console.log(
      "✅ [Voice] Storefront token loaded:",
      storefrontToken.token.slice(0, 12) + "..."
    );

    // -----------------------------
    // SEARCH PRODUCTS
    // -----------------------------
    if (!actionType || actionType === "search") {
      console.log("🔍 [Voice] Handling search action");

      const aiQuery = await convertToAIQuery(search || "");
      console.log("🔍 [Search] Using query:", aiQuery);

      const data = await storefrontRequest(
        shop,
        storefrontToken,
        `
        query SearchProducts($query: String!) {
          products(first: 20, query: $query) {
            edges {
              node {
                id
                title
                handle
                onlineStoreUrl
                featuredImage {
                  url(transform: { maxWidth: 120, maxHeight: 120 })
                }
                priceRange {
                  minVariantPrice {
                    amount
                    currencyCode
                  }
                }
                variants(first: 20) {
                  edges {
                    node {
                      id
                      title
                      availableForSale
                      selectedOptions { name value }
                      image {
                        url(transform: { maxWidth: 120, maxHeight: 120 })
                      }
                    }
                  }
                }
              }
            }
          }
        }
      `,
        { query: aiQuery }
      );

      const edges = data?.data?.products?.edges || [];
      const products = edges.map((e) => e.node);

      console.log(`✅ [Search] Found ${products.length} products`);

      return new Response(
        JSON.stringify({
          aiQuery,
          products,
        }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    // -----------------------------
    // BACKEND ADD_TO_CART (optional)
    // -----------------------------
    if (actionType === "add_to_cart") {
      console.log("🛒 [Voice] Handling add_to_cart action");

      const { variantId: vId, quantity: qty = 1, productInfo } = body;

      if (!vId) {
        console.warn("⚠️ [Voice] add_to_cart missing variantId");
        return new Response(
          JSON.stringify({ success: false, error: "variantId missing" }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      console.log("📦 [Voice] Product Being Added →", {
        shop,
        variantId: vId,
        quantity: qty,
        title: productInfo?.title,
        color: productInfo?.color,
        size: productInfo?.size,
      });

      try {
        const shopDomain = shop.replace(/^https?:\/\//, "");
        const payload = {
          id: vId,
          quantity: qty,
          properties: {
            added_by: "Voice Assistant",
            title: productInfo?.title || "Unknown",
            color: productInfo?.color || "none",
            size: productInfo?.size || "free",
          },
        };

        console.log("🛒 [Voice] /cart/add.js payload:", payload);

        const cartResponse = await fetch(
          `https://${shopDomain}/cart/add.js`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Accept: "application/json",
            },
            body: JSON.stringify(payload),
          }
        );

        const rawText = await cartResponse.text();

        console.log("🧾 [Cart] Status:", cartResponse.status);
        console.log(
          "🧾 [Cart] Content-Type:",
          cartResponse.headers.get("content-type")
        );
        console.log("🧾 [Cart] Body snippet:", rawText.slice(0, 300));

        let result = null;
        try {
          result = rawText ? JSON.parse(rawText) : null;
        } catch {
          console.log("⚠️ [Cart] Non-JSON response from Shopify");
        }

        if (!cartResponse.ok) {
          console.error(
            "💥 [Cart] CART ADD FAILED (Shopify):",
            cartResponse.status
          );
          return new Response(
            JSON.stringify({
              success: false,
              status: cartResponse.status,
              raw: rawText,
            }),
            {
              status: 500,
              headers: { "Content-Type": "application/json" },
            }
          );
        }

        console.log("🛍 [Cart] CART RESULT →", result || rawText.slice(0, 200));

        return new Response(
          JSON.stringify({
            success: true,
            cart: result || { raw: rawText },
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }
        );
      } catch (err) {
        console.error("💥 [Cart] CART ADD FAILED (Exception):", err?.message || err);
        return new Response(
          JSON.stringify({
            success: false,
            error: err?.message || "Cart add error",
          }),
          {
            status: 500,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
    }

    console.warn("⚠️ [Voice] Unknown action:", actionType);

    return new Response(
      JSON.stringify({ error: `Unknown action: ${actionType}` }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("💥 [Voice] FATAL ERROR:", {
      message: error.message,
      stack: error.stack,
      action: body?.action,
      shop,
      body,
    });

    return new Response(
      JSON.stringify({
        error: error.message || "Server error",
        action: body?.action,
        shop,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}