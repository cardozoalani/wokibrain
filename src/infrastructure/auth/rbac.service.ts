export enum Role {
  SUPER_ADMIN = 'super_admin',
  RESTAURANT_ADMIN = 'restaurant_admin',
  RESTAURANT_MANAGER = 'restaurant_manager',
  RESTAURANT_STAFF = 'restaurant_staff',
  API_CLIENT = 'api_client',
}

export enum Permission {
  BOOKING_CREATE = 'booking:create',
  BOOKING_READ = 'booking:read',
  BOOKING_UPDATE = 'booking:update',
  BOOKING_DELETE = 'booking:delete',
  RESTAURANT_CREATE = 'restaurant:create',
  RESTAURANT_READ = 'restaurant:read',
  RESTAURANT_UPDATE = 'restaurant:update',
  RESTAURANT_DELETE = 'restaurant:delete',
  TABLE_CREATE = 'table:create',
  TABLE_READ = 'table:read',
  TABLE_UPDATE = 'table:update',
  TABLE_DELETE = 'table:delete',
  ANALYTICS_READ = 'analytics:read',
  WEBHOOK_MANAGE = 'webhook:manage',
}

const rolePermissions: Record<Role, Permission[]> = {
  [Role.SUPER_ADMIN]: Object.values(Permission),
  [Role.RESTAURANT_ADMIN]: [
    Permission.BOOKING_CREATE,
    Permission.BOOKING_READ,
    Permission.BOOKING_UPDATE,
    Permission.BOOKING_DELETE,
    Permission.RESTAURANT_READ,
    Permission.RESTAURANT_UPDATE,
    Permission.TABLE_CREATE,
    Permission.TABLE_READ,
    Permission.TABLE_UPDATE,
    Permission.TABLE_DELETE,
    Permission.ANALYTICS_READ,
    Permission.WEBHOOK_MANAGE,
  ],
  [Role.RESTAURANT_MANAGER]: [
    Permission.BOOKING_CREATE,
    Permission.BOOKING_READ,
    Permission.BOOKING_UPDATE,
    Permission.BOOKING_DELETE,
    Permission.RESTAURANT_READ,
    Permission.TABLE_READ,
    Permission.ANALYTICS_READ,
  ],
  [Role.RESTAURANT_STAFF]: [
    Permission.BOOKING_CREATE,
    Permission.BOOKING_READ,
    Permission.RESTAURANT_READ,
    Permission.TABLE_READ,
  ],
  [Role.API_CLIENT]: [
    Permission.BOOKING_CREATE,
    Permission.BOOKING_READ,
    Permission.RESTAURANT_READ,
  ],
};

export class RBACService {
  hasPermission(roles: Role[], permission: Permission): boolean {
    for (const role of roles) {
      const permissions = rolePermissions[role] || [];
      if (permissions.includes(permission)) {
        return true;
      }
    }
    return false;
  }

  hasRole(userRoles: Role[], requiredRole: Role): boolean {
    return userRoles.includes(requiredRole);
  }

  getPermissionsForRoles(roles: Role[]): Permission[] {
    const permissions = new Set<Permission>();

    for (const role of roles) {
      const rolePerms = rolePermissions[role] || [];
      rolePerms.forEach((perm) => permissions.add(perm));
    }

    return Array.from(permissions);
  }

  canAccessRestaurant(userRoles: Role[], _userId: string, _restaurantId: string): boolean {
    if (userRoles.includes(Role.SUPER_ADMIN)) {
      return true;
    }

    return true;
  }
}

