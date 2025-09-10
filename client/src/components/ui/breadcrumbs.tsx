import { ChevronRight, Home } from "lucide-react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";

interface BreadcrumbItem {
  label: string;
  href?: string;
  icon?: any;
}

interface BreadcrumbsProps {
  items?: BreadcrumbItem[];
  className?: string;
}

// Generate breadcrumbs from current path
function generateBreadcrumbs(pathname: string): BreadcrumbItem[] {
  const paths = pathname.split('/').filter(Boolean);
  const breadcrumbs: BreadcrumbItem[] = [
    { label: 'Dashboard', href: '/', icon: Home }
  ];

  let currentPath = '';
  paths.forEach((path, index) => {
    currentPath += `/${path}`;
    const label = path
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
    
    breadcrumbs.push({
      label,
      href: index === paths.length - 1 ? undefined : currentPath
    });
  });

  return breadcrumbs;
}

export function Breadcrumbs({ items, className }: BreadcrumbsProps) {
  const [location] = useLocation();
  const breadcrumbItems = items || generateBreadcrumbs(location);

  if (breadcrumbItems.length <= 1) return null;

  return (
    <nav 
      aria-label="Breadcrumb" 
      className={cn(
        "flex items-center space-x-2 text-sm text-therapy-text/60 mb-4 animate-fadeIn",
        className
      )}
    >
      {breadcrumbItems.map((item, index) => {
        const isLast = index === breadcrumbItems.length - 1;
        const Icon = item.icon;

        return (
          <div key={index} className="flex items-center">
            {index > 0 && (
              <ChevronRight className="h-4 w-4 mx-2 text-therapy-text/40" />
            )}
            
            {isLast ? (
              <span className="font-medium text-therapy-text flex items-center gap-2">
                {Icon && <Icon className="h-4 w-4" />}
                {item.label}
              </span>
            ) : (
              <Link
                href={item.href || '/'}
                className="hover:text-therapy-primary transition-colors duration-200 flex items-center gap-2"
                data-testid={`breadcrumb-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
              >
                {Icon && <Icon className="h-4 w-4" />}
                {item.label}
              </Link>
            )}
          </div>
        );
      })}
    </nav>
  );
}

// Mobile-friendly breadcrumbs that collapse when too long
export function MobileBreadcrumbs({ items, className }: BreadcrumbsProps) {
  const [location] = useLocation();
  const breadcrumbItems = items || generateBreadcrumbs(location);

  if (breadcrumbItems.length <= 1) return null;

  // For mobile, show only first and last items if more than 2
  const displayItems = breadcrumbItems.length > 2
    ? [breadcrumbItems[0], breadcrumbItems[breadcrumbItems.length - 1]]
    : breadcrumbItems;

  return (
    <nav 
      aria-label="Breadcrumb" 
      className={cn(
        "flex items-center space-x-2 text-xs sm:text-sm text-therapy-text/60 mb-4 lg:hidden animate-fadeIn",
        className
      )}
    >
      {displayItems.map((item, index) => {
        const isLast = index === displayItems.length - 1;
        const Icon = item.icon;

        return (
          <div key={index} className="flex items-center">
            {index > 0 && (
              <>
                {breadcrumbItems.length > 2 ? (
                  <span className="mx-2 text-therapy-text/40">...</span>
                ) : (
                  <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4 mx-2 text-therapy-text/40" />
                )}
              </>
            )}
            
            {isLast ? (
              <span className="font-medium text-therapy-text flex items-center gap-1 sm:gap-2 truncate max-w-[150px] sm:max-w-none">
                {Icon && <Icon className="h-3 w-3 sm:h-4 sm:w-4" />}
                {item.label}
              </span>
            ) : (
              <Link
                href={item.href || '/'}
                className="hover:text-therapy-primary transition-colors duration-200 flex items-center gap-1 sm:gap-2"
                data-testid={`breadcrumb-mobile-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
              >
                {Icon && <Icon className="h-3 w-3 sm:h-4 sm:w-4" />}
                <span className="truncate max-w-[100px] sm:max-w-none">{item.label}</span>
              </Link>
            )}
          </div>
        );
      })}
    </nav>
  );
}