import type {
  Account,
  Category,
  Transaction,
  CreateAccountInput,
  UpdateAccountInput,
  CreateCategoryInput,
  UpdateCategoryInput,
  CreateOperationInput,
  UpdateOperationInput,
  DeleteOperationInput,
} from "./types"

const BASE = "/api"

async function json<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init)
  if (!res.ok) {
    const body = await res.text()
    throw new Error(body || res.statusText)
  }
  return res.json()
}

export const api = {
  accounts: {
    list: () => json<Account[]>(`${BASE}/accounts`),
    create: (input: CreateAccountInput) =>
      json<Account>(`${BASE}/accounts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      }),
    update: (input: UpdateAccountInput) =>
      json<Account>(`${BASE}/accounts`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      }),
    delete: (id: string) =>
      json(`${BASE}/accounts`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      }),
  },

  categories: {
    list: () => json<Category[]>(`${BASE}/categories`),
    create: (input: CreateCategoryInput) =>
      json<Category>(`${BASE}/categories`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      }),
    update: (input: UpdateCategoryInput) =>
      json<Category>(`${BASE}/categories`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      }),
    delete: (id: string) =>
      json(`${BASE}/categories`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      }),
  },

  transactions: {
    list: () => json<Transaction[]>(`${BASE}/transactions`),
    create: (input: CreateOperationInput) =>
      json(`${BASE}/transactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      }),
    update: (input: UpdateOperationInput) =>
      json(`${BASE}/transactions`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      }),
    delete: (input: DeleteOperationInput) =>
      json(`${BASE}/transactions`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      }),
  },
}
