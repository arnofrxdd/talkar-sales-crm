import fs from 'fs';
import path from 'path';
import PDFDocument from 'pdfkit';

const publicDir = path.join(process.cwd(), 'public', 'brochures');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

interface BrochureConfig {
  filename: string;
  code: string;
  title: string;
  category: string;
  priceText: string;
  sqft: string;
  possession: string;
  facing: string;
  description: string;
  amenities: string[];
  paymentPlan: string[];
}

const brochures: BrochureConfig[] = [
  {
    filename: 'prestige-2bhk-lakeview.pdf',
    code: 'PRESTIGE-2BHK',
    title: '2BHK Premium Lakeview Apartment',
    category: 'Lakeview Residential Suites',
    priceText: 'INR 95,00,000 (All Inclusive)',
    sqft: '1,280 sq.ft (Super Built-up)',
    possession: 'Ready to Move',
    facing: 'North-East Facing (Vastu Compliant)',
    description:
      'Experience serene lakefront living in Bangalore. This luxury 2BHK apartment features imported Italian marble flooring, double-glazed soundproof acoustic windows, automated smart mood lighting, and an expansive private sundeck with panoramic views of the water body.',
    amenities: [
      '50,000 sq.ft Signature Clubhouse Access',
      'Infinity Rooftop Swimming Pool',
      'High-speed Otis Elevators with Bio-metric access',
      '24/7 Multi-tier Gated Security & Video Doorbell',
      'Dedicated Covered Basement Parking Slot',
      'Electric Vehicle (EV) Rapid Charging Station',
    ],
    paymentPlan: [
      'Booking Advance: 10% on registration',
      'Agreement of Sale: 15% within 30 days',
      'Bank Loan Disbursement: 75% on handover',
      'Approved by SBI, HDFC, ICICI, and Axis Bank',
    ],
  },
  {
    filename: 'prestige-3bhk-garden-villa.pdf',
    code: 'PRESTIGE-3BHK-LUX',
    title: '3BHK Luxury Garden Villa with Private Terrace',
    category: 'Signature Gated Villa Community',
    priceText: 'INR 1,85,00,000 (Excl. Stamp Duty)',
    sqft: '2,450 sq.ft (Duplex Ground + 1 Floor)',
    possession: 'March 2027',
    facing: 'East Facing Main Entrance',
    description:
      'An architectural masterpiece crafted for refined family living. This duplex villa offers a double-height living room (18-foot ceiling), an en-suite German modular kitchen with built-in Bosch appliances, a private manicured garden, and a sprawling private open terrace for stargazing.',
    amenities: [
      'Private 400 sq.ft Landscaped Garden',
      'Double-height Living Lounge & Skylight',
      'Master Bedroom with Walk-in Closet & Jacuzzi',
      'Solar Heated Water Supply & Rainwater Harvesting',
      '2 Covered SUV Parking Bays with Automated Gate',
      'Dedicated Maid Quarter & Utility Area with Separate Entry',
    ],
    paymentPlan: [
      'Initial Token Booking: INR 5,00,000',
      'Milestone-based Construction Linked Plan (CLP)',
      'Subvention / Zero Pre-EMI Options Available',
      'Pre-approved Home Loans with Lowest ROI Rates',
    ],
  },
  {
    filename: 'prestige-4bhk-sky-penthouse.pdf',
    code: 'PRESTIGE-4BHK-PENT',
    title: '4BHK Sky Penthouse with Heated Plunge Pool',
    category: 'Ultra-Luxury High-Rise Penthouse Collection',
    priceText: 'INR 3,40,00,000',
    sqft: '4,100 sq.ft (Level 32 Duplex)',
    possession: 'December 2026',
    facing: '360° Panoramic Skyline Views',
    description:
      'Perched on the 32nd floor, this sky mansion represents the pinnacle of luxury real estate in South India. Features direct private elevator keycard access into your private foyer, a temperature-controlled private rooftop plunge pool, floor-to-ceiling soundproof glass facades, and a bespoke cigar & wine lounge.',
    amenities: [
      'Private Heated Plunge Pool & Sun Deck on 33rd Floor',
      'Direct Private High-Speed Elevator to Penthouse Foyer',
      'Central VRV/VRF Air Conditioning with HEPA Air Purification',
      'Smart Home Automation with Voice & iPad Control',
      '3 Dedicated Basement Parking Bays with Fast EV Chargers',
      '24/7 Concierge & Valet Service for Residents',
    ],
    paymentPlan: [
      'Exclusive VIP Allotment against 10% EOI',
      'Customized Milestone Payment Schedule',
      'Complimentary Interior Architecture Consultation',
      'Dedicated Prestige Private Wealth Relationship Manager',
    ],
  },
];

