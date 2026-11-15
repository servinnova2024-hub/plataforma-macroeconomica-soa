
package com.plataforma.backend.service;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

import org.springframework.stereotype.Service;

@Service
public class InflacionService {

    private final HttpClient cliente = HttpClient.newHttpClient();

    public String consultarInflacion()
            throws IOException, InterruptedException {

        String url = "https://estadisticas.bcrp.gob.pe/estadisticas/series/api/PN01273PM/json";

        HttpRequest solicitud = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .GET()
                .build();

        HttpResponse<String> respuesta = cliente.send(
                solicitud,
                HttpResponse.BodyHandlers.ofString()
        );

        if (respuesta.statusCode() != 200) {
            throw new IOException(
                    "Error al consultar la inflación en el BCRP. Código HTTP: "
                    + respuesta.statusCode()
            );
        }

        return respuesta.body();
    }
}
