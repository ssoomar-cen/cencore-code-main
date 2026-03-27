import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useBuildings, Building } from "@/hooks/useBuildings";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";

export const BuildingsModule = () => {
  const navigate = useNavigate();
  const { buildings, isLoading, createBuilding, deleteBuilding } = useBuildings();
  const [searchQuery, setSearchQuery] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);

  const filteredBuildings = useMemo(() => {
    if (!buildings) return [];
    if (!searchQuery) return buildings;
    const q = searchQuery.toLowerCase();
    return buildings.filter((b) =>
      b.name?.toLowerCase().includes(q) ||
      b.building_no?.toLowerCase().includes(q) ||
      b.city?.toLowerCase().includes(q) ||
      b.state?.toLowerCase().includes(q) ||
      b.primary_use?.toLowerCase().includes(q)
    );
  }, [buildings, searchQuery]);

  const getStatusVariant = (status: string | null | undefined) => {
    switch (status?.toLowerCase()) {
      case "active": return "default";
      case "inactive": return "secondary";
      default: return "outline";
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Buildings</h1>
          <p className="text-muted-foreground mt-1">Manage building records and locations</p>
        </div>
        <Button onClick={() => setIsFormOpen(true)} size="default" className="w-full sm:w-auto gap-2">
          <Plus className="h-4 w-4" />
          New Building
        </Button>
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="text-sm text-muted-foreground">{filteredBuildings.length} buildings</div>
      </div>

      {/* Search */}
      <div className="relative w-full sm:max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search buildings..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="max-h-[calc(100vh-18rem)] overflow-y-auto overflow-x-auto rounded-lg">
            <table className="w-full caption-bottom text-sm border-collapse">
              <thead className="sticky top-0 z-20 bg-background">
                <tr className="bg-background border-b">
                  <th className="sticky top-0 left-0 z-30 bg-background h-9 px-2.5 text-left align-middle text-xs font-medium text-muted-foreground uppercase tracking-wide">Name</th>
                  <th className="sticky top-0 z-20 bg-background h-9 px-2.5 text-left align-middle text-xs font-medium text-muted-foreground uppercase tracking-wide">Building #</th>
                  <th className="sticky top-0 z-20 bg-background h-9 px-2.5 text-left align-middle text-xs font-medium text-muted-foreground uppercase tracking-wide">City</th>
                  <th className="sticky top-0 z-20 bg-background h-9 px-2.5 text-left align-middle text-xs font-medium text-muted-foreground uppercase tracking-wide">State</th>
                  <th className="sticky top-0 z-20 bg-background h-9 px-2.5 text-left align-middle text-xs font-medium text-muted-foreground uppercase tracking-wide">Primary Use</th>
                  <th className="sticky top-0 z-20 bg-background h-9 px-2.5 text-right align-middle text-xs font-medium text-muted-foreground uppercase tracking-wide">Sq Ft</th>
                  <th className="sticky top-0 z-20 bg-background h-9 px-2.5 text-left align-middle text-xs font-medium text-muted-foreground uppercase tracking-wide">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredBuildings.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-muted-foreground">
                      No buildings found
                    </td>
                  </tr>
                ) : (
                  filteredBuildings.map((building) => (
                    <tr
                      key={building.building_id}
                      className="border-b transition-colors cursor-pointer hover:bg-muted/50"
                      onClick={() => navigate(`/crm/buildings/${building.building_id}`)}
                    >
                      <td className="sticky left-0 z-20 bg-background px-2.5 py-2 align-middle text-sm font-medium text-primary hover:underline">{building.name}</td>
                      <td className="px-2.5 py-2 align-middle text-sm">{building.building_no || "-"}</td>
                      <td className="px-2.5 py-2 align-middle text-sm">{building.city || "-"}</td>
                      <td className="px-2.5 py-2 align-middle text-sm">{building.state || "-"}</td>
                      <td className="px-2.5 py-2 align-middle text-sm">{building.primary_use || "-"}</td>
                      <td className="px-2.5 py-2 align-middle text-sm text-right">
                        {building.square_footage ? building.square_footage.toLocaleString() : "-"}
                      </td>
                      <td className="px-2.5 py-2 align-middle text-sm">
                        <Badge variant={getStatusVariant(building.status)}>
                          {building.status || "Unknown"}
                        </Badge>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* New Building Form */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>New Building</DialogTitle>
          </DialogHeader>
          <SimpleBuildingForm
            onSubmit={(data) => {
              createBuilding(data);
              setIsFormOpen(false);
            }}
            onCancel={() => setIsFormOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

function SimpleBuildingForm({ onSubmit, onCancel }: { onSubmit: (data: any) => void; onCancel: () => void }) {
  const [name, setName] = useState("");
  const [buildingNo, setBuildingNo] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zip, setZip] = useState("");
  const [primaryUse, setPrimaryUse] = useState("");
  const [sqft, setSqft] = useState("");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({
          name,
          building_no: buildingNo || null,
          city: city || null,
          state: state || null,
          zip: zip || null,
          primary_use: primaryUse || null,
          square_footage: sqft ? parseFloat(sqft) : null,
          status: "Active",
        });
      }}
      className="space-y-4"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5 md:col-span-2">
          <Label className="text-xs">Name *</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Building #</Label>
          <Input value={buildingNo} onChange={(e) => setBuildingNo(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Primary Use</Label>
          <Input value={primaryUse} onChange={(e) => setPrimaryUse(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">City</Label>
          <Input value={city} onChange={(e) => setCity(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">State</Label>
          <Input value={state} onChange={(e) => setState(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Zip</Label>
          <Input value={zip} onChange={(e) => setZip(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Square Footage</Label>
          <Input type="number" value={sqft} onChange={(e) => setSqft(e.target.value)} />
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit">Create Building</Button>
      </div>
    </form>
  );
}
