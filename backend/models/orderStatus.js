// Single definition of a PAID order, for every business/revenue total.
//   processing          = Razorpay checkout opened, not paid
//   failed / cancelled  = payment failed or abandoned
//   pending             = paid, awaiting shipment
//   shipped / delivered = paid and fulfilled
// SQL list for use inside IN (...), e.g. `status IN (${PAID_ORDER_STATUSES})`.
const PAID_ORDER_STATUSES = "'pending', 'shipped', 'delivered'";

module.exports = { PAID_ORDER_STATUSES };
