import { randomUUID } from "node:crypto";
import { calculatePrice, getEstimatedFuelPricePerLitre, type PriceQuote } from "@/lib/pricing/service";
import type { FuelRequestInput } from "@/lib/schemas/requests";
import { getSupabaseServiceClient } from "@/lib/db/supabase";
import type { RequestStatus } from "@/lib/dispatch/state-machine";
import { transition } from "@/lib/dispatch/state-machine";
import type { Role } from "@/lib/domain";

export type RequestStorageMode = "SUPABASE" | "IN_MEMORY";
export type FuelRequestRecord = {
  id: string;
  requestScopeKey: string;
  customerId: string | null;
  contactPhone: string;
  customerName: string | null;
  fuelType: FuelRequestInput["fuelType"];
  quantityLitres: number;
  latitude: number;
  longitude: number;
  priority: FuelRequestInput["priority"];
  requestChannel: FuelRequestInput["requestChannel"];
  status: RequestStatus;
  assignedPartnerId: string | null;
  assignedPartnerName: string | null;
  assignedPartnerScore: number | null;
  assignedPartnerEtaMinutes: number | null;
  assignedAt: string | null;
  idempotencyKey: string;
  estimatedTotal: number;
  currency: "INR";
  createdAt: string;
  updatedAt: string;
};

export type CreateFuelRequestCommand = FuelRequestInput & { customerId?: string | null };

interface FuelRequestRepository {
  upsert(command: FuelRequestRecord): Promise<FuelRequestRecord>;
  updateStatus(input: {
    id: string;
    fromStatus: RequestStatus;
    toStatus: RequestStatus;
    actorRole?: Role;
    actorId?: string | null;
    reason?: string;
  }): Promise<FuelRequestRecord>;
  assignPartner(input: {
    id: string;
    partnerId: string;
    partnerName: string;
    score: number;
    etaMinutes: number;
    actorRole?: Role;
    actorId?: string | null;
    reason?: string;
  }): Promise<FuelRequestRecord>;
  listAssignedToPartner(partnerId: string): Promise<FuelRequestRecord[]>;
  listAll(): Promise<FuelRequestRecord[]>;
  findById(id: string): Promise<FuelRequestRecord | null>;
}

class InMemoryFuelRequestRepository implements FuelRequestRepository {
  private readonly requests = new Map<string, FuelRequestRecord>();
  private readonly index = new Map<string, string>();

  async upsert(command: FuelRequestRecord) {
    const indexKey = `${command.requestScopeKey}:${command.idempotencyKey}`;
    const existingId = this.index.get(indexKey);
    if (existingId) {
      const existing = this.requests.get(existingId);
      if (existing) return existing;
    }
    this.requests.set(command.id, command);
    this.index.set(indexKey, command.id);
    return command;
  }

  async findById(id: string) {
    return this.requests.get(id) ?? null;
  }

  async updateStatus(input: {
    id: string;
    fromStatus: RequestStatus;
    toStatus: RequestStatus;
    actorRole?: Role;
    actorId?: string | null;
    reason?: string;
  }) {
    const existing = this.requests.get(input.id);
    if (!existing) throw new Error("Request not found");
    if (existing.status !== input.fromStatus) {
      throw new Error(`Request status changed from ${existing.status}; expected ${input.fromStatus}`);
    }
    const nextStatus = transition(existing.status, input.toStatus, input.actorRole);
    const updated = {
      ...existing,
      status: nextStatus,
      assignedPartnerId: input.toStatus === "SEARCHING" ? null : existing.assignedPartnerId,
      assignedPartnerName: input.toStatus === "SEARCHING" ? null : existing.assignedPartnerName,
      assignedPartnerScore: input.toStatus === "SEARCHING" ? null : existing.assignedPartnerScore,
      assignedPartnerEtaMinutes: input.toStatus === "SEARCHING" ? null : existing.assignedPartnerEtaMinutes,
      assignedAt: input.toStatus === "SEARCHING" ? null : existing.assignedAt,
      updatedAt: new Date().toISOString()
    };
    this.requests.set(updated.id, updated);
    return updated;
  }

  async assignPartner(input: {
    id: string;
    partnerId: string;
    partnerName: string;
    score: number;
    etaMinutes: number;
    actorRole?: Role;
    actorId?: string | null;
    reason?: string;
  }) {
    const existing = this.requests.get(input.id);
    if (!existing) throw new Error("Request not found");
    if (existing.status !== "SEARCHING") {
      throw new Error(`Request must be SEARCHING before assignment, found ${existing.status}`);
    }
    const nextStatus = transition(existing.status, "ASSIGNED", input.actorRole);
    const updated = {
      ...existing,
      status: nextStatus,
      assignedPartnerId: input.partnerId,
      assignedPartnerName: input.partnerName,
      assignedPartnerScore: input.score,
      assignedPartnerEtaMinutes: input.etaMinutes,
      assignedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.requests.set(updated.id, updated);
    return updated;
  }

  async listAssignedToPartner(partnerId: string) {
    return [...this.requests.values()].filter((request) => request.assignedPartnerId === partnerId);
  }

  async listAll() {
    return [...this.requests.values()].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  }
}

let inMemoryRequestRepository: InMemoryFuelRequestRepository | null = null;

class SupabaseFuelRequestRepository implements FuelRequestRepository {
  constructor(private readonly client = getSupabaseServiceClient()) {}

