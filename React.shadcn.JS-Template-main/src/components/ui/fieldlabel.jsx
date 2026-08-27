// src/components/ui/FieldLabel.jsx
export function FieldLabel({ children, required, hint, className }) {
    return (
        <div className={`mb-1.5 ${className || ""}`}>
            <label className="text-sm font-medium text-foreground">
                {children}
                {required && <span className="text-destructive ml-0.5">*</span>}
            </label>
            {hint && <p className="text-xs text-muted-foreground mt-0.5">{hint}</p>}
        </div>
    );
}

export default FieldLabel;