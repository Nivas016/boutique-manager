import { Colors } from './colors';

export type OrderStatusKey =
  | 'received'
  | 'cutting'
  | 'stitching'
  | 'embroidery'
  | 'trial'
  | 'alterations'
  | 'ready'
  | 'delivered'
  | 'cancelled';

export interface StatusConfig {
  key: OrderStatusKey;
  label: string;
  color: string;
  bgColor: string;
  step: number;
}

export const ORDER_STATUSES: Record<OrderStatusKey, StatusConfig> = {
  received:    { key: 'received',    label: 'Received',    color: '#6366F1', bgColor: '#EEF2FF', step: 0 },
  cutting:     { key: 'cutting',     label: 'Cutting',     color: Colors.info,    bgColor: Colors.infoLight,    step: 1 },
  stitching:   { key: 'stitching',   label: 'Stitching',   color: Colors.warning, bgColor: Colors.warningLight, step: 2 },
  embroidery:  { key: 'embroidery',  label: 'Embroidery',  color: '#A855F7', bgColor: '#F3E8FF', step: 3 },
  trial:       { key: 'trial',       label: 'Trial',       color: '#EC4899', bgColor: '#FCE7F3', step: 4 },
  alterations: { key: 'alterations', label: 'Alterations', color: '#F97316', bgColor: '#FFF7ED', step: 5 },
  ready:       { key: 'ready',       label: 'Ready',       color: Colors.success, bgColor: Colors.successLight, step: 6 },
  delivered:   { key: 'delivered',   label: 'Delivered',    color: Colors.success, bgColor: Colors.successLight, step: 7 },
  cancelled:   { key: 'cancelled',   label: 'Cancelled',   color: Colors.danger,  bgColor: Colors.dangerLight,  step: -1 },
};

export const STATUS_FLOW: OrderStatusKey[] = [
  'received', 'cutting', 'stitching', 'embroidery', 'alterations', 'ready', 'delivered',
];

export const SKIPPABLE_STATUSES: OrderStatusKey[] = ['embroidery', 'alterations'];

export const PAYMENT_MODES = ['Cash', 'UPI', 'Card', 'Bank Transfer'] as const;
export type PaymentMode = (typeof PAYMENT_MODES)[number];
