
import { useEffect, useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import "./App.css";

const API = "http://localhost:8080";

// Convierte los datos recibidos del BCRP para utilizarlos en los gráficos.
function convertirSerie(datos) {
  if (!datos?.periods) return [];

  return datos.periods
    .map((periodo) => {
      const valorOriginal = periodo.values?.[0];
      const valor = Number(valorOriginal);

      if (
        valorOriginal === "n.d." ||
        valorOriginal === undefined ||
        valorOriginal === null ||
        !Number.isFinite(valor)
      ) {
        return null;
      }

      return {
        periodo: periodo.name,
        valor,
      };
    })
    .filter(Boolean);
}

function App() {
  const [tipoCambio, setTipoCambio] = useState(null);
  const [inflacion, setInflacion] = useState(null);
  const [gastos, setGastos] = useState([]);

  const [cargando, setCargando] = useState(true);
  const [errores, setErrores] = useState([]);

  // Estados independientes para la consulta del MEF.
  const [departamento, setDepartamento] = useState("AREQUIPA");
  const [cargandoMef, setCargandoMef] = useState(false);
  const [errorMef, setErrorMef] = useState("");

  // Consulta los servicios del BCRP.
  useEffect(() => {
    async function cargarDatos() {
      const fallos = [];

      const consultas = [
        {
          nombre: "Tipo de cambio",
          url: `${API}/api/bcrp/tipo-cambio`,
          guardar: setTipoCambio,
        },
        {
          nombre: "Inflación",
          url: `${API}/api/bcrp/inflacion`,
          guardar: setInflacion,
        },
      ];

      for (const consulta of consultas) {
        try {
          const respuesta = await fetch(consulta.url);

          if (!respuesta.ok) {
            throw new Error(`HTTP ${respuesta.status}`);
          }

          const datos = await respuesta.json();
          consulta.guardar(datos);
        } catch (error) {
          console.error(`Error en ${consulta.nombre}:`, error);
          fallos.push(consulta.nombre);
        }
      }

      setErrores(fallos);
      setCargando(false);
    }

    cargarDatos();
  }, []);

  // Consulta el MEF según el departamento seleccionado.
  useEffect(() => {
    async function cargarGastos() {
      setCargandoMef(true);
      setErrorMef("");

      try {
        const url = departamento
          ? `${API}/api/mef/ejecucion-gasto?departamento=${encodeURIComponent(departamento)}`
          : `${API}/api/mef/ejecucion-gasto`;

        const respuesta = await fetch(url);

        if (!respuesta.ok) {
          throw new Error(`Error HTTP ${respuesta.status}`);
        }

        const datos = await respuesta.json();

        setGastos(datos.records || []);
      } catch (error) {
        console.error("Error al consultar el MEF:", error);
        setGastos([]);
        setErrorMef("No se pudo consultar la información del MEF.");
      } finally {
        setCargandoMef(false);
      }
    }

    cargarGastos();
  }, [departamento]);

  // Preparación de las series históricas.
  const datosTipoCambio = convertirSerie(tipoCambio);
  const datosInflacion = convertirSerie(inflacion);

  const ultimoTipoCambio = datosTipoCambio.at(-1)?.valor;
  const ultimaInflacion = datosInflacion.at(-1)?.valor;

  const periodoTipoCambio = datosTipoCambio.at(-1)?.periodo;
  const periodoInflacion = datosInflacion.at(-1)?.periodo;

  // Calcula la variación entre los dos últimos periodos.
  const calcularVariacion = (serie) => {
    if (serie.length < 2) return null;

    const anterior = serie[serie.length - 2].valor;
    const actual = serie[serie.length - 1].valor;
    const diferencia = actual - anterior;

    return {
      anterior,
      actual,
      diferencia,
      porcentaje:
        anterior !== 0
          ? (diferencia / Math.abs(anterior)) * 100
          : null,
      tendencia:
        diferencia > 0
          ? "aumentó"
          : diferencia < 0
            ? "disminuyó"
            : "se mantuvo",
    };
  };

  const variacionTipoCambio = calcularVariacion(datosTipoCambio);
  const variacionInflacion = calcularVariacion(datosInflacion);

  // Se muestran los últimos 24 periodos disponibles.
  const registrosGraficoTipoCambio = datosTipoCambio.slice(-24);
  const registrosGraficoInflacion = datosInflacion.slice(-24);

  // Formato de números.
  const formatoNumero = (numero) =>
    numero === undefined || numero === null
      ? "Sin datos"
      : numero.toLocaleString("es-PE", {
          maximumFractionDigits: 3,
        });

  // Formato de moneda peruana.
  const formatoMoneda = (numero) =>
    Number(numero || 0).toLocaleString("es-PE", {
      style: "currency",
      currency: "PEN",
      minimumFractionDigits: 2,
    });

  return (
    <div className="app">
      {/* MENÚ LATERAL */}
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">P</div>
          <div>
            <strong>MACRODATA</strong>
            <span>PERÚ</span>
          </div>
        </div>

        <p className="menu-label">MENÚ PRINCIPAL</p>

        <nav>
          <a className="nav-link active" href="#inicio">
            ▦ Dashboard
          </a>
          <a className="nav-link" href="#cambio">
            ↗ Tipo de cambio
          </a>
          <a className="nav-link" href="#inflacion">
            ◉ Inflación
          </a>
          <a className="nav-link" href="#graficos">
            ▥ Estadísticas
          </a>
          <a className="nav-link" href="#mef">
            ▤ Inversión pública
          </a>
        </nav>

        <div className="sidebar-footer">
          <span className="status-dot"></span>
          Sistema de información
          <small>Datos del BCRP y MEF</small>
        </div>
      </aside>

      {/* CONTENIDO PRINCIPAL */}
      <main className="main-content" id="inicio">

        {/* ENCABEZADO */}
        <header className="topbar">
          <div>
            <span className="breadcrumb">
              PLATAFORMA / DASHBOARD
            </span>
            <h1>Panel de análisis económico</h1>
            <p>
              Indicadores macroeconómicos y ejecución de inversión pública del Perú.
            </p>
          </div>

          <div className="date-label">PERÚ · 2026</div>
        </header>

        {/* BIENVENIDA */}
        <section className="welcome">
          <div>
            <span className="eyebrow">
              CENTRO DE INFORMACIÓN ECONÓMICA
            </span>
            <h2>Bienvenido al panel macroeconómico</h2>
            <p>
              Consulta información económica y presupuestaria desde fuentes oficiales.
            </p>
          </div>

          <div className="welcome-symbol">PE</div>
        </section>

        {/* 1. INDICADORES PRINCIPALES */}
        <section className="section-heading">
          <div>
            <h2>Indicadores principales</h2>
            <p>
              Información obtenida de los servicios del BCRP y MEF.
            </p>
          </div>
          <span className="source-tag">FUENTES OFICIALES</span>
        </section>

        <section className="indicators">
          <article className="indicator-card" id="cambio">
            <div className="card-top">
              <span>Tipo de cambio</span>
              <span className="card-icon blue">＄</span>
            </div>

            <h3>
              {cargando ? "..." : formatoNumero(ultimoTipoCambio)}
            </h3>

            <p>S/ por dólar estadounidense</p>
            <small>
              Último periodo: {periodoTipoCambio || "Pendiente"}
            </small>
          </article>

          <article className="indicator-card" id="inflacion">
            <div className="card-top">
              <span>Inflación</span>
              <span className="card-icon purple">％</span>
            </div>

            <h3>
              {cargando ? "..." : formatoNumero(ultimaInflacion)}
            </h3>

            <p>Valor de la serie consultada</p>
            <small>
              Último periodo: {periodoInflacion || "Pendiente"}
            </small>
          </article>

          <article className="indicator-card" id="mef">
            <div className="card-top">
              <span>Ejecución presupuestaria</span>
              <span className="card-icon green">▤</span>
            </div>

            <h3>{cargandoMef ? "..." : gastos.length}</h3>
            <p>Registros recibidos del MEF</p>
            <small>
              {departamento || "Todos los departamentos"}
            </small>
          </article>
        </section>

        {/* 2. ANÁLISIS ESTADÍSTICO */}
        <section className="section-heading" id="graficos">
          <div>
            <h2>Análisis estadístico</h2>
            <p>
              Evolución histórica según las series recibidas del BCRP.
            </p>
          </div>
          <span className="source-tag">ÚLTIMOS 24 PERIODOS</span>
        </section>

        <section className="charts-grid">
          {/* GRÁFICO TIPO DE CAMBIO */}
          <article className="chart-card">
            <h3>Evolución del tipo de cambio</h3>
            <p>Serie histórica del tipo de cambio (S/ por US$).</p>

            {registrosGraficoTipoCambio.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={registrosGraficoTipoCambio}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="periodo"
                    tick={{ fontSize: 10 }}
                  />
                  <YAxis
                    domain={["auto", "auto"]}
                    tick={{ fontSize: 11 }}
                  />
                  <Tooltip />
                  <Legend />

                  <Line
                    type="monotone"
                    dataKey="valor"
                    name="Tipo de cambio"
                    stroke="#2587ce"
                    strokeWidth={3}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="chart-empty">
                No hay datos disponibles para el gráfico.
              </p>
            )}
          </article>

          {/* GRÁFICO SERIE DE INFLACIÓN */}
          <article className="chart-card">
            <h3>Evolución de la serie de inflación</h3>
            <p>Serie histórica consultada en el BCRP.</p>

            {registrosGraficoInflacion.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={registrosGraficoInflacion}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="periodo"
                    tick={{ fontSize: 10 }}
                  />
                  <YAxis
                    domain={["auto", "auto"]}
                    tick={{ fontSize: 11 }}
                  />
                  <Tooltip />
                  <Legend />

                  <Line
                    type="monotone"
                    dataKey="valor"
                    name="Serie consultada"
                    stroke="#8b62d9"
                    strokeWidth={3}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="chart-empty">
                No hay datos disponibles para el gráfico.
              </p>
            )}
          </article>
        </section>

        {/* 3. ANÁLISIS E INTERPRETACIÓN */}
        <section className="section-heading" id="analisis">
          <div>
            <h2>Análisis e interpretación de indicadores</h2>
            <p>
              Comparación automática con el periodo anterior.
            </p>
          </div>
          <span className="source-tag">ANÁLISIS AUTOMÁTICO</span>
        </section>

        <section className="analysis-grid">
          {/* ANÁLISIS TIPO DE CAMBIO */}
          <article className="analysis-card">
            <span className="analysis-label">TIPO DE CAMBIO</span>

            <h3>
              {variacionTipoCambio
                ? variacionTipoCambio.tendencia.toUpperCase()
                : "Sin datos suficientes"}
            </h3>

            <p>
              {variacionTipoCambio
                ? `El tipo de cambio ${variacionTipoCambio.tendencia} respecto al periodo anterior.`
                : "Se necesitan al menos dos periodos para comparar."}
            </p>

            {variacionTipoCambio && (
              <small>
                Variación: {formatoNumero(variacionTipoCambio.diferencia)} S/
              </small>
            )}
          </article>

          {/* ANÁLISIS SERIE DE INFLACIÓN */}
          <article className="analysis-card">
            <span className="analysis-label">
              SERIE DE INFLACIÓN CONSULTADA
            </span>

            <h3>
              {variacionInflacion
                ? variacionInflacion.tendencia.toUpperCase()
                : "Sin datos suficientes"}
            </h3>

            <p>
              {variacionInflacion
                ? `El valor de la serie ${variacionInflacion.tendencia} frente al periodo anterior.`
                : "Se necesitan al menos dos periodos para comparar."}
            </p>

            {variacionInflacion && (
              <small>
                Variación: {formatoNumero(variacionInflacion.diferencia)} puntos de la serie
              </small>
            )}
          </article>

          {/* ANÁLISIS MEF */}
          <article className="analysis-card">
            <span className="analysis-label">
              EJECUCIÓN DEL GASTO - MEF
            </span>

            <h3>
              {cargandoMef
                ? "Consultando..."
                : `${gastos.length} registros`}
            </h3>

            <p>
              Registros recibidos desde el servicio de consulta del MEF para{" "}
              {departamento || "todos los departamentos"}.
            </p>

            <small>
              {cargandoMef
                ? "Consultando información..."
                : errorMef
                  ? "No se pudo completar la consulta."
                  : gastos.length > 0
                    ? "Consulta recibida correctamente."
                    : "No se recibieron registros."}
            </small>
          </article>
        </section>

        {/* 4. SERVICIOS INSTITUCIONALES */}
        <section className="section-heading">
          <div>
            <h2>Servicios institucionales</h2>
            <p>
              Conexión con las fuentes oficiales de información.
            </p>
          </div>
        </section>

        <section className="services">
          <article className="service-card">
            <div className="service-logo bcrp">BCRP</div>

            <div>
              <h3>Banco Central de Reserva del Perú</h3>
              <p>
                Consulta de indicadores de tipo de cambio e inflación.
              </p>

              <span className="service-status">
                {cargando
                  ? "Consultando..."
                  : errores.includes("Tipo de cambio") ||
                    errores.includes("Inflación")
                    ? "Revisar conexión"
                    : "Consulta completada"}
              </span>
            </div>
          </article>

          <article className="service-card">
            <div className="service-logo mef">MEF</div>

            <div>
              <h3>Ministerio de Economía y Finanzas</h3>
              <p>
                Consulta de registros de ejecución del gasto público.
              </p>

              <span className="service-status">
                {cargandoMef
                  ? "Consultando..."
                  : errorMef
                    ? "Revisar conexión"
                    : "Consulta completada"}
              </span>
            </div>
          </article>
        </section>

        {/* 5. REGISTROS DE EJECUCIÓN DEL GASTO */}
        <section className="section-heading">
          <div>
            <h2>Registros de ejecución del gasto</h2>
            <p>
              Consulta de ejecución presupuestal por departamento mediante el MEF.
            </p>
          </div>

          {/* SELECTOR DE DEPARTAMENTO */}
          <div className="department-filter">
            <label htmlFor="departamento">
              Departamento:
            </label>

            <select
              id="departamento"
              value={departamento}
              onChange={(e) => setDepartamento(e.target.value)}
            >
              <option value="">Todos los departamentos</option>
              <option value="AMAZONAS">Amazonas</option>
              <option value="ANCASH">Áncash</option>
              <option value="APURIMAC">Apurímac</option>
              <option value="AREQUIPA">Arequipa</option>
              <option value="AYACUCHO">Ayacucho</option>
              <option value="CAJAMARCA">Cajamarca</option>
              <option value="CALLAO">Callao</option>
              <option value="CUSCO">Cusco</option>
              <option value="HUANCAVELICA">Huancavelica</option>
              <option value="HUANUCO">Huánuco</option>
              <option value="ICA">Ica</option>
              <option value="JUNIN">Junín</option>
              <option value="LA LIBERTAD">La Libertad</option>
              <option value="LAMBAYEQUE">Lambayeque</option>
              <option value="LIMA">Lima</option>
              <option value="LORETO">Loreto</option>
              <option value="MADRE DE DIOS">Madre de Dios</option>
              <option value="MOQUEGUA">Moquegua</option>
              <option value="PASCO">Pasco</option>
              <option value="PIURA">Piura</option>
              <option value="PUNO">Puno</option>
              <option value="SAN MARTIN">San Martín</option>
              <option value="TACNA">Tacna</option>
              <option value="TUMBES">Tumbes</option>
              <option value="UCAYALI">Ucayali</option>
            </select>
          </div>
        </section>

        {/* TABLA DE REGISTROS DEL MEF */}
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Entidad ejecutora</th>
                <th>Departamento</th>
                <th>Año</th>
                <th>Gasto devengado anual</th>
              </tr>
            </thead>

            <tbody>
              {gastos.slice(0, 5).map((registro, indice) => (
                <tr key={indice}>
                  <td>
                    {registro.EJECUTORA_NOMBRE || "No disponible"}
                  </td>

                  <td>
                    {registro.DEPARTAMENTO_EJECUTORA_NOMBRE || "No disponible"}
                  </td>

                  <td>
                    {registro.ANO_EJE || "No disponible"}
                  </td>

                  <td>
                    {formatoMoneda(registro.MONTO_DEVENGADO_ANUAL)}
                  </td>
                </tr>
              ))}

              {!cargandoMef && !errorMef && gastos.length === 0 && (
                <tr>
                  <td colSpan="4">
                    No se recibieron registros del MEF.
                  </td>
                </tr>
              )}

              {cargandoMef && (
                <tr>
                  <td colSpan="4">
                    Cargando información del MEF...
                  </td>
                </tr>
              )}

              {errorMef && (
                <tr>
                  <td colSpan="4">
                    {errorMef}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* MENSAJE DE ERRORES DEL BCRP */}
        {errores.length > 0 && (
          <p className="warning">
            No se pudieron consultar algunos servicios:{" "}
            {errores.join(", ")}.
            Verifica que el backend esté ejecutándose.
          </p>
        )}

        {/* PIE DE PÁGINA */}
        <footer>
          Plataforma Web de Análisis Macroeconómico y Ejecución de Inversión Pública en el Perú.
          <span>
            Información consultada mediante servicios del BCRP y MEF.
          </span>
        </footer>

      </main>
    </div>
  );
}

export default App;
