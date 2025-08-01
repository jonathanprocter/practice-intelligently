import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, boolean, jsonb, uuid, decimal, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  fullName: text("full_name").notNull(),
  role: text("role").notNull().default("therapist"),
  email: text("email").notNull().unique(),
  phone: text("phone"),
  licenseNumber: text("license_number"),
  licenseType: text("license_type"),
  licenseExpiry: timestamp("license_expiry"),
  qualifications: jsonb("qualifications"),
  specializations: jsonb("specializations"),
  profilePicture: text("profile_picture"),
  address: jsonb("address"),
  preferences: jsonb("preferences"),
  isActive: boolean("is_active").default(true),
  lastLogin: timestamp("last_login"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  emailIdx: index("users_email_idx").on(table.email),
  usernameIdx: index("users_username_idx").on(table.username),
}));

export const clients = pgTable("clients", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  clientNumber: text("client_number").unique(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  preferredName: text("preferred_name"),
  pronouns: text("pronouns"),
  email: text("email"),
  phone: text("phone"),
  alternatePhone: text("alternate_phone"),
  dateOfBirth: timestamp("date_of_birth"),
  gender: text("gender"),
  address: jsonb("address"),
  emergencyContact: jsonb("emergency_contact"),
  insuranceInfo: jsonb("insurance_info"),
  medicalHistory: jsonb("medical_history"),
  medications: jsonb("medications"),
  allergies: jsonb("allergies"),
  referralSource: text("referral_source"),
  primaryConcerns: jsonb("primary_concerns"),
  therapistId: uuid("therapist_id").references(() => users.id, { onDelete: "cascade" }),
  status: text("status").notNull().default("active"),
  riskLevel: text("risk_level").default("low"),
  consentStatus: jsonb("consent_status"),
  hipaaSignedDate: timestamp("hipaa_signed_date"),
  lastContact: timestamp("last_contact"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  therapistIdx: index("clients_therapist_idx").on(table.therapistId),
  statusIdx: index("clients_status_idx").on(table.status),
  nameIdx: index("clients_name_idx").on(table.firstName, table.lastName),
}));

export const appointments = pgTable("appointments", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  appointmentNumber: text("appointment_number").unique(),
  clientId: uuid("client_id").references(() => clients.id, { onDelete: "cascade" }).notNull(),
  therapistId: uuid("therapist_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  type: text("type").notNull(),
  status: text("status").notNull().default("scheduled"),
  location: text("location"),
  // Google Calendar integration fields
  googleEventId: text("google_event_id"),
  googleCalendarId: text("google_calendar_id"),
  googleCalendarName: text("google_calendar_name"),
  lastGoogleSync: timestamp("last_google_sync"),
  isVirtual: boolean("is_virtual").default(false),
  meetingLink: text("meeting_link"),
  notes: text("notes"),
  cancellationReason: text("cancellation_reason"),
  noShowReason: text("no_show_reason"),
  reminderSent: boolean("reminder_sent").default(false),
  reminderSentAt: timestamp("reminder_sent_at"),
  checkedInAt: timestamp("checked_in_at"),
  completedAt: timestamp("completed_at"),
  fee: decimal("fee", { precision: 10, scale: 2 }),
  insuranceClaim: jsonb("insurance_claim"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  clientIdx: index("appointments_client_idx").on(table.clientId),
  therapistIdx: index("appointments_therapist_idx").on(table.therapistId),
  dateIdx: index("appointments_date_idx").on(table.startTime),
  statusIdx: index("appointments_status_idx").on(table.status),
  googleEventIdx: index("appointments_google_event_idx").on(table.googleEventId),
}));