  async upsert(command: FuelRequestRecord) {
    if (!this.client) throw new Error("Supabase client is unavailable");
    const { data, error } = await this.client
      .rpc("create_fuel_request", {
        p_contact_phone: command.contactPhone,
        p_customer_id: command.customerId,
        p_customer_name: command.customerName,
        p_fuel_type: command.fuelType,
        p_idempotency_key: command.idempotencyKey,
        p_latitude: command.latitude,
        p_longitude: command.longitude,
        p_priority: command.priority,
        p_quantity_litres: command.quantityLitres,
        p_request_channel: command.requestChannel,
        p_request_scope_key: command.requestScopeKey,
        p_estimated_total: command.estimatedTotal
      })
      .single();
    if (error) throw error;
    return normalizeDatabaseRow(data as Record<string, unknown>);
  }

  async findById(id: string) {
    if (!this.client) throw new Error("Supabase client is unavailable");
    const { data, error } = await this.client
      .from("fuel_requests")
      .select("id, request_scope_key, customer_id, contact_phone, customer_name, fuel_type, quantity_litres, latitude, longitude, priority, request_channel, status, idempotency_key, estimated_total, created_at, updated_at")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    return data ? normalizeDatabaseRow(data as Record<string, unknown>) : null;
  }

  async updateStatus(input: {
    id: string;
    fromStatus: RequestStatus;
    toStatus: RequestStatus;
    actorRole?: Role;
    actorId?: string | null;
    reason?: string;
  }) {
    if (!this.client) throw new Error("Supabase client is unavailable");
    const { data, error } = await this.client
      .rpc("transition_fuel_request", {
        p_request_id: input.id,
        p_from_status: input.fromStatus,
        p_to_status: input.toStatus,
        p_actor_id: input.actorId ?? null,
        p_reason: input.reason ?? null,
        p_actor_role: input.actorRole ?? null
      })
      .single();
    if (error) throw error;
    return normalizeDatabaseRow(data as Record<string, unknown>);
  }

  async assignPartner(input: {
    id: string;
    partnerId: string;
    partnerName: string;
    score: number;
    etaMinutes: number;
    actorRole?: Role;
    actorId?: string | null;
    reason?: string;
  }) {
    if (!this.client) throw new Error("Supabase client is unavailable");
    const { data, error } = await this.client
      .rpc("assign_fuel_request", {
        p_request_id: input.id,
        p_partner_id: input.partnerId,
        p_partner_name: input.partnerName,
        p_partner_score: input.score,
        p_partner_eta_minutes: input.etaMinutes,
        p_actor_id: input.actorId ?? null,
        p_reason: input.reason ?? null,
        p_actor_role: input.actorRole ?? null
      })
      .single();
    if (error) throw error;
    return normalizeDatabaseRow(data as Record<string, unknown>);
  }

