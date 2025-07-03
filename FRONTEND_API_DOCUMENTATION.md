# Frontend API Documentation

## Overview

This document provides comprehensive API documentation for the Expense Tracker backend. The API is RESTful and uses JWT authentication.

**Base URL:** `http://localhost:3000/api/v1`

**Authentication:** Bearer token in Authorization header

```
Authorization: Bearer <jwt_token>
```

## Common Response Format

All API responses follow this structure:

```typescript
// Success Response
{
  "success": true,
  "data": <response_data>
}

// Error Response
{
  "success": false,
  "message": "Error description"
}
```

## Data Models

### User

```typescript
interface User {
  id: string;
  email: string;
  name: string;
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
  bankAccounts?: BankAccount[];
  expenses?: Expense[];
  deposits?: Deposit[];
}
```

### BankAccount

```typescript
interface BankAccount {
  id: string;
  userId: string;
  name: string;
  accountNumber: string;
  balance: number;
  bankName: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}
```

### Expense

```typescript
interface Expense {
  id: string;
  userId: string;
  bankAccountId: string;
  categoryId: string;
  amount: number; // Decimal as number
  note?: string;
  date: string; // ISO date string
  isRecurring: boolean;
  recurringExpenseId?: string;
  receiptId?: string;
  createdAt: string;
  updatedAt: string;
  bankAccount?: BankAccount;
  category?: ExpenseCategory;
  receipt?: Receipt;
  recurringExpense?: RecurringExpense;
}
```

### ExpenseType

```typescript
interface ExpenseType {
  id: string;
  name: string;
  description?: string;
  categoryId: string;
  category?: ExpenseCategory;
  createdAt: string;
}
```

### ExpenseCategory

```typescript
interface ExpenseCategory {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}
```

### Deposit

```typescript
interface Deposit {
  id: string;
  userId: string;
  bankAccountId: string;
  depositTypeId: string;
  amount: number; // Decimal as number
  note?: string;
  date: string; // ISO date string
  createdAt: string;
  updatedAt: string;
  bankAccount?: BankAccount;
  depositType?: DepositType;
}
```

### DepositType

```typescript
interface DepositType {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  createdAt: string;
}
```

### RecurringExpense

```typescript
interface RecurringExpense {
  id: string;
  userId: string;
  categoryId: string;
  amount: number; // Decimal as number
  note?: string;
  frequency: "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";
  startDate: string; // ISO date string
  endDate?: string; // ISO date string, null for indefinite
  nextDueDate: string; // ISO date string
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  category?: ExpenseCategory;
}
```

### Receipt

```typescript
interface Receipt {
  id: string;
  userId: string;
  imageUrl: string;
  originalText?: string;
  processedData?: any; // JSON object
  status: "PENDING" | "PROCESSED" | "FAILED";
  createdAt: string;
  updatedAt: string;
  expenses?: Expense[];
}
```

### Budget

```typescript
interface Budget {
  id: string;
  userId: string;
  month: number; // 1-12
  year: number;
  amountLimit: number; // Decimal as number
  spentAmount: number; // Decimal as number
  thresholdPercentage: number; // Default 80
  createdAt: string;
  updatedAt: string;
  alerts?: BudgetAlert[];
}
```

### BudgetAlert

```typescript
interface BudgetAlert {
  id: string;
  budgetId: string;
  alertType: "THRESHOLD_REACHED" | "EXCEEDED";
  message: string;
  isRead: boolean;
  createdAt: string;
}
```

### AiSuggestion

```typescript
interface AiSuggestion {
  id: string;
  userId: string;
  title: string;
  suggestion: string;
  category: "BUDGET" | "SAVINGS" | "SPENDING_PATTERN" | "INVESTMENT";
  priority: "LOW" | "MEDIUM" | "HIGH";
  isRead: boolean;
  createdAt: string;
}
```

### MonthlyReport

```typescript
interface MonthlyReport {
  id: string;
  userId: string;
  month: number;
  year: number;
  totalExpense: number; // Decimal as number
  totalIncome: number; // Decimal as number
  netSavings: number; // Decimal as number
  budgetStatus: "UNDER_BUDGET" | "ON_TRACK" | "OVER_BUDGET";
  generatedAt: string;
  reportData: any; // JSON object
  aiInsights?: any; // JSON object
}
```

### Notification

```typescript
interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: "BUDGET_ALERT" | "RECURRING_EXPENSE" | "REPORT_READY" | "AI_SUGGESTION";
  isRead: boolean;
  createdAt: string;
}
```

## Authentication Endpoints

### Register User

**POST** `/users`

**Request Body:**

```typescript
{
  "email": string;
  "password": string;
  "name": string;
}
```

**Response:**

