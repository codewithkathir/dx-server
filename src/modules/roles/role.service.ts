import { roleRepository } from "./role.repository";
import type { RolePublic } from "./role.types";

class RoleService {
  async listRoles(): Promise<RolePublic[]> {
    const roles = await roleRepository.findAll();
    return roles.map((role) => ({
      id: role.id,
      name: role.name,
      description: role.description,
    }));
  }
}

export const roleService = new RoleService();
