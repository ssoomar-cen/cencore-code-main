import { useState } from "react";
import { Routes, Route, useNavigate, useLocation } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// Hooks
import { useAccounts, Account } from "@/hooks/useAccounts";
import { useContacts, Contact } from "@/hooks/useContacts";
import { useOpportunities, Opportunity } from "@/hooks/useOpportunities";
import { useContracts, Contract } from "@/hooks/useContracts";
import { useQuotes, Quote } from "@/hooks/useQuotes";

// Forms
import { AccountForm } from "@/components/crm/AccountForm";
import { ContactForm } from "@/components/crm/ContactForm";
import { OpportunityForm } from "@/components/crm/OpportunityForm";
import { ContractForm } from "@/components/crm/ContractForm";
import { QuoteForm } from "@/components/crm/QuoteForm";
import { InvoiceForm } from "@/components/crm/InvoiceForm";
import { LeadForm } from "@/components/crm/LeadForm";
import { MeasureForm } from "@/components/crm/MeasureForm";
import { EnergyProgramForm } from "@/components/crm/EnergyProgramForm";
import { CommissionSplitForm } from "@/components/crm/CommissionSplitForm";

// Detail Views
import { AccountDetail } from "@/components/crm/AccountDetail";
import { ContactDetail } from "@/components/crm/ContactDetail";
import { OpportunityDetail } from "@/components/crm/OpportunityDetail";
import { ContractDetail } from "@/components/crm/ContractDetail";
import { QuoteDetail } from "@/components/crm/QuoteDetail";
import { CaseDetail } from "@/components/crm/CaseDetail";
import { ActivityDetail } from "@/components/crm/ActivityDetail";
import { InvoiceDetail } from "@/components/crm/InvoiceDetail";
import { LeadDetail } from "@/components/crm/LeadDetail";
import { MeasureDetail } from "@/components/crm/MeasureDetail";
import { EnergyProgramDetail } from "@/components/crm/EnergyProgramDetail";
import { CommissionSplitDetail } from "@/components/crm/CommissionSplitDetail";

// List Modules
import { CRMOverview } from "@/components/crm/CRMOverview";
import { ActivitiesModule } from "@/components/crm/ActivitiesModule";
import { MailMergeDialog } from "@/components/crm/MailMergeDialog";
import { CasesModule } from "@/components/crm/CasesModule";
import { AccountsModule } from "@/components/crm/AccountsModule";
import { ContactsModule } from "@/components/crm/ContactsModule";
import { ConnectionsModule } from "@/components/crm/ConnectionsModule";
import { ConnectionDetail } from "@/components/crm/ConnectionDetail";
import { OpportunitiesModule } from "@/components/crm/OpportunitiesModule";
import { ContractsModule } from "@/components/crm/ContractsModule";
import { QuotesModule } from "@/components/crm/QuotesModule";
import { InvoicesModule } from "@/components/crm/InvoicesModule";
import { LeadsModule } from "@/components/crm/LeadsModule";
import { MeasuresModule } from "@/components/crm/MeasuresModule";
import { EnergyProgramsModule } from "@/components/crm/EnergyProgramsModule";
import { CommissionSplitsModule } from "@/components/crm/CommissionSplitsModule";
import Projects from "@/pages/Projects";
import { ProjectDetail } from "@/components/projects/ProjectDetail";
import { TaskDetail } from "@/components/projects/TaskDetail";
import { BuildingsModule } from "@/components/crm/BuildingsModule";


