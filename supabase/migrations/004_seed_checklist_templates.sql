-- ============================================================
-- 004_seed_checklist_templates.sql — Phase 1, Step 1.2
-- Seeds the checklist_templates table with the deduplicated
-- PC Checklist (CDMX Protección Civil + Espectáculos Públicos)
-- and the Production Checklist.
-- Also seeds the triggers table for post-layout cascade.
-- ============================================================

-- ============================================================
-- LAYER A: PC CHECKLIST (government compliance)
-- Deduplicated: one task per document even when required by
-- both Espectáculos Públicos and Protección Civil.
-- ============================================================

-- ------------------------------------------------------------
-- Section: Trámites Gobierno
-- Government permits, filings, and authorizations
-- ------------------------------------------------------------

INSERT INTO checklist_templates (layer, section, title, description, default_responsible_role, default_days_before, condition_key, sort_order) VALUES

-- Core permits (always required unless venue handles permitting)
('pc', 'Trámites Gobierno', 'Aviso de Espectáculo Público',
 'Presentar aviso ante la Alcaldía correspondiente. Incluye datos del evento, aforo, fecha, horario. Alimenta expediente de Espectáculos Públicos y Protección Civil.',
 'gestor', 30, 'IF_NOT_VENUE_PERMITTING', 100),

('pc', 'Trámites Gobierno', 'Programa Interno de Protección Civil (PIPC)',
 'Documento que describe medidas de prevención, auxilio y recuperación. Debe estar autorizado por la Unidad de PC de la Alcaldía. Incluye análisis de riesgos, rutas de evacuación, directorio de emergencia.',
 'gestor', 30, 'IF_NOT_VENUE_PERMITTING', 110),

('pc', 'Trámites Gobierno', 'Visto Bueno de Protección Civil',
 'Autorización de la Unidad de Protección Civil de la Alcaldía. Requiere inspección previa del inmueble y revisión del PIPC.',
 'gestor', 21, 'IF_NOT_VENUE_PERMITTING', 120),

('pc', 'Trámites Gobierno', 'Permiso de Espectáculos Públicos',
 'Permiso formal emitido por la Alcaldía para realizar el evento. Requiere PIPC aprobado, póliza de seguro, y demás documentación.',
 'gestor', 14, 'IF_NOT_VENUE_PERMITTING', 130),

('pc', 'Trámites Gobierno', 'Póliza de Seguro de Responsabilidad Civil',
 'Seguro que cubra daños a terceros durante el evento. Monto según aforo y tipo de evento. Requerida por Espectáculos Públicos y Protección Civil.',
 'productor', 21, NULL, 140),

('pc', 'Trámites Gobierno', 'Uso de Suelo compatible',
 'Verificar que el inmueble cuente con uso de suelo compatible para eventos/espectáculos. Documento emitido por SEDUVI/Alcaldía.',
 'gestor', 30, 'IF_NOT_VENUE_PERMITTING', 150),

('pc', 'Trámites Gobierno', 'Aviso de Funcionamiento (SARE)',
 'Aviso ante el Sistema de Apertura Rápida de Empresas. Necesario si el venue no cuenta con uno vigente.',
 'gestor', 30, 'IF_NOT_VENUE_PERMITTING', 160),

('pc', 'Trámites Gobierno', 'Permiso de Venta de Alcohol',
 'Autorización para venta y consumo de bebidas alcohólicas en el evento. Tramitado ante la Alcaldía o Tesorería.',
 'gestor', 21, 'IF_NOT_VENUE_BARS', 170),

('pc', 'Trámites Gobierno', 'Permiso de Pirotecnia',
 'Permiso de SEDENA para uso de pirotecnia/efectos especiales con fuego. Requiere responsiva del pirotécnico certificado.',
 'gestor', 30, 'IF_HAS_PIROTECNIA', 180),

('pc', 'Trámites Gobierno', 'Permiso de Drones',
 'Autorización de AFAC/SCT para operación de drones durante el evento. Incluye plan de vuelo y seguro.',
 'gestor', 30, 'IF_HAS_DRONES', 190),

('pc', 'Trámites Gobierno', 'Permiso de Juegos Mecánicos',
 'Autorización especial para instalación y operación de juegos mecánicos. Requiere dictamen de seguridad estructural.',
 'gestor', 30, 'IF_HAS_JUEGOS_MECANICOS', 200),

