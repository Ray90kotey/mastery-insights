import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Settings as SettingsIcon, Calendar, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import Layout from "@/components/Layout";
import TermCard from "@/components/TermCard";

interface ClassOption {
  id: string;
  name: string;
  academic_year: string;
}

interface Term {
  id: string;
  name: string;
  class_id: string;
}

export default function Settings() {
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [terms, setTerms] = useState<Term[]>([]);
  const [termDialogOpen, setTermDialogOpen] = useState(false);
  const [newTermName, setNewTermName] = useState("Term 1");
  const [editingYear, setEditingYear] = useState<{ classId: string; year: string } | null>(null);

  const fetchClasses = async () => {
    const { data } = await supabase.from("classes").select("id, name, academic_year").order("name");
    if (data) {
      setClasses(data);
      if (!selectedClassId && data.length > 0) setSelectedClassId(data[0].id);
    }
  };

  const fetchTerms = async (classId: string) => {
    const { data } = await supabase.from("terms").select("*").eq("class_id", classId).order("name");
    if (data) setTerms(data);
  };

  useEffect(() => { fetchClasses(); }, []);
  useEffect(() => { if (selectedClassId) fetchTerms(selectedClassId); }, [selectedClassId]);

  const selectedClass = classes.find((c) => c.id === selectedClassId);

  const handleUpdateYear = async (classId: string, year: string) => {
    const { error } = await supabase.from("classes").update({ academic_year: year }).eq("id", classId);
    if (error) { toast.error(error.message); return; }
    toast.success("Academic year updated");
    setEditingYear(null);
    fetchClasses();
  };

  const handleAddTerm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClassId) return;
    const { error } = await supabase.from("terms").insert({ name: newTermName, class_id: selectedClassId });
    if (error) { toast.error(error.message); return; }
    toast.success("Term added");
    setTermDialogOpen(false);
    setNewTermName("Term 1");
    fetchTerms(selectedClassId);
  };

  const handleDeleteTerm = async (termId: string) => {
    const { error } = await supabase.from("terms").delete().eq("id", termId);
    if (error) { toast.error(error.message); return; }
    toast.success("Term deleted");
    fetchTerms(selectedClassId);
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">Academic Setup</h1>
          <p className="text-muted-foreground mt-1">Configure academic year and terms for your classes</p>
        </div>

        {classes.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-12 text-center">
            <SettingsIcon className="mx-auto h-12 w-12 text-muted-foreground/40" />
            <h3 className="mt-4 font-display text-lg font-semibold">No classes yet</h3>
            <p className="mt-1 text-muted-foreground">Create a class first to configure its academic structure.</p>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
            {/* Class selector */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Select Class</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                {classes.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setSelectedClassId(c.id)}
                    className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                      selectedClassId === c.id
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    <span>{c.name}</span>
                    <Badge variant="secondary" className="text-xs">{c.academic_year}</Badge>
                  </button>
                ))}
              </CardContent>
            </Card>

            {/* Settings panel */}
            <div className="space-y-6">
              {/* Academic Year */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-primary" />
                    <CardTitle className="text-base">Academic Year</CardTitle>
                  </div>
                  <CardDescription>Set the academic year for {selectedClass?.name}</CardDescription>
                </CardHeader>
                <CardContent>
                  {editingYear?.classId === selectedClassId ? (
                    <div className="flex items-center gap-2">
                      <Input
                        value={editingYear.year}
                        onChange={(e) => setEditingYear({ ...editingYear, year: e.target.value })}
                        placeholder="e.g. 2025/2026"
                        className="max-w-[200px]"
                      />
                      <Button size="sm" onClick={() => handleUpdateYear(selectedClassId, editingYear.year)}>Save</Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditingYear(null)}>Cancel</Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-semibold">{selectedClass?.academic_year}</span>
                      <Button size="sm" variant="outline" onClick={() => setEditingYear({ classId: selectedClassId, year: selectedClass?.academic_year || "" })}>
                        Edit
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Terms */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <BookOpen className="h-5 w-5 text-primary" />
                      <CardTitle className="text-base">Terms</CardTitle>
                    </div>
                    <Dialog open={termDialogOpen} onOpenChange={setTermDialogOpen}>
                      <DialogTrigger asChild>
                        <Button size="sm" variant="outline" className="gap-1">
                          <Plus className="h-4 w-4" /> Add Term
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader><DialogTitle>Add Term</DialogTitle></DialogHeader>
                        <form onSubmit={handleAddTerm} className="space-y-3 mt-4">
                          <Input
                            placeholder="Term name (e.g. Term 1)"
                            value={newTermName}
                            onChange={(e) => setNewTermName(e.target.value)}
                            required
                          />
                          <Button type="submit" className="w-full">Add Term</Button>
                        </form>
                      </DialogContent>
                    </Dialog>
                  </div>
                  <CardDescription>Manage terms for {selectedClass?.name}</CardDescription>
                </CardHeader>
                <CardContent>
                  {terms.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">No terms added yet. Add your first term to get started.</p>
                  ) : (
                    <div className="space-y-2">
                      {terms.map((term) => (
                        <TermCard
                          key={term.id}
                          termId={term.id}
                          termName={term.name}
                          onDelete={() => handleDeleteTerm(term.id)}
                        />
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
