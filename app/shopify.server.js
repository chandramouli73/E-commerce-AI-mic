import "@shopify/shopify-app-react-router/adapters/node";
import {
  ApiVersion,
  AppDistribution,
  shopifyApp,
} from "@shopify/shopify-app-react-router/server";
import { PrismaSessionStorage } from "@shopify/shopify-app-session-storage-prisma";
import prisma from "./db.server";
 
const shopify = shopifyApp({
  apiKey: process.env.SHOPIFY_API_KEY,
  apiSecretKey: process.env.SHOPIFY_API_SECRET || "",
  apiVersion: ApiVersion.October25,
  scopes: process.env.SCOPES?.split(","),
  appUrl: process.env.SHOPIFY_APP_URL || "",
  authPathPrefix: "/auth",
  sessionStorage: new PrismaSessionStorage(prisma),
  distribution: AppDistribution.AppStore,
  hooks: {
    afterAuth: async ({ session, admin }) => {
      console.log("APP INSTALLED:", session.shop);
      try {
        const createRes = await admin.graphql(
          `
          mutation storefrontAccessTokenCreate($title: String!) {
            storefrontAccessTokenCreate(input: { title: $title }) {
              storefrontAccessToken {
                accessToken
              }
              userErrors {
                field
                message
              }
            }
          }
        `,
          {
            variables: { title: "AI VOICE COMMAND APP" },
          }
        );
 
        const createJson = await createRes.json();
        const newToken =
          createJson.data.storefrontAccessTokenCreate.storefrontAccessToken
            ?.accessToken;
        if (!newToken) {
          console.error("Failed to create token");
          return;
        }
        console.log("Storefront token created:", newToken);
 
        await prisma.storefrontToken.upsert({
          where: { shop: session.shop },
          update: {
            token: newToken,
            createdAt: new Date(),
          },
          create: {
            shop: session.shop,
            token: newToken,
          },
        });
 
        console.log("Token saved to database!");
      } catch (err) {
        console.error("Storefront token error:", err);
      }
    },
  },
  ...(process.env.SHOP_CUSTOM_DOMAIN
    ? { customShopDomains: [process.env.SHOP_CUSTOM_DOMAIN] }
    : {}),
});
 
export default shopify;
export const apiVersion = ApiVersion.October25;
export const addDocumentResponseHeaders = shopify.addDocumentResponseHeaders;
export const authenticate = shopify.authenticate;
export const unauthenticated = shopify.unauthenticated;
export const login = shopify.login;
export const registerWebhooks = shopify.registerWebhooks;
export const sessionStorage = shopify.sessionStorage;
 