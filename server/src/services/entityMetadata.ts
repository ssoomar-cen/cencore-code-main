import { BaseEntity } from "../types/view.js";

export type FieldType = "string" | "number" | "date" | "boolean";

export interface FieldDef {
  path: string;
  label: string;
  type: FieldType;
  sql: string;
  roles?: Array<"ADMIN" | "MANAGER" | "VIEWER">;
}

export interface RelationDef {
  name: string;
  toEntity: EntityKey;
  joinType: "left" | "inner";
  on: string;
  cardinality: "one" | "many";
}

export interface EntityDef {
  key: EntityKey;
  table: string;
  alias: string;
  idColumn: string;
  fields: FieldDef[];
  relations: RelationDef[];
}

export type EntityKey = BaseEntity | "users" | "opportunity_products";

const roleAll = ["ADMIN", "MANAGER", "VIEWER"] as const;

export const ENTITY_DEFS: Record<EntityKey, EntityDef> = {
  opportunities: {
    key: "opportunities",
    table: "opportunities",
    alias: "o",
    idColumn: "id",
    fields: [
      { path: "id", label: "ID", type: "string", sql: "o.id", roles: [...roleAll] },
      { path: "name", label: "Opportunity", type: "string", sql: "o.name", roles: [...roleAll] },
      { path: "stage", label: "Stage", type: "string", sql: "o.stage", roles: [...roleAll] },
      { path: "amount", label: "Amount", type: "number", sql: "o.amount", roles: [...roleAll] },
      { path: "probability", label: "Probability", type: "number", sql: "o.probability", roles: [...roleAll] },
      { path: "close_date", label: "Close Date", type: "date", sql: "o.close_date", roles: [...roleAll] },
      { path: "created_at", label: "Created", type: "date", sql: "o.created_at", roles: [...roleAll] },
      { path: "updated_at", label: "Updated", type: "date", sql: "o.updated_at", roles: [...roleAll] },
    ],
    relations: [
      { name: "account", toEntity: "accounts", joinType: "left", on: "o.account_id = account.id", cardinality: "one" },
      { name: "owner", toEntity: "users", joinType: "left", on: "o.owner_id = owner.id", cardinality: "one" },
      { name: "opportunityProducts", toEntity: "opportunity_products", joinType: "left", on: "o.id = opportunityProducts.opportunity_id", cardinality: "many" },
    ],
  },
  accounts: {
    key: "accounts",
    table: "accounts",
    alias: "a",
    idColumn: "id",
    fields: [
      { path: "id", label: "ID", type: "string", sql: "a.id", roles: [...roleAll] },
      { path: "name", label: "Account", type: "string", sql: "a.name", roles: [...roleAll] },
      { path: "industry", label: "Industry", type: "string", sql: "a.industry", roles: [...roleAll] },
      { path: "region", label: "Region", type: "string", sql: "a.region", roles: [...roleAll] },
      { path: "created_at", label: "Created", type: "date", sql: "a.created_at", roles: [...roleAll] },
      { path: "updated_at", label: "Updated", type: "date", sql: "a.updated_at", roles: [...roleAll] },
    ],
    relations: [
      { name: "opportunities", toEntity: "opportunities", joinType: "left", on: "a.id = opportunities.account_id", cardinality: "many" },
      { name: "contacts", toEntity: "contacts", joinType: "left", on: "a.id = contacts.account_id", cardinality: "many" },
    ],
  },
  contacts: {
    key: "contacts",
    table: "contacts",
    alias: "c",
    idColumn: "id",
    fields: [
      { path: "id", label: "ID", type: "string", sql: "c.id", roles: [...roleAll] },
      { path: "first_name", label: "First Name", type: "string", sql: "c.first_name", roles: [...roleAll] },
      { path: "last_name", label: "Last Name", type: "string", sql: "c.last_name", roles: [...roleAll] },
      { path: "email", label: "Email", type: "string", sql: "c.email", roles: [...roleAll] },
      { path: "created_at", label: "Created", type: "date", sql: "c.created_at", roles: [...roleAll] },
      { path: "updated_at", label: "Updated", type: "date", sql: "c.updated_at", roles: [...roleAll] },
    ],
    relations: [{ name: "account", toEntity: "accounts", joinType: "left", on: "c.account_id = account.id", cardinality: "one" }],
  },
  products: {
    key: "products",
    table: "products",
    alias: "p",
    idColumn: "id",
    fields: [
      { path: "id", label: "ID", type: "string", sql: "p.id", roles: [...roleAll] },
      { path: "name", label: "Product", type: "string", sql: "p.name", roles: [...roleAll] },
      { path: "sku", label: "SKU", type: "string", sql: "p.sku", roles: [...roleAll] },
      { path: "family", label: "Family", type: "string", sql: "p.family", roles: [...roleAll] },
      { path: "created_at", label: "Created", type: "date", sql: "p.created_at", roles: [...roleAll] },
      { path: "updated_at", label: "Updated", type: "date", sql: "p.updated_at", roles: [...roleAll] },
    ],
    relations: [{ name: "opportunityProducts", toEntity: "opportunity_products", joinType: "left", on: "p.id = opportunityProducts.product_id", cardinality: "many" }],
  },
  users: {
    key: "users",
    table: "users",
    alias: "u",
    idColumn: "id",
    fields: [
      { path: "id", label: "ID", type: "string", sql: "u.id", roles: ["ADMIN", "MANAGER"] },
      { path: "name", label: "Name", type: "string", sql: "u.name", roles: [...roleAll] },
      { path: "email", label: "Email", type: "string", sql: "u.email", roles: ["ADMIN", "MANAGER"] },
      { path: "role", label: "Role", type: "string", sql: "u.role", roles: ["ADMIN", "MANAGER"] },
    ],
    relations: [],
  },
  opportunity_products: {
    key: "opportunity_products",
    table: "opportunity_products",
    alias: "op",
    idColumn: "id",
    fields: [
      { path: "id", label: "ID", type: "string", sql: "op.id", roles: [...roleAll] },
      { path: "quantity", label: "Quantity", type: "number", sql: "op.quantity", roles: [...roleAll] },
      { path: "unit_price", label: "Unit Price", type: "number", sql: "op.unit_price", roles: [...roleAll] },
      { path: "extended_price", label: "Extended Price", type: "number", sql: "(op.quantity * op.unit_price)", roles: [...roleAll] },
    ],
    relations: [
      { name: "opportunity", toEntity: "opportunities", joinType: "left", on: "op.opportunity_id = opportunity.id", cardinality: "one" },
      { name: "product", toEntity: "products", joinType: "left", on: "op.product_id = product.id", cardinality: "one" },
    ],
  },
};

export function getEntityDef(entity: BaseEntity): EntityDef {
  return ENTITY_DEFS[entity];
}

export function fieldForPath(entity: EntityKey, path: string): FieldDef | undefined {
  return ENTITY_DEFS[entity].fields.find((f) => f.path === path);
}