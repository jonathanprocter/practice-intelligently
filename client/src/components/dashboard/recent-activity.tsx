import { FileText, Bot, Calendar, CheckCircle, RefreshCw } from "lucide-react";

const activities = [
  {
    id: 1,
    icon: FileText,
    title: "Session completed: Client Session",
    description: "CBT session with progress on anxiety management techniques",
    timestamp: "2 hours ago",
    color: "bg-therapy-success/10 text-therapy-success"
  },
  {
    id: 2,
    icon: Bot,
    title: "AI analysis completed",
    description: "Transcript processed for couples session",
    timestamp: "3 hours ago",
    color: "bg-therapy-primary/10 text-therapy-primary"
  },
  {
    id: 3,
    icon: Calendar,
    title: "New appointment booked",
    description: "Initial consultation scheduled for next week",
    timestamp: "5 hours ago",
    color: "bg-therapy-warning/10 text-therapy-warning"
  },
  {
    id: 4,
    icon: CheckCircle,
    title: "Treatment goal achieved",
    description: "Client completed anger management milestone",
    timestamp: "1 day ago",
    color: "bg-therapy-success/10 text-therapy-success"
  },
  {
    id: 5,
    icon: RefreshCw,
    title: "Calendar sync updated",
    description: "Google Calendar integration refreshed with new appointments",
    timestamp: "2 days ago",
    color: "bg-therapy-primary/10 text-therapy-primary"
  }
];

export default function RecentActivity() {
  return (
    <div className="therapy-card">
      <div className="p-6 border-b border-therapy-border">
        <h3 className="text-xl font-bold text-therapy-text">Recent Activity</h3>
      </div>
      
      <div className="p-6 space-y-4">
        {activities.map((activity) => (
          <div key={activity.id} className="flex items-start space-x-4">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${activity.color}`}>
              <activity.icon className="h-4 w-4" />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-therapy-text text-sm">
                {activity.title}
              </h4>
              <p className="text-therapy-text/60 text-xs">
                {activity.description}
              </p>
              <span className="text-therapy-text/50 text-xs">
                {activity.timestamp}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
