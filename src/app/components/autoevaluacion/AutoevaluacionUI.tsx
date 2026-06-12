import { CheckCircle2, Clock3, AlertTriangle } from "lucide-react";
import { motion } from "motion/react";
import { Badge } from "../ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { cn } from "../ui/utils";

export function getEstadoVisual(estadoRaw: string) {
  const estado = estadoRaw.trim().toLowerCase();

  if (estado === "completada") {
    return {
      label: "Completada",
      emoji: "🟢",
      className: "bg-emerald-50 text-emerald-700 border-emerald-200",
      icon: CheckCircle2,
    };
  }

  if (estado === "vencida") {
    return {
      label: "Vencida",
      emoji: "🔴",
      className: "bg-rose-50 text-rose-700 border-rose-200",
      icon: AlertTriangle,
    };
  }

  return {
    label: "Pendiente",
    emoji: "🟡",
    className: "bg-amber-50 text-amber-700 border-amber-200",
    icon: Clock3,
  };
}

export function EstadoBadge({ estado }: { estado: string }) {
  const visual = getEstadoVisual(estado);
  return (
    <Badge className={cn("border font-medium", visual.className)}>
      {visual.label}
    </Badge>
  );
}

export function ModuloHero({ title, description }: { title: string; description: string }) {
  return (
    <Card className="border-slate-200 shadow-sm bg-gradient-to-br from-white via-slate-50 to-teal-50/40">
      <CardHeader>
        <CardTitle className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">{title}</CardTitle>
        <CardDescription className="text-sm sm:text-base text-slate-600">{description}</CardDescription>
      </CardHeader>
    </Card>
  );
}

export function StatCard({
  title,
  value,
  tone = "default",
}: {
  title: string;
  value: string | number;
  tone?: "default" | "success" | "warning" | "danger";
}) {
  const toneClass = {
    default: "text-slate-900",
    success: "text-emerald-700",
    warning: "text-amber-700",
    danger: "text-rose-700",
  }[tone];

  return (
    <Card className="border-slate-200 shadow-sm hover:shadow-md transition-shadow duration-200">
      <CardContent className="pt-6">
        <p className="text-xs uppercase tracking-wide text-slate-500">{title}</p>
        <p className={cn("text-2xl font-bold mt-1", toneClass)}>{value}</p>
      </CardContent>
    </Card>
  );
}

export function ProgressPanel({
  title,
  subtitle,
  value,
  helper,
}: {
  title: string;
  subtitle: string;
  value: number;
  helper: string;
}) {
  const safe = Math.max(0, Math.min(100, value));

  return (
    <Card className="border-teal-100 bg-teal-50/50 shadow-sm">
      <CardContent className="pt-5 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <p className="font-semibold text-slate-900">{title}</p>
            <p className="text-xs text-slate-600">{subtitle}</p>
          </div>
          <Badge className="bg-white text-teal-700 border-teal-200">{Math.round(safe)}%</Badge>
        </div>
        <div className="h-2.5 rounded-full bg-teal-100 overflow-hidden" aria-label={`Progreso ${Math.round(safe)} por ciento`} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(safe)}>
          <motion.div
            className="h-full bg-teal-600"
            animate={{ width: `${safe}%` }}
            transition={{ type: "spring", stiffness: 120, damping: 20 }}
          />
        </div>
        <p className="text-xs text-slate-600">{helper}</p>
      </CardContent>
    </Card>
  );
}

export function BlockHeader({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3">
      <h4 className="text-sm sm:text-base font-semibold text-slate-900">{title}</h4>
      <p className="text-xs sm:text-sm text-slate-600 mt-1">{description}</p>
    </div>
  );
}