('pc', 'Trámites Gobierno', 'Aviso de Cierre Vial (si aplica)',
 'Solicitud ante Secretaría de Movilidad/Alcaldía si el evento requiere cierre parcial o total de vialidades.',
 'gestor', 21, 'IF_HAS_CIERRE_VIAL', 210),

-- ------------------------------------------------------------
-- Section: Responsivas de Proveedores
-- Vendor compliance letters & certificates
-- ------------------------------------------------------------

('pc', 'Responsivas de Proveedores', 'Responsiva de Seguridad Privada',
 'Carta responsiva de la empresa de seguridad privada. Incluye registro vigente ante SSP, listado de elementos, y póliza de seguro.',
 'productor', 14, NULL, 300),

('pc', 'Responsivas de Proveedores', 'Responsiva de Servicio Médico',
 'Carta responsiva del proveedor de servicios médicos. Incluye registro sanitario, listado de personal y ambulancias, certificaciones vigentes.',
 'productor', 14, NULL, 310),

('pc', 'Responsivas de Proveedores', 'Responsiva de Extintores y Equipo Contra Incendio',
 'Carta responsiva del proveedor de extintores. Incluye certificado de recarga vigente, distribución en plano, y hoja de servicio.',
 'productor', 14, NULL, 320),

('pc', 'Responsivas de Proveedores', 'Responsiva de Sanitarios Portátiles',
 'Carta responsiva del proveedor de sanitarios. Incluye cantidad según aforo (norma), ubicación en plano, servicio de mantenimiento durante evento.',
 'productor', 14, NULL, 330),

('pc', 'Responsivas de Proveedores', 'Responsiva de Generadores Eléctricos',
 'Carta responsiva del proveedor de generadores. Incluye capacidad, certificación, plan de distribución eléctrica, y medidas de seguridad.',
 'productor', 14, 'IF_HAS_GENERADORES', 340),

('pc', 'Responsivas de Proveedores', 'Responsiva de Carpas y Estructuras Temporales',
 'Carta responsiva del proveedor de carpas/estructuras. Incluye dictamen de seguridad estructural, anclaje, y resistencia a viento.',
 'productor', 14, 'IF_HAS_CARPAS', 350),

('pc', 'Responsivas de Proveedores', 'Responsiva de Pirotecnia',
 'Carta responsiva del pirotécnico certificado. Incluye permiso SEDENA, certificación vigente, plan de efectos, y medidas de seguridad.',
 'productor', 14, 'IF_HAS_PIROTECNIA', 360),

('pc', 'Responsivas de Proveedores', 'Responsiva de Operador de Drones',
 'Carta responsiva del operador de drones. Incluye licencia AFAC, seguro, plan de vuelo, y medidas de seguridad.',
 'productor', 14, 'IF_HAS_DRONES', 370),

('pc', 'Responsivas de Proveedores', 'Responsiva de Juegos Mecánicos',
 'Carta responsiva del proveedor de juegos mecánicos. Incluye dictamen de seguridad, certificación, seguro, y plan de instalación.',
 'productor', 14, 'IF_HAS_JUEGOS_MECANICOS', 380),

('pc', 'Responsivas de Proveedores', 'Responsiva de DRO (Director Responsable de Obra)',
 'Carta responsiva del DRO para estructuras temporales. Certifica que la instalación cumple con normas de seguridad estructural.',
 'productor', 14, 'IF_HAS_ESTRUCTURAS_TEMPORALES', 390),

('pc', 'Responsivas de Proveedores', 'Contrato de Servicio de Ambulancias',
 'Contrato formal con proveedor de ambulancias. Incluye tipo de ambulancia, equipo, personal certificado, y tiempos de respuesta.',
 'productor', 14, NULL, 400),

('pc', 'Responsivas de Proveedores', 'Póliza de Seguro de Proveedores (compilado)',
 'Recopilar pólizas de seguro vigentes de todos los proveedores críticos. Verificar coberturas y vigencias.',
 'productor', 14, NULL, 410),

-- ------------------------------------------------------------
-- Section: Planos y Programas
-- Plans, layouts, and operational programs
-- ------------------------------------------------------------

('pc', 'Planos y Programas', 'Plano General del Evento (Layout)',
 'Plano a escala del venue con distribución de: escenario, barras, sanitarios, accesos, salidas de emergencia, zona médica, generadores, extintores. Base para todo el expediente.',
 'productor_tecnico', 21, NULL, 500),

