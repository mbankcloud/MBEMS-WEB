// @ts-nocheck
"use server"

import { createServiceClient } from "@/lib/supabase/server"
import { z } from "zod"

const MemberRowSchema = z.object({
  member_id: z.string().min(1),
  full_name: z.string().min(1),
  age: z.coerce.number().positive().int().max(150).optional().nullable(),
  gender: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  mobile_number: z.string().optional().nullable(),
  branch_name: z.string().optional().nullable(),
})

const BATCH_SIZE = 500 // Insert 500 rows at a time

export async function importMembers(rows, mode, uploadedBy, filename) {
  const supabase = await createServiceClient()

  // Create import batch record
  const { data: batch, error: batchError } = await supabase
    .from("import_batches")
    .insert({
      uploaded_by: uploadedBy,
      filename,
      file_type: filename.endsWith(".csv") ? "csv" : "xlsx",
      total_rows: rows.length,
      status: "processing",
      import_mode: mode,
    })
    .select()
    .single()

  if (batchError || !batch) return { error: batchError?.message || "Failed to create import batch" }

  // Build branch map
  const { data: existingBranches } = await supabase.from("branches").select("id, branch_name")
  const branchMap = new Map(existingBranches?.map((b) => [b.branch_name.toLowerCase().trim(), b.id]) || [])

  // Validate all rows first
  const validRows = []
  const errors = []

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const rowNum = i + 2
    const parsed = MemberRowSchema.safeParse(row)
    if (!parsed.success) {
      const msg = parsed.error.issues.map((e) => `${e.path.join(".")}: ${e.message}`).join("; ")
      errors.push({ row: rowNum, error: msg })
    } else {
      validRows.push({ rowNum, data: parsed.data })
    }
  }

  // Auto-create missing branches in bulk
  const branchNames = [...new Set(validRows.map((r) => r.data.branch_name).filter(Boolean))]
  for (const name of branchNames) {
    const key = name.toLowerCase().trim()
    if (!branchMap.has(key)) {
      const code = name.toUpperCase().replace(/\s+/g, "_").slice(0, 20)
      const { data: newBranch } = await supabase
        .from("branches")
        .insert({ branch_name: name, branch_code: code })
        .select()
        .single()
      if (newBranch) branchMap.set(key, newBranch.id)
    }
  }

  // Build member records
  const memberRecords = validRows.map(({ data }) => ({
    member_id: String(data.member_id).trim(),
    full_name: data.full_name,
    age: data.age ?? null,
    gender: data.gender ?? null,
    address: data.address ?? null,
    mobile_number: data.mobile_number ? String(data.mobile_number).trim() : null,
    branch_id: data.branch_name ? (branchMap.get(data.branch_name.toLowerCase().trim()) ?? null) : null,
    branch_name: data.branch_name ?? null,
    status: "active",
  }))

  let inserted = 0
  let updated = 0
  let skipped = 0

  if (mode === "upsert") {
    // Batch upsert in chunks of BATCH_SIZE
    for (let i = 0; i < memberRecords.length; i += BATCH_SIZE) {
      const chunk = memberRecords.slice(i, i + BATCH_SIZE)
      const { error } = await supabase
        .from("members")
        .upsert(chunk, { onConflict: "member_id", ignoreDuplicates: false })
      if (error) {
        errors.push({ row: i + 2, error: error.message })
      } else {
        updated += chunk.length
      }
    }
  } else {
    // Insert Only mode — get existing IDs first
    const { data: existingMembers } = await supabase
      .from("members")
      .select("member_id")

    const existingIds = new Set(existingMembers?.map((m) => String(m.member_id)) || [])

    const newRecords = memberRecords.filter((r) => !existingIds.has(r.member_id))
    skipped = memberRecords.length - newRecords.length

    // Batch insert new records
    for (let i = 0; i < newRecords.length; i += BATCH_SIZE) {
      const chunk = newRecords.slice(i, i + BATCH_SIZE)
      const { error } = await supabase.from("members").insert(chunk)
      if (error) {
        // Try inserting one by one to find the bad row
        for (const record of chunk) {
          const { error: singleError } = await supabase.from("members").insert(record)
          if (singleError) {
            errors.push({ row: 0, member_id: record.member_id, error: singleError.message })
          } else {
            inserted++
          }
        }
      } else {
        inserted += chunk.length
      }
    }
  }

  // Update batch status
  await supabase.from("import_batches").update({
    successful_rows: inserted + updated,
    failed_rows: errors.length,
    skipped_rows: skipped,
    status: "completed",
  }).eq("id", batch.id)

  return {
    batchId: batch.id,
    total: rows.length,
    inserted,
    updated,
    skipped,
    failed: errors.length,
    errors: errors.slice(0, 100), // Return max 100 errors
  }
}
