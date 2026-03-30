import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AssistantSession } from './entities/assistant-session.entity';
import { QueryAssistantDto, AssistantResponseDto } from './dto/assistant.dto';

@Injectable()
export class AssistantService {
  private moduleContexts = {
    applications: {
      actions: ['create new application', 'edit application', 'delete application', 'manage roles', 'view pagination', 'configure menu options'],
      help: 'I help you manage applications that will be used by other systems. I can create applications with their menu options and access roles for user authentication.'
    },
    users: {
      actions: ['create main user', 'create dependent user', 'manage permissions', 'assign roles', 'view user list', 'filter users', 'change status', 'manage user profiles'],
      help: 'I manage two types of users: Main users (contract holders and billing responsible) and Dependent users (associated to main users). I handle natural and legal person profiles.'
    },
    packages: {
      actions: ['create business package', 'edit package', 'delete package', 'view packages', 'configure business features', 'set pricing'],
      help: 'I create business packages with specific features that apply to main users. These packages are used to generate contracts and define application access levels.'
    },
    contracts: {
      actions: ['create contract', 'edit contract', 'view contracts', 'filter by status', 'manage payments', 'assign packages to users'],
      help: 'I manage contracts between main users and business packages. Contracts define billing, payment terms, and determine access permissions for dependent users.'
    },
    auth: {
      actions: ['validate user access', 'generate tokens', 'check permissions', 'authorize login', 'manage sessions'],
      help: 'I handle authentication for all CycloNet applications. I validate users, generate access tokens, and provide application configurations based on user roles.'
    },
    reports: {
      actions: ['generate user reports', 'contract reports', 'billing reports', 'access logs', 'export data'],
      help: 'I generate reports on users, contracts, billing, and system access. I can export data and create automated reporting schedules.'
    }
  };

  constructor(
    @InjectRepository(AssistantSession)
    private sessionRepository: Repository<AssistantSession>,
  ) {}

  async processQuery(queryDto: QueryAssistantDto): Promise<AssistantResponseDto> {
    const session = await this.getOrCreateSession(queryDto.sessionId, queryDto.module);
    
    // Actualizar contexto
    session.context = { ...session.context, ...queryDto.context };
    session.chatHistory = session.chatHistory || [];
    session.chatHistory.push({ type: 'user', message: queryDto.query, timestamp: new Date() });

    const response = this.generateResponse(queryDto.query, queryDto.module, session.context, queryDto.language);
    
    session.chatHistory.push({ type: 'assistant', message: response.response, timestamp: new Date() });
    await this.sessionRepository.save(session);

    return response;
  }

  private generateResponse(query: string, module: string, context: any, language: string = 'en'): AssistantResponseDto {
    const moduleContext = this.moduleContexts[module];
    const lowerQuery = query.toLowerCase();
    const isSpanish = language === 'es';

    // Respuestas específicas de Authoriza
    if (lowerQuery.includes('authoriza') || lowerQuery.includes('authorization') || lowerQuery.includes('autorización')) {
      return {
        response: isSpanish
          ? 'Authoriza es el sistema central de autenticación y autorización de CycloNet. Gestiona aplicaciones, usuarios principales y dependientes, paquetes de negocio y contratos.'
          : 'Authoriza is the central authentication and authorization system for CycloNet. It manages applications, main and dependent users, business packages, and contracts.',
        suggestions: isSpanish
          ? ['Gestionar usuarios principales', 'Crear usuarios dependientes', 'Configurar paquetes', 'Manejar contratos']
          : ['Manage main users', 'Create dependent users', 'Configure packages', 'Handle contracts'],
        actions: [
          { type: 'help', label: isSpanish ? 'Más información sobre Authoriza' : 'More about Authoriza' }
        ]
      };
    }

    if (lowerQuery.includes('main user') || lowerQuery.includes('usuario principal') || lowerQuery.includes('contract') || lowerQuery.includes('contrato')) {
      return {
        response: isSpanish
          ? 'Los usuarios principales son responsables de contratos y facturación. Los usuarios dependientes se asocian a ellos y su acceso depende del estado del usuario principal.'
          : 'Main users are responsible for contracts and billing. Dependent users are associated with them and their access depends on the main user status.',
        suggestions: isSpanish
          ? ['Crear usuario principal', 'Gestionar dependientes', 'Ver contratos activos']
          : ['Create main user', 'Manage dependents', 'View active contracts'],
        actions: [
          { type: 'create', label: isSpanish ? 'Crear usuario principal' : 'Create main user' }
        ]
      };
    }

    if (lowerQuery.includes('token') || lowerQuery.includes('authentication') || lowerQuery.includes('autenticación') || lowerQuery.includes('login')) {
      return {
        response: isSpanish
          ? 'Authoriza valida usuarios y genera tokens de acceso. Sin este token, los backends de otras aplicaciones no funcionan. También entrega la configuración de la aplicación según el rol del usuario.'
          : 'Authoriza validates users and generates access tokens. Without this token, other application backends won\'t work. It also provides application configuration based on user role.',
        suggestions: isSpanish
          ? ['Validar acceso de usuario', 'Generar token', 'Configurar permisos']
          : ['Validate user access', 'Generate token', 'Configure permissions'],
        actions: [
          { type: 'help', label: isSpanish ? 'Gestión de tokens' : 'Token management' }
        ]
      };
    }

    if (lowerQuery.includes('help') || lowerQuery.includes('ayuda')) {
      return {
        response: isSpanish 
          ? `¡Hola! Soy CYCLON 🤖, tu asistente en Authoriza. ${this.getModuleHelpSpanish(module)}` 
          : `Hello! I'm CYCLON 🤖, your Authoriza assistant. ${moduleContext?.help || 'I can help you navigate this module.'}`,
        suggestions: isSpanish 
          ? this.getActionsSuggestions(module, 'es')
          : moduleContext?.actions || [],
        actions: [
          { type: 'help', label: isSpanish ? 'Mostrar acciones disponibles' : 'Show available actions' }
        ]
      };
    }

    if (lowerQuery.includes('create') || lowerQuery.includes('crear')) {
      return {
        response: isSpanish
          ? `Te ayudo a crear un nuevo ${this.getModuleNameSpanish(module)}. En Authoriza, cada elemento está conectado con el sistema de autenticación.`
          : `I'll help you create a new ${module.slice(0, -1)}. In Authoriza, every element is connected to the authentication system.`,
        suggestions: isSpanish
          ? ['Completar campos requeridos', 'Configurar permisos', 'Asignar roles', 'Guardar cambios']
          : ['Fill required fields', 'Configure permissions', 'Assign roles', 'Save changes'],
        actions: [
          { type: 'create', label: isSpanish ? `Crear nuevo ${this.getModuleNameSpanish(module)}` : `Create new ${module.slice(0, -1)}` }
        ]
      };
    }

    if (lowerQuery.includes('page') || lowerQuery.includes('pagination') || lowerQuery.includes('página')) {
      return {
        response: isSpanish
          ? 'Puedo ayudarte a navegar entre páginas. Authoriza maneja grandes volúmenes de datos de usuarios y aplicaciones.'
          : 'I can help you navigate through pages. Authoriza handles large volumes of user and application data.',
        suggestions: isSpanish
          ? ['Ir a siguiente página', 'Ir a página anterior', 'Saltar a página específica']
          : ['Go to next page', 'Go to previous page', 'Jump to specific page'],
        actions: [
          { type: 'navigate', label: isSpanish ? 'Página siguiente' : 'Next page', data: { action: 'next' } },
          { type: 'navigate', label: isSpanish ? 'Página anterior' : 'Previous page', data: { action: 'prev' } }
        ]
      };
    }

    return {
      response: isSpanish
        ? `Entiendo que preguntas sobre "${query}". Como asistente de Authoriza, puedo ayudarte con autenticación, usuarios, aplicaciones y contratos. ¿Qué necesitas?`
        : `I understand you're asking about "${query}". As your Authoriza assistant, I can help with authentication, users, applications, and contracts. What do you need?`,
      suggestions: isSpanish
        ? this.getActionsSuggestions(module, 'es')
        : moduleContext?.actions || ['Ask for help', 'Show available options'],
      actions: [
        { type: 'help', label: isSpanish ? 'Mostrar ayuda' : 'Show help' }
      ]
    };
  }