  async listAssignedToPartner(partnerId: string) {
    if (!this.client) throw new Error("Supabase client is unavailable");
    const { data, error } = await this.client
      .from("fuel_requests")
      .select("id, request_scope_key, customer_id, contact_phone, customer_name, fuel_type, quantity_litres, latitude, longitude, priority, request_channel, status, assigned_partner_id, assigned_partner_name, assigned_partner_score, assigned_partner_eta_minutes, assigned_at, idempotency_key, estimated_total, created_at, updated_at")
      .eq("assigned_partner_id", partnerId)
      .in("status", ["ASSIGNED", "PARTNER_ACCEPTED", "DISPATCHED", "EN_ROUTE", "ARRIVED", "DELIVERING", "OTP_PENDING"])
      .order("updated_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map((row) => normalizeDatabaseRow(row as Record<string, unknown>));
  }

  async listAll() {
    if (!this.client) throw new Error("Supabase client is unavailable");
    const { data, error } = await this.client
      .from("fuel_requests")
      .select("id, request_scope_key, customer_id, contact_phone, customer_name, fuel_type, quantity_litres, latitude, longitude, priority, request_channel, status, assigned_partner_id, assigned_partner_name, assigned_partner_score, assigned_partner_eta_minutes, assigned_at, idempotency_key, estimated_total, created_at, updated_at")
      .order("updated_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map((row) => normalizeDatabaseRow(row as Record<string, unknown>));
  }
}

function normalizeDatabaseRow(row: Record<string, unknown>): FuelRequestRecord {
  return {
    id: String(row.id ?? randomUUID()),
    requestScopeKey: String(row.request_scope_key ?? ""),
    customerId: row.customer_id ? String(row.customer_id) : null,
    contactPhone: String(row.contact_phone ?? ""),
    customerName: row.customer_name ? String(row.customer_name) : null,
    fuelType: row.fuel_type as FuelRequestRecord["fuelType"],
    quantityLitres: Number(row.quantity_litres ?? 0),
    latitude: Number(row.latitude ?? 0),
    longitude: Number(row.longitude ?? 0),
    priority: row.priority as FuelRequestRecord["priority"],
    requestChannel: row.request_channel as FuelRequestRecord["requestChannel"],
    status: (row.status as RequestStatus) ?? "CREATED",
    assignedPartnerId: row.assigned_partner_id ? String(row.assigned_partner_id) : null,
    assignedPartnerName: row.assigned_partner_name ? String(row.assigned_partner_name) : null,
    assignedPartnerScore: row.assigned_partner_score === null || row.assigned_partner_score === undefined ? null : Number(row.assigned_partner_score),
    assignedPartnerEtaMinutes: row.assigned_partner_eta_minutes === null || row.assigned_partner_eta_minutes === undefined ? null : Number(row.assigned_partner_eta_minutes),
    assignedAt: row.assigned_at ? String(row.assigned_at) : null,
    idempotencyKey: String(row.idempotency_key ?? ""),
    estimatedTotal: Number(row.estimated_total ?? 0),
    currency: "INR",
    createdAt: String(row.created_at ?? new Date().toISOString()),
    updatedAt: String(row.updated_at ?? new Date().toISOString())
  };
}

function deriveRequestScopeKey(command: CreateFuelRequestCommand) {
  if (command.customerId) return `customer:${command.customerId}`;
  return `phone:${normalizePhone(command.contactPhone)}`;
}

function normalizePhone(phone: string) {
  const trimmed = phone.trim();
  if (!trimmed) throw new Error("Contact phone is required");
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length < 7) throw new Error("Contact phone must contain at least 7 digits");
  return digits;
}

export class FuelRequestService {
  constructor(private readonly repository: FuelRequestRepository, private readonly storageMode: RequestStorageMode) {}

  async createRequest(command: CreateFuelRequestCommand) {
    const requestScopeKey = deriveRequestScopeKey(command);
    const contactPhone = normalizePhone(command.contactPhone);
    const fuelPricePerLitre = getEstimatedFuelPricePerLitre(command.fuelType);
    const quote: PriceQuote = calculatePrice(command.quantityLitres, fuelPricePerLitre);
    const persisted = await this.repository.upsert({
      id: randomUUID(),
      requestScopeKey,
      customerId: command.customerId ?? null,
      contactPhone,
      customerName: command.customerName?.trim() || null,
      fuelType: command.fuelType,
      quantityLitres: command.quantityLitres,
      latitude: command.latitude,
      longitude: command.longitude,
      priority: command.priority,
      requestChannel: command.requestChannel,
      status: "CREATED",
      assignedPartnerId: null,
      assignedPartnerName: null,
      assignedPartnerScore: null,
      assignedPartnerEtaMinutes: null,
      assignedAt: null,
      idempotencyKey: command.idempotencyKey,
      estimatedTotal: quote.total,
      currency: quote.currency,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    return { request: persisted, quote, storageMode: this.storageMode };
  }

  async findRequestById(id: string) {
    return this.repository.findById(id);
  }

  async updateRequestStatus(input: {
    id: string;
    nextStatus: RequestStatus;
    actorRole?: Role;
    actorId?: string | null;
    reason?: string;
  }) {
    const current = await this.repository.findById(input.id);
    if (!current) throw new Error("Request not found");
    const updated = await this.repository.updateStatus({
      id: input.id,
      fromStatus: current.status,
      toStatus: input.nextStatus,
      actorRole: input.actorRole,
      actorId: input.actorId,
      reason: input.reason
    });
    return { current, updated };
  }

  async assignRequestPartner(input: {
    id: string;
    partnerId: string;
    partnerName: string;
    score: number;
    etaMinutes: number;
    actorRole?: Role;
    actorId?: string | null;
    reason?: string;
  }) {
    return this.repository.assignPartner(input);
  }

  async listRequestsForPartner(partnerId: string) {
    return this.repository.listAssignedToPartner(partnerId);
  }

  async listAllRequests() {
    return this.repository.listAll();
  }
}

export function createFuelRequestService() {
  const supabaseClient = getSupabaseServiceClient();
  if (supabaseClient) {
    return new FuelRequestService(new SupabaseFuelRequestRepository(supabaseClient), "SUPABASE" as const);
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error("Fuel10 request persistence requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
  }
  if (!inMemoryRequestRepository) {
    inMemoryRequestRepository = new InMemoryFuelRequestRepository();
  }
  const repository = inMemoryRequestRepository;
  return new FuelRequestService(repository, "IN_MEMORY" as const);
}
