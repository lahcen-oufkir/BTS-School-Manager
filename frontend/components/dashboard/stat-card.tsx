import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: string;
  trend?: string;
  trendType?: "up" | "down" | "neutral";
}

const trendStyles: Record<string, string> = {
  up: "success",
  down: "danger",
  neutral: "default",
};

export function StatCard({ label, value, trend, trendType = "neutral" }: StatCardProps) {
  return (
    <Card>
      <CardContent>
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-slate-500">{label}</p>
        </div>
        <div className="mt-2 flex items-end justify-between">
          <p className="text-2xl font-bold text-slate-900">{value}</p>
          {trend && <Badge variant={trendStyles[trendType] as "success"}>{trend}</Badge>}
        </div>
      </CardContent>
    </Card>
  );
}