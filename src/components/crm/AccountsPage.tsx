import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, ChevronRight, Building2 } from "lucide-react";
import { useAccounts } from "@/hooks/useAccountData";

export function AccountsPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(0);
  const pageSize = 50;

  const { data, isLoading, error } = useAccounts(
    search || undefined,
    pageSize,
    currentPage * pageSize
  );

  const totalPages = data ? Math.ceil(data.total / pageSize) : 0;

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setCurrentPage(0); // Reset to first page on search
  };

  const handleNavigateToAccount = (accountId: string) => {
    navigate(`/accounts/${accountId}`);
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-gray-50">
      {/* Header */}
      <div className="border-b bg-white p-6">
        <div className="space-y-4">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Building2 className="w-8 h-8" />
            Accounts
          </h1>
          <p className="text-gray-600">
            Browse and manage customer accounts, contracts, and billing information
          </p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="border-b bg-white p-4">
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
            <Input
              type="text"
              placeholder="Search accounts by name..."
              value={search}
              onChange={handleSearch}
              className="pl-10"
            />
          </div>
          {search && (
            <Button
              variant="outline"
              onClick={() => {
                setSearch("");
                setCurrentPage(0);
              }}
            >
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        {error ? (
          <Card className="p-8 text-center">
            <p className="text-red-600 text-lg">Failed to load accounts</p>
          </Card>
        ) : isLoading ? (
          <Card className="p-8 text-center">
            <p className="text-gray-600">Loading accounts...</p>
          </Card>
        ) : data?.data.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-gray-600">No accounts found</p>
            {search && (
              <p className="text-sm text-gray-500 mt-2">
                Try adjusting your search criteria
              </p>
            )}
          </Card>
        ) : (
          <div className="space-y-4">
            {/* Summary Card */}
            <Card className="p-4 bg-blue-50 border-blue-200">
              <p className="text-sm text-blue-900">
                Showing {currentPage * pageSize + 1} to{" "}
                {Math.min((currentPage + 1) * pageSize, data!.total)} of{" "}
                <span className="font-semibold">{data!.total} total accounts</span>
              </p>
            </Card>

            {/* Accounts Table */}
            <Card>
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead className="font-semibold">Account Name</TableHead>
                      <TableHead>Industry</TableHead>
                      <TableHead>Region</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-center">Contracts</TableHead>
                      <TableHead className="text-center">Programs</TableHead>
                      <TableHead className="text-center">Invoices</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data!.data.map((account) => (
                      <TableRow
                        key={account.id}
                        className="hover:bg-gray-50 cursor-pointer transition-colors"
                      >
                        <TableCell className="font-medium font-semibold max-w-xs truncate">
                          {account.name}
                        </TableCell>
                        <TableCell>
                          {account.industry ? (
                            <Badge variant="outline">{account.industry}</Badge>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {account.region || <span className="text-gray-400">—</span>}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              account.status === "Active"
                                ? "default"
                                : account.status === "Inactive"
                                  ? "secondary"
                                  : "outline"
                            }
                          >
                            {account.status || "—"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className="font-mono">
                            {account._count.contracts}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className="font-mono">
                            {account._count.energyPrograms}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className="font-mono">
                            {account._count.invoices}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleNavigateToAccount(account.id)}
                            className="gap-1"
                          >
                            View
                            <ChevronRight className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>

            {/* Pagination */}
            {totalPages > 1 && (
              <Card className="p-4 flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  Page {currentPage + 1} of {totalPages}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
                    disabled={currentPage === 0}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.min(totalPages - 1, currentPage + 1))}
                    disabled={currentPage === totalPages - 1}
                  >
                    Next
                  </Button>
                </div>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
