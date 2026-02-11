
export const APP_NAME = "PromptPay Gateway";
export const PROMPTPAY_ID = "0899999999"; // Mock Merchant Mobile (Auto-formats to 0066899999999)
export const BASE_RATE = 31.26; // THB/USD - Updated from 34.50
export const SPREAD_PERCENT = 0.11; // 11% - Updated from 0.008 (0.8%)
export const REFRESH_RATE_MS = 3000;
export const RATE_REFRESH_MS = 2500; // Update rate every 2.5 seconds for liveliness
export const RATE_FLUCTUATION_RANGE = 0.08; // +/- 0.04 THB variance (Subtle)
export const MAX_AUTO_APPROVE_USD = 5000;

export const THEME = {
  bg: "bg-slate-50 dark:bg-slate-950",
  card: "fintech-card rounded border border-slate-200 dark:border-slate-800 shadow-formal",
  primary: "text-blue-900 dark:text-blue-400",
  secondary: "text-slate-600 dark:text-slate-400",
  border: "border-slate-200 dark:border-slate-800",
  input: "input-formal rounded-sm px-3 py-2 text-sm text-slate-900 dark:text-slate-100 w-full placeholder:text-slate-400 font-medium",
  buttonPrimary: "bg-blue-900 hover:bg-blue-800 dark:bg-blue-700 dark:hover:bg-blue-600 text-white font-semibold rounded-sm shadow-sm transition-colors text-sm px-4 py-2",
  buttonSecondary: "bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium rounded-sm border border-slate-300 dark:border-slate-700 transition-colors shadow-sm text-sm px-4 py-2",
};

