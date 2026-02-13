import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Plus, GraduationCap, Users, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { motion } from "framer-motion";
import Layout from "@/components/Layout";
import { Link } from "react-router-dom";

interface ClassItem {
  id: string;
  name: string;
  academic_year: string;
  created_at: string;
  student_count?: number;
}

export default function Classes() {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [newClassName, setNewClassName] = useState("");
  const [newAcademicYear, setNewAcademicYear] = useState("2024/2025");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchClasses = async () => {
    const { data, error } = await supabase.from("classes").select("*").order("created_at", { ascending: false });
    if (error) { toast.error(error.message); return; }

    // Get student counts
    const classIds = data.map((c: any) => c.id);
    const { data: students } = await supabase.from("students").select("class_id").in("class_id", classIds.length > 0 ? classIds : ["none"]);

    const countMap: Record<string, number> = {};
    students?.forEach((s: any) => { countMap[s.class_id] = (countMap[s.class_id] || 0) + 1; });

    setClasses(data.map((c: any) => ({ ...c, student_count: countMap[c.id] || 0 })));
    setLoading(false);
  };

  useEffect(() => { fetchClasses(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from("classes").insert({
      name: newClassName.trim(),
      academic_year: newAcademicYear,
      teacher_id: user.id,
    });

    if (error) { toast.error(error.message); return; }
    toast.success("Class created!");
    setNewClassName("");
    setOpen(false);
    fetchClasses();
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground">Classes</h1>
            <p className="text-muted-foreground mt-1">Manage your classes and students</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                New Class
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Class</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4 mt-4">
                <Input
                  placeholder="e.g. Grade 6 Mathematics"
                  value={newClassName}
                  onChange={(e) => setNewClassName(e.target.value)}
                  required
                />
                <Input
                  placeholder="Academic Year"
                  value={newAcademicYear}
                  onChange={(e) => setNewAcademicYear(e.target.value)}
                  required
                />
                <Button type="submit" className="w-full">Create Class</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 animate-pulse rounded-xl bg-muted" />
            ))}
          </div>
        ) : classes.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-12 text-center">
            <GraduationCap className="mx-auto h-12 w-12 text-muted-foreground/40" />
            <h3 className="mt-4 font-display text-lg font-semibold">No classes yet</h3>
            <p className="mt-1 text-muted-foreground">Create your first class to start tracking student mastery.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {classes.map((cls, i) => (
              <motion.div
                key={cls.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Link
                  to={`/classes/${cls.id}`}
                  className="group flex flex-col rounded-xl border border-border bg-card p-6 shadow-sm transition-all hover:shadow-md hover:border-primary/30"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <GraduationCap className="h-5 w-5 text-primary" />
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1" />
                  </div>
                  <h3 className="mt-4 font-display text-lg font-semibold text-card-foreground">{cls.name}</h3>
                  <div className="mt-2 flex items-center gap-4 text-sm text-muted-foreground">
                    <span>{cls.academic_year}</span>
                    <span className="flex items-center gap-1">
                      <Users className="h-3.5 w-3.5" />
                      {cls.student_count} students
                    </span>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
