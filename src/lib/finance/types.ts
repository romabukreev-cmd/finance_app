export type AccountType = "asset" | "debt"
export type CategoryKind = "income" | "expense"
export type TransactionType = "income" | "expense" | "transfer"
export type TransferDirection = "out" | "in"

export type Account = {
  id: string
  name: string
  type: AccountType
  startBalance: number
  startDate: string
  isArchived: boolean
  createdAt: string
  updatedAt: string
}

export type Category = {
  id: string
  name: string
  kind: CategoryKind
  isSystem: boolean
  isArchived: boolean
  createdAt: string
  updatedAt: string
}

export type Transaction = {
  id: string
  transactionDate: string
  type: TransactionType
  accountId: string
  categoryId: string | null
  amount: number
  signedAmount: number
  transferId: string | null
  transferDirection: TransferDirection | null
  note: string | null
  createdAt: string
  updatedAt: string
}

export type FinanceState = {
  accounts: Account[]
  categories: Category[]
  transactions: Transaction[]
}

export type FinanceBackup = {
  version: 1
  exportedAt: string
  state: FinanceState
}

export type DisplayTransaction = {
  id: string
  type: TransactionType
  transactionDate: string
  amount: number
  note: string | null
  createdAt: string
  accountId: string | null
  categoryId: string | null
  transferId: string | null
  fromAccountId: string | null
  toAccountId: string | null
}

export type AccountBalance = {
  account: Account
  balance: number
}

export type ActionResult =
  | { ok: true }
  | { ok: false; error: string }

export type CreateAccountInput = {
  name: string
  type: AccountType
  startBalance: number
  startDate: string
}

export type UpdateAccountInput = {
  id: string
  name: string
  type: AccountType
  startBalance: number
  startDate: string
  isArchived: boolean
}

export type CreateCategoryInput = {
  name: string
  kind: CategoryKind
}

export type UpdateCategoryInput = {
  id: string
  name: string
  isArchived: boolean
}

export type CreateOperationInput =
  | {
      type: "income" | "expense"
      transactionDate: string
      accountId: string
      categoryId: string
      amount: number
      note?: string
    }
  | {
      type: "transfer"
      transactionDate: string
      fromAccountId: string
      toAccountId: string
      amount: number
      note?: string
    }

export type UpdateOperationInput =
  | {
      type: "income" | "expense"
      id: string
      transactionDate: string
      accountId: string
      categoryId: string
      amount: number
      note?: string
    }
  | {
      type: "transfer"
      transferId: string
      transactionDate: string
      fromAccountId: string
      toAccountId: string
      amount: number
      note?: string
    }

export type DeleteOperationInput =
  | { type: "income" | "expense"; id: string }
  | { type: "transfer"; transferId: string }
