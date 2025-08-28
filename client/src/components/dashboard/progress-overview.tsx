import React from "react";
import { useQuery } from "@tanstack/react-query";
import { ApiClient } from "@/lib/api";

export default function ProgressOverview() {
  const { data: progressData, isLoading } = useQuery({
    queryKey: ['progress-metrics'],
    queryFn: async () => {
      // Mock data for now - in production this would call ApiClient.getProgressMetrics
      return [
        {
          title: "Goal Achievement",
          description: "Clients meeting treatment objectives",
          percentage: 78,
          progress: 78
        },
        {
          title: "Session Attendance",
          description: "Client engagement rate",
          percentage: 92,
          progress: 92
        },
        {
          title: "Documentation",
          description: "Notes completion rate",
          percentage: 85,
          progress: 85
        }
      ];
    },
    staleTime: 5 * 60 * 1000, // Consider fresh for 5 minutes
    refetchInterval: 10 * 60 * 1000, // Refetch every 10 minutes
  });

  const progressMetrics = progressData || [
    {
      title: "Goal Achievement",
      description: "Clients meeting treatment objectives",
      percentage: 0,
      progress: 0
    },
    {
      title: "Session Attendance",
      description: "Client engagement rate",
      percentage: 0,
      progress: 0
    },
    {
      title: "Documentation",
      description: "Notes completion rate",
      percentage: 0,
      progress: 0
    }
  ];

  if (isLoading) {
    return (
      <div className="therapy-card">
        <div className="p-6 border-b border-therapy-border">
          <h3 className="text-xl font-bold text-therapy-text">Treatment Progress Overview</h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="text-center animate-pulse">
                <div className="w-24 h-24 mx-auto mb-4 bg-gray-200 rounded-full"></div>
                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                <div className="h-3 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="therapy-card">
      <div className="p-6 border-b border-therapy-border">
        <h3 className="text-xl font-bold text-therapy-text">Treatment Progress Overview</h3>
      </div>
      
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {progressMetrics.map((metric, index) => (
            <div key={index} className="text-center">
              <div className="relative w-24 h-24 mx-auto mb-4">
                <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 100 100">
                  <circle 
                    cx="50" 
                    cy="50" 
                    r="40" 
                    stroke="currentColor" 
                    strokeWidth="8" 
                    fill="none" 
                    className="text-therapy-border"
                  />
                  <circle 
                    cx="50" 
                    cy="50" 
                    r="40" 
                    stroke="currentColor" 
                    strokeWidth="8" 
                    fill="none" 
                    strokeLinecap="round" 
                    className="text-therapy-primary transition-all duration-1000"
                    style={{
                      strokeDasharray: '251.2',
                      strokeDashoffset: `${251.2 - (251.2 * metric.progress) / 100}`
                    }}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xl font-bold text-therapy-text">
                    {metric.percentage}%
                  </span>
                </div>
              </div>
              <h4 className="font-semibold text-therapy-text mb-1">
                {metric.title}
              </h4>
              <p className="text-therapy-text/60 text-sm">
                {metric.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}