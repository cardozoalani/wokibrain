export class DomainError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number = 400
  ) {
    super(message);
    this.name = 'DomainError';
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends DomainError {
  constructor(message: string, public readonly field?: string) {
    super(message, 'VALIDATION_ERROR', 400);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends DomainError {
  constructor(entity: string, id: string) {
    super(`${entity} with id ${id} not found`, 'NOT_FOUND', 404);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends DomainError {
  constructor(message: string) {
    super(message, 'CONFLICT', 409);
    this.name = 'ConflictError';
  }
}

export class BusinessRuleError extends DomainError {
  constructor(message: string, code: string = 'BUSINESS_RULE_VIOLATION') {
    super(message, code, 422);
    this.name = 'BusinessRuleError';
  }
}

export class NoCapacityError extends BusinessRuleError {
  constructor(message: string = 'No capacity available for the requested parameters') {
    super(message, 'NO_CAPACITY');
  }
}

export class OutsideServiceWindowError extends BusinessRuleError {
  constructor(message: string = 'Requested time is outside service window') {
    super(message, 'OUTSIDE_SERVICE_WINDOW');
  }
}



