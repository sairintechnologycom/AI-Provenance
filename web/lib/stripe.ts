import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "sk_test_placeholder", {
  // @ts-ignore
  apiVersion: "2024-04-10",
  typescript: true,
});
