import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CRMTable } from "@/components/crm/CRMTable";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Search, Plus, FileText, Download, Trash2, FolderOpen } from "lucide-react";
import { useDocuments } from "@/hooks/useDocuments";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";

const Documents = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [uploadForm, setUploadForm] = useState({
    file: null as File | null,
    category: "",
    description: "",
  });

  const { documents, isLoading, isSharePointConnected, deleteDocument } = useDocuments(selectedCategory);

  const categories = [
    { value: "all", label: "All Categories" },
    { value: "contracts", label: "Contracts" },
    { value: "invoices", label: "Invoices" },
    { value: "proposals", label: "Proposals" },
    { value: "reports", label: "Reports" },
    { value: "presentations", label: "Presentations" },
    { value: "other", label: "Other" },
  ];

  const filteredDocuments = documents.filter((doc) =>
    doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    doc.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setUploadForm({ ...uploadForm, file });
    }
  };

  const handleUpload = async () => {
    if (!uploadForm.file) {
      toast.error("Please select a file");
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: profile } = await supabase
        .from("profile")
        .select("tenant_id")
        .eq("id", user.id)
        .single();

      if (!profile) throw new Error("Profile not found");

      if (isSharePointConnected) {
        // TODO: Upload to SharePoint via edge function
        toast.info("SharePoint upload coming soon. Uploading to database...");
      }

      // Upload to Supabase Storage
      const fileExt = uploadForm.file.name.split(".").pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${profile.tenant_id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("documents")
        .upload(filePath, uploadForm.file);

      if (uploadError) throw uploadError;

      // Save document metadata
      const { error: insertError } = await supabase
        .from("documents")
        .insert({
          name: uploadForm.file.name,
          file_type: uploadForm.file.type,
          file_size: uploadForm.file.size,
          category: uploadForm.category || null,
          description: uploadForm.description || null,
          storage_path: filePath,
          owner_id: user.id,
          tenant_id: profile.tenant_id,
        });

      if (insertError) throw insertError;

      toast.success("Document uploaded successfully");
      setIsUploadDialogOpen(false);
      setUploadForm({ file: null, category: "", description: "" });
      
      // Refresh documents list
      window.location.reload();
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload document");
    }
  };

  const handleDownload = async (doc: any) => {
    try {
      const { data, error } = await supabase.storage
        .from("documents")
        .download(doc.storage_path);

      if (error) throw error;

      const url = window.URL.createObjectURL(data);
      const link = document.createElement("a");
      link.href = url;
      link.download = doc.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success("Document downloaded");
    } catch (error) {
      console.error("Download error:", error);
      toast.error("Failed to download document");
    }
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "Unknown";
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    const mb = kb / 1024;
    return `${mb.toFixed(1)} MB`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Documents</h1>
          <p className="text-muted-foreground mt-1">Manage and organize your files</p>
        </div>
        <Button onClick={() => setIsUploadDialogOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Upload Document
        </Button>
      </div>

      {isSharePointConnected && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="py-4">
            <div className="flex items-center gap-2">
              <FolderOpen className="h-5 w-5 text-primary" />
              <p className="text-sm text-foreground">
                <strong>SharePoint Connected:</strong> Your documents are synced with SharePoint
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search documents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            {categories.map((cat) => (
              <SelectItem key={cat.value} value={cat.value}>
                {cat.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <CRMTable
        data={filteredDocuments}
        columns={[
          { header: "Name", accessor: "name" },
          {
            header: "Category",
            accessor: (doc: any) => doc.category ? (
              <Badge variant="secondary">{doc.category}</Badge>
            ) : "-",
          },
          {
            header: "Size",
            accessor: (doc: any) => formatFileSize(doc.file_size),
          },
          {
            header: "Date",
            accessor: (doc: any) => doc.created_at ? format(new Date(doc.created_at), "MMM dd, yyyy") : "-",
          },
        ]}
        onDelete={(id) => setDeleteId(id)}
        onBulkDelete={(ids) => ids.forEach(id => deleteDocument(id))}
        isLoading={isLoading}
        idField="id"
        customActions={(doc: any) => (
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              handleDownload(doc);
            }}
          >
            <Download className="h-4 w-4" />
          </Button>
        )}
      />

      {/* Upload Dialog */}
      <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Document</DialogTitle>
            <DialogDescription>
              {isSharePointConnected
                ? "Upload a document to SharePoint"
                : "Upload a document to your database"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="file">File</Label>
              <Input
                id="file"
                type="file"
                onChange={handleFileSelect}
              />
              {uploadForm.file && (
                <p className="text-sm text-muted-foreground">{uploadForm.file.name}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select
                value={uploadForm.category}
                onValueChange={(value) => setUploadForm({ ...uploadForm, category: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.slice(1).map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                value={uploadForm.description}
                onChange={(e) => setUploadForm({ ...uploadForm, description: e.target.value })}
                placeholder="Enter document description"
                rows={3}
              />
            </div>

            <div className="flex gap-3">
              <Button onClick={handleUpload} disabled={!uploadForm.file} className="flex-1">
                Upload
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setIsUploadDialogOpen(false);
                  setUploadForm({ file: null, category: "", description: "" });
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Document</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this document? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteId) {
                  deleteDocument(deleteId);
                  setDeleteId(null);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Documents;
