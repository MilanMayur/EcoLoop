import { env } from "@/config/env";

const wait = (ms = 450) => new Promise((resolve) => setTimeout(resolve, ms));

export class ServiceError extends Error {
  constructor(message: string, public readonly status?: number) {
    super(message);
    this.name = "ServiceError";
  }
}

type RequestOptions = Omit<RequestInit, "body"> & { body?: unknown };

export async function serviceRequest<T>(path: string, options: RequestOptions, mock: () => T | Promise<T>): Promise<T> {
  if (!env.apiUrl) {
    await wait();
    return mock();
  }

  const response = await fetch(`${env.apiUrl}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...options.headers },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });

  if (!response.ok) {
    throw new ServiceError(`EcoLoop service request failed (${response.status}).`, response.status);
  }

  return response.json() as Promise<T>;
}
