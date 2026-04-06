export type AccountCategory = {
  code: string;
  name: string;
  nameEn: string;
  type: "asset" | "liability" | "equity" | "revenue" | "expense";
};

export const ACCOUNT_CATEGORIES: AccountCategory[] = [
  // 資産
  { code: "100", name: "現金", nameEn: "Cash", type: "asset" },
  { code: "102", name: "当座預金", nameEn: "Checking Account", type: "asset" },
  { code: "103", name: "普通預金", nameEn: "Savings Account", type: "asset" },
  { code: "120", name: "売掛金", nameEn: "Accounts Receivable", type: "asset" },
  { code: "130", name: "商品", nameEn: "Merchandise", type: "asset" },
  { code: "150", name: "前払費用", nameEn: "Prepaid Expenses", type: "asset" },
  { code: "160", name: "建物", nameEn: "Buildings", type: "asset" },
  { code: "170", name: "車両運搬具", nameEn: "Vehicles", type: "asset" },
  { code: "180", name: "備品", nameEn: "Equipment", type: "asset" },
  // 負債
  { code: "200", name: "買掛金", nameEn: "Accounts Payable", type: "liability" },
  { code: "210", name: "未払金", nameEn: "Accrued Liabilities", type: "liability" },
  { code: "220", name: "未払費用", nameEn: "Accrued Expenses", type: "liability" },
  { code: "230", name: "預り金", nameEn: "Deposits Received", type: "liability" },
  { code: "240", name: "借入金", nameEn: "Borrowings", type: "liability" },
  // 収益
  { code: "400", name: "売上高", nameEn: "Sales Revenue", type: "revenue" },
  { code: "410", name: "受取利息", nameEn: "Interest Income", type: "revenue" },
  { code: "420", name: "雑収入", nameEn: "Miscellaneous Income", type: "revenue" },
  // 費用
  { code: "500", name: "仕入高", nameEn: "Cost of Goods Sold", type: "expense" },
  { code: "510", name: "給料手当", nameEn: "Salaries", type: "expense" },
  { code: "520", name: "法定福利費", nameEn: "Legal Welfare", type: "expense" },
  { code: "530", name: "旅費交通費", nameEn: "Travel Expenses", type: "expense" },
  { code: "540", name: "通信費", nameEn: "Communication", type: "expense" },
  { code: "550", name: "消耗品費", nameEn: "Supplies", type: "expense" },
  { code: "560", name: "水道光熱費", nameEn: "Utilities", type: "expense" },
  { code: "570", name: "地代家賃", nameEn: "Rent", type: "expense" },
  { code: "580", name: "保険料", nameEn: "Insurance", type: "expense" },
  { code: "590", name: "修繕費", nameEn: "Repairs", type: "expense" },
  { code: "600", name: "広告宣伝費", nameEn: "Advertising", type: "expense" },
  { code: "610", name: "接待交際費", nameEn: "Entertainment", type: "expense" },
  { code: "620", name: "会議費", nameEn: "Meeting Expenses", type: "expense" },
  { code: "630", name: "租税公課", nameEn: "Taxes and Dues", type: "expense" },
  { code: "640", name: "減価償却費", nameEn: "Depreciation", type: "expense" },
  { code: "650", name: "支払手数料", nameEn: "Commission Fees", type: "expense" },
  { code: "660", name: "雑費", nameEn: "Miscellaneous", type: "expense" },
  { code: "670", name: "新聞図書費", nameEn: "Books & Subscriptions", type: "expense" },
  { code: "680", name: "外注費", nameEn: "Outsourcing", type: "expense" },
  { code: "690", name: "福利厚生費", nameEn: "Welfare", type: "expense" },
  { code: "700", name: "荷造運賃", nameEn: "Packing & Shipping", type: "expense" },
  { code: "710", name: "車両費", nameEn: "Vehicle Expenses", type: "expense" },
  { code: "720", name: "リース料", nameEn: "Lease Payments", type: "expense" },
];

export type CsvFormat = "yayoi" | "moneyforward" | "freee";

export type PeriodType = "monthly" | "semi_annual" | "annual";

export interface JournalEntryData {
  id: string;
  date: string;
  debitAccount: string;
  debitSubAccount?: string;
  creditAccount: string;
  creditSubAccount?: string;
  amount: number;
  taxAmount?: number;
  taxRate?: number;
  description: string;
  invoiceNumber?: string;
  memo?: string;
  isConfirmed: boolean;
  clientId: string;
  receiptId?: string;
}

export interface OcrResult {
  storeName: string;
  date: string;
  items: { name: string; amount: number; taxRate?: number }[];
  total: number;
  taxTotal?: number;
  paymentMethod?: string;
  rawText: string;
}

export interface ClassificationResult {
  debitAccount: string;
  creditAccount: string;
  amount: number;
  taxAmount?: number;
  taxRate?: number;
  description: string;
  confidence: number;
}
