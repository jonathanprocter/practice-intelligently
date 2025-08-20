export const getAppointmentStatusStyles = (status: string): React.CSSProperties => {
  const baseStyles: React.CSSProperties = {
    borderRadius: '4px',
    padding: '2px 6px',
    fontSize: '0.75rem',
    fontWeight: '500',
  };

  switch (status?.toLowerCase()) {
    case 'confirmed':
      return {
        ...baseStyles,
        backgroundColor: '#dcfce7',
        color: '#166534',
        borderLeft: '3px solid #22c55e',
      };
    case 'tentative':
      return {
        ...baseStyles,
        backgroundColor: '#fef3c7',
        color: '#92400e',
        borderLeft: '3px solid #f59e0b',
      };
    case 'cancelled':
      return {
        ...baseStyles,
        backgroundColor: '#fee2e2',
        color: '#991b1b',
        borderLeft: '3px solid #ef4444',
        opacity: 0.7,
      };
    case 'completed':
      return {
        ...baseStyles,
        backgroundColor: '#e0e7ff',
        color: '#3730a3',
        borderLeft: '3px solid #6366f1',
      };
    default:
      return {
        ...baseStyles,
        backgroundColor: '#f3f4f6',
        color: '#374151',
        borderLeft: '3px solid #9ca3af',
      };
  }
};

export const getAppointmentStatusCSS = (status: string): string => {
  switch (status?.toLowerCase()) {
    case 'confirmed':
      return 'appointment-status-confirmed';
    case 'tentative':
      return 'appointment-status-tentative';
    case 'cancelled':
      return 'appointment-status-cancelled';
    case 'completed':
      return 'appointment-status-completed';
    case 'scheduled':
      return 'appointment-status-scheduled';
    case 'no_show':
      return 'appointment-status-no-show';
    case 'clinician_canceled':
      return 'appointment-status-clinician-canceled';
    case 'rescheduled':
      return 'appointment-status-rescheduled';
    default:
      return 'appointment-status-default';
  }
};