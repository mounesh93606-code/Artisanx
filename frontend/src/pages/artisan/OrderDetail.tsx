import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

import { ArrowLeft, Package, Settings, Truck, Navigation, XCircle, CheckCircle, AlertTriangle, MessageCircle, ShieldAlert, FileText } from 'lucide-react';
import { useOrderStore } from '../../stores/orderStore';
import api from '../../lib/api';
import InvoiceModal from '../../components/buyer/InvoiceModal';

export default function OrderDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentOrder, history, loading, fetchOrder, updateOrderStatus, cancelOrder, decideCancellation } = useOrderStore();
  const [updating, setUpdating] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('Material unavailable');
  const [cancelNotes, setCancelNotes] = useState('');
  const [messaging, setMessaging] = useState(false);
  const [showDisputeModal, setShowDisputeModal] = useState(false);
  const [disputeReason, setDisputeReason] = useState('quality_issue');
  const [disputeExplanation, setDisputeExplanation] = useState('');
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [invoiceData, setInvoiceData] = useState<any>(null);

  const handleViewInvoice = async () => {
    try {
      const res = await api.get(`/payments/invoice/${id}`);
      setInvoiceData(res.data);
    } catch (e) {
      const snapshot = currentOrder?.product_snapshot || {};
      const invMeta = snapshot.invoice?.invoice_data;
      if (invMeta) {
        setInvoiceData(invMeta);
      } else {
        setInvoiceData({
          invoice_number: `INV-${currentOrder?.display_id || id}`,
          order_id: currentOrder?.id,
          display_id: currentOrder?.display_id,
          product_title: snapshot.title,
          quantity: currentOrder?.quantity,
          unit_price: currentOrder?.unit_price,
          total: currentOrder?.total_order_value,
          buyer_name: currentOrder?.buyer?.display_name || 'Buyer',
          artisan_name: 'Artisan',
          payment_method: 'UPI',
          payment_status: 'PAID',
          created_at: currentOrder?.created_at,
          delivery_address: snapshot.delivery_address
        });
      }
    }
    setShowInvoiceModal(true);
  };

  const handleMessageBuyer = async () => {
    if (!currentOrder) return;
    setMessaging(true);
    try {
      const url = currentOrder.enquiry_id 
        ? `/conversations/by-enquiry/${currentOrder.enquiry_id}`
        : `/conversations/by-order/${currentOrder.id}`;
      const res = await api.get(url);
      navigate(`/artisan/conversation/${res.data.conversation.id}`);
    } catch (e) {
      console.error(e);
      alert('Could not start conversation');
    } finally {
      setMessaging(false);
    }
  };

  useEffect(() => {
    if (id) fetchOrder(id);
  }, [id, fetchOrder]);

  const handleUpdateStatus = async (status: string) => {
    if (!id) return;
    setUpdating(true);
    try {
      await updateOrderStatus(id, status);
    } catch (err) {
      console.error(err);
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-surface-container-lowest"><div className="animate-pulse w-8 h-8 rounded-full bg-stone-300"></div></div>;
  }

  if (!currentOrder) {
    return <div className="min-h-screen flex items-center justify-center bg-surface-container-lowest text-on-surface">Order not found</div>;
  }

  const handleCancelOrder = async () => {
    if (!id) return;
    setUpdating(true);
    try {
      await cancelOrder(id, cancelReason, cancelNotes);
      setShowCancelModal(false);
    } catch (err) {
      console.error(err);
    } finally {
      setUpdating(false);
    }
  };

  const handleDecideCancellation = async (approved: boolean) => {
    if (!id) return;
    setUpdating(true);
    try {
      await decideCancellation(id, approved);
    } catch (err) {
      console.error(err);
    } finally {
      setUpdating(false);
    }
  };

  const handleRaiseDispute = async () => {
    if (!id || !currentOrder) return;
    setUpdating(true);
    try {
      await api.post('/disputes/', {
        order_id: id,
        product_id: currentOrder.product_snapshot.product_id,
        reason: disputeReason,
        explanation: disputeExplanation
      });
      setShowDisputeModal(false);
      alert('Dispute raised successfully.');
    } catch (err) {
      console.error(err);
      alert('Failed to raise dispute.');
    } finally {
      setUpdating(false);
    }
  };

  const o = currentOrder;
  const isCancelled = o.status === 'cancelled' || o.status === 'cancellation_requested';
  
  // Artisan can advance state forward: confirmed -> in_production -> ready_for_dispatch -> dispatched
  const getNextActions = () => {
    if (o.status === 'confirmed') return [{ label: 'Start Production', status: 'in_production', icon: Settings, color: 'bg-purple-600' }];
    if (o.status === 'in_production') return [{ label: 'Mark Ready for Dispatch', status: 'ready_for_dispatch', icon: Package, color: 'bg-orange-600' }];
    if (o.status === 'ready_for_dispatch') return [{ label: 'Mark Dispatched', status: 'dispatched', icon: Truck, color: 'bg-indigo-600' }];
    return [];
  };
  
  const actions = getNextActions();
  const canCancel = !isCancelled && !['dispatched', 'delivered', 'completed', 'return_requested', 'returned', 'disputed'].includes(o.status);

  return (
    <div className="min-h-screen bg-surface-container-lowest pb-24 text-on-surface">
      <div className="bg-surface px-4 pt-12 pb-4 sticky top-0 z-10 border-b border-outline-variant/30">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/artisan/orders')} className="text-stone-600 hover:text-stone-900">
              <ArrowLeft className="w-6 h-6" />
            </button>
            <h1 className="text-2xl font-bold text-stone-800">{o.display_id}</h1>
          </div>
          {canCancel && (
            <button onClick={() => setShowCancelModal(true)} className="text-error text-sm font-bold flex items-center gap-1 hover:underline">
              <XCircle className="w-4 h-4" /> Cancel
            </button>
          )}
        </div>
      </div>

      <div className="p-4 space-y-6 max-w-lg mx-auto">
        {/* Product Snapshot Info */}
        <div className="bg-surface rounded-2xl p-4 shadow-sm border border-outline-variant flex gap-4">
          <div className="w-24 h-24 rounded-xl bg-stone-200 overflow-hidden shrink-0 border border-stone-200">
            {o.product_snapshot?.image_url ? (
              <img src={o.product_snapshot.image_url} alt="Product" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-stone-400 text-[10px]"><Package className="w-6 h-6"/></div>
            )}
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-stone-800 text-lg leading-tight mb-1">{o.product_snapshot?.title || 'Product'}</h3>
            <p className="text-xs text-stone-500 mb-2">{o.product_snapshot?.category}</p>
            {o.product_snapshot?.variant && (
              <div className="text-[11px] font-bold text-primary bg-primary-container px-2 py-1 rounded w-max mt-1">
                {o.product_snapshot.variant.type.toUpperCase()}: {o.product_snapshot.variant.value}
              </div>
            )}
            <div className="flex justify-between items-end mt-4">
              <div>
                <p className="text-[10px] font-bold text-stone-500 uppercase">Quantity</p>
                <p className="font-black text-stone-800">{o.quantity}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold text-stone-500 uppercase">Unit Price</p>
                <p className="font-bold text-stone-800">₹{o.unit_price.toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Buyer Info */}
        <div className="bg-surface rounded-2xl p-4 shadow-sm border border-outline-variant flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center">
              <span className="material-symbols-outlined text-on-surface-variant text-xl">person</span>
            </div>
            <div>
              <p className="font-bold text-on-surface">{currentOrder.buyer?.display_name}</p>
              <p className="text-xs text-on-surface-variant">Buyer</p>
            </div>
          </div>
          <button 
            onClick={handleMessageBuyer}
            disabled={messaging}
            className="w-10 h-10 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center disabled:opacity-50"
          >
            <MessageCircle className="w-5 h-5" />
          </button>
        </div>

        {/* Financials */}
        <div className="bg-primary-container text-on-primary-container rounded-2xl p-5 border border-primary/20">
          <h3 className="font-bold mb-3 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-xl">payments</span> Order Value
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>₹{(o.quantity * o.unit_price).toLocaleString()}</span>
            </div>
            {o.customization_details && (
              <div className="flex justify-between">
                <span>Customization</span>
                <span>Included</span>
              </div>
            )}
            <div className="flex justify-between font-black text-xl pt-3 border-t border-primary/20 mt-3">
              <span>Total Value</span>
              <span>₹{o.total_order_value.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-primary/20 text-xs">
              <span className="font-semibold">Payment Status</span>
              <span className="px-2 py-0.5 rounded font-black bg-green-100 text-green-800 uppercase">
                UPI — PAID
              </span>
            </div>
          </div>
          <button
            onClick={handleViewInvoice}
            className="w-full mt-3 py-2.5 bg-surface text-stone-800 rounded-xl font-bold text-xs flex items-center justify-center gap-2 border border-outline-variant hover:bg-stone-50 transition-colors shadow-sm"
          >
            <FileText className="w-4 h-4 text-primary" /> View Order Invoice
          </button>
        </div>

        {/* Timeline from History */}
        <div className="bg-surface rounded-2xl p-5 shadow-sm border border-outline-variant">
          <h3 className="font-bold text-stone-800 mb-4 flex items-center gap-2">
            <Navigation className="w-5 h-5 text-primary" /> Order Timeline
          </h3>
          
          <div className="relative pl-6 border-l-2 border-stone-100 space-y-6">
            {history.map((evt: any, i: number) => {
              const isLast = i === history.length - 1;
              return (
                <div key={evt.id} className="relative">
                  <div className={`absolute -left-[33px] top-1 w-4 h-4 rounded-full border-4 border-white ${isLast ? 'bg-primary animate-pulse' : 'bg-stone-300'}`}></div>
                  <div className="text-sm font-bold text-stone-800 uppercase tracking-wide">{evt.to_status.replace(/_/g, ' ')}</div>
                  <div className="text-xs text-stone-500 mt-1">{new Date(evt.created_at).toLocaleString()}</div>
                  {evt.note && <div className="mt-1 text-xs text-stone-600 bg-stone-50 p-2 rounded-lg italic">"{evt.note}"</div>}
                </div>
              );
            })}
          </div>
        </div>

        {/* Actions */}
        {actions.length > 0 && !isCancelled && (
          <div className="grid gap-3 pt-2">
            {actions.map((act, i) => (
              <button 
                key={i}
                onClick={() => handleUpdateStatus(act.status)}
                disabled={updating}
                className={`w-full py-4 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-transform active:scale-[0.98] disabled:opacity-50 ${act.color}`}
              >
                {updating ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : (
                  <><act.icon className="w-5 h-5" /> {act.label}</>
                )}
              </button>
            ))}
          </div>
        )}

        {/* Raise Dispute Button */}
        {!isCancelled && (
          <button 
            onClick={() => setShowDisputeModal(true)}
            className="w-full py-4 text-stone-700 bg-stone-200 hover:bg-stone-300 font-bold rounded-xl flex items-center justify-center gap-2 transition-colors mt-2"
          >
            <ShieldAlert className="w-5 h-5" /> Raise Dispute
          </button>
        )}

        {/* Cancellation Review Actions */}
        {o.status === 'cancellation_requested' && (
          <div className="bg-error-container text-on-error-container rounded-2xl p-5 border border-error/20 mt-4 space-y-4">
            <h3 className="font-bold flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" /> Buyer Requested Cancellation
            </h3>
            <p className="text-sm">The buyer has requested to cancel this order. You can approve or reject this request. If rejected, the order will return to its previous status.</p>
            <div className="flex gap-3">
              <button onClick={() => handleDecideCancellation(true)} disabled={updating} className="flex-1 bg-error text-white py-3 rounded-xl font-bold active:scale-95 transition-transform flex items-center justify-center gap-2">
                <CheckCircle className="w-4 h-4" /> Approve
              </button>
              <button onClick={() => handleDecideCancellation(false)} disabled={updating} className="flex-1 bg-surface text-on-surface border border-outline-variant py-3 rounded-xl font-bold active:scale-95 transition-transform flex items-center justify-center gap-2">
                <XCircle className="w-4 h-4" /> Reject
              </button>
            </div>
          </div>
        )}

        {/* Cancel Modal */}
        {showCancelModal && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-surface w-full max-w-sm rounded-3xl p-6 shadow-2xl relative">
              <button onClick={() => setShowCancelModal(false)} className="absolute top-4 right-4 text-stone-400 hover:text-stone-600">
                <XCircle className="w-6 h-6" />
              </button>
              <h2 className="text-xl font-bold text-error mb-4">Cancel Order</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-stone-700 mb-1">Reason</label>
                  <select 
                    value={cancelReason} 
                    onChange={e => setCancelReason(e.target.value)}
                    className="w-full bg-surface-container-lowest border border-outline-variant rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="Material unavailable">Material unavailable</option>
                    <option value="Unable to meet quantity">Unable to meet quantity</option>
                    <option value="Production delay">Production delay</option>
                    <option value="Buyer request">Buyer request</option>
                    <option value="Pricing disagreement">Pricing disagreement</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-stone-700 mb-1">Notes (Optional)</label>
                  <textarea 
                    value={cancelNotes}
                    onChange={e => setCancelNotes(e.target.value)}
                    placeholder="Provide additional details..."
                    className="w-full bg-surface-container-lowest border border-outline-variant rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary min-h-[80px]"
                  />
                </div>
                <button 
                  onClick={handleCancelOrder}
                  disabled={updating}
                  className="w-full bg-error text-white py-4 rounded-xl font-bold active:scale-95 transition-transform flex items-center justify-center"
                >
                  {updating ? "Processing..." : "Confirm Cancellation"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Dispute Modal */}
        {showDisputeModal && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-surface w-full max-w-sm rounded-3xl p-6 shadow-2xl relative">
              <button onClick={() => setShowDisputeModal(false)} className="absolute top-4 right-4 text-stone-400 hover:text-stone-600">
                <XCircle className="w-6 h-6" />
              </button>
              <h2 className="text-xl font-bold text-red-600 mb-4 flex items-center gap-2">
                <ShieldAlert className="w-5 h-5" /> Raise Dispute
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-stone-700 mb-1">Reason</label>
                  <select 
                    value={disputeReason} 
                    onChange={e => setDisputeReason(e.target.value)}
                    className="w-full bg-surface-container-lowest border border-outline-variant rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="quality_issue">Quality Issue</option>
                    <option value="item_not_received">Item Not Received</option>
                    <option value="item_not_as_described">Item Not As Described</option>
                    <option value="shipping_damage">Shipping Damage</option>
                    <option value="payment_issue">Payment Issue</option>
                    <option value="communication_issue">Communication Issue</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-stone-700 mb-1">Explanation</label>
                  <textarea 
                    value={disputeExplanation}
                    onChange={e => setDisputeExplanation(e.target.value)}
                    placeholder="Provide details for the facilitator..."
                    className="w-full bg-surface-container-lowest border border-outline-variant rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary min-h-[80px]"
                  />
                </div>
                <button 
                  onClick={handleRaiseDispute}
                  disabled={updating || !disputeExplanation.trim()}
                  className="w-full bg-red-600 text-white py-4 rounded-xl font-bold active:scale-95 transition-transform flex items-center justify-center disabled:opacity-50"
                >
                  {updating ? "Processing..." : "Submit Dispute"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Invoice Modal */}
        <InvoiceModal
          isOpen={showInvoiceModal}
          onClose={() => setShowInvoiceModal(false)}
          invoice={invoiceData}
        />
      </div>
    </div>
  );
}