('pc', 'Planos y Programas', 'Plano de Rutas de Evacuación',
 'Plano específico mostrando rutas de evacuación, puntos de reunión, señalización, y capacidad por salida. Requerido por PIPC.',
 'productor_tecnico', 21, NULL, 510),

('pc', 'Planos y Programas', 'Plano de Distribución de Seguridad',
 'Plano con ubicación de elementos de seguridad: filtros de acceso, posiciones fijas, rondines, centro de mando, CCTV.',
 'productor_tecnico', 14, NULL, 520),

('pc', 'Planos y Programas', 'Plano de Instalación Eléctrica',
 'Diagrama de distribución eléctrica: generadores, tableros, cableado, tierras físicas. Firmado por responsable eléctrico.',
 'productor_tecnico', 14, 'IF_HAS_GENERADORES', 530),

('pc', 'Planos y Programas', 'Plano de Rigging',
 'Plano de puntos de rigging, capacidades de carga, distribución de motores y estructuras suspendidas. Firmado por ingeniero estructural.',
 'productor_tecnico', 14, NULL, 540),

('pc', 'Planos y Programas', 'Programa de Protección Civil',
 'Documento operativo con procedimientos de emergencia: sismo, incendio, amenaza de bomba, disturbio, persona lesionada. Tiempos de respuesta y responsables.',
 'gestor', 21, NULL, 550),

('pc', 'Planos y Programas', 'Programa de Montaje y Desmontaje',
 'Cronograma de montaje (load-in) y desmontaje (load-out). Horarios, responsables por área, secuencia de operaciones.',
 'productor_tecnico', 14, NULL, 560),

('pc', 'Planos y Programas', 'Análisis de Riesgos',
 'Identificación y evaluación de riesgos del evento. Incluye matriz de riesgos, medidas de mitigación, y plan de contingencia. Parte del PIPC.',
 'gestor', 21, NULL, 570),

('pc', 'Planos y Programas', 'Directorio de Emergencia',
 'Listado de contactos de emergencia: bomberos, ambulancias, policía, hospital más cercano, responsables internos. Parte del PIPC.',
 'gestor', 14, NULL, 580),

('pc', 'Planos y Programas', 'Bitácora de Mantenimiento del Inmueble',
 'Registro de mantenimiento del venue: instalaciones eléctricas, hidráulicas, estructurales. Vigencia de certificaciones del inmueble.',
 'gestor', 21, 'IF_NOT_VENUE_PERMITTING', 590);


-- ============================================================
-- LAYER B: PRODUCTION CHECKLIST (operational)
-- ============================================================

-- ------------------------------------------------------------
-- Section: Bars & F&B
-- ------------------------------------------------------------

INSERT INTO checklist_templates (layer, section, title, description, default_responsible_role, default_days_before, condition_key, sort_order) VALUES

('production', 'Bars & F&B', 'Selección de Proveedor de Barras',
 'Cotizar y seleccionar proveedor de operación de barras. Definir modelo: operación propia, concesión, o híbrido.',
 'bar_ops_lead', 30, 'IF_NOT_VENUE_BARS', 1000),

('production', 'Bars & F&B', 'Menú y Carta de Bebidas',
 'Definir menú de alimentos y carta de bebidas. Incluye precios, presentación, y marcas patrocinadoras si aplica.',
 'bar_ops_lead', 21, 'IF_NOT_VENUE_BARS', 1010),

('production', 'Bars & F&B', 'Pedido de Insumos y Bebidas',
 'Orden de compra de bebidas alcohólicas, no alcohólicas, hielo, desechables, y alimentos. Basado en proyección de venta por aforo.',
 'bar_ops_lead', 10, 'IF_NOT_VENUE_BARS', 1020),

('production', 'Bars & F&B', 'Staff de Barras (bartenders, barbacks, cajeros)',
 'Confirmar equipo de barras: bartenders, barbacks, cajeros, coordinador. Horarios y roles asignados.',
 'bar_ops_lead', 10, 'IF_NOT_VENUE_BARS', 1030),

('production', 'Bars & F&B', 'Montaje de Barras y Puntos de Venta',
 'Definir ubicación de barras en layout. Incluye mobiliario, refrigeración, punto de agua, electricidad, y señalización.',
 'bar_ops_lead', 7, 'IF_NOT_VENUE_BARS', 1040),