export const sessionNotes = pgTable("session_notes", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  appointmentId: uuid("appointment_id").references(() => appointments.id),
  eventId: text("event_id"), // For Google Calendar event ID
  clientId: text("client_id"), // Simplified - no foreign key constraint for Google Calendar integration
  therapistId: text("therapist_id"), // Simplified - no foreign key constraint for Google Calendar integration
  content: text("content").notNull(),
  transcript: text("transcript"),
  aiSummary: text("ai_summary"),
  tags: jsonb("tags"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const sessionPrepNotes = pgTable("session_prep_notes", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  appointmentId: uuid("appointment_id").references(() => appointments.id),
  eventId: text("event_id"), // For Google Calendar event ID
  clientId: text("client_id"), // For Google Calendar integration
  therapistId: text("therapist_id"), // For Google Calendar integration
  prepContent: text("prep_content").notNull(),
  keyFocusAreas: jsonb("key_focus_areas"),
  previousSessionSummary: text("previous_session_summary"),
  suggestedInterventions: jsonb("suggested_interventions"),
  clientGoals: jsonb("client_goals"),
  riskFactors: jsonb("risk_factors"),
  homeworkReview: text("homework_review"),
  sessionObjectives: jsonb("session_objectives"),
  aiGeneratedInsights: text("ai_generated_insights"),
  followUpQuestions: jsonb("follow_up_questions"),
  psychoeducationalMaterials: jsonb("psychoeducational_materials"),
  lastUpdatedBy: uuid("last_updated_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  eventIdIdx: index("session_prep_notes_event_id_idx").on(table.eventId),
  clientIdIdx: index("session_prep_notes_client_id_idx").on(table.clientId),
  therapistIdIdx: index("session_prep_notes_therapist_id_idx").on(table.therapistId),
}));

export const clientCheckins = pgTable("client_checkins", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: text("client_id").notNull(),
  therapistId: text("therapist_id").notNull(),
  eventId: text("event_id"),
  sessionNoteId: uuid("session_note_id").references(() => sessionNotes.id),
  checkinType: text("checkin_type", { enum: ["midweek", "followup", "crisis_support", "goal_reminder", "homework_reminder"] }).notNull().default("midweek"),
  priority: text("priority", { enum: ["low", "medium", "high", "urgent"] }).notNull().default("medium"),
  subject: text("subject").notNull(),
  messageContent: text("message_content").notNull(),
  aiReasoning: text("ai_reasoning"),
  triggerContext: jsonb("trigger_context"),
  deliveryMethod: text("delivery_method", { enum: ["email", "sms", "both"] }).notNull().default("email"),
  status: text("status", { enum: ["generated", "reviewed", "approved", "sent", "archived", "deleted"] }).notNull().default("generated"),
  generatedAt: timestamp("generated_at").defaultNow(),
  reviewedAt: timestamp("reviewed_at"),
  sentAt: timestamp("sent_at"),
  archivedAt: timestamp("archived_at"),
  expiresAt: timestamp("expires_at").default(sql`NOW() + INTERVAL '7 days'`),
  clientResponse: text("client_response"),
  responseReceivedAt: timestamp("response_received_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  clientIdIdx: index("client_checkins_client_id_idx").on(table.clientId),
  therapistIdIdx: index("client_checkins_therapist_id_idx").on(table.therapistId),
  statusIdx: index("client_checkins_status_idx").on(table.status),
  expiresAtIdx: index("client_checkins_expires_at_idx").on(table.expiresAt),
  generatedAtIdx: index("client_checkins_generated_at_idx").on(table.generatedAt),
}));