for (const b of brochures) {
  const filePath = path.join(publicDir, b.filename);
  const doc = new PDFDocument({ margin: 40, size: 'A4' });
  const writeStream = fs.createWriteStream(filePath);
  doc.pipe(writeStream);

  // Header Bar
  doc.rect(0, 0, doc.page.width, 90).fill('#1E293B');
  doc.fillColor('#FFFFFF').fontSize(20).font('Helvetica-Bold').text('PRESTIGE GROUP', 40, 25);
  doc.fontSize(10).font('Helvetica').fillColor('#94A3B8').text('Luxury Real Estate & Villa Communities • Bengaluru & Mumbai', 40, 52);

  // Title Box
  doc.moveDown(3);
  doc.fillColor('#0F172A').fontSize(18).font('Helvetica-Bold').text(b.title, 40, 115);
  doc.fillColor('#4F46E5').fontSize(11).font('Helvetica-Bold').text(`${b.category} • Reference Code: ${b.code}`, 40, 140);

  // Key Specifications Grid
  doc.rect(40, 165, doc.page.width - 80, 85).fill('#F8FAFC').stroke('#E2E8F0');
  
  doc.fillColor('#64748B').fontSize(9).font('Helvetica-Bold').text('OFFERING PRICE', 55, 178);
  doc.fillColor('#059669').fontSize(13).font('Helvetica-Bold').text(b.priceText, 55, 192);

  doc.fillColor('#64748B').fontSize(9).font('Helvetica-Bold').text('SUPER BUILT-UP AREA', 240, 178);
  doc.fillColor('#0F172A').fontSize(12).font('Helvetica').text(b.sqft, 240, 192);

  doc.fillColor('#64748B').fontSize(9).font('Helvetica-Bold').text('POSSESSION STATUS', 410, 178);
  doc.fillColor('#0F172A').fontSize(12).font('Helvetica').text(b.possession, 410, 192);

  doc.fillColor('#64748B').fontSize(9).font('Helvetica-Bold').text('ORIENTATION & VASTU', 55, 218);
  doc.fillColor('#0F172A').fontSize(10).font('Helvetica').text(b.facing, 55, 230);

  // Description
  doc.fillColor('#0F172A').fontSize(12).font('Helvetica-Bold').text('Executive Overview', 40, 270);
  doc.fillColor('#334155').fontSize(10).font('Helvetica').text(b.description, 40, 290, {
    width: doc.page.width - 80,
    lineGap: 4,
  });

  // Key Amenities & Highlights
  doc.fillColor('#0F172A').fontSize(12).font('Helvetica-Bold').text('Prime Amenities & Specifications', 40, 370);
  let currentY = 392;
  b.amenities.forEach((amenity) => {
    doc.fillColor('#4F46E5').fontSize(10).text('✔', 45, currentY);
    doc.fillColor('#334155').fontSize(10).font('Helvetica').text(amenity, 65, currentY);
    currentY += 18;
  });

  // Payment Schedule & Approvals
  currentY += 12;
  doc.fillColor('#0F172A').fontSize(12).font('Helvetica-Bold').text('Payment Structure & Banking Approvals', 40, currentY);
  currentY += 22;
  b.paymentPlan.forEach((plan) => {
    doc.fillColor('#059669').fontSize(10).text('•', 45, currentY);
    doc.fillColor('#334155').fontSize(10).font('Helvetica').text(plan, 65, currentY);
    currentY += 18;
  });

  // Footer & Booking Call to Action
  const footerY = doc.page.height - 75;
  doc.rect(40, footerY, doc.page.width - 80, 45).fill('#EEF2FF').stroke('#C7D2FE');
  doc.fillColor('#3730A3').fontSize(9).font('Helvetica-Bold').text('SCHEDULE A PRIVATE SITE VISIT OR CAB PICKUP:', 55, footerY + 12);
  doc.fillColor('#4B5563').fontSize(9).font('Helvetica').text('Call Talkar Voice Concierge or WhatsApp our Sales Desk directly.', 55, footerY + 26);

  doc.end();
  console.log(`✅ Generated PDF: ${filePath}`);
}
