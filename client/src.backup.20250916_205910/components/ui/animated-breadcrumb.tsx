import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { ChevronRight, Home } from "lucide-react";
import { Link } from "wouter";

export interface BreadcrumbItem {
  label: string;
  href?: string;
  icon?: React.ElementType;
}

interface AnimatedBreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
  separator?: React.ReactNode;
  showHome?: boolean;
}

export function AnimatedBreadcrumb({
  items,
  className,
  separator = <ChevronRight className="h-4 w-4" />,
  showHome = true
}: AnimatedBreadcrumbProps) {
  const allItems = showHome 
    ? [{ label: "Dashboard", href: "/", icon: Home }, ...items]
    : items;

  return (
    <nav 
      aria-label="Breadcrumb"
      className={cn("flex items-center space-x-2 text-sm", className)}
    >
      {allItems.map((item, index) => {
        const isLast = index === allItems.length - 1;
        const Icon = item.icon;

        return (
          <motion.div
            key={index}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            className="flex items-center space-x-2"
          >
            {index > 0 && (
              <motion.span 
                className="text-muted-foreground"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: index * 0.05 + 0.1 }}
              >
                {separator}
              </motion.span>
            )}
            
            {isLast ? (
              <motion.span 
                className="font-medium text-foreground flex items-center gap-1"
                whileHover={{ scale: 1.02 }}
              >
                {Icon && <Icon className="h-4 w-4" />}
                {item.label}
              </motion.span>
            ) : item.href ? (
              <Link href={item.href}>
                <motion.a
                  className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {Icon && <Icon className="h-4 w-4" />}
                  {item.label}
                </motion.a>
              </Link>
            ) : (
              <span className="text-muted-foreground flex items-center gap-1">
                {Icon && <Icon className="h-4 w-4" />}
                {item.label}
              </span>
            )}
          </motion.div>
        );
      })}
    </nav>
  );
}