const CRM = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteType, setDeleteType] = useState<string>("");
  const [mailMergeContract, setMailMergeContract] = useState<Contract | null>(null);
  const [isMailMergeOpen, setIsMailMergeOpen] = useState(false);

  // Selected items for editing
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [selectedOpportunity, setSelectedOpportunity] = useState<Opportunity | null>(null);
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);
  const [selectedLead, setSelectedLead] = useState<any | null>(null);
  const [selectedMeasure, setSelectedMeasure] = useState<any | null>(null);
  const [selectedEnergyProgram, setSelectedEnergyProgram] = useState<any | null>(null);
  const [selectedCommissionSplit, setSelectedCommissionSplit] = useState<any | null>(null);

  const getCurrentTab = () => {
    const path = location.pathname;
    if (path === "/crm" || path === "/crm/") return "overview";
    if (path.startsWith("/crm/activities")) return "activities";
    if (path.startsWith("/crm/accounts")) return "accounts";
    if (path.startsWith("/crm/contacts")) return "contacts";
    if (path.startsWith("/crm/opportunities")) return "opportunities";
    if (path.startsWith("/crm/connections")) return "connections";
    if (path.startsWith("/crm/projects")) return "projects";
    if (path.startsWith("/crm/quotes")) return "quotes";
    if (path.startsWith("/crm/contracts")) return "contracts";
    if (path.startsWith("/crm/cases")) return "cases";
    if (path.startsWith("/crm/invoices")) return "invoices";
    if (path.startsWith("/crm/leads")) return "leads";
    if (path.startsWith("/crm/measures")) return "measures";
    if (path.startsWith("/crm/energy-programs")) return "energy-programs";
    if (path.startsWith("/crm/commission-splits")) return "commission-splits";
    return "overview";
  };
  const currentTab = getCurrentTab();

  const isListRoute = {
    accounts: /^\/crm\/accounts\/?$/.test(location.pathname),
    contacts: /^\/crm\/contacts\/?$/.test(location.pathname),
    opportunities: /^\/crm\/opportunities\/?$/.test(location.pathname),
    contracts: /^\/crm\/contracts\/?$/.test(location.pathname),
    quotes: /^\/crm\/quotes\/?$/.test(location.pathname),
  };
  const shouldEnable = (entity: keyof typeof isListRoute) =>
    isListRoute[entity] || (isFormOpen && currentTab === entity) || deleteType === entity;

  // Hooks for managed entities
  const accounts = useAccounts({ enabled: shouldEnable("accounts") });
  const contacts = useContacts({ enabled: shouldEnable("contacts") });
  const opportunities = useOpportunities({ enabled: shouldEnable("opportunities") });
  const contracts = useContracts({ enabled: shouldEnable("contracts") });
  const quotes = useQuotes({ enabled: shouldEnable("quotes") });

  const handleOpenForm = (type: string, item?: any) => {
    switch (type) {
      case "accounts":          setSelectedAccount(item || null); break;
      case "contacts":          setSelectedContact(item || null); break;
      case "opportunities":     setSelectedOpportunity(item || null); break;
      case "contracts":         setSelectedContract(item || null); break;
      case "quotes":            setSelectedQuote(item || null); break;
      case "invoices":          setSelectedInvoice(item || null); break;
      case "leads":             setSelectedLead(item || null); break;
      case "measures":          setSelectedMeasure(item || null); break;
      case "energy-programs":   setSelectedEnergyProgram(item || null); break;
      case "commission-splits": setSelectedCommissionSplit(item || null); break;
    }
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setSelectedAccount(null);
    setSelectedContact(null);
    setSelectedOpportunity(null);
    setSelectedContract(null);
    setSelectedQuote(null);
    setSelectedInvoice(null);
    setSelectedLead(null);
    setSelectedMeasure(null);
    setSelectedEnergyProgram(null);
    setSelectedCommissionSplit(null);
    setIsFormOpen(false);
  };

  const handleDeleteClick = (type: string, id: string) => {
    setDeleteType(type);
    setDeleteId(id);
  };

  const handleDelete = () => {
    if (!deleteId) return;
    switch (deleteType) {
      case "accounts":    accounts.deleteAccount(deleteId); break;
      case "contacts":    contacts.deleteContact(deleteId); break;
      case "opportunities": opportunities.deleteOpportunity(deleteId); break;
      case "contracts":   contracts.deleteContract(deleteId); break;
      case "quotes":      quotes.deleteQuote(deleteId); break;
    }
    setDeleteId(null);
    setDeleteType("");
  };

  return (
    <div className="h-full">
      <Routes>
        <Route path="/" element={<CRMOverview />} />
        <Route path="/activities" element={<ActivitiesModule />} />

        {/* Detail Views */}
        <Route path="/activities/:id"         element={<ActivityDetail />} />
        <Route path="/accounts/:id"           element={<AccountDetail />} />
        <Route path="/contacts/:id"           element={<ContactDetail />} />
        <Route path="/opportunities/:id"      element={<OpportunityDetail />} />
        <Route path="/contracts/:id"          element={<ContractDetail />} />
        <Route path="/quotes/:id"             element={<QuoteDetail />} />
        <Route path="/connections/:id"        element={<ConnectionDetail />} />
        <Route path="/cases/:id"              element={<CaseDetail />} />
        <Route path="/invoices/:id"           element={<InvoiceDetail />} />
        <Route path="/leads/:id"              element={<LeadDetail />} />
        <Route path="/measures/:id"           element={<MeasureDetail />} />
        <Route path="/energy-programs/:id"    element={<EnergyProgramDetail />} />
        <Route path="/commission-splits/:id"  element={<CommissionSplitDetail />} />

        {/* List Views */}
        <Route path="/accounts"     element={<AccountsModule onOpenForm={handleOpenForm} onDelete={handleDeleteClick} />} />
        <Route path="/contacts"     element={<ContactsModule onOpenForm={handleOpenForm} onDelete={handleDeleteClick} />} />
        <Route path="/connections"  element={<ConnectionsModule />} />
        <Route path="/opportunities" element={<OpportunitiesModule onOpenForm={handleOpenForm} onDelete={handleDeleteClick} />} />
        <Route path="/quotes"       element={<QuotesModule onOpenForm={handleOpenForm} onDelete={handleDeleteClick} />} />
        <Route path="/contracts"    element={
          <ContractsModule
            onOpenForm={handleOpenForm}
            onDelete={handleDeleteClick}
            onMailMerge={(contract) => { setMailMergeContract(contract); setIsMailMergeOpen(true); }}
          />
        } />
        <Route path="/cases"              element={<CasesModule />} />
        <Route path="/buildings"          element={<BuildingsModule />} />
        <Route path="/projects"           element={<Projects />} />
        <Route path="/projects/:id"       element={<ProjectDetail />} />
        <Route path="/tasks/:id"          element={<TaskDetail />} />
        <Route path="/invoices"           element={<InvoicesModule onOpenForm={handleOpenForm} onDelete={handleDeleteClick} />} />
        <Route path="/leads"              element={<LeadsModule onOpenForm={handleOpenForm} onDelete={handleDeleteClick} />} />
        <Route path="/measures"           element={<MeasuresModule onOpenForm={handleOpenForm} onDelete={handleDeleteClick} />} />
        <Route path="/energy-programs"    element={<EnergyProgramsModule onOpenForm={handleOpenForm} onDelete={handleDeleteClick} />} />
        <Route path="/commission-splits"  element={<CommissionSplitsModule onOpenForm={handleOpenForm} onDelete={handleDeleteClick} />} />
        <Route path="/settings/*"         element={<div>Settings pages go here</div>} />
      </Routes>

      {/* Account Form (self-contained dialog) */}
      {currentTab === "accounts" && (
        <AccountForm
          account={selectedAccount}
          open={isFormOpen}
          onClose={handleCloseForm}
          onSubmit={(data) => {
            selectedAccount
              ? accounts.updateAccount(data as any)
              : accounts.createAccount(data);
            handleCloseForm();
          }}
        />
      )}

      {/* Remaining Forms in shared Dialog */}
      <Dialog open={isFormOpen && currentTab !== "accounts"} onOpenChange={handleCloseForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {(selectedContact || selectedOpportunity || selectedContract || selectedQuote ||
                selectedInvoice || selectedLead || selectedMeasure || selectedEnergyProgram || selectedCommissionSplit)
                ? "Edit" : "New"}{" "}
              {currentTab === "opportunities" ? "Opportunity"
                : currentTab === "energy-programs" ? "Energy Program"
                : currentTab === "commission-splits" ? "Commission Split"
                : currentTab.charAt(0).toUpperCase() + currentTab.slice(1, -1)}
            </DialogTitle>
          </DialogHeader>

          {currentTab === "contacts" && (
            <ContactForm
              contact={selectedContact || undefined}
              onSubmit={(data) => {
                selectedContact ? contacts.updateContact(data as any) : contacts.createContact(data);
                handleCloseForm();
              }}
              onCancel={handleCloseForm}
            />
          )}

          {currentTab === "opportunities" && (
            <OpportunityForm
              opportunity={selectedOpportunity || undefined}
              onSubmit={(data) => {
                selectedOpportunity ? opportunities.updateOpportunity(data as any) : opportunities.createOpportunity(data);
                handleCloseForm();
              }}
              onCancel={handleCloseForm}
            />
          )}

          {currentTab === "contracts" && (
            <ContractForm
              contract={selectedContract || undefined}
              onSubmit={(data) => {
                selectedContract ? contracts.updateContract(data as any) : contracts.createContract(data);
                handleCloseForm();
              }}
              onCancel={handleCloseForm}
            />
          )}

          {currentTab === "quotes" && (
            <QuoteForm
              quote={selectedQuote || undefined}
              onSubmit={(data) => {
                selectedQuote ? quotes.updateQuote(data as any) : quotes.createQuote(data);
                handleCloseForm();
              }}
              onCancel={handleCloseForm}
            />
          )}

          {currentTab === "invoices" && (
            <InvoiceForm
              invoice={selectedInvoice || undefined}
              onSubmit={handleCloseForm}
              onCancel={handleCloseForm}
            />
          )}

          {currentTab === "leads" && (
            <LeadForm
              lead={selectedLead || undefined}
              onSubmit={handleCloseForm}
              onCancel={handleCloseForm}
            />
          )}

          {currentTab === "measures" && (
            <MeasureForm
              measure={selectedMeasure || undefined}
              onSubmit={handleCloseForm}
              onCancel={handleCloseForm}
            />
          )}

          {currentTab === "energy-programs" && (
            <EnergyProgramForm
              energyProgram={selectedEnergyProgram || undefined}
              onSubmit={handleCloseForm}
              onCancel={handleCloseForm}
            />
          )}

          {currentTab === "commission-splits" && (
            <CommissionSplitForm
              commissionSplit={selectedCommissionSplit || undefined}
              onSubmit={handleCloseForm}
              onCancel={handleCloseForm}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete this record.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Mail Merge Dialog */}
      {mailMergeContract && (
        <MailMergeDialog
          open={isMailMergeOpen}
          onOpenChange={setIsMailMergeOpen}
          contract={mailMergeContract}
        />
      )}
    </div>
  );
};

export default CRM;