```typescript
{
  "success": true,
  "data": User
}
```

### Login User

**POST** `/users/login`

**Request Body:**

```typescript
{
  "email": string;
  "password": string;
}
```

**Response:**

```typescript
{
  "success": true,
  "data": {
    "user": User;
    "token": string; // JWT token
  }
}
```

### Get Current User Profile

**GET** `/users/me`

**Headers:** `Authorization: Bearer <token>`

**Response:**

```typescript
{
  "success": true,
  "data": User
}
```

## Bank Account Endpoints

### Get All Accounts

**GET** `/accounts`

**Headers:** `Authorization: Bearer <token>`

**Response:**

```typescript
{
  "success": true,
  "data": BankAccount[]
}
```

### Get Account by ID

**GET** `/accounts/{id}`

**Headers:** `Authorization: Bearer <token>`

**Response:**

```typescript
{
  "success": true,
  "data": BankAccount
}
```

### Create Account

**POST** `/accounts`

**Headers:** `Authorization: Bearer <token>`

**Request Body:**

```typescript
{
  "name": string;
  "accountNumber": string;
  "balance": number;
  "bankName": string;
  "isDefault"?: boolean;
}
```

**Response:**

```typescript
{
  "success": true,
  "data": BankAccount
}
```

## Expense Endpoints

### Get All Expenses

**GET** `/expenses?userId={userId}&startDate={date}&endDate={date}`

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**

- `userId` (required): User ID
- `startDate` (optional): Start date filter (ISO string)
- `endDate` (optional): End date filter (ISO string)

**Response:**

```typescript
{
  "success": true,
  "data": Expense[]
}
```

### Get Expense by ID

**GET** `/expenses/{id}`

**Headers:** `Authorization: Bearer <token>`

**Response:**

```typescript
{
  "success": true,
  "data": Expense
}
```

### Create Expense

**POST** `/expenses`

**Headers:** `Authorization: Bearer <token>`

**Request Body:**

```typescript
{
  "userId": string;
  "bankAccountId": string;
  "categoryId": string;
  "amount": number;
  "note"?: string;
  "date"?: string; // ISO date string, defaults to now
  "isRecurring"?: boolean;
  "recurringExpenseId"?: string;
  "receiptId"?: string;
}
```

**Response:**

```typescript
{
  "success": true,
  "data": Expense
}
```

### Update Expense

**PUT** `/expenses/{id}`

**Headers:** `Authorization: Bearer <token>`

**Request Body:** Same as Create Expense (all fields optional)

**Response:**

```typescript
{
  "success": true,
  "data": Expense
}
```

### Delete Expense

**DELETE** `/expenses/{id}`

**Headers:** `Authorization: Bearer <token>`

**Response:**

```typescript
{
  "success": true,
  "data": null
}
```

### Create Recurring Expense

**POST** `/expenses/recurring`

**Headers:** `Authorization: Bearer <token>`

**Request Body:**

```typescript
{
  "userId": string;
  "categoryId": string;
  "amount": number;
  "note"?: string;
  "frequency": 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
  "startDate": string; // ISO date string
  "endDate"?: string; // ISO date string, null for indefinite
  "nextDueDate": string; // ISO date string
  "isActive"?: boolean;
}
```

**Response:**

```typescript
{
  "success": true,
  "data": RecurringExpense
}
```

### Get All Recurring Expenses

**GET** `/expenses/recurring/all?userId={userId}`

**Headers:** `Authorization: Bearer <token>`

**Response:**

```typescript
{
  "success": true,
  "data": RecurringExpense[]
}
```

### Get Expense Summary

**GET** `/expenses/summary?userId={userId}&startDate={date}&endDate={date}`

**Headers:** `Authorization: Bearer <token>`

**Response:**

```typescript
{
  "success": true,
  "data": {
    "totalExpenses": number;
    "totalIncome": number;
    "netSavings": number;
    "expensesByCategory": Array<{
      category: string;
      amount: number;
      count: number;
    }>;
    "expensesByMonth": Array<{
      month: string;
      amount: number;
    }>;
  }
}
```

## Deposit Endpoints

### Get All Deposits

**GET** `/deposits?userId={userId}`

**Headers:** `Authorization: Bearer <token>`

**Response:**

```typescript
{
  "success": true,
  "data": Deposit[]
}
```

### Get Deposit by ID

**GET** `/deposits/{id}`

**Headers:** `Authorization: Bearer <token>`

**Response:**

```typescript
{
  "success": true,
  "data": Deposit
}
```

### Create Deposit

**POST** `/deposits`

**Headers:** `Authorization: Bearer <token>`

**Request Body:**

```typescript
{
  "userId": string;
  "bankAccountId": string;
  "depositTypeId": string;
  "amount": number;
  "note"?: string;
  "date"?: string; // ISO date string, defaults to now
}
```

