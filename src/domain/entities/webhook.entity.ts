import { randomUUID } from 'crypto';

export enum WebhookEvent {
  BOOKING_CREATED = 'booking.created',
  BOOKING_UPDATED = 'booking.updated',
  BOOKING_CANCELLED = 'booking.cancelled',
  TABLE_UNAVAILABLE = 'table.unavailable',
}

export enum WebhookStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  PAUSED = 'paused',
}

export class Webhook {
  private readonly _id: string;
  private _url: string;
  private _events: WebhookEvent[];
  private _secret: string;
  private _status: WebhookStatus;
  private readonly _createdAt: Date;
  private _updatedAt: Date;

  private constructor(
    id: string,
    url: string,
    events: WebhookEvent[],
    secret: string,
    status: WebhookStatus,
    createdAt?: Date,
    updatedAt?: Date
  ) {
    this._id = id;
    this._url = url;
    this._events = events;
    this._secret = secret;
    this._status = status;
    this._createdAt = createdAt || new Date();
    this._updatedAt = updatedAt || new Date();
  }

  static create(
    props: {
      url: string;
      events: WebhookEvent[];
      secret: string;
      status: WebhookStatus;
    },
    id?: string
  ): Webhook {
    return new Webhook(
      id || crypto.randomUUID(),
      props.url,
      props.events,
      props.secret,
      props.status
    );
  }

  static fromPersistence(
    props: {
      url: string;
      events: WebhookEvent[];
      secret: string;
      status: WebhookStatus;
      createdAt: Date;
      updatedAt: Date;
    },
    id: string
  ): Webhook {
    return new Webhook(id, props.url, props.events, props.secret, props.status, props.createdAt, props.updatedAt);
  }

  get id(): string {
    return this._id;
  }

  get url(): string {
    return this._url;
  }

  get events(): WebhookEvent[] {
    return [...this._events];
  }

  get secret(): string {
    return this._secret;
  }

  get status(): WebhookStatus {
    return this._status;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  updateUrl(url: string): void {
    this._url = url;
    this._updatedAt = new Date();
  }

  updateEvents(events: WebhookEvent[]): void {
    this._events = events;
    this._updatedAt = new Date();
  }

  updateSecret(secret: string): void {
    this._secret = secret;
    this._updatedAt = new Date();
  }

  activate(): void {
    this._status = WebhookStatus.ACTIVE;
    this._updatedAt = new Date();
  }

  deactivate(): void {
    this._status = WebhookStatus.INACTIVE;
    this._updatedAt = new Date();
  }

  pause(): void {
    this._status = WebhookStatus.PAUSED;
    this._updatedAt = new Date();
  }

  isActive(): boolean {
    return this._status === WebhookStatus.ACTIVE;
  }

  subscribesTo(event: WebhookEvent): boolean {
    return this._events.includes(event);
  }
}

