"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  DetailItem,
  DetailList,
  StatusChip,
} from "@agrismartchain/noki-design-system";
import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";

import { FOOD_ORDER_TONE } from "../tone-maps";
import type { FoodOrderDetail } from "../types";
import styles from "./ops-tables.module.css";

function formatDate(value: string | null): string {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

export interface FoodOrderDetailViewProps {
  order: FoodOrderDetail;
}

/**
 * Read-only: OPERATIONS holds FOOD_ORDER_READ but not FOOD_ORDER_MANAGE
 * (restaurant order-lifecycle transitions remain the restaurant's own
 * action). The actual dispatch/assign action for the linked shipment lives
 * on the existing /shipping/{id} detail page (delivery.shipment.assign),
 * not duplicated here.
 */
export function FoodOrderDetailView({ order }: FoodOrderDetailViewProps) {
  const t = useTranslations();

  return (
    <div className={styles.grid}>
      <Card className={styles.full}>
        <CardHeader>
          <CardTitle>{t("food.detail.sections.summary")}</CardTitle>
        </CardHeader>
        <CardContent>
          <DetailList>
            <DetailItem label={t("food.columns.order")} value={order.orderNumber} />
            <DetailItem label={t("food.detail.restaurant")} value={order.restaurantBrandName} />
            <DetailItem label={t("food.columns.establishment")} value={order.establishmentName} />
            <DetailItem
              label={t("food.columns.status")}
              value={<StatusChip tone={FOOD_ORDER_TONE[order.status]}>{t(`food.status.${order.status}`)}</StatusChip>}
            />
            <DetailItem label={t("food.detail.customer")} value={order.customerFullName} />
            <DetailItem label={t("food.detail.customerPhone")} value={order.customerPhone ?? "-"} />
            <DetailItem
              label={t("food.detail.address")}
              value={[order.addressLine1, order.addressLine2].filter(Boolean).join(", ")}
            />
            <DetailItem label={t("food.detail.notes")} value={order.notes ?? "-"} />
            {order.cancellationReason ? (
              <DetailItem label={t("food.detail.cancellationReason")} value={order.cancellationReason} />
            ) : null}
            <DetailItem label={t("food.detail.subtotal")} value={`${order.subtotalAmount} ${order.currencyCode}`} />
            <DetailItem label={t("food.detail.deliveryFee")} value={`${order.deliveryFeeAmount} ${order.currencyCode}`} />
            <DetailItem label={t("food.detail.discount")} value={`${order.discountAmount} ${order.currencyCode}`} />
            <DetailItem label={t("food.columns.total")} value={`${order.totalAmount} ${order.currencyCode}`} />
            <DetailItem label={t("food.detail.paymentMethod")} value={t(`food.paymentMethod.${order.paymentMethod}`)} />
            <DetailItem label={t("food.detail.paymentStatus")} value={t(`food.paymentStatus.${order.paymentStatus}`)} />
            <DetailItem label={t("food.detail.createdAt")} value={formatDate(order.createdAt)} />
            <DetailItem label={t("food.detail.updatedAt")} value={formatDate(order.updatedAt)} />
          </DetailList>
        </CardContent>
      </Card>

      <Card className={styles.full}>
        <CardHeader>
          <CardTitle>{t("food.detail.sections.items")}</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className={styles.container}>
            {order.items.map((item) => (
              <li key={item.id} className={styles.stack}>
                <span className={styles.primary}>
                  {item.quantity}x {item.name} -- {item.totalPriceAmount} {order.currencyCode}
                </span>
                {item.modifiers.length > 0 ? (
                  <span className={styles.secondary}>
                    {item.modifiers.map((modifier) => `${modifier.name} (+${modifier.priceDeltaAmount})`).join(", ")}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {order.shipment ? (
        <Card className={styles.full}>
          <CardHeader>
            <CardTitle>{t("food.detail.sections.shipment")}</CardTitle>
          </CardHeader>
          <CardContent>
            <DetailList>
              <DetailItem label={t("shipping.columns.status")} value={t(`shipping.status.${order.shipment.status}`)} />
              <DetailItem
                label={t("shipping.columns.driver")}
                value={order.shipment.assignedDriverDisplayName ?? t("shipping.unassigned")}
              />
              <DetailItem label={t("shipping.detail.assignedAt")} value={formatDate(order.shipment.assignedAt)} />
              <DetailItem label={t("shipping.detail.deliveredAt")} value={formatDate(order.shipment.deliveredAt)} />
            </DetailList>
            <Link href={`/shipping/${order.shipment.id}`} className={styles.rowAction}>
              {t("food.detail.viewShipment")}
            </Link>
          </CardContent>
        </Card>
      ) : null}

      <Card className={styles.full}>
        <CardHeader>
          <CardTitle>{t("food.detail.sections.timeline")}</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className={styles.container}>
            {order.timeline.map((entry, index) => (
              <li key={`${entry.type}-${entry.createdAt}-${index}`} className={styles.stack}>
                <span className={styles.primary}>
                  {entry.fromStatus ? `${entry.fromStatus} -> ${entry.toStatus}` : entry.toStatus ?? entry.type}
                </span>
                <span className={styles.secondary}>
                  {formatDate(entry.createdAt)}
                  {entry.actorDisplayName ? ` -- ${entry.actorDisplayName}` : ""}
                  {entry.message ? ` -- ${entry.message}` : ""}
                </span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
