import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/provider/calendar")({
  component: CalendarPage,
});

function CalendarPage() {
  return (
    <div className="mx-auto max-w-screen-md px-4 py-6">
      <h1 className="text-2xl font-bold">My Calendar</h1>
      <p className="mt-2 text-muted-foreground">
        Your upcoming bookings will appear here. Full scheduling view is coming soon.
      </p>
      <Link
        to="/provider/dashboard"
        className="mt-4 inline-flex items-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
      >
        Go to my jobs
      </Link>
    </div>
  );
}