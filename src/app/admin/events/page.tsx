import { getEvents, getSeasonsAndDivisions } from "@/app/actions/events";
import EventsManager from "./EventsManager";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";

export const metadata = {
  title: "Manage Events | Admin",
};

export default async function AdminEventsPage() {
  const events = await getEvents();
  const seasonsData = await getSeasonsAndDivisions();
  const session = await getServerSession(authOptions);

  return (
    <div className="max-w-[1200px] mx-auto p-8 w-full space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Events</h1>
          <p className="text-slate-500 mt-1">Manage events and their active age groups.</p>
        </div>
      </div>

      <EventsManager initialEvents={events} seasonsData={seasonsData} />
    </div>
  );
}
