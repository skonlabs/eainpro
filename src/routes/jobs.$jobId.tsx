import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/jobs/$jobId")({
  component: JobsRedirect,
});

function JobsRedirect() {
  const { jobId } = Route.useParams();
  return <Navigate to="/request/$jobId" params={{ jobId }} replace />;
}
