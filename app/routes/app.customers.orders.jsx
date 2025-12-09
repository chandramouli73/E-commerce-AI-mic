import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  const { admin } = await authenticate.admin(request);

  const url = new URL(request.url);
  const customerId = url.searchParams.get("customerId");

  // Extract numeric ID
  const numericId = customerId.split("/").pop();

  const response = await admin.graphql(
    `
    #graphql
    query getOrders($search: String!) {
      orders(first: 50, query: $search) {
        edges {
          node {
            id
            name
            createdAt
            totalPriceSet {
              shopMoney {
                amount
                currencyCode
              }
            }
          }
        }
      }
    }
  `,
    {
      variables: { search: `customer_id:${numericId}` },
    }
  );

  const json = await response.json();

  const orders =
    json.data.orders.edges.map((e) => ({
      id: e.node.id,
      name: e.node.name,
      createdAt: e.node.createdAt,
      total: e.node.totalPriceSet.shopMoney.amount,
      currency: e.node.totalPriceSet.shopMoney.currencyCode,
    })) ?? [];

  return new Response(JSON.stringify(orders));
};