**Response:**

```typescript
{
  "success": true,
  "data": Deposit
}
```

### Update Deposit

**PUT** `/deposits/{id}`

**Headers:** `Authorization: Bearer <token>`

**Request Body:** Same as Create Deposit (all fields optional)

**Response:**

```typescript
{
  "success": true,
  "data": Deposit
}
```

### Delete Deposit

**DELETE** `/deposits/{id}`

**Headers:** `Authorization: Bearer <token>`

**Response:**

```typescript
{
  "success": true,
  "data": null
}
```

### Get All Deposit Types

**GET** `/deposits/types/all`

**Headers:** `Authorization: Bearer <token>`

**Response:**

```typescript
{
  "success": true,
  "data": DepositType[]
}
```

### Create Deposit Type

**POST** `/deposits/types`

**Headers:** `Authorization: Bearer <token>`

**Request Body:**

```typescript
{
  "name": string;
  "description"?: string;
  "icon"?: string;
  "color"?: string;
}
```

**Response:**

```typescript
{
  "success": true,
  "data": DepositType
}
```

## Budget Endpoints

### Get All Budgets

**GET** `/budgets?userId={userId}`

**Headers:** `Authorization: Bearer <token>`

**Response:**

```typescript
{
  "success": true,
  "data": Budget[]
}
```

### Get Budget by ID

**GET** `/budgets/{id}`

**Headers:** `Authorization: Bearer <token>`

**Response:**

```typescript
{
  "success": true,
  "data": Budget
}
```

### Create Budget

**POST** `/budgets`

**Headers:** `Authorization: Bearer <token>`

**Request Body:**

```typescript
{
  "userId": string;
  "month": number; // 1-12
  "year": number;
  "amountLimit": number;
  "thresholdPercentage"?: number; // Default 80
}
```

**Response:**

```typescript
{
  "success": true,
  "data": Budget
}
```

### Update Budget

**PUT** `/budgets/{id}`

**Headers:** `Authorization: Bearer <token>`

**Request Body:** Same as Create Budget (all fields optional)

**Response:**

```typescript
{
  "success": true,
  "data": Budget
}
```

### Delete Budget

**DELETE** `/budgets/{id}`

**Headers:** `Authorization: Bearer <token>`

**Response:**

```typescript
{
  "success": true,
  "data": null
}
```

### Get Current Month Budget

**GET** `/budgets/current?userId={userId}`

**Headers:** `Authorization: Bearer <token>`

**Response:**

```typescript
{
  "success": true,
  "data": Budget
}
```

### Get Budget Alerts

**GET** `/budgets/alerts/all?userId={userId}`

**Headers:** `Authorization: Bearer <token>`

**Response:**

```typescript
{
  "success": true,
  "data": BudgetAlert[]
}
```

### Mark Alert as Read

**PUT** `/budgets/alerts/{id}/read`

**Headers:** `Authorization: Bearer <token>`

**Response:**

```typescript
{
  "success": true,
  "data": BudgetAlert
}
```

### Get Budget Summary

**GET** `/budgets/summary/all?userId={userId}`

**Headers:** `Authorization: Bearer <token>`

**Response:**

```typescript
{
  "success": true,
  "data": {
    "currentBudget": Budget;
    "totalSpent": number;
    "remainingBudget": number;
    "spendingPercentage": number;
    "alerts": BudgetAlert[];
  }
}
```

### Recalculate Budget Spending

**PUT** `/budgets/{id}/recalc`

**Headers:** `Authorization: Bearer <token>`

**Response:**

```typescript
{
  "success": true,
  "data": Budget
}
```

## Receipt Endpoints

### Get All Receipts

**GET** `/receipts?userId={userId}`

**Headers:** `Authorization: Bearer <token>`

**Response:**

```typescript
{
  "success": true,
  "data": Receipt[]
}
```

### Get Receipt by ID

**GET** `/receipts/{id}`

**Headers:** `Authorization: Bearer <token>`

**Response:**

```typescript
{
  "success": true,
  "data": Receipt
}
```

### Upload and Process Receipt

**POST** `/receipts`

**Headers:** `Authorization: Bearer <token>`

**Request Body:** FormData with file upload

```typescript
FormData {
  "userId": string;
  "image": File; // Receipt image file
}
```

**Response:**

```typescript
{
  "success": true,
  "data": Receipt
}
```

### Delete Receipt

**DELETE** `/receipts/{id}`

**Headers:** `Authorization: Bearer <token>`

**Response:**

```typescript
{
  "success": true,
  "data": null
}
```

### Create Expense from Receipt

**POST** `/receipts/expense`

**Headers:** `Authorization: Bearer <token>`

