// Fallback WebSocket handler to prevent client errors
export function setupWebSocketFallback(server) {
  console.log('⚠️ WebSocket fallback enabled (no real-time features)');
  
  // Just log that WebSocket is not available
  // The client will handle disconnection gracefully
  return {
    emit: () => {},
    on: () => {},
    disconnect: () => {}
  };
}

export default { setupWebSocketFallback };