import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Edit,
  Trash2,
  Search,
  TrendingUp,
  DollarSign,
  Calendar,
  CreditCard,
} from "lucide-react";
import {
  depositsAPI,
  categoriesAPI,
  bankAccountsAPI,
  authAPI,
} from "../../lib/api";
import { getAuthToken, getUserId } from "../../lib/utils";
import DashboardLayout from "../../layouts/DashboardLayout";
import dayjs from "dayjs";

interface Deposit {
  id: string;
  userId: string;
  bankAccountId: string;
  depositTypeId: string;
  amount: number;
  note?: string;
  date: string;
  bankAccount?: {
    name: string;
    bankName: string;
  };
  depositType?: {
    name: string;
    color?: string;
  };
}

interface DepositFormData {
  userId: string;
  bankAccountId: string;
  depositTypeId: string;
  amount: number;
  note?: string;
  date: string;
}

export default function Deposits() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDeposit, setEditingDeposit] = useState<Deposit | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState("");
  const [user, setUser] = useState<any>(null);
  const [formData, setFormData] = useState<DepositFormData>({
    userId: "",
    bankAccountId: "",
    depositTypeId: "",
    amount: 0,
    note: "",
    date: new Date().toISOString().split("T")[0],
  });
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
      setUser(userData);
      setFormData((prev) => ({ ...prev, userId: userData.id }));
    }
  }, [userData]);

  // Get deposits
  const { data: depositsResponse, isLoading } = useQuery({
    queryKey: ["deposits", searchTerm, selectedType, startDate, endDate],
    queryFn: async () => {
      const token = getAuthToken();
      if (!token) throw new Error("No authentication token");

      const userId = getUserId();
      if (!userId) throw new Error("No user ID found");

      const response = await depositsAPI.getAll(userId, { startDate, endDate });
      return response;
    },
  });

  const deposits = depositsResponse?.data || [];

  // Get deposit types
  const { data: depositTypesResponse } = useQuery({
    queryKey: ["deposit-types"],
    queryFn: async () => {
      const token = getAuthToken();
      if (!token) throw new Error("No authentication token");

      const response = await categoriesAPI.getDepositTypes();
      return response;
    },
  });

  const depositTypes = depositTypesResponse?.data || [];

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
    mutationFn: (data: DepositFormData) => {
      if (editingDeposit) {
        return depositsAPI.update(editingDeposit.id, data);
      }
      return depositsAPI.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deposits"] });
      setIsModalOpen(false);
      setEditingDeposit(null);
      resetForm();
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => depositsAPI.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deposits"] });
    },
  });

  const resetForm = () => {
    const userId = getUserId();
    setFormData({
      userId: userId || "",
      bankAccountId: "",
      depositTypeId: "",
      amount: 0,
      note: "",
      date: new Date().toISOString().split("T")[0],
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !formData.bankAccountId ||
      !formData.depositTypeId ||
      Number(formData.amount) <= 0
    ) {
      alert("Please fill in all required fields");
      return;
    }

    // Convert date to ISO format for the backend
    const submissionData = {
      ...formData,
      date: new Date(formData.date).toISOString(),
    };

    createMutation.mutate(submissionData);
  };

  const handleEdit = (deposit: Deposit) => {
    setEditingDeposit(deposit);
    setFormData({
      userId: deposit.userId,
      bankAccountId: deposit.bankAccountId,
      depositTypeId: deposit.depositTypeId,
      amount: deposit.amount,
      note: deposit.note || "",
      date: new Date(deposit.date).toISOString().split("T")[0],
    });
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm("Are you sure you want to delete this deposit?")) {
      deleteMutation.mutate(id);
    }
  };

  const filteredDeposits = deposits.filter(
    (deposit: Deposit) =>
      deposit.note?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      deposit.depositType?.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalDeposits = filteredDeposits.reduce(
    (sum: number, deposit: Deposit) => Number(sum) + Number(deposit.amount),
    0
  );

  const thisMonthDeposits = filteredDeposits.filter((deposit: Deposit) => {
    const depositDate = new Date(deposit.date);
    const now = new Date();
    return (
      depositDate.getMonth() === now.getMonth() &&
      depositDate.getFullYear() === now.getFullYear()
    );
  });

  const thisMonthTotal = thisMonthDeposits.reduce(
    (sum: number, deposit: Deposit) => Number(sum) + Number(deposit.amount),
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
            <h1 className="text-2xl font-bold text-gray-900">Deposits</h1>
            <p className="text-gray-600">Track your income and deposits</p>
          </div>
          <button
            onClick={() => {
              setEditingDeposit(null);
              resetForm();
              setIsModalOpen(true);
            }}
            className="btn btn-primary flex items-center"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Deposit
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="card p-6">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-success-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-success-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">
                  Total Deposits
                </p>
                <p className="text-2xl font-semibold text-gray-900">
                  ${totalDeposits.toLocaleString()}
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
                  {filteredDeposits.length}
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
                    placeholder="Search deposits..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="input pl-10"
                  />
                </div>
              </div>
              <div className="sm:w-48 relative">
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  className="input w-full pl-10 pr-10 appearance-none bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                >
                  <option value="">All Types</option>
                  {depositTypes.map((type: any) => (
                    <option key={type.id} value={type.id}>
                      {type.icon ? `${type.icon} ` : ""}
                      {type.name}
                    </option>
                  ))}
                </select>
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-400">💳</span>
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

        {/* Deposits List */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-medium text-gray-900">
              Recent Deposits
            </h3>
          </div>
          <div className="card-body">
            {filteredDeposits.length === 0 ? (
              <div className="text-center py-12">
                <DollarSign className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">
                  No deposits
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  Get started by adding your first deposit.
                </p>
                <div className="mt-6">
                  <button
                    onClick={() => {
                      setEditingDeposit(null);
                      resetForm();
                      setIsModalOpen(true);
                    }}
                    className="btn btn-primary"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Deposit
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
                        Type
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
                    {filteredDeposits.map((deposit: Deposit) => (
                      <tr key={deposit.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(deposit.date).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {deposit.note || "No description"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {deposit.depositType?.name || "Unknown"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {deposit.bankAccount?.name || "Unknown"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-success-600">
                          +${deposit.amount.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => handleEdit(deposit)}
                            className="text-primary-600 hover:text-primary-900 mr-3"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(deposit.id)}
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
                {editingDeposit ? "Edit Deposit" : "Add Deposit"}
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
                    Deposit Type *
                  </label>
                  <select
                    value={formData.depositTypeId}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        depositTypeId: e.target.value,
                      })
                    }
                    className="input w-full"
                    required
                  >
                    <option value="">Select type</option>
                    {depositTypes.map((type: any) => (
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

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setIsModalOpen(false);
                      setEditingDeposit(null);
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
                      : editingDeposit
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
