import { Response } from "express";
import { stringify } from "csv-stringify/sync";
import * as XLSX from "xlsx";

export function sendCsvExport(
  res: Response,
  rows: Record<string, unknown>[],
  headers: Array<{ key: string; label: string }>,
  metadata: Record<string, unknown>
) {
  const dataRows = rows.map((row) => {
    const out: Record<string, unknown> = {};
    headers.forEach((header) => {
      out[header.label] = row[header.key] ?? null;
    });
    return out;
  });

  const csv = stringify(dataRows, {
    header: true,
    columns: headers.map((item) => item.label),
  });

  const metadataCsv = stringify(
    Object.entries(metadata).map(([key, value]) => ({ key, value: typeof value === "string" ? value : JSON.stringify(value) })),
    {
      header: true,
      columns: ["key", "value"],
    }
  );

  const payload = `# Metadata\n${metadataCsv}\n# Data\n${csv}`;

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename=view-export-${Date.now()}.csv`);
  res.send(payload);
}

export function sendXlsxExport(
  res: Response,
  rows: Record<string, unknown>[],
  headers: Array<{ key: string; label: string }>,
  metadata: Record<string, unknown>
) {
  const wb = XLSX.utils.book_new();

  const dataRows = rows.map((row) => {
    const out: Record<string, unknown> = {};
    headers.forEach((header) => {
      out[header.label] = row[header.key] ?? null;
    });
    return out;
  });

  const dataSheet = XLSX.utils.json_to_sheet(dataRows);
  const metadataSheet = XLSX.utils.json_to_sheet(
    Object.entries(metadata).map(([key, value]) => ({ Key: key, Value: typeof value === "string" ? value : JSON.stringify(value) }))
  );

  XLSX.utils.book_append_sheet(wb, dataSheet, "Data");
  XLSX.utils.book_append_sheet(wb, metadataSheet, "Metadata");

  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", `attachment; filename=view-export-${Date.now()}.xlsx`);
  res.send(buf);
}