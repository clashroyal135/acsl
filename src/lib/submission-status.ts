export function submissionStatus(verdict: string) {
  return verdict === "Accepted" ? "Accepted" : "In progress";
}

export function submissionStatusClass(verdict: string) {
  return verdict === "Accepted" ? "border-success/25 bg-success/10 text-success" : "border-warning/25 bg-warning/10 text-warning";
}
