'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface AIHealthCheckProps {
  title: string;
  description: string;
  buttonText: string;
  onTest: () => Promise<any>;
}

interface AdminPageProps {
  aiHealthCheckProps: AIHealthCheckProps;
}

export function AdminPage({ aiHealthCheckProps }: AdminPageProps) {
  return (
    <div className="container mx-auto p-4">
      <Card>
        <CardHeader>
          <CardTitle>{aiHealthCheckProps.title}</CardTitle>
          <CardDescription>{aiHealthCheckProps.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={aiHealthCheckProps.onTest}>
            {aiHealthCheckProps.buttonText}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
