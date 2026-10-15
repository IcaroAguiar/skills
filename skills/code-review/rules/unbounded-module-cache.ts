const capabilityCache = new Map<string, Capabilities>();

export async function capabilitiesFor(tenantId: string) {
  const hit = capabilityCache.get(tenantId);
  if (hit) return hit;
  const value = await load(tenantId);
  // ruleid: unbounded-module-cache
  capabilityCache.set(tenantId, value);
  return value;
}

const seen = new Set<string>();
export const remember = (key: string) => {
  // ruleid: unbounded-module-cache
  seen.add(key);
};

@Injectable()
export class TenantService {
  private readonly byTenant = new Map<string, Tenant>();

  async get(id: string) {
    // ruleid: unbounded-module-cache
    this.byTenant.set(id, await this.repo.find(id));
  }
}

export function requestScoped(items: Item[]) {
  const index = new Map<string, Item>();
  for (const item of items) {
    // ok: unbounded-module-cache
    index.set(item.id, item);
  }
  return index;
}
