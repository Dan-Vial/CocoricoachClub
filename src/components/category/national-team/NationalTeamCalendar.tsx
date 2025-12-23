import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, MapPin } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface NationalTeamEvent {
  id: string;
  name: string;
  event_type: string;
  start_date: string;
  end_date: string | null;
  location: string | null;
  opponent: string | null;
  is_home: boolean | null;
  score_home: number | null;
  score_away: number | null;
}

interface NationalTeamCalendarProps {
  categoryId: string;
  events: NationalTeamEvent[];
}

const EVENT_TYPE_COLORS: Record<string, string> = {
  test_match: "bg-blue-500",
  six_nations: "bg-green-600",
  world_cup: "bg-amber-500",
  autumn_nations: "bg-orange-500",
  summer_tour: "bg-cyan-500",
  stage: "bg-purple-500",
  rassemblement: "bg-indigo-500",
  other: "bg-gray-500",
};

const EVENT_TYPE_LABELS: Record<string, string> = {
  test_match: "Test Match",
  six_nations: "6 Nations",
  world_cup: "Coupe du Monde",
  autumn_nations: "Autumn Nations",
  summer_tour: "Tournée",
  stage: "Stage",
  rassemblement: "Rassemblement",
  other: "Autre",
};

export function NationalTeamCalendar({ categoryId, events }: NationalTeamCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState<NationalTeamEvent | null>(null);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const getEventsForDay = (day: Date) => {
    return events.filter((event) => {
      const eventStart = new Date(event.start_date);
      const eventEnd = event.end_date ? new Date(event.end_date) : eventStart;
      return day >= eventStart && day <= eventEnd;
    });
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle>Calendrier International</CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="font-medium min-w-[140px] text-center">
                {format(currentMonth, "MMMM yyyy", { locale: fr })}
              </span>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Legend */}
          <div className="flex flex-wrap gap-3 mb-4 text-xs">
            {Object.entries(EVENT_TYPE_LABELS).map(([key, label]) => (
              <div key={key} className="flex items-center gap-1">
                <div className={cn("w-2.5 h-2.5 rounded-full", EVENT_TYPE_COLORS[key])} />
                <span>{label}</span>
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1">
            {/* Day Headers */}
            {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map((day) => (
              <div
                key={day}
                className="text-center text-sm font-medium text-muted-foreground py-2"
              >
                {day}
              </div>
            ))}

            {/* Calendar Days */}
            {calendarDays.map((day) => {
              const dayEvents = getEventsForDay(day);
              const isCurrentMonth = isSameMonth(day, currentMonth);
              const isToday = isSameDay(day, new Date());

              return (
                <div
                  key={day.toISOString()}
                  className={cn(
                    "min-h-[80px] p-1 border rounded-md",
                    !isCurrentMonth && "bg-muted/30",
                    isToday && "border-primary"
                  )}
                >
                  <div
                    className={cn(
                      "text-sm mb-1",
                      !isCurrentMonth && "text-muted-foreground",
                      isToday && "font-bold text-primary"
                    )}
                  >
                    {format(day, "d")}
                  </div>
                  <div className="space-y-0.5">
                    {dayEvents.slice(0, 2).map((event) => (
                      <button
                        key={event.id}
                        onClick={() => setSelectedEvent(event)}
                        className={cn(
                          "w-full text-left text-xs px-1 py-0.5 rounded truncate text-white",
                          EVENT_TYPE_COLORS[event.event_type]
                        )}
                      >
                        {event.name}
                      </button>
                    ))}
                    {dayEvents.length > 2 && (
                      <div className="text-xs text-muted-foreground px-1">
                        +{dayEvents.length - 2}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Selected Event Details */}
      {selectedEvent && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <div className={cn("w-3 h-3 rounded-full", EVENT_TYPE_COLORS[selectedEvent.event_type])} />
                {selectedEvent.name}
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setSelectedEvent(null)}>
                Fermer
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Type:</span>
                <p className="font-medium">{EVENT_TYPE_LABELS[selectedEvent.event_type]}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Date:</span>
                <p className="font-medium">
                  {format(new Date(selectedEvent.start_date), "dd MMM yyyy", { locale: fr })}
                  {selectedEvent.end_date && ` - ${format(new Date(selectedEvent.end_date), "dd MMM yyyy", { locale: fr })}`}
                </p>
              </div>
              {selectedEvent.location && (
                <div>
                  <span className="text-muted-foreground">Lieu:</span>
                  <p className="font-medium flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {selectedEvent.location}
                  </p>
                </div>
              )}
              {selectedEvent.opponent && (
                <div>
                  <span className="text-muted-foreground">Adversaire:</span>
                  <p className="font-medium">
                    {selectedEvent.opponent}
                    {selectedEvent.is_home !== null && (
                      <span className="text-xs text-muted-foreground ml-1">
                        ({selectedEvent.is_home ? "Domicile" : "Extérieur"})
                      </span>
                    )}
                  </p>
                </div>
              )}
              {selectedEvent.score_home !== null && selectedEvent.score_away !== null && (
                <div>
                  <span className="text-muted-foreground">Score:</span>
                  <p className="font-bold text-lg">
                    {selectedEvent.score_home} - {selectedEvent.score_away}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
