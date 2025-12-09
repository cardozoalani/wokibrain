import { describe, it, expect } from 'vitest';
import { RBACService, Role, Permission } from './rbac.service';

describe('RBACService', () => {
  let rbacService: RBACService;

  beforeEach(() => {
    rbacService = new RBACService();
  });

  describe('hasPermission', () => {
    it('should return true for super admin with any permission', () => {
      expect(rbacService.hasPermission([Role.SUPER_ADMIN], Permission.BOOKING_CREATE)).toBe(true);
      expect(rbacService.hasPermission([Role.SUPER_ADMIN], Permission.RESTAURANT_DELETE)).toBe(
        true
      );
    });

    it('should return true for restaurant admin with booking permissions', () => {
      expect(rbacService.hasPermission([Role.RESTAURANT_ADMIN], Permission.BOOKING_CREATE)).toBe(
        true
      );
      expect(rbacService.hasPermission([Role.RESTAURANT_ADMIN], Permission.BOOKING_READ)).toBe(
        true
      );
    });

    it('should return false for staff without delete permission', () => {
      expect(rbacService.hasPermission([Role.RESTAURANT_STAFF], Permission.BOOKING_DELETE)).toBe(
        false
      );
    });

    it('should return true if any role has permission', () => {
      expect(
        rbacService.hasPermission(
          [Role.RESTAURANT_STAFF, Role.RESTAURANT_MANAGER],
          Permission.BOOKING_DELETE
        )
      ).toBe(true);
    });
  });

  describe('hasRole', () => {
    it('should return true if user has required role', () => {
      expect(rbacService.hasRole([Role.RESTAURANT_ADMIN], Role.RESTAURANT_ADMIN)).toBe(true);
    });

    it('should return false if user does not have required role', () => {
      expect(rbacService.hasRole([Role.RESTAURANT_STAFF], Role.RESTAURANT_ADMIN)).toBe(false);
    });
  });

  describe('getPermissionsForRoles', () => {
    it('should return all permissions for super admin', () => {
      const permissions = rbacService.getPermissionsForRoles([Role.SUPER_ADMIN]);
      expect(permissions.length).toBeGreaterThan(10);
      expect(permissions).toContain(Permission.BOOKING_CREATE);
      expect(permissions).toContain(Permission.RESTAURANT_DELETE);
    });

    it('should return combined permissions for multiple roles', () => {
      const permissions = rbacService.getPermissionsForRoles([
        Role.RESTAURANT_STAFF,
        Role.RESTAURANT_MANAGER,
      ]);

      expect(permissions).toContain(Permission.BOOKING_CREATE);
      expect(permissions).toContain(Permission.BOOKING_DELETE);
    });

    it('should not duplicate permissions', () => {
      const permissions = rbacService.getPermissionsForRoles([
        Role.RESTAURANT_STAFF,
        Role.RESTAURANT_STAFF,
      ]);

      const uniquePermissions = new Set(permissions);
      expect(permissions.length).toBe(uniquePermissions.size);
    });
  });

  describe('canAccessRestaurant', () => {
    it('should return true for super admin', () => {
      expect(rbacService.canAccessRestaurant([Role.SUPER_ADMIN], 'U1', 'R1')).toBe(true);
    });

    it('should return true for restaurant admin', () => {
      expect(rbacService.canAccessRestaurant([Role.RESTAURANT_ADMIN], 'U1', 'R1')).toBe(true);
    });
  });
});
