import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface HealthStatus {
  status: string;
  integrations: {
    openai: boolean;
    anthropic: boolean;
    gemini: boolean;
    perplexity: boolean;
    database: boolean;
  };
}

export default function IntegrationStatus() {
  const { data: health } = useQuery<HealthStatus>({
    queryKey: ['/api/health'],
    refetchInterval: 30000, // Check every 30 seconds
  });

  if (!health) return null;

  const integrations = [
    { name: 'OpenAI', status: health.integrations.openai },
    { name: 'Anthropic', status: health.integrations.anthropic },
    { name: 'Gemini', status: health.integrations.gemini },
    { name: 'Perplexity', status: health.integrations.perplexity },
    { name: 'Database', status: health.integrations.database },
  ];

  return (
    <div className="flex items-center space-x-4 bg-therapy-bg px-4 py-2 rounded-lg">
      {integrations.map((integration) => (
        <div key={integration.name} className="flex items-center">
          <span className={`status-indicator ${
            integration.status ? 'status-online' : 'status-offline'
          }`} />
          <span className="text-sm font-medium">{integration.name}</span>
        </div>
      ))}
    </div>
  );
}
