import axios from "axios";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:3000/api/v1";

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  register: async (data: { name: string; email: string; password: string }) => {
    const response = await api.post("/users", data);
    return response.data;
  },
  login: async (data: { email: string; password: string }) => {
    const response = await api.post("/users/login", data);
    return response.data;
  },
  getCurrentUser: async () => {
    const response = await api.get("/users/me");
    return response.data;
  },
};

export const dashboardAPI = {
  getStats: async (userId: string) => {
    const response = await api.get(`/expenses/summary?userId=${userId}`);
    return response.data;
  },
  getRecentExpenses: async (userId: string, limit = 10) => {
    const response = await api.get(`/expenses?userId=${userId}&limit=${limit}`);
    return response.data;
  },
  getExpenseByCategory: async (
    userId: string,
    startDate?: string,
    endDate?: string
  ) => {
    const params = new URLSearchParams({ userId });
    if (startDate) params.append("startDate", startDate);
    if (endDate) params.append("endDate", endDate);
    const response = await api.get(`/expenses?${params}`);
    return response.data;
  },
  getMonthlyTrend: async (userId: string, months = 6) => {
    // This would need to be implemented on the backend
    const response = await api.get(`/expenses?userId=${userId}`);
    return response.data;
  },
};

export const expensesAPI = {
  getAll: async (
    userId: string,
    params?: {
      startDate?: string;
      endDate?: string;
    }
  ) => {
    const queryParams = new URLSearchParams({ userId });
    if (params?.startDate) queryParams.append("startDate", params.startDate);
    if (params?.endDate) queryParams.append("endDate", params.endDate);
    // Include related data
    queryParams.append("include", "bankAccount,category");
    const response = await api.get(`/expenses?${queryParams}`);
    return response.data;
  },
  getById: async (id: string) => {
    const response = await api.get(`/expenses/${id}`);
    return response.data;
  },
  create: async (data: {
    userId: string;
    bankAccountId: string;
    categoryId: string;
    amount: number;
    note?: string;
    date?: string;
    isRecurring?: boolean;
    recurringFrequency?: "daily" | "weekly" | "monthly" | "yearly";
    recurringExpenseId?: string;
    receiptId?: string;
  }) => {
    const response = await api.post("/expenses", data);
    return response.data;
  },
  createRecurring: async (data: {
    userId: string;
    categoryId: string;
    amount: number;
    note?: string;
    frequency: "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";
    startDate: string;
    endDate?: string;
    nextDueDate: string;
    isActive?: boolean;
  }) => {
    const response = await api.post("/expenses/recurring", data);
    return response.data;
  },
  update: async (id: string, data: any) => {
    const response = await api.put(`/expenses/${id}`, data);
    return response.data;
  },
  delete: async (id: string) => {
    const response = await api.delete(`/expenses/${id}`);
    return response.data;
  },
};

export const depositsAPI = {
  getAll: async (
    userId: string,
    params?: {
      startDate?: string;
      endDate?: string;
    }
  ) => {
    const queryParams = new URLSearchParams({ userId });
    if (params?.startDate) queryParams.append("startDate", params.startDate);
    if (params?.endDate) queryParams.append("endDate", params.endDate);
    const response = await api.get(`/deposits?${queryParams}`);
    return response.data;
  },
  getById: async (id: string) => {
    const response = await api.get(`/deposits/${id}`);
    return response.data;
  },
  create: async (data: {
    userId: string;
    bankAccountId: string;
    depositTypeId: string;
    amount: number;
    note?: string;
    date?: string;
  }) => {
    const response = await api.post("/deposits", data);
    return response.data;
  },
  update: async (id: string, data: any) => {
    const response = await api.put(`/deposits/${id}`, data);
    return response.data;
  },
  delete: async (id: string) => {
    const response = await api.delete(`/deposits/${id}`);
    return response.data;
  },
};

export const bankAccountsAPI = {
  getAll: async () => {
    const response = await api.get("/accounts");
    return response.data;
  },
  getById: async (id: string) => {
    const response = await api.get(`/accounts/${id}`);
    return response.data;
  },
  create: async (data: {
    name: string;
    accountNumber: string;
    balance: number;
    bankName: string;
    isDefault?: boolean;
  }) => {
    const response = await api.post("/accounts", data);
    return response.data;
  },
  update: async (id: string, data: any) => {
    const response = await api.put(`/accounts/${id}`, data);
    return response.data;
  },
  delete: async (id: string) => {
    const response = await api.delete(`/accounts/${id}`);
    return response.data;
  },
};

export const budgetsAPI = {
  getAll: async (userId: string) => {
    const response = await api.get(`/budgets?userId=${userId}`);
    return response.data;
  },
  getById: async (id: string) => {
    const response = await api.get(`/budgets/${id}`);
    return response.data;
  },
  create: async (data: {
    userId: string;
    month: number;
    year: number;
    amountLimit: number;
    thresholdPercentage?: number;
  }) => {
    const response = await api.post("/budgets", data);
    return response.data;
  },
  update: async (id: string, data: any) => {
    const response = await api.put(`/budgets/${id}`, data);
    return response.data;
  },
  delete: async (id: string) => {
    const response = await api.delete(`/budgets/${id}`);
    return response.data;
  },
  getCurrent: async (userId: string) => {
    const response = await api.get(`/budgets/current?userId=${userId}`);
    return response.data;
  },
  getSummary: async (userId: string, year?: number) => {
    const queryParams = new URLSearchParams({ userId });
    if (year) queryParams.append("year", year.toString());
    const response = await api.get(`/budgets/summary/all?${queryParams}`);
    return response.data;
  },
};

export const receiptsAPI = {
  upload: async (file: File) => {
    const formData = new FormData();
    formData.append("image", file);
    const response = await api.post("/receipts", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  },
  getAll: async (params?: { page?: number; limit?: number }) => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append("page", params.page.toString());
    if (params?.limit) queryParams.append("limit", params.limit.toString());
    const response = await api.get(`/receipts?${queryParams}`);
    return response.data;
  },
  delete: async (id: string) => {
    const response = await api.delete(`/receipts/${id}`);
    return response.data;
  },
  createExpense: async (data: {
    receiptId: string;
    bankAccountId: string;
    categoryId: string;
    amount: number;
    note?: string;
  }) => {
    const response = await api.post("/receipts/expense", data);
    return response.data;
  },
};

export const categoriesAPI = {
  getExpenseCategories: async () => {
    const response = await api.get("/expense-categories");
    return response.data;
  },
  getDepositTypes: async () => {
    const response = await api.get("/deposits/types/all");
    return response.data;
  },
};

export const reportsAPI = {
  generateMonthlyReport: async (month: number, year: number) => {
    const response = await api.post("/ai/report", { month, year });
    return response.data;
  },
  getAiSuggestions: async (category?: string) => {
    const response = await api.post("/ai/suggestions/generate", {
      category,
    });
    return response.data;
  },
  getAllSuggestions: async () => {
    const response = await api.get("/ai/suggestions/all");
    return response.data;
  },
  markSuggestionAsRead: async (id: string) => {
    const response = await api.put(`/ai/suggestions/${id}/read`);
    return response.data;
  },
};

export const notificationsAPI = {
  getAll: async (userId: string) => {
    const response = await api.get(`/notifications?userId=${userId}`);
    return response.data;
  },
  markAsRead: async (id: string) => {
    const response = await api.put(`/notifications/${id}/read`);
    return response.data;
  },
};

// Add other API endpoints as needed for expenses, deposits, budgets, receipts, etc.
