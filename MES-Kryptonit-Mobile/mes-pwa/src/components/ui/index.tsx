/**
 * UI компоненты MES Kryptonit
 */

import { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, forwardRef } from 'react'

// =============================================================================
// Button
// =============================================================================

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'outline' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  icon?: ReactNode
  fullWidth?: boolean
}

export const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  fullWidth = false,
  className = '',
  disabled,
  ...props
}: ButtonProps) => {
  const base = 'inline-flex items-center justify-center font-medium rounded-xl transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]'
  
  const variants = {
    primary: 'bg-primary hover:bg-primary-dark text-white shadow-lg shadow-primary/25',
    secondary: 'bg-slate-600 hover:bg-slate-500 text-white',
    danger: 'bg-danger hover:bg-red-600 text-white',
    success: 'bg-success hover:bg-emerald-600 text-white',
    outline: 'border-2 border-primary text-primary hover:bg-primary/10',
    ghost: 'text-slate-400 hover:bg-surface-light hover:text-white',
  }
  
  const sizes = {
    sm: 'px-3 py-1.5 text-sm gap-1.5',
    md: 'px-4 py-2.5 text-sm gap-2',
    lg: 'px-6 py-3 text-base gap-2',
  }
  
  return (
    <button
      className={`${base} ${variants[variant]} ${sizes[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : icon ? (
        <span className="shrink-0">{icon}</span>
      ) : null}
      {children}
    </button>
  )
}

// =============================================================================
// Card
// =============================================================================

interface CardProps {
  children: ReactNode
  className?: string
  onClick?: () => void
  hover?: boolean
  padding?: 'none' | 'sm' | 'md' | 'lg'
}

export const Card = ({ 
  children, 
  className = '', 
  onClick, 
  hover = false,
  padding = 'none'
}: CardProps) => {
  const base = 'bg-surface border border-slate-700/50 rounded-2xl'
  const hoverStyles = hover || onClick ? 'cursor-pointer hover:border-slate-600 hover:bg-surface-light/30 transition-all' : ''
  const paddings = {
    none: '',
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6',
  }
  
  return (
    <div 
      className={`${base} ${hoverStyles} ${paddings[padding]} ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  )
}

// =============================================================================
// Badge
// =============================================================================

interface BadgeProps {
  children: ReactNode
  variant?: 'primary' | 'success' | 'warning' | 'danger' | 'neutral'
  size?: 'sm' | 'md'
  dot?: boolean
}

export const Badge = ({ children, variant = 'primary', size = 'md', dot = false }: BadgeProps) => {
  const variants = {
    primary: 'bg-primary/20 text-primary',
    success: 'bg-success/20 text-success',
    warning: 'bg-warning/20 text-warning',
    danger: 'bg-danger/20 text-danger',
    neutral: 'bg-slate-600/50 text-slate-400',
  }
  
  const sizes = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-xs',
  }

  const dotColors = {
    primary: 'bg-primary',
    success: 'bg-success',
    warning: 'bg-warning',
    danger: 'bg-danger',
    neutral: 'bg-slate-500',
  }
  
  return (
    <span className={`inline-flex items-center gap-1.5 font-medium rounded-lg ${variants[variant]} ${sizes[size]}`}>
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${dotColors[variant]}`} />}
      {children}
    </span>
  )
}

// =============================================================================
// Input
// =============================================================================

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  icon?: ReactNode
  rightIcon?: ReactNode
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, icon, rightIcon, className = '', ...props }, ref) => {
    return (
      <div className="space-y-1.5">
        {label && (
          <label className="block text-sm font-medium text-slate-300">
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            className={`
              w-full bg-surface-light border border-slate-600 rounded-xl
              px-4 py-2.5 text-white placeholder-slate-500
              focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none
              transition-all duration-150
              ${icon ? 'pl-10' : ''}
              ${rightIcon ? 'pr-10' : ''}
              ${error ? 'border-danger focus:border-danger focus:ring-danger/20' : ''}
              ${className}
            `}
            {...props}
          />
          {rightIcon && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500">
              {rightIcon}
            </div>
          )}
        </div>
        {error && <p className="text-sm text-danger">{error}</p>}
      </div>
    )
  }
)

Input.displayName = 'Input'

// =============================================================================
// Skeleton
// =============================================================================

export const Skeleton = ({ className = '' }: { className?: string }) => (
  <div className={`bg-surface-light rounded-lg animate-pulse ${className}`} />
)

// =============================================================================
// Loader
// =============================================================================

interface LoaderProps {
  size?: 'sm' | 'md' | 'lg'
  text?: string
  fullScreen?: boolean
}

export const Loader = ({ size = 'md', text, fullScreen = false }: LoaderProps) => {
  const sizes = {
    sm: 'w-4 h-4 border-2',
    md: 'w-8 h-8 border-2',
    lg: 'w-12 h-12 border-3',
  }
  
  const content = (
    <div className="flex flex-col items-center justify-center gap-3">
      <div className={`${sizes[size]} border-primary border-t-transparent rounded-full animate-spin`} />
      {text && <p className="text-slate-400 text-sm">{text}</p>}
    </div>
  )

  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-background flex items-center justify-center z-50">
        {content}
      </div>
    )
  }

  return content
}

// =============================================================================
// Empty State
// =============================================================================

interface EmptyStateProps {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
}

export const EmptyState = ({ icon, title, description, action }: EmptyStateProps) => (
  <div className="flex flex-col items-center justify-center py-12 text-center">
    {icon && <div className="text-slate-600 mb-4">{icon}</div>}
    <h3 className="text-lg font-medium text-slate-300 mb-2">{title}</h3>
    {description && <p className="text-slate-500 mb-4 max-w-sm">{description}</p>}
    {action}
  </div>
)

// =============================================================================
// Stats Card
// =============================================================================

interface StatsCardProps {
  title: string
  value: string | number
  icon?: ReactNode
  trend?: { value: number; label?: string }
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger'
}

export const StatsCard = ({ title, value, icon, trend, variant = 'default' }: StatsCardProps) => {
  const iconBg = {
    default: 'bg-slate-600/50',
    primary: 'bg-primary/20',
    success: 'bg-success/20',
    warning: 'bg-warning/20',
    danger: 'bg-danger/20',
  }

  const iconColor = {
    default: 'text-slate-400',
    primary: 'text-primary',
    success: 'text-success',
    warning: 'text-warning',
    danger: 'text-danger',
  }

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-sm text-slate-400 mb-1 truncate">{title}</p>
          <p className="text-2xl font-bold truncate">{value}</p>
          {trend && (
            <p className={`text-sm mt-1 ${trend.value >= 0 ? 'text-success' : 'text-danger'}`}>
              {trend.value >= 0 ? '↑' : '↓'} {Math.abs(trend.value)}%
              {trend.label && <span className="text-slate-500 ml-1">{trend.label}</span>}
            </p>
          )}
        </div>
        {icon && (
          <div className={`p-3 rounded-xl ${iconBg[variant]} shrink-0 ml-3`}>
            <div className={iconColor[variant]}>{icon}</div>
          </div>
        )}
      </div>
    </Card>
  )
}

// =============================================================================
// Modal
// =============================================================================

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  size?: 'sm' | 'md' | 'lg'
}

export const Modal = ({ isOpen, onClose, title, children, size = 'md' }: ModalProps) => {
  if (!isOpen) return null

  const sizes = {
    sm: 'max-w-sm',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative bg-surface rounded-2xl w-full ${sizes[size]} shadow-2xl animate-slideUp`}>
        {title && (
          <div className="px-6 py-4 border-b border-slate-700">
            <h2 className="text-lg font-semibold">{title}</h2>
          </div>
        )}
        <div className="p-6">{children}</div>
      </div>
    </div>
  )
}

