/* Generado por cotizador_defaults.py: parámetros por defecto del cotizador. */
/* eslint-disable */
export const QUOTER_DEFAULTS: any = {
  "version": 1,
  "vigencia": "octubre de 2026",
  "ley": {
    "smmlv": 1750905,
    "auxTransporte": 249095,
    "uvt": 52374,
    "jornadaSemanal": 42,
    "semanasMes": 4.33,
    "productividad": 78,
    "prestaciones": {
      "cesantias": 8.33,
      "interesesCesantias": 1,
      "prima": 8.33,
      "vacaciones": 4.17
    },
    "seguridadSocial": {
      "salud": 8.5,
      "pension": 12
    },
    "arl": {
      "I": 0.522,
      "II": 1.044,
      "III": 2.436,
      "IV": 4.35,
      "V": 6.96
    },
    "parafiscales": {
      "caja": 4,
      "icbf": 3,
      "sena": 2
    },
    "exoneracion114": true,
    "ibcContratista": 40
  },
  "empresa": {
    "gastosGenerales": 18,
    "margen": 25,
    "imprevistos": 10,
    "iva": 19,
    "ivaAplica": true,
    "ivaServiciosExternos": true,
    "recargoServicios": 10,
    "trm": 3900,
    "trmAutomatica": true,
    "retencionCliente": 3.5,
    "pagos": [
      30,
      40,
      30
    ],
    "nivelBase": "junior"
  },
  "roles": [
    {
      "id": "pm",
      "nombre": "Gestión del proyecto",
      "modalidad": "empleado",
      "arl": "I",
      "niveles": {
        "junior": 4000000,
        "semi": 7000000,
        "senior": 11000000
      }
    },
    {
      "id": "arq",
      "nombre": "Arquitectura y liderazgo técnico",
      "modalidad": "empleado",
      "arl": "I",
      "niveles": {
        "junior": 9000000,
        "semi": 13000000,
        "senior": 17000000
      },
      "nivelMinimo": "semi"
    },
    {
      "id": "ux",
      "nombre": "Diseño UX/UI",
      "modalidad": "contratista",
      "arl": "I",
      "niveles": {
        "junior": 4200000,
        "semi": 6500000,
        "senior": 9000000
      }
    },
    {
      "id": "front",
      "nombre": "Desarrollo frontend",
      "modalidad": "empleado",
      "arl": "I",
      "niveles": {
        "junior": 3000000,
        "semi": 6000000,
        "senior": 9000000
      }
    },
    {
      "id": "back",
      "nombre": "Desarrollo backend",
      "modalidad": "empleado",
      "arl": "I",
      "niveles": {
        "junior": 3500000,
        "semi": 7500000,
        "senior": 11500000
      }
    },
    {
      "id": "movil",
      "nombre": "Desarrollo móvil",
      "modalidad": "empleado",
      "arl": "I",
      "niveles": {
        "junior": 4000000,
        "semi": 6500000,
        "senior": 9500000
      }
    },
    {
      "id": "qa",
      "nombre": "Pruebas y calidad (QA)",
      "modalidad": "contratista",
      "arl": "I",
      "niveles": {
        "junior": 3300000,
        "semi": 5200000,
        "senior": 7800000
      }
    },
    {
      "id": "devops",
      "nombre": "Nube y DevOps",
      "modalidad": "contratista",
      "arl": "I",
      "niveles": {
        "junior": 6500000,
        "semi": 12000000,
        "senior": 19000000
      }
    },
    {
      "id": "datos",
      "nombre": "Datos e inteligencia artificial",
      "modalidad": "contratista",
      "arl": "I",
      "niveles": {
        "junior": 7200000,
        "semi": 11000000,
        "senior": 15600000
      }
    },
    {
      "id": "contenido",
      "nombre": "Diseño gráfico y contenido",
      "modalidad": "contratista",
      "arl": "I",
      "niveles": {
        "junior": 2300000,
        "semi": 3000000,
        "senior": 4500000
      }
    },
    {
      "id": "pauta",
      "nombre": "Pauta digital (trafficker)",
      "modalidad": "contratista",
      "arl": "I",
      "niveles": {
        "junior": 3200000,
        "semi": 4500000,
        "senior": 6500000
      }
    },
    {
      "id": "iot",
      "nombre": "Electrónica e IoT",
      "modalidad": "contratista",
      "arl": "II",
      "niveles": {
        "junior": 2900000,
        "semi": 5000000,
        "senior": 7200000
      }
    }
  ],
  "servicios": [
    {
      "id": "dominio",
      "nombre": "Dominio .com.co",
      "moneda": "COP",
      "precio": 90000,
      "periodo": "anual",
      "exterior": false
    },
    {
      "id": "hosting_web",
      "nombre": "Hosting del sitio (AWS Amplify)",
      "moneda": "USD",
      "precio": 8,
      "periodo": "mensual",
      "exterior": true
    },
    {
      "id": "nube_xs",
      "nombre": "Nube: servidor y base de datos (menos de 20 usuarios)",
      "moneda": "USD",
      "precio": 30,
      "periodo": "mensual",
      "exterior": true
    },
    {
      "id": "nube_s",
      "nombre": "Nube: servidor y base de datos (20 a 200 usuarios)",
      "moneda": "USD",
      "precio": 55,
      "periodo": "mensual",
      "exterior": true
    },
    {
      "id": "nube_m",
      "nombre": "Nube: servidor y base de datos (200 a 2.000 usuarios)",
      "moneda": "USD",
      "precio": 140,
      "periodo": "mensual",
      "exterior": true
    },
    {
      "id": "nube_l",
      "nombre": "Nube: servidor y base de datos (más de 2.000 usuarios)",
      "moneda": "USD",
      "precio": 380,
      "periodo": "mensual",
      "exterior": true
    },
    {
      "id": "correos",
      "nombre": "Correos transaccionales (AWS SES)",
      "moneda": "USD",
      "precio": 3,
      "periodo": "mensual",
      "exterior": true
    },
    {
      "id": "apple",
      "nombre": "Cuenta de desarrollador de Apple",
      "moneda": "USD",
      "precio": 99,
      "periodo": "anual",
      "exterior": true
    },
    {
      "id": "google_play",
      "nombre": "Cuenta de Google Play",
      "moneda": "USD",
      "precio": 25,
      "periodo": "unico",
      "exterior": true
    },
    {
      "id": "whatsapp",
      "nombre": "WhatsApp Business API (mensajes)",
      "moneda": "USD",
      "precio": 25,
      "periodo": "mensual",
      "exterior": true
    },
    {
      "id": "ia_s",
      "nombre": "Consumo del modelo de IA (menos de 500 al mes)",
      "moneda": "USD",
      "precio": 15,
      "periodo": "mensual",
      "exterior": true
    },
    {
      "id": "ia_m",
      "nombre": "Consumo del modelo de IA (500 a 5.000 al mes)",
      "moneda": "USD",
      "precio": 70,
      "periodo": "mensual",
      "exterior": true
    },
    {
      "id": "ia_l",
      "nombre": "Consumo del modelo de IA (más de 5.000 al mes)",
      "moneda": "USD",
      "precio": 300,
      "periodo": "mensual",
      "exterior": true
    },
    {
      "id": "mapas",
      "nombre": "Mapas y ubicación (Google Maps)",
      "moneda": "USD",
      "precio": 20,
      "periodo": "mensual",
      "exterior": true
    },
    {
      "id": "dian",
      "nombre": "Proveedor de facturación electrónica DIAN",
      "moneda": "COP",
      "precio": 60000,
      "periodo": "mensual",
      "exterior": false
    },
    {
      "id": "automatizacion",
      "nombre": "Servidor de automatizaciones",
      "moneda": "USD",
      "precio": 20,
      "periodo": "mensual",
      "exterior": true
    },
    {
      "id": "iot_nube",
      "nombre": "Nube IoT por dispositivo",
      "moneda": "USD",
      "precio": 1.5,
      "periodo": "mensual",
      "exterior": true
    },
    {
      "id": "iot_sim",
      "nombre": "Plan de datos (SIM) por dispositivo",
      "moneda": "COP",
      "precio": 15000,
      "periodo": "mensual",
      "exterior": false
    },
    {
      "id": "iot_equipo",
      "nombre": "Equipo IoT por dispositivo (sensor y tarjeta)",
      "moneda": "COP",
      "precio": 300000,
      "periodo": "unico",
      "exterior": false
    }
  ],
  "paquetes": {
    "web.landing": {
      "nombre": "Landing page",
      "horas": {
        "pm": [
          4,
          6,
          8
        ],
        "ux": [
          8,
          12,
          18
        ],
        "front": [
          16,
          24,
          36
        ],
        "contenido": [
          4,
          6,
          10
        ],
        "qa": [
          3,
          4,
          6
        ],
        "devops": [
          2,
          3,
          4
        ]
      }
    },
    "web.corporativa": {
      "nombre": "Sitio corporativo",
      "horas": {
        "pm": [
          6,
          10,
          14
        ],
        "ux": [
          14,
          20,
          30
        ],
        "front": [
          30,
          45,
          65
        ],
        "back": [
          4,
          8,
          12
        ],
        "contenido": [
          6,
          10,
          16
        ],
        "qa": [
          5,
          8,
          12
        ],
        "devops": [
          3,
          4,
          6
        ]
      }
    },
    "web.tienda": {
      "nombre": "Tienda en línea",
      "horas": {
        "pm": [
          10,
          15,
          22
        ],
        "ux": [
          20,
          30,
          45
        ],
        "front": [
          45,
          65,
          95
        ],
        "back": [
          20,
          30,
          45
        ],
        "contenido": [
          6,
          10,
          14
        ],
        "qa": [
          10,
          15,
          22
        ],
        "devops": [
          4,
          6,
          10
        ]
      }
    },
    "web.paginas.6-10": {
      "nombre": "Páginas adicionales (6 a 10)",
      "horas": {
        "ux": [
          6,
          10,
          14
        ],
        "front": [
          10,
          16,
          24
        ],
        "contenido": [
          4,
          6,
          10
        ]
      }
    },
    "web.paginas.11+": {
      "nombre": "Páginas adicionales (más de 10)",
      "horas": {
        "ux": [
          12,
          18,
          26
        ],
        "front": [
          20,
          32,
          48
        ],
        "contenido": [
          8,
          12,
          18
        ]
      }
    },
    "web.productos.51-500": {
      "nombre": "Carga de catálogo (51 a 500 productos)",
      "horas": {
        "contenido": [
          10,
          16,
          24
        ],
        "back": [
          2,
          4,
          6
        ]
      }
    },
    "web.productos.500+": {
      "nombre": "Carga de catálogo (más de 500 productos)",
      "horas": {
        "contenido": [
          20,
          30,
          45
        ],
        "back": [
          6,
          10,
          16
        ]
      }
    },
    "web.f.blog": {
      "nombre": "Blog o noticias",
      "horas": {
        "front": [
          4,
          6,
          10
        ],
        "back": [
          2,
          4,
          6
        ]
      }
    },
    "web.f.idiomas": {
      "nombre": "Varios idiomas",
      "horas": {
        "front": [
          6,
          10,
          14
        ],
        "contenido": [
          4,
          8,
          12
        ]
      }
    },
    "web.f.reservas": {
      "nombre": "Reservas o agenda",
      "horas": {
        "back": [
          10,
          16,
          24
        ],
        "front": [
          8,
          12,
          18
        ],
        "qa": [
          3,
          5,
          8
        ]
      }
    },
    "web.f.pagos": {
      "nombre": "Pagos en línea",
      "horas": {
        "back": [
          10,
          16,
          24
        ],
        "front": [
          4,
          6,
          10
        ],
        "qa": [
          4,
          6,
          10
        ]
      }
    },
    "web.f.clientes": {
      "nombre": "Área privada de clientes",
      "horas": {
        "back": [
          14,
          20,
          30
        ],
        "front": [
          10,
          16,
          24
        ],
        "qa": [
          4,
          6,
          10
        ]
      }
    },
    "web.f.chatia": {
      "nombre": "Chat con IA que responde",
      "horas": {
        "datos": [
          10,
          16,
          24
        ],
        "back": [
          4,
          6,
          10
        ],
        "front": [
          4,
          6,
          8
        ]
      }
    },
    "web.f.catalogo": {
      "nombre": "Catálogo conectado a redes",
      "horas": {
        "front": [
          3,
          5,
          8
        ],
        "back": [
          3,
          5,
          8
        ]
      }
    },
    "web.f.seo": {
      "nombre": "Posicionamiento SEO inicial",
      "horas": {
        "contenido": [
          6,
          10,
          14
        ],
        "front": [
          3,
          5,
          8
        ]
      }
    },
    "web.textos": {
      "nombre": "Redacción de textos",
      "horas": {
        "contenido": [
          8,
          12,
          18
        ]
      }
    },
    "web.marca": {
      "nombre": "Logo e identidad de marca",
      "horas": {
        "contenido": [
          16,
          24,
          36
        ],
        "ux": [
          4,
          6,
          8
        ]
      }
    },
    "app.base.webapp": {
      "nombre": "Base: inicio de sesión, panel de administración, primer módulo y publicación",
      "horas": {
        "pm": [
          24,
          36,
          50
        ],
        "arq": [
          12,
          18,
          26
        ],
        "ux": [
          30,
          45,
          65
        ],
        "front": [
          60,
          90,
          130
        ],
        "back": [
          60,
          90,
          130
        ],
        "qa": [
          20,
          30,
          45
        ],
        "devops": [
          10,
          14,
          20
        ]
      }
    },
    "app.base.movil": {
      "nombre": "Base: inicio de sesión, panel de administración, primer módulo y publicación",
      "horas": {
        "pm": [
          24,
          36,
          50
        ],
        "arq": [
          12,
          18,
          26
        ],
        "ux": [
          35,
          50,
          70
        ],
        "movil": [
          90,
          130,
          180
        ],
        "back": [
          60,
          90,
          130
        ],
        "qa": [
          25,
          40,
          55
        ],
        "devops": [
          12,
          16,
          24
        ]
      }
    },
    "app.base.pwa": {
      "nombre": "Base: inicio de sesión, panel de administración, primer módulo y publicación",
      "horas": {
        "pm": [
          24,
          36,
          50
        ],
        "arq": [
          12,
          18,
          26
        ],
        "ux": [
          30,
          45,
          65
        ],
        "front": [
          70,
          105,
          150
        ],
        "back": [
          60,
          90,
          130
        ],
        "qa": [
          22,
          32,
          48
        ],
        "devops": [
          10,
          14,
          20
        ]
      }
    },
    "app.movil.adicional": {
      "nombre": "App móvil sobre el mismo sistema",
      "horas": {
        "pm": [
          8,
          12,
          16
        ],
        "ux": [
          15,
          25,
          35
        ],
        "movil": [
          70,
          100,
          140
        ],
        "qa": [
          15,
          22,
          30
        ]
      }
    },
    "app.modulo": {
      "nombre": "Módulo",
      "horas": {
        "pm": [
          3,
          4,
          6
        ],
        "ux": [
          6,
          10,
          14
        ],
        "front": [
          12,
          20,
          30
        ],
        "back": [
          16,
          24,
          36
        ],
        "qa": [
          6,
          8,
          12
        ]
      }
    },
    "app.modulo.movil": {
      "nombre": "Módulo en la app móvil",
      "horas": {
        "movil": [
          10,
          16,
          24
        ]
      }
    },
    "app.roles.pocos": {
      "nombre": "Roles y permisos (2 o 3 tipos)",
      "horas": {
        "back": [
          8,
          12,
          18
        ],
        "front": [
          4,
          8,
          12
        ],
        "qa": [
          2,
          4,
          6
        ]
      }
    },
    "app.roles.detallado": {
      "nombre": "Permisos detallados por persona y sede",
      "horas": {
        "arq": [
          4,
          6,
          8
        ],
        "back": [
          20,
          30,
          45
        ],
        "front": [
          10,
          16,
          24
        ],
        "qa": [
          6,
          10,
          14
        ]
      }
    },
    "app.int.whatsapp": {
      "nombre": "Integración: WhatsApp",
      "horas": {
        "back": [
          14,
          20,
          30
        ],
        "qa": [
          3,
          5,
          8
        ]
      }
    },
    "app.int.pagos": {
      "nombre": "Integración: pagos en línea",
      "horas": {
        "back": [
          16,
          24,
          36
        ],
        "front": [
          4,
          6,
          10
        ],
        "qa": [
          4,
          6,
          10
        ]
      }
    },
    "app.int.dian": {
      "nombre": "Integración: facturación electrónica DIAN",
      "horas": {
        "back": [
          24,
          36,
          55
        ],
        "qa": [
          6,
          10,
          14
        ]
      }
    },
    "app.int.correo": {
      "nombre": "Integración: correos y SMS",
      "horas": {
        "back": [
          4,
          6,
          10
        ]
      }
    },
    "app.int.google": {
      "nombre": "Integración: Google (Maps, Calendar, Drive)",
      "horas": {
        "back": [
          8,
          12,
          18
        ],
        "front": [
          4,
          6,
          8
        ]
      }
    },
    "app.int.erp": {
      "nombre": "Integración: contabilidad o ERP",
      "horas": {
        "arq": [
          4,
          6,
          8
        ],
        "back": [
          24,
          36,
          55
        ],
        "qa": [
          6,
          8,
          12
        ]
      }
    },
    "app.int.api": {
      "nombre": "Integración: otra plataforma o API",
      "horas": {
        "back": [
          14,
          24,
          40
        ],
        "qa": [
          3,
          5,
          8
        ]
      }
    },
    "app.ia.chat": {
      "nombre": "IA: asistente que conversa",
      "horas": {
        "datos": [
          24,
          36,
          55
        ],
        "back": [
          8,
          12,
          18
        ],
        "front": [
          6,
          10,
          14
        ]
      }
    },
    "app.ia.voz": {
      "nombre": "IA: registrar con la voz",
      "horas": {
        "datos": [
          12,
          20,
          30
        ],
        "front": [
          6,
          8,
          12
        ]
      }
    },
    "app.ia.ocr": {
      "nombre": "IA: leer fotos de documentos",
      "horas": {
        "datos": [
          24,
          36,
          55
        ],
        "back": [
          8,
          12,
          18
        ]
      }
    },
    "app.ia.recomendaciones": {
      "nombre": "IA: recomendaciones",
      "horas": {
        "datos": [
          24,
          40,
          60
        ],
        "back": [
          8,
          12,
          18
        ]
      }
    },
    "app.ia.predicciones": {
      "nombre": "IA: predicciones y análisis",
      "horas": {
        "datos": [
          30,
          48,
          72
        ],
        "back": [
          8,
          12,
          18
        ],
        "front": [
          6,
          10,
          14
        ]
      }
    },
    "app.offline": {
      "nombre": "Funcionamiento sin internet",
      "horas": {
        "movil": [
          24,
          36,
          55
        ],
        "back": [
          8,
          12,
          18
        ],
        "qa": [
          6,
          10,
          14
        ]
      }
    },
    "app.migrar": {
      "nombre": "Migración de tu información",
      "horas": {
        "back": [
          8,
          14,
          24
        ],
        "datos": [
          4,
          8,
          12
        ],
        "qa": [
          2,
          4,
          6
        ]
      }
    },
    "app.datos_personales": {
      "nombre": "Protección de datos personales (Ley 1581 de 2012): política, avisos y autorizaciones",
      "horas": {
        "back": [
          4,
          6,
          10
        ],
        "front": [
          3,
          4,
          6
        ],
        "contenido": [
          3,
          4,
          6
        ]
      }
    },
    "auto.proceso": {
      "nombre": "Automatizar un proceso",
      "horas": {
        "pm": [
          3,
          4,
          6
        ],
        "arq": [
          2,
          3,
          4
        ],
        "back": [
          16,
          24,
          36
        ],
        "qa": [
          4,
          6,
          10
        ]
      }
    },
    "auto.contable": {
      "nombre": "Conexión con software contable",
      "horas": {
        "back": [
          10,
          16,
          24
        ]
      }
    },
    "auto.erp": {
      "nombre": "Conexión con ERP o CRM",
      "horas": {
        "back": [
          16,
          24,
          36
        ]
      }
    },
    "auto.papel": {
      "nombre": "Digitalizar el proceso en papel",
      "horas": {
        "ux": [
          4,
          6,
          8
        ],
        "front": [
          8,
          12,
          18
        ]
      }
    },
    "auto.ia.documentos": {
      "nombre": "IA que lee documentos",
      "horas": {
        "datos": [
          24,
          36,
          55
        ]
      }
    },
    "auto.ia.decisiones": {
      "nombre": "IA que clasifica y decide",
      "horas": {
        "datos": [
          30,
          45,
          65
        ]
      }
    },
    "ia.base": {
      "nombre": "Gestión, pruebas y puesta en marcha",
      "horas": {
        "pm": [
          6,
          10,
          14
        ],
        "qa": [
          4,
          6,
          10
        ],
        "devops": [
          4,
          6,
          8
        ]
      }
    },
    "ia.chatbot": {
      "nombre": "Atender clientes 24/7",
      "horas": {
        "datos": [
          30,
          45,
          65
        ],
        "back": [
          10,
          16,
          24
        ],
        "qa": [
          6,
          8,
          12
        ]
      }
    },
    "ia.interno": {
      "nombre": "Asistente con los documentos de tu empresa",
      "horas": {
        "datos": [
          40,
          60,
          85
        ],
        "back": [
          12,
          18,
          26
        ]
      }
    },
    "ia.ocr": {
      "nombre": "Leer documentos y fotos",
      "horas": {
        "datos": [
          30,
          45,
          65
        ],
        "back": [
          10,
          14,
          20
        ]
      }
    },
    "ia.clasificar": {
      "nombre": "Clasificar correos o solicitudes",
      "horas": {
        "datos": [
          24,
          36,
          50
        ],
        "back": [
          8,
          12,
          18
        ]
      }
    },
    "ia.predecir": {
      "nombre": "Predecir ventas o demanda",
      "horas": {
        "datos": [
          40,
          60,
          90
        ],
        "back": [
          8,
          12,
          18
        ]
      }
    },
    "ia.contenido": {
      "nombre": "Generar textos o contenido",
      "horas": {
        "datos": [
          16,
          24,
          36
        ],
        "back": [
          6,
          10,
          14
        ]
      }
    },
    "ia.voz": {
      "nombre": "Entender notas de voz",
      "horas": {
        "datos": [
          16,
          24,
          36
        ],
        "back": [
          6,
          10,
          14
        ]
      }
    },
    "ia.donde.existente": {
      "nombre": "Conexión con tu sistema",
      "horas": {
        "back": [
          10,
          16,
          26
        ]
      }
    },
    "ia.donde.whatsapp": {
      "nombre": "Conexión con WhatsApp",
      "horas": {
        "back": [
          14,
          20,
          30
        ]
      }
    },
    "ia.donde.web": {
      "nombre": "Conexión con tu página web",
      "horas": {
        "front": [
          6,
          10,
          14
        ]
      }
    },
    "ia.datos.sistema": {
      "nombre": "Organizar y preparar la información (desde tu sistema)",
      "horas": {
        "back": [
          6,
          10,
          16
        ],
        "datos": [
          4,
          8,
          12
        ]
      }
    },
    "ia.datos.nada": {
      "nombre": "Organizar y preparar la información (desde cero)",
      "horas": {
        "datos": [
          10,
          16,
          24
        ],
        "contenido": [
          6,
          10,
          16
        ]
      }
    },
    "iot.plataforma": {
      "nombre": "Plataforma: tablero en vivo, usuarios y alertas",
      "horas": {
        "pm": [
          12,
          18,
          24
        ],
        "ux": [
          12,
          18,
          26
        ],
        "front": [
          30,
          45,
          65
        ],
        "back": [
          30,
          45,
          65
        ],
        "devops": [
          10,
          14,
          20
        ],
        "qa": [
          10,
          15,
          22
        ]
      }
    },
    "iot.medicion": {
      "nombre": "Medición",
      "horas": {
        "iot": [
          12,
          18,
          26
        ],
        "back": [
          6,
          10,
          14
        ],
        "front": [
          4,
          6,
          10
        ]
      }
    },
    "iot.whatsapp": {
      "nombre": "Alertas por WhatsApp o SMS",
      "horas": {
        "back": [
          8,
          12,
          18
        ]
      }
    },
    "iot.reportes": {
      "nombre": "Reportes automáticos",
      "horas": {
        "back": [
          6,
          10,
          14
        ],
        "front": [
          4,
          6,
          10
        ]
      }
    },
    "iot.control": {
      "nombre": "Encender o apagar a distancia",
      "horas": {
        "iot": [
          14,
          20,
          30
        ],
        "back": [
          8,
          12,
          18
        ],
        "front": [
          4,
          6,
          10
        ]
      }
    },
    "iot.instalacion": {
      "nombre": "Configuración e instalación por dispositivo",
      "horas": {
        "iot": [
          1,
          1.5,
          2.5
        ]
      }
    },
    "pauta.montaje": {
      "nombre": "Montaje: cuentas, píxel, estrategia y primeras campañas",
      "horas": {
        "pauta": [
          10,
          16,
          24
        ],
        "contenido": [
          4,
          6,
          10
        ]
      }
    },
    "pauta.gestion": {
      "nombre": "Gestión y optimización mensual por canal",
      "horas": {
        "pauta": [
          14,
          20,
          28
        ],
        "pm": [
          2,
          3,
          4
        ]
      }
    },
    "pauta.piezas": {
      "nombre": "Diseño de piezas y videos al mes",
      "horas": {
        "contenido": [
          12,
          18,
          26
        ]
      }
    },
    "mejorar.auditoria": {
      "nombre": "Auditoría técnica (valor fijo, se descuenta si seguimos juntos)",
      "horas": {
        "arq": [
          8,
          12,
          18
        ],
        "back": [
          4,
          8,
          12
        ]
      }
    },
    "mejorar.fallas": {
      "nombre": "Corregir fallas y lentitud",
      "horas": {
        "back": [
          20,
          36,
          60
        ],
        "devops": [
          4,
          8,
          12
        ],
        "qa": [
          6,
          10,
          16
        ]
      }
    },
    "mejorar.funciones": {
      "nombre": "Nuevas funciones",
      "horas": {
        "back": [
          24,
          40,
          64
        ],
        "front": [
          12,
          20,
          32
        ],
        "qa": [
          6,
          10,
          16
        ]
      }
    },
    "mejorar.nube": {
      "nombre": "Migración a la nube",
      "horas": {
        "devops": [
          24,
          40,
          64
        ],
        "back": [
          8,
          16,
          24
        ]
      }
    },
    "mejorar.diseno": {
      "nombre": "Rediseño",
      "horas": {
        "ux": [
          16,
          24,
          36
        ],
        "front": [
          16,
          30,
          48
        ]
      }
    },
    "mejorar.ia": {
      "nombre": "Sumarle IA",
      "horas": {
        "datos": [
          24,
          36,
          55
        ],
        "back": [
          8,
          12,
          18
        ]
      }
    },
    "mejorar.movil": {
      "nombre": "App móvil para tu sistema",
      "horas": {
        "ux": [
          15,
          25,
          35
        ],
        "movil": [
          80,
          120,
          170
        ],
        "qa": [
          15,
          22,
          30
        ]
      }
    },
    "extra.capacitacion": {
      "nombre": "Capacitación a tu equipo",
      "horas": {
        "pm": [
          6,
          10,
          14
        ]
      }
    },
    "extra.analitica": {
      "nombre": "Analítica y métricas",
      "horas": {
        "front": [
          4,
          6,
          10
        ],
        "datos": [
          4,
          8,
          12
        ]
      }
    },
    "soporte.web": {
      "nombre": "Soporte y mantenimiento del sitio (al mes)",
      "horas": {
        "front": [
          2,
          3,
          5
        ],
        "devops": [
          1,
          1,
          2
        ]
      }
    },
    "soporte.app": {
      "nombre": "Soporte y mantenimiento (al mes)",
      "horas": {
        "back": [
          4,
          8,
          12
        ],
        "front": [
          2,
          4,
          6
        ],
        "devops": [
          2,
          3,
          4
        ],
        "qa": [
          1,
          2,
          3
        ]
      }
    }
  },
  "factores": {
    "diseno": {
      "limpio": 0.85,
      "marca": 1,
      "premium": 1.35
    },
    "usuarios": {
      "interna": 1,
      "clientes": 1.1,
      "ambos": 1.2
    },
    "cantidad": {
      "<20": 1,
      "20-200": 1.05,
      "200-2000": 1.15,
      "2000+": 1.3
    },
    "unaPlataforma": 0.85,
    "tengoDiseno": 0.4,
    "personasProceso": {
      "1": 1,
      "2-5": 1,
      "6-20": 1.15,
      "20+": 1.3
    },
    "plazo": {
      "calma": {
        "precio": 0.95,
        "dedicacion": 0.6
      },
      "normal": {
        "precio": 1,
        "dedicacion": 1
      },
      "urgente": {
        "precio": 1.12,
        "dedicacion": 2
      }
    },
    "dependencias": 1.3,
    "horasNivel": {
      "junior": 1.25,
      "semi": 1,
      "senior": 0.85
    },
    "iotDispositivos": {
      "1-5": 5,
      "6-20": 15,
      "21-100": 60,
      "100+": 120
    },
    "pautaMedios": {
      "<1M": [
        600000,
        1000000
      ],
      "1-3M": [
        1000000,
        3000000
      ],
      "3-10M": [
        3000000,
        10000000
      ],
      "10M+": [
        10000000,
        20000000
      ]
    },
    "costoHoraCliente": 18000,
    "automatizable": 70
  }
};
