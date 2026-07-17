import { availableJobs, vendorRequests } from "@/data/dashboard";
import type { PickupInput, PickupJob, PickupRequest, VehicleSummary } from "@/types/mvp";
import { serviceRequest, ServiceError } from "@/services/http.service";

let requestStore: PickupRequest[] = vendorRequests.map((item) => ({ ...item }));
let availableStore: PickupJob[] = availableJobs.map((item) => ({ ...item, status: "Available" }));
let acceptedStore: PickupJob[] = [
  { ...availableJobs[0], status: "In transit" },
  { ...availableJobs[1], status: "Accepted" },
];

const vehicleStore: VehicleSummary[] = [
  { id: "KA-51-AB-4821", driver: "Suresh Kumar", capacity: "1.2 t", load: "68%", status: "Active" },
  { id: "KA-05-MN-9204", driver: "Imran Pasha", capacity: "850 kg", load: "42%", status: "Active" },
  { id: "KA-51-HG-1178", driver: "Manoj R", capacity: "1.5 t", load: "—", status: "Maintenance" },
];

export const pickupService = {
  getRequests() {
    return serviceRequest("/pickups", { method: "GET" }, () => requestStore.map((item) => ({ ...item })));
  },
  createPickup(payload: PickupInput) {
    return serviceRequest("/pickups", { method: "POST", body: payload }, () => {
      const request: PickupRequest = { id: `ECO-${2058 + requestStore.length}`, waste: `${payload.wasteType} waste`, weight: `${payload.weight} kg`, recycler: "Matching in progress", status: "Pending", time: "Today, just now", eta: "—" };
      requestStore = [request, ...requestStore];
      return request;
    });
  },
  getAvailableJobs() {
    return serviceRequest("/recycler/jobs", { method: "GET" }, () => availableStore.map((item) => ({ ...item })));
  },
  getAcceptedJobs() {
    return serviceRequest("/recycler/jobs/accepted", { method: "GET" }, () => acceptedStore.map((item) => ({ ...item })));
  },
  acceptJob(jobId: string) {
    return serviceRequest(`/recycler/jobs/${jobId}/accept`, { method: "POST" }, () => {
      const job = availableStore.find((item) => item.id === jobId);
      if (!job) throw new ServiceError("This pickup is no longer available.", 404);
      const accepted: PickupJob = { ...job, status: "Accepted" };
      availableStore = availableStore.filter((item) => item.id !== jobId);
      acceptedStore = [accepted, ...acceptedStore.filter((item) => item.id !== jobId)];
      return accepted;
    });
  },
  updateStatus(jobId: string, status: PickupJob["status"]) {
    return serviceRequest(`/recycler/jobs/${jobId}/status`, { method: "PATCH", body: { status } }, () => {
      const job = acceptedStore.find((item) => item.id === jobId);
      if (!job) throw new ServiceError("Pickup job not found.", 404);
      acceptedStore = acceptedStore.map((item) => item.id === jobId ? { ...item, status } : item);
      return { ...job, status };
    });
  },
  completePickup(jobId: string, payload: { weight: number; facility: string; notes?: string }) {
    return serviceRequest(`/recycler/jobs/${jobId}/complete`, { method: "POST", body: payload }, () => {
      const job = acceptedStore.find((item) => item.id === jobId);
      if (!job) throw new ServiceError("Pickup job not found.", 404);
      acceptedStore = acceptedStore.map((item) => item.id === jobId ? { ...item, status: "Completed" } : item);
      return { ...job, status: "Completed" as const, collectedWeight: payload.weight, facility: payload.facility };
    });
  },
  getHistory() {
    return serviceRequest("/recycler/history", { method: "GET" }, () => acceptedStore.filter((item) => item.status === "Completed").concat(availableJobs.map((item) => ({ ...item, status: "Completed" as const }))));
  },
  getVehicles() {
    return serviceRequest("/recycler/vehicles", { method: "GET" }, () => vehicleStore.map((item) => ({ ...item })));
  },
};
