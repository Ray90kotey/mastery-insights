import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Plus, ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import Layout from "@/components/Layout";

interface Assessment {
  id: string;
  title: string;
  type: string;
  total_score: number;
  date: string;
  class_id: string;
}

interface ClassOption {
  id: string;
  name: string;
}

const typeColors: Record<string, string> = {
  Classwork: "bg-muted text-muted-foreground",
  Quiz: "bg-info/10 text-info",
  Test: "bg-primary/10 text-primary",
  Project: "bg-accent/10 text-accent",
};

export default function Assessments() {
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", type: "Classwork", total_score: "100", class_id: "", date: new Date().toISOString().split("T")[0] });

  const fetchData = async () => {
    const [aRes, cRes] = await Promise.all([
      supabase.from("assessments").select("*").order("date", { ascending: false }),
      supabase.from("classes").select("id, name"),
    ]);
    if (aRes.data) setAssessments(aRes.data);
    if (cRes.data) setClasses(cRes.data);
  };

  useEffect(() => { fetchData(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from("assessments").insert({
      title: form.title,
      type: form.type,
      total_score: Number(form.total_score),
      class_id: form.class_id,
      date: form.date,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Assessment created!");
    setOpen(false);
    fetchData();
  };

  const getClassName = (classId: string) => classes.find((c) => c.id === classId)?.name || "";

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground">Assessments</h1>
            <p className="text-muted-foreground mt-1">Create and manage assessments</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2" disabled={classes.length === 0}>
                <Plus className="h-4 w-4" />New Assessment
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Create Assessment</DialogTitle></DialogHeader>
              <form onSubmit={handleCreate} className="space-y-3 mt-4">
                <Input placeholder="Assessment title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["Classwork", "Quiz", "Test", "Project"].map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={form.class_id} onValueChange={(v) => setForm({ ...form, class_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                  <SelectContent>
                    {classes.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input type="number" placeholder="Total score" value={form.total_score} onChange={(e) => setForm({ ...form, total_score: e.target.value })} required />
                <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
                <Button type="submit" className="w-full">Create Assessment</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {assessments.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-12 text-center">
            <ClipboardList className="mx-auto h-12 w-12 text-muted-foreground/40" />
            <h3 className="mt-4 font-display text-lg font-semibold">No assessments yet</h3>
            <p className="mt-1 text-muted-foreground">{classes.length === 0 ? "Create a class first, then add assessments." : "Create your first assessment to start grading."}</p>
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="hidden sm:table-cell">Class</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead className="hidden md:table-cell">Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assessments.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">{a.title}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={typeColors[a.type]}>{a.type}</Badge>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-muted-foreground">{getClassName(a.class_id)}</TableCell>
                    <TableCell>{a.total_score}</TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground">{a.date}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </Layout>
  );
}
