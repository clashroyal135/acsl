"use client";

import { BookOpen, Users } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { AdminProblemsPanel } from "@/components/admin-problems-panel";
import { AdminStudentsPanel } from "@/components/admin-students-panel";

export function AdminDashboard() {
  const [tab, setTab] = useState<"problems" | "students">("problems");
  const [studentsVisited, setStudentsVisited] = useState(false);
  return <div className="mt-8">
    <div className="mb-6 flex gap-2" role="group" aria-label="Administration sections">
      <Button variant={tab === "problems" ? "default" : "outline"} aria-pressed={tab === "problems"} onClick={() => setTab("problems")}><BookOpen className="h-4 w-4" /> Problems</Button>
      <Button variant={tab === "students" ? "default" : "outline"} aria-pressed={tab === "students"} onClick={() => { setStudentsVisited(true); setTab("students"); }}><Users className="h-4 w-4" /> Accounts & progress</Button>
    </div>
    <div hidden={tab !== "problems"}><AdminProblemsPanel /></div>
    {studentsVisited && <div hidden={tab !== "students"}><AdminStudentsPanel /></div>}
  </div>;
}
