import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Users, GraduationCap, ClipboardList, AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";
import Layout from "@/components/Layout";

interface Stats {
  totalStudents: number;
  totalClasses: number;
  totalAssessments: number;
  needsSupport: number;
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats>({ totalStudents: 0, totalClasses: 0, totalAssessments: 0, needsSupport: 0 });

  useEffect(() => {
    const fetchStats = async () => {
      const [classesRes, studentsRes, assessmentsRes] = await Promise.all([
        supabase.from("classes").select("id", { count: "exact", head: true }),
        supabase.from("students").select("id", { count: "exact", head: true }),
        supabase.from("assessments").select("id", { count: "exact", head: true }),
      ]);

      setStats({
        totalClasses: classesRes.count ?? 0,
        totalStudents: studentsRes.count ?? 0,
        totalAssessments: assessmentsRes.count ?? 0,
        needsSupport: 0,
      });
    };
    fetchStats();
  }, []);

  const cards = [
    { label: "Total Classes", value: stats.totalClasses, icon: GraduationCap, color: "text-primary" },
    { label: "Total Students", value: stats.totalStudents, icon: Users, color: "text-info" },
    { label: "Assessments", value: stats.totalAssessments, icon: ClipboardList, color: "text-accent" },
    { label: "Needs Support", value: stats.needsSupport, icon: AlertTriangle, color: "text-destructive" },
  ];

  return (
    <Layout>
      <div className="space-y-8">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Overview of your teaching performance data</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map((card, i) => (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="rounded-xl border border-border bg-card p-6 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">{card.label}</span>
                <card.icon className={`h-5 w-5 ${card.color}`} />
              </div>
              <p className="mt-2 font-display text-3xl font-bold text-card-foreground">{card.value}</p>
            </motion.div>
          ))}
        </div>

        <div className="rounded-xl border border-border bg-card p-8 text-center shadow-sm">
          <GraduationCap className="mx-auto h-12 w-12 text-muted-foreground/40" />
          <h3 className="mt-4 font-display text-lg font-semibold text-foreground">Get Started</h3>
          <p className="mt-1 text-muted-foreground">Create your first class and add students to begin tracking mastery.</p>
        </div>
      </div>
    </Layout>
  );
}
