import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { wasteTypeValues } from "@/lib/waste-taxonomy";

export const runtime = "nodejs";

const schema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(200),
  phone: z.string().trim().min(10).max(24),
  vehicleNumber: z.string().trim().min(4).max(40),
  vehicleType: z.string().trim().min(2).max(80),
  capacityKg: z.number().positive().max(100_000),
  compatibleWasteTypes: z.array(z.enum(wasteTypeValues)).min(1).max(wasteTypeValues.length),
});

export async function POST(request: Request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!token) return NextResponse.json({ error: "Sign in as a recycling partner." }, { status: 401 });
  if (!url || !serviceKey) return NextResponse.json({ error: "Driver invitations are not configured on the server." }, { status: 503 });

  let input: z.infer<typeof schema>;
  try {
    input = schema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Enter valid driver and vehicle details." }, { status: 400 });
  }

  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: authData, error: authError } = await admin.auth.getUser(token);
  if (authError || !authData.user) return NextResponse.json({ error: "Your session is no longer valid." }, { status: 401 });

  let managerResult = await admin.from("profiles")
    .select("id, role, approval_status, is_active, organization_name, accepted_waste_types")
    .eq("id", authData.user.id).single();
  if (managerResult.error?.message.includes("accepted_waste_types")) {
    managerResult = await admin.from("profiles")
      .select("id, role, approval_status, is_active, organization_name")
      .eq("id", authData.user.id).single();
  }
  const manager = managerResult.data as Record<string, unknown> | null;
  if (!manager || manager.role !== "recycler" || manager.approval_status !== "approved" || manager.is_active === false) {
    return NextResponse.json({ error: "Only approved recycling partners can invite drivers." }, { status: 403 });
  }
  const acceptedWasteTypes = Array.isArray(manager.accepted_waste_types)
    ? manager.accepted_waste_types.filter((value): value is string => typeof value === "string")
    : [];
  if (acceptedWasteTypes.length && input.compatibleWasteTypes.some((value) => !acceptedWasteTypes.includes(value))) {
    return NextResponse.json({ error: "A driver can only be assigned waste streams accepted by your company." }, { status: 400 });
  }

  const redirectTo = `${new URL(request.url).origin}/login?invited=1`;
  const { data: invitation, error: invitationError } = await admin.auth.admin.inviteUserByEmail(input.email, {
    redirectTo,
    data: {
      role: "driver",
      full_name: input.name,
      organization_name: String(manager.organization_name ?? ""),
      phone: input.phone,
    },
  });
  if (invitationError || !invitation.user) {
    const duplicate = invitationError?.message.toLowerCase().includes("already");
    return NextResponse.json({ error: duplicate ? "A user already exists for this driver email." : "The driver invitation could not be sent." }, { status: duplicate ? 409 : 500 });
  }

  const { data: driver, error: driverError } = await admin.from("drivers").insert({
    partner_id: manager.id,
    user_id: invitation.user.id,
    name: input.name,
    email: input.email,
    phone: input.phone,
    vehicle_number: input.vehicleNumber,
    vehicle_type: input.vehicleType,
    capacity_kg: input.capacityKg,
    compatible_waste_types: input.compatibleWasteTypes,
  }).select("*").single();

  if (driverError || !driver) {
    await admin.auth.admin.deleteUser(invitation.user.id).catch(() => undefined);
    const duplicate = driverError?.code === "23505";
    return NextResponse.json({ error: duplicate ? "This vehicle number is already registered." : "The driver record could not be created." }, { status: duplicate ? 409 : 500 });
  }

  return NextResponse.json({ driver, invitationSent: true }, { status: 201 });
}
