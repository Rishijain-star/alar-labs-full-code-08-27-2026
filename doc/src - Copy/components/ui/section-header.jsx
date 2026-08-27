// src/components/ui/SectionHeader.jsx
export function SectionHeader({ icon: Icon, title, subtitle }) {
    return (
        <div className="flex items-start gap-3 mb-5 pb-4 border-b border-border">
            <div className="mt-0.5 p-1.5 rounded-md bg-primary/10 text-primary flex-shrink-0">
                <Icon className="w-4 h-4" />
            </div>
            <div>
                <p className="font-semibold text-sm">{title}</p>
                {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
            </div>
        </div>
    );
}

export default SectionHeader;