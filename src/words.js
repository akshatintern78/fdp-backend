const ones = [
  '',
  'One',
  'Two',
  'Three',
  'Four',
  'Five',
  'Six',
  'Seven',
  'Eight',
  'Nine',
  'Ten',
  'Eleven',
  'Twelve',
  'Thirteen',
  'Fourteen',
  'Fifteen',
  'Sixteen',
  'Seventeen',
  'Eighteen',
  'Nineteen',
];

const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function twoDigits(n) {
  if (n < 20) return ones[n];
  const ten = tens[Math.floor(n / 10)];
  const one = ones[n % 10];
  return one ? `${ten} ${one}` : ten;
}

function threeDigits(n) {
  const hundred = Math.floor(n / 100);
  const rest = n % 100;
  const head = hundred ? `${ones[hundred]} Hundred` : '';
  if (!rest) return head;
  return head ? `${head} ${twoDigits(rest)}` : twoDigits(rest);
}

function indianIntegerWords(n) {
  if (n === 0) return 'Zero';
  const groups = [
    { div: 10000000, name: 'Crore' },
    { div: 100000, name: 'Lakh' },
    { div: 1000, name: 'Thousand' },
  ];
  let remaining = n;
  const parts = [];
  for (const group of groups) {
    const count = Math.floor(remaining / group.div);
    remaining %= group.div;
    if (count) parts.push(`${threeDigits(count)} ${group.name}`);
  }
  if (remaining) parts.push(threeDigits(remaining));
  return parts.join(' ');
}

function amountInWords(amount) {
  const totalPaise = Math.round(Number(amount) * 100);
  if (!Number.isFinite(totalPaise) || totalPaise < 0) return '';
  const rupees = Math.floor(totalPaise / 100);
  const paise = totalPaise % 100;
  let words = `Rupees ${rupees === 0 ? 'Zero' : indianIntegerWords(rupees)}`;
  if (paise > 0) words += ` and ${indianIntegerWords(paise)} Paise`;
  return `${words} Only`;
}

module.exports = { amountInWords };