**Request Body:**

```typescript
{
  "receiptId": string;
  "bankAccountId": string;
  "categoryId": string;
  "amount": number;
  "note"?: string;
}
```

**Response:**

```typescript
{
  "success": true,
  "data": Expense
}
```

### Get Receipt Statistics

**GET** `/receipts/stats/all?userId={userId}`

**Headers:** `Authorization: Bearer <token>`

**Response:**

```typescript
{
  "success": true,
  "data": {
    "totalReceipts": number;
    "processedReceipts": number;
    "pendingReceipts": number;
    "failedReceipts": number;
    "totalAmount": number;
    "averageAmount": number;
  }
}
```

## AI Endpoints

### Generate Monthly Report

**POST** `/ai/report`

**Headers:** `Authorization: Bearer <token>`

**Request Body:**

```typescript
{
  "userId": string;
  "month": number; // 1-12
  "year": number;
}
```

**Response:**

```typescript
{
  "success": true,
  "data": MonthlyReport
}
```

### Generate AI Suggestions

**POST** `/ai/suggestions/generate`

**Headers:** `Authorization: Bearer <token>`

**Request Body:**

```typescript
{
  "userId": string;
  "category"?: 'BUDGET' | 'SAVINGS' | 'SPENDING_PATTERN' | 'INVESTMENT';
}
```

**Response:**

```typescript
{
  "success": true,
  "data": AiSuggestion[]
}
```

### Get All AI Suggestions

**GET** `/ai/suggestions/all?userId={userId}`

**Headers:** `Authorization: Bearer <token>`

**Response:**

```typescript
{
  "success": true,
  "data": AiSuggestion[]
}
```

### Mark Suggestion as Read

**PUT** `/ai/suggestions/{id}/read`

**Headers:** `Authorization: Bearer <token>`

**Response:**

```typescript
{
  "success": true,
  "data": AiSuggestion
}
```

## Error Handling

### HTTP Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `404` - Not Found
- `500` - Internal Server Error

### Error Response Format

```typescript
{
  "success": false,
  "message": "Error description"
}
```

## File Upload

For receipt uploads, use FormData:

```typescript
const formData = new FormData();
formData.append("userId", userId);
formData.append("image", file);

const response = await fetch("/api/v1/receipts", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${token}`,
  },
  body: formData,
});
```

## Authentication Flow

1. **Register/Login** to get JWT token
2. **Store token** in localStorage or secure storage
3. **Include token** in all subsequent requests
4. **Handle 401 errors** by redirecting to login

## Example Usage

### Frontend API Service Example

```typescript
class ApiService {
  private baseUrl = "http://localhost:3000/api/v1";
  private token: string | null = null;

  setToken(token: string) {
    this.token = token;
  }

  private async request(endpoint: string, options: RequestInit = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const headers: HeadersInit = {
      "Content-Type": "application/json",
      ...options.headers,
    };

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "API request failed");
    }

    return data;
  }

  // Authentication
  async login(email: string, password: string) {
    const data = await this.request("/users/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    this.setToken(data.data.token);
    return data.data;
  }

  async register(email: string, password: string, name: string) {
    const data = await this.request("/users", {
      method: "POST",
      body: JSON.stringify({ email, password, name }),
    });
    return data.data;
  }

  // Expenses
  async getExpenses(userId: string, filters?: any) {
    const params = new URLSearchParams({ userId, ...filters });
    return this.request(`/expenses?${params}`);
  }

  async createExpense(expenseData: any) {
    return this.request("/expenses", {
      method: "POST",
      body: JSON.stringify(expenseData),
    });
  }

  // Budgets
  async getBudgets(userId: string) {
    const params = new URLSearchParams({ userId });
    return this.request(`/budgets?${params}`);
  }

  async createBudget(budgetData: any) {
    return this.request("/budgets", {
      method: "POST",
      body: JSON.stringify(budgetData),
    });
  }

  // AI Features
  async generateSuggestions(userId: string, category?: string) {
    return this.request("/ai/suggestions/generate", {
      method: "POST",
      body: JSON.stringify({ userId, category }),
    });
  }

  async generateReport(userId: string, month: number, year: number) {
    return this.request("/ai/report", {
      method: "POST",
      body: JSON.stringify({ userId, month, year }),
    });
  }
}

export const apiService = new ApiService();
```

## Development Notes

1. **CORS** is enabled for development
2. **File uploads** are served from `/uploads` endpoint
3. **Swagger docs** available at `/api-docs`
4. **Health check** endpoint at `/health`
5. All monetary values are **Decimal** types in database but returned as **numbers** in API
6. **Dates** are returned as ISO strings
7. **UUIDs** are used for all IDs
8. **JWT tokens** should be included in Authorization header for protected routes
