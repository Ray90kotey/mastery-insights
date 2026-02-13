import { BarChart3 } from "lucide-react";
import Layout from "@/components/Layout";

export default function Reports() {
  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">Reports</h1>
          <p className="text-muted-foreground mt-1">Generate and share student progress reports</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-12 text-center">
          <BarChart3 className="mx-auto h-12 w-12 text-muted-foreground/40" />
          <h3 className="mt-4 font-display text-lg font-semibold">Coming Soon</h3>
          <p className="mt-1 text-muted-foreground">
            PDF reports with mastery scoring, trend analysis, and sharing via email & WhatsApp will be available once you add assessments and scores.
          </p>
        </div>
      </div>
    </Layout>
  );
}
