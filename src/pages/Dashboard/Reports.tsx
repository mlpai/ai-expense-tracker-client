import { useState } from "react";
import { BarChart3, Download, Brain, TrendingUp } from "lucide-react";
import DashboardLayout from "../../layouts/DashboardLayout";

export default function Reports() {
  const [activeTab, setActiveTab] = useState("overview");

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
            <button className="btn btn-secondary flex items-center">
              <Brain className="w-4 h-4 mr-2" />
              Get AI Insights
            </button>
            <button className="btn btn-primary flex items-center">
              <Download className="w-4 h-4 mr-2" />
              Generate Report
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab("overview")}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === "overview"
                  ? "border-primary-500 text-primary-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              <BarChart3 className="w-4 h-4 inline mr-2" />
              Overview
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
          </nav>
        </div>

        {/* Content */}
        <div className="card">
          <div className="card-body">
            <div className="text-center py-12">
              <BarChart3 className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                Financial Reports
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Generate comprehensive reports and get AI-powered insights about
                your spending patterns.
              </p>
              <div className="mt-6 flex justify-center space-x-3">
                <button className="btn btn-secondary">
                  <Brain className="w-4 h-4 mr-2" />
                  Get AI Insights
                </button>
                <button className="btn btn-primary">
                  <Download className="w-4 h-4 mr-2" />
                  Generate Report
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
