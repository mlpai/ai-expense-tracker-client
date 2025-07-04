import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Upload,
  Eye,
  Trash2,
  Search,
  FileText,
  Image,
  CheckCircle,
  AlertCircle,
  Clock,
  Download,
} from "lucide-react";
import { receiptsAPI, bankAccountsAPI, categoriesAPI } from "../../lib/api";
import { requireAuth, formatCurrency } from "../../lib/utils";
import DashboardLayout from "../../layouts/DashboardLayout";

interface Receipt {
  id: string;
  userId: string;
  imageUrl: string;
  originalText?: string;
  processedData?: any;
  status: "PENDING" | "PROCESSED" | "FAILED";
  createdAt: string;
  updatedAt: string;
  expenses?: Array<{
    id: string;
    amount: number;
    note: string;
  }>;
}

interface ReceiptFormData {
  receiptId: string;
  bankAccountId: string;
  categoryId: string;
  amount: number;
  note?: string;
}

export default function Receipts() {
  // Ensure user is authenticated
  requireAuth();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [formData, setFormData] = useState<ReceiptFormData>({
    receiptId: "",
    bankAccountId: "",
    categoryId: "",
    amount: 0,
    note: "",
  });
  const queryClient = useQueryClient();

  // Get receipts
  const { data: receiptsResponse, isLoading } = useQuery({
    queryKey: ["receipts", searchTerm, selectedStatus],
    queryFn: async () => {
      const response = await receiptsAPI.getAll();
      return response;
    },
  });

  const receipts = receiptsResponse?.data || [];

  // Get bank accounts
  const { data: bankAccountsResponse } = useQuery({
    queryKey: ["bank-accounts"],
    queryFn: async () => {
      const response = await bankAccountsAPI.getAll();
      return response;
    },
  });

  const bankAccounts = bankAccountsResponse?.data || [];

  // Get expense categories
  const { data: expenseCategoriesResponse } = useQuery({
    queryKey: ["expense-categories"],
    queryFn: async () => {
      const response = await categoriesAPI.getExpenseCategories();
      return response;
    },
  });

  const expenseCategories = expenseCategoriesResponse?.data || [];

  // Upload receipt mutation
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const response = await receiptsAPI.upload(file);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["receipts"] });
      setIsUploadModalOpen(false);
      setSelectedFile(null);
    },
  });

  // Create expense from receipt mutation
  const createExpenseMutation = useMutation({
    mutationFn: async (data: ReceiptFormData) => {
      const response = await receiptsAPI.createExpense(data);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["receipts"] });
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      setIsModalOpen(false);
      setSelectedReceipt(null);
      resetForm();
    },
  });

  // Delete receipt mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => receiptsAPI.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["receipts"] });
    },
  });

  const resetForm = () => {
    setFormData({
      receiptId: "",
      bankAccountId: "",
      categoryId: "",
      amount: 0,
      note: "",
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleUploadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      alert("Please select a file");
      return;
    }
    uploadMutation.mutate(selectedFile);
  };

  const handleCreateExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !formData.bankAccountId ||
      !formData.categoryId ||
      formData.amount <= 0
    ) {
      alert("Please fill in all required fields");
      return;
    }
    createExpenseMutation.mutate(formData);
  };

  const handleCreateExpenseFromReceipt = (receipt: Receipt) => {
    setSelectedReceipt(receipt);
    setFormData({
      receiptId: receipt.id,
      bankAccountId: "",
      categoryId: "",
      amount: 0,
      note: "",
    });
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm("Are you sure you want to delete this receipt?")) {
      deleteMutation.mutate(id);
    }
  };

  const filteredReceipts = receipts.filter(
    (receipt: Receipt) =>
      (receipt.originalText?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        receipt.processedData?.merchant
          ?.toLowerCase()
          .includes(searchTerm.toLowerCase())) &&
      (selectedStatus === "" || receipt.status === selectedStatus)
  );

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "PROCESSED":
        return <CheckCircle className="w-4 h-4 text-success-600" />;
      case "FAILED":
        return <AlertCircle className="w-4 h-4 text-danger-600" />;
      default:
        return <Clock className="w-4 h-4 text-warning-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "PROCESSED":
        return "bg-success-100 text-success-800";
      case "FAILED":
        return "bg-danger-100 text-danger-800";
      default:
        return "bg-warning-100 text-warning-800";
    }
  };

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
            <h1 className="text-2xl font-bold text-gray-900">Receipts</h1>
            <p className="text-gray-600">
              Upload and manage your receipts with AI processing
            </p>
          </div>
          <button
            onClick={() => setIsUploadModalOpen(true)}
            className="btn btn-primary flex items-center"
          >
            <Upload className="w-4 h-4 mr-2" />
            Upload Receipt
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="card p-6">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center">
                <FileText className="w-5 h-5 text-primary-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">
                  Total Receipts
                </p>
                <p className="text-2xl font-semibold text-gray-900">
                  {receipts.length}
                </p>
              </div>
            </div>
          </div>
          <div className="card p-6">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-success-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-success-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Processed</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {
                    receipts.filter((r: Receipt) => r.status === "PROCESSED")
                      .length
                  }
                </p>
              </div>
            </div>
          </div>
          <div className="card p-6">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-warning-100 rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5 text-warning-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Pending</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {
                    receipts.filter((r: Receipt) => r.status === "PENDING")
                      .length
                  }
                </p>
              </div>
            </div>
          </div>
          <div className="card p-6">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-danger-100 rounded-lg flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-danger-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Failed</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {
                    receipts.filter((r: Receipt) => r.status === "FAILED")
                      .length
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
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Search receipts..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="input pl-10"
                  />
                </div>
              </div>
              <div className="sm:w-48">
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="input"
                >
                  <option value="">All Status</option>
                  <option value="PENDING">Pending</option>
                  <option value="PROCESSED">Processed</option>
                  <option value="FAILED">Failed</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Receipts List */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-medium text-gray-900">Receipts</h3>
          </div>
          <div className="card-body">
            {filteredReceipts.length === 0 ? (
              <div className="text-center py-12">
                <Image className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">
                  No receipts
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  Get started by uploading your first receipt.
                </p>
                <div className="mt-6">
                  <button
                    onClick={() => setIsUploadModalOpen(true)}
                    className="btn btn-primary"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Receipt
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredReceipts.map((receipt: Receipt) => (
                  <div key={receipt.id} className="card p-4">
                    <div className="aspect-w-16 aspect-h-9 mb-4">
                      <img
                        src={receipt.imageUrl}
                        alt="Receipt"
                        className="w-full h-48 object-cover rounded-lg"
                      />
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                            receipt.status
                          )}`}
                        >
                          {getStatusIcon(receipt.status)}
                          <span className="ml-1">{receipt.status}</span>
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(receipt.createdAt).toLocaleDateString()}
                        </span>
                      </div>

                      {receipt.processedData && (
                        <div className="text-sm">
                          <p className="font-medium text-gray-900">
                            {receipt.processedData.merchant ||
                              "Unknown Merchant"}
                          </p>
                          <p className="text-gray-600">
                            {formatCurrency(
                              parseFloat(receipt.processedData.total || "0")
                            )}
                          </p>
                        </div>
                      )}

                      <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                        <button
                          onClick={() =>
                            handleCreateExpenseFromReceipt(receipt)
                          }
                          className="text-primary-600 hover:text-primary-900 text-sm font-medium"
                        >
                          Create Expense
                        </button>
                        <div className="flex space-x-2">
                          <button
                            onClick={() =>
                              window.open(receipt.imageUrl, "_blank")
                            }
                            className="text-gray-600 hover:text-gray-900"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(receipt.id)}
                            className="text-danger-600 hover:text-danger-900"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Upload Modal */}
        {isUploadModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h2 className="text-xl font-bold mb-4">Upload Receipt</h2>
              <form onSubmit={handleUploadSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Receipt Image *
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="input w-full"
                    required
                  />
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setIsUploadModalOpen(false);
                      setSelectedFile(null);
                    }}
                    className="btn btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={uploadMutation.isPending}
                    className="btn btn-primary"
                  >
                    {uploadMutation.isPending ? "Uploading..." : "Upload"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Create Expense Modal */}
        {isModalOpen && selectedReceipt && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h2 className="text-xl font-bold mb-4">
                Create Expense from Receipt
              </h2>
              <form onSubmit={handleCreateExpense} className="space-y-4">
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
                    Expense Category *
                  </label>
                  <select
                    value={formData.categoryId}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        categoryId: e.target.value,
                      })
                    }
                    className="input w-full"
                    required
                  >
                    <option value="">Select category</option>
                    {expenseCategories.map((category: any) => (
                      <option key={category.id} value={category.id}>
                        {category.icon} {category.name}
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

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setIsModalOpen(false);
                      setSelectedReceipt(null);
                      resetForm();
                    }}
                    className="btn btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createExpenseMutation.isPending}
                    className="btn btn-primary"
                  >
                    {createExpenseMutation.isPending
                      ? "Creating..."
                      : "Create Expense"}
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
