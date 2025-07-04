import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  BarChart3,
  Download,
  Brain,
  TrendingUp,
  Calendar,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Clock,
  Lightbulb,
  DollarSign,
  PiggyBank,
  Target,
  Filter,
  Eye,
  EyeOff,
} from "lucide-react";
import { reportsAPI, expensesAPI, depositsAPI, API_HOST } from "../../lib/api";
import { requireAuth, formatCurrency } from "../../lib/utils";
import DashboardLayout from "../../layouts/DashboardLayout";
import dayjs from "dayjs";

interface AISuggestion {
  id: string;
  userId: string;
  title: string;
  suggestion: string;
  createdAt: string;
  category: string;
  isRead: boolean;
  priority: "LOW" | "MEDIUM" | "HIGH";
}

interface MonthlyReport {
  id: string;
  month: number;
  year: number;
  monthName: string;
  totalExpense: string;
  totalIncome: string;
  netSavings: string;
  savingsRate: string;
  budgetStatus: "UNDER_BUDGET" | "OVER_BUDGET" | "ON_BUDGET";
  pdfUrl: string;
  generatedAt: string;
}

export default function Reports() {
  // Ensure user is authenticated
  requireAuth();

  const [activeTab, setActiveTab] = useState("insights");
  const [selectedMonth, setSelectedMonth] = useState(dayjs().month() + 1);
  const [selectedYear, setSelectedYear] = useState(dayjs().year());
  const [selectedCategory, setSelectedCategory] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [showReadSuggestions, setShowReadSuggestions] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState("en");

  const queryClient = useQueryClient();

  // Get AI suggestions
  const { data: suggestionsResponse, isLoading: suggestionsLoading } = useQuery(
    {
      queryKey: ["ai-suggestions"],
      queryFn: async () => {
        const response = await reportsAPI.getAllSuggestions();
        return response;
      },
    }
  );

  const suggestions: AISuggestion[] = suggestionsResponse?.data || [];

  // Get monthly reports
  const { data: reportsResponse, isLoading: reportsLoading } = useQuery({
    queryKey: ["monthly-reports"],
    queryFn: async () => {
      const response = await reportsAPI.getReports();
      return response;
    },
  });

  const monthlyReports: MonthlyReport[] = reportsResponse?.reports || [];

  // Get expenses for analytics
  const { data: expensesResponse } = useQuery({
    queryKey: ["expenses-analytics"],
    queryFn: async () => {
      // Use empty string as userId since the API uses JWT tokens on the backend
      const response = await expensesAPI.getAll("", {
        startDate: undefined,
        endDate: undefined,
      });
      return response;
    },
  });

  const expenses = expensesResponse?.data || [];

  // Get deposits for analytics
  const { data: depositsResponse } = useQuery({
    queryKey: ["deposits-analytics"],
    queryFn: async () => {
      // Use empty string as userId since the API uses JWT tokens on the backend
      const response = await depositsAPI.getAll("", {
        startDate: undefined,
        endDate: undefined,
      });
      return response;
    },
  });

  const deposits = depositsResponse?.data || [];

  // Generate AI suggestions mutation
  const generateSuggestionsMutation = useMutation({
    mutationFn: async (category?: string) => {
      const response = await reportsAPI.getAiSuggestions(category);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-suggestions"] });
    },
  });

  // Generate monthly report mutation
  const generateReportMutation = useMutation({
    mutationFn: async ({
      month,
      year,
      language,
    }: {
      month: number;
      year: number;
      language: string;
    }) => {
      const response = await reportsAPI.generateMonthlyReport(
        month,
        year,
        language
      );
      return response;
    },
    onSuccess: (data) => {
      // Refresh reports list after generating new report
      queryClient.invalidateQueries({ queryKey: ["monthly-reports"] });
      console.log("Report generated:", data);
    },
  });

  // Mark suggestion as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await reportsAPI.markSuggestionAsRead(id);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-suggestions"] });
    },
  });

  const handleGenerateAISuggestions = () => {
    generateSuggestionsMutation.mutate(selectedCategory || undefined);
  };

  const handleGenerateReport = () => {
    generateReportMutation.mutate({
      month: selectedMonth,
      year: selectedYear,
      language: selectedLanguage,
    });
  };

  const handleMarkAsRead = (id: string) => {
    markAsReadMutation.mutate(id);
  };

  // Filter suggestions
  const filteredSuggestions = suggestions.filter((suggestion) => {
    const matchesCategory =
      !selectedCategory || suggestion.category.includes(selectedCategory);
    const matchesPriority =
      !priorityFilter || suggestion.priority === priorityFilter;
    const matchesReadStatus = showReadSuggestions || !suggestion.isRead;
    return matchesCategory && matchesPriority && matchesReadStatus;
  });

  // Analytics calculations
  const totalExpenses = expenses.reduce(
    (sum: number, expense: any) => sum + (parseFloat(expense.amount) || 0),
    0
  );
  const totalDeposits = deposits.reduce(
    (sum: number, deposit: any) => sum + (parseFloat(deposit.amount) || 0),
    0
  );
  const netFlow = totalDeposits - totalExpenses;

  // Category breakdown
  const categoryBreakdown = expenses.reduce(
    (acc: Record<string, number>, expense: any) => {
      const categoryName = expense.category?.name || "Uncategorized";
      acc[categoryName] =
        (acc[categoryName] || 0) + (parseFloat(expense.amount) || 0);
      return acc;
    },
    {} as Record<string, number>
  );

  // Monthly trends
  const monthlyData = expenses.reduce(
    (acc: Record<string, number>, expense: any) => {
      const month = dayjs(expense.date).format("YYYY-MM");
      acc[month] = (acc[month] || 0) + (parseFloat(expense.amount) || 0);
      return acc;
    },
    {} as Record<string, number>
  );

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case "HIGH":
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      case "MEDIUM":
        return <Clock className="w-4 h-4 text-yellow-500" />;
      default:
        return <CheckCircle className="w-4 h-4 text-green-500" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "HIGH":
        return "bg-red-100 text-red-800 border-red-200";
      case "MEDIUM":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      default:
        return "bg-green-100 text-green-800 border-green-200";
    }
  };

  const getCategoryIcon = (category: string) => {
    if (category.includes("BUDGET")) return "💰";
    if (category.includes("SAVINGS")) return "🏦";
    if (category.includes("INCOME")) return "💸";
    if (category.includes("SPENDING")) return "🛍️";
    return "💡";
  };

  const getBudgetStatusColor = (status: string) => {
    switch (status) {
      case "UNDER_BUDGET":
        return "bg-green-100 text-green-800 border-green-200";
      case "OVER_BUDGET":
        return "bg-red-100 text-red-800 border-red-200";
      case "ON_BUDGET":
        return "bg-blue-100 text-blue-800 border-blue-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getBudgetStatusIcon = (status: string) => {
    switch (status) {
      case "UNDER_BUDGET":
        return "✅";
      case "OVER_BUDGET":
        return "⚠️";
      case "ON_BUDGET":
        return "📊";
      default:
        return "📈";
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Reports & Analytics
            </h1>
            <p className="text-gray-600">
              Comprehensive financial insights and AI-powered recommendations
            </p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={handleGenerateAISuggestions}
              disabled={generateSuggestionsMutation.isPending}
              className="btn btn-secondary flex items-center"
            >
              <Brain className="w-4 h-4 mr-2" />
              {generateSuggestionsMutation.isPending
                ? "Generating..."
                : "Get AI Insights"}
            </button>
            <button
              onClick={handleGenerateReport}
              disabled={generateReportMutation.isPending}
              className="btn btn-primary flex items-center"
            >
              <Download className="w-4 h-4 mr-2" />
              {generateReportMutation.isPending
                ? "Generating..."
                : "Generate Report"}
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab("insights")}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === "insights"
                  ? "border-primary-500 text-primary-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              <Brain className="w-4 h-4 inline mr-2" />
              AI Insights
            </button>
            <button
              onClick={() => setActiveTab("analytics")}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === "analytics"
                  ? "border-primary-500 text-primary-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              <TrendingUp className="w-4 h-4 inline mr-2" />
              Analytics
            </button>
            <button
              onClick={() => setActiveTab("reports")}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === "reports"
                  ? "border-primary-500 text-primary-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              <BarChart3 className="w-4 h-4 inline mr-2" />
              Monthly Reports
            </button>
          </nav>
        </div>

        {/* AI Insights Tab */}
        {activeTab === "insights" && (
          <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="card p-6">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Lightbulb className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">
                      Total Suggestions
                    </p>
                    <p className="text-2xl font-semibold text-gray-900">
                      {suggestions.length}
                    </p>
                  </div>
                </div>
              </div>
              <div className="card p-6">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                    <AlertCircle className="w-5 h-5 text-red-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">
                      High Priority
                    </p>
                    <p className="text-2xl font-semibold text-gray-900">
                      {suggestions.filter((s) => s.priority === "HIGH").length}
                    </p>
                  </div>
                </div>
              </div>
              <div className="card p-6">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                    <Clock className="w-5 h-5 text-yellow-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Unread</p>
                    <p className="text-2xl font-semibold text-gray-900">
                      {suggestions.filter((s) => !s.isRead).length}
                    </p>
                  </div>
                </div>
              </div>
              <div className="card p-6">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">
                      Categories
                    </p>
                    <p className="text-2xl font-semibold text-gray-900">
                      {
                        new Set(
                          suggestions.map((s) => s.category.split("|")[0])
                        ).size
                      }
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
                      <select
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        className="input w-full pl-10 pr-10 appearance-none bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                      >
                        <option value="">All Categories</option>
                        <option value="BUDGET">Budget</option>
                        <option value="SAVINGS">Savings</option>
                        <option value="INCOME">Income</option>
                        <option value="SPENDING_PATTERN">
                          Spending Pattern
                        </option>
                      </select>
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="text-gray-400">📂</span>
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
                  <div className="flex-1">
                    <div className="relative">
                      <select
                        value={priorityFilter}
                        onChange={(e) => setPriorityFilter(e.target.value)}
                        className="input w-full pl-10 pr-10 appearance-none bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                      >
                        <option value="">All Priorities</option>
                        <option value="HIGH">High Priority</option>
                        <option value="MEDIUM">Medium Priority</option>
                        <option value="LOW">Low Priority</option>
                      </select>
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="text-gray-400">⭐</span>
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
                  <button
                    onClick={() => setShowReadSuggestions(!showReadSuggestions)}
                    className="btn btn-secondary flex items-center"
                  >
                    {showReadSuggestions ? (
                      <EyeOff className="w-4 h-4 mr-2" />
                    ) : (
                      <Eye className="w-4 h-4 mr-2" />
                    )}
                    {showReadSuggestions ? "Hide Read" : "Show Read"}
                  </button>
                </div>
              </div>
            </div>

            {/* Suggestions List */}
            <div className="card">
              <div className="card-header">
                <h3 className="text-lg font-medium text-gray-900">
                  AI Suggestions
                </h3>
              </div>
              <div className="card-body">
                {suggestionsLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <RefreshCw className="w-8 h-8 animate-spin text-primary-600" />
                  </div>
                ) : filteredSuggestions.length === 0 ? (
                  <div className="text-center py-12">
                    <Brain className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">
                      No suggestions found
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Try adjusting your filters or generate new AI insights.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredSuggestions.map((suggestion) => (
                      <div
                        key={suggestion.id}
                        className={`p-4 rounded-lg border ${
                          suggestion.isRead
                            ? "bg-gray-50 border-gray-200 opacity-75"
                            : "bg-white border-gray-300 shadow-sm"
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center mb-2">
                              <span className="text-lg mr-2">
                                {getCategoryIcon(suggestion.category)}
                              </span>
                              <h4
                                className={`text-sm font-medium ${
                                  suggestion.isRead
                                    ? "text-gray-600"
                                    : "text-gray-900"
                                }`}
                              >
                                {suggestion.title}
                                {suggestion.isRead && (
                                  <span className="ml-2 text-xs text-green-600 font-normal">
                                    ✓ Read
                                  </span>
                                )}
                              </h4>
                              <div className="ml-2 flex items-center">
                                {getPriorityIcon(suggestion.priority)}
                              </div>
                            </div>
                            <p className="text-sm text-gray-600 mb-3">
                              {suggestion.suggestion}
                            </p>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-3">
                                <span
                                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getPriorityColor(
                                    suggestion.priority
                                  )}`}
                                >
                                  {suggestion.priority}
                                </span>
                                <span className="text-xs text-gray-500">
                                  {suggestion.category.replace(/\|/g, " • ")}
                                </span>
                                {!suggestion.isRead && (
                                  <button
                                    onClick={() =>
                                      handleMarkAsRead(suggestion.id)
                                    }
                                    disabled={markAsReadMutation.isPending}
                                    className="text-xs text-primary-600 hover:text-primary-800 font-medium"
                                  >
                                    {markAsReadMutation.isPending
                                      ? "Marking..."
                                      : "Mark as Read"}
                                  </button>
                                )}
                              </div>
                              <span className="text-xs text-gray-500">
                                {dayjs(suggestion.createdAt).format(
                                  "MMM D, YYYY"
                                )}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === "analytics" && (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="card p-6">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                    <DollarSign className="w-5 h-5 text-red-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">
                      Total Expenses
                    </p>
                    <p className="text-2xl font-semibold text-gray-900">
                      {formatCurrency(Number(totalExpenses || 0))}
                    </p>
                  </div>
                </div>
              </div>
              <div className="card p-6">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                    <PiggyBank className="w-5 h-5 text-green-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">
                      Total Deposits
                    </p>
                    <p className="text-2xl font-semibold text-gray-900">
                      {formatCurrency(Number(totalDeposits || 0))}
                    </p>
                  </div>
                </div>
              </div>
              <div className="card p-6">
                <div className="flex items-center">
                  <div
                    className={`w-8 h-8 ${
                      netFlow >= 0 ? "bg-green-100" : "bg-red-100"
                    } rounded-lg flex items-center justify-center`}
                  >
                    <TrendingUp
                      className={`w-5 h-5 ${
                        netFlow >= 0 ? "text-green-600" : "text-red-600"
                      }`}
                    />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">
                      Net Flow
                    </p>
                    <p
                      className={`text-2xl font-semibold ${
                        netFlow >= 0 ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {formatCurrency(Number(netFlow || 0))}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Category Breakdown */}
            <div className="card">
              <div className="card-header">
                <h3 className="text-lg font-medium text-gray-900">
                  Expenses by Category
                </h3>
              </div>
              <div className="card-body">
                {Object.keys(categoryBreakdown).length === 0 ? (
                  <div className="text-center py-8">
                    <BarChart3 className="mx-auto h-12 w-12 text-gray-400" />
                    <p className="mt-2 text-sm text-gray-500">
                      No expense data available
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {Object.entries(categoryBreakdown)
                      .sort(([, a], [, b]) => (b as number) - (a as number))
                      .map(([category, amount]) => {
                        const percentage =
                          totalExpenses > 0
                            ? ((amount as number) / totalExpenses) * 100
                            : 0;
                        return (
                          <div
                            key={category}
                            className="flex items-center justify-between"
                          >
                            <div className="flex-1">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-sm font-medium text-gray-900">
                                  {category}
                                </span>
                                <span className="text-sm text-gray-600">
                                  {formatCurrency(amount as number)} (
                                  {percentage.toFixed(1)}
                                  %)
                                </span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                  className="bg-primary-600 h-2 rounded-full"
                                  style={{ width: `${percentage}%` }}
                                ></div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
            </div>

            {/* Monthly Trends */}
            <div className="card">
              <div className="card-header">
                <h3 className="text-lg font-medium text-gray-900">
                  Monthly Expense Trends
                </h3>
              </div>
              <div className="card-body">
                {Object.keys(monthlyData).length === 0 ? (
                  <div className="text-center py-8">
                    <TrendingUp className="mx-auto h-12 w-12 text-gray-400" />
                    <p className="mt-2 text-sm text-gray-500">
                      No monthly data available
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {Object.entries(monthlyData)
                      .sort(
                        ([a], [b]) =>
                          new Date(b).getTime() - new Date(a).getTime()
                      )
                      .slice(0, 6)
                      .map(([month, amount]) => (
                        <div
                          key={month}
                          className="flex items-center justify-between"
                        >
                          <span className="text-sm font-medium text-gray-900">
                            {dayjs(month).format("MMMM YYYY")}
                          </span>
                          <span className="text-sm text-gray-600">
                            {formatCurrency(amount as number)}
                          </span>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Monthly Reports Tab */}
        {activeTab === "reports" && (
          <div className="space-y-6">
            {/* Reports Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="card p-6">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                    <BarChart3 className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">
                      Total Reports
                    </p>
                    <p className="text-2xl font-semibold text-gray-900">
                      {monthlyReports.length}
                    </p>
                  </div>
                </div>
              </div>
              <div className="card p-6">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">
                      Under Budget
                    </p>
                    <p className="text-2xl font-semibold text-gray-900">
                      {
                        monthlyReports.filter(
                          (r) => r.budgetStatus === "UNDER_BUDGET"
                        ).length
                      }
                    </p>
                  </div>
                </div>
              </div>
              <div className="card p-6">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                    <PiggyBank className="w-5 h-5 text-yellow-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">
                      Avg Savings Rate
                    </p>
                    <p className="text-2xl font-semibold text-gray-900">
                      {monthlyReports.length > 0
                        ? (
                            monthlyReports.reduce(
                              (sum, r) => sum + parseFloat(r.savingsRate),
                              0
                            ) / monthlyReports.length
                          ).toFixed(1)
                        : "0.0"}
                      %
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Report Generation */}
            <div className="card">
              <div className="card-header">
                <h3 className="text-lg font-medium text-gray-900">
                  Generate Monthly Report
                </h3>
              </div>
              <div className="card-body">
                <div className="flex flex-col sm:flex-row gap-4 mb-6">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Month
                    </label>
                    <select
                      value={selectedMonth}
                      onChange={(e) =>
                        setSelectedMonth(parseInt(e.target.value))
                      }
                      className="input w-full"
                    >
                      {Array.from({ length: 12 }, (_, i) => (
                        <option key={i + 1} value={i + 1}>
                          {dayjs().month(i).format("MMMM")}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Year
                    </label>
                    <select
                      value={selectedYear}
                      onChange={(e) =>
                        setSelectedYear(parseInt(e.target.value))
                      }
                      className="input w-full"
                    >
                      {Array.from({ length: 5 }, (_, i) => {
                        const year = dayjs().year() - 2 + i;
                        return (
                          <option key={year} value={year}>
                            {year}
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Language
                    </label>
                    <select
                      value={selectedLanguage}
                      onChange={(e) => setSelectedLanguage(e.target.value)}
                      className="input w-full"
                    >
                      <option value="en">English</option>
                      <option value="hi">हिन्दी</option>
                      <option value="pa">ਪੰਜਾਬੀ</option>
                    </select>
                  </div>
                </div>
                <button
                  onClick={handleGenerateReport}
                  disabled={generateReportMutation.isPending}
                  className="btn btn-primary"
                >
                  <div className="flex items-center">
                    <Download className="w-4 h-4 mr-2" />
                    {generateReportMutation.isPending
                      ? "Generating Report..."
                      : "Generate Report"}
                  </div>
                </button>
              </div>
            </div>

            {/* Recent Reports */}
            <div className="card">
              <div className="card-header">
                <h3 className="text-lg font-medium text-gray-900">
                  Recent Reports
                </h3>
              </div>
              <div className="card-body">
                {reportsLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <RefreshCw className="w-8 h-8 animate-spin text-primary-600" />
                  </div>
                ) : monthlyReports.length === 0 ? (
                  <div className="text-center py-12">
                    <BarChart3 className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">
                      No reports generated yet
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Generate your first monthly report to see it here.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {monthlyReports.map((report) => (
                      <div
                        key={report.id}
                        className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center">
                            <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center mr-3">
                              <BarChart3 className="w-5 h-5 text-primary-600" />
                            </div>
                            <div>
                              <h4 className="text-sm font-semibold text-gray-900">
                                {report.monthName} {report.year} Report
                              </h4>
                              <p className="text-xs text-gray-500">
                                Generated on{" "}
                                {dayjs(report.generatedAt).format(
                                  "MMM D, YYYY at h:mm A"
                                )}
                              </p>
                            </div>
                          </div>
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getBudgetStatusColor(
                              report.budgetStatus
                            )}`}
                          >
                            {getBudgetStatusIcon(report.budgetStatus)}
                            <span className="ml-1">
                              {report.budgetStatus.replace("_", " ")}
                            </span>
                          </span>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                          <div className="text-center">
                            <p className="text-xs text-gray-500">
                              Total Income
                            </p>
                            <p className="text-sm font-semibold text-green-600">
                              {formatCurrency(parseFloat(report.totalIncome))}
                            </p>
                          </div>
                          <div className="text-center">
                            <p className="text-xs text-gray-500">
                              Total Expenses
                            </p>
                            <p className="text-sm font-semibold text-red-600">
                              {formatCurrency(parseFloat(report.totalExpense))}
                            </p>
                          </div>
                          <div className="text-center">
                            <p className="text-xs text-gray-500">Net Savings</p>
                            <p
                              className={`text-sm font-semibold ${
                                parseFloat(report.netSavings) >= 0
                                  ? "text-green-600"
                                  : "text-red-600"
                              }`}
                            >
                              {formatCurrency(parseFloat(report.netSavings))}
                            </p>
                          </div>
                          <div className="text-center">
                            <p className="text-xs text-gray-500">
                              Savings Rate
                            </p>
                            <p className="text-sm font-semibold text-blue-600">
                              {parseFloat(report.savingsRate).toFixed(1)}%
                            </p>
                          </div>
                        </div>

                        {report?.pdfUrl ? (
                          <div className="flex justify-end">
                            <a
                              href={`${API_HOST}${report.pdfUrl}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center text-sm text-primary-600 hover:text-primary-800 font-medium"
                            >
                              <Download className="w-4 h-4 mr-1" />
                              Download PDF
                            </a>
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
