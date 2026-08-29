export type UserRole = "SUPER_ADMIN" | "DIRECTOR" | "AGENT"
export type MemberStatus = "active" | "inactive" | "deleted"
export type CounselingStatus = "VISITED" | "NOT_HOME" | "PHONE_CONTACT" | "RESCHEDULED" | "REFUSED" | "NOT_CONTACTED"
export type PollingStatus = "PENDING" | "VOTED" | "NOT_VOTED" | "UNKNOWN"
export type PredictionStatus = "WILL_VOTE_US" | "WILL_VOTE_OTHER" | "UNDECIDED" | "WILL_NOT_VOTE" | "UNKNOWN"
export type ActivityType =
  | "CALL_CLICKED"
  | "WHATSAPP_CLICKED"
  | "MAP_CLICKED"
  | "MEMBER_VIEWED"
  | "COUNSELING_UPDATED"
  | "PREDICTION_UPDATED"
  | "POLLING_UPDATED"
  | "PHOTO_UPLOADED"
  | "LOGIN"
  | "LOGOUT"
export type AuditAction =
  | "LOGIN"
  | "LOGOUT"
  | "CREATE"
  | "UPDATE"
  | "DELETE"
  | "IMPORT"
  | "EXPORT"
  | "ASSIGN"
  | "REASSIGN"
  | "PERMISSION_CHANGE"
  | "SETTINGS_CHANGE"
  | "PHOTO_UPLOAD"
  | "COUNSELING_UPDATE"
  | "PREDICTION_UPDATE"
  | "POLLING_UPDATE"
  | "DISABLE_USER"
  | "ENABLE_USER"
export type ImportStatus = "pending" | "processing" | "completed" | "failed"
export type ElectionStatus = "draft" | "upcoming" | "active" | "completed"

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile
        Insert: Omit<Profile, "created_at" | "updated_at">
        Update: Partial<Omit<Profile, "id" | "created_at">>
      }
      branches: {
        Row: Branch
        Insert: Omit<Branch, "id" | "created_at" | "updated_at">
        Update: Partial<Omit<Branch, "id" | "created_at">>
      }
      members: {
        Row: Member
        Insert: Omit<Member, "id" | "created_at" | "updated_at">
        Update: Partial<Omit<Member, "id" | "created_at">>
      }
      directors: {
        Row: Director
        Insert: Omit<Director, "id" | "created_at" | "updated_at">
        Update: Partial<Omit<Director, "id" | "created_at">>
      }
      agents: {
        Row: Agent
        Insert: Omit<Agent, "id" | "created_at" | "updated_at">
        Update: Partial<Omit<Agent, "id" | "created_at">>
      }
      director_member_assignments: {
        Row: DirectorMemberAssignment
        Insert: Omit<DirectorMemberAssignment, "id" | "created_at">
        Update: Partial<Omit<DirectorMemberAssignment, "id" | "created_at">>
      }
      agent_member_assignments: {
        Row: AgentMemberAssignment
        Insert: Omit<AgentMemberAssignment, "id" | "created_at">
        Update: Partial<Omit<AgentMemberAssignment, "id" | "created_at">>
      }
      elections: {
        Row: Election
        Insert: Omit<Election, "id" | "created_at" | "updated_at">
        Update: Partial<Omit<Election, "id" | "created_at">>
      }
      panels: {
        Row: Panel
        Insert: Omit<Panel, "id" | "created_at" | "updated_at">
        Update: Partial<Omit<Panel, "id" | "created_at">>
      }
      candidates: {
        Row: Candidate
        Insert: Omit<Candidate, "id" | "created_at" | "updated_at">
        Update: Partial<Omit<Candidate, "id" | "created_at">>
      }
      counseling_visits: {
        Row: CounselingVisit
        Insert: Omit<CounselingVisit, "id" | "created_at" | "updated_at">
        Update: Partial<Omit<CounselingVisit, "id" | "created_at">>
      }
      counseling_media: {
        Row: CounselingMedia
        Insert: Omit<CounselingMedia, "id" | "created_at">
        Update: Partial<Omit<CounselingMedia, "id" | "created_at">>
      }
      predictions: {
        Row: Prediction
        Insert: Omit<Prediction, "id" | "created_at" | "updated_at">
        Update: Partial<Omit<Prediction, "id" | "created_at">>
      }
      polling_records: {
        Row: PollingRecord
        Insert: Omit<PollingRecord, "id" | "created_at" | "updated_at">
        Update: Partial<Omit<PollingRecord, "id" | "created_at">>
      }
      agent_activity_logs: {
        Row: AgentActivityLog
        Insert: Omit<AgentActivityLog, "id" | "created_at">
        Update: never
      }
      audit_logs: {
        Row: AuditLog
        Insert: Omit<AuditLog, "id" | "created_at">
        Update: never
      }
      import_batches: {
        Row: ImportBatch
        Insert: Omit<ImportBatch, "id" | "created_at" | "updated_at">
        Update: Partial<Omit<ImportBatch, "id" | "created_at">>
      }
      import_errors: {
        Row: ImportError
        Insert: Omit<ImportError, "id" | "created_at">
        Update: never
      }
      permissions: {
        Row: Permission
        Insert: Omit<Permission, "id" | "created_at" | "updated_at">
        Update: Partial<Omit<Permission, "id" | "created_at">>
      }
      user_permissions: {
        Row: UserPermission
        Insert: Omit<UserPermission, "id" | "created_at" | "updated_at">
        Update: Partial<Omit<UserPermission, "id" | "created_at">>
      }
      user_branch_access: {
        Row: UserBranchAccess
        Insert: Omit<UserBranchAccess, "id" | "created_at">
        Update: never
      }
      system_settings: {
        Row: SystemSetting
        Insert: Omit<SystemSetting, "id" | "created_at" | "updated_at">
        Update: Partial<Omit<SystemSetting, "id" | "created_at">>
      }
      assignment_history: {
        Row: AssignmentHistory
        Insert: Omit<AssignmentHistory, "id" | "created_at">
        Update: never
      }
    }
    Views: Record<string, never>
    Functions: {
      assign_member_to_agent: {
        Args: {
          p_member_id: string
          p_agent_id: string
          p_director_id?: string | null
          p_assigned_by?: string
          p_reason?: string | null
        }
        Returns: { success: boolean; error?: string; assignment_id?: string }
      }
      get_user_permission: {
        Args: { p_user_id: string; p_permission_key: string }
        Returns: boolean
      }
    }
    Enums: Record<string, never>
  }
}

