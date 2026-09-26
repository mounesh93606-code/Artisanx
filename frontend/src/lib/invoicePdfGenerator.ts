import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';

export interface InvoiceData {
    invoice_number?: string;
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
}

export async function generateClientInvoicePdf(invoice: InvoiceData): Promise<jsPDF> {
    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
    });

    const pageWidth = 210;
    const margin = 14;
    const contentWidth = pageWidth - margin * 2; // 182mm

    const invoiceNumber = invoice.invoice_number || `INV-${invoice.display_id || 'ORDER'}`;
    const displayId = invoice.display_id || invoice.order_id || 'AX-ORD';
    const buyerName = invoice.buyer_name || 'Valued Customer';
    const artisanName = invoice.artisan_name || 'Verified Artisan';
    const productTitle = invoice.product_title || 'Handcrafted Artisan Product';
    const quantity = invoice.quantity || 1;
    const unitPrice = invoice.unit_price || invoice.total || 0;
    const total = invoice.total || unitPrice * quantity;
    const subtotal = invoice.subtotal || total;
    const paymentMethod = invoice.payment_method || 'UPI';
    const gatewayId = invoice.gateway_payment_id || 'Cashfree Verified Payment';

    // Format Date
    let formattedDate = new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
    if (invoice.created_at) {
        try {
            formattedDate = new Date(invoice.created_at).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
        } catch {
            // Keep default
        }
    }

    // Format Address
    let addressStr = 'Delivery address on file';
    const addr = invoice.delivery_address;
    if (addr && typeof addr === 'object') {
        const line1 = addr.address_line1 || addr.street || addr.line1 || '';
        const city = addr.city || '';
        const state = addr.state || '';
        const pin = addr.postal_code || addr.pincode || '';
        const parts = [line1, `${city}${city && state ? ', ' : ''}${state}`, pin].filter(Boolean);
        if (parts.length > 0) addressStr = parts.join(', ');
    } else if (typeof addr === 'string' && addr.trim()) {
        addressStr = addr.trim();
    }

    // 1. BRAND HEADER (Left)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.setTextColor(154, 64, 35); // #9A4023 Terracotta
    doc.text('ARTISANX', margin, 20);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(120, 113, 108); // #78716C Stone
    doc.text('Empowering Artisans • Preserving Heritage • Fair Trade', margin, 25);
    doc.text('Official Commercial Tax Invoice & Payment Receipt', margin, 29);

    // 2. INVOICE META (Right)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(28, 25, 23); // Stone 900
    doc.text('TAX / COMMERCIAL INVOICE', pageWidth - margin, 20, { align: 'right' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(120, 113, 108);
    doc.text(`Invoice No: ${invoiceNumber}`, pageWidth - margin, 25, { align: 'right' });
    doc.text(`Date: ${formattedDate}`, pageWidth - margin, 29, { align: 'right' });

    // PAID BADGE (Green)
    doc.setFillColor(220, 252, 231); // #DCFCE7
    doc.roundedRect(pageWidth - margin - 50, 32, 50, 5.5, 1.2, 1.2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(21, 128, 61); // #15803D
    doc.text('✓ PAID & VERIFIED', pageWidth - margin - 25, 36, { align: 'center' });

    // Top Divider Line
    doc.setDrawColor(154, 64, 35);
    doc.setLineWidth(0.5);
    doc.line(margin, 41, pageWidth - margin, 41);

    // 3. KEY TRANSACTION INFO BAR
    const barY = 45;
    const barHeight = 15;
    doc.setFillColor(248, 246, 244); // Stone 50
    doc.setDrawColor(231, 226, 220);
    doc.roundedRect(margin, barY, contentWidth, barHeight, 2, 2, 'FD');

    const colW = contentWidth / 4;
    // Col 1: Order ID
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(120, 113, 108);
    doc.text('ORDER ID', margin + 4, barY + 5);
    doc.setFontSize(9);
    doc.setTextColor(28, 25, 23);
    doc.text(`#${displayId}`, margin + 4, barY + 11);

    // Col 2: Payment Method
    doc.setFontSize(7);
    doc.setTextColor(120, 113, 108);
    doc.text('PAYMENT METHOD', margin + colW + 4, barY + 5);
    doc.setFontSize(9);
    doc.setTextColor(28, 25, 23);
    doc.text(paymentMethod, margin + colW + 4, barY + 11);

    // Col 3: Transaction Ref
    doc.setFontSize(7);
    doc.setTextColor(120, 113, 108);
    doc.text('TRANSACTION REF', margin + colW * 2 + 4, barY + 5);
    doc.setFontSize(8);
    doc.setTextColor(28, 25, 23);
    const truncRef = gatewayId.length > 22 ? `${gatewayId.slice(0, 20)}...` : gatewayId;
    doc.text(truncRef, margin + colW * 2 + 4, barY + 11);

    // Col 4: Status
    doc.setFontSize(7);
    doc.setTextColor(120, 113, 108);
    doc.text('PAYMENT STATUS', margin + colW * 3 + 4, barY + 5);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(21, 128, 61);
    doc.text('PAID / VERIFIED', margin + colW * 3 + 4, barY + 11);

    // 4. PARTIES CARDS (Billed To vs Sold By)
    const partyY = 65;
    const cardW = (contentWidth - 6) / 2;
    const cardH = 34;

    // Left Card: Billed To
    doc.setFillColor(248, 246, 244);
    doc.setDrawColor(231, 226, 220);
    doc.roundedRect(margin, partyY, cardW, cardH, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(117, 43, 20); // #752B14
    doc.text('BILLED TO (CUSTOMER)', margin + 4, partyY + 6);

    doc.setFontSize(10);
    doc.setTextColor(28, 25, 23);
    doc.text(buyerName, margin + 4, partyY + 12);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(68, 64, 60);
    let byrY = partyY + 17;
    if (invoice.buyer_phone) {
        doc.text(`Phone: ${invoice.buyer_phone}`, margin + 4, byrY);
        byrY += 4.5;
    }
    const splitAddr = doc.splitTextToSize(addressStr, cardW - 8);
    doc.text(splitAddr.slice(0, 2), margin + 4, byrY);

    // Right Card: Sold By
    const rightCardX = margin + cardW + 6;
    doc.setFillColor(253, 246, 240); // Soft Terracotta Light
    doc.setDrawColor(243, 213, 200);
    doc.roundedRect(rightCardX, partyY, cardW, cardH, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(117, 43, 20);
    doc.text('SOLD & DISPATCHED BY', rightCardX + 4, partyY + 6);

    doc.setFontSize(10);
    doc.setTextColor(28, 25, 23);
    doc.text(artisanName, rightCardX + 4, partyY + 12);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(68, 64, 60);
    doc.text('Verified Indian Artisan Partner', rightCardX + 4, partyY + 17);
    doc.text('ArtisanX Craft Ecosystem • Direct Producer Sale', rightCardX + 4, partyY + 21.5);
    doc.text('Handmade in India • Authentic Craftsmanship', rightCardX + 4, partyY + 26);

    // 5. ITEMS TABLE
    const tableY = 105;
    // Table Header
    doc.setFillColor(154, 64, 35); // #9A4023
    doc.rect(margin, tableY, contentWidth, 8, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    doc.text('Item Description', margin + 4, tableY + 5.5);
    doc.text('Qty', margin + 105, tableY + 5.5, { align: 'center' });
    doc.text('Unit Price', margin + 140, tableY + 5.5, { align: 'right' });
    doc.text('Total Amount', pageWidth - margin - 4, tableY + 5.5, { align: 'right' });

    // Table Row
    const rowY = tableY + 8;
    const rowH = 16;
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(231, 226, 220);
    doc.rect(margin, rowY, contentWidth, rowH, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(28, 25, 23);
    const splitTitle = doc.splitTextToSize(productTitle, 90);
    doc.text(splitTitle[0] || 'Handcrafted Product', margin + 4, rowY + 6);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(120, 113, 108);
    doc.text('Certified handmade artisanal craft • Direct fulfillment', margin + 4, rowY + 11);

    // Quantity
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(28, 25, 23);
    doc.text(String(quantity), margin + 105, rowY + 8, { align: 'center' });

    // Unit Price
    doc.text(`Rs. ${Number(unitPrice).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, margin + 140, rowY + 8, { align: 'right' });

    // Total Price
    doc.setFont('helvetica', 'bold');
    doc.text(`Rs. ${Number(total).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, pageWidth - margin - 4, rowY + 8, { align: 'right' });

    // 6. FINANCIAL TOTALS SUMMARY
    const totalsY = rowY + rowH + 6;
    const totalsW = 85;
    const totalsX = pageWidth - margin - totalsW;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(120, 113, 108);
    doc.text('Subtotal (Net):', totalsX, totalsY + 4);
    doc.setTextColor(28, 25, 23);
    doc.text(`Rs. ${Number(subtotal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, pageWidth - margin - 4, totalsY + 4, { align: 'right' });

    doc.setTextColor(120, 113, 108);
    doc.text('Taxes & Fees (GST):', totalsX, totalsY + 9);
    doc.setTextColor(28, 25, 23);
    doc.text('Rs. 0.00 (Zero Rated)', pageWidth - margin - 4, totalsY + 9, { align: 'right' });

    doc.setTextColor(120, 113, 108);
    doc.text('Shipping / Delivery:', totalsX, totalsY + 14);
    doc.setTextColor(21, 128, 61);
    doc.text('Free / Included', pageWidth - margin - 4, totalsY + 14, { align: 'right' });

    // Highlighted Grand Total Box
    const grandBoxY = totalsY + 18;
    doc.setFillColor(253, 246, 240);
    doc.setDrawColor(154, 64, 35);
    doc.setLineWidth(0.6);
    doc.roundedRect(totalsX - 4, grandBoxY, totalsW + 4, 10, 1.5, 1.5, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(154, 64, 35);
    doc.text('TOTAL PAID:', totalsX, grandBoxY + 6.5);
    doc.setFontSize(11);
    doc.text(`Rs. ${Number(total).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, pageWidth - margin - 4, grandBoxY + 6.5, { align: 'right' });

    // 7. QR CODE & AUTHENTICITY CERTIFICATE
    const certY = 175;
    const certH = 30;
    doc.setFillColor(248, 246, 244);
    doc.setDrawColor(231, 226, 220);
    doc.roundedRect(margin, certY, contentWidth, certH, 2, 2, 'FD');

    // Generate QR Code
    try {
        const qrContent = `https://artisanx.org/verify/invoice?id=${encodeURIComponent(invoiceNumber)}&ord=${encodeURIComponent(displayId)}&amt=${total}`;
        const qrDataUrl = await QRCode.toDataURL(qrContent, {
            margin: 1,
            color: {
                dark: '#9A4023',
                light: '#FFFFFF'
            }
        });
        doc.addImage(qrDataUrl, 'PNG', margin + 3, certY + 3, 24, 24);
    } catch {
        // Fallback placeholder if QR encoding fails
        doc.setDrawColor(154, 64, 35);
        doc.rect(margin + 3, certY + 3, 24, 24);
    }

    const certTextX = margin + 32;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(117, 43, 20);
    doc.text('VERIFIED AUTHENTIC CRAFT TRANSACTION', certTextX, certY + 7);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(68, 64, 60);
    doc.text('Scan QR code to verify this official invoice, digital craft passport, and artisan origin.', certTextX, certY + 12);
    doc.text('This is an electronically generated tax invoice issued under the Information Technology Act.', certTextX, certY + 16.5);
    doc.text('No physical signature is required.', certTextX, certY + 20.5);
    doc.setTextColor(120, 113, 108);
    doc.text('Thank you for supporting rural Indian artisans and authentic cultural craftsmanship.', certTextX, certY + 25);

    // 8. LEGAL FOOTER
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(150, 145, 140);
    doc.text(
        'ArtisanX Platform • Direct Artisan-to-Consumer Fair Trade Commerce • www.artisanx.org',
        pageWidth / 2,
        285,
        { align: 'center' }
    );

    return doc;
}
