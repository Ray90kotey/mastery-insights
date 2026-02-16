import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Plus, ClipboardList, Save, Loader2 } from "lucide-react";
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
  lesson_id: string | null;
  outcome_id: string | null;
}

interface ClassOption {
  id: string;
  name: string;
}

interface Student {
  id: string;
  full_name: string;
}

interface ScoreEntry {
  student_id: string;
  score: string;
}

interface LessonOption {
  id: string;
  title: string;
  week_number: number;
  term_name: string;
}

interface OutcomeOption {
  id: string;
  description: string;
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
  const [form, setForm] = useState({ title: "", type: "Classwork", total_score: "100", class_id: "", lesson_id: "", outcome_id: "", date: new Date().toISOString().split("T")[0] });

  // Lesson/outcome options for form
  const [lessonOptions, setLessonOptions] = useState<LessonOption[]>([]);
  const [outcomeOptions, setOutcomeOptions] = useState<OutcomeOption[]>([]);

  // Score entry state
  const [scoreOpen, setScoreOpen] = useState(false);
  const [selectedAssessment, setSelectedAssessment] = useState<Assessment | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [scores, setScores] = useState<ScoreEntry[]>([]);
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    const [aRes, cRes] = await Promise.all([
      supabase.from("assessments").select("*").order("date", { ascending: false }),
      supabase.from("classes").select("id, name"),
    ]);
    if (aRes.data) setAssessments(aRes.data);
    if (cRes.data) setClasses(cRes.data);
  };

  useEffect(() => { fetchData(); }, []);

  // Fetch lessons when class changes in form
  const fetchLessonsForClass = async (classId: string) => {
    setLessonOptions([]);
    setOutcomeOptions([]);
    setForm((f) => ({ ...f, lesson_id: "", outcome_id: "" }));
    if (!classId) return;
    const { data: terms } = await supabase.from("terms").select("id, name").eq("class_id", classId);
    if (!terms || terms.length === 0) return;
    const { data: weeks } = await supabase.from("weeks").select("id, week_number, term_id").in("term_id", terms.map((t) => t.id)).order("week_number");
    if (!weeks || weeks.length === 0) return;
    const { data: lessons } = await supabase.from("lessons").select("id, title, week_id").in("week_id", weeks.map((w) => w.id)).order("title");
    if (!lessons) return;
    const termMap = Object.fromEntries(terms.map((t) => [t.id, t.name]));
    setLessonOptions(lessons.map((l) => {
      const week = weeks.find((w) => w.id === l.week_id)!;
      return { id: l.id, title: l.title, week_number: week.week_number, term_name: termMap[week.term_id] };
    }));
  };

  // Fetch outcomes when lesson changes in form
  const fetchOutcomesForLesson = async (lessonId: string) => {
    setOutcomeOptions([]);
    setForm((f) => ({ ...f, outcome_id: "" }));
    if (!lessonId) return;
    const { data } = await supabase.from("outcomes").select("id, description").eq("lesson_id", lessonId);
    if (data) setOutcomeOptions(data);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from("assessments").insert({
      title: form.title,
      type: form.type,
      total_score: Number(form.total_score),
      class_id: form.class_id,
      lesson_id: form.lesson_id || null,
      outcome_id: form.outcome_id || null,
      date: form.date,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Assessment created!");
    setOpen(false);
    fetchData();
  };

  const openScoreEntry = async (assessment: Assessment) => {
    setSelectedAssessment(assessment);
    setScoreOpen(true);

    const [studentsRes, scoresRes] = await Promise.all([
      supabase.from("students").select("id, full_name").eq("class_id", assessment.class_id).order("full_name"),
      supabase.from("student_scores").select("student_id, score").eq("assessment_id", assessment.id),
    ]);

    const studentList = studentsRes.data || [];
    const existingScores = scoresRes.data || [];
    setStudents(studentList);

    setScores(studentList.map((s) => {
      const existing = existingScores.find((sc) => sc.student_id === s.id);
      return { student_id: s.id, score: existing ? String(existing.score) : "" };
    }));
  };

  const updateScore = (studentId: string, value: string) => {
    setScores((prev) => prev.map((s) => s.student_id === studentId ? { ...s, score: value } : s));
  };

  const handleSaveScores = async () => {
    if (!selectedAssessment) return;
    setSaving(true);

    // Delete existing scores for this assessment then upsert
    await supabase.from("student_scores").delete().eq("assessment_id", selectedAssessment.id);

    const toInsert = scores
      .filter((s) => s.score !== "")
      .map((s) => ({
        assessment_id: selectedAssessment.id,
        student_id: s.student_id,
        score: Number(s.score),
      }));

    if (toInsert.length > 0) {
      const { error } = await supabase.from("student_scores").insert(toInsert);
      if (error) { toast.error(error.message); setSaving(false); return; }
    }

    toast.success("Scores saved!");
    setSaving(false);
    setScoreOpen(false);
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
                <Select value={form.class_id} onValueChange={(v) => { setForm({ ...form, class_id: v }); fetchLessonsForClass(v); }}>
                  <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                  <SelectContent>
                    {classes.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.class_id && lessonOptions.length > 0 && (
                  <Select value={form.lesson_id} onValueChange={(v) => { setForm({ ...form, lesson_id: v }); fetchOutcomesForLesson(v); }}>
                    <SelectTrigger><SelectValue placeholder="Link to lesson (optional)" /></SelectTrigger>
                    <SelectContent>
                      {lessonOptions.map((l) => (
                        <SelectItem key={l.id} value={l.id}>{l.term_name} · W{l.week_number} · {l.title}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                {form.lesson_id && outcomeOptions.length > 0 && (
                  <Select value={form.outcome_id} onValueChange={(v) => setForm({ ...form, outcome_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Link to outcome (optional)" /></SelectTrigger>
                    <SelectContent>
                      {outcomeOptions.map((o) => (
                        <SelectItem key={o.id} value={o.id}>{o.description}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
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
                  <TableRow key={a.id} className="cursor-pointer hover:bg-muted/60" onClick={() => openScoreEntry(a)}>
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

        {/* Score Entry Dialog */}
        <Dialog open={scoreOpen} onOpenChange={setScoreOpen}>
          <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                Enter Scores — {selectedAssessment?.title}
                <span className="block text-sm font-normal text-muted-foreground mt-1">
                  {selectedAssessment && getClassName(selectedAssessment.class_id)} · Max: {selectedAssessment?.total_score}
                </span>
              </DialogTitle>
            </DialogHeader>
            {students.length === 0 ? (
              <p className="text-muted-foreground text-center py-6">No students in this class. Add students first.</p>
            ) : (
              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  {students.map((student, idx) => {
                    const entry = scores.find((s) => s.student_id === student.id);
                    const val = entry?.score || "";
                    const numVal = Number(val);
                    const isOver = val !== "" && numVal > (selectedAssessment?.total_score || 0);
                    return (
                      <div key={student.id} className="flex items-center gap-3">
                        <span className="text-sm text-muted-foreground w-6 text-right">{idx + 1}.</span>
                        <span className="flex-1 text-sm font-medium truncate">{student.full_name}</span>
                        <Input
                          type="number"
                          min={0}
                          max={selectedAssessment?.total_score}
                          placeholder="—"
                          value={val}
                          onChange={(e) => updateScore(student.id, e.target.value)}
                          className={`w-20 text-center ${isOver ? "border-destructive" : ""}`}
                        />
                      </div>
                    );
                  })}
                </div>
                <Button onClick={handleSaveScores} className="w-full gap-2" disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Save Scores
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
