import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";

export default function About() {
    return (
        <div className="container mx-auto p-8">
            <Card>
                <CardHeader>
                    <CardTitle>Über NicompterICS</CardTitle>
                    <CardDescription>by Nicompter</CardDescription>
                </CardHeader>
                <CardContent>
                    <p>NicompterICS ist ein simples Tool zur Generierung von ICS Kalendern.</p>
                </CardContent>
                <CardFooter>
                    <Button variant="link" onClick={() => window.location.href = 'https://nicompter.de'}>nicompter.de</Button>
                </CardFooter>
            </Card>
        </div>
    );
} 