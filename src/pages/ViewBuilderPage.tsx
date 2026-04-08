import { useMemo } from "react";
import { Navigate, useParams } from "react-router-dom";
import { ViewBuilder } from "@/features/views/components/ViewBuilder";
import { BaseEntity } from "@/features/views/types/viewBuilder";

const entities: BaseEntity[] = [
  "opportunities", "accounts", "contacts",
  "leads", "quotes", "contracts", "invoices",
  "measures", "buildings", "activities", "connections", "commission_splits",
];

export default function ViewBuilderPage() {
  const { entity } = useParams();

  const normalizedEntity = useMemo(() => {
    if (!entity) return null;
    return entities.includes(entity as BaseEntity) ? (entity as BaseEntity) : null;
  }, [entity]);

  if (!normalizedEntity) {
    return <Navigate to="/views/opportunities" replace />;
  }

  return <ViewBuilder entity={normalizedEntity} />;
}
