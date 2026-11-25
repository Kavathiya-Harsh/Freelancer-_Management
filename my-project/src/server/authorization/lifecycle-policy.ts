export type LifecycleStatus = "active" | "archived";

export function canWriteWorkspace(status: LifecycleStatus) {
  return status === "active";
}

export function canRestoreWorkspace(role: string) {
  return role === "owner";
}
