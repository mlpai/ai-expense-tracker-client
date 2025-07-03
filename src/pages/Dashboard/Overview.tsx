import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  AlertTriangle,
  DollarSign,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { authAPI, dashboardAPI, expensesAPI, depositsAPI } from "../../lib/api";
import DashboardLayout from "../../layouts/DashboardLayout";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

interface DashboardStats {
  totalExpenses: number;
  totalIncome: number;
  netSavings: number;
  expensesByCategory: Array<{
    category: string;
    amount: number;
    count: number;
  }>;
  expensesByMonth: Array<{
    month: string;
    amount: number;
  }>;
}

interface User {
  id: string;
  name: string;
  email: string;
}

const COLORS = [
  "#0088FE",
  "#00C49F",
  "#FFBB28",
  "#FF8042",
  "#8884D8",
  "#82CA9D",
];

export default function Overview() {
  const [user, setUser] = useState<User | null>(null);

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
    }
  }, [userData]);

  // Get expense summary
  const { data: expenseSummary, isLoading: summaryLoading } = useQuery({
    queryKey: ["expense-summary", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const response = await dashboardAPI.getStats(user.id);
      return response.data;
    },
    enabled: !!user?.id,
  });

  // Get recent expenses
  const { data: recentExpenses = [], isLoading: expensesLoading } = useQuery({
    queryKey: ["recent-expenses", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const response = await expensesAPI.getAll(user.id);
      return (response.data || []).slice(0, 5);
    },
    enabled: !!user?.id,
  });

  // Get recent deposits
  const { data: recentDeposits = [], isLoading: depositsLoading } = useQuery({
    queryKey: ["recent-deposits", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const response = await depositsAPI.getAll(user.id);
      return (response.data || []).slice(0, 5);
    },
    enabled: !!user?.id,
  });

  // Calculate totals
  const totalExpenses = expenseSummary?.totalExpenses || 0;
  const totalIncome = expenseSummary?.totalIncome || 0;
  const netSavings = expenseSummary?.netSavings || 0;

  // Process expense categories for pie chart
  const expenseCategories =
    expenseSummary?.expensesByCategory?.map((cat: any, index: number) => ({
      name: cat.category,
      value: cat.amount,
      color: COLORS[index % COLORS.length],
    })) || [];

  // Process monthly trend for line chart
  const monthlyTrend =
    expenseSummary?.expensesByMonth?.map((item: any) => ({
      month: item.month,
      expenses: item.amount,
      deposits: 0, // This would need to be calculated from deposits data
    })) || [];

  const isLoading = summaryLoading || expensesLoading || depositsLoading;

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
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">Welcome back, {user?.name || "User"}!</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="card p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-success-100 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-success-600" />
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">
                  Total Income
                </p>
                <p className="text-2xl font-semibold text-gray-900">
                  ${totalIncome.toLocaleString()}
                </p>
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <ArrowUpRight className="w-4 h-4 text-success-600" />
              <span className="text-success-600 font-medium">+12.5%</span>
              <span className="text-gray-500 ml-1">from last month</span>
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-danger-100 rounded-lg flex items-center justify-center">
                  <TrendingDown className="w-5 h-5 text-danger-600" />
                </div>
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
            <div className="mt-4 flex items-center text-sm">
              <ArrowDownRight className="w-4 h-4 text-danger-600" />
              <span className="text-danger-600 font-medium">+8.2%</span>
              <span className="text-gray-500 ml-1">from last month</span>
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center">
                  <Wallet className="w-5 h-5 text-primary-600" />
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Net Savings</p>
                <p
                  className={`text-2xl font-semibold ${
                    netSavings >= 0 ? "text-success-600" : "text-danger-600"
                  }`}
                >
                  ${Math.abs(netSavings).toLocaleString()}
                </p>
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              {netSavings >= 0 ? (
                <>
                  <ArrowUpRight className="w-4 h-4 text-success-600" />
                  <span className="text-success-600 font-medium">Positive</span>
                </>
              ) : (
                <>
                  <ArrowDownRight className="w-4 h-4 text-danger-600" />
                  <span className="text-danger-600 font-medium">Negative</span>
                </>
              )}
              <span className="text-gray-500 ml-1">this month</span>
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-warning-100 rounded-lg flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-warning-600" />
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">
                  Budget Status
                </p>
                <p className="text-2xl font-semibold text-gray-900">
                  {expenseSummary?.budgetStatus || "N/A"}
                </p>
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <Calendar className="w-4 h-4 text-gray-400" />
              <span className="text-gray-500">Current month</span>
            </div>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Monthly Trend Chart */}
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-medium text-gray-900">
                Monthly Trend
              </h3>
            </div>
            <div className="card-body">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={monthlyTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="expenses"
                      stroke="#ef4444"
                      strokeWidth={2}
                      name="Expenses"
                    />
                    <Line
                      type="monotone"
                      dataKey="deposits"
                      stroke="#10b981"
                      strokeWidth={2}
                      name="Income"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Expense Categories Chart */}
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-medium text-gray-900">
                Expenses by Category
              </h3>
            </div>
            <div className="card-body">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={expenseCategories}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) =>
                        `${name} ${((percent || 0) * 100).toFixed(0)}%`
                      }
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {expenseCategories.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Expenses */}
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-medium text-gray-900">
                Recent Expenses
              </h3>
            </div>
            <div className="card-body">
              {recentExpenses.length === 0 ? (
                <div className="text-center py-8">
                  <DollarSign className="mx-auto h-12 w-12 text-gray-400" />
                  <p className="mt-2 text-sm text-gray-500">
                    No recent expenses
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {recentExpenses.slice(0, 5).map((expense: any) => (
                    <div
                      key={expense.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-danger-100 rounded-lg flex items-center justify-center">
                          <DollarSign className="w-4 h-4 text-danger-600" />
                        </div>
                        <div className="ml-3">
                          <p className="text-sm font-medium text-gray-900">
                            {expense.note || "Expense"}
                          </p>
                          <p className="text-xs text-gray-500">
                            {new Date(expense.date).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-danger-600">
                          -${expense.amount}
                        </p>
                        <p className="text-xs text-gray-500">
                          {expense.expenseType?.name || "Unknown"}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Recent Deposits */}
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-medium text-gray-900">
                Recent Deposits
              </h3>
            </div>
            <div className="card-body">
              {recentDeposits.length === 0 ? (
                <div className="text-center py-8">
                  <TrendingUp className="mx-auto h-12 w-12 text-gray-400" />
                  <p className="mt-2 text-sm text-gray-500">
                    No recent deposits
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {recentDeposits.slice(0, 5).map((deposit: any) => (
                    <div
                      key={deposit.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-success-100 rounded-lg flex items-center justify-center">
                          <TrendingUp className="w-4 h-4 text-success-600" />
                        </div>
                        <div className="ml-3">
                          <p className="text-sm font-medium text-gray-900">
                            {deposit.note || "Deposit"}
                          </p>
                          <p className="text-xs text-gray-500">
                            {new Date(deposit.date).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-success-600">
                          +${deposit.amount}
                        </p>
                        <p className="text-xs text-gray-500">
                          {deposit.depositType?.name || "Unknown"}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
