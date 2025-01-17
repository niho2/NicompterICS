import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { createEvents } from 'ics';
import { format, isSameDay, compareAsc } from 'date-fns';
import { de } from 'date-fns/locale';
import { Checkbox } from "@/components/ui/checkbox";
import { motion, AnimatePresence } from "framer-motion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Toaster } from "@/components/ui/toaster";

interface Event {
    id: string;
    title: string;
    date: Date;
    description?: string;
    location?: string;
    time?: string;
    duration?: string;
    isFullDay: boolean;
}

export default function Home() {
    const { toast } = useToast();
    const [date, setDate] = useState<Date | undefined>(new Date());
    const [events, setEvents] = useState<Event[]>([]);
    const [newEvent, setNewEvent] = useState<Event>({
        id: '',
        title: '',
        date: new Date(),
        isFullDay: true
    });
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    const handleAddEvent = () => {
        if (newEvent.title && newEvent.date) {
            const eventWithId = {
                ...newEvent,
                id: crypto.randomUUID(),
                date: date || new Date()
            };
            setEvents([...events, eventWithId]);
            setNewEvent({ id: '', title: '', date: new Date(), isFullDay: true });
            setIsDialogOpen(false);
        }
    };

    const handleDeleteEvent = (id: string) => {
        setEvents(events.filter(event => event.id !== id));
    };

    const exportToICS = () => {
        const icsEvents = events.map(event => ({
            start: event.isFullDay
                ? [event.date.getFullYear(), event.date.getMonth() + 1, event.date.getDate()] as [number, number, number]
                : [
                    event.date.getFullYear(),
                    event.date.getMonth() + 1,
                    event.date.getDate(),
                    ...event.time?.split(':').map(Number) || [0, 0]
                ] as [number, number, number, number, number],
            duration: event.isFullDay
                ? { days: 1 }
                : { minutes: event.duration ? parseInt(event.duration) : 60 },
            title: event.title,
            description: event.description || '',
            location: event.location,
        }));

        createEvents(icsEvents, (error: any, value: string) => {
            if (error) {
                console.log(error);
                return;
            }
            const blob = new Blob([value], { type: 'text/calendar;charset=utf-8' });
            const link = document.createElement('a');
            link.href = window.URL.createObjectURL(blob);
            link.setAttribute('download', `kalender-export-${format(new Date(), 'yyyy-MM-dd')}.ics`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        });
    };

    const getDayEvents = (day: Date | undefined) => {
        if (!day) return [];
        return events.filter(event => isSameDay(event.date, day));
    };

    const sortedEvents = [...events].sort((a, b) => compareAsc(a.date, b.date));

    const handleImportICS = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            const text = await file.text();
            const lines = text.split('\n');
            const importedEvents: Event[] = [];
            let currentEvent: Partial<Event> = {};

            lines.forEach(line => {
                const [key, ...valueParts] = line.split(':');
                const value = valueParts.join(':').trim();

                if (key.includes('BEGIN') && value === 'VEVENT') {
                    currentEvent = {};
                } else if (key.includes('END') && value === 'VEVENT') {
                    if (currentEvent.title && currentEvent.date) {
                        importedEvents.push({
                            id: crypto.randomUUID(),
                            title: currentEvent.title,
                            date: currentEvent.date,
                            description: currentEvent.description,
                            location: currentEvent.location,
                            isFullDay: !currentEvent.time,
                            time: currentEvent.time
                        } as Event);
                    }
                } else if (key.includes('SUMMARY')) {
                    currentEvent.title = value;
                } else if (key.includes('DTSTART')) {
                    try {
                        let dateStr = value;
                        if (dateStr.includes('T')) {
                            const [datePart, timePart] = dateStr.split('T');
                            const year = parseInt(datePart.substring(0, 4));
                            const month = parseInt(datePart.substring(4, 6)) - 1;
                            const day = parseInt(datePart.substring(6, 8));
                            const hours = parseInt(timePart.substring(0, 2));
                            const minutes = parseInt(timePart.substring(2, 4));

                            const date = new Date(year, month, day, hours, minutes);
                            currentEvent.date = date;
                            currentEvent.time = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
                            currentEvent.isFullDay = false;
                        } else {
                            const year = parseInt(dateStr.substring(0, 4));
                            const month = parseInt(dateStr.substring(4, 6)) - 1;
                            const day = parseInt(dateStr.substring(6, 8));

                            const date = new Date(year, month, day);
                            currentEvent.date = date;
                            currentEvent.isFullDay = true;
                        }
                    } catch (e) {
                        console.error('Fehler beim Parsen des Datums:', value);
                    }
                } else if (key.includes('LOCATION')) {
                    currentEvent.location = value;
                } else if (key.includes('DESCRIPTION')) {
                    currentEvent.description = value;
                }
            });

            if (importedEvents.length > 0) {
                setEvents(prevEvents => [...prevEvents, ...importedEvents]);
                toast({
                    title: "Import erfolgreich",
                    description: `${importedEvents.length} Termine wurden erfolgreich importiert.`,
                    duration: 3000,
                });
            } else {
                toast({
                    title: "Keine Termine gefunden",
                    description: "Die ICS-Datei enthielt keine gültigen Termine.",
                    variant: "destructive",
                });
            }
        } catch (error) {
            console.error('Import Fehler:', error);
            toast({
                title: "Fehler beim Import",
                description: "Die ICS-Datei konnte nicht verarbeitet werden.",
                variant: "destructive",
            });
        }

        e.target.value = '';
    };

    return (
        <div className="container mx-auto p-8">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
            >
                <Card className="mb-8">
                    <CardHeader>
                        <CardTitle className="text-3xl font-bold">ICS Kalender erstellen</CardTitle>
                        <CardDescription className="text-lg">
                            Verwalten Sie Ihre Termine und exportieren Sie sie als ICS Datei
                        </CardDescription>
                        <div className="flex items-center gap-2 mt-2 text-muted-foreground">
                            <span className="text-sm">Gesamt Termine: {events.length}</span>
                            <div className="flex gap-2">
                                {events.length > 0 && (
                                    <Button onClick={exportToICS} variant="outline" size="sm">
                                        Als ICS exportieren
                                    </Button>
                                )}
                                <div className="relative">
                                    <input
                                        type="file"
                                        accept=".ics"
                                        onChange={handleImportICS}
                                        className="hidden"
                                        id="ics-import"
                                    />
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => document.getElementById('ics-import')?.click()}
                                    >
                                        ICS importieren
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </CardHeader>
                    <CardFooter className="flex justify-end">
                        <Button variant="link" size="sm" onClick={() => window.location.href = '/about'}>
                            Nicompter ICS
                        </Button>
                    </CardFooter>
                </Card>

                <Tabs defaultValue="calendar" className="space-y-4">
                    <TabsList>
                        <TabsTrigger value="calendar">Kalender</TabsTrigger>
                        <TabsTrigger value="list">Terminliste</TabsTrigger>
                    </TabsList>

                    <TabsContent value="calendar" className="space-y-4">
                        <div className="grid md:grid-cols-[300px,1fr] gap-8">
                            <div className="space-y-4">
                                <Calendar
                                    mode="single"
                                    selected={date}
                                    onSelect={setDate}
                                    locale={de}
                                    className="rounded-lg border shadow-sm"
                                    components={{
                                        DayContent: (props: { date: Date }) => (
                                            <motion.div
                                                className="relative"
                                                whileHover={{ scale: 1.1 }}
                                                transition={{ duration: 0.2 }}
                                            >
                                                {props.date.getDate()}
                                                {getDayEvents(props.date).length > 0 && (
                                                    <motion.div
                                                        className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 bg-primary rounded-full"
                                                        initial={{ scale: 0 }}
                                                        animate={{ scale: 1 }}
                                                    />
                                                )}
                                            </motion.div>
                                        ),
                                    }}
                                />
                                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                                    <DialogTrigger asChild>
                                        <Button className="w-full">
                                            <motion.span
                                                whileHover={{ scale: 1.05 }}
                                                transition={{ duration: 0.2 }}
                                            >
                                                Termin hinzufügen
                                            </motion.span>
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent>
                                        <DialogHeader>
                                            <DialogTitle>Neuer Termin</DialogTitle>
                                        </DialogHeader>
                                        <div className="space-y-4 pt-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="title">Titel</Label>
                                                <Input
                                                    id="title"
                                                    value={newEvent.title}
                                                    onChange={(e) => setNewEvent({
                                                        ...newEvent,
                                                        title: e.target.value
                                                    })}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>
                                                    <Checkbox
                                                        className="mr-2"
                                                        checked={!newEvent.isFullDay}
                                                        onCheckedChange={(checked) => setNewEvent({
                                                            ...newEvent,
                                                            isFullDay: !checked
                                                        })}
                                                    />
                                                    Uhrzeit festlegen
                                                </Label>
                                                {!newEvent.isFullDay && (
                                                    <div className="space-y-2">
                                                        <Input
                                                            type="time"
                                                            value={newEvent.time || ''}
                                                            onChange={(e) => setNewEvent({
                                                                ...newEvent,
                                                                time: e.target.value
                                                            })}
                                                        />
                                                        <Label htmlFor="duration">Dauer (in Minuten)</Label>
                                                        <Input
                                                            id="duration"
                                                            type="number"
                                                            min="0"
                                                            placeholder="z.B. 60 für 1 Stunde"
                                                            value={newEvent.duration || ''}
                                                            onChange={(e) => setNewEvent({
                                                                ...newEvent,
                                                                duration: e.target.value
                                                            })}
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="description">Beschreibung (optional)</Label>
                                                <Input
                                                    id="description"
                                                    value={newEvent.description || ''}
                                                    onChange={(e) => setNewEvent({
                                                        ...newEvent,
                                                        description: e.target.value
                                                    })}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="location">Ort (optional)</Label>
                                                <Input
                                                    id="location"
                                                    value={newEvent.location || ''}
                                                    onChange={(e) => setNewEvent({
                                                        ...newEvent,
                                                        location: e.target.value
                                                    })}
                                                />
                                            </div>
                                            <Button onClick={handleAddEvent}>Hinzufügen</Button>
                                        </div>
                                    </DialogContent>
                                </Dialog>
                            </div>

                            <div>
                                <AnimatePresence mode="wait">
                                    {getDayEvents(date).length > 0 ? (
                                        <motion.div
                                            key="events"
                                            initial={{ opacity: 0, x: 20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: -20 }}
                                            className="border rounded-lg p-6 shadow-sm"
                                        >
                                            <h3 className="font-medium mb-4">
                                                Termine am {format(date!, 'dd.MM.yyyy')}:
                                            </h3>
                                            <ul className="space-y-3">
                                                {getDayEvents(date).map((event) => (
                                                    <motion.li
                                                        key={event.id}
                                                        initial={{ opacity: 0, y: 10 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        exit={{ opacity: 0, y: -10 }}
                                                        className="flex items-center justify-between p-3 bg-muted/50 rounded-md"
                                                    >
                                                        <span>
                                                            <span className="font-medium">{event.title}</span>
                                                            {!event.isFullDay && event.time && (
                                                                <span className="text-muted-foreground ml-2">
                                                                    {event.time}
                                                                </span>
                                                            )}
                                                            {event.location && (
                                                                <span className="text-muted-foreground ml-2">
                                                                    @ {event.location}
                                                                </span>
                                                            )}
                                                        </span>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => handleDeleteEvent(event.id)}
                                                            className="hover:text-destructive"
                                                        >
                                                            ✕
                                                        </Button>
                                                    </motion.li>
                                                ))}
                                            </ul>
                                        </motion.div>
                                    ) : (
                                        <motion.div
                                            key="no-events"
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            className="text-center text-muted-foreground p-8"
                                        >
                                            Keine Termine an diesem Tag
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="list">
                        <Card>
                            <CardContent className="p-6">
                                <div className="space-y-4">
                                    {sortedEvents.length > 0 ? (
                                        sortedEvents.map((event) => (
                                            <motion.div
                                                key={event.id}
                                                initial={{ opacity: 0, y: 20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                                            >
                                                <div className="space-y-1">
                                                    <div className="font-medium">{event.title}</div>
                                                    <div className="text-sm text-muted-foreground">
                                                        {format(event.date, 'dd.MM.yyyy')}
                                                        {!event.isFullDay && event.time && ` - ${event.time}`}
                                                        {event.location && ` @ ${event.location}`}
                                                    </div>
                                                </div>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleDeleteEvent(event.id)}
                                                    className="hover:text-destructive"
                                                >
                                                    ✕
                                                </Button>
                                            </motion.div>
                                        ))
                                    ) : (
                                        <div className="text-center text-muted-foreground py-8">
                                            Keine Termine vorhanden
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </motion.div>
            <Toaster />
        </div>
    );
} 