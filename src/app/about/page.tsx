import type { Metadata } from "next";
import { Card } from "@/components/ui/card";

export const metadata: Metadata = { title: "About ACSL" };
export default function AboutPage() { return <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6"><h1 className="text-4xl font-black tracking-tight">About</h1><p className="mt-4 max-w-3xl text-muted-foreground">Practice original ACSL-style programming problems in three divisions.</p><div className="mt-8 grid gap-4 md:grid-cols-3">{[["Junior", "Strings, arithmetic, and simulation."],["Intermediate", "Data structures, logic, and algorithms."],["Senior", "Graphs, grids, and advanced algorithms."]].map(([title, copy]) => <Card key={title} className="p-6"><h2 className="font-bold text-primary">{title}</h2><p className="mt-2 text-sm text-muted-foreground">{copy}</p></Card>)}</div><p className="mt-8 text-sm text-muted-foreground">Independent practice project. Not affiliated with ACSL.</p></main>; }