export const actionItems = pgTable("action_items", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: uuid("client_id").references(() => clients.id),
  therapistId: uuid("therapist_id").references(() => users.id).notNull(),
  eventId: text("event_id"), // For Google Calendar event ID
  title: text("title").notNull(),
  description: text("description"),
  priority: text("priority").notNull().default("medium"),
  status: text("status").notNull().default("pending"),
  dueDate: timestamp("due_date"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const treatmentPlans = pgTable("treatment_plans", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: uuid("client_id").references(() => clients.id).notNull(),
  therapistId: uuid("therapist_id").references(() => users.id).notNull(),
  goals: jsonb("goals").notNull(),
  interventions: jsonb("interventions"),
  progress: jsonb("progress"),
  status: text("status").notNull().default("active"),
  startDate: timestamp("start_date").defaultNow(),
  reviewDate: timestamp("review_date"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const aiInsights = pgTable("ai_insights", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: uuid("client_id").references(() => clients.id, { onDelete: "cascade" }),
  therapistId: uuid("therapist_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  type: text("type").notNull(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  confidence: integer("confidence"),
  metadata: jsonb("metadata"),
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  therapistIdx: index("ai_insights_therapist_idx").on(table.therapistId),
  clientIdx: index("ai_insights_client_idx").on(table.clientId),
}));

// Additional comprehensive tables for robust therapy practice management

export const billingRecords = pgTable("billing_records", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: uuid("client_id").references(() => clients.id, { onDelete: "cascade" }).notNull(),
  therapistId: uuid("therapist_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  appointmentId: uuid("appointment_id").references(() => appointments.id, { onDelete: "cascade" }),
  invoiceNumber: text("invoice_number").unique(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  taxAmount: decimal("tax_amount", { precision: 10, scale: 2 }),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  serviceDate: timestamp("service_date").notNull(),
  billingDate: timestamp("billing_date").defaultNow(),
  dueDate: timestamp("due_date"),
  status: text("status").notNull().default("pending"),
  paymentMethod: text("payment_method"),
  transactionId: text("transaction_id"),
  paidAt: timestamp("paid_at"),
  insuranceClaimId: text("insurance_claim_id"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  clientIdx: index("billing_records_client_idx").on(table.clientId),
  statusIdx: index("billing_records_status_idx").on(table.status),
  dueDateIdx: index("billing_records_due_date_idx").on(table.dueDate),
}));

export const assessments = pgTable("assessments", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: uuid("client_id").references(() => clients.id, { onDelete: "cascade" }).notNull(),
  therapistId: uuid("therapist_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  appointmentId: uuid("appointment_id").references(() => appointments.id, { onDelete: "set null" }),
  assessmentType: text("assessment_type").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  questions: jsonb("questions").notNull(),
  responses: jsonb("responses"),
  scores: jsonb("scores"),
  interpretation: text("interpretation"),
  recommendations: jsonb("recommendations"),
  status: text("status").notNull().default("draft"),
  completedAt: timestamp("completed_at"),
  reviewedAt: timestamp("reviewed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  clientIdx: index("assessments_client_idx").on(table.clientId),
  typeIdx: index("assessments_type_idx").on(table.assessmentType),
}));

export const progressNotes = pgTable("progress_notes", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: uuid("client_id").references(() => clients.id, { onDelete: "cascade" }).notNull(),
  therapistId: uuid("therapist_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  appointmentId: uuid("appointment_id").references(() => appointments.id, { onDelete: "cascade" }),
  treatmentPlanId: uuid("treatment_plan_id").references(() => treatmentPlans.id, { onDelete: "set null" }),
  // AI-generated comprehensive progress note fields
  title: text("title").notNull(),
  subjective: text("subjective"),
  objective: text("objective"),
  assessment: text("assessment"),
  plan: text("plan"),
  tonalAnalysis: text("tonal_analysis"),
  keyPoints: jsonb("key_points"),
  significantQuotes: jsonb("significant_quotes"),
  narrativeSummary: text("narrative_summary"),
  aiTags: jsonb("ai_tags"), // AI-generated tags for categorization
  sessionDate: timestamp("session_date"),
  // Legacy fields for backward compatibility
  progressSummary: text("progress_summary"),
  currentMood: text("current_mood"),
  behavioralObservations: text("behavioral_observations"),
  interventionsUsed: jsonb("interventions_used"),
  clientResponse: text("client_response"),
  homeworkAssigned: text("homework_assigned"),
  riskAssessment: jsonb("risk_assessment"),
  nextSteps: text("next_steps"),
  goals: jsonb("goals"),
  goalsProgress: jsonb("goals_progress"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  clientIdx: index("progress_notes_client_idx").on(table.clientId),
  appointmentIdx: index("progress_notes_appointment_idx").on(table.appointmentId),
  sessionDateIdx: index("progress_notes_session_date_idx").on(table.sessionDate),
}));

export const medications = pgTable("medications", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: uuid("client_id").references(() => clients.id, { onDelete: "cascade" }).notNull(),
  name: text("name").notNull(),
  dosage: text("dosage"),
  frequency: text("frequency"),
  prescribedBy: text("prescribed_by"),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  purpose: text("purpose"),
  sideEffects: jsonb("side_effects"),
  effectiveness: text("effectiveness"),
  status: text("status").notNull().default("active"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  clientIdx: index("medications_client_idx").on(table.clientId),
  statusIdx: index("medications_status_idx").on(table.status),
}));

export const communicationLogs = pgTable("communication_logs", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: uuid("client_id").references(() => clients.id, { onDelete: "cascade" }).notNull(),
  therapistId: uuid("therapist_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  type: text("type").notNull(), // email, phone, text, in-person
  direction: text("direction").notNull(), // incoming, outgoing
  subject: text("subject"),
  content: text("content").notNull(),
  priority: text("priority").default("normal"),
  isUrgent: boolean("is_urgent").default(false),
  readAt: timestamp("read_at"),
  respondedAt: timestamp("responded_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  clientIdx: index("communication_logs_client_idx").on(table.clientId),
  typeIdx: index("communication_logs_type_idx").on(table.type),
  urgentIdx: index("communication_logs_urgent_idx").on(table.isUrgent),
}));

export const documents = pgTable("documents", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: uuid("client_id").references(() => clients.id, { onDelete: "cascade" }),
  therapistId: uuid("therapist_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  fileName: text("file_name").notNull(),
  originalName: text("original_name").notNull(),
  fileType: text("file_type").notNull(),
  fileSize: integer("file_size"),
  documentType: text("document_type").notNull(), // intake-form, consent, assessment, report, etc.
  description: text("description"),
  filePath: text("file_path").notNull(),
  isConfidential: boolean("is_confidential").default(true),
  tags: jsonb("tags"),
  uploadedAt: timestamp("uploaded_at").defaultNow(),
  lastAccessedAt: timestamp("last_accessed_at"),
}, (table) => ({
  clientIdx: index("documents_client_idx").on(table.clientId),
  typeIdx: index("documents_type_idx").on(table.documentType),
}));

export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  entityType: text("entity_type").notNull(),
  entityId: uuid("entity_id").notNull(),
  action: text("action").notNull(), // create, read, update, delete
  changes: jsonb("changes"), // what changed
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  timestamp: timestamp("timestamp").defaultNow(),
}, (table) => ({
  userIdx: index("audit_logs_user_idx").on(table.userId),
  entityIdx: index("audit_logs_entity_idx").on(table.entityType, table.entityId),
  timestampIdx: index("audit_logs_timestamp_idx").on(table.timestamp),
}));

// Google Calendar Events - separate table for storing calendar events from Google Calendar API
export const calendarEvents = pgTable("calendar_events", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  googleEventId: text("google_event_id").notNull(),
  googleCalendarId: text("google_calendar_id").notNull(),
  calendarName: text("calendar_name"),
  therapistId: uuid("therapist_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  clientId: uuid("client_id").references(() => clients.id, { onDelete: "set null" }),
  appointmentId: uuid("appointment_id").references(() => appointments.id, { onDelete: "set null" }),
  summary: text("summary").notNull(),
  description: text("description"),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  timeZone: text("time_zone"),
  location: text("location"),
  status: text("status").notNull().default("confirmed"),
  attendees: jsonb("attendees"),
  isAllDay: boolean("is_all_day").default(false),
  recurringEventId: text("recurring_event_id"),
  lastSyncTime: timestamp("last_sync_time").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  googleEventIdx: index("calendar_events_google_event_idx").on(table.googleEventId),
  therapistIdx: index("calendar_events_therapist_idx").on(table.therapistId),
  clientIdx: index("calendar_events_client_idx").on(table.clientId),
  dateIdx: index("calendar_events_date_idx").on(table.startTime),
  statusIdx: index("calendar_events_status_idx").on(table.status),
  calendarIdx: index("calendar_events_calendar_idx").on(table.googleCalendarId),
}));

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  clients: many(clients),
  appointments: many(appointments),
  sessionNotes: many(sessionNotes),
  actionItems: many(actionItems),
  treatmentPlans: many(treatmentPlans),
  aiInsights: many(aiInsights),
  billingRecords: many(billingRecords),
  assessments: many(assessments),
  progressNotes: many(progressNotes),
  communicationLogs: many(communicationLogs),
  documents: many(documents),
  auditLogs: many(auditLogs),
}));

