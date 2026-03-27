import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Case } from "@/hooks/useCases";
import { formatDistanceToNow } from "date-fns";
import { Inbox, ArrowRight, UserPlus } from "lucide-react";
import DOMPurify from "dompurify";
import { ReassignOwnerDialog } from "./ReassignOwnerDialog";

interface CaseQueueProps {
  cases: Case[];
  onTakeCase: (caseId: string) => void;
  onViewCase: (caseData: Case) => void;
  onAssignCase?: (caseId: string, userId: string) => void;
}

const getPriorityColor = (priority: string) => {
  switch (priority.toLowerCase()) {
    case "critical":
      return "destructive";
    case "high":
      return "default";
    case "normal":
      return "secondary";
    case "low":
      return "outline";
    default:
      return "secondary";
  }
};

export const CaseQueue = ({ cases, onTakeCase, onViewCase, onAssignCase }: CaseQueueProps) => {
  const unassignedCases = cases.filter((c) => !c.owner_user_id);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedCaseForAssign, setSelectedCaseForAssign] = useState<Case | null>(null);
  const [isAssigning, setIsAssigning] = useState(false);

  const handleAssignClick = (caseData: Case) => {
    setSelectedCaseForAssign(caseData);
    setAssignDialogOpen(true);
  };

  const handleAssign = async (newOwnerId: string) => {
    if (selectedCaseForAssign && onAssignCase) {
      setIsAssigning(true);
      try {
        await onAssignCase(selectedCaseForAssign.case_id, newOwnerId);
        setAssignDialogOpen(false);
        setSelectedCaseForAssign(null);
      } finally {
        setIsAssigning(false);
      }
    }
  };

  if (unassignedCases.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Inbox className="h-5 w-5" />
            Case Queue
          </CardTitle>
          <CardDescription>Unassigned cases waiting to be picked up</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Inbox className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No cases in queue</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Inbox className="h-5 w-5" />
            Case Queue
            <Badge variant="secondary">{unassignedCases.length}</Badge>
          </CardTitle>
          <CardDescription>Unassigned cases waiting to be picked up</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {unassignedCases.map((caseData) => (
              <Card key={caseData.case_id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="font-mono text-xs">
                          {caseData.case_number}
                        </Badge>
                        <Badge variant={getPriorityColor(caseData.priority)}>
                          {caseData.priority}
                        </Badge>
                        {caseData.category && (
                          <Badge variant="secondary">{caseData.category}</Badge>
                        )}
                      </div>
                      
                      <h4 className="font-semibold">{caseData.subject}</h4>
                      
                      {caseData.description && (
                        <div 
                          className="text-sm text-muted-foreground line-clamp-3 prose prose-sm max-w-none [&>*]:my-0"
                          dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(caseData.description) }}
                        />
                      )}
                      
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>{caseData.origin}</span>
                        <span>•</span>
                        <span>
                          {formatDistanceToNow(new Date(caseData.created_at), { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onViewCase(caseData)}
                      >
                        View
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                      {onAssignCase && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleAssignClick(caseData)}
                        >
                          <UserPlus className="mr-2 h-4 w-4" />
                          Assign
                        </Button>
                      )}
                      <Button
                        size="sm"
                        onClick={() => onTakeCase(caseData.case_id)}
                      >
                        Take Case
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      <ReassignOwnerDialog
        open={assignDialogOpen}
        onOpenChange={setAssignDialogOpen}
        currentOwnerId={null}
        onReassign={handleAssign}
        isReassigning={isAssigning}
      />
    </>
  );
};