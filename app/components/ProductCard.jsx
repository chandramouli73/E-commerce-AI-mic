import React, { useState } from "react";

export default function ProductCard({ product }) {
  const [expanded, setExpanded] = useState(false);

  const toggle = () => setExpanded((v) => !v);

  return (
    <div
      style={{
        border: "1px solid #ddd",
        borderRadius: "8px",
        padding: "16px",
      }}
    >
      {product.featuredImage ? (
        <img
          src={product.featuredImage.url}
          alt={product.title}
          style={{
            width: "100%",
            height: "200px",
            objectFit: "cover",
            borderRadius: "6px",
          }}
        />
      ) : (
        <div
          style={{
            width: "100%",
            height: "200px",
            background: "#f0f0f0",
            borderRadius: "6px",
          }}
        />
      )}

      <h3>{product.title}</h3>

      {/* Description with show more */}
      <p
        style={{
          color: "#666",
          display: expanded ? "block" : "-webkit-box",
          WebkitLineClamp: expanded ? "unset" : 2,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
        }}
      >
        {product.description || "No description available"}
      </p>

      {/* Show more / Show less button */}
      {product.description && product.description.length > 50 && (
        <button
          onClick={toggle}
          style={{
            background: "none",
            border: "none",
            color: "#007aff",
            cursor: "pointer",
            padding: 0,
          }}
        >
          {expanded ? "Show less" : "Show more"}
        </button>
      )}

      <p>
        <strong>
          ₹ {product.variants.edges[0]?.node.price ?? "N/A"}
        </strong>
      </p>
    </div>
  );
}