export const TRANSLATIONS = {
  en: {
    // Header & General
    title: "PromptPay Gateway",
    subtitle: "Authorized Digital Asset Exchange",
    systemOp: "Operational",
    securityCenter: "Security Center",
    
    // Swap Screen
    buyTitle: "Foreign Exchange / Remittance",
    youPay: "Source Account (THB)",
    youReceive: "Beneficiary (USDT-TRC20)",
    rate: "Spot Rate",
    fees: "Handling Fee",
    proceed: "Review Transaction",
    
    // KYC Screen
    kycTitle: "Beneficiary Verification",
    kycDesc: "Regulatory compliance requires verification of the account holder details for AML/CFT screening.",
    fullName: "Beneficiary Name",
    nationalId: "Tax ID / National ID",
    wallet: "Wallet Address",
    back: "Modify",
    confirm: "Confirm & Generate Invoice",
    
    // Pulse/QR Screen
    scan: "PromptPay QR Payment",
    scanDesc: "Please use your banking application to scan the QR code below.",
    dontClose: "Session Active",
    listening: "Awaiting Confirmation...",
    exactAmount: "Total Payable",
    transferExactly: "Please transfer exactly",
    
    // Transaction Pulse Component
    txFailed: "Transaction Voided",
    txPulse: "Transaction Status",
    rejected: "DECLINED",
    secure: "SECURE SSL",
    stepPayment: "Awaiting Payment",
    stepBank: "Bank Verification",
    stepDisburse: "Disbursement",
    stepComplete: "Settled",
    status: "Status",
    incoming: "Inbound (THB)",
    outgoing: "Outbound (USDT)",
    verifying: "Verifying origin account details...",
    initiating: "Executing blockchain transfer...",
    alert: "Compliance Notice",
    contactSupport: "Funds held pending review. Reference ID required.",
    pendingApproval: "Awaiting Multi-Sig Approval",
    
    // Admin Dashboard
    adminConsole: "Administrator Terminal",
    secAudit: "AUDIT ACTIVE",
    thbReserves: "THB Custody",
    usdtFloat: "USDT Liquidity",
    webhookSim: "Webhook Simulator",
    webhookDesc: "Inject mock bank payload",
    triggerWebhook: "Execute",
    sysLogs: "System Logs",
    txHistory: "Transaction Ledger",
    colRef: "Ref ID",
    colAmtThb: "THB",
    colAmtUsdt: "USDT",
    colStatus: "Status",
    colTime: "Timestamp (UTC)",
    noRecords: "No records found.",
    approveBtn: "Approve Transfer",
    
    // Payment Link
    paymentLink: "Quick Pay Link",
    lblMemo: "Reference Memo",
    genLink: "Copy",
    testLink: "Test",
    
    // Admin Config & Validation
    autoHedge: "Auto-Hedge",
    autoHedgeDesc: "Binance API Sync",
    globalSettings: "Global Configuration",
    save: "Save Config",
    lblBaseRate: "Base Rate (THB/USD)",
    lblServiceFee: "Service Fee (%)",
    lblMerchantId: "Merchant ID",
    lblWallet: "Hot Wallet Address",
    senderNamePlaceholder: "Sender Name",
    amountPlaceholder: "Amount",
    errNoTx: "No active session.",
    errSenderName: "Name required.",
    errAmount: "Invalid amount.",
    
    // Errors
    errorGen: "Configuration Error: Invalid Merchant ID."
  },
  th: {
    // Header & General
    title: "PromptPay Gateway",
    subtitle: "ผู้ให้บริการสินทรัพย์ดิจิทัลที่ได้รับอนุญาต",
    systemOp: "ระบบปกติ",
    securityCenter: "ศูนย์ความปลอดภัย",
    
    // Swap Screen
    buyTitle: "แลกเปลี่ยนเงินตราต่างประเทศ",
    youPay: "บัญชีต้นทาง (THB)",
    youReceive: "ผู้รับประโยชน์ (USDT-TRC20)",
    rate: "อัตราแลกเปลี่ยน",
    fees: "ค่าธรรมเนียม",
    proceed: "ตรวจสอบรายการ",
    
    // KYC Screen
    kycTitle: "ยืนยันข้อมูลผู้รับประโยชน์",
    kycDesc: "การปฏิบัติตามกฎระเบียบต้องมีการตรวจสอบบัญชีธนาคารต้นทาง",
    fullName: "ชื่อบัญชีผู้รับ",
    nationalId: "เลขบัตรประชาชน / เลขผู้เสียภาษี",
    wallet: "ที่อยู่กระเป๋า",
    back: "แก้ไข",
    confirm: "ยืนยันและสร้างรายการ",
    
    // Pulse/QR Screen
    scan: "ชำระเงินผ่าน PromptPay",
    scanDesc: "สแกน QR ด้วยแอปพลิเคชันธนาคาร",
    dontClose: "เซสชันกำลังทำงาน",
    listening: "รอการยืนยันจากธนาคาร...",
    exactAmount: "ยอดที่ต้องชำระ",
    transferExactly: "กรุณาโอนยอด",
    
    // Transaction Pulse Component
    txFailed: "รายการถูกยกเลิก",
    txPulse: "สถานะรายการ",
    rejected: "ปฏิเสธ",
    secure: "ปลอดภัย",
    stepPayment: "รอชำระ",
    stepBank: "ตรวจสอบ",
    stepDisburse: "โอนเหรียญ",
    stepComplete: "สำเร็จ",
    status: "สถานะ",
    incoming: "ยอดเข้า (THB)",
    outgoing: "ยอดออก (USDT)",
    verifying: "กำลังตรวจสอบข้อมูล...",
    initiating: "กำลังดำเนินการ...",
    alert: "แจ้งเตือนความปลอดภัย",
    contactSupport: "ยอดเงินถูกระงับ โปรดติดต่อฝ่ายสนับสนุน",
    pendingApproval: "รอการอนุมัติ Multi-Sig",
    
    // Admin Dashboard
    adminConsole: "คอนโซลผู้ดูแลระบบ",
    secAudit: "บันทึกการตรวจสอบ: เปิดใช้งาน",
    thbReserves: "เงินฝาก THB",
    usdtFloat: "สภาพคล่อง USDT",
    webhookSim: "จำลอง Webhook",
    webhookDesc: "ส่งข้อมูลจำลองธนาคาร",
    triggerWebhook: "ส่งข้อมูล",
    sysLogs: "บันทึกระบบ",
    txHistory: "สมุดบัญชีธุรกรรม",
    colRef: "รหัสอ้างอิง",
    colAmtThb: "THB",
    colAmtUsdt: "USDT",
    colStatus: "สถานะ",
    colTime: "เวลา UTC",
    noRecords: "ไม่พบข้อมูล",
    approveBtn: "อนุมัติรายการ",

    // Payment Link
    paymentLink: "ลิงก์ชำระเงินด่วน",
    lblMemo: "บันทึกอ้างอิง",
    genLink: "คัดลอก",
    testLink: "ทดสอบ",

    // Admin Config & Validation
    autoHedge: "Auto-Hedge",
    autoHedgeDesc: "Binance API Sync",
    globalSettings: "ตั้งค่าระบบ",
    save: "บันทึก",
    lblBaseRate: "อัตราแลกเปลี่ยน (THB/USD)",
    lblServiceFee: "ค่าธรรมเนียม (%)",
    lblMerchantId: "รหัสร้านค้า",
    lblWallet: "กระเป๋า Hot Wallet",
    senderNamePlaceholder: "ชื่อผู้โอน",
    amountPlaceholder: "จำนวน",
    errNoTx: "ไม่มีเซสชันที่ใช้งานอยู่",
    errSenderName: "ระบุชื่อ",
    errAmount: "จำนวนไม่ถูกต้อง",
    
    // Errors
    errorGen: "ข้อผิดพลาดการตั้งค่า: รหัสร้านค้าไม่ถูกต้อง"
  }
};