import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChevronLeft, MapPin, Phone, Globe, Building2 } from "lucide-react";
import { useAccountWithData, useAccountContracts, useAccountEnergyPrograms, useAccountInvoices } from "@/hooks/useAccountData";

export function AccountDetailPage() {
  const { accountId } = useParams<{ accountId: string }>();
  const navigate = useNavigate();
  const [selectedTab, setSelectedTab] = useState("overview");
  const [selectedContractId, setSelectedContractId] = useState<string | undefined>();
  const [selectedProgramId, setSelectedProgramId] = useState<string | undefined>();

  const { data: account, isLoading: accountLoading, error: accountError } = useAccountWithData(accountId!);
  const { data: contractsData, isLoading: contractsLoading } = useAccountContracts(accountId!);
  const { data: programsData, isLoading: programsLoading } = useAccountEnergyPrograms(accountId!);
  const { data: invoicesData, isLoading: invoicesLoading } = useAccountInvoices(accountId!);

  const stats = useMemo(() => {
    if (!account) return null;
    return {
      contracts: account._count?.contracts || 0,
      energyPrograms: account._count?.energyPrograms || 0,
      invoices: account._count?.invoices || 0,
    };
  }, [account]);

  if (accountLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg">Loading account...</div>
      </div>
    );
  }

  if (accountError || !account) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg text-red-600">Failed to load account</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-gray-50">
      {/* Header */}
      <div className="border-b bg-white p-4">
        <div className="flex items-center gap-4 mb-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/accounts")}
            className="gap-2"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to Accounts
          </Button>
        </div>

        <div className="space-y-3">
          <h1 className="text-3xl font-bold">{account.name}</h1>
          <div className="flex gap-4 flex-wrap">
            {account.billingCity && account.billingState && (
              <div className="flex items-center gap-2 text-gray-600">
                <MapPin className="w-4 h-4" />
                <span>{account.billingCity}, {account.billingState}</span>
              </div>
            )}
            {account.phone && (
              <div className="flex items-center gap-2 text-gray-600">
                <Phone className="w-4 h-4" />
                <a href={`tel:${account.phone}`}>{account.phone}</a>
              </div>
            )}
            {account.website && (
              <div className="flex items-center gap-2 text-gray-600">
                <Globe className="w-4 h-4" />
                <a href={account.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                  {account.website}
                </a>
              </div>
            )}
          </div>

          {account.orgLegalName && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Building2 className="w-4 h-4" />
              <span>Legal Name: {account.orgLegalName}</span>
            </div>
          )}

          {account.status && (
            <div className="flex items-center gap-2">
              <Badge variant={account.status === "Active" ? "default" : "secondary"}>
                {account.status}
              </Badge>
              {account.industry && <Badge variant="outline">{account.industry}</Badge>}
            </div>
          )}
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-4 gap-4 p-4 bg-white border-b">
        <Card className="p-4">
          <div className="text-2xl font-bold">{stats?.contracts || 0}</div>
          <div className="text-sm text-gray-600">Contracts</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xl font-bold">{stats?.energyPrograms || 0}</div>
          <div className="text-sm text-gray-600">Energy Programs</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xl font-bold">{stats?.invoices || 0}</div>
          <div className="text-sm text-gray-600">Invoices</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xl font-bold text-blue-600">
            Drill Down
          </div>
          <div className="text-sm text-gray-600">Start Below</div>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex-1 overflow-auto">
        <Tabs
          value={selectedTab}
          onValueChange={setSelectedTab}
          className="flex flex-col h-full"
        >
          <TabsList className="w-full justify-start border-b rounded-none bg-white px-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="contracts">Contracts ({stats?.contracts || 0})</TabsTrigger>
            <TabsTrigger value="programs">Energy Programs ({stats?.energyPrograms || 0})</TabsTrigger>
            <TabsTrigger value="invoices">Invoices ({stats?.invoices || 0})</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="flex-1 overflow-auto p-4">
            <div className="grid grid-cols-2 gap-6">
              {/* Account Details */}
              <Card className="p-6">
                <h3 className="font-semibold mb-4">Account Information</h3>
                <div className="space-y-3 text-sm">
                  <div>
                    <div className="text-gray-600">Account Type</div>
                    <div className="font-medium">{account.orgType || "N/A"}</div>
                  </div>
                  <div>
                    <div className="text-gray-600">Industry</div>
                    <div className="font-medium">{account.industry || "N/A"}</div>
                  </div>
                  <div>
                    <div className="text-gray-600">Region</div>
                    <div className="font-medium">{account.region || "N/A"}</div>
                  </div>
                  <div>
                    <div className="text-gray-600">Status</div>
                    <div >
                      <Badge>{account.status || "N/A"}</Badge>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Billing Address */}
              <Card className="p-6">
                <h3 className="font-semibold mb-4">Billing Address</h3>
                <div className="space-y-2 text-sm">
                  {account.billingStreet && <div>{account.billingStreet}</div>}
                  {(account.billingCity || account.billingState || account.billingPostalCode) && (
                    <div>
                      {[account.billingCity, account.billingState, account.billingPostalCode]
                        .filter(Boolean)
                        .join(", ")}
                    </div>
                  )}
                  {account.billingCountry && <div>{account.billingCountry}</div>}
                </div>
              </Card>
            </div>
          </TabsContent>

          {/* Contracts Tab */}
          <TabsContent value="contracts" className="flex-1 overflow-auto">
            <ContractsTable
              contracts={contractsData?.data || []}
              loading={contractsLoading}
              onSelectContract={setSelectedContractId}
              selectedContractId={selectedContractId}
            />
          </TabsContent>

          {/* Energy Programs Tab */}
          <TabsContent value="programs" className="flex-1 overflow-auto">
            <EnergyProgramsTable
              programs={programsData?.data || []}
              loading={programsLoading}
              onSelectProgram={setSelectedProgramId}
              selectedProgramId={selectedProgramId}
            />
          </TabsContent>

          {/* Invoices Tab */}
          <TabsContent value="invoices" className="flex-1 overflow-auto">
            <InvoicesTable invoices={invoicesData?.data || []} loading={invoicesLoading} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

