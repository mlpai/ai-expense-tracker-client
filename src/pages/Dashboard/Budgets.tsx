import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Edit,
  Trash2,
  Search,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  Calendar,
  Target,
  BarChart3,
} from "lucide-react";
import { budgetsAPI, authAPI } from "../../lib/api";
import DashboardLayout from "../../layouts/DashboardLayout";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface Budget {
  id: string;
  userId: string;
  month: number;
  year: number;
  amountLimit: number;
  spentAmount: number;
  thresholdPercentage: number;
  createdAt: string;
  updatedAt: string;
  alerts?: Array<{
    id: string;
    alertType: string;
    message: string;
    isRead: boolean;
    createdAt: string;
  }>;
}

interface BudgetFormData {
  userId: string;
  month: number;
  year: number;
  amountLimit: number;
  thresholdPercentage: number;
}

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export default function Budgets() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [user, setUser] = useState<any>(null);
  const [formData, setFormData] = useState<BudgetFormData>({
    userId: "",
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    amountLimit: 0,
    thresholdPercentage: 80,
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

  // Get budgets
  const { data: budgetsResponse, isLoading } = useQuery({
    queryKey: ["budgets", user?.id, selectedYear],
    queryFn: async () => {
      if (!user?.id) return { data: [] };
      const response = await budgetsAPI.getAll(user.id);
      return response;
    },
    enabled: !!user?.id,
  });

  const budgets = budgetsResponse?.data || [];

  // Get current budget summary
  const { data: budgetSummary } = useQuery({
    queryKey: ["budget-summary", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const response = await budgetsAPI.getSummary(user.id);
      return response.data;
    },
    enabled: !!user?.id,
  });

  // Create/Update mutation
  const createMutation = useMutation({
    mutationFn: (data: BudgetFormData) => {
      if (editingBudget) {
        return budgetsAPI.update(editingBudget.id, data);
      }
      return budgetsAPI.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budgets"] });
      queryClient.invalidateQueries({ queryKey: ["budget-summary"] });
      setIsModalOpen(false);
      setEditingBudget(null);
      resetForm();
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => budgetsAPI.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budgets"] });
      queryClient.invalidateQueries({ queryKey: ["budget-summary"] });
    },
  });

  const resetForm = () => {
    setFormData({
      userId: user?.id || "",
      month: new Date().getMonth() + 1,
      year: new Date().getFullYear(),
      amountLimit: 0,
      thresholdPercentage: 80,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.amountLimit || formData.amountLimit <= 0) {
      alert("Please enter a valid budget amount");
      return;
    }
    createMutation.mutate(formData);
  };

  const handleEdit = (budget: Budget) => {
    setEditingBudget(budget);
    setFormData({
      userId: budget.userId,
      month: budget.month,
      year: budget.year,
      amountLimit: budget.amountLimit,
      thresholdPercentage: budget.thresholdPercentage,
    });
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm("Are you sure you want to delete this budget?")) {
      deleteMutation.mutate(id);
    }
  };

  const filteredBudgets = budgets.filter(
    (budget: Budget) =>
      budget.year === selectedYear &&
      (MONTHS[budget.month - 1]
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
        budget.amountLimit.toString().includes(searchTerm))
  );

  const currentBudget = budgetSummary?.currentBudget;
  const totalSpent = budgetSummary?.totalSpent || 0;
  const remainingBudget = budgetSummary?.remainingBudget || 0;
  const spendingPercentage = budgetSummary?.spendingPercentage || 0;

  // Prepare chart data
  const chartData = filteredBudgets.map((budget: Budget) => ({
    month: MONTHS[budget.month - 1],
    limit: budget.amountLimit,
    spent: budget.spentAmount,
    remaining: Math.max(0, budget.amountLimit - budget.spentAmount),
  }));

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
            <h1 className="text-2xl font-bold text-gray-900">Budgets</h1>
            <p className="text-gray-600">
              Manage your monthly budgets and track spending
            </p>
          </div>
          <button
            onClick={() => {
              setEditingBudget(null);
              resetForm();
              setIsModalOpen(true);
            }}
            className="btn btn-primary flex items-center"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Budget
          </button>
        </div>

        {/* Current Budget Stats */}
        {currentBudget && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="card p-6">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center">
                  <Target className="w-5 h-5 text-primary-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">
                    Monthly Budget
                  </p>
                  <p className="text-2xl font-semibold text-gray-900">
                    ${currentBudget.amountLimit.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
            <div className="card p-6">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-danger-100 rounded-lg flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-danger-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">
                    Total Spent
                  </p>
                  <p className="text-2xl font-semibold text-gray-900">
                    ${totalSpent.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
            <div className="card p-6">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-success-100 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-success-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Remaining</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    ${remainingBudget.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
            <div className="card p-6">
              <div className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    spendingPercentage > 100
                      ? "bg-danger-100"
                      : spendingPercentage > 80
                      ? "bg-warning-100"
                      : "bg-success-100"
                  }`}
                >
                  <BarChart3
                    className={`w-5 h-5 ${
                      spendingPercentage > 100
                        ? "text-danger-600"
                        : spendingPercentage > 80
                        ? "text-warning-600"
                        : "text-success-600"
                    }`}
                  />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Usage</p>
                  <p
                    className={`text-2xl font-semibold ${
                      spendingPercentage > 100
                        ? "text-danger-600"
                        : spendingPercentage > 80
                        ? "text-warning-600"
                        : "text-success-600"
                    }`}
                  >
                    {spendingPercentage.toFixed(1)}%
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Budget Progress Bar */}
        {currentBudget && (
          <div className="card">
            <div className="card-body">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700">
                  Budget Progress
                </span>
                <span className="text-sm text-gray-500">
                  ${totalSpent.toLocaleString()} / $
                  {currentBudget.amountLimit.toLocaleString()}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div
                  className={`h-2.5 rounded-full ${
                    spendingPercentage > 100
                      ? "bg-danger-600"
                      : spendingPercentage > 80
                      ? "bg-warning-600"
                      : "bg-success-600"
                  }`}
                  style={{ width: `${Math.min(spendingPercentage, 100)}%` }}
                ></div>
              </div>
              {spendingPercentage > 100 && (
                <p className="text-sm text-danger-600 mt-1">
                  You are $
                  {(totalSpent - currentBudget.amountLimit).toLocaleString()}{" "}
                  over budget!
                </p>
              )}
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="card">
          <div className="card-body">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Search budgets..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="input pl-10"
                  />
                </div>
              </div>
              <div className="sm:w-48">
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                  className="input"
                >
                  {Array.from(
                    { length: 5 },
                    (_, i) => new Date().getFullYear() - i
                  ).map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Budget Chart */}
        {chartData.length > 0 && (
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-medium text-gray-900">
                Budget Overview
              </h3>
            </div>
            <div className="card-body">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="limit" fill="#3b82f6" name="Budget Limit" />
                    <Bar dataKey="spent" fill="#ef4444" name="Spent" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* Budgets List */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-medium text-gray-900">
              Monthly Budgets
            </h3>
          </div>
          <div className="card-body">
            {filteredBudgets.length === 0 ? (
              <div className="text-center py-12">
                <Target className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">
                  No budgets
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  Get started by creating your first budget.
                </p>
                <div className="mt-6">
                  <button
                    onClick={() => {
                      setEditingBudget(null);
                      resetForm();
                      setIsModalOpen(true);
                    }}
                    className="btn btn-primary"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Budget
                  </button>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Month/Year
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Budget Limit
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Spent
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Remaining
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Usage
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredBudgets.map((budget: Budget) => {
                      const usagePercentage =
                        (budget.spentAmount / budget.amountLimit) * 100;
                      const isOverBudget = usagePercentage > 100;
                      const isNearLimit =
                        usagePercentage > budget.thresholdPercentage;

                      return (
                        <tr key={budget.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {MONTHS[budget.month - 1]} {budget.year}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            ${budget.amountLimit.toLocaleString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            ${budget.spentAmount.toLocaleString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            $
                            {Math.max(
                              0,
                              budget.amountLimit - budget.spentAmount
                            ).toLocaleString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <span
                                className={`text-sm font-medium ${
                                  isOverBudget
                                    ? "text-danger-600"
                                    : isNearLimit
                                    ? "text-warning-600"
                                    : "text-success-600"
                                }`}
                              >
                                {usagePercentage.toFixed(1)}%
                              </span>
                              {(isOverBudget || isNearLimit) && (
                                <AlertTriangle className="w-4 h-4 text-warning-600 ml-1" />
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <button
                              onClick={() => handleEdit(budget)}
                              className="text-primary-600 hover:text-primary-900 mr-3"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(budget.id)}
                              className="text-danger-600 hover:text-danger-900"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
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
                {editingBudget ? "Edit Budget" : "Add Budget"}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Month *
                  </label>
                  <select
                    value={formData.month}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        month: parseInt(e.target.value),
                      })
                    }
                    className="input w-full"
                    required
                  >
                    {MONTHS.map((month, index) => (
                      <option key={index + 1} value={index + 1}>
                        {month}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Year *
                  </label>
                  <select
                    value={formData.year}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        year: parseInt(e.target.value),
                      })
                    }
                    className="input w-full"
                    required
                  >
                    {Array.from(
                      { length: 5 },
                      (_, i) => new Date().getFullYear() + i
                    ).map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Budget Amount *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.amountLimit}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        amountLimit: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="input w-full"
                    placeholder="0.00"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Alert Threshold (%)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={formData.thresholdPercentage}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        thresholdPercentage: parseInt(e.target.value) || 80,
                      })
                    }
                    className="input w-full"
                    placeholder="80"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Get alerted when spending reaches this percentage of your
                    budget
                  </p>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setIsModalOpen(false);
                      setEditingBudget(null);
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
                      : editingBudget
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
