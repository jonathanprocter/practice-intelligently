import { Calendar, Users, CheckSquare, TrendingUp, CheckCircle2 } from "lucide-react";
import type { DashboardStats } from "@/lib/api";

interface QuickStatsProps {
  stats?: DashboardStats;
}

export default function QuickStats({ stats }: QuickStatsProps) {

  const statItems = [
    {
      icon: Calendar,
      value: stats?.todaysSessions || 0,
      label: "Today's Sessions",
      color: "bg-therapy-primary/10 text-therapy-primary"
    },
    {
      icon: Users,
      value: stats?.activeClients || 0,
      label: "Active Clients",
      color: "bg-therapy-success/10 text-therapy-success"
    },
    {
      icon: CheckSquare,
      value: stats?.urgentActionItems || 0,
      label: "Action Items",
      color: "bg-therapy-warning/10 text-therapy-warning"
    },
    {
      icon: TrendingUp,
      value: `${stats?.completionRate || 0}%`,
      label: "Treatment Progress",
      color: "bg-therapy-primary/10 text-therapy-primary"
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {statItems.map((stat, index) => (
        <div key={index} className="therapy-card p-4 xs:p-5 sm:p-6 iphone-card-interaction touch-manipulation hover:shadow-lg transition-all duration-300 cursor-pointer" data-testid={`stat-card-${stat.label.toLowerCase().replace(/\s+/g, '-')}`}>
          <div className="flex items-center justify-between mb-4">
            <div className={`w-12 h-12 xs:w-10 xs:h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center ${stat.color}`}>
              <stat.icon className="text-xl xs:text-lg sm:text-xl" />
            </div>
          </div>
          <h3 className="text-2xl xs:text-xl sm:text-2xl font-bold text-therapy-text mb-1 truncate">
            {stat.value}
          </h3>
          <p className="text-therapy-text/60 text-sm xs:text-xs sm:text-sm truncate leading-tight">{stat.label}</p>
        </div>
      ))}
    </div>
  );
}