import * as React from "react"
import { cn } from "../../lib/utils"
import { Button } from "./button"
import { StatusBadge } from "./status-badge"
import type { StatusType } from "./status-badge"
import { Spinner } from "./spinner"

export interface CredentialField {
  /** Field label */
  label: string
  /** Masked or displayed value */
  value: string
}

export interface CredentialRowProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Title of the credential */
  title: string
  /** Description (optional) */
  description?: string
  /** Connection status */
  status: StatusType
  /** Status text to display */
  statusText?: string
  /** Additional info to show below status (e.g., username) */
  statusDetail?: string
  /** Masked credential values to display */
  fields?: CredentialField[]
  /** Whether actions are loading */
  loading?: boolean
  /** Test button handler */
  onTest?: () => void
  /** Edit/Configure button handler */
  onEdit?: () => void
  /** Whether test is available */
  canTest?: boolean
  /** Custom test button label */
  testLabel?: string
  /** Custom edit button label */
  editLabel?: string
  /** Whether the credential is configured */
  isConfigured?: boolean
}

const CredentialRow = React.forwardRef<HTMLDivElement, CredentialRowProps>(
  (
    {
      className,
      title,
      description,
      status,
      statusText,
      statusDetail,
      fields,
      loading = false,
      onTest,
      onEdit,
      canTest = true,
      testLabel = "Test",
      editLabel,
      isConfigured = false,
      ...props
    },
    ref
  ) => {
    const getStatusText = () => {
      if (statusText) return statusText
      switch (status) {
        case "connected":
        case "success":
          return "Connected"
        case "error":
          return "Error"
        case "testing":
          return "Testing..."
        case "disconnected":
        default:
          return "Not configured"
      }
    }

    const computedEditLabel = editLabel || (isConfigured ? "Edit" : "Configure")

    return (
      <div
        ref={ref}
        className={cn(
          "credential-row flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4",
          "border-b border-border last:border-b-0",
          className
        )}
        {...props}
      >
        <div className="credential-row__info flex-1 min-w-0">
          <h4 className="font-medium text-foreground">{title}</h4>
          {description && (
            <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
          )}

          {/* Credential fields */}
          {fields && fields.length > 0 && (
            <div className="credential-row__fields flex flex-wrap gap-x-4 gap-y-1 mt-2">
              {fields.map((field, index) => (
                <span key={index} className="text-sm">
                  <span className="text-muted-foreground">{field.label}:</span>{" "}
                  <span className="font-mono text-foreground/80">{field.value}</span>
                </span>
              ))}
            </div>
          )}

          {/* Status */}
          <div className="credential-row__status flex items-center gap-2 mt-2">
            <StatusBadge
              status={status}
              pulse={status === "testing" || status === "running"}
            >
              {getStatusText()}
            </StatusBadge>
            {statusDetail && (
              <span className="text-sm text-muted-foreground">{statusDetail}</span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="credential-row__actions flex items-center gap-2 shrink-0">
          {onTest && (
            <Button
              variant="secondary"
              size="sm"
              onClick={onTest}
              disabled={!canTest || loading || status === "testing"}
            >
              {status === "testing" ? (
                <>
                  <Spinner size="sm" className="mr-1" />
                  Testing...
                </>
              ) : (
                testLabel
              )}
            </Button>
          )}
          {onEdit && (
            <Button
              variant="secondary"
              size="sm"
              onClick={onEdit}
              disabled={loading}
            >
              {computedEditLabel}
            </Button>
          )}
        </div>
      </div>
    )
  }
)
CredentialRow.displayName = "CredentialRow"

export { CredentialRow }
