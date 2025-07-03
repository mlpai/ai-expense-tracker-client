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
import DashboardLayout from "../../layouts/DashboardLayout";

interface Expense {
  id: string;
  userId: string;
  bankAccountId: string;
  expenseTypeId: string;
  amount: number;
  note?: string;
  date: string;
  isRecurring: boolean;
  bankAccount?: {
    name: string;
    bankName: string;
  };
  expenseType?: {
    name: string;
    category?: {
      name: string;
      color?: string;
    };
  };
}

interface ExpenseFormData {
  userId: string;
  bankAccountId: string;
  expenseTypeId: string;
  amount: number;
  note?: string;
  date: string;
  isRecurring?: boolean;
}

export default function Expenses() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [user, setUser] = useState<any>(null);
  const [formData, setFormData] = useState<ExpenseFormData>({
    userId: "",
    bankAccountId: "",
    expenseTypeId: "",
    amount: 0,
    note: "",
    date: new Date().toISOString().split("T")[0],
    isRecurring: false,
  });
  const queryClient = useQueryClient();

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
      setUser(userData);
      setFormData((prev) => ({ ...prev, userId: userData.id }));
    }
  }, [userData]);

  // Get expenses
  const { data: expensesResponse, isLoading } = useQuery({
    queryKey: ["expenses", user?.id, searchTerm, selectedCategory],
    queryFn: async () => {
      if (!user?.id) return { data: [] };
      const response = await expensesAPI.getAll(user.id);
      return response;
    },
    enabled: !!user?.id,
  });

  const expenses = expensesResponse?.data || [];

  // Get expense types
  const { data: expenseTypesResponse } = useQuery({
    queryKey: ["expense-types"],
    queryFn: async () => {
      const response = await categoriesAPI.getExpenseTypes();
      return response;
    },
  });

  const expenseTypes = expenseTypesResponse?.data || [];

  // Get expense categories
  const { data: expenseCategoriesResponse } = useQuery({
    queryKey: ["expense-categories"],
    queryFn: async () => {
      const response = await categoriesAPI.getExpenseCategories();
      return response;
    },
  });

  const expenseCategories = expenseCategoriesResponse?.data || [];

  // Get bank accounts
  const { data: bankAccountsResponse } = useQuery({
    queryKey: ["bank-accounts"],
    queryFn: async () => {
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
    setFormData({
      userId: user?.id || "",
      bankAccountId: "",
      expenseTypeId: "",
      amount: 0,
      note: "",
      date: new Date().toISOString().split("T")[0],
      isRecurring: false,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !formData.bankAccountId ||
      !formData.expenseTypeId ||
      formData.amount <= 0
    ) {
      alert("Please fill in all required fields");
      return;
    }
    createMutation.mutate(formData);
  };

  const handleEdit = (expense: Expense) => {
    setEditingExpense(expense);
    setFormData({
      userId: expense.userId,
      bankAccountId: expense.bankAccountId,
      expenseTypeId: expense.expenseTypeId,
      amount: expense.amount,
      note: expense.note || "",
      date: expense.date.split("T")[0],
      isRecurring: expense.isRecurring,
    });
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm("Are you sure you want to delete this expense?")) {
      deleteMutation.mutate(id);
    }
  };

  const filteredExpenses = expenses.filter(
    (expense: Expense) =>
      expense.note?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      expense.expenseType?.name
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      expense.expenseType?.category?.name
        .toLowerCase()
        .includes(searchTerm.toLowerCase())
  );

  const totalExpenses = filteredExpenses.reduce(
    (sum: number, expense: Expense) => sum + expense.amount,
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
    (sum: number, expense: Expense) => sum + expense.amount,
    0
  );

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
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
                  ${totalExpenses.toLocaleString()}
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
                  ${thisMonthTotal.toLocaleString()}
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
              <div className="sm:w-48">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="input"
                >
                  <option value="">All Categories</option>
                  {expenseCategories.map((category: any) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
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
                          {expense.expenseType?.category?.name ||
                            expense.expenseType?.name ||
                            "Unknown"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {expense.bankAccount?.name || "Unknown"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-danger-600">
                          -${expense.amount.toLocaleString()}
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
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
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
                    Expense Type *
                  </label>
                  <select
                    value={formData.expenseTypeId}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        expenseTypeId: e.target.value,
                      })
                    }
                    className="input w-full"
                    required
                  >
                    <option value="">Select type</option>
                    {expenseTypes.map((type: any) => (
                      <option key={type.id} value={type.id}>
                        {type.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Bank Account *
                  </label>
                  <select
                    value={formData.bankAccountId}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        bankAccountId: e.target.value,
                      })
                    }
                    className="input w-full"
                    required
                  >
                    <option value="">Select account</option>
                    {bankAccounts.map((account: any) => (
                      <option key={account.id} value={account.id}>
                        {account.name} - {account.bankName}
                      </option>
                    ))}
                  </select>
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
                    disabled={createMutation.isPending}
                    className="btn btn-primary"
                  >
                    {createMutation.isPending
                      ? "Saving..."
                      : editingExpense
                      ? "Update"
                      : "Save"}
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