// =============================================================================
// Tabs
// =============================================================================

interface Tab {
  key: string
  label: string
  icon?: ReactNode
}

interface TabsProps {
  tabs: Tab[]
  activeTab: string
  onChange: (key: string) => void
}

export const Tabs = ({ tabs, activeTab, onChange }: TabsProps) => {
  return (
    <div className="flex gap-1 p-1 bg-surface-light rounded-xl overflow-x-auto">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onChange(tab.key)}
          className={`
            flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg
            text-sm font-medium transition-all duration-150 whitespace-nowrap
            ${activeTab === tab.key 
              ? 'bg-primary text-white shadow-lg' 
              : 'text-slate-400 hover:text-white hover:bg-surface'
            }
          `}
        >
          {tab.icon}
          {tab.label}
        </button>
      ))}
    </div>
  )
}

// =============================================================================
// Progress
// =============================================================================

interface ProgressProps {
  value: number
  max?: number
  size?: 'sm' | 'md'
  variant?: 'primary' | 'success' | 'warning' | 'danger'
  showLabel?: boolean
}

export const Progress = ({ 
  value, 
  max = 100, 
  size = 'md', 
  variant = 'primary',
  showLabel = false 
}: ProgressProps) => {
  const percent = Math.min(100, Math.max(0, (value / max) * 100))
  
  const heights = { sm: 'h-1.5', md: 'h-2.5' }
  const colors = {
    primary: 'bg-primary',
    success: 'bg-success',
    warning: 'bg-warning',
    danger: 'bg-danger',
  }

  return (
    <div className="space-y-1">
      <div className={`w-full bg-surface-light rounded-full overflow-hidden ${heights[size]}`}>
        <div 
          className={`${heights[size]} ${colors[variant]} rounded-full transition-all duration-300`}
          style={{ width: `${percent}%` }}
        />
      </div>
      {showLabel && (
        <div className="flex justify-between text-xs text-slate-500">
          <span>{value} / {max}</span>
          <span>{Math.round(percent)}%</span>
        </div>
      )}
    </div>
  )
}
