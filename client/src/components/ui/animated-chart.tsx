import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { fadeIn } from "@/lib/animations";
import { TrendingUp, TrendingDown, Minus, Info } from "lucide-react";
import { useState } from "react";

interface DataPoint {
  label: string;
  value: number;
  color?: string;
  icon?: React.ReactNode;
}

interface AnimatedChartProps {
  data: DataPoint[];
  title?: string;
  subtitle?: string;
  type?: 'bar' | 'line' | 'pie' | 'progress';
  height?: number;
  showLabels?: boolean;
  showValues?: boolean;
  showTrend?: boolean;
  animate?: boolean;
  className?: string;
}

// Animated Bar Chart
export function AnimatedBarChart({
  data,
  title,
  subtitle,
  height = 300,
  showLabels = true,
  showValues = true,
  animate = true,
  className
}: AnimatedChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const maxValue = Math.max(...data.map(d => d.value));

  return (
    <motion.div
      initial={animate ? { opacity: 0, y: 20 } : undefined}
      animate={animate ? { opacity: 1, y: 0 } : undefined}
      className={cn("p-6 bg-card rounded-lg border", className)}
    >
      {(title || subtitle) && (
        <div className="mb-6">
          {title && <h3 className="text-lg font-semibold">{title}</h3>}
          {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
        </div>
      )}

      <div className="relative" style={{ height }}>
        <div className="flex items-end justify-between h-full gap-2">
          {data.map((point, index) => {
            const heightPercentage = (point.value / maxValue) * 100;
            const isHovered = hoveredIndex === index;

            return (
              <motion.div
                key={index}
                className="flex-1 flex flex-col items-center justify-end gap-2"
                onHoverStart={() => setHoveredIndex(index)}
                onHoverEnd={() => setHoveredIndex(null)}
              >
                {showValues && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: isHovered ? 1 : 0 }}
                    className="text-sm font-medium"
                  >
                    {point.value}
                  </motion.div>
                )}

                <motion.div
                  className={cn(
                    "w-full rounded-t-md transition-all cursor-pointer",
                    point.color || "bg-primary"
                  )}
                  initial={animate ? { height: 0 } : { height: `${heightPercentage}%` }}
                  animate={{ 
                    height: `${heightPercentage}%`,
                    scale: isHovered ? 1.05 : 1,
                    opacity: hoveredIndex !== null && !isHovered ? 0.5 : 1
                  }}
                  transition={{
                    height: { duration: 0.5, delay: index * 0.1, ease: [0.4, 0, 0.2, 1] },
                    scale: { duration: 0.2 },
                    opacity: { duration: 0.2 }
                  }}
                />

                {showLabels && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: index * 0.1 + 0.5 }}
                    className="text-xs text-muted-foreground text-center mt-2"
                  >
                    {point.label}
                  </motion.div>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}

// Animated Progress Bars
export function AnimatedProgressChart({
  data,
  title,
  subtitle,
  showValues = true,
  animate = true,
  className
}: AnimatedChartProps) {
  return (
    <motion.div
      initial={animate ? { opacity: 0, y: 20 } : undefined}
      animate={animate ? { opacity: 1, y: 0 } : undefined}
      className={cn("p-6 bg-card rounded-lg border", className)}
    >
      {(title || subtitle) && (
        <div className="mb-6">
          {title && <h3 className="text-lg font-semibold">{title}</h3>}
          {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
        </div>
      )}

      <div className="space-y-4">
        {data.map((point, index) => (
          <motion.div
            key={index}
            initial={animate ? { opacity: 0, x: -20 } : undefined}
            animate={animate ? { opacity: 1, x: 0 } : undefined}
            transition={{ delay: index * 0.1 }}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                {point.icon}
                <span className="text-sm font-medium">{point.label}</span>
              </div>
              {showValues && (
                <span className="text-sm text-muted-foreground">
                  {point.value}%
                </span>
              )}
            </div>

            <div className="relative h-2 bg-muted rounded-full overflow-hidden">
              <motion.div
                className={cn("absolute inset-y-0 left-0 rounded-full", point.color || "bg-primary")}
                initial={animate ? { width: 0 } : { width: `${point.value}%` }}
                animate={{ width: `${point.value}%` }}
                transition={{
                  duration: 0.5,
                  delay: index * 0.1 + 0.2,
                  ease: [0.4, 0, 0.2, 1]
                }}
              />
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

// Animated Stat Card with Trend
export function AnimatedStatCard({
  label,
  value,
  trend,
  trendValue,
  icon,
  color = "bg-primary",
  index = 0
}: {
  label: string;
  value: string | number;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  icon?: React.ReactNode;
  color?: string;
  index?: number;
}) {
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  const trendColor = trend === 'up' ? 'text-green-500' : trend === 'down' ? 'text-red-500' : 'text-muted-foreground';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      whileHover={{ scale: 1.02, y: -2 }}
      className="p-6 bg-card rounded-lg border cursor-pointer"
    >
      <div className="flex items-start justify-between mb-4">
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{
            delay: index * 0.1 + 0.2,
            type: "spring",
            stiffness: 260,
            damping: 20
          }}
          className={cn("p-3 rounded-lg", color, "bg-opacity-10")}
        >
          {icon}
        </motion.div>

        {trend && (
          <motion.div
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.1 + 0.3 }}
            className={cn("flex items-center gap-1", trendColor)}
          >
            <TrendIcon className="h-4 w-4" />
            {trendValue && <span className="text-xs font-medium">{trendValue}</span>}
          </motion.div>
        )}
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: index * 0.1 + 0.4 }}
      >
        <h3 className="text-2xl font-bold mb-1">{value}</h3>
        <p className="text-sm text-muted-foreground">{label}</p>
      </motion.div>
    </motion.div>
  );
}

// Animated Pie Chart (simplified)
export function AnimatedPieChart({
  data,
  title,
  subtitle,
  size = 200,
  animate = true,
  className
}: AnimatedChartProps & { size?: number }) {
  const total = data.reduce((sum, point) => sum + point.value, 0);
  let cumulativePercentage = 0;

  return (
    <motion.div
      initial={animate ? { opacity: 0, scale: 0.8 } : undefined}
      animate={animate ? { opacity: 1, scale: 1 } : undefined}
      className={cn("p-6 bg-card rounded-lg border", className)}
    >
      {(title || subtitle) && (
        <div className="mb-6 text-center">
          {title && <h3 className="text-lg font-semibold">{title}</h3>}
          {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
        </div>
      )}

      <div className="flex items-center justify-center">
        <div className="relative" style={{ width: size, height: size }}>
          <svg
            width={size}
            height={size}
            viewBox={`0 0 ${size} ${size}`}
            className="transform -rotate-90"
          >
            {data.map((point, index) => {
              const percentage = (point.value / total) * 100;
              const strokeDasharray = `${percentage} ${100 - percentage}`;
              const strokeDashoffset = -cumulativePercentage;
              cumulativePercentage += percentage;

              return (
                <motion.circle
                  key={index}
                  cx={size / 2}
                  cy={size / 2}
                  r={size / 3}
                  fill="none"
                  stroke={point.color || `hsl(${index * 60}, 70%, 50%)`}
                  strokeWidth={size / 6}
                  strokeDasharray={strokeDasharray}
                  strokeDashoffset={strokeDashoffset}
                  initial={animate ? { pathLength: 0 } : { pathLength: 1 }}
                  animate={{ pathLength: 1 }}
                  transition={{
                    duration: 0.5,
                    delay: index * 0.1,
                    ease: [0.4, 0, 0.2, 1]
                  }}
                  className="transition-all hover:opacity-80"
                  style={{
                    strokeDasharray: `${(percentage / 100) * Math.PI * 2 * (size / 3)} ${Math.PI * 2 * (size / 3)}`,
                    strokeDashoffset: -cumulativePercentage * Math.PI * 2 * (size / 3) / 100
                  }}
                />
              );
            })}
          </svg>

          <div className="absolute inset-0 flex items-center justify-center">
            <motion.div
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5 }}
              className="text-center"
            >
              <div className="text-2xl font-bold">{total}</div>
              <div className="text-xs text-muted-foreground">Total</div>
            </motion.div>
          </div>
        </div>
      </div>

      <div className="mt-6 space-y-2">
        {data.map((point, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 + 0.5 }}
            className="flex items-center justify-between text-sm"
          >
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: point.color || `hsl(${index * 60}, 70%, 50%)` }}
              />
              <span>{point.label}</span>
            </div>
            <span className="text-muted-foreground">
              {point.value} ({Math.round((point.value / total) * 100)}%)
            </span>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}