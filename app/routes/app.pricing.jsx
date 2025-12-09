import React from "react";
import { PricingCard } from "./PricingCard";

export default function PricingPage() {
    const plans = [
        {
            title: "Standard",
            description: "Great for beginners launching their first store",
            price: "FREE",
            frequency: "15 Days",
            features: [
                "Process up to 1,000 orders/mo",
                "Amazing feature",
                "Another really cool feature",
                "24/7 Customer Support",
            ],
            button: {
                content: "Select Plan",
                props: {
                    onClick: () => alert("Selected Standard Plan"),
                    variant: "primary",
                },
            },
        },
        {
            title: "Standard",
            featuredText: "Most Popular",
            description: "Great for beginners launching their first store",
            price: "₹999",
            frequency: "month",
            features: [
                "Process up to 1,000 orders/mo",
                "Amazing feature",
                "Another really cool feature",
                "24/7 Customer Support",
            ],
            button: {
                content: "Select Plan",
                props: {
                    onClick: () => alert("Selected Standard Plan"),
                    variant: "primary",
                },
            },
        },
        {
            title: "Advanced",
            description: "For growing stores to high profits that need more scale ",
            price: "₹1999",
            frequency: "month",
            features: [
                "Process up to 10,000 orders/mo",
                "Amazing feature",
                "Another really cool feature",
                "24/7 Customer Support",
            ],
            button: {
                content: "Select Plan",
                props: {
                    onClick: () => alert("Selected Advanced Plan"),
                    variant: "primary",
                },
            },
        },
        {
            title: "Premium",
            description: "Best for large stores with high order volume",
            price: "₹2999",
            frequency: "month",
            features: [
                "Process up to 100,000 orders/mo",
                "Amazing feature",
                "Another really cool feature",
                "24/7 Customer Support",
            ],
            button: {
                content: "Select Plan",
                props: {
                    onClick: () => alert("Selected Premium Plan"),
                    variant: "primary",
                },
            },
        },
    ];

    return (
        <div style={{ padding: 30 }}>
            <div
                style={{
                    display: "flex",
                    gap: "24px",
                    alignItems: "stretch",  
                }}
            >
                {plans.map((plan, index) => (
                    <PricingCard key={index} {...plan} />
                ))}
            </div>
        </div>
    );
}
