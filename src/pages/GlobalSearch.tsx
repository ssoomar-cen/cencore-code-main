import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, History, Star, Save, Trash2 } from "lucide-react";
import { useGlobalSearch } from "@/hooks/useGlobalSearch";
import { useNavigate, useSearchParams } from "react-router-dom";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/cenergistic-api/client";
import { toast } from "sonner";

const GlobalSearch = () => {
  const [searchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState("all");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
  const [saveName, setSaveName] = useState("");

  const navigate = useNavigate();
  const { results, isLoading, searchHistory, savedSearches, saveToHistory, saveSearch } = useGlobalSearch(
    debouncedQuery,
    selectedType
  );

  // Read query parameter on mount
  useEffect(() => {
    const queryParam = searchParams.get("q");
    if (queryParam) {
      setSearchQuery(queryParam);
      setDebouncedQuery(queryParam);
    }
  }, [searchParams]);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
      if (searchQuery.length >= 2) {
        saveToHistory(searchQuery);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const entityTypes = [
    { value: "all", label: "All Types" },
    { value: "accounts", label: "Organizations" },
    { value: "contacts", label: "Contacts" },
    { value: "opportunities", label: "Opportunities" },
    { value: "projects", label: "Energy Programs" },
    { value: "contracts", label: "Contracts" },
    { value: "activities", label: "Activities" },
    { value: "documents", label: "Documents" },
  ];

  const handleResultClick = (url: string) => {
    navigate(url);
  };

  const handleSaveSearch = () => {
    if (!saveName.trim()) {
      toast.error("Please enter a name for the saved search");
      return;
    }
    saveSearch({ name: saveName, searchQuery: debouncedQuery });
    setIsSaveDialogOpen(false);
    setSaveName("");
  };

  const handleDeleteSavedSearch = async (id: string) => {
    const { error } = await supabase
      .from("saved_searches")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error("Failed to delete saved search");
    } else {
      toast.success("Saved search deleted");
      window.location.reload();
    }
  };

  const handleUseSavedSearch = (query: string) => {
    setSearchQuery(query);
    setDebouncedQuery(query);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Global Search</h1>
        <p className="text-muted-foreground mt-1">Search across all your CRM data</p>
      </div>

      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search organizations, contacts, opportunities, activities..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={selectedType} onValueChange={setSelectedType}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {entityTypes.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="results" className="space-y-6">
        <TabsList className="bg-muted">
          <TabsTrigger value="results">Search Results</TabsTrigger>
          <TabsTrigger value="history">
            <History className="h-4 w-4 mr-2" />
            History
          </TabsTrigger>
          <TabsTrigger value="saved">
            <Star className="h-4 w-4 mr-2" />
            Saved Searches
          </TabsTrigger>
        </TabsList>

        <TabsContent value="results" className="space-y-4">
          {!debouncedQuery || debouncedQuery.length < 2 ? (
            <Card>
              <CardContent className="py-12">
                <p className="text-center text-muted-foreground">
                  Enter at least 2 characters to search
                </p>
              </CardContent>
            </Card>
          ) : isLoading ? (
            <Card>
              <CardContent className="py-12">
                <p className="text-center text-muted-foreground">Searching...</p>
              </CardContent>
            </Card>
          ) : results.length === 0 ? (
            <Card>
              <CardContent className="py-12">
                <p className="text-center text-muted-foreground">
                  No results found for "{debouncedQuery}"
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Found {results.length} result{results.length !== 1 ? "s" : ""}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsSaveDialogOpen(true)}
                  className="gap-2"
                >
                  <Save className="h-4 w-4" />
                  Save Search
                </Button>
              </div>

              <div className="space-y-2">
                {results.map((result) => (
                  <Card
                    key={`${result.type}-${result.id}`}
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => handleResultClick(result.url)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="secondary" className="text-xs">
                              {result.type}
                            </Badge>
                            <h3 className="font-medium text-foreground">{result.title}</h3>
                          </div>
                          {result.subtitle && (
                            <p className="text-sm text-muted-foreground">{result.subtitle}</p>
                          )}
                          {result.description && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {result.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          {searchHistory.length === 0 ? (
            <Card>
              <CardContent className="py-12">
                <p className="text-center text-muted-foreground">No search history</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {searchHistory.map((item: any) => (
                <Card
                  key={item.id}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => handleUseSavedSearch(item.search_query)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="font-medium text-foreground">{item.search_query}</p>
                        <p className="text-sm text-muted-foreground">
                          {item.result_count} result{item.result_count !== 1 ? "s" : ""} •{" "}
                          {format(new Date(item.created_at), "MMM dd, yyyy h:mm a")}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="saved" className="space-y-4">
          {savedSearches.length === 0 ? (
            <Card>
              <CardContent className="py-12">
                <p className="text-center text-muted-foreground">No saved searches</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {savedSearches.map((item: any) => (
                <Card key={item.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div
                        className="flex-1 cursor-pointer"
                        onClick={() => handleUseSavedSearch(item.search_query)}
                      >
                        <p className="font-medium text-foreground">{item.name}</p>
                        <p className="text-sm text-muted-foreground">{item.search_query}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteSavedSearch(item.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Save Search Dialog */}
      <Dialog open={isSaveDialogOpen} onOpenChange={setIsSaveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Search</DialogTitle>
            <DialogDescription>
              Give this search a name so you can easily find it later
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="search-name">Search Name</Label>
              <Input
                id="search-name"
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                placeholder="e.g., Active Opportunities"
              />
            </div>
            <div className="space-y-2">
              <Label>Search Query</Label>
              <p className="text-sm text-muted-foreground">{debouncedQuery}</p>
            </div>
            <div className="flex gap-3">
              <Button onClick={handleSaveSearch} className="flex-1">
                Save
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setIsSaveDialogOpen(false);
                  setSaveName("");
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default GlobalSearch;
