import { z } from "zod";

export const STATEMENT_ACCOUNTS = [
  "現金",
  "当座預金",
  "普通預金",
  "売掛金",
  "商品",
  "前払費用",
  "建物",
  "車両運搬具",
  "備品",
  "買掛金",
  "未払金",
  "未払費用",
  "預り金",
  "借入金",
  "売上高",
  "受取利息",
  "雑収入",
  "仕入高",
  "給料手当",
  "法定福利費",
  "旅費交通費",
  "通信費",
  "消耗品費",
  "水道光熱費",
  "地代家賃",
  "保険料",
  "修繕費",
  "広告宣伝費",
  "接待交際費",
  "会議費",
  "租税公課",
  "減価償却費",
  "支払手数料",
  "雑費",
  "新聞図書費",
  "外注費",
  "福利厚生費",
  "荷造運賃",
  "車両費",
  "リース料",
] as const;

export const MAX_STATEMENT_TRANSACTIONS = 500;

const accountSchema = z.enum(STATEMENT_ACCOUNTS);

export const statementTransactionSchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "日付はYYYY-MM-DD形式で入力してください")
    .refine((value) => {
      const date = new Date(`${value}T00:00:00Z`);
      return (
        !Number.isNaN(date.getTime()) &&
        date.toISOString().slice(0, 10) === value
      );
    }, "日付が不正です"),
  description: z.string().trim().min(1).max(500),
  amount: z.number().int().positive().max(1_000_000_000),
  debitAccount: accountSchema,
  creditAccount: accountSchema,
  taxRate: z.union([z.literal(0.1), z.literal(0.08), z.null()]),
  taxAmount: z.number().int().min(0).max(1_000_000_000).nullable(),
  memo: z.string().trim().max(1000),
}).refine(
  (value) => value.taxAmount === null || value.taxAmount <= value.amount,
  { message: "税額が金額を超えています", path: ["taxAmount"] },
);

export type StatementTransaction = z.infer<typeof statementTransactionSchema>;
