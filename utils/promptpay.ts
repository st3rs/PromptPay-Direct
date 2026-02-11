/**
 * Standard CRC16-CCITT implementation for EMVCo QR Codes (PromptPay).
 * 
 * Algorithm Details:
 * - Polynomial: 0x1021 (CCITT)
 * - Initial Value: 0xFFFF
 * - XOR Output: 0x0000
 * - Reflected In/Out: False
 */
function calculateCRC16(data: string): string {
  let crc = 0xFFFF; // Initial value per EMVCo spec

  for (let i = 0; i < data.length; i++) {
    crc ^= (data.charCodeAt(i) << 8); // XOR byte into high byte

    for (let j = 0; j < 8; j++) {
      // Check if the MSB (bit 15) is set before shifting
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021); // Shift and XOR with Polynomial 0x1021
      } else {
        crc = (crc << 1); // Just shift
      }
    }
    
    crc &= 0xFFFF; // Enforce 16-bit constraint after processing each byte
  }

  // Return as 4-digit Uppercase Hex
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

/**
 * Helper to format TLV (Tag-Length-Value) objects according to EMVCo spec.
 * - ID: 2 digits
 * - Length: 2 digits (zero padded)
 * - Value: String data
 */
function f(id: string, value: string): string {
  const len = value.length.toString().padStart(2, '0');
  return `${id}${len}${value}`;
}

/**
 * Analyzes the input ID and returns the correct EMV tag and formatted value.
 * Sanitizes input by removing dashes or spaces.
 * 
 * Logic:
 * - Mobile (Tag 01): Formats local 08x/09x/06x to 0066...
 * - National ID (Tag 02): 13 digits
 * - E-Wallet (Tag 03): 15 digits
 */
function getTargetTypeAndValue(target: string): { tag: string; value: string } {
  // 1. Sanitize: Remove all non-numeric characters
  const raw = target.replace(/\D/g, '');

  // Case 1: Mobile Number (Local Format)
  // Input: 08x, 09x, 06x (10 digits) -> Output: 00668x...
  if (raw.length === 10 && (raw.startsWith('06') || raw.startsWith('08') || raw.startsWith('09'))) {
    return { tag: '01', value: `0066${raw.substring(1)}` };
  }

  // Case 2: Mobile Number (International Format 66...)
  // Input: 668x... (11 digits) -> Output: 00668x...
  if (raw.length === 11 && raw.startsWith('66')) {
    return { tag: '01', value: `00${raw}` };
  }

  // Case 3: Mobile Number (Full EMV Format 0066...)
  // Input: 00668x... (13 digits)
  if (raw.length === 13 && raw.startsWith('0066')) {
    return { tag: '01', value: raw };
  }

  // Case 4: National ID / Tax ID
  // Input: 13 digits (not starting with 0066 check implied by order, but robust to check again if needed)
  if (raw.length === 13) {
    return { tag: '02', value: raw };
  }

  // Case 5: E-Wallet
  // Input: 15 digits
  if (raw.length === 15) {
    return { tag: '03', value: raw };
  }

  // Fallback: Default to National ID/Tax ID (Tag 02) or return raw if unknown format
  // This allows manual overrides or non-standard IDs
  return { tag: '02', value: raw };
}

/**
 * Generates the full EMVCo QR Payload string.
 * @param target The PromptPay ID (Mobile, ID Card, or E-Wallet)
 * @param amount Optional transaction amount (THB)
 */
export const generatePromptPayPayload = (target: string, amount?: number): string => {
  const { tag, value } = getTargetTypeAndValue(target);

  // 1. Build Merchant Account Information (Tag 29)
  //    - Tag 00: AID (A000000677010111 is the PromptPay AID)
  //    - Tag 01/02/03: The target ID value calculated above
  let merchantInfo = f('00', 'A000000677010111');
  merchantInfo += f(tag, value);

  // 2. Build Root Tags
  // Tag 54 (Amount) is optional in standard, but usually required for "Dynamic QR"
  const tags = [
    f('00', '01'),                        // Payload Format Indicator (01)
    f('01', amount ? '12' : '11'),        // Point of Initiation (12 = Dynamic/Amount, 11 = Static)
    f('29', merchantInfo),                // Merchant Account Info (Application ID + Target)
    f('53', '764'),                       // Transaction Currency (764 = THB)
    amount ? f('54', amount.toFixed(2)) : '', // Transaction Amount (2 decimal places)
    f('58', 'TH'),                        // Country Code
  ];

  // 3. Assemble Data & Append CRC Placeholder
  // The CRC calculation includes the CRC Tag ID ('63') and Length ('04') at the end.
  const rawData = tags.join('') + '6304'; 
  
  // 4. Calculate CRC16-CCITT (0x1021) of the rawData string
  const crc = calculateCRC16(rawData);

  // 5. Append checksum to complete the payload
  return rawData + crc;
};