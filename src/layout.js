// Positions are pixels on the 1600×959 blank slip.
// `top` is the top of the glyphs, matching a 18px draw on the scanned form.
const SLIP = {
  width: 1600,
  height: 959,
  fields: {
    date: { x: 1010, top: 30, size: 24, maxX: 1288 },
    serialNo: { x: 1408, top: 30, size: 24, maxX: 1565 },
    fullName: { x: 190, top: 178, size: 28, maxX: 910 },
    address: [
      { x: 230, top: 268, size: 28, maxX: 910 },
      { x: 52, top: 358, size: 28, maxX: 910 },
      { x: 52, top: 448, size: 28, maxX: 910 },
    ],
    mobile: { x: 185, top: 537, size: 28, maxX: 910 },
    amount: { x: 230, top: 608, size: 28, maxX: 840 },
    amountInWords: { x: 320, top: 700, size: 24, maxX: 910 },
    paymentRef: { x: 500, top: 780, size: 24, maxX: 920 },
    signature: { x: 1110, top: 768, size: 16, maxX: 1540, height: 34 },
  },
};

module.exports = { SLIP };
