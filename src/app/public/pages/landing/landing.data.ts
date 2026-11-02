export const problems = [
  {
    icon: 'rule',
    title: 'Diferencias de inventario',
    pain: '“El sistema dice 12 fundas, en el mostrador hay 9 y nadie sabe por qué.”',
    fix: 'Cada venta, compra, devolución y traslado deja un movimiento con fecha, usuario y sucursal.',
  },
  {
    icon: 'calculate',
    title: 'Cierres de caja complicados',
    pain: '“Al final del día sumo tickets, efectivo y notas sueltas para que cuadre.”',
    fix: 'La caja registra cada venta y movimiento; al cerrar comparas lo esperado contra lo contado.',
  },
  {
    icon: 'build_circle',
    title: 'Reparaciones sin seguimiento',
    pain: '“¿Ya quedó mi celular?” y la orden está en una libreta o en un papel perdido.',
    fix: 'Cada equipo tiene su orden con presupuesto, fotos, refacciones e historial de estados.',
  },
  {
    icon: 'hub',
    title: 'Información dispersa entre sucursales',
    pain: '“Cada tienda lleva su propia hoja de cálculo y nunca coinciden.”',
    fix: 'Todas tus sucursales trabajan sobre la misma información, con permisos por empleado.',
  },
];
export const features = [
  {
    icon: 'qr_code_scanner',
    group: 'Catálogo',
    title: 'Catálogo con variantes y códigos de barras',
    desc: 'Registra cada producto con sus variantes de color, capacidad o material, escanea códigos de barras e indica con qué modelos de celular es compatible.',
    tags: ['Variantes', 'Código de barras', 'Compatibilidad multimodelo'],
  },
  {
    icon: 'inventory_2',
    group: 'Inventario',
    title: 'Existencias por sucursal y ubicación',
    desc: 'Consulta cuánto hay en cada ubicación, revisa cada entrada y salida y haz conteos físicos para corregir diferencias con respaldo.',
    tags: ['Ubicaciones', 'Movimientos', 'Conteos'],
  },
  {
    icon: 'point_of_sale',
    group: 'Ventas',
    title: 'Punto de venta, comprobantes y devoluciones',
    desc: 'Vende escaneando o buscando por modelo, emite comprobantes y procesa devoluciones que regresan al inventario. Los pagos se registran en el sistema con el método que usó tu cliente.',
    tags: ['Comprobantes', 'Devoluciones', 'Registro de pagos'],
  },
  {
    icon: 'payments',
    group: 'Caja',
    title: 'Apertura, movimientos y cierre de caja',
    desc: 'Abre la caja con un fondo inicial, registra entradas y salidas de efectivo y ciérrala comparando lo esperado contra lo contado.',
    tags: ['Fondo inicial', 'Entradas y salidas', 'Corte de caja'],
  },
  {
    icon: 'local_shipping',
    group: 'Compras',
    title: 'Proveedores, compras y recepciones parciales',
    desc: 'Lleva tu lista de proveedores, genera órdenes de compra y recibe la mercancía por partes cuando no llega completa.',
    tags: ['Proveedores', 'Órdenes de compra', 'Recepción parcial'],
  },
  {
    icon: 'swap_horiz',
    group: 'Sucursales',
    title: 'Transferencias entre sucursales',
    desc: 'Envía mercancía de una sucursal a otra y sigue cada traslado desde que sale hasta que se recibe.',
    tags: ['Envío', 'En tránsito', 'Recepción'],
  },
  {
    icon: 'admin_panel_settings',
    group: 'Control',
    title: 'Reportes y permisos por empleado y sucursal',
    desc: 'Revisa ventas, existencias y caja por sucursal, y decide qué puede ver y hacer cada empleado y en qué sucursales.',
    tags: ['Reportes', 'Roles', 'Acceso por sucursal'],
  },
];
export const faqData = [
  {
    q: '¿Puedo administrar varias sucursales?',
    a: 'Sí. Puedes dar de alta varias sucursales, consultar las existencias de cada una, transferir mercancía entre ellas y revisar ventas y caja por sucursal desde la misma cuenta.',
  },
  {
    q: '¿Mis empleados pueden tener su propio acceso?',
    a: 'Sí. Cada empleado entra con su propio usuario. Tú decides qué puede ver y hacer y en qué sucursales, y sus operaciones quedan registradas a su nombre.',
  },
  {
    q: '¿Necesito conexión a internet?',
    a: 'Sí. Accs Control Cloud funciona en la nube y necesita conexión a internet para registrar operaciones y mantener la información de tus sucursales al día.',
  },
  {
    q: '¿Cómo cargo la información que ya tengo?',
    a: 'Puedes registrar tu catálogo y existencias iniciales desde el sistema durante la configuración. Cuéntanos en el formulario cómo llevas hoy tu información (libretas, hojas de cálculo u otro sistema) y lo revisamos contigo al aprobar tu acceso.',
  },
  {
    q: '¿Cómo solicito acceso?',
    a: 'Llena el formulario de esta página con tu nombre, correo, negocio y número de sucursales. El registro es por invitación: revisamos tu solicitud y te escribimos al correo que nos compartas.',
  },
];
