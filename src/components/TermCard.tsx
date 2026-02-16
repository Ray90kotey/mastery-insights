import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Trash2, ChevronDown, ChevronRight, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "sonner";

interface Week {
  id: string;
  week_number: number;
  term_id: string;
}

interface Lesson {
  id: string;
  title: string;
  week_id: string;
}

interface TermCardProps {
  termId: string;
  termName: string;
  onDelete: () => void;
}

export default function TermCard({ termId, termName, onDelete }: TermCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [weeks, setWeeks] = useState<Week[]>([]);
  const [lessons, setLessons] = useState<Record<string, Lesson[]>>({});
  const [addingLesson, setAddingLesson] = useState<string | null>(null);
  const [newLessonTitle, setNewLessonTitle] = useState("");

  const fetchWeeks = async () => {
    const { data } = await supabase
      .from("weeks")
      .select("*")
      .eq("term_id", termId)
      .order("week_number");
    if (data) setWeeks(data);
  };

  const fetchLessons = async (weekIds: string[]) => {
    if (weekIds.length === 0) return;
    const { data } = await supabase
      .from("lessons")
      .select("*")
      .in("week_id", weekIds)
      .order("title");
    if (data) {
      const grouped: Record<string, Lesson[]> = {};
      data.forEach((l) => {
        if (!grouped[l.week_id]) grouped[l.week_id] = [];
        grouped[l.week_id].push(l);
      });
      setLessons(grouped);
    }
  };

  useEffect(() => {
    if (expanded) {
      fetchWeeks();
    }
  }, [expanded, termId]);

  useEffect(() => {
    if (weeks.length > 0) {
      fetchLessons(weeks.map((w) => w.id));
    }
  }, [weeks]);

  const handleAddWeek = async () => {
    const nextNum = weeks.length > 0 ? Math.max(...weeks.map((w) => w.week_number)) + 1 : 1;
    const { error } = await supabase.from("weeks").insert({ term_id: termId, week_number: nextNum });
    if (error) { toast.error(error.message); return; }
    toast.success(`Week ${nextNum} added`);
    fetchWeeks();
  };

  const handleDeleteWeek = async (weekId: string) => {
    const { error } = await supabase.from("weeks").delete().eq("id", weekId);
    if (error) { toast.error(error.message); return; }
    toast.success("Week deleted");
    fetchWeeks();
  };

  const handleAddLesson = async (weekId: string) => {
    if (!newLessonTitle.trim()) return;
    const { error } = await supabase.from("lessons").insert({ title: newLessonTitle.trim(), week_id: weekId });
    if (error) { toast.error(error.message); return; }
    toast.success("Lesson added");
    setAddingLesson(null);
    setNewLessonTitle("");
    fetchLessons(weeks.map((w) => w.id));
  };

  const handleDeleteLesson = async (lessonId: string) => {
    const { error } = await supabase.from("lessons").delete().eq("id", lessonId);
    if (error) { toast.error(error.message); return; }
    toast.success("Lesson deleted");
    fetchLessons(weeks.map((w) => w.id));
  };

  return (
    <Collapsible open={expanded} onOpenChange={setExpanded}>
      <div className="rounded-lg border border-border">
        <div className="flex items-center justify-between px-4 py-3">
          <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium hover:text-primary transition-colors">
            {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            {termName}
            <span className="text-xs text-muted-foreground">({weeks.length} weeks)</span>
          </CollapsibleTrigger>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-muted-foreground hover:text-destructive"
            onClick={onDelete}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>

        <CollapsibleContent>
          <div className="border-t border-border px-4 py-3 space-y-3">
            {weeks.map((week) => (
              <div key={week.id} className="rounded-md bg-muted/50 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">Week {week.week_number}</span>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    onClick={() => handleDeleteWeek(week.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>

                {/* Lessons */}
                {(lessons[week.id] || []).map((lesson) => (
                  <div key={lesson.id} className="flex items-center justify-between pl-3 py-1.5 rounded bg-background border border-border">
                    <div className="flex items-center gap-2">
                      <BookOpen className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-sm">{lesson.title}</span>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={() => handleDeleteLesson(lesson.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}

                {/* Add lesson */}
                {addingLesson === week.id ? (
                  <div className="flex items-center gap-2 pl-3">
                    <Input
                      placeholder="Lesson title"
                      value={newLessonTitle}
                      onChange={(e) => setNewLessonTitle(e.target.value)}
                      className="h-8 text-sm"
                      autoFocus
                      onKeyDown={(e) => { if (e.key === "Enter") handleAddLesson(week.id); if (e.key === "Escape") { setAddingLesson(null); setNewLessonTitle(""); } }}
                    />
                    <Button size="sm" className="h-8" onClick={() => handleAddLesson(week.id)}>Add</Button>
                    <Button size="sm" variant="ghost" className="h-8" onClick={() => { setAddingLesson(null); setNewLessonTitle(""); }}>Cancel</Button>
                  </div>
                ) : (
                  <button
                    onClick={() => { setAddingLesson(week.id); setNewLessonTitle(""); }}
                    className="flex items-center gap-1 pl-3 text-xs text-muted-foreground hover:text-primary transition-colors"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add Lesson
                  </button>
                )}
              </div>
            ))}

            <Button size="sm" variant="outline" className="gap-1 w-full" onClick={handleAddWeek}>
              <Plus className="h-4 w-4" /> Add Week
            </Button>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
