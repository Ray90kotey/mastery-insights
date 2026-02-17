import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Trash2, ChevronDown, ChevronRight, BookOpen, Target } from "lucide-react";
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

interface Outcome {
  id: string;
  description: string;
  lesson_id: string;
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
  const [outcomes, setOutcomes] = useState<Record<string, Outcome[]>>({});
  const [addingOutcome, setAddingOutcome] = useState<string | null>(null);
  const [newOutcomeDesc, setNewOutcomeDesc] = useState("");
  const [expandedLessons, setExpandedLessons] = useState<Set<string>>(new Set());

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

  const fetchOutcomes = async (lessonIds: string[]) => {
    if (lessonIds.length === 0) return;
    const { data } = await supabase
      .from("outcomes")
      .select("*")
      .in("lesson_id", lessonIds)
      .order("description");
    if (data) {
      const grouped: Record<string, Outcome[]> = {};
      data.forEach((o) => {
        if (!grouped[o.lesson_id]) grouped[o.lesson_id] = [];
        grouped[o.lesson_id].push(o);
      });
      setOutcomes(grouped);
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

  // Fetch outcomes when lessons change
  useEffect(() => {
    const allLessonIds = Object.values(lessons).flat().map((l) => l.id);
    if (allLessonIds.length > 0) {
      fetchOutcomes(allLessonIds);
    }
  }, [lessons]);

  const toggleLesson = (lessonId: string) => {
    setExpandedLessons((prev) => {
      const next = new Set(prev);
      if (next.has(lessonId)) next.delete(lessonId);
      else next.add(lessonId);
      return next;
    });
  };

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
    setExpandedLessons((prev) => { const next = new Set(prev); next.delete(lessonId); return next; });
    fetchLessons(weeks.map((w) => w.id));
  };

  const handleAddOutcome = async (lessonId: string) => {
    if (!newOutcomeDesc.trim()) return;
    const { error } = await supabase.from("outcomes").insert({ description: newOutcomeDesc.trim(), lesson_id: lessonId });
    if (error) { toast.error(error.message); return; }
    toast.success("Outcome added");
    setAddingOutcome(null);
    setNewOutcomeDesc("");
    const allLessonIds = Object.values(lessons).flat().map((l) => l.id);
    fetchOutcomes(allLessonIds);
  };

  const handleDeleteOutcome = async (outcomeId: string) => {
    const { error } = await supabase.from("outcomes").delete().eq("id", outcomeId);
    if (error) { toast.error(error.message); return; }
    toast.success("Outcome deleted");
    const allLessonIds = Object.values(lessons).flat().map((l) => l.id);
    fetchOutcomes(allLessonIds);
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
                  <div key={lesson.id} className="rounded bg-background border border-border overflow-hidden">
                    <div className="flex items-center justify-between pl-3 pr-1 py-1.5">
                      <button
                        onClick={() => toggleLesson(lesson.id)}
                        className="flex items-center gap-2 text-sm hover:text-primary transition-colors"
                      >
                        {expandedLessons.has(lesson.id) ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                        <BookOpen className="h-3.5 w-3.5 text-muted-foreground" />
                        <span>{lesson.title}</span>
                        <span className="text-xs text-muted-foreground">({(outcomes[lesson.id] || []).length} outcomes)</span>
                      </button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => handleDeleteLesson(lesson.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>

                    {expandedLessons.has(lesson.id) && (
                      <div className="border-t border-border px-3 py-2 space-y-1.5 bg-muted/30">
                        {(outcomes[lesson.id] || []).map((outcome) => (
                          <div key={outcome.id} className="flex items-center justify-between pl-2 py-1 rounded bg-background border border-border">
                            <div className="flex items-center gap-2">
                              <Target className="h-3 w-3 text-muted-foreground" />
                              <span className="text-xs">{outcome.description}</span>
                            </div>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-6 w-6 text-muted-foreground hover:text-destructive"
                              onClick={() => handleDeleteOutcome(outcome.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}

                        {addingOutcome === lesson.id ? (
                          <div className="flex items-center gap-2 pl-2">
                            <Input
                              placeholder="Outcome description"
                              value={newOutcomeDesc}
                              onChange={(e) => setNewOutcomeDesc(e.target.value)}
                              className="h-7 text-xs"
                              autoFocus
                              onKeyDown={(e) => { if (e.key === "Enter") handleAddOutcome(lesson.id); if (e.key === "Escape") { setAddingOutcome(null); setNewOutcomeDesc(""); } }}
                            />
                            <Button size="sm" className="h-7 text-xs" onClick={() => handleAddOutcome(lesson.id)}>Add</Button>
                            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { setAddingOutcome(null); setNewOutcomeDesc(""); }}>Cancel</Button>
                          </div>
                        ) : (
                          <button
                            onClick={() => { setAddingOutcome(lesson.id); setNewOutcomeDesc(""); }}
                            className="flex items-center gap-1 pl-2 text-xs text-muted-foreground hover:text-primary transition-colors"
                          >
                            <Plus className="h-3 w-3" /> Add Outcome
                          </button>
                        )}
                      </div>
                    )}
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
