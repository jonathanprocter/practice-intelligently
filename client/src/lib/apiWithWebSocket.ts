// lib/apiWithWebSocket.ts
import { apiRequest } from "./queryClient";
import { wsManager } from "./websocket";
import type { SessionNote, Client, Appointment, ActionItem } from "./api";

/**
 * Enhanced API client that emits WebSocket events for real-time updates
 * This wraps the standard API calls with WebSocket notifications
 */
export class ApiWithWebSocket {
  // Session Notes with WebSocket events
  static async createSessionNote(sessionNote: Partial<SessionNote>): Promise<SessionNote> {
    const response = await apiRequest('POST', '/api/session-notes', sessionNote);
    const created = await response.json();
    
    // Emit WebSocket event for real-time updates
    wsManager.notifySessionNoteCreated({
      ...created,
      clientName: created.clientName || 'Unknown Client'
    });
    
    return created;
  }

  static async updateSessionNote(id: string, updates: Partial<SessionNote>): Promise<SessionNote> {
    const response = await apiRequest('PUT', `/api/session-notes/${id}`, updates);
    const updated = await response.json();
    
    // Emit WebSocket event
    wsManager.notifySessionNoteUpdated({
      sessionNoteId: id,
      ...updated
    });
    
    return updated;
  }

  static async deleteSessionNote(id: string, clientId: string): Promise<void> {
    await apiRequest('DELETE', `/api/session-notes/${id}`);
    
    // Emit WebSocket event
    wsManager.notifySessionNoteDeleted(id, clientId);
  }

  // Appointments with WebSocket events
  static async createAppointment(appointment: Partial<Appointment>): Promise<Appointment> {
    const response = await apiRequest('POST', '/api/appointments', appointment);
    const created = await response.json();
    
    // Emit WebSocket event
    wsManager.notifyAppointmentCreated({
      ...created,
      clientName: created.clientName || created.clientFirstName + ' ' + created.clientLastName
    });
    
    return created;
  }

  static async updateAppointment(id: string, updates: Partial<Appointment>): Promise<Appointment> {
    const response = await apiRequest('PUT', `/api/appointments/${id}`, updates);
    const updated = await response.json();
    
    // Emit WebSocket event
    wsManager.notifyAppointmentUpdated({
      appointmentId: id,
      ...updated
    });
    
    return updated;
  }

  static async deleteAppointment(id: string): Promise<void> {
    await apiRequest('DELETE', `/api/appointments/${id}`);
    
    // Emit WebSocket event
    wsManager.notifyAppointmentDeleted(id);
  }

  static async updateAppointmentStatus(id: string, status: string): Promise<Appointment> {
    const response = await apiRequest('PATCH', `/api/appointments/${id}/status`, { status });
    const updated = await response.json();
    
    // Emit specific status change event
    wsManager.emit('appointment:status-changed', {
      appointmentId: id,
      status,
      ...updated
    });
    
    return updated;
  }

  // Clients with WebSocket events
  static async createClient(client: Partial<Client>): Promise<Client> {
    const response = await apiRequest('POST', '/api/clients', client);
    const created = await response.json();
    
    // Emit WebSocket event
    wsManager.emit('client:created', created);
    
    return created;
  }

  static async updateClient(id: string, updates: Partial<Client>): Promise<Client> {
    const response = await apiRequest('PUT', `/api/clients/${id}`, updates);
    const updated = await response.json();
    
    // Emit WebSocket event
    wsManager.notifyClientUpdated({
      clientId: id,
      ...updated
    });
    
    return updated;
  }

  static async deleteClient(id: string): Promise<void> {
    await apiRequest('DELETE', `/api/clients/${id}`);
    
    // Emit WebSocket event
    wsManager.emit('client:deleted', { clientId: id });
  }

  static async updateClientStatus(id: string, status: string): Promise<Client> {
    const response = await apiRequest('PATCH', `/api/clients/${id}/status`, { status });
    const updated = await response.json();
    
    // Emit specific status change event
    wsManager.emit('client:status-changed', {
      clientId: id,
      status,
      ...updated
    });
    
    return updated;
  }

  // Action Items with WebSocket events
  static async createActionItem(actionItem: Partial<ActionItem>): Promise<ActionItem> {
    const response = await apiRequest('POST', '/api/action-items', actionItem);
    const created = await response.json();
    
    // Emit WebSocket event
    wsManager.emit('action-item:created', created);
    
    return created;
  }

