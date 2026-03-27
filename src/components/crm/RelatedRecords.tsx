import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { CRMTable, Column } from "./CRMTable";

interface RelatedRecordsProps {
  title: string;
  records: any[];
  columns: Column[];
  onRecordClick?: (id: string) => void;
  onAddNew: () => void;
  isLoading: boolean;
  idField: string;
  emptyMessage?: string;
}

export const RelatedRecords = ({
  title,
  records,
  columns,
  onRecordClick,
  onAddNew,
  isLoading,
  idField,
  emptyMessage = "No records found"
}: RelatedRecordsProps) => {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle>{title}</CardTitle>
        <Button onClick={onAddNew} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Add {title.slice(0, -1)}
        </Button>
      </CardHeader>
      <CardContent>
        <CRMTable
          data={records}
          columns={columns}
          idField={idField}
          isLoading={isLoading}
          emptyMessage={emptyMessage}
          onRecordClick={onRecordClick}
        />
      </CardContent>
    </Card>
  );
};