  private getModuleHelpSpanish(module: string): string {
    const helpTexts = {
      applications: 'Gestiono aplicaciones que serán usadas por otros sistemas. Puedo crear aplicaciones con sus opciones de menú y roles de acceso para autenticación de usuarios.',
      users: 'Gestiono dos tipos de usuarios: Principales (responsables de contratos y facturación) y Dependientes (asociados a usuarios principales). Manejo perfiles de personas naturales y jurídicas.',
      packages: 'Creo paquetes de negocio con características específicas que aplican a usuarios principales. Estos paquetes se usan para generar contratos y definir niveles de acceso.',
      contracts: 'Gestiono contratos entre usuarios principales y paquetes de negocio. Los contratos definen facturación, términos de pago y determinan permisos de acceso para usuarios dependientes.',
      auth: 'Manejo la autenticación para todas las aplicaciones de CycloNet. Valido usuarios, genero tokens de acceso y proporciono configuraciones de aplicación según roles de usuario.',
      reports: 'Genero reportes de usuarios, contratos, facturación y accesos al sistema. Puedo exportar datos y crear programaciones de reportes automatizados.'
    };
    return helpTexts[module] || 'Puedo ayudarte a navegar por este módulo de Authoriza.';
  }

  private getModuleNameSpanish(module: string): string {
    const names = {
      applications: 'aplicación',
      users: 'usuario',
      packages: 'paquete',
      contracts: 'contrato',
      reports: 'reporte'
    };
    return names[module] || module;
  }

  private getActionsSuggestions(module: string, language: string): string[] {
    if (language === 'es') {
      const spanishActions = {
        applications: ['crear nueva aplicación', 'configurar opciones de menú', 'gestionar roles de acceso', 'ver aplicaciones registradas'],
        users: ['crear usuario principal', 'crear usuario dependiente', 'gestionar perfiles', 'asignar roles', 'cambiar estados'],
        packages: ['crear paquete de negocio', 'configurar características', 'establecer precios', 'ver paquetes disponibles'],
        contracts: ['crear contrato', 'asignar paquetes a usuarios', 'gestionar pagos', 'filtrar por estado'],
        auth: ['validar acceso de usuario', 'generar tokens', 'verificar permisos', 'autorizar inicio de sesión'],
        reports: ['generar reporte de usuarios', 'reportes de contratos', 'reportes de facturación', 'logs de acceso']
      };
      return spanishActions[module] || ['Pedir ayuda', 'Mostrar opciones disponibles'];
    }
    return this.moduleContexts[module]?.actions || [];
  }

  private async getOrCreateSession(sessionId: string, module: string): Promise<AssistantSession> {
    let session = await this.sessionRepository.findOne({ 
      where: { sessionId, currentModule: module } 
    });

    if (!session) {
      session = this.sessionRepository.create({
        sessionId,
        userId: 'current-user', // TODO: Get from auth context
        currentModule: module,
        context: {},
        chatHistory: []
      });
    }

    return session;
  }

  async getSessionHistory(sessionId: string, module: string) {
    const session = await this.sessionRepository.findOne({
      where: { sessionId, currentModule: module }
    });
    return session?.chatHistory || [];
  }
}