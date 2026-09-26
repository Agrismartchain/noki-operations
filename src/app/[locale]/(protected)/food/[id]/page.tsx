import { cookies } from "next/headers";

import { ForbiddenView } from "@/components/auth/forbidden-view";
import { FoodOrderDetailView } from "@/features/operations/components/food-order-detail-view";
import { getFoodOrder } from "@/features/operations/server/client";
import { redirect } from "@/i18n/navigation";
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from "@/lib/auth/cookies";
import { hasCapability } from "@/lib/auth/session";
import { getServerSessionResolution } from "@/lib/auth/server-session";

type PageProps = {
  params: Promise<{ locale: string; id: string }>;
};

export default async function FoodOrderDetailPage({ params }: PageProps) {
  const { locale, id } = await params;
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;
  if (!accessToken) {
    redirect({ href: "/login", locale });
    return;
  }

  const refreshToken = cookieStore.get(REFRESH_TOKEN_COOKIE)?.value;
  const session = await getServerSessionResolution(accessToken, refreshToken, locale);
  if (session.status === "unauthenticated") {
    redirect({ href: "/login", locale });
    return;
  }
  if (session.status === "forbidden" || !hasCapability(session.actor, "food.order.read")) {
    return <ForbiddenView />;
  }

  const order = await getFoodOrder(id, { accessToken, locale });

  return <FoodOrderDetailView order={order} />;
}
