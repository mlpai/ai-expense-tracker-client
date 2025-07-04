import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Edit,
  Trash2,
  Search,
  Wallet,
  CreditCard,
  Building,
} from "lucide-react";
import { bankAccountsAPI } from "../../lib/api";
import { getAuthToken, formatCurrency } from "../../lib/utils";
import DashboardLayout from "../../layouts/DashboardLayout";

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

interface AccountFormData {
  name: string;
  accountNumber: string;
  balance: number;
  bankName: string;
  isDefault?: boolean;
}

export default function Accounts() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<BankAccount | null>(
    null
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [formData, setFormData] = useState<AccountFormData>({
    name: "",
    accountNumber: "",
    balance: 0,
    bankName: "",
    isDefault: false,
  });
  const queryClient = useQueryClient();

  // Get bank accounts
  const { data: accountsResponse, isLoading } = useQuery({
    queryKey: ["bank-accounts"],
    queryFn: async () => {
      const token = getAuthToken();
      if (!token) throw new Error("No authentication token");

      const response = await bankAccountsAPI.getAll();
      return response;
    },
  });

  const accounts = accountsResponse?.data || [];

  // Create/Update mutation
  const createMutation = useMutation({
    mutationFn: (data: AccountFormData) => {
      if (editingAccount) {
        return bankAccountsAPI.update(editingAccount.id, data);
      }
      return bankAccountsAPI.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bank-accounts"] });
      setIsModalOpen(false);
      setEditingAccount(null);
      resetForm();
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => bankAccountsAPI.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bank-accounts"] });
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      accountNumber: "",
      balance: 0,
      bankName: "",
      isDefault: false,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.accountNumber || !formData.bankName) {
      alert("Please fill in all required fields");
      return;
    }
    createMutation.mutate(formData);
  };

  const handleEdit = (account: BankAccount) => {
    setEditingAccount(account);
    setFormData({
      name: account.name,
      accountNumber: account.accountNumber,
      balance: account.balance,
      bankName: account.bankName,
      isDefault: account.isDefault,
    });
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm("Are you sure you want to delete this account?")) {
      deleteMutation.mutate(id);
    }
  };

  const filteredAccounts = accounts.filter(
    (account: BankAccount) =>
      account.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      account.bankName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      account.accountNumber.includes(searchTerm)
  );

  const totalBalance = filteredAccounts.reduce(
    (sum: number, account: BankAccount) => sum + account.balance,
    0
  );

  const defaultAccount = filteredAccounts.find(
    (account: BankAccount) => account.isDefault
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
            <h1 className="text-2xl font-bold text-gray-900">Bank Accounts</h1>
            <p className="text-gray-600">
              Manage your bank accounts and balances
            </p>
          </div>
          <button
            onClick={() => {
              setEditingAccount(null);
              resetForm();
              setIsModalOpen(true);
            }}
            className="btn btn-primary flex items-center"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Account
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="card p-6">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-success-100 rounded-lg flex items-center justify-center">
                <Wallet className="w-5 h-5 text-success-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">
                  Total Balance
                </p>
                <p className="text-2xl font-semibold text-gray-900">
                  {formatCurrency(totalBalance)}
                </p>
              </div>
            </div>
          </div>
          <div className="card p-6">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-primary-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">
                  Total Accounts
                </p>
                <p className="text-2xl font-semibold text-gray-900">
                  {filteredAccounts.length}
                </p>
              </div>
            </div>
          </div>
          <div className="card p-6">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-warning-100 rounded-lg flex items-center justify-center">
                <Building className="w-5 h-5 text-warning-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">
                  Default Account
                </p>
                <p className="text-lg font-semibold text-gray-900">
                  {defaultAccount?.name || "None"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="card">
          <div className="card-body">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search accounts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input pl-10 w-full"
              />
            </div>
          </div>
        </div>

        {/* Accounts List */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-medium text-gray-900">Bank Accounts</h3>
          </div>
          <div className="card-body">
            {filteredAccounts.length === 0 ? (
              <div className="text-center py-12">
                <Wallet className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">
                  No bank accounts
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  Get started by adding your first bank account.
                </p>
                <div className="mt-6">
                  <button
                    onClick={() => {
                      setEditingAccount(null);
                      resetForm();
                      setIsModalOpen(true);
                    }}
                    className="btn btn-primary"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Account
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredAccounts.map((account: BankAccount) => (
                  <div
                    key={account.id}
                    className={`card p-6 border-2 ${
                      account.isDefault
                        ? "border-primary-200 bg-primary-50"
                        : ""
                    }`}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {account.name}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {account.bankName}
                        </p>
                      </div>
                      {account.isDefault && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800">
                          Default
                        </span>
                      )}
                    </div>

                    <div className="space-y-3">
                      <div>
                        <p className="text-sm text-gray-600">Account Number</p>
                        <p className="text-sm font-medium text-gray-900">
                          {account.accountNumber}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Balance</p>
                        <p className="text-lg font-semibold text-gray-900">
                          {formatCurrency(account.balance)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Added</p>
                        <p className="text-sm text-gray-900">
                          {new Date(account.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    <div className="flex justify-end space-x-2 mt-4 pt-4 border-t border-gray-200">
                      <button
                        onClick={() => handleEdit(account)}
                        className="text-primary-600 hover:text-primary-900"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(account.id)}
                        className="text-danger-600 hover:text-danger-900"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Add/Edit Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h2 className="text-xl font-bold mb-4">
                {editingAccount ? "Edit Account" : "Add Account"}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Account Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className="input w-full"
                    placeholder="e.g., Main Checking"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Bank Name *
                  </label>
                  <input
                    type="text"
                    value={formData.bankName}
                    onChange={(e) =>
                      setFormData({ ...formData, bankName: e.target.value })
                    }
                    className="input w-full"
                    placeholder="e.g., Chase Bank"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Account Number *
                  </label>
                  <input
                    type="text"
                    value={formData.accountNumber}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        accountNumber: e.target.value,
                      })
                    }
                    className="input w-full"
                    placeholder="e.g., 1234567890"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Current Balance *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.balance}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        balance: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="input w-full"
                    placeholder="0.00"
                    required
                  />
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="isDefault"
                    checked={formData.isDefault}
                    onChange={(e) =>
                      setFormData({ ...formData, isDefault: e.target.checked })
                    }
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                  />
                  <label
                    htmlFor="isDefault"
                    className="ml-2 block text-sm text-gray-900"
                  >
                    Set as default account
                  </label>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setIsModalOpen(false);
                      setEditingAccount(null);
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
                      : editingAccount
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