export interface Profile {
  id: string
  login_id: string
  full_name: string
  email: string | null
  role: UserRole
  is_active: boolean
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface Branch {
  id: string
  branch_name: string
  branch_code: string
  status: "active" | "inactive"
  created_at: string
  updated_at: string
}

export interface Member {
  id: string
  member_id: string
  full_name: string
  age: number | null
  gender: string | null
  address: string | null
  mobile_number: string | null
  branch_id: string | null
  branch_name: string | null
  status: MemberStatus
  extra_data: Record<string, unknown> | null
  created_at: string
  updated_at: string
}

export interface Director {
  id: string
  profile_id: string
  director_code: string
  all_branches_access: boolean
  notes: string | null
  created_at: string
  updated_at: string
}

export interface Agent {
  id: string
  profile_id: string
  agent_code: string
  director_id: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface DirectorMemberAssignment {
  id: string
  director_id: string
  member_id: string
  assigned_by: string
  is_active: boolean
  assigned_at: string
  created_at: string
}

export interface AgentMemberAssignment {
  id: string
  agent_id: string
  member_id: string
  director_id: string | null
  assigned_by: string
  is_active: boolean
  assigned_at: string
  created_at: string
}

export interface AssignmentHistory {
  id: string
  member_id: string
  previous_director_id: string | null
  new_director_id: string | null
  previous_agent_id: string | null
  new_agent_id: string | null
  changed_by: string
  reason: string | null
  created_at: string
}

export interface Election {
  id: string
  election_name: string
  election_date: string
  election_time: string
  timezone: string
  num_seats: number
  status: ElectionStatus
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Panel {
  id: string
  election_id: string
  panel_name: string
  panel_color: string | null
  description: string | null
  sort_order: number
  created_at: string
  updated_at: string
}

export interface Candidate {
  id: string
  panel_id: string
  election_id: string
  candidate_name: string
  position: string | null
  photo_url: string | null
  sort_order: number
  created_at: string
  updated_at: string
}

export interface CounselingVisit {
  id: string
  agent_id: string
  member_id: string
  status: CounselingStatus
  contact_method: string | null
  visit_date: string | null
  feedback: string | null
  notes: string | null
  follow_up_date: string | null
  field_assessment: string | null
  created_at: string
  updated_at: string
}

export interface CounselingMedia {
  id: string
  counseling_visit_id: string
  agent_id: string
  member_id: string
  storage_path: string
  filename: string
  file_size: number | null
  mime_type: string | null
  created_at: string
}

export interface Prediction {
  id: string
  agent_id: string
  member_id: string
  prediction: PredictionStatus
  panel_preference: string | null
  confidence_level: number | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface PollingRecord {
  id: string
  agent_id: string
  member_id: string
  polling_status: PollingStatus
  contact_status: string | null
  field_observation: string | null
  notes: string | null
  updated_at: string
  created_at: string
}

export interface AgentActivityLog {
  id: string
  agent_id: string
  member_id: string | null
  activity_type: ActivityType
  metadata: Record<string, unknown> | null
  created_at: string
}

export interface AuditLog {
  id: string
  user_id: string | null
  user_login_id: string | null
  action: AuditAction
  entity_type: string | null
  entity_id: string | null
  old_data: Record<string, unknown> | null
  new_data: Record<string, unknown> | null
  ip_address: string | null
  user_agent: string | null
  created_at: string
}

export interface ImportBatch {
  id: string
  uploaded_by: string
  filename: string
  file_type: string
  total_rows: number
  successful_rows: number
  failed_rows: number
  skipped_rows: number
  status: ImportStatus
  import_mode: "insert" | "upsert"
  created_at: string
  updated_at: string
}

export interface ImportError {
  id: string
  batch_id: string
  row_number: number
  source_value: string | null
  error_type: string
  error_message: string
  suggested_action: string | null
  created_at: string
}

export interface Permission {
  id: string
  permission_key: string
  description: string
  applies_to: UserRole
  default_value: boolean
  created_at: string
  updated_at: string
}

export interface UserPermission {
  id: string
  user_id: string
  permission_key: string
  value: boolean
  created_at: string
  updated_at: string
}

export interface UserBranchAccess {
  id: string
  user_id: string
  branch_id: string
  created_at: string
}

export interface SystemSetting {
  id: string
  setting_key: string
  setting_value: string
  description: string | null
  created_at: string
  updated_at: string
}

// Extended types with joins
export interface MemberWithBranch extends Member {
  branches?: Branch | null
}

export interface AgentWithProfile extends Agent {
  profiles?: Profile | null
  directors?: Director | null
}

export interface DirectorWithProfile extends Director {
  profiles?: Profile | null
}

export interface CounselingVisitWithMember extends CounselingVisit {
  members?: Member | null
}

export interface AgentMemberAssignmentWithMember extends AgentMemberAssignment {
  members?: Member | null
}
