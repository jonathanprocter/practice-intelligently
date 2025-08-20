import { useState } from "react";
import { CalendarEvent } from "@/types/calendar";
import { useEventDuplication } from "@/hooks/useEventDuplication";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, Copy, CopyPlus, Repeat } from "lucide-react";
import { format } from "date-fns";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface EventDuplicationDialogProps {
  event: CalendarEvent | null;
  isOpen: boolean;
  onClose: () => void;
  onDuplicate: (duplicatedEvents: Partial<CalendarEvent>[]) => void;
}

export function EventDuplicationDialog({ event, isOpen, onClose, onDuplicate }: EventDuplicationDialogProps) {
  const [duplicationType, setDuplicationType] = useState<"immediate" | "date" | "weekly">("immediate");
  const [targetDate, setTargetDate] = useState<Date | undefined>(new Date());
  const [weekCount, setWeekCount] = useState(4);

  const { duplicateEvent, duplicateToDate, duplicateWeekly, isDuplicating } = useEventDuplication();

  if (!event) return null;

  const handleDuplicate = () => {
    const duplicatedEvents: Partial<CalendarEvent>[] = [];

    switch (duplicationType) {
      case "immediate":
        // Create a single duplicate for tomorrow
        const tomorrow = new Date(event.startTime);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const endTomorrow = new Date(event.endTime);
        endTomorrow.setDate(endTomorrow.getDate() + 1);

        duplicatedEvents.push({
          title: event.title,
          startTime: tomorrow,
          endTime: endTomorrow,
          description: event.description,
          location: event.location,
          source: 'manual',
          allDay: event.allDay,
          notes: event.notes,
          actionItems: event.actionItems
        });
        break;

      case "date":
        if (targetDate) {
          // Create a duplicate on the specified date
          const startTime = new Date(targetDate);
          startTime.setHours(new Date(event.startTime).getHours());
          startTime.setMinutes(new Date(event.startTime).getMinutes());

          const duration = new Date(event.endTime).getTime() - new Date(event.startTime).getTime();
          const endTime = new Date(startTime.getTime() + duration);

          duplicatedEvents.push({
            title: event.title,
            startTime,
            endTime,
            description: event.description,
            location: event.location,
            source: 'manual',
            allDay: event.allDay,
            notes: event.notes,
            actionItems: event.actionItems
          });
        }
        break;

      case "weekly":
        // Create weekly duplicates
        const startDate = new Date(event.startTime);
        const endDate = new Date(event.endTime);
        const duration = endDate.getTime() - startDate.getTime();

        for (let i = 1; i <= weekCount; i++) {
          const weeklyStart = new Date(startDate);
          weeklyStart.setDate(weeklyStart.getDate() + (7 * i));
          const weeklyEnd = new Date(weeklyStart.getTime() + duration);

          duplicatedEvents.push({
            title: event.title,
            startTime: weeklyStart,
            endTime: weeklyEnd,
            description: event.description,
            location: event.location,
            source: 'manual',
            allDay: event.allDay,
            notes: event.notes,
            actionItems: event.actionItems
          });
        }
        break;
    }

    // Call the onDuplicate callback with the created events
    if (duplicatedEvents.length > 0) {
      onDuplicate(duplicatedEvents);
    }

    onClose();
  };

  // Don't allow duplication of SimplePractice events (they're read-only from external system)
  const canDuplicate = event.source !== 'simplepractice';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Copy className="h-5 w-5" />
            Duplicate Event
          </DialogTitle>
          <DialogDescription>
            Create copies of "{event.title}"
          </DialogDescription>
        </DialogHeader>

        {!canDuplicate ? (
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              SimplePractice appointments cannot be duplicated as they are managed by an external system.
            </p>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <RadioGroup value={duplicationType} onValueChange={(value: any) => setDuplicationType(value)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="immediate" id="immediate" />
                <Label htmlFor="immediate" className="flex items-center gap-2 cursor-pointer">
                  <CopyPlus className="h-4 w-4" />
                  Duplicate immediately (1 hour later)
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <RadioGroupItem value="date" id="date" />
                <Label htmlFor="date" className="flex items-center gap-2 cursor-pointer">
                  <CalendarIcon className="h-4 w-4" />
                  Duplicate to specific date
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <RadioGroupItem value="weekly" id="weekly" />
                <Label htmlFor="weekly" className="flex items-center gap-2 cursor-pointer">
                  <Repeat className="h-4 w-4" />
                  Create weekly recurring copies
                </Label>
              </div>
            </RadioGroup>

            {duplicationType === "date" && (
              <div className="space-y-2">
                <Label>Select target date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !targetDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {targetDate ? format(targetDate, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={targetDate}
                      onSelect={setTargetDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            )}

            {duplicationType === "weekly" && (
              <div className="space-y-2">
                <Label htmlFor="weeks">Number of weeks to duplicate</Label>
                <Input
                  id="weeks"
                  type="number"
                  value={weekCount}
                  onChange={(e) => setWeekCount(parseInt(e.target.value) || 1)}
                  min="1"
                  max="52"
                />
                <p className="text-sm text-muted-foreground">
                  This will create {weekCount} copies, one for each week
                </p>
              </div>
            )}

            <div className="rounded-lg bg-muted p-3">
              <p className="text-sm font-medium mb-2">Original Event:</p>
              <p className="text-sm">{event.title}</p>
              <p className="text-sm text-muted-foreground">
                {format(new Date(event.startTime), "PPp")} - {format(new Date(event.endTime), "p")}
              </p>
              {event.location && (
                <p className="text-sm text-muted-foreground">📍 {event.location}</p>
              )}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          {canDuplicate && (
            <Button onClick={handleDuplicate} disabled={isDuplicating}>
              {isDuplicating ? "Duplicating..." : "Duplicate"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}