export const clientsRelations = relations(clients, ({ one, many }) => ({
  therapist: one(users, {
    fields: [clients.therapistId],
    references: [users.id],
  }),
  appointments: many(appointments),
  sessionNotes: many(sessionNotes),
  actionItems: many(actionItems),
  treatmentPlans: many(treatmentPlans),
  aiInsights: many(aiInsights),
  billingRecords: many(billingRecords),
  assessments: many(assessments),
  progressNotes: many(progressNotes),
  medications: many(medications),
  communicationLogs: many(communicationLogs),
  documents: many(documents),
}));

export const appointmentsRelations = relations(appointments, ({ one, many }) => ({
  client: one(clients, {
    fields: [appointments.clientId],
    references: [clients.id],
  }),
  therapist: one(users, {
    fields: [appointments.therapistId],
    references: [users.id],
  }),
  sessionNotes: many(sessionNotes),
  billingRecords: many(billingRecords),
  assessments: many(assessments),
  progressNotes: many(progressNotes),
}));

export const sessionNotesRelations = relations(sessionNotes, ({ one }) => ({
  appointment: one(appointments, {
    fields: [sessionNotes.appointmentId],
    references: [appointments.id],
  }),
  client: one(clients, {
    fields: [sessionNotes.clientId],
    references: [clients.id],
  }),
  therapist: one(users, {
    fields: [sessionNotes.therapistId],
    references: [users.id],
  }),
}));

