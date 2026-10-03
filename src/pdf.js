const fs = require('fs');
const path = require('path');
const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');
const { SLIP } = require('./layout');

const slipPath = path.join(__dirname, '..', 'assets', 'slip.jpg');

function pdfSafe(text) {
  return String(text ?? '')
    .replace(/[^\x20-\x7E]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function formatDate(iso) {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || ''));
  if (!match) return pdfSafe(iso);
  return `${match[3]}/${match[2]}/${match[1]}`;
}

function formatAmount(amount) {
  const value = Number(amount);
  const hasPaise = Math.round(value * 100) % 100 !== 0;
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: hasPaise ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(value);
}

function splitAddress(address) {
  const lines = String(address || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  while (lines.length < 3) lines.push('');
  return lines.slice(0, 3);
}

function drawField(page, font, text, field) {
  const value = pdfSafe(text);
  if (!value) return;
  let size = field.size;
  const maxWidth = field.maxX - field.x;
  while (size > 8 && font.widthOfTextAtSize(value, size) > maxWidth) size -= 0.5;
  const baselineFromTop = field.top + size * 0.82;
  page.drawText(value, {
    x: field.x,
    y: SLIP.height - baselineFromTop,
    size,
    font,
    color: rgb(0.08, 0.08, 0.08),
  });
}

async function buildReceiptPdf(receipt) {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([SLIP.width, SLIP.height]);
  const background = await pdf.embedJpg(fs.readFileSync(slipPath));
  page.drawImage(background, { x: 0, y: 0, width: SLIP.width, height: SLIP.height });
  const font = await pdf.embedFont(StandardFonts.HelveticaBold);
  const fields = SLIP.fields;

  drawField(page, font, formatDate(receipt.receipt_date), fields.date);
  drawField(page, font, String(receipt.serial_no), fields.serialNo);
  drawField(page, font, receipt.full_name, fields.fullName);
  splitAddress(receipt.address).forEach((line, index) => {
    drawField(page, font, line, fields.address[index]);
  });
  drawField(page, font, receipt.mobile, fields.mobile);
  drawField(page, font, formatAmount(receipt.amount), fields.amount);
  drawField(page, font, receipt.amount_in_words, fields.amountInWords);
  drawField(page, font, receipt.payment_ref, fields.paymentRef);

  if (receipt.signature_file && fs.existsSync(receipt.signature_file)) {
    try {
      const signature = await pdf.embedPng(fs.readFileSync(receipt.signature_file));
      const box = fields.signature;
      const maxW = box.maxX - box.x;
      const maxH = box.height;
      const scale = Math.min(maxW / signature.width, maxH / signature.height);
      const width = signature.width * scale;
      const height = signature.height * scale;
      page.drawImage(signature, {
        x: box.x,
        y: SLIP.height - (box.top + height),
        width,
        height,
      });
    } catch (error) {
      console.error('Could not place signature on the slip', error);
    }
  }

  return Buffer.from(await pdf.save());
}

module.exports = { buildReceiptPdf, formatAmount, formatDate };
