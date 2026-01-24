/**
 * TypeScript типы для MES Kryptonit
 */

// User / Auth
export interface User {
  id: number
  login: string
  name: string
  surname: string
  role: string
  abilities: string[]
  teamId?: number
  sectionId?: number
  team?: Team
  section?: Section
  img?: string | null
}

export interface Team {
  id: number
  title: string
  leaderId?: number
}

export interface Section {
  id: number
  title: string
}

// Warehouse
export interface InventoryBox {
  id: number
  qrCode: string
  label: string
  partNumber?: string
  quantity: number
  unit: string
  status: string
  minQuantity?: number
  sectionId?: number
  section?: Section
  createdAt: string
  updatedAt: string
}

export interface WarehouseMovement {
  id: number
  boxId: number
  userId: number
  type: 'IN' | 'OUT' | 'TRANSFER' | 'ADJUSTMENT'
  quantity: number
  reason?: string
  createdAt: string
  user?: User
  box?: InventoryBox
}

// Production
export interface Product {
  id: number
  serialNumber: string
  productTypeId: number
  productType?: ProductType
  status: string
  currentStepId?: number
  currentStep?: ProductionStep
  assignedUserId?: number
  assignedUser?: User
  createdAt: string
  updatedAt: string
}

export interface ProductType {
  id: number
  code: string
  name: string
  description?: string
  steps?: ProductionStep[]
}

export interface ProductionStep {
  id: number
  productTypeId: number
  title: string
  description?: string
  order: number
  checklistItems?: ChecklistItem[]
}

export interface ChecklistItem {
  id: number
  stepId: number
  title: string
  type: 'checkbox' | 'text' | 'number' | 'select' | 'photo' | 'serial'
  required: boolean
  options?: string[]
  order: number
}

export interface ChecklistResponse {
  id: number
  productId: number
  stepId: number
  itemId: number
  value: string
  userId: number
  createdAt: string
}

// Tasks
export interface Task {
  id: number
  title: string
  description?: string
  status: string
  priority: number
  projectId?: number
  project?: Project
  assigneeId?: number
  assignee?: User
  creatorId: number
  creator?: User
  dueDate?: string
  completedAt?: string
  createdAt: string
  updatedAt: string
}

export interface Project {
  id: number
  title: string
  description?: string
  status: string
}

// Rankings / Statistics
export interface UserRanking {
  userId: number
  user: User
  rank: number
  score: number
  operations: number
  trend: number
}

export interface TeamRanking {
  teamId: number
  team: Team
  rank: number
  score: number
  operations: number
  memberCount: number
}

export interface UserStats {
  totalOperations: number
  todayOperations: number
  weekOperations: number
  monthOperations: number
  avgPerDay: number
  rank: number
  totalUsers: number
}

// API Responses
export interface PaginatedResponse<T> {
  rows: T[]
  count: number
  page?: number
  limit?: number
}

export interface ApiError {
  message: string
  error?: string
  statusCode?: number
}

// Scan Result
export interface ScanResult {
  product: Product
  currentStep?: ProductionStep
  nextStep?: ProductionStep
  canProceed: boolean
  message?: string
}
