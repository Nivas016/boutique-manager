import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { useTheme } from '../../contexts/ThemeContext';
import AppAlert from '../../components/AppAlert';
import { useAlert } from '../../hooks/useAlert';
import { OrderItem, OrderWithDetails } from '../../types';
import { getOrderById, updateOrderStatus, updateOrder } from '../../db/orders';
import { getOrderItems } from '../../db/order_items';
import { getPaymentsByOrder } from '../../db/payments';
import { formatDate, formatDateShort, isOverdue } from '../../utils/dates';
import { formatCurrency } from '../../utils/currency';
import StatusStepper from '../../components/StatusStepper';
import { STATUS_FLOW, ORDER_STATUSES, OrderStatusKey } from '../../constants/statuses';

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  useTheme();
  const { showAlert, alertProps } = useAlert();
  const [order, setOrder] = useState<OrderWithDetails | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [payments, setPayments] = useState<any[]>([]);

  const load = useCallback(async () => {
    const o = await getOrderById(Number(id));
    setOrder(o);
    if (o) {
      const [p, oi] = await Promise.all([getPaymentsByOrder(o.id), getOrderItems(o.id)]);
      setPayments(p);
      setOrderItems(oi);
    }
  }, [id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (!order) return null;

  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
  const balance = order.total_amount - totalPaid;

  const currentStepIndex = STATUS_FLOW.indexOf(order.status);
  let nextStatus: OrderStatusKey | null = null;
  if (currentStepIndex >= 0 && currentStepIndex < STATUS_FLOW.length - 1) {
    nextStatus = STATUS_FLOW[currentStepIndex + 1];
  } else if (currentStepIndex === -1 && order.status !== 'cancelled' && order.status !== 'delivered') {
    // Status exists in ORDER_STATUSES but was removed from the flow (e.g. legacy 'trial')
    const currentStep = ORDER_STATUSES[order.status]?.step ?? -1;
    nextStatus = STATUS_FLOW.find((s) => ORDER_STATUSES[s].step > currentStep) ?? null;
  }

  const handleAdvance = () => {
    if (!nextStatus) return;
    showAlert('Update Status', `Move to "${ORDER_STATUSES[nextStatus].label}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Confirm', onPress: async () => {
        await updateOrderStatus(order.id, nextStatus);
        load();
      }},
    ]);
  };

  const handleCancel = () => {
    showAlert('Cancel Order', 'Are you sure you want to cancel this order?', [
      { text: 'No', style: 'cancel' },
      { text: 'Yes, Cancel', style: 'destructive', onPress: async () => {
        await updateOrder(order.id, { status: 'cancelled' });
        load();
      }},
    ]);
  };

  return (
    <>
    <ScrollView style={[styles.container, { backgroundColor: Colors.background }]} showsVerticalScrollIndicator={false}>
      {/* Status */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Status</Text>
        <StatusStepper currentStatus={order.status} />
        {nextStatus && (
          <TouchableOpacity style={styles.advanceBtn} onPress={handleAdvance}>
            <Ionicons name="arrow-forward" size={16} color={Colors.primary} />
            <Text style={styles.advanceBtnText}>Move to {ORDER_STATUSES[nextStatus].label.toLowerCase()}</Text>
          </TouchableOpacity>
        )}
        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.editBtn} onPress={() => router.push(`/order/edit?orderId=${id}`)}>
            <Ionicons name="create-outline" size={16} color={Colors.text} />
            <Text style={styles.editBtnText}>Edit Details</Text>
          </TouchableOpacity>
          {order.status !== 'cancelled' && order.status !== 'delivered' && (
            <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel}>
              <Ionicons name="close-circle-outline" size={16} color={Colors.danger} />
              <Text style={styles.cancelBtnText}>Cancel Order</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Details */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Details</Text>
        <View style={styles.detailsCard}>
          <View style={styles.detailsGrid}>
            <DetailItem label="Customer" value={order.customer_name} />
            <DetailItem label="Garment" value={order.garment_type} />
            <DetailItem label="Order date" value={formatDate(order.order_date)} />
            <DetailItem label="Promised date" value={formatDate(order.promised_date)} color={isOverdue(order.promised_date) ? Colors.danger : undefined} />
            <DetailItem label="Fabric" value={order.fabric_details || '—'} />
            <DetailItem label="Design no." value={order.design_serial_number || '—'} />
            <DetailItem label="Stitching by" value={order.employee_name || 'Unassigned'} />
            <DetailItem label="Embroidery by" value={order.embroidery_employee_name || '—'} />
            <DetailItem label="Trial date" value={order.trial_date ? formatDate(order.trial_date) : '—'} />
          </View>
          {order.embroidery_details ? (
            <View style={{ marginTop: 4 }}>
              <Text style={styles.detailLabel}>Embroidery</Text>
              <Text style={styles.detailValue}>{order.embroidery_details}</Text>
            </View>
          ) : null}
          {order.alteration_notes ? (
            <View style={{ marginTop: 8 }}>
              <Text style={styles.detailLabel}>Alteration notes</Text>
              <Text style={styles.detailValue}>{order.alteration_notes}</Text>
            </View>
          ) : null}
        </View>
      </View>

      {/* Garment Items */}
      {orderItems.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>
            Garment items{orderItems.length > 1 ? ` (${orderItems.length})` : ''}
          </Text>
          <View style={styles.itemsCard}>
            {orderItems.map((item, index) => (
              <View key={item.id} style={[styles.itemRow, index < orderItems.length - 1 && styles.itemRowBorder]}>
                <View style={styles.itemLeft}>
                  <View style={styles.itemBadge}>
                    <Text style={styles.itemBadgeText}>{index + 1}</Text>
                  </View>
                  <View>
                    <Text style={styles.itemGarment}>{item.garment_type}</Text>
                    {item.quantity > 1 && (
                      <Text style={styles.itemQty}>× {item.quantity}</Text>
                    )}
                  </View>
                </View>
                <View style={styles.itemRight}>
                  {item.employee_name && (
                    <View style={styles.itemAssignRow}>
                      <Ionicons name="cut-outline" size={11} color={Colors.textTertiary} />
                      <Text style={styles.itemAssign}>
                        {item.employee_name}{item.employee_share > 0 ? ` · ₹${item.employee_share}` : ''}
                      </Text>
                    </View>
                  )}
                  {item.embroidery_employee_name && (
                    <View style={styles.itemAssignRow}>
                      <Ionicons name="color-wand-outline" size={11} color={Colors.textTertiary} />
                      <Text style={styles.itemAssign}>
                        {item.embroidery_employee_name}{item.embroidery_share > 0 ? ` · ₹${item.embroidery_share}` : ''}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Payments */}
      <View style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionLabel}>Payments</Text>
          {balance <= 0 ? (
            <View style={[styles.payBadge, { backgroundColor: Colors.successLight }]}>
              <Text style={[styles.payBadgeText, { color: Colors.success }]}>Paid in full</Text>
            </View>
          ) : (
            <View style={[styles.payBadge, { backgroundColor: Colors.dangerLight }]}>
              <Text style={[styles.payBadgeText, { color: Colors.danger }]}>{formatCurrency(balance)} due</Text>
            </View>
          )}
        </View>
        <View style={styles.paymentCard}>
          <View style={styles.paymentSummary}>
            <Text style={styles.paymentSummaryLabel}>Total amount</Text>
            <Text style={styles.paymentSummaryValue}>{formatCurrency(order.total_amount)}</Text>
          </View>
          {payments.length > 0 && <View style={styles.paymentDivider} />}
          {payments.map((p) => (
            <View key={p.id} style={styles.paymentRow}>
              <Text style={styles.paymentDetail}>{formatDateShort(p.paid_at.split(' ')[0])} · {p.notes || p.mode} · {p.mode}</Text>
              <Text style={styles.paymentAmount}>{formatCurrency(p.amount)}</Text>
            </View>
          ))}
          <View style={styles.paymentDivider} />
          <View style={styles.paymentSummary}>
            <Text style={styles.paymentSummaryLabel}>Balance</Text>
            <Text style={[styles.paymentSummaryValue, { color: balance <= 0 ? Colors.success : Colors.danger }]}>
              {formatCurrency(Math.max(0, balance))}
            </Text>
          </View>
        </View>
        <TouchableOpacity style={styles.addPaymentBtn} onPress={() => router.push(`/payment/new?orderId=${id}`)}>
          <Ionicons name="add" size={16} color={Colors.text} />
          <Text style={styles.addPaymentText}>Add payment</Text>
        </TouchableOpacity>
      </View>
      <View style={{ height: 40 }} />
    </ScrollView>
    <AppAlert {...alertProps} />
    </>
  );
}

function DetailItem({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <View style={styles.detailItem}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={[styles.detailValue, color ? { color } : null]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  section: { paddingHorizontal: 16, marginTop: 16 },
  sectionLabel: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  advanceBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 14, paddingVertical: 11, borderRadius: 10, backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.border },
  advanceBtnText: { fontSize: 14, fontWeight: '500', color: Colors.primary },
  detailsCard: { backgroundColor: Colors.white, borderRadius: 12, padding: 14, shadowColor: Colors.shadow, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 1, shadowRadius: 2, elevation: 1 },
  detailsGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  detailItem: { width: '50%', marginBottom: 14 },
  detailLabel: { fontSize: 11, color: Colors.textTertiary },
  detailValue: { fontSize: 14, color: Colors.text, marginTop: 2 },
  payBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12 },
  payBadgeText: { fontSize: 12, fontWeight: '600' },
  paymentCard: { backgroundColor: Colors.white, borderRadius: 12, padding: 14, shadowColor: Colors.shadow, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 1, shadowRadius: 2, elevation: 1 },
  paymentSummary: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2 },
  paymentSummaryLabel: { fontSize: 14, color: Colors.textSecondary },
  paymentSummaryValue: { fontSize: 14, fontWeight: '600', color: Colors.text },
  paymentDivider: { height: 1, backgroundColor: Colors.borderLight, marginVertical: 10 },
  paymentRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  paymentDetail: { fontSize: 13, color: Colors.textSecondary, flex: 1 },
  paymentAmount: { fontSize: 13, color: Colors.textSecondary },
  addPaymentBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 10, paddingVertical: 12, borderRadius: 10, backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.border },
  addPaymentText: { fontSize: 14, fontWeight: '500', color: Colors.text },
  itemsCard: { backgroundColor: Colors.white, borderRadius: 12, overflow: 'hidden', shadowColor: Colors.shadow, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 1, shadowRadius: 2, elevation: 1 },
  itemRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 12 },
  itemRowBorder: { borderBottomWidth: 0.5, borderBottomColor: Colors.borderLight },
  itemLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  itemBadge: { width: 22, height: 22, borderRadius: 11, backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  itemBadgeText: { fontSize: 11, fontWeight: '700', color: Colors.primary },
  itemGarment: { fontSize: 14, fontWeight: '500', color: Colors.text },
  itemQty: { fontSize: 12, color: Colors.textSecondary, marginTop: 1 },
  itemRight: { alignItems: 'flex-end', gap: 2 },
  itemAssignRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  itemAssign: { fontSize: 12, color: Colors.textSecondary },
  actionRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  editBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 11, borderRadius: 10, backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.border },
  editBtnText: { fontSize: 14, fontWeight: '500', color: Colors.text },
  cancelBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 11, borderRadius: 10, backgroundColor: Colors.dangerLight, borderWidth: 1, borderColor: Colors.danger },
  cancelBtnText: { fontSize: 14, fontWeight: '500', color: Colors.danger },
});