export const actionItemsRelations = relations(actionItems, ({ one }) => ({
  client: one(clients, {
    fields: [actionItems.clientId],
    references: [clients.id],
  }),
  therapist: one(users, {
    fields: [actionItems.therapistId],
    references: [users.id],
  }),
}));

export const treatmentPlansRelations = relations(treatmentPlans, ({ one }) => ({
  client: one(clients, {
    fields: [treatmentPlans.clientId],
    references: [clients.id],
  }),
  therapist: one(users, {
    fields: [treatmentPlans.therapistId],
    references: [users.id],
  }),
}));

export const aiInsightsRelations = relations(aiInsights, ({ one }) => ({
  client: one(clients, {
    fields: [aiInsights.clientId],
    references: [clients.id],
  }),
  therapist: one(users, {
    fields: [aiInsights.therapistId],
    references: [users.id],
  }),
}));

// New table relations
export const billingRecordsRelations = relations(billingRecords, ({ one }) => ({
  client: one(clients, {
    fields: [billingRecords.clientId],
    references: [clients.id],
  }),
  therapist: one(users, {
    fields: [billingRecords.therapistId],
    references: [users.id],
  }),
  appointment: one(appointments, {
    fields: [billingRecords.appointmentId],
    references: [appointments.id],
  }),
}));

export const assessmentsRelations = relations(assessments, ({ one }) => ({
  client: one(clients, {
    fields: [assessments.clientId],
    references: [clients.id],
  }),
  therapist: one(users, {
    fields: [assessments.therapistId],
    references: [users.id],
  }),
  appointment: one(appointments, {
    fields: [assessments.appointmentId],
    references: [appointments.id],
  }),
}));

export const progressNotesRelations = relations(progressNotes, ({ one }) => ({
  client: one(clients, {
    fields: [progressNotes.clientId],
    references: [clients.id],
  }),
  therapist: one(users, {
    fields: [progressNotes.therapistId],
    references: [users.id],
  }),
  appointment: one(appointments, {
    fields: [progressNotes.appointmentId],
    references: [appointments.id],
  }),
  treatmentPlan: one(treatmentPlans, {
    fields: [progressNotes.treatmentPlanId],
    references: [treatmentPlans.id],
  }),
}));

