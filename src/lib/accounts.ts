import { ACCOUNT_CATEGORIES } from "@/types";

/** UIセレクト用の標準勘定科目名（ACCOUNT_CATEGORIES と同一内容・同一順序） */
export const STD_ACCOUNTS: string[] = ACCOUNT_CATEGORIES.map((a) => a.name);
