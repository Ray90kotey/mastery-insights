import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Plus, UserPlus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import Layout from "@/components/Layout";

interface Student {
  id: string;
  full_name: string;
  parent_name: string;
  parent_email: string;
  parent_phone: string;
}

interface ClassData {
  id: string;
  name: string;
  academic_year: string;
}

export default function ClassDetail() {
  const { classId } = useParams<{ classId: string }>();
  const [classData, setClassData] = useState<ClassData | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ full_name: "", parent_name: "", parent_email: "", parent_phone: "" });

  const fetchData = async () => {
    if (!classId) return;
    const [classRes, studentsRes] = await Promise.all([
      supabase.from("classes").select("*").eq("id", classId).single(),
      supabase.from("students").select("*").eq("class_id", classId).order("full_name"),
    ]);
    if (classRes.data) setClassData(classRes.data);
    if (studentsRes.data) setStudents(studentsRes.data);
  };

  useEffect(() => { fetchData(); }, [classId]);

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from("students").insert({ ...form, class_id: classId });
    if (error) { toast.error(error.message); return; }
    toast.success("Student added!");
    setForm({ full_name: "", parent_name: "", parent_email: "", parent_phone: "" });
    setOpen(false);
    fetchData();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("students").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Student removed");
    fetchData();
  };

  if (!classData) return <Layout><div className="animate-pulse h-8 w-48 rounded bg-muted" /></Layout>;

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground">{classData.name}</h1>
            <p className="text-muted-foreground mt-1">{classData.academic_year} · {students.length} students</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2"><UserPlus className="h-4 w-4" />Add Student</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add Student</DialogTitle></DialogHeader>
              <form onSubmit={handleAddStudent} className="space-y-3 mt-4">
                <Input placeholder="Student full name" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required />
                <Input placeholder="Parent name" value={form.parent_name} onChange={(e) => setForm({ ...form, parent_name: e.target.value })} />
                <Input type="email" placeholder="Parent email" value={form.parent_email} onChange={(e) => setForm({ ...form, parent_email: e.target.value })} />
                <Input placeholder="Parent phone (WhatsApp)" value={form.parent_phone} onChange={(e) => setForm({ ...form, parent_phone: e.target.value })} />
                <Button type="submit" className="w-full">Add Student</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {students.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-12 text-center">
            <UserPlus className="mx-auto h-12 w-12 text-muted-foreground/40" />
            <h3 className="mt-4 font-display text-lg font-semibold">No students yet</h3>
            <p className="mt-1 text-muted-foreground">Add students to start tracking their progress.</p>
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student Name</TableHead>
                  <TableHead className="hidden sm:table-cell">Parent</TableHead>
                  <TableHead className="hidden md:table-cell">Phone</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.full_name}</TableCell>
                    <TableCell className="hidden sm:table-cell text-muted-foreground">{s.parent_name}</TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground">{s.parent_phone}</TableCell>
                    <TableCell>
                      <button onClick={() => handleDelete(s.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </TableCell>
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
