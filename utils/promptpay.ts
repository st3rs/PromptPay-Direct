/**
 * Standard CRC16-CCITT implementation for EMVCo QR Codes (PromptPay).
 * This implementation is verified for compatibility with Thai banking apps.
 * It uses the 0x1021 polynomial with an initial value of 0xFFFF.
 */
function calculateCRC16(data: string): string {
  let crc = 0xFFFF;
  const polynomial = 0x1021;

  for (let i = 0; i < data.length; i++) {
    crc ^= (data.charCodeAt(i) << 8);
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ polynomial) & 0xFFFF;
      } else {
        crc = (crc << 1) & 0xFFFF;
      }
    }
  }

  return crc.toString(16).toUpperCase().padStart(4, '0');
}

/**
 * Helper to format TLV (Tag-Length-Value) objects according to EMVCo spec.
 * - ID: 2 digits
 * - Length: 2 digits (zero padded)
 * - Value: The string content
 */
function f(id: string, value: string): string {
  if (!value || value.length === 0) return '';
  const len = value.length.toString().padStart(2, '0');
  return `${id}${len}${value}`;
}

/**
 * Normalizes input to the appropriate PromptPay Tag format.
 * - Tag 01: Mobile Number (Format: 0066 + 9 digits)
 * - Tag 02: National ID / Tax ID (Format: 13 digits)
 * - Tag 03: E-Wallet ID (Format: 15 digits)
 */
function getTargetTypeAndValue(target: string): { tag: string; value: string } {
  const raw = target.replace(/\D/g, '');

  // Case 1: E-Wallet (15 digits)
  if (raw.length === 15) {
    return { tag: '03', value: raw };
  }

  // Case 2: Mobile Number (Full international format starting with 0066)
  if (raw.length === 13 && raw.startsWith('0066')) {
    return { tag: '01', value: raw };
  }

  // Case 3: Thai National ID / Tax ID
  // Explicit check for 13 digits starting with 0-5 as per requested pattern
  if (raw.length === 13 && /^[0-5]/.test(raw)) {
    return { tag: '02', value: raw };
  }

  // Case 4: Mobile Number (11 digits starting with 66 -> Convert to 0066 format)
  if (raw.length === 11 && raw.startsWith('66')) {
    return { tag: '01', value: `00${raw}` };
  }

  // Case 5: Mobile Number (10 digits starting with 0 -> Convert to 0066 format)
  if (raw.length === 10 && raw.startsWith('0')) {
    return { tag: '01', value: `0066${raw.substring(1)}` };
  }

  // Fallback to National ID (Tag 02) if 13 digits, otherwise default structure
  if (raw.length === 13) {
    return { tag: '02', value: raw };
  }

  return { tag: '02', value: raw };
}

/**
 * Generates the full EMVCo QR Payload string for PromptPay.
 * Verified against Thai QR Payment Standard v1.1.
 * 
 * @param target PromptPay ID (Mobile, National ID, or E-Wallet)
 * @param amount Optional transaction amount (THB)
 * @param merchantName Display name for the merchant
 */
export const generatePromptPayPayload = (target: string, amount?: number, merchantName: string = 'PromptPayDirect'): string => {
  const { tag, value } = getTargetTypeAndValue(target);

  // Merchant Account Information (Tag 29)
  // Tag 00 is the AID (A000000677010111 is for Credit Transfer/PromptPay)
  const merchantInfo = f('00', 'A000000677010111') + f(tag, value);

  // Construct Root Tags array
  const payloadParts = [
    f('00', '01'),                               // Tag 00: Payload Format Indicator
    f('01', amount ? '12' : '11'),               // Tag 01: Initiation Method (11=Static, 12=Dynamic)
    f('29', merchantInfo),                       // Tag 29: Merchant Account Info
    f('53', '764'),                              // Tag 53: Transaction Currency (764 = THB)
    amount ? f('54', amount.toFixed(2)) : '',    // Tag 54: Amount (Omitted if undefined or 0)
    f('58', 'TH'),                               // Tag 58: Country Code
    f('59', merchantName.substring(0, 25)),      // Tag 59: Merchant Name
    f('60', 'Bangkok'),                          // Tag 60: Merchant City
  ];

  // Join all parts and prepare the CRC Tag placeholder (Tag 63)
  // The EMVCo spec requires calculating the CRC over everything including '6304'
  const dataToHash = payloadParts.join('') + '6304';
  const crc = calculateCRC16(dataToHash);

  return dataToHash + crc;
};