('production', 'Bars & F&B', 'Sistema de Cobro (POS / cashless)',
 'Configurar sistema de punto de venta. Terminales, sistema cashless (pulseras), o efectivo. Pruebas previas al evento.',
 'bar_ops_lead', 7, 'IF_NOT_VENUE_BARS', 1050),

('production', 'Bars & F&B', 'Catering / Hospitality Backstage',
 'Coordinar catering para artistas, crew, y staff backstage. Riders técnicos, horarios de servicio, restricciones alimentarias.',
 'hospitality_lead', 14, NULL, 1060),

-- ------------------------------------------------------------
-- Section: Access & Ticketing
-- ------------------------------------------------------------

('production', 'Access & Ticketing', 'Selección de Plataforma de Boletos',
 'Definir y configurar plataforma de venta de boletos. Precios, fases de venta, categorías, código de descuento.',
 'promotor', 45, 'IF_NOT_VENUE_TICKETING', 1100),

('production', 'Access & Ticketing', 'Configuración de Venta de Boletos',
 'Alta del evento en plataforma. Fases de preventa, venta general, precios por categoría, límites de compra.',
 'promotor', 30, 'IF_NOT_VENUE_TICKETING', 1110),

('production', 'Access & Ticketing', 'Plan de Accesos y Filtros',
 'Definir puntos de acceso, filtros de seguridad, carriles VIP/General, protocolos de revisión. Reflejado en layout.',
 'access_coordinator', 14, NULL, 1120),

('production', 'Access & Ticketing', 'Credenciales y Pulseras',
 'Diseño, producción, y distribución de credenciales (staff, prensa, artistas, VIP) y pulseras de acceso.',
 'access_coordinator', 10, NULL, 1130),

('production', 'Access & Ticketing', 'Listas de Acceso (guestlist, prensa, VIP)',
 'Compilar y cerrar listas de acceso: cortesías, prensa, VIP, artistas, staff. Definir corte y formato de entrega.',
 'access_coordinator', 5, NULL, 1140),

('production', 'Access & Ticketing', 'Staff de Accesos',
 'Confirmar equipo de accesos: checadores, escaneo de boletos, coordinador de listas, personal de filtro.',
 'access_coordinator', 7, NULL, 1150),

-- ------------------------------------------------------------
-- Section: Brands & Partnerships
-- ------------------------------------------------------------

('production', 'Brands & Partnerships', 'Confirmación de Patrocinadores',
 'Cerrar acuerdos con marcas patrocinadoras. Definir entregables: logos, activaciones, producto, presupuesto.',
 'brand_coordinator', 30, 'IF_HAS_SPONSORS', 1200),

('production', 'Brands & Partnerships', 'Activaciones de Marca (diseño y montaje)',
 'Coordinar diseño, producción, y montaje de activaciones de marca en sitio. Ubicaciones en layout aprobadas.',
 'brand_coordinator', 14, 'IF_HAS_SPONSORS', 1210),

('production', 'Brands & Partnerships', 'Entregables de Patrocinio (logos, menciones)',
 'Asegurar cumplimiento de entregables contractuales: logos en materiales, menciones en redes, branding en sitio.',
 'brand_coordinator', 7, 'IF_HAS_SPONSORS', 1220),

('production', 'Brands & Partnerships', 'Coordinación de Hospitality para Marcas',
 'Áreas VIP, mesas reservadas, amenidades para invitados de patrocinadores. Coordinación con hospitality.',
 'hospitality_lead', 7, 'IF_HAS_SPONSORS', 1230),

-- ------------------------------------------------------------
-- Section: Producción Técnica
-- ------------------------------------------------------------

('production', 'Producción Técnica', 'Rider Técnico del Artista',
 'Recibir, revisar, y confirmar rider técnico. Coordinar con productor técnico y proveedor de audio/iluminación.',
 'productor_tecnico', 30, NULL, 1300),

('production', 'Producción Técnica', 'Contratación de Audio e Iluminación',
 'Cotizar y contratar proveedor de audio e iluminación. Basado en rider técnico y características del venue.',
 'productor_tecnico', 21, NULL, 1310),

('production', 'Producción Técnica', 'Backline y Equipo Adicional',
 'Confirmar backline (instrumentos, amplificadores, DJ equipment) según rider. Coordinar entrega y pruebas.',
 'productor_tecnico', 14, NULL, 1320),

