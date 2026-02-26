import { useTranslation } from "react-i18next";
import type { DashboardWidgetDefinition } from "./types";

interface DashboardWidgetCardProps {
  widget: DashboardWidgetDefinition;
}

const DashboardWidgetCard = ({ widget }: DashboardWidgetCardProps) => {
  const { t } = useTranslation();
  const title = t(widget.titleKey, { defaultValue: widget.titleKey });
  const description = widget.descriptionKey
    ? t(widget.descriptionKey, { defaultValue: widget.descriptionKey })
    : null;

  return (
    <article
      className="rounded-xl border border-slate-700 bg-slate-800/60 p-4 focus-within:ring-2 focus-within:ring-emerald-500"
      aria-label={title}
      tabIndex={0}
    >
      <header className="mb-3">
        <h3 className="text-sm font-semibold text-white">{title}</h3>
        {description && <p className="mt-1 text-xs text-slate-400">{description}</p>}
      </header>
      <div>{widget.render()}</div>
    </article>
  );
};

export default DashboardWidgetCard;

