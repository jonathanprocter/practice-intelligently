
// Emergency cache clearing utility - add to calendar page temporarily
useEffect(() => {
  // Clear all calendar-related queries on component mount
  queryClient.removeQueries({ queryKey: ['calendar'] });
  queryClient.removeQueries({ queryKey: ['events'] });
  queryClient.removeQueries({ queryKey: ['oauth'] });
  console.log('🧹 Cleared all calendar query cache');
}, []);
