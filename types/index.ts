import { OrderStatusKey, PaymentMode } from '../constants/statuses';
import { MeasurementUnit } from '../constants/garments';

// ── Customer ──────────────────────────────────────────────
export interface Customer {
  id: number;
  name: string;
  phone: string;
  address: string | null;
  notes: string | null;
  occasion: string | null;
  is_active: number; // 1 or 0
  created_at: string;
  updated_at: string;
}

export interface CustomerWithStats extends Customer {
  active_orders: number;
  total_spent: number;
}

// ── Measurement ───────────────────────────────────────────
export interface Measurement {
  id: number;
  customer_id: number;
  label: string; // garment type name
  data: string; // JSON string of { field: value }
  unit: MeasurementUnit;
  notes: string | null;
  recorded_at: string;
}

export interface MeasurementData {
  [field: string]: number | string;
}

export interface MeasurementTemplate {
  id: number;
  garment_type: string;
  fields: string; // JSON array of field names
  is_active: number;
}

// ── Employee ──────────────────────────────────────────────
export interface EmployeeRate {
  employee_id: number;
  garment_type: string;
  rate: number;
}

export interface Employee {
  id: number;
  name: string;
  phone: string | null;
  specialization: string | null;
  is_active: number;
  per_piece_rate: number;
}

export interface EmployeeWithWorkload extends Employee {
  active_orders: number;
  monthly_earnings: number;
}

// ── Order ─────────────────────────────────────────────────
export interface Order {
  id: number;
  order_number: string;
  customer_id: number;
  employee_id: number | null;
  design_serial_number: string | null;
  fabric_details: string | null;
  embroidery_details: string | null;
  garment_type: string;
  status: OrderStatusKey;
  order_date: string;
  promised_date: string;
  trial_date: string | null;
  alteration_notes: string | null;
  total_amount: number;
  employee_share: number;
  embroidery_employee_id: number | null;
  embroidery_share: number;
  notes: string | null;
  delivered_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrderWithDetails extends Order {
  customer_name: string;
  customer_phone: string;
  employee_name: string | null;
  embroidery_employee_name: string | null;
  total_paid: number;
  balance: number;
}

// ── Order Item ────────────────────────────────────────────
export interface OrderItem {
  id: number;
  order_id: number;
  garment_type: string;
  quantity: number;
  unit_price: number;
  employee_id: number | null;
  employee_share: number;
  embroidery_employee_id: number | null;
  embroidery_share: number;
  notes: string | null;
  sort_order: number;
  // Joined fields
  employee_name?: string | null;
  embroidery_employee_name?: string | null;
}

export interface OrderItemInput {
  garment_type: string;
  quantity: number;
  unit_price?: number;
  employee_id?: number | null;
  employee_share?: number;
  embroidery_employee_id?: number | null;
  embroidery_share?: number;
  notes?: string;
}

// ── Payment ───────────────────────────────────────────────
export interface Payment {
  id: number;
  order_id: number;
  amount: number;
  mode: PaymentMode;
  paid_at: string;
  notes: string | null;
}

// ── Settings ──────────────────────────────────────────────
export type SettingKey =
  | 'shop_name'
  | 'shop_phone'
  | 'shop_address'
  | 'order_number_prefix'
  | 'order_number_counter'
  | 'default_unit'
  | 'notification_enabled'
  | 'notification_time';
