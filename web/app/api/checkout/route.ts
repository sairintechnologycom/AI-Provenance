import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const user = await prisma.user.findUnique({
      // @ts-ignore
      where: { id: session.user.id },
      include: { 
        workspace: {
          include: { subscription: true }
        }
      }
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const subscription = user.workspace?.subscription;

    // Redirect to billing portal if already subscribed
    if (subscription?.stripeCustomerId && subscription.status === 'active') {
      const portalSession = await stripe.billingPortal.sessions.create({
        customer: subscription.stripeCustomerId,
        return_url: `${process.env.NEXTAUTH_URL}/dashboard`,
      });
      return NextResponse.json({ url: portalSession.url });
    }

    // Create Stripe Checkout Session
    const checkoutSession = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer_email: user.email!,
      line_items: [
        {
          price: process.env.STRIPE_PRO_PRICE_ID || 'price_1P2SxbS2Z', // Use env or placeholder
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXTAUTH_URL}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXTAUTH_URL}/dashboard`,
      metadata: {
        userId: user.id,
        workspaceId: user.workspaceId || '',
      },
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (error: any) {
    console.error("[Checkout API Error]", error.message);
    return NextResponse.json({ error: "Failed to create checkout session" }, { status: 500 });
  }
}
