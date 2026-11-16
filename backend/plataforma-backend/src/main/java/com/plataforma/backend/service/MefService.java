
package com.plataforma.backend.service;

import java.io.IOException;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.Map;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import org.springframework.stereotype.Service;

@Service
public class MefService {

    private static final String URL_BASE =
            "https://api.datosabiertos.mef.gob.pe/"
            + "DatosAbiertos/v1/datastore_search";

    private static final String RESOURCE_ID =
            "d8052fcc-f68d-465f-88f1-3ba226325bbf";

    private static final int LIMITE_PAGINA = 1000;
    private static final int MAX_REGISTROS = 200000;

    private final HttpClient cliente = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(30))
            .build();

    private final ObjectMapper mapper = new ObjectMapper();

    // Consulta existente utilizada por la tabla del frontend.
    public String consultarEjecucionGasto(String departamento)
            throws IOException, InterruptedException {

        String url = URL_BASE
                + "?resource_id=" + RESOURCE_ID
                + "&limit=100";

        if (departamento != null && !departamento.isBlank()) {

            String filtros = "{\"DEPARTAMENTO_EJECUTORA_NOMBRE\":\""
                    + escaparJson(departamento.trim().toUpperCase())
                    + "\"}";

            url += "&filters=" + codificar(filtros);
        }

        return enviarSolicitud(url);
    }

    // Consulta el resumen presupuestal por departamento y año.
    public Map<String, Object> consultarResumenEjecucion(
            String departamento, Integer anio)
            throws IOException, InterruptedException {

        if (anio == null || anio < 2000 || anio > 2100) {
            throw new IllegalArgumentException(
                    "El año indicado no es válido."
            );
        }

        String nombreDepartamento = departamento == null
                ? ""
                : departamento.trim().toUpperCase();

        String filtros;

        if (!nombreDepartamento.isBlank()) {

            filtros = "{\"DEPARTAMENTO_EJECUTORA_NOMBRE\":\""
                    + escaparJson(nombreDepartamento)
                    + "\",\"ANO_EJE\":\""
                    + anio
                    + "\"}";

        } else {

            filtros = "{\"ANO_EJE\":\"" + anio + "\"}";
        }

        String filtrosCodificados = codificar(filtros);

        BigDecimal totalPIA = BigDecimal.ZERO;
        BigDecimal totalPIM = BigDecimal.ZERO;
        BigDecimal totalDevengado = BigDecimal.ZERO;

        int offset = 0;
        int registrosProcesados = 0;
        int totalInformado = -1;

        // Recorrer todas las páginas de resultados.
        while (registrosProcesados < MAX_REGISTROS) {

            String url = URL_BASE
                    + "?resource_id=" + RESOURCE_ID
                    + "&limit=" + LIMITE_PAGINA
                    + "&offset=" + offset
                    + "&filters=" + filtrosCodificados;

            String respuesta = enviarSolicitud(url);

            JsonNode raiz = mapper.readTree(respuesta);

            // Priorizar records en la raíz del JSON.
            // Solo utilizar result si records no está en la raíz.
            JsonNode registros;

            if (raiz.path("records").isArray()) {

                registros = raiz.path("records");

            } else if (raiz.path("result").path("records").isArray()) {

                registros = raiz.path("result").path("records");

            } else {

                System.out.println("ERROR: EL MEF NO DEVOLVIO RECORDS");
                System.out.println("OFFSET CONSULTADO: " + offset);
                System.out.println("RESPUESTA RECIBIDA: "
                        + respuesta.substring(
                                0, Math.min(respuesta.length(), 2000)
                        ));

                throw new IOException(
                        "El MEF no devolvió una lista de registros. "
                        + "Offset: " + offset
                );
            }

            // Leer el total informado por el MEF.
            if (totalInformado < 0) {

                String totalTexto;

                if (raiz.has("include_total")) {

                    totalTexto = raiz.path("include_total").asText();

                } else {

                    totalTexto = raiz.path("result")
                            .path("include_total").asText();
                }

                try {

                    totalInformado = Integer.parseInt(totalTexto);

                } catch (NumberFormatException e) {

                    totalInformado = -1;
                }
            }

            int cantidadPagina = registros.size();

            System.out.println(
                    "PAGINA MEF - OFFSET: " + offset
                    + " - REGISTROS: " + cantidadPagina
            );

            if (cantidadPagina == 0) {
                break;
            }

            // Acumular los montos de los registros recibidos.
            for (JsonNode registro : registros) {

                totalPIA = totalPIA.add(
                        obtenerMonto(registro, "MONTO_PIA")
                );

                totalPIM = totalPIM.add(
                        obtenerMonto(registro, "MONTO_PIM")
                );

                totalDevengado = totalDevengado.add(
                        obtenerMonto(registro, "MONTO_DEVENGADO_ANUAL")
                );
            }

            registrosProcesados += cantidadPagina;
            offset += cantidadPagina;

            if (cantidadPagina < LIMITE_PAGINA) {
                break;
            }

            if (totalInformado >= 0
                    && registrosProcesados >= totalInformado) {
                break;
            }
        }

        // Evitar entregar resultados incompletos.
        if (registrosProcesados >= MAX_REGISTROS
                && (totalInformado < 0
                || totalInformado > registrosProcesados)) {

            throw new IOException(
                    "Se alcanzó el límite de registros. "
                    + "El resumen podría estar incompleto."
            );
        }

        // Calcular porcentaje de ejecución presupuestal.
        BigDecimal porcentajeEjecucion = BigDecimal.ZERO;

        if (totalPIM.compareTo(BigDecimal.ZERO) > 0) {

            porcentajeEjecucion = totalDevengado
                    .multiply(BigDecimal.valueOf(100))
                    .divide(totalPIM, 2, RoundingMode.HALF_UP);
        }

        // Construir respuesta JSON.
        Map<String, Object> resumen = new LinkedHashMap<>();

        resumen.put(
                "departamento",
                nombreDepartamento.isBlank()
                        ? "TODOS"
                        : nombreDepartamento
        );

        resumen.put("anio", anio);
        resumen.put("registrosProcesados", registrosProcesados);
        resumen.put("totalRegistrosInformado", totalInformado);
        resumen.put("pia", totalPIA);
        resumen.put("pim", totalPIM);
        resumen.put("devengado", totalDevengado);
        resumen.put("porcentajeEjecucion", porcentajeEjecucion);

        return resumen;
    }

    // Enviar solicitud HTTP al servicio del MEF.
    private String enviarSolicitud(String url)
            throws IOException, InterruptedException {

        HttpRequest solicitud = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .timeout(Duration.ofSeconds(90))
                .GET()
                .header("Accept", "application/json")
                .build();

        HttpResponse<String> respuesta = cliente.send(
                solicitud,
                HttpResponse.BodyHandlers.ofString()
        );

        if (respuesta.statusCode() != 200) {

            System.out.println("ERROR HTTP DEL MEF: "
                    + respuesta.statusCode());

            System.out.println("RESPUESTA DEL MEF: "
                    + respuesta.body());

            System.out.println("URL CONSULTADA: " + url);

            throw new IOException(
                    "Error de conexión con el MEF. Código HTTP: "
                    + respuesta.statusCode()
            );
        }

        return respuesta.body();
    }

    // Convertir los montos recibidos a BigDecimal.
    private BigDecimal obtenerMonto(JsonNode registro, String campo) {

        JsonNode valor = registro.path(campo);

        if (valor.isMissingNode() || valor.isNull()) {
            return BigDecimal.ZERO;
        }

        String texto = valor.asText().trim();

        if (texto.isBlank()) {
            return BigDecimal.ZERO;
        }

        try {

            return new BigDecimal(texto.replace(",", ""));

        } catch (NumberFormatException e) {

            return BigDecimal.ZERO;
        }
    }

    // Codificar filtros para la URL.
    private String codificar(String texto) {

        return URLEncoder.encode(
                texto,
                StandardCharsets.UTF_8
        );
    }

    // Escapar caracteres especiales del JSON.
    private String escaparJson(String texto) {

        return texto.replace("\\", "\\\\")
                    .replace("\"", "\\\"");
    }
}
