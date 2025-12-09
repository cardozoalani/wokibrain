import i18next, { TFunction } from 'i18next';

export class I18nService {
  private i18n: typeof i18next;

  constructor() {
    this.i18n = i18next.createInstance();
  }

  async initialize(): Promise<void> {
    await this.i18n.init({
      lng: 'en',
      fallbackLng: 'en',
      supportedLngs: ['en', 'es', 'pt'],
      resources: {
        en: {
          translation: {
            errors: {
              validation_error: 'Invalid input data',
              not_found: '{{entity}} with id {{id}} not found',
              no_capacity: 'No capacity available for the requested parameters',
              conflict: 'Resource conflict occurred',
              outside_service_window: 'Requested time is outside service window',
              rate_limit_exceeded: 'Too many requests. Please try again later.',
              unauthorized: 'Authentication required',
              forbidden: 'Insufficient permissions',
            },
            booking: {
              created: 'Booking created successfully',
              cancelled: 'Booking cancelled successfully',
              updated: 'Booking updated successfully',
            },
          },
        },
        es: {
          translation: {
            errors: {
              validation_error: 'Datos de entrada inválidos',
              not_found: '{{entity}} con id {{id}} no encontrado',
              no_capacity: 'No hay capacidad disponible para los parámetros solicitados',
              conflict: 'Ocurrió un conflicto de recursos',
              outside_service_window: 'El tiempo solicitado está fuera de la ventana de servicio',
              rate_limit_exceeded: 'Demasiadas solicitudes. Intente nuevamente más tarde.',
              unauthorized: 'Autenticación requerida',
              forbidden: 'Permisos insuficientes',
            },
            booking: {
              created: 'Reserva creada exitosamente',
              cancelled: 'Reserva cancelada exitosamente',
              updated: 'Reserva actualizada exitosamente',
            },
          },
        },
        pt: {
          translation: {
            errors: {
              validation_error: 'Dados de entrada inválidos',
              not_found: '{{entity}} com id {{id}} não encontrado',
              no_capacity: 'Não há capacidade disponível para os parâmetros solicitados',
              conflict: 'Ocorreu um conflito de recursos',
              outside_service_window: 'O horário solicitado está fora da janela de serviço',
              rate_limit_exceeded: 'Muitas solicitações. Tente novamente mais tarde.',
              unauthorized: 'Autenticação necessária',
              forbidden: 'Permissões insuficientes',
            },
            booking: {
              created: 'Reserva criada com sucesso',
              cancelled: 'Reserva cancelada com sucesso',
              updated: 'Reserva atualizada com sucesso',
            },
          },
        },
      },
    });
  }

  t(key: string, options?: Record<string, unknown>): string {
    return this.i18n.t(key, options);
  }

  changeLanguage(lng: string): Promise<TFunction> {
    return this.i18n.changeLanguage(lng);
  }

  getLanguage(): string {
    return this.i18n.language;
  }
}



