import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Edit,
  Trash2,
  Search,
  TrendingDown,
  DollarSign,
  Calendar,
  CreditCard,
} from "lucide-react";
import {
  expensesAPI,
  categoriesAPI,
  bankAccountsAPI,
  authAPI,
} from "../../lib/api";
import { getAuthToken, getUserId, formatCurrency } from "../../lib/utils";
import DashboardLayout from "../../layouts/DashboardLayout";
import dayjs from "dayjs";

interface Expense {
  id: string;
  userId: string;
  bankAccountId: string;
  categoryId: string;
  amount: number;
  note?: string;
  date: string;
  isRecurring: boolean;
  bankAccount?: {
    name: string;
    bankName: string;
  };
  category?: {
    name: string;
    color?: string;
    icon?: string;
  };
  recurringFrequency?: "daily" | "weekly" | "monthly" | "yearly";
  recurringExpense?: {
    frequency: "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";
    startDate: string;
    endDate?: string;
  };
}

interface ExpenseFormData {
  userId: string;
  bankAccountId: string;
  categoryId: string;
  amount: number;
  note?: string;
  date: string;
  isRecurring?: boolean;
}

interface RecurringExpenseFormData {
  frequency: "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";
  startDate: string;
  endDate?: string;
}

export default function Expenses() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [formData, setFormData] = useState<ExpenseFormData>({
    userId: "",
    bankAccountId: "",
    categoryId: "",
    amount: 0,
    note: "",
    date: new Date().toISOString().split("T")[0],
    isRecurring: false,
  });
  const [recurringData, setRecurringData] = useState<RecurringExpenseFormData>({
    frequency: "MONTHLY",
    startDate: new Date().toISOString().split("T")[0],
    endDate: "",
  });
  const [loading, setLoading] = useState(false);
  const queryClient = useQueryClient();
  const [startDate, setStartDate] = useState(
    dayjs().startOf("month").format("YYYY-MM-DD")
  );
  const [endDate, setEndDate] = useState(
    dayjs().endOf("month").format("YYYY-MM-DD")
  );

  // Get current user
  const { data: userData } = useQuery({
    queryKey: ["current-user"],
    queryFn: async () => {
      const response = await authAPI.getCurrentUser();
      return response.data;
    },
  });

  useEffect(() => {
    if (userData) {
      setFormData((prev) => ({ ...prev, userId: userData.id }));
    }
  }, [userData]);

  // Get expenses
  const {
    data: expensesResponse,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["expenses", searchTerm, selectedCategory, startDate, endDate],
    queryFn: async () => {
      const token = getAuthToken();
      if (!token) throw new Error("No authentication token");

      const userId = getUserId();
      if (!userId) throw new Error("No user ID found");

      const response = await expensesAPI.getAll(userId, { startDate, endDate });
      return response;
    },
  });

  const expenses = expensesResponse?.data || [];

  // Get expense categories
  const { data: expenseCategoriesResponse } = useQuery({
    queryKey: ["expense-categories"],
    queryFn: async () => {
      const token = getAuthToken();
      if (!token) throw new Error("No authentication token");

      const response = await categoriesAPI.getExpenseCategories();
      return response;
    },
  });

  const expenseCategories = expenseCategoriesResponse?.data || [];

  // Get bank accounts
  const { data: bankAccountsResponse } = useQuery({
    queryKey: ["bank-accounts"],
    queryFn: async () => {
      const token = getAuthToken();
      if (!token) throw new Error("No authentication token");

      const response = await bankAccountsAPI.getAll();
      return response;
    },
  });

  const bankAccounts = bankAccountsResponse?.data || [];

  // Create/Update mutation
  const createMutation = useMutation({
    mutationFn: (data: ExpenseFormData) => {
      if (editingExpense) {
        return expensesAPI.update(editingExpense.id, data);
      }
      return expensesAPI.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      queryClient.invalidateQueries({ queryKey: ["bank-accounts"] });
      setIsModalOpen(false);
      setEditingExpense(null);
      resetForm();
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => expensesAPI.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
    },
  });

  const resetForm = () => {
    const userId = getUserId();
    setFormData({
      userId: userId || "",
      bankAccountId: "",
      categoryId: "",
      amount: 0,
      note: "",
      date: new Date().toISOString().split("T")[0],
      isRecurring: false,
    });
    setRecurringData({
      frequency: "MONTHLY",
      startDate: new Date().toISOString().split("T")[0],
      endDate: "",
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !formData.bankAccountId ||
      !formData.categoryId ||
      formData.amount <= 0
    ) {
      alert("Please fill in all required fields");
      return;
    }
    setLoading(true);
    try {
      let recurringExpenseId: string | undefined = undefined;
      if (formData.isRecurring) {
        // 1. Create RecurringExpense
        const recurringPayload = {
          userId: formData.userId,
          categoryId: formData.categoryId,
          amount: formData.amount,
          note: formData.note,
          frequency: recurringData.frequency,
          startDate: dayjs(recurringData.startDate).toISOString(),
          endDate: recurringData.endDate
            ? dayjs(recurringData.endDate).toISOString()
            : undefined,
          nextDueDate: dayjs(recurringData.startDate).toISOString(),
          isActive: true,
        };
        const data = await expensesAPI.createRecurring(recurringPayload);
        if (!data.success)
          throw new Error(data.message || "Failed to create recurring expense");
        recurringExpenseId = data.data.id;
      }
      // 2. Create Expense
      const submissionData = {
        ...formData,
        date: new Date(formData.date).toISOString(),
        isRecurring: !!formData.isRecurring,
        recurringExpenseId,
      };
      await createMutation.mutateAsync(submissionData);
    } catch (err: any) {
      alert(err.message || "Failed to create expense");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (expense: Expense) => {
    setEditingExpense(expense);
    setFormData({
      userId: expense.userId,
      bankAccountId: expense.bankAccountId,
      categoryId: expense.categoryId,
      amount: expense.amount,
      note: expense.note || "",
      date: new Date(expense.date).toISOString().split("T")[0],
      isRecurring: expense.isRecurring,
    });
    setRecurringData({
      frequency: (expense.recurringExpense?.frequency ||
        "MONTHLY") as RecurringExpenseFormData["frequency"],
      startDate: expense.recurringExpense?.startDate
        ? new Date(expense.recurringExpense.startDate)
            .toISOString()
            .split("T")[0]
        : new Date(expense.date).toISOString().split("T")[0],
      endDate: expense.recurringExpense?.endDate
        ? new Date(expense.recurringExpense.endDate).toISOString().split("T")[0]
        : "",
    });
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm("Are you sure you want to delete this expense?")) {
      deleteMutation.mutate(id);
    }
  };

  const filteredExpenses = expenses.filter((expense: Expense) => {
    // If no search term, show all expenses
    if (!searchTerm) return true;

    // Check if search term matches note or category name
    const searchLower = searchTerm.toLowerCase();
    return (
      expense.note?.toLowerCase().includes(searchLower) ||
      expense.category?.name?.toLowerCase().includes(searchLower)
    );
  });

  const totalExpenses = filteredExpenses.reduce(
    (sum: number, expense: Expense) => Number(sum) + Number(expense.amount),
    0
  );

  const thisMonthExpenses = filteredExpenses.filter((expense: Expense) => {
    const expenseDate = new Date(expense.date);
    const now = new Date();
    return (
      expenseDate.getMonth() === now.getMonth() &&
      expenseDate.getFullYear() === now.getFullYear()
    );
  });

  const thisMonthTotal = thisMonthExpenses.reduce(
    (sum: number, expense: Expense) => Number(sum) + Number(expense.amount),
    0
  );

  if (isLoading && !searchTerm?.length) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Error loading expenses
            </h3>
            <p className="text-gray-600">{error.message}</p>
            <button
              onClick={() => window.location.reload()}
              className="btn btn-primary mt-4"
            >
              Retry
            </button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Expenses</h1>
            <p className="text-gray-600">Track your expenses and spending</p>
          </div>
          <button
            onClick={() => {
              setEditingExpense(null);
              resetForm();
              setIsModalOpen(true);
            }}
            className="btn btn-primary flex items-center"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Expense
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="card p-6">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-danger-100 rounded-lg flex items-center justify-center">
                <TrendingDown className="w-5 h-5 text-danger-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">
                  Total Expenses
                </p>
                <p className="text-2xl font-semibold text-gray-900">
                  {formatCurrency(totalExpenses)}
                </p>
              </div>
            </div>
          </div>
          <div className="card p-6">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center">
                <Calendar className="w-5 h-5 text-primary-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">This Month</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {formatCurrency(thisMonthTotal)}
                </p>
              </div>
            </div>
          </div>
          <div className="card p-6">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-warning-100 rounded-lg flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-warning-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">
                  Total Transactions
                </p>
                <p className="text-2xl font-semibold text-gray-900">
                  {filteredExpenses.length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="card mb-4">
          <div className="card-body flex flex-col sm:flex-row gap-4 items-center">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">From</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="input w-full"
                max={endDate}
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">To</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="input w-full"
                min={startDate}
              />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-body">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Search expenses..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="input pl-10"
                  />
                </div>
              </div>
              <div className="sm:w-48 relative">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="input w-full pl-10 pr-10 appearance-none bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                >
                  <option value="">All Categories</option>
                  {expenseCategories.map((category: any) => (
                    <option key={category.id} value={category.id}>
                      {category.icon ? `${category.icon} ` : ""}
                      {category.name}
                    </option>
                  ))}
                </select>
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-400">🏷️</span>
                </div>
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <svg
                    className="h-5 w-5 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Expenses List */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-medium text-gray-900">
              Recent Expenses
            </h3>
          </div>
          <div className="card-body">
            {filteredExpenses.length === 0 ? (
              <div className="text-center py-12">
                <DollarSign className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">
                  No expenses
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  Get started by adding your first expense.
                </p>
                {/* Debug info */}
                {expenses.length > 0 && (
                  <div className="mt-4 p-4 bg-gray-100 rounded-lg text-left">
                    <p className="text-sm font-medium text-gray-700 mb-2">
                      Debug Info:
                    </p>
                    <p className="text-xs text-gray-600">
                      Raw expenses count: {expenses.length}
                    </p>
                    <p className="text-xs text-gray-600">
                      Search term: "{searchTerm}"
                    </p>
                    <p className="text-xs text-gray-600">
                      Selected category: "{selectedCategory}"
                    </p>
                    <p className="text-xs text-gray-600">
                      Filtered count: {filteredExpenses.length}
                    </p>
                  </div>
                )}
                <div className="mt-6">
                  <button
                    onClick={() => {
                      setEditingExpense(null);
                      resetForm();
                      setIsModalOpen(true);
                    }}
                    className="btn btn-primary"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Expense
                  </button>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Description
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Category
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Account
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Amount
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredExpenses.map((expense: Expense) => (
                      <tr key={expense.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(expense.date).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {expense.note || "No description"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {expense.category?.name || "Unknown"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {expense.bankAccount?.name || "Unknown"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-danger-600">
                          -{formatCurrency(expense.amount)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => handleEdit(expense)}
                            className="text-primary-600 hover:text-primary-900 mr-3"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(expense.id)}
                            className="text-danger-600 hover:text-danger-900"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Add/Edit Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h2 className="text-xl font-bold mb-4">
                {editingExpense ? "Edit Expense" : "Add Expense"}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Amount *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.amount}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        amount: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="input w-full"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <input
                    type="text"
                    value={formData.note}
                    onChange={(e) =>
                      setFormData({ ...formData, note: e.target.value })
                    }
                    className="input w-full"
                    placeholder="Enter description"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category *
                  </label>
                  <div className="relative">
                    <select
                      value={formData.categoryId}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          categoryId: e.target.value,
                        })
                      }
                      className="input w-full pl-10 pr-10 appearance-none bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                      required
                    >
                      <option value="">Select category</option>
                      {expenseCategories.map((category: any) => (
                        <option key={category.id} value={category.id}>
                          {category.icon} {category.name}
                        </option>
                      ))}
                    </select>
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-gray-400">
                        {formData.categoryId
                          ? expenseCategories.find(
                              (c: any) => c.id === formData.categoryId
                            )?.icon || "📝"
                          : "📝"}
                      </span>
                    </div>
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                      <svg
                        className="h-5 w-5 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Bank Account *
                  </label>
                  <div className="relative">
                    <select
                      value={formData.bankAccountId}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          bankAccountId: e.target.value,
                        })
                      }
                      className="input w-full pl-10 pr-10 appearance-none bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                      required
                    >
                      <option value="">Select account</option>
                      {bankAccounts.map((account: any) => (
                        <option key={account.id} value={account.id}>
                          {account.name} - {account.bankName}
                        </option>
                      ))}
                    </select>
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-gray-400">🏦</span>
                    </div>
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                      <svg
                        className="h-5 w-5 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date *
                  </label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) =>
                      setFormData({ ...formData, date: e.target.value })
                    }
                    className="input w-full"
                    required
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="isRecurring"
                      checked={formData.isRecurring}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          isRecurring: e.target.checked,
                        })
                      }
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                    />
                    <label
                      htmlFor="isRecurring"
                      className="ml-2 block text-sm text-gray-900"
                    >
                      Recurring expense
                    </label>
                  </div>

                  {formData.isRecurring && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Frequency *
                        </label>
                        <div className="relative">
                          <select
                            value={recurringData.frequency}
                            onChange={(e) =>
                              setRecurringData({
                                ...recurringData,
                                frequency: e.target
                                  .value as RecurringExpenseFormData["frequency"],
                              })
                            }
                            className="input w-full pl-10 pr-10 appearance-none bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                            required
                          >
                            <option value="DAILY">Daily</option>
                            <option value="WEEKLY">Weekly</option>
                            <option value="MONTHLY">Monthly</option>
                            <option value="YEARLY">Yearly</option>
                          </select>
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <span className="text-gray-400">🔄</span>
                          </div>
                          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                            <svg
                              className="h-5 w-5 text-gray-400"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 9l-7 7-7-7"
                              />
                            </svg>
                          </div>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Start Date *
                        </label>
                        <input
                          type="date"
                          value={recurringData.startDate}
                          onChange={(e) =>
                            setRecurringData({
                              ...recurringData,
                              startDate: e.target.value,
                            })
                          }
                          className="input w-full"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          End Date
                        </label>
                        <input
                          type="date"
                          value={recurringData.endDate || ""}
                          onChange={(e) =>
                            setRecurringData({
                              ...recurringData,
                              endDate: e.target.value,
                            })
                          }
                          className="input w-full"
                        />
                      </div>
                    </>
                  )}
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setIsModalOpen(false);
                      setEditingExpense(null);
                      resetForm();
                    }}
                    className="btn btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="btn btn-primary"
                  >
                    {loading ? "Saving..." : editingExpense ? "Update" : "Save"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