// ============================================================================
// Sub-components
// ============================================================================

function ContractsTable({
  contracts,
  loading,
  onSelectContract,
  selectedContractId,
}: {
  contracts: any[];
  loading: boolean;
  onSelectContract: (id: string) => void;
  selectedContractId?: string;
}) {
  const navigate = useNavigate();

  return (
    <div className="p-4">
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead>Contract Name</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Start Date</TableHead>
              <TableHead>End Date</TableHead>
              <TableHead className="text-right">Invoices</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                  Loading contracts...
                </TableCell>
              </TableRow>
            ) : contracts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                  No contracts found
                </TableCell>
              </TableRow>
            ) : (
              contracts.map((contract) => (
                <TableRow
                  key={contract.id}
                  className={`cursor-pointer hover:bg-gray-50 ${
                    selectedContractId === contract.id ? "bg-blue-50" : ""
                  }`}
                  onClick={() => {
                    onSelectContract(contract.id);
                    navigate(`/contracts/${contract.id}`);
                  }}
                >
                  <TableCell className="font-medium">{contract.name}</TableCell>
                  <TableCell>
                    <Badge variant={contract.contractStatus === "Active" ? "default" : "secondary"}>
                      {contract.contractStatus || "N/A"}
                    </Badge>
                  </TableCell>
                  <TableCell>{contract.contractType || "N/A"}</TableCell>
                  <TableCell>
                    {contract.contractStartDate
                      ? new Date(contract.contractStartDate).toLocaleDateString()
                      : "N/A"}
                  </TableCell>
                  <TableCell>
                    {contract.billingScheduleEndDate
                      ? new Date(contract.billingScheduleEndDate).toLocaleDateString()
                      : "N/A"}
                  </TableCell>
                  <TableCell className="text-right">{contract._count?.invoices || 0}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function EnergyProgramsTable({
  programs,
  loading,
  onSelectProgram,
  selectedProgramId,
}: {
  programs: any[];
  loading: boolean;
  onSelectProgram: (id: string) => void;
  selectedProgramId?: string;
}) {
  const navigate = useNavigate();

  return (
    <div className="p-4">
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead>Program Name</TableHead>
              <TableHead>Program ID</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Technical Lead</TableHead>
              <TableHead>Start Date</TableHead>
              <TableHead className="text-right">Invoices</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                  Loading energy programs...
                </TableCell>
              </TableRow>
            ) : programs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                  No energy programs found
                </TableCell>
              </TableRow>
            ) : (
              programs.map((program) => (
                <TableRow
                  key={program.id}
                  className={`cursor-pointer hover:bg-gray-50 ${
                    selectedProgramId === program.id ? "bg-blue-50" : ""
                  }`}
                  onClick={() => {
                    onSelectProgram(program.id);
                    navigate(`/energy-programs/${program.id}`);
                  }}
                >
                  <TableCell className="font-medium">{program.name}</TableCell>
                  <TableCell className="font-mono text-sm">{program.pgmId || "N/A"}</TableCell>
                  <TableCell>
                    <Badge variant={program.status === "Active" ? "default" : "secondary"}>
                      {program.status || "N/A"}
                    </Badge>
                  </TableCell>
                  <TableCell>{program.technicalLead || "N/A"}</TableCell>
                  <TableCell>
                    {program.contractStartDate
                      ? new Date(program.contractStartDate).toLocaleDateString()
                      : "N/A"}
                  </TableCell>
                  <TableCell className="text-right">{program._count?.invoices || 0}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function InvoicesTable({ invoices, loading }: { invoices: any[]; loading: boolean }) {
  const navigate = useNavigate();

  return (
    <div className="p-4">
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead>Invoice Number</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Bill Month</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead className="text-right">Items</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                  Loading invoices...
                </TableCell>
              </TableRow>
            ) : invoices.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                  No invoices found
                </TableCell>
              </TableRow>
            ) : (
              invoices.map((invoice) => (
                <TableRow
                  key={invoice.id}
                  className="cursor-pointer hover:bg-gray-50"
                  onClick={() => navigate(`/invoices/${invoice.id}`)}
                >
                  <TableCell className="font-medium font-mono">{invoice.invoiceNumber || invoice.name}</TableCell>
                  <TableCell>${(invoice.invoiceTotal || 0).toLocaleString()}</TableCell>
                  <TableCell>
                    <Badge variant={invoice.status === "Paid" ? "default" : "secondary"}>
                      {invoice.status || "N/A"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {invoice.billMonth ? new Date(invoice.billMonth).toLocaleDateString() : "N/A"}
                  </TableCell>
                  <TableCell>
                    {invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : "N/A"}
                  </TableCell>
                  <TableCell className="text-right">{invoice._count?.items || 0}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
