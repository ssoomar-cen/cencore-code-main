import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { useCaseDetail } from "@/hooks/useCaseDetail";
import { useCases } from "@/hooks/useCases";
import { useCaseDocuments } from "@/hooks/useCaseDocuments";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Pencil, Trash2, UserCog, Plus, FileText, Download, Eye, Send, Upload, ChevronDown, ChevronUp } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { RelatedActivities } from "./RelatedActivities";
import { CaseForm } from "./CaseForm";
import { ReassignOwnerDialog } from "./ReassignOwnerDialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";


export const CaseDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: supportCase, isLoading } = useCaseDetail(id);
  const { updateCase, deleteCase, isUpdating } = useCases();
  const { documents, isLoading: isLoadingDocuments } = useCaseDocuments(id);
  
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  
  const [showReassignDialog, setShowReassignDialog] = useState(false);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  
  // Comment form state
  const [newComment, setNewComment] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  
  // Document upload state
  const [isUploading, setIsUploading] = useState(false);
  
  // Delete confirmation states
  const [deleteDocId, setDeleteDocId] = useState<string | null>(null);
  const [deleteCommentId, setDeleteCommentId] = useState<string | null>(null);
  
  // Add comment mutation
  const addCommentMutation = useMutation({
    mutationFn: async ({ caseId, comment, isInternal }: { caseId: string; comment: string; isInternal: boolean }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      
      const { error } = await supabase
        .from("case_comment")
        .insert({
          case_id: caseId,
          comment,
          is_internal: isInternal,
          user_id: user.id,
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["case-detail", id] });
      setNewComment("");
      setIsInternal(false);
      toast.success("Comment added");
    },
    onError: (error) => {
      console.error("Error adding comment:", error);
      toast.error("Failed to add comment");
    },
  });
  
  // Delete document mutation
  const deleteDocumentMutation = useMutation({
    mutationFn: async (docId: string) => {
      const doc = documents.find((d: any) => d.id === docId);
      if (doc?.storage_path) {
        await supabase.storage.from("documents").remove([doc.storage_path]);
      }
      const { error } = await supabase.from("documents").delete().eq("id", docId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["case-documents", id] });
      toast.success("Document deleted");
      setDeleteDocId(null);
    },
    onError: () => toast.error("Failed to delete document"),
  });
  
  // Delete comment mutation
  const deleteCommentMutation = useMutation({
    mutationFn: async (commentId: string) => {
      const { error } = await supabase.from("case_comment").delete().eq("id", commentId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["case-detail", id] });
      toast.success("Comment deleted");
      setDeleteCommentId(null);
    },
    onError: () => toast.error("Failed to delete comment"),
  });
  
  // Upload document handler
  const handleDocumentUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !id) return;
    
    setIsUploading(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      
      const { data: profile } = await supabase
        .from("profile")
        .select("tenant_id")
        .eq("id", user.id)
        .single();
      
      if (!profile) throw new Error("Profile not found");
      
      // Create storage path - use tenant_id as folder prefix per RLS policy
      const fileExt = file.name.split('.').pop();
      const fileName = `${profile.tenant_id}/cases/${id}/${Date.now()}-${file.name}`;
      
      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from("documents")
        .upload(fileName, file);
      
      if (uploadError) throw uploadError;
      
      // Create document record
      const { error: docError } = await supabase
        .from("documents")
        .insert({
          tenant_id: profile.tenant_id,
          owner_id: user.id,
          name: file.name,
          file_type: file.type || fileExt || 'unknown',
          file_size: file.size,
          storage_path: fileName,
          related_to_type: 'case',
          related_to_id: id,
          category: 'Case Document',
        });
      
      if (docError) throw docError;
      
      queryClient.invalidateQueries({ queryKey: ["case-documents", id] });
      toast.success("Document uploaded successfully");
    } catch (error) {
      console.error("Error uploading document:", error);
      toast.error("Failed to upload document");
    } finally {
      setIsUploading(false);
      // Reset file input
      event.target.value = '';
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!supportCase) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-muted-foreground">Case not found</p>
            <Button onClick={() => navigate("/crm/cases")} className="mt-4">
              Back to Cases
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleDelete = () => {
    deleteCase(supportCase.case_id);
    navigate("/crm/cases");
  };

  const handleUpdate = (data: any) => {
    updateCase({ case_id: supportCase.case_id, ...data });
    setIsEditing(false);
  };

  const handleReassign = (newOwnerId: string) => {
    updateCase({ case_id: supportCase.case_id, owner_user_id: newOwnerId });
    setShowReassignDialog(false);
  };

  const handleViewDocument = async (doc: any) => {
    try {
      const { data, error } = await supabase.storage
        .from('documents')
        .createSignedUrl(doc.storage_path, 3600); // 1 hour expiry

      if (error) throw error;
      
      if (data?.signedUrl) {
        window.open(data.signedUrl, '_blank');
      }
    } catch (error) {
      console.error('Error viewing document:', error);
    }
  };

  const handleDownloadDocument = async (doc: any) => {
    try {
      const { data, error } = await supabase.storage
        .from('documents')
        .createSignedUrl(doc.storage_path, 60); // 1 minute expiry

      if (error) throw error;
      
      if (data?.signedUrl) {
        const link = document.createElement('a');
        link.href = data.signedUrl;
        link.download = doc.name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (error) {
      console.error('Error downloading document:', error);
    }
  };



  return (
    <div className="p-6 space-y-6">
      {/* Breadcrumb */}
      <button 
        onClick={() => navigate("/crm/cases")}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-3 w-3" />
        Back to Cases
      </button>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{supportCase.subject}</h1>
          <p className="text-muted-foreground">Case #{supportCase.case_number}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowReassignDialog(true)}>
            <UserCog className="h-4 w-4 mr-2" />
            Reassign
          </Button>
          <Button variant="outline" onClick={() => setIsEditing(true)}>
            <Pencil className="h-4 w-4 mr-2" />
            Edit
          </Button>
          <Button variant="destructive" onClick={() => setShowDeleteDialog(true)}>
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>
        </div>
      </div>

      {/* Details Card */}
      <Card>
        <CardHeader>
          <CardTitle>Case Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Account</label>
              <p 
                className="mt-1 cursor-pointer hover:underline text-primary"
                onClick={() => supportCase.account && navigate(`/crm/accounts/${supportCase.account.account_id}`)}
              >
                {supportCase.account?.name || "-"}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Contact</label>
              <p 
                className="mt-1 cursor-pointer hover:underline text-primary"
                onClick={() => supportCase.contact && navigate(`/crm/contacts/${supportCase.contact.contact_id}`)}
              >
                {supportCase.contact 
                  ? `${supportCase.contact.first_name} ${supportCase.contact.last_name}` 
                  : "-"}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Status</label>
              <p className="mt-1">
                <Badge>{supportCase.status || "-"}</Badge>
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Priority</label>
              <p className="mt-1">
                <Badge variant={
                  supportCase.priority === "High" ? "destructive" :
                  supportCase.priority === "Medium" ? "default" :
                  "secondary"
                }>
                  {supportCase.priority || "-"}
                </Badge>
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Category</label>
              <p className="mt-1">{supportCase.category || "-"}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Origin</label>
              <p className="mt-1">{supportCase.origin || "-"}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Owner</label>
              <p className="mt-1">
                {(supportCase.owner as any)?.first_name || (supportCase.owner as any)?.last_name
                  ? `${(supportCase.owner as any)?.first_name || ''} ${(supportCase.owner as any)?.last_name || ''}`.trim()
                  : (supportCase.owner as any)?.email || "No owner assigned"}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Created</label>
              <p className="mt-1">
                {supportCase.created_at ? format(new Date(supportCase.created_at), "MMM dd, yyyy HH:mm") : "-"}
              </p>
            </div>
            {supportCase.resolved_at && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Resolved</label>
                <p className="mt-1">
                  {format(new Date(supportCase.resolved_at), "MMM dd, yyyy HH:mm")}
                </p>
              </div>
            )}
            <div className="col-span-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-muted-foreground">Description</label>
                {supportCase.description && supportCase.description.length > 300 && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
                    className="h-6 px-2 text-xs"
                  >
                    {isDescriptionExpanded ? (
                      <>
                        <ChevronUp className="h-3 w-3 mr-1" />
                        Collapse
                      </>
                    ) : (
                      <>
                        <ChevronDown className="h-3 w-3 mr-1" />
                        Expand
                      </>
                    )}
                  </Button>
                )}
              </div>
              <div 
                className={`mt-1 whitespace-pre-wrap break-words p-3 bg-muted/30 rounded-md border overflow-y-auto transition-all ${
                  isDescriptionExpanded ? 'max-h-none' : 'max-h-48'
                }`}
              >
                {supportCase.description || "-"}
              </div>
            </div>
            {supportCase.resolution && (
              <div className="col-span-2">
                <label className="text-sm font-medium text-muted-foreground">Resolution</label>
                <div className="mt-1 whitespace-pre-wrap break-words max-h-64 overflow-y-auto p-3 bg-muted/30 rounded-md border">
                  {supportCase.resolution}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Related Records Tabs */}
      <Tabs defaultValue="activities" className="w-full">
        <TabsList>
          <TabsTrigger value="activities">Activities</TabsTrigger>
          <TabsTrigger value="documents">
            <FileText className="h-4 w-4 mr-2" />
            Documents ({documents.length})
          </TabsTrigger>
          <TabsTrigger value="comments">Comments ({supportCase.comments?.length || 0})</TabsTrigger>
        </TabsList>

        <TabsContent value="activities">
          <RelatedActivities 
            entityType="case" 
            entityId={supportCase.case_id} 
            entityName={supportCase.subject}
          />
        </TabsContent>

        <TabsContent value="documents">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Case Documents</CardTitle>
              <div>
                <input
                  type="file"
                  id="document-upload"
                  className="hidden"
                  onChange={handleDocumentUpload}
                  disabled={isUploading}
                />
                <Button 
                  onClick={() => document.getElementById('document-upload')?.click()}
                  disabled={isUploading}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {isUploading ? "Uploading..." : "Upload Document"}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingDocuments ? (
                <div className="space-y-2">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : documents.length > 0 ? (
                <div className="space-y-4">
                  {documents.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <FileText className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{doc.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {doc.file_type} • {doc.file_size ? `${(doc.file_size / 1024).toFixed(2)} KB` : 'Unknown size'}
                          </p>
                          {doc.description && (
                            <p className="text-sm text-muted-foreground mt-1">{doc.description}</p>
                          )}
                          <p className="text-sm text-muted-foreground">
                            {doc.created_at ? format(new Date(doc.created_at), "MMM dd, yyyy") : "-"}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewDocument(doc)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownloadDocument(doc)}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setDeleteDocId(doc.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">No documents attached to this case</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="comments">
          <Card>
            <CardHeader>
              <CardTitle>Comments</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Add Comment Form */}
              <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
                <Textarea
                  placeholder="Add a comment..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  rows={3}
                />
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="internal"
                      checked={isInternal}
                      onCheckedChange={(checked) => setIsInternal(checked === true)}
                    />
                    <Label htmlFor="internal" className="text-sm text-muted-foreground cursor-pointer">
                      Internal comment (not visible to customer)
                    </Label>
                  </div>
                  <Button 
                    onClick={() => {
                      if (newComment.trim()) {
                        addCommentMutation.mutate({
                          caseId: supportCase.case_id,
                          comment: newComment.trim(),
                          isInternal,
                        });
                      }
                    }}
                    disabled={!newComment.trim() || addCommentMutation.isPending}
                    size="sm"
                  >
                    <Send className="h-4 w-4 mr-2" />
                    {addCommentMutation.isPending ? "Adding..." : "Add Comment"}
                  </Button>
                </div>
              </div>
              
              {/* Comments List */}
              {supportCase.comments && supportCase.comments.length > 0 ? (
                <div className="space-y-4">
                  {supportCase.comments.map((comment: any) => (
                    <div key={comment.id} className="border-b pb-4 last:border-0 flex items-start justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground mb-2">
                          {new Date(comment.created_at).toLocaleString()}
                          {comment.is_internal && (
                            <Badge variant="secondary" className="ml-2">Internal</Badge>
                          )}
                        </p>
                        <p>{comment.comment}</p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setDeleteCommentId(comment.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-4">No comments yet</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Reassign Owner Dialog */}
      <ReassignOwnerDialog
        open={showReassignDialog}
        onOpenChange={setShowReassignDialog}
        currentOwnerId={supportCase.owner_user_id}
        onReassign={handleReassign}
        isReassigning={isUpdating}
      />

      {/* Edit Dialog */}
      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Case</DialogTitle>
          </DialogHeader>
          <CaseForm
            case={supportCase}
            onSubmit={handleUpdate}
            onCancel={() => setIsEditing(false)}
          />
        </DialogContent>
      </Dialog>


      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Case?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {supportCase.subject}. This action cannot be undone.
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

      {/* Delete Document Confirmation */}
      <AlertDialog open={!!deleteDocId} onOpenChange={(open) => !open && setDeleteDocId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Document?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this document. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => deleteDocId && deleteDocumentMutation.mutate(deleteDocId)} 
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Comment Confirmation */}
      <AlertDialog open={!!deleteCommentId} onOpenChange={(open) => !open && setDeleteCommentId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Comment?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this comment. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => deleteCommentId && deleteCommentMutation.mutate(deleteCommentId)} 
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
