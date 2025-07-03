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
import { authAPI, expensesAPI, depositsAPI } from "../../lib/api";
import { getAuthToken, getUserId } from "../../lib/utils";
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
import dayjs from "dayjs";

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
      setUser(userData);
    }
  }, [userData]);

  // Get all expenses for summary calculation
  const {
    data: allExpenses = [],
    isLoading: expensesLoading,
    error: expensesError,
  } = useQuery({
    queryKey: ["all-expenses", startDate, endDate],
    queryFn: async () => {
      const token = getAuthToken();
      if (!token) throw new Error("No authentication token");

      const userId = getUserId();
      if (!userId) throw new Error("No user ID found");

      const response = await expensesAPI.getAll(userId, { startDate, endDate });
      return response.data || [];
    },
  });

  // Get all deposits for summary calculation
  const {
    data: allDeposits = [],
    isLoading: depositsLoading,
    error: depositsError,
  } = useQuery({
    queryKey: ["all-deposits", startDate, endDate],
    queryFn: async () => {
      const token = getAuthToken();
      if (!token) throw new Error("No authentication token");

      const userId = getUserId();
      if (!userId) throw new Error("No user ID found");

      const response = await depositsAPI.getAll(userId, { startDate, endDate });
      return response.data || [];
    },
  });

  // Get recent expenses (first 5)
  const recentExpenses = allExpenses.slice(0, 5);

  // Get recent deposits (first 5)
  const recentDeposits = allDeposits.slice(0, 5);

  // Calculate totals from actual data
  const totalExpenses = allExpenses.reduce(
    (sum: number, expense: any) => Number(sum) + Number(expense.amount),
    0
  );
  const totalIncome = allDeposits.reduce(
    (sum: number, deposit: any) => Number(sum) + Number(deposit.amount),
    0
  );
  const netSavings = totalIncome - totalExpenses;

  // Calculate expenses by category
  const expensesByCategory = allExpenses.reduce((acc: any, expense: any) => {
    const categoryName = expense.category?.name || "Other";
    if (!acc[categoryName]) {
      acc[categoryName] = { category: categoryName, amount: 0, count: 0 };
    }
    acc[categoryName].amount += Number(expense.amount);
    acc[categoryName].count += 1;
    return acc;
  }, {});

  const expenseCategories = Object.values(expensesByCategory).map(
    (cat: any, index: number) => ({
      name: cat.category,
      value: Number(cat.amount),
      color: COLORS[index % COLORS.length],
    })
  );

  // Calculate monthly totals for current and previous month
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const prevMonthDate = new Date(currentYear, currentMonth - 1, 1);
  const prevMonth = prevMonthDate.getMonth();
  const prevYear = prevMonthDate.getFullYear();

  // Helper to sum amounts for a given month/year
  function sumForMonth(
    items: any[],
    dateKey: string,
    month: number,
    year: number
  ) {
    return items
      .filter((item) => {
        const d = new Date(item[dateKey]);
        return d.getMonth() === month && d.getFullYear() === year;
      })
      .reduce((sum, item) => sum + Number(item.amount), 0);
  }

  const incomeThisMonth = sumForMonth(
    allDeposits,
    "date",
    currentMonth,
    currentYear
  );
  const incomeLastMonth = sumForMonth(allDeposits, "date", prevMonth, prevYear);
  const expensesThisMonth = sumForMonth(
    allExpenses,
    "date",
    currentMonth,
    currentYear
  );
  const expensesLastMonth = sumForMonth(
    allExpenses,
    "date",
    prevMonth,
    prevYear
  );

  // Calculate percentage change
  function percentChange(current: number, prev: number) {
    if (prev === 0 && current === 0) return 0;
    if (prev === 0) return 100;
    return ((current - prev) / Math.abs(prev)) * 100;
  }

  const incomeChange = percentChange(incomeThisMonth, incomeLastMonth);
  const expensesChange = percentChange(expensesThisMonth, expensesLastMonth);

  // Calculate monthly trend (last 6 months)
  const monthlyTrend = [];
  for (let i = 5; i >= 0; i--) {
    const month = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthName = month.toLocaleDateString("en-US", { month: "short" });

    const monthExpenses = allExpenses.filter((expense: any) => {
      const expenseDate = new Date(expense.date);
      return (
        expenseDate.getMonth() === month.getMonth() &&
        expenseDate.getFullYear() === month.getFullYear()
      );
    });

    const monthDeposits = allDeposits.filter((deposit: any) => {
      const depositDate = new Date(deposit.date);
      return (
        depositDate.getMonth() === month.getMonth() &&
        depositDate.getFullYear() === month.getFullYear()
      );
    });

    monthlyTrend.push({
      month: monthName,
      expenses: monthExpenses.reduce(
        (sum: number, expense: any) => Number(sum) + Number(expense.amount),
        0
      ),
      deposits: monthDeposits.reduce(
        (sum: number, deposit: any) => Number(sum) + Number(deposit.amount),
        0
      ),
    });
  }

  const isLoading = expensesLoading || depositsLoading;
  const hasError = expensesError || depositsError;

  // Debug logging
  console.log("All expenses:", allExpenses);
  console.log("All deposits:", allDeposits);
  console.log("Total expenses:", totalExpenses);
  console.log("Total income:", totalIncome);
  console.log("Net savings:", netSavings);
  console.log("Expense categories:", expenseCategories);
  console.log("Monthly trend:", monthlyTrend);
  console.log("Expenses error:", expensesError);
  console.log("Deposits error:", depositsError);

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (hasError) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Error loading data
            </h3>
            <p className="text-gray-600 mb-4">
              {expensesError?.message ||
                depositsError?.message ||
                "Failed to load dashboard data"}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="btn btn-primary"
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
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">Welcome back, {user?.name || "User"}!</p>
        </div>

        {/* Date Range Filter */}
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
              {incomeChange >= 0 ? (
                <ArrowUpRight className="w-4 h-4 text-success-600" />
              ) : (
                <ArrowDownRight className="w-4 h-4 text-danger-600" />
              )}
              <span
                className={
                  incomeChange >= 0
                    ? "text-success-600 font-medium"
                    : "text-danger-600 font-medium"
                }
              >
                {incomeChange >= 0 ? "+" : ""}
                {incomeChange.toFixed(1)}%
              </span>
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
              {expensesChange >= 0 ? (
                <ArrowUpRight className="w-4 h-4 text-danger-600" />
              ) : (
                <ArrowDownRight className="w-4 h-4 text-success-600" />
              )}
              <span
                className={
                  expensesChange >= 0
                    ? "text-danger-600 font-medium"
                    : "text-success-600 font-medium"
                }
              >
                {expensesChange >= 0 ? "+" : ""}
                {expensesChange.toFixed(1)}%
              </span>
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
                <p
                  className={`text-2xl font-semibold ${
                    netSavings >= 0 ? "text-success-600" : "text-danger-600"
                  }`}
                >
                  {netSavings >= 0 ? "On Track" : "Over Budget"}
                </p>
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <Calendar className="w-4 h-4 text-gray-400" />
              <span className="text-gray-500 ml-2">
                {new Date().toLocaleDateString("en-US", {
                  month: "long",
                  // day: "numeric",
                  year: "numeric",
                })}
              </span>
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
                          {expense.category?.name || "Unknown"}
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