  static async updateActionItem(id: string, updates: Partial<ActionItem>): Promise<ActionItem> {
    const response = await apiRequest('PUT', `/api/action-items/${id}`, updates);
    const updated = await response.json();
    
    // Emit WebSocket event
    wsManager.emit('action-item:updated', {
      actionItemId: id,
      ...updated
    });
    
    return updated;
  }

  static async completeActionItem(id: string, clientId?: string): Promise<ActionItem> {
    const response = await apiRequest('PATCH', `/api/action-items/${id}/complete`, {});
    const completed = await response.json();
    
    // Emit WebSocket event
    wsManager.notifyActionItemCompleted(id, clientId);
    
    return completed;
  }

  static async deleteActionItem(id: string): Promise<void> {
    await apiRequest('DELETE', `/api/action-items/${id}`);
    
    // Emit WebSocket event
    wsManager.emit('action-item:deleted', { actionItemId: id });
  }

  // Document processing with progress updates
  static async uploadDocument(
    file: File, 
    onProgress?: (progress: number) => void
  ): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);
    
    // Generate a document ID for tracking
    const documentId = `doc-${Date.now()}`;
    
    // Emit upload started event
    wsManager.emit('document:upload-started', {
      documentId,
      fileName: file.name,
      fileSize: file.size
    });

    // Simulate progress updates via WebSocket
    const progressInterval = setInterval(() => {
      const progress = Math.min(90, Math.random() * 100);
      wsManager.notifyDocumentProgress(documentId, progress, 'uploading');
      onProgress?.(progress);
    }, 500);

    try {
      const response = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });

      clearInterval(progressInterval);
      
      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const result = await response.json();
      
      // Emit upload completed event
      wsManager.emit('document:upload-completed', {
        documentId,
        ...result
      });
      
      // Start processing
      wsManager.emit('document:processing-started', {
        documentId,
        ...result
      });
      
      return result;
    } catch (error) {
      clearInterval(progressInterval);
      throw error;
    }
  }

  // Calendar sync with progress
  static async syncCalendar(onProgress?: (progress: number, status: string) => void): Promise<any> {
    // Emit sync started event
    wsManager.emit('calendar:sync-started', {
      timestamp: new Date()
    });

    try {
      // Start the sync
      const response = await apiRequest('POST', '/api/calendar/sync', {});
      const result = await response.json();
      
      // Simulate progress updates
      for (let i = 10; i <= 90; i += 20) {
        wsManager.notifyCalendarSyncProgress(i, 'syncing', {
          processed: Math.floor(i / 10),
          total: 10
        });
        onProgress?.(i, 'syncing');
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      // Emit sync completed event
      wsManager.emit('calendar:sync-completed', {
        appointmentsUpdated: result.appointmentsUpdated || 0,
        timestamp: new Date()
      });
      
      onProgress?.(100, 'completed');
      
      return result;
    } catch (error) {
      // Emit sync error event
      wsManager.emit('calendar:sync-error', {
        error: error instanceof Error ? error.message : 'Sync failed',
        timestamp: new Date()
      });
      
      throw error;
    }
  }

  // AI processing with real-time updates
  static async generateAIInsights(
    sessionNoteId: string,
    clientId: string
  ): Promise<any> {
    // Emit analysis started event
    wsManager.emit('ai:analysis-started', {
      sessionNoteId,
      clientId,
      timestamp: new Date()
    });

    try {
      const response = await apiRequest('POST', '/api/ai/generate-insights', {
        sessionNoteId,
        clientId
      });
      
      const insights = await response.json();
      
      // Emit analysis completed event
      wsManager.emit('ai:analysis-completed', {
        sessionNoteId,
        clientId,
        insightsCount: insights.length || 0,
        timestamp: new Date()
      });
      
      // Emit individual insight events
      if (Array.isArray(insights)) {
        insights.forEach(insight => {
          wsManager.notifyAIInsightGenerated({
            ...insight,
            sessionNoteId,
            clientId
          });
        });
      }
      
      return insights;
    } catch (error) {
      throw error;
    }
  }

  // Track user activity
  static trackActivity(activity: string, details?: any) {
    wsManager.trackUserActivity(activity, details);
  }
}