('production', 'Producción Técnica', 'Escenografía y Producción Visual',
 'Diseño y producción de elementos escenográficos, pantallas LED, visuales, mapping. Coordinación de montaje.',
 'productor_tecnico', 14, NULL, 1330),

('production', 'Producción Técnica', 'Plan de Montaje Técnico (load-in)',
 'Cronograma detallado de montaje técnico: horarios por proveedor, secuencia, requerimientos de acceso y electricidad.',
 'productor_tecnico', 7, NULL, 1340),

('production', 'Producción Técnica', 'Prueba de Sonido / Soundcheck',
 'Programar y coordinar soundcheck. Horarios por artista, ingeniero de sonido, protocolo de prueba.',
 'productor_tecnico', 3, NULL, 1350),

('production', 'Producción Técnica', 'Plan de Desmontaje (load-out)',
 'Cronograma de desmontaje post-evento. Secuencia, responsables, horarios de retiro de equipo, limpieza.',
 'productor_tecnico', 3, NULL, 1360),

-- ------------------------------------------------------------
-- Section: Post-Layout Cascade
-- These tasks are created by triggers when "Layout aprobado"
-- moves to 'ok'. They also exist as templates for reference.
-- ------------------------------------------------------------

('production', 'Post-Layout Cascade', 'Layout aprobado',
 'El plano general del evento ha sido revisado y aprobado por todos los involucrados. Milestone que dispara la cascada de tareas finales.',
 'productor_tecnico', 14, NULL, 1400),

('production', 'Post-Layout Cascade', 'Confirmación Final de Proveedores',
 'Confirmar con todos los proveedores: fechas, horarios, cantidades, ubicaciones (basadas en layout aprobado). Última oportunidad de ajustes.',
 'productor', 7, NULL, 1410),

('production', 'Post-Layout Cascade', 'Negociaciones Finales',
 'Cerrar negociaciones pendientes con proveedores. Firmar contratos, confirmar precios, y definir condiciones de pago.',
 'productor', 7, NULL, 1420),

('production', 'Post-Layout Cascade', 'Manual de Producción',
 'Documento maestro del evento: contactos, horarios, planos, protocolos, asignaciones. Distribuido a todo el equipo.',
 'productor', 5, NULL, 1430),

('production', 'Post-Layout Cascade', 'Minuto x Minuto Final',
 'Cronograma detallado del día del evento. Desde load-in hasta load-out: horarios exactos, responsables, contingencias.',
 'productor', 3, NULL, 1440),

('production', 'Post-Layout Cascade', 'Distribución de Credenciales',
 'Producción y distribución de credenciales finales a staff, proveedores, artistas, prensa, VIP. Basado en listas cerradas.',
 'access_coordinator', 3, NULL, 1450);


-- ============================================================
-- TRIGGERS — Post-Layout Cascade
-- When "Layout aprobado" → ok, create downstream tasks
-- ============================================================

-- We use a DO block to look up template IDs by title and wire
-- the trigger relationships without hardcoding UUIDs.
DO $$
DECLARE
  v_layout_id UUID;
  v_confirm_id UUID;
  v_negociaciones_id UUID;
  v_manual_id UUID;
  v_mxm_id UUID;
  v_credenciales_id UUID;
BEGIN
  SELECT id INTO v_layout_id FROM checklist_templates
    WHERE title = 'Layout aprobado' AND layer = 'production';
  SELECT id INTO v_confirm_id FROM checklist_templates
    WHERE title = 'Confirmación Final de Proveedores' AND layer = 'production';
  SELECT id INTO v_negociaciones_id FROM checklist_templates
    WHERE title = 'Negociaciones Finales' AND layer = 'production';
  SELECT id INTO v_manual_id FROM checklist_templates
    WHERE title = 'Manual de Producción' AND layer = 'production';
  SELECT id INTO v_mxm_id FROM checklist_templates
    WHERE title = 'Minuto x Minuto Final' AND layer = 'production';
  SELECT id INTO v_credenciales_id FROM checklist_templates
    WHERE title = 'Distribución de Credenciales' AND layer = 'production';

  INSERT INTO triggers (trigger_task_template_id, creates_task_template_id) VALUES
    (v_layout_id, v_confirm_id),
    (v_layout_id, v_negociaciones_id),
    (v_layout_id, v_manual_id),
    (v_layout_id, v_mxm_id),
    (v_layout_id, v_credenciales_id);
END $$;
