"use client";

import ChatGenerationInterface from "@/components/chart-generation/ChatGenerationInterface";
import { BarChart3, Layers, Database } from "lucide-react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "ui/card";

export default function MindSparkStudioPage() {
  const quickActions = [
    {
      title: "Chart Library",
      description: "Browse and manage your saved charts",
      icon: BarChart3,
      href: "/studio/charts",
      count: "12 charts",
    },
    {
      title: "Dashboards",
      description: "Create and manage interactive dashboards",
      icon: Layers,
      href: "/studio/dashboards",
      count: "5 dashboards",
    },
    {
      title: "Data Sources",
      description: "Configure database connections",
      icon: Database,
      href: "/studio/datasets",
      count: "3 connections",
    },
  ];

  return (
    <div className="container mx-auto py-6 px-4 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          MindSpark Studio
        </h1>
        <p className="text-gray-600">
          Create interactive charts and dashboards with natural language and
          visual tools
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {quickActions.map((action) => {
          const Icon = action.icon;
          return (
            <Link key={action.href} href={action.href}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer group">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg group-hover:bg-blue-200 transition-colors">
                      <Icon className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{action.title}</CardTitle>
                      <CardDescription className="text-sm">
                        {action.description}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-gray-500">{action.count}</div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      {/* Main Chart Generation Interface */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-blue-600" />
            Chart Generator
          </CardTitle>
          <CardDescription>
            Use natural language to create charts from your data sources
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChatGenerationInterface />
        </CardContent>
      </Card>
    </div>
  );
}
