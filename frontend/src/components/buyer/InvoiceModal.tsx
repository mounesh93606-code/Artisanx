import { useState } from 'react';
import { X, Printer, ShieldCheck, FileDown, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { downloadOrderInvoice } from '../../lib/invoiceDownload';

interface InvoiceModalProps {
    isOpen: boolean;
    onClose: () => void;
    invoice: {
        invoice_number: string;
        order_id?: string;
        display_id?: string;
        buyer_name?: string;
        buyer_phone?: string;
        buyer_email?: string;
        artisan_name?: string;
        product_title?: string;
        quantity?: number;
        unit_price?: number;
        subtotal?: number;
        tax?: number;
        total?: number;
        currency?: string;
        payment_method?: string;
        payment_status?: string;
        gateway_payment_id?: string;
        created_at?: string;
        delivery_address?: any;
    } | null;
}

export default function InvoiceModal({ isOpen, onClose, invoice }: InvoiceModalProps) {
    const { t } = useTranslation();
    const [isDownloading, setIsDownloading] = useState(false);

    if (!isOpen || !invoice) return null;

    const handlePrint = () => {
        window.print();
    };

    const handleDownloadPdf = async () => {
        const orderRef = invoice.order_id || invoice.display_id || invoice.invoice_number;
        if (!orderRef) return;
        setIsDownloading(true);
        try {
            await downloadOrderInvoice(invoice, invoice.display_id || invoice.invoice_number);
        } catch (err: any) {
            console.error('Failed to download invoice PDF:', err);
            alert(err?.message || 'Failed to download PDF. Please try again.');
        } finally {
            setIsDownloading(false);
        }
    };

    const formattedDate = invoice.created_at
        ? new Date(invoice.created_at).toLocaleDateString(undefined, {
              year: 'numeric',
              month: 'short',
              day: 'numeric'
          })
        : new Date().toLocaleDateString();

    const address = invoice.delivery_address || {};

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
            <div className="bg-surface rounded-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto border border-outline-variant shadow-2xl flex flex-col">
                {/* Modal Header */}
                <div className="p-4 sm:p-5 border-b border-stone-100 flex items-center justify-between sticky top-0 bg-surface z-10">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-black text-sm">
                            AX
                        </div>
                        <div>
                            <h3 className="font-bold text-stone-800 text-base">{t('payment.invoice')}</h3>
                            <p className="text-xs text-stone-500 font-mono">{invoice.invoice_number}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleDownloadPdf}
                            disabled={isDownloading}
                            className="p-2 rounded-xl bg-primary text-on-primary hover:bg-primary/90 transition-colors flex items-center gap-1.5 text-xs font-bold shadow-sm disabled:opacity-50"
                            title={t('payment.download_pdf', 'Download PDF')}
                        >
                            {isDownloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
                            <span className="hidden sm:inline">{isDownloading ? t('payment.downloading', 'Saving...') : 'PDF'}</span>
                        </button>
                        <button
                            onClick={handlePrint}
                            className="p-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 transition-colors flex items-center gap-1.5 text-xs font-bold"
                            title={t('payment.print')}
                        >
                            <Printer className="w-4 h-4" />
                            <span className="hidden sm:inline">{t('payment.print')}</span>
                        </button>
                        <button
                            onClick={onClose}
                            className="p-2 rounded-full hover:bg-stone-100 text-stone-400 hover:text-stone-700 transition-colors"
                            aria-label="Close"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Printable Invoice Container */}
                <div className="p-6 space-y-6 text-stone-800 printable-area">
                    {/* Brand Banner */}
                    <div className="flex justify-between items-start pb-4 border-b border-stone-100">
                        <div>
                            <h2 className="text-2xl font-black text-primary tracking-tight">ARTISANX</h2>
                            <p className="text-xs text-stone-500 mt-0.5">Empowering Artisans, Connecting Markets</p>
                        </div>
                        <div className="text-right">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-green-100 text-green-800 border border-green-200">
                                <ShieldCheck className="w-3.5 h-3.5 text-green-700" /> {t('payment.paid')}
                            </span>
                            <p className="text-xs text-stone-500 mt-1.5">{t('payment.date')}: <span className="font-bold text-stone-700">{formattedDate}</span></p>
                        </div>
                    </div>

                    {/* Order & Ref Details */}
                    <div className="grid grid-cols-2 gap-4 text-xs bg-stone-50 p-4 rounded-2xl border border-stone-100">
                        <div>
                            <span className="text-stone-400 font-semibold uppercase tracking-wider block">{t('payment.order_id')}</span>
                            <span className="font-mono font-bold text-stone-800 text-sm mt-0.5 block">{invoice.display_id || invoice.order_id}</span>
                        </div>
                        <div>
                            <span className="text-stone-400 font-semibold uppercase tracking-wider block">{t('payment.payment_method')}</span>
                            <span className="font-bold text-stone-800 text-sm mt-0.5 block">{invoice.payment_method || 'UPI'}</span>
                        </div>
                        {invoice.gateway_payment_id && (
                            <div className="col-span-2 pt-2 border-t border-stone-200/50">
                                <span className="text-stone-400 font-semibold uppercase tracking-wider block">{t('payment.transaction_ref')}</span>
                                <span className="font-mono text-stone-600 text-[11px] break-all">{invoice.gateway_payment_id}</span>
                            </div>
                        )}
                    </div>

                    {/* Parties (Buyer & Artisan) */}
                    <div className="grid grid-cols-2 gap-4 text-xs">
                        <div className="space-y-1">
                            <span className="font-bold text-stone-400 uppercase tracking-wider block">{t('payment.billed_to')}</span>
                            <p className="font-bold text-stone-800 text-sm">{invoice.buyer_name || 'Buyer'}</p>
                            {invoice.buyer_phone && <p className="text-stone-600">{invoice.buyer_phone}</p>}
                            {address.address_line1 && (
                                <p className="text-stone-500 leading-tight">
                                    {address.address_line1}, {address.city || ''} {address.postal_code ? `- ${address.postal_code}` : ''}
                                </p>
                            )}
                        </div>
                        <div className="space-y-1 text-right">
                            <span className="font-bold text-stone-400 uppercase tracking-wider block">{t('payment.artisan')}</span>
                            <p className="font-bold text-stone-800 text-sm">{invoice.artisan_name || 'Artisan'}</p>
                            <p className="text-stone-500">Verified ArtisanX Partner</p>
                        </div>
                    </div>

                    {/* Items Table */}
                    <div className="border border-stone-200 rounded-2xl overflow-hidden">
                        <table className="w-full text-left text-xs">
                            <thead className="bg-stone-100 text-stone-600 font-bold border-b border-stone-200 uppercase">
                                <tr>
                                    <th className="py-2.5 px-3">{t('payment.item')}</th>
                                    <th className="py-2.5 px-2 text-center">{t('payment.qty')}</th>
                                    <th className="py-2.5 px-3 text-right">{t('payment.price')}</th>
                                    <th className="py-2.5 px-3 text-right">{t('payment.total')}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-stone-100">
                                <tr>
                                    <td className="py-3 px-3 font-semibold text-stone-800 max-w-[150px] truncate">
                                        {invoice.product_title || 'Handcrafted Product'}
                                    </td>
                                    <td className="py-3 px-2 text-center font-bold text-stone-700">
                                        {invoice.quantity || 1}
                                    </td>
                                    <td className="py-3 px-3 text-right font-medium text-stone-700">
                                        ₹{(invoice.unit_price || 0).toLocaleString()}
                                    </td>
                                    <td className="py-3 px-3 text-right font-bold text-stone-900">
                                        ₹{(invoice.total || (invoice.unit_price || 0) * (invoice.quantity || 1)).toLocaleString()}
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    {/* Totals Summary */}
                    <div className="space-y-2 border-t border-stone-100 pt-4 text-xs">
                        <div className="flex justify-between text-stone-600">
                            <span>{t('payment.subtotal')}</span>
                            <span className="font-semibold text-stone-800">₹{(invoice.subtotal || invoice.total || 0).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-stone-600">
                            <span>Tax / Fees</span>
                            <span className="font-semibold text-green-700">₹0 (Zero Rated)</span>
                        </div>
                        <div className="flex justify-between items-center text-sm font-black pt-3 border-t border-stone-200 text-stone-900">
                            <span>{t('payment.total')} {t('payment.amount_paid')}</span>
                            <span className="text-xl text-primary font-black">₹{(invoice.total || 0).toLocaleString()}</span>
                        </div>
                    </div>

                    {/* Footer Declaration */}
                    <div className="pt-4 border-t border-stone-100 text-center text-[10px] text-stone-400 space-y-1">
                        <p>This is a computer-generated invoice and requires no physical signature.</p>
                        <p>Thank you for supporting traditional Indian artisans and authentic craftsmanship.</p>
                    </div>
                </div>

                {/* Modal Actions */}
                <div className="p-4 border-t border-stone-100 bg-stone-50 rounded-b-3xl flex flex-wrap sm:flex-nowrap gap-2.5">
                    <button
                        onClick={handleDownloadPdf}
                        disabled={isDownloading}
                        className="flex-1 py-3 px-4 bg-primary text-on-primary rounded-full font-bold text-sm shadow-md hover:bg-primary/90 flex items-center justify-center gap-2 transition-transform active:scale-95 disabled:opacity-50"
                    >
                        {isDownloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
                        <span>{isDownloading ? t('payment.downloading', 'Downloading PDF...') : t('payment.download_pdf', 'Download PDF Invoice')}</span>
                    </button>
                    <button
                        onClick={handlePrint}
                        className="py-3 px-4 bg-white border border-stone-200 hover:bg-stone-100 text-stone-700 rounded-full font-bold text-sm flex items-center justify-center gap-1.5 transition-colors"
                        title={t('payment.print')}
                    >
                        <Printer className="w-4 h-4" />
                        <span className="hidden sm:inline">{t('payment.print')}</span>
                    </button>
                    <button
                        onClick={onClose}
                        className="px-5 py-3 border border-stone-200 bg-white text-stone-700 rounded-full font-bold text-sm hover:bg-stone-100 transition-colors"
                    >
                        {t('payment.close')}
                    </button>
                </div>
            </div>
        </div>
    );
}
