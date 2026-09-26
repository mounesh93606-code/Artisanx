import io
from datetime import datetime
from typing import Optional, Dict, Any

import qrcode
from reportlab.lib.pagesizes import A4
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image, KeepTogether, HRFlowable
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors

# Color Palette
PRIMARY = colors.HexColor('#9A4023')         # Terracotta / Clay
PRIMARY_LIGHT = colors.HexColor('#FDF6F0')   # Soft terracotta tint
PRIMARY_DARK = colors.HexColor('#752B14')
DARK = colors.HexColor('#1C1917')            # Stone 900
BODY = colors.HexColor('#44403C')            # Stone 700
MUTED = colors.HexColor('#78716C')           # Stone 500
LIGHT_BG = colors.HexColor('#F8F6F4')        # Stone 50/100
BORDER_COLOR = colors.HexColor('#E7E2DC')    # Outline
PAID_GREEN = colors.HexColor('#15803D')      # Emerald 700
PAID_BG = colors.HexColor('#DCFCE7')         # Emerald 100
PAID_BORDER = colors.HexColor('#86EFAC')

def generate_invoice_pdf(invoice_data: Dict[str, Any]) -> bytes:
    """
    Generates a professional, print-ready, high-resolution PDF invoice for an ArtisanX order.
    Returns the PDF binary bytes.
    """
    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf,
        pagesize=A4,
        leftMargin=36,
        rightMargin=36,
        topMargin=36,
        bottomMargin=36
    )

    styles = getSampleStyleSheet()

    # Custom typography styles
    title_style = ParagraphStyle(
        'ArtisanTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=24,
        leading=28,
        textColor=PRIMARY
    )

    tagline_style = ParagraphStyle(
        'ArtisanTagline',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=12,
        textColor=MUTED
    )

    badge_style = ParagraphStyle(
        'PaidBadge',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9,
        leading=12,
        alignment=2,
        textColor=PAID_GREEN
    )

    inv_title_style = ParagraphStyle(
        'InvHeading',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=15,
        leading=18,
        alignment=2,
        textColor=DARK
    )

    inv_meta_style = ParagraphStyle(
        'InvMeta',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=12,
        alignment=2,
        textColor=MUTED
    )

    section_heading_style = ParagraphStyle(
        'SectionHeading',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8,
        leading=11,
        textColor=PRIMARY_DARK
    )

    bold_name_style = ParagraphStyle(
        'BoldName',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=10.5,
        leading=14,
        textColor=DARK
    )

    body_style = ParagraphStyle(
        'BodyTextCustom',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=12,
        textColor=BODY
    )

    table_header_style = ParagraphStyle(
        'TableHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8.5,
        leading=11,
        textColor=colors.white
    )

    table_cell_style = ParagraphStyle(
        'TableCell',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=12,
        textColor=DARK
    )

    table_cell_bold_style = ParagraphStyle(
        'TableCellBold',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8.5,
        leading=12,
        textColor=DARK
    )

    summary_label_style = ParagraphStyle(
        'SummaryLabel',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=12,
        alignment=2,
        textColor=MUTED
    )

    summary_val_style = ParagraphStyle(
        'SummaryVal',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8.5,
        leading=12,
        alignment=2,
        textColor=DARK
    )

    total_label_style = ParagraphStyle(
        'TotalLabel',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=11,
        leading=14,
        alignment=2,
        textColor=PRIMARY
    )

    total_val_style = ParagraphStyle(
        'TotalVal',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=13,
        leading=16,
        alignment=2,
        textColor=PRIMARY
    )

    footer_style = ParagraphStyle(
        'FooterLegal',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=7.5,
        leading=10,
        alignment=1,
        textColor=MUTED
    )

    # Format date
    created_at_raw = invoice_data.get('created_at')
    try:
        if created_at_raw:
            if isinstance(created_at_raw, str):
                dt = datetime.fromisoformat(created_at_raw.replace('Z', '+00:00'))
            else:
                dt = created_at_raw
            formatted_date = dt.strftime('%B %d, %Y')
        else:
            formatted_date = datetime.utcnow().strftime('%B %d, %Y')
    except Exception:
        formatted_date = datetime.utcnow().strftime('%B %d, %Y')

    invoice_number = invoice_data.get('invoice_number') or f"INV-{invoice_data.get('display_id', 'ORDER')}"
    display_id = invoice_data.get('display_id') or invoice_data.get('order_id', 'AX-ORD')
    payment_method = invoice_data.get('payment_method') or 'UPI / NetBanking'
    gateway_id = invoice_data.get('gateway_payment_id') or '-'
    buyer_name = invoice_data.get('buyer_name') or 'Valued Customer'
    buyer_phone = invoice_data.get('buyer_phone') or ''
    buyer_email = invoice_data.get('buyer_email') or ''
    artisan_name = invoice_data.get('artisan_name') or 'Verified Artisan'

    # Delivery address formatting
    addr = invoice_data.get('delivery_address') or {}
    addr_lines = []
    if isinstance(addr, dict):
        line1 = addr.get('address_line1') or addr.get('street') or addr.get('line1')
        city = addr.get('city') or ''
        state = addr.get('state') or ''
        postal = addr.get('postal_code') or addr.get('pincode') or ''
        if line1:
            addr_lines.append(line1)
        city_state = f"{city}{', ' if city and state else ''}{state} {postal}".strip()
        if city_state:
            addr_lines.append(city_state)
    elif isinstance(addr, str) and addr.strip():
        addr_lines.append(addr.strip())

    if not addr_lines:
        addr_lines.append("Delivery address on file")

    # Amounts
    quantity = int(invoice_data.get('quantity') or 1)
    unit_price = float(invoice_data.get('unit_price') or invoice_data.get('total') or 0)
    subtotal = float(invoice_data.get('subtotal') or (unit_price * quantity))
    tax = float(invoice_data.get('tax') or 0)
    total = float(invoice_data.get('total') or subtotal)
    product_title = invoice_data.get('product_title') or 'Handcrafted Artisan Product'

    story = []

    # 1. Header Table
    header_left = [
        Paragraph('<b>ARTISANX</b>', title_style),
        Paragraph('Empowering Artisans &bull; Preserving Heritage &bull; Fair Trade', tagline_style),
        Paragraph('artisanx.org &bull; support@artisanx.org', tagline_style),
    ]

    header_right = [
        Paragraph('<b>TAX / COMMERCIAL INVOICE</b>', inv_title_style),
        Spacer(1, 2),
        Paragraph(f'<b>Invoice No:</b> {invoice_number}', inv_meta_style),
        Paragraph(f'<b>Date:</b> {formatted_date}', inv_meta_style),
        Spacer(1, 3),
        Paragraph('<font color="#15803D"><b>[ &#x2713; PAYMENT RECEIVED &bull; PAID ]</b></font>', badge_style),
    ]

    header_table = Table([[header_left, header_right]], colWidths=[290, 233])
    header_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
        ('TOPPADDING', (0, 0), (-1, -1), 0),
        ('LEFTPADDING', (0, 0), (-1, -1), 0),
        ('RIGHTPADDING', (0, 0), (-1, -1), 0),
    ]))
    story.append(header_table)
    story.append(Spacer(1, 10))

    # Divider Bar
    story.append(HRFlowable(width="100%", thickness=2, color=PRIMARY, spaceBefore=0, spaceAfter=12))

    # 2. Key Transaction Info Box
    summary_box_data = [
        [
            Paragraph('<b>ORDER ID</b>', section_heading_style),
            Paragraph('<b>PAYMENT METHOD</b>', section_heading_style),
            Paragraph('<b>TRANSACTION REF</b>', section_heading_style),
            Paragraph('<b>PAYMENT STATUS</b>', section_heading_style),
        ],
        [
            Paragraph(f'<b>#{display_id}</b>', body_style),
            Paragraph(payment_method, body_style),
            Paragraph(gateway_id if gateway_id != '-' else 'Verified Cashfree UPI', body_style),
            Paragraph('<font color="#15803D"><b>PAID / VERIFIED</b></font>', body_style),
        ]
    ]
    summary_box = Table(summary_box_data, colWidths=[130, 130, 163, 100])
    summary_box.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), LIGHT_BG),
        ('BOX', (0, 0), (-1, -1), 0.75, BORDER_COLOR),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]))
    story.append(summary_box)
    story.append(Spacer(1, 14))

    # 3. Parties Table (Billed To vs Sold By)
    billed_to_content = [
        Paragraph('<b>BILLED TO (BUYER)</b>', section_heading_style),
        Spacer(1, 3),
        Paragraph(buyer_name, bold_name_style),
    ]
    if buyer_phone:
        billed_to_content.append(Paragraph(f'Phone: {buyer_phone}', body_style))
    if buyer_email:
        billed_to_content.append(Paragraph(f'Email: {buyer_email}', body_style))
    for l in addr_lines:
        billed_to_content.append(Paragraph(l, body_style))

    sold_by_content = [
        Paragraph('<b>SOLD &amp; DISPATCHED BY</b>', section_heading_style),
        Spacer(1, 3),
        Paragraph(artisan_name, bold_name_style),
        Paragraph('Verified Indian Artisan Partner', body_style),
        Paragraph('ArtisanX Craft Ecosystem &bull; Direct Producer Sale', body_style),
        Paragraph('Handmade in India &bull; Authentic Craftsmanship', body_style),
    ]

    parties_table = Table([[billed_to_content, sold_by_content]], colWidths=[261, 262])
    parties_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('BACKGROUND', (0, 0), (0, 0), LIGHT_BG),
        ('BACKGROUND', (1, 0), (1, 0), PRIMARY_LIGHT),
        ('BOX', (0, 0), (0, 0), 0.5, BORDER_COLOR),
        ('BOX', (1, 0), (1, 0), 0.5, colors.HexColor('#F3D5C8')),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('LEFTPADDING', (0, 0), (-1, -1), 10),
        ('RIGHTPADDING', (0, 0), (-1, -1), 10),
    ]))
    story.append(parties_table)
    story.append(Spacer(1, 14))

    # 4. Items Table
    items_header = [
        Paragraph('<b>Item Description</b>', table_header_style),
        Paragraph('<b>Qty</b>', table_header_style),
        Paragraph('<b>Unit Price (INR)</b>', table_header_style),
        Paragraph('<b>Total (INR)</b>', table_header_style),
    ]

    item_desc_cell = [
        Paragraph(f'<b>{product_title}</b>', table_cell_bold_style),
        Paragraph('<font color="#78716C">Certified handmade artisanal product &bull; Direct artisan fulfillment</font>', tagline_style)
    ]

    items_row = [
        item_desc_cell,
        Paragraph(str(quantity), table_cell_style),
        Paragraph(f'Rs. {unit_price:,.2f}', table_cell_style),
        Paragraph(f'Rs. {total:,.2f}', table_cell_bold_style),
    ]

    items_table = Table([items_header, items_row], colWidths=[260, 45, 108, 110])
    items_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), PRIMARY),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, 0), 7),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 7),
        ('ALIGN', (1, 0), (1, -1), 'CENTER'),
        ('ALIGN', (2, 0), (3, -1), 'RIGHT'),
        ('BACKGROUND', (0, 1), (-1, 1), colors.white),
        ('TOPPADDING', (0, 1), (-1, 1), 10),
        ('BOTTOMPADDING', (0, 1), (-1, 1), 10),
        ('BOX', (0, 0), (-1, -1), 0.75, BORDER_COLOR),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
    ]))
    story.append(items_table)
    story.append(Spacer(1, 8))

    # 5. Financial Summary (Subtotal, GST, Total)
    summary_rows = [
        [
            Paragraph('Subtotal (Net):', summary_label_style),
            Paragraph(f'Rs. {subtotal:,.2f}', summary_val_style)
        ],
        [
            Paragraph('Taxes &amp; Fees (GST):', summary_label_style),
            Paragraph('Rs. 0.00 (Zero Rated)', summary_val_style)
        ],
        [
            Paragraph('Shipping / Delivery:', summary_label_style),
            Paragraph('Free / Included', summary_val_style)
        ],
        [
            Paragraph('<b>TOTAL PAID:</b>', total_label_style),
            Paragraph(f'<b>Rs. {total:,.2f}</b>', total_val_style)
        ],
    ]

    summary_table = Table(summary_rows, colWidths=[150, 120])
    summary_table.setStyle(TableStyle([
        ('ALIGN', (0, 0), (-1, -1), 'RIGHT'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ('BACKGROUND', (0, 3), (-1, 3), PRIMARY_LIGHT),
        ('BOX', (0, 3), (-1, 3), 1, PRIMARY),
        ('TOPPADDING', (0, 3), (-1, 3), 6),
        ('BOTTOMPADDING', (0, 3), (-1, 3), 6),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
    ]))

    # Place summary on the right side
    alignment_table = Table([[Spacer(1, 1), summary_table]], colWidths=[253, 270])
    alignment_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING', (0, 0), (-1, -1), 0),
        ('RIGHTPADDING', (0, 0), (-1, -1), 0),
    ]))
    story.append(alignment_table)
    story.append(Spacer(1, 14))

    # 6. Authenticity QR Code & Legal Footer Card
    # Generate verification QR Code
    qr_data = f"https://artisanx.org/verify/invoice?id={invoice_number}&ord={display_id}&amt={total}"
    qr = qrcode.QRCode(box_size=3, border=1)
    qr.add_data(qr_data)
    qr.make(fit=True)
    qr_img_buffer = io.BytesIO()
    qr.make_image(fill_color="#9A4023", back_color="white").save(qr_img_buffer, format='PNG')
    qr_img_buffer.seek(0)
    qr_img = Image(qr_img_buffer, width=65, height=65)

    footer_cert_text = [
        Paragraph('<b>VERIFIED AUTHENTIC CRAFT TRANSACTION</b>', section_heading_style),
        Spacer(1, 2),
        Paragraph('Scan QR code to verify this official invoice, digital craft passport, and artisan origin.', body_style),
        Paragraph('This is a computer-generated tax invoice issued in accordance with the Information Technology Act. No physical signature is required.', tagline_style),
        Paragraph('Thank you for supporting rural artisans and authentic Indian heritage craftsmanship.', tagline_style),
    ]

    cert_table = Table([[qr_img, footer_cert_text]], colWidths=[75, 448])
    cert_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), LIGHT_BG),
        ('BOX', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
    ]))
    story.append(cert_table)
    story.append(Spacer(1, 12))

    # Final footer line
    story.append(Paragraph('ArtisanX Platform &bull; Direct Artisan-to-Consumer Fair Commerce &bull; www.artisanx.org', footer_style))

    doc.build(story)
    return buf.getvalue()
