import { Calendar, Users, CheckSquare, TrendingUp, CheckCircle2 } from "lucide-react";
import type { DashboardStats } from "@/lib/api";
import { motion } from "framer-motion";
import { cardAnimation, staggerContainer } from "@/lib/animations";
import { DashboardStatSkeleton } from "@/components/ui/animated-skeleton";

interface QuickStatsProps {
  stats?: DashboardStats;
}

export default function QuickStats({ stats }: QuickStatsProps) {
  if (!stats) {
    return (
      <motion.div 
        variants={staggerContainer}
        initial="initial"
        animate="animate"
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
      >
        {[...Array(4)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <DashboardStatSkeleton />
          </motion.div>
        ))}
      </motion.div>
    );
  }

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
    <motion.div 
      variants={staggerContainer}
      initial="initial"
      animate="animate"
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
    >
      {statItems.map((stat, index) => (
        <motion.div 
          key={index}
          variants={cardAnimation}
          initial="initial"
          animate="animate"
          whileHover="hover"
          whileTap="tap"
          transition={{ delay: index * 0.1 }}
          className="therapy-card p-4 xs:p-5 sm:p-6 iphone-card-interaction touch-manipulation cursor-pointer" 
          data-testid={`stat-card-${stat.label.toLowerCase().replace(/\s+/g, '-')}`}
        >
          <div className="flex items-center justify-between mb-4">
            <motion.div 
              className={`w-12 h-12 xs:w-10 xs:h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center ${stat.color}`}
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ 
                delay: index * 0.1 + 0.2,
                type: "spring",
                stiffness: 260,
                damping: 20
              }}
            >
              <stat.icon className="text-xl xs:text-lg sm:text-xl" />
            </motion.div>
          </div>
          <motion.h3 
            className="text-2xl xs:text-xl sm:text-2xl font-bold text-therapy-text mb-1 truncate"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 + 0.3 }}
          >
            {stat.value}
          </motion.h3>
          <motion.p 
            className="text-therapy-text/60 text-sm xs:text-xs sm:text-sm truncate leading-tight"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: index * 0.1 + 0.4 }}
          >
            {stat.label}
          </motion.p>
        </motion.div>
      ))}
    </motion.div>
  );
}