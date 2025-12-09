import { useLoaderData } from "react-router";
import { authenticate } from "../shopify.server";
import ProductCard from "../components/ProductCard";

export const loader = async ({ request }) => {
    const { admin } = await authenticate.admin(request);

    const response = await admin.graphql(`
    query {
      products(first: 50) {
        edges {
          node {
            id
            title
            description
            featuredImage {
              url
            }
            variants(first: 1) {
              edges {
                node {
                  price
                }
              }
            }
          }
        }
      }
    }
  `);

    const json = await response.json();

    const edges = json?.data?.products?.edges ?? [];

    return edges.map(edge => edge.node);
};

export default function ProductsPage() {
    const products = useLoaderData();

    return (
        <div style={{ padding: 20 }}>
            <h1>Store Products</h1>

            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))",
                    gap: "20px",
                }}
            >
                {products.map((product) => (
                    <ProductCard key={product.id} product={product} />
                ))}
            </div>
        </div>
    );
}