export const medicationsRelations = relations(medications, ({ one }) => ({
  client: one(clients, {
    fields: [medications.clientId],
    references: [clients.id],
  }),
}));

export const communicationLogsRelations = relations(communicationLogs, ({ one }) => ({
  client: one(clients, {
    fields: [communicationLogs.clientId],
    references: [clients.id],
  }),
  therapist: one(users, {
    fields: [communicationLogs.therapistId],
    references: [users.id],
  }),
}));

export const documentsRelations = relations(documents, ({ one }) => ({
  client: one(clients, {
    fields: [documents.clientId],
    references: [clients.id],
  }),
  therapist: one(users, {
    fields: [documents.therapistId],
    references: [users.id],
  }),
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  user: one(users, {
    fields: [auditLogs.userId],
    references: [users.id],
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  fullName: true,
  role: true,
  email: true,
});

export const insertClientSchema = createInsertSchema(clients).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAppointmentSchema = createInsertSchema(appointments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSessionNoteSchema = createInsertSchema(sessionNotes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSessionPrepNoteSchema = createInsertSchema(sessionPrepNotes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertClientCheckinSchema = createInsertSchema(clientCheckins).omit({
  id: true,
  generatedAt: true,
  createdAt: true,
  updatedAt: true,
});

export const insertActionItemSchema = createInsertSchema(actionItems).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTreatmentPlanSchema = createInsertSchema(treatmentPlans).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAiInsightSchema = createInsertSchema(aiInsights).omit({
  id: true,
  createdAt: true,
});

// New table insert schemas
export const insertBillingRecordSchema = createInsertSchema(billingRecords).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAssessmentSchema = createInsertSchema(assessments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertProgressNoteSchema = createInsertSchema(progressNotes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMedicationSchema = createInsertSchema(medications).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCommunicationLogSchema = createInsertSchema(communicationLogs).omit({
  id: true,
  createdAt: true,
});

export const insertDocumentSchema = createInsertSchema(documents).omit({
  id: true,
  uploadedAt: true,
  lastAccessedAt: true,
});

export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({
  id: true,
  timestamp: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Client = typeof clients.$inferSelect;
export type InsertClient = z.infer<typeof insertClientSchema>;
export type Appointment = typeof appointments.$inferSelect;
export type InsertAppointment = z.infer<typeof insertAppointmentSchema>;
export type SessionNote = typeof sessionNotes.$inferSelect;
export type InsertSessionNote = z.infer<typeof insertSessionNoteSchema>;
export type SessionPrepNote = typeof sessionPrepNotes.$inferSelect;
export type InsertSessionPrepNote = z.infer<typeof insertSessionPrepNoteSchema>;
export type ClientCheckin = typeof clientCheckins.$inferSelect;
export type InsertClientCheckin = z.infer<typeof insertClientCheckinSchema>;
export type ActionItem = typeof actionItems.$inferSelect;
export type InsertActionItem = z.infer<typeof insertActionItemSchema>;
export type TreatmentPlan = typeof treatmentPlans.$inferSelect;
export type InsertTreatmentPlan = z.infer<typeof insertTreatmentPlanSchema>;
export type AiInsight = typeof aiInsights.$inferSelect;
export type InsertAiInsight = z.infer<typeof insertAiInsightSchema>;

// New table types
export type BillingRecord = typeof billingRecords.$inferSelect;
export type InsertBillingRecord = z.infer<typeof insertBillingRecordSchema>;
export type Assessment = typeof assessments.$inferSelect;
export type InsertAssessment = z.infer<typeof insertAssessmentSchema>;
export type ProgressNote = typeof progressNotes.$inferSelect;
export type InsertProgressNote = z.infer<typeof insertProgressNoteSchema>;
export type Medication = typeof medications.$inferSelect;
export type InsertMedication = z.infer<typeof insertMedicationSchema>;
export type CommunicationLog = typeof communicationLogs.$inferSelect;
export type InsertCommunicationLog = z.infer<typeof insertCommunicationLogSchema>;
export type Document = typeof documents.$inferSelect;
export type InsertDocument = z.infer<typeof insertDocumentSchema>